package com.creepix.flexstudy

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.Executors

/**
 * In-app updates for the APK, exposed to the page as `window.FlexUpdater`.
 *
 * The page cannot do this itself: GitHub's release downloads send no CORS
 * headers, so a `fetch` from the WebView is refused, and installing an APK
 * needs an Android intent. So the page asks, this class does the network and
 * the install, and answers through `window.__flexUpdater(id, ok, payload)`.
 *
 * Only this project's GitHub releases can be fetched, the download must match
 * the SHA-256 in the manifest, and Android itself refuses an APK signed with a
 * different key — three separate locks on what can be installed.
 */
class AppUpdater(private val activity: Activity, private val webView: WebView) {
  private val worker = Executors.newSingleThreadExecutor()

  @JavascriptInterface
  fun fetchText(url: String, callbackId: String) {
    if (!allowed(url)) {
      reply(callbackId, false, "blocked-url")
      return
    }
    worker.execute {
      try {
        val connection = open(url)
        val code = connection.responseCode
        if (code == 404) {
          reply(callbackId, false, "not-found")
          return@execute
        }
        if (code !in 200..299) {
          reply(callbackId, false, "http-$code")
          return@execute
        }
        val text = connection.inputStream.bufferedReader().use { it.readText() }
        reply(callbackId, true, text)
      } catch (error: Exception) {
        reply(callbackId, false, error.message ?: "network")
      }
    }
  }

  @JavascriptInterface
  fun install(url: String, sha256: String, callbackId: String) {
    if (!allowed(url)) {
      reply(callbackId, false, "blocked-url")
      return
    }
    worker.execute {
      try {
        val folder = File(activity.cacheDir, "updates").apply { mkdirs() }
        // One file at a time: an older download never lingers in the cache.
        folder.listFiles()?.forEach { it.delete() }
        val target = File(folder, "flexstudy-update.apk")

        val connection = open(url)
        if (connection.responseCode !in 200..299) {
          reply(callbackId, false, "http-${connection.responseCode}")
          return@execute
        }
        val total = connection.contentLengthLong
        val digest = MessageDigest.getInstance("SHA-256")
        var received = 0L
        var lastReported = -1
        connection.inputStream.use { input ->
          FileOutputStream(target).use { output ->
            val buffer = ByteArray(64 * 1024)
            while (true) {
              val read = input.read(buffer)
              if (read < 0) break
              output.write(buffer, 0, read)
              digest.update(buffer, 0, read)
              received += read
              if (total > 0) {
                val percent = ((received * 100) / total).toInt()
                if (percent != lastReported) {
                  lastReported = percent
                  progress(callbackId, percent)
                }
              }
            }
          }
        }

        val actual = digest.digest().joinToString("") { "%02x".format(it) }
        if (sha256.isNotBlank() && !actual.equals(sha256.trim(), ignoreCase = true)) {
          target.delete()
          reply(callbackId, false, "checksum")
          return@execute
        }

        activity.runOnUiThread { launchInstaller(target, callbackId) }
      } catch (error: Exception) {
        reply(callbackId, false, error.message ?: "network")
      }
    }
  }

  private fun launchInstaller(apk: File, callbackId: String) {
    // Android 8+: installing needs a one-time "allow from this source" switch.
    // Send the user to it; the page offers "Install" again when they return.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
      !activity.packageManager.canRequestPackageInstalls()
    ) {
      val settings = Intent(
        Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
        Uri.parse("package:${activity.packageName}"),
      )
      activity.startActivity(settings)
      reply(callbackId, false, "needs-permission")
      return
    }
    val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", apk)
    val intent = Intent(Intent.ACTION_VIEW).apply {
      setDataAndType(uri, "application/vnd.android.package-archive")
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    activity.startActivity(intent)
    reply(callbackId, true, "installer-opened")
  }

  private fun open(url: String): HttpURLConnection {
    val connection = URL(url).openConnection() as HttpURLConnection
    connection.connectTimeout = 15_000
    connection.readTimeout = 30_000
    // github.com answers a release download with a redirect to its file host.
    connection.instanceFollowRedirects = true
    connection.setRequestProperty("Accept", "application/octet-stream, application/json")
    return connection
  }

  private fun allowed(url: String): Boolean =
    url.startsWith("https://github.com/Dzaha-code/Flex-Study/releases/")

  private fun reply(callbackId: String, ok: Boolean, payload: String) {
    val script =
      "window.__flexUpdater && window.__flexUpdater(${JSONObject.quote(callbackId)}, $ok, ${JSONObject.quote(payload)})"
    webView.post { webView.evaluateJavascript(script, null) }
  }

  private fun progress(callbackId: String, percent: Int) {
    val script =
      "window.__flexUpdaterProgress && window.__flexUpdaterProgress(${JSONObject.quote(callbackId)}, $percent)"
    webView.post { webView.evaluateJavascript(script, null) }
  }
}
