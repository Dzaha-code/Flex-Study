package com.creepix.flexstudy

import android.os.Bundle
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  // Runs before the first page load, so `window.FlexUpdater` exists from the
  // start. See AppUpdater for what it can and cannot do.
  override fun onWebViewCreate(webView: WebView) {
    webView.addJavascriptInterface(AppUpdater(this, webView), "FlexUpdater")
  }
}
