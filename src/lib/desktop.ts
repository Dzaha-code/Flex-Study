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
