use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_notification::{NotificationExt, PermissionState};

const DEFAULT_NOTIFICATION_TITLE: &str = "Blocks";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemNotification {
    pub title: Option<String>,
    pub body: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationPermission {
    pub state: String,
    pub can_notify: bool,
}

#[tauri::command]
pub fn notification_permission_state(app: AppHandle) -> Result<NotificationPermission, String> {
    app.notification()
        .permission_state()
        .map(notification_permission)
        .map_err(notification_error)
}

#[tauri::command]
pub fn request_notification_permission(app: AppHandle) -> Result<NotificationPermission, String> {
    app.notification()
        .request_permission()
        .map(notification_permission)
        .map_err(notification_error)
}

#[tauri::command]
pub fn send_system_notification(
    app: AppHandle,
    notification: SystemNotification,
) -> Result<(), String> {
    let permission = app
        .notification()
        .permission_state()
        .map_err(notification_error)?;

    if permission != PermissionState::Granted {
        return Err(format!(
            "Notification permission is {}; request permission before sending notifications.",
            permission_label(permission),
        ));
    }

    show_system_notification(app, notification)
}

fn show_system_notification(
    app: AppHandle,
    notification: SystemNotification,
) -> Result<(), String> {
    let body = notification.body.trim();
    if body.is_empty() {
        return Err("Notification body cannot be empty.".to_string());
    }

    let title = notification
        .title
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_NOTIFICATION_TITLE);

    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(notification_error)
}

fn notification_permission(state: PermissionState) -> NotificationPermission {
    NotificationPermission {
        state: permission_label(state).to_string(),
        can_notify: state == PermissionState::Granted,
    }
}

fn permission_label(state: PermissionState) -> &'static str {
    match state {
        PermissionState::Granted => "granted",
        PermissionState::Denied => "denied",
        PermissionState::Prompt => "prompt",
        PermissionState::PromptWithRationale => "promptWithRationale",
    }
}

fn notification_error(error: tauri_plugin_notification::Error) -> String {
    format!("Notification error: {error}")
}
