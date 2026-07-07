// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod app_state;
pub mod notifications;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            app_state::load_app_state,
            app_state::save_app_state,
            notifications::notification_permission_state,
            notifications::request_notification_permission,
            notifications::send_system_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
