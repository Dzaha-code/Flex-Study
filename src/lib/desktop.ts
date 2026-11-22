/**
 * The only module allowed to know about Tauri (ToApk.md §5).
 *
 * Every desktop capability goes through here so the web build keeps working
 * unchanged. Imports of `@tauri-apps/*` are dynamic, so those packages never
 * enter the bundle a browser downloads, and nothing here is safe to call during
 * a server render — call it from client components or effects only.
 */

export const isDesktop = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * Resolves to whether we may post notifications, asking once if the user has
 * not decided yet. Returns `false` rather than throwing when the platform has
 * no notification API at all.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (isDesktop()) {
    const { isPermissionGranted, requestPermission } = await import(
      "@tauri-apps/plugin-notification"
    );
    if (await isPermissionGranted()) return true;
    return (await requestPermission()) === "granted";
  }

  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}

/**
 * Posts a notification on whichever shell is running. Deliberately never
 * rejects: notifications can be blocked, denied or unavailable at any point,
 * and the app has to keep working regardless.
 */
export async function notify(title: string, body?: string): Promise<void> {
  try {
    if (isDesktop()) {
      const { sendNotification } = await import("@tauri-apps/plugin-notification");
      if (await ensureNotificationPermission()) sendNotification({ title, body });
      return;
    }

    if (!("Notification" in window)) return;
    if (Notification.permission === "default") await Notification.requestPermission();
    if (Notification.permission === "granted") new Notification(title, { body });
  } catch {
    // Swallowed on purpose; see the doc comment above.
  }
}

/**
 * The Android build. Tauri's mobile shell runs the same bundle in the system
 * WebView, so the user agent is the cheapest honest signal; no OS plugin needed.
 */
export const isAndroid = () =>
  typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

/** True where the OS, not the page, has to deliver the focus alarm. */
export const needsSystemAlarm = () => isDesktop() && isAndroid();

const ALARM_CHANNEL = "focus-alarm";
let channelReady: Promise<void> | null = null;

/** A high-importance channel, so the alarm sounds and peeks over other apps. */
function ensureAlarmChannel(): Promise<void> {
  channelReady ??= (async () => {
    try {
      const { createChannel, Importance, Visibility } = await import(
        "@tauri-apps/plugin-notification"
      );
      await createChannel({
        id: ALARM_CHANNEL,
        name: "Focus alarm",
        description: "When a focus block runs out of time",
        importance: Importance.High,
        visibility: Visibility.Public,
        vibration: true,
        lights: true,
      });
    } catch {
      // Older Android or no channel support: the default channel still works.
    }
  })();
  return channelReady;
}

/**
 * Schedules a notification with the OS for an exact moment.
 *
 * On Android the WebView is paused as soon as the app leaves the screen, so a
 * JavaScript timer cannot be trusted to fire a focus alarm. The OS can: this
 * hands it the deadline when the block starts, allowed to fire even in Doze.
 * Desktop never needs it (the window keeps running), so it is a no-op there.
 * Never rejects.
 */
export async function scheduleSystemAlarm(
  id: number,
  at: number,
  title: string,
  body: string,
): Promise<void> {
  if (!needsSystemAlarm() || at <= Date.now()) return;
  try {
    if (!(await ensureNotificationPermission())) return;
    await ensureAlarmChannel();
    const { sendNotification, Schedule } = await import("@tauri-apps/plugin-notification");
    sendNotification({
      id,
      title,
      body,
      channelId: ALARM_CHANNEL,
      schedule: Schedule.at(new Date(at), false, true),
      autoCancel: true,
    });
  } catch {
    // The in-app alarm still runs whenever the app is on screen.
  }
}

/** Cancels alarms scheduled above, e.g. when the block finishes early. */
export async function cancelSystemAlarms(ids: number[]): Promise<void> {
  if (!needsSystemAlarm() || ids.length === 0) return;
  try {
    const { cancel } = await import("@tauri-apps/plugin-notification");
    await cancel(ids);
  } catch {
    // Nothing scheduled, or the API is missing: either way nothing to cancel.
  }
}

/**
 * Asks the OS to get the user's attention: on Windows the taskbar button
 * flashes until the window is focused again. Desktop only; the browser has no
 * equivalent, so it quietly does nothing there. Never rejects.
 */
export async function requestAttention(): Promise<void> {
  if (!isDesktop()) return;
  try {
    const { getCurrentWindow, UserAttentionType } = await import("@tauri-apps/api/window");
    const window = getCurrentWindow();
    // Already in front: flashing would only be noise.
    if (await window.isFocused()) return;
    await window.requestUserAttention(UserAttentionType.Critical);
  } catch {
    // Permission missing or API unavailable; the notification still went out.
  }
}

/**
 * Fullscreen, on whichever shell is running.
 *
 * The Fullscreen API is used for both branches. WebView2 implements it, so the
 * desktop app behaves like the browser without pulling in the Tauri window API
 * and an extra dependency (ToApk.md §3 lists what is allowed).
 */
export function isFullscreen(): boolean {
  return typeof document !== "undefined" && document.fullscreenElement !== null;
}

export function subscribeFullscreen(listener: () => void): () => void {
  document.addEventListener("fullscreenchange", listener);
  return () => document.removeEventListener("fullscreenchange", listener);
}

export async function setFullscreen(next: boolean): Promise<void> {
  try {
    if (next) {
      await document.documentElement.requestFullscreen();
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  } catch {
    // Browsers refuse without a user gesture, and policies can block it
    // outright. Nothing here is essential, so a refusal is not an error.
  }
}

/**
 * The floating task reminder (desktop app only).
 *
 * A second, tiny window that sits in the bottom-right corner of the screen,
 * above every other app, so a fixed-time block is noticed while the user is in
 * a browser or an editor — the main window is usually behind something. It is
 * a plain page of this same bundle (`/reminder`), so it shares the theme and
 * the language; the block travels in the URL hash and the buttons come back as
 * an event to the main window, which owns the data and does the actual work.
 *
 * Never on Android: there is one window there, and the in-app card covers it.
 */
export interface ReminderPayload {
  id: string;
  title: string;
  date: string;
  /** "HH:MM" */
  start: string;
  durationMin: number;
}

export type ReminderAction = "start" | "skip" | "reschedule" | "dismiss";

export const REMINDER_WINDOW = "reminder";
const REMINDER_EVENT = "flexstudy://reminder-action";
const REMINDER_WIDTH = 384;
const REMINDER_HEIGHT = 212;
const REMINDER_MARGIN = 16;

/** True where the reminder can be its own always-on-top window. */
export const supportsReminderWindow = () => isDesktop() && !isAndroid();

/**
 * Opens (or replaces) the floating reminder. Resolves `false` when it could
 * not be shown, so the caller can fall back to the in-app card. Never rejects.
 */
export async function showReminderWindow(payload: ReminderPayload): Promise<boolean> {
  if (!supportsReminderWindow()) return false;
  try {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const { currentMonitor, primaryMonitor } = await import("@tauri-apps/api/window");

    const existing = await WebviewWindow.getByLabel(REMINDER_WINDOW);
    if (existing) await existing.destroy();

    // The work area excludes the taskbar, so the card never sits under it.
    // Monitor values are physical pixels; window positions are logical.
    let x: number | undefined;
    let y: number | undefined;
    const monitor = (await currentMonitor()) ?? (await primaryMonitor());
    if (monitor) {
      const scale = monitor.scaleFactor || 1;
      const area = monitor.workArea;
      x = Math.round((area.position.x + area.size.width) / scale - REMINDER_WIDTH - REMINDER_MARGIN);
      y = Math.round((area.position.y + area.size.height) / scale - REMINDER_HEIGHT - REMINDER_MARGIN);
    }

    // The exported site uses trailing slashes (one folder per route); the dev
    // server does not. The hash never reaches either server.
    const route = process.env.NODE_ENV === "production" ? "reminder/index.html" : "reminder";
    const url = `${route}#${encodeURIComponent(JSON.stringify(payload))}`;

    const window = new WebviewWindow(REMINDER_WINDOW, {
      url,
      title: payload.title,
      width: REMINDER_WIDTH,
      height: REMINDER_HEIGHT,
      x,
      y,
      resizable: false,
      maximizable: false,
      minimizable: false,
      decorations: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      // Appearing must not steal the keyboard from whatever the user is typing in.
      focus: false,
      shadow: true,
    });
    return await new Promise<boolean>((resolve) => {
      void window.once("tauri://created", () => resolve(true));
      void window.once("tauri://error", () => resolve(false));
    });
  } catch {
    return false;
  }
}

/** Closes the floating reminder if it is open. Never rejects. */
export async function closeReminderWindow(): Promise<void> {
  if (!supportsReminderWindow()) return;
  try {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const existing = await WebviewWindow.getByLabel(REMINDER_WINDOW);
    if (existing) await existing.destroy();
  } catch {
    // Already gone.
  }
}

/** Called from inside the reminder window: report the choice, then close. */
export async function sendReminderAction(id: string, action: ReminderAction): Promise<void> {
  try {
    const { emit } = await import("@tauri-apps/api/event");
    await emit(REMINDER_EVENT, { id, action });
  } finally {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().destroy();
    } catch {
      // Nothing to close outside the desktop shell.
    }
  }
}

/** The main window's side: receives the reminder's buttons. Returns an unsubscribe. */
export async function onReminderAction(
  handler: (id: string, action: ReminderAction) => void,
): Promise<() => void> {
  if (!supportsReminderWindow()) return () => {};
  try {
    const { listen } = await import("@tauri-apps/api/event");
    return await listen<{ id: string; action: ReminderAction }>(REMINDER_EVENT, (event) => {
      handler(event.payload.id, event.payload.action);
    });
  } catch {
    return () => {};
  }
}

/** Brings the main window back in front, e.g. after "Start focus" in the reminder. */
export async function focusMainWindow(): Promise<void> {
  if (!supportsReminderWindow()) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const window = getCurrentWindow();
    await window.unminimize();
    await window.show();
    await window.setFocus();
  } catch {
    // Permission missing: the block still started, it just stays behind.
  }
}

/* ------------------------------------------------------------------------ *
 * In-app updates
 *
 * One question for the screens ("is there a newer version, and install it"),
 * two answers underneath:
 *
 * - Windows: Tauri's updater plugin reads `latest.json` from the newest GitHub
 *   release, downloads the installer, checks its signature against the public
 *   key in tauri.conf.json, and runs it; the app restarts on the new version.
 * - Android: the native `FlexUpdater` bridge (MainActivity → AppUpdater) reads
 *   `android.json` from the same release, downloads the APK, checks its
 *   SHA-256, and opens the system installer, which asks the user to confirm.
 *
 * The browser has nothing to update — a reload is always the latest version —
 * so every function here is a no-op there.
 * ------------------------------------------------------------------------ */

const RELEASES = "https://github.com/Dzaha-code/Flex-Study/releases";
const ANDROID_MANIFEST = `${RELEASES}/latest/download/android.json`;

export interface AvailableUpdate {
  version: string;
  currentVersion: string;
  notes: string;
  date: string | null;
}

/** How an install ended, for the copy shown afterwards. */
export type InstallOutcome =
  /** Windows: the installer is running and the app is about to close. */
  | "restarting"
  /** Android: the system installer is on screen. */
  | "installer-opened"
  /** Android: the user must allow installs from FlexStudy first, then retry. */
  | "needs-permission";

interface AndroidBridge {
  fetchText(url: string, callbackId: string): void;
  install(url: string, sha256: string, callbackId: string): void;
}

interface AndroidManifest {
  version: string;
  notes?: string;
  pub_date?: string;
  url: string;
  sha256: string;
}

type BridgeWindow = Window & {
  FlexUpdater?: AndroidBridge;
  __flexUpdater?: (id: string, ok: boolean, payload: string) => void;
  __flexUpdaterProgress?: (id: string, percent: number) => void;
};

const bridgeCalls = new Map<
  string,
  { resolve: (value: string) => void; reject: (error: Error) => void; onProgress?: (percent: number) => void }
>();
let bridgeSeq = 0;

function androidBridge(): AndroidBridge | null {
  if (typeof window === "undefined" || !isAndroid()) return null;
  const host = window as BridgeWindow;
  if (!host.FlexUpdater) return null;
  host.__flexUpdater ??= (id, ok, payload) => {
    const call = bridgeCalls.get(id);
    if (!call) return;
    bridgeCalls.delete(id);
    if (ok) call.resolve(payload);
    else call.reject(new Error(payload));
  };
  host.__flexUpdaterProgress ??= (id, percent) => bridgeCalls.get(id)?.onProgress?.(percent);
  return host.FlexUpdater;
}

function callBridge(
  run: (bridge: AndroidBridge, id: string) => void,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const bridge = androidBridge();
  if (!bridge) return Promise.reject(new Error("no-bridge"));
  bridgeSeq += 1;
  const id = `u${bridgeSeq}`;
  return new Promise<string>((resolve, reject) => {
    bridgeCalls.set(id, { resolve, reject, onProgress });
    run(bridge, id);
  });
}

/** True where this build can update itself: the Windows app and the APK. */
export function supportsInAppUpdates(): boolean {
  if (!isDesktop()) return false;
  return isAndroid() ? androidBridge() !== null : true;
}

/** The installed version, or null in the browser. Never rejects. */
export async function installedVersion(): Promise<string | null> {
  if (!isDesktop()) return null;
  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    return await getVersion();
  } catch {
    return null;
  }
}

// The checked update is kept between `check` and `install`: the plugin's
// object carries the download URL and signature it already verified.
let pendingDesktopUpdate: import("@tauri-apps/plugin-updater").Update | null = null;
let pendingAndroidUpdate: AndroidManifest | null = null;

/**
 * Asks the release server for a newer version. `null` when up to date or when
 * there is no release yet; rejects only on a real failure (offline, server
 * error), so the caller can tell "nothing new" from "could not check".
 */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (!supportsInAppUpdates()) return null;
  const current = (await installedVersion()) ?? "0.0.0";

  if (isAndroid()) {
    let text: string;
    try {
      text = await callBridge((bridge, id) => bridge.fetchText(ANDROID_MANIFEST, id));
    } catch (error) {
      // No release published yet, or this release has no Android build.
      if (error instanceof Error && error.message === "not-found") return null;
      throw error;
    }
    const manifest = JSON.parse(text) as AndroidManifest;
    if (typeof manifest.version !== "string" || typeof manifest.url !== "string") {
      throw new Error("bad-manifest");
    }
    const { isNewerVersion } = await import("./version");
    if (!isNewerVersion(manifest.version, current)) return null;
    pendingAndroidUpdate = manifest;
    return {
      version: manifest.version.replace(/^v/i, ""),
      currentVersion: current,
      notes: manifest.notes ?? "",
      date: manifest.pub_date ?? null,
    };
  }

  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  if (!update) return null;
  pendingDesktopUpdate = update;
  return {
    version: update.version,
    currentVersion: update.currentVersion,
    notes: update.body ?? "",
    date: update.date ?? null,
  };
}

/**
 * Downloads and installs the update found by the last `checkForUpdate`.
 * `onProgress` gets 0–100, or null while the size is unknown. Rejects with a
 * short reason ("checksum", "network", …) when it fails.
 */
export async function installUpdate(
  onProgress: (percent: number | null) => void,
): Promise<InstallOutcome> {
  if (isAndroid()) {
    const manifest = pendingAndroidUpdate;
    if (!manifest) throw new Error("no-update");
    try {
      await callBridge(
        (bridge, id) => bridge.install(manifest.url, manifest.sha256 ?? "", id),
        onProgress,
      );
      return "installer-opened";
    } catch (error) {
      if (error instanceof Error && error.message === "needs-permission") return "needs-permission";
      throw error;
    }
  }

  const update = pendingDesktopUpdate;
  if (!update) throw new Error("no-update");
  let total = 0;
  let received = 0;
  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      total = event.data.contentLength ?? 0;
      onProgress(total > 0 ? 0 : null);
    } else if (event.event === "Progress") {
      received += event.data.chunkLength;
      onProgress(total > 0 ? Math.min(100, Math.round((received / total) * 100)) : null);
    } else {
      onProgress(100);
    }
  });
  // On Windows the installer closes the app itself; this line is rarely reached.
  return "restarting";
}
