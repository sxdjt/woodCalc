/// Entry point called by main.rs (and by the mobile harness on mobile targets).
/// Tauri commands will be registered here as the app grows.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
