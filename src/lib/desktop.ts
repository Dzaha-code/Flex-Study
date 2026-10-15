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
