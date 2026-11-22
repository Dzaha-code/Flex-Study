#[cfg(desktop)]
use tauri::Manager as _;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // One window per user on desktop. The crate is not even compiled for
    // Android and iOS (see Cargo.toml), where the OS already keeps one
    // instance, so registering it there would not build.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}));

    // In-app updates for the Windows build: checks the GitHub release manifest,
    // verifies the installer's signature against the public key in
    // tauri.conf.json, and runs it. Android updates go through MainActivity's
    // AppUpdater instead, since an APK is installed by the system installer.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    // The floating task reminder is a second window. Without this, closing the
    // main window while a reminder is on screen would leave the app running
    // with only the reminder left — closing the app has to close the app.
    #[cfg(desktop)]
    let builder = builder.on_window_event(|window, event| {
        if window.label() == "main" && matches!(event, tauri::WindowEvent::Destroyed) {
            window.app_handle().exit(0);
        }
    });

    builder
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
