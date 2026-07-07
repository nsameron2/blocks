use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

pub const APP_STATE_VERSION: u32 = 1;
const APP_STATE_FILE_NAME: &str = "app-state.json";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    #[serde(default = "app_state_version")]
    pub version: u32,
    #[serde(default)]
    pub blocks: BlocksState,
    #[serde(default)]
    pub block_timer: BlockTimerState,
    #[serde(default)]
    pub schedule: Schedule,
    #[serde(default)]
    pub settings: AppSettings,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            version: APP_STATE_VERSION,
            blocks: BlocksState::default(),
            block_timer: BlockTimerState::default(),
            schedule: Schedule::default(),
            settings: AppSettings::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BlocksState {
    #[serde(default = "default_blocks")]
    pub blocks: Vec<Block>,
    #[serde(default = "default_next_block_id")]
    pub next_block_id: u32,
    #[serde(default)]
    pub active_block_id: Option<u32>,
    #[serde(default)]
    pub block_spent: BTreeMap<u32, u64>,
    #[serde(default)]
    pub completion_tones: BTreeMap<u32, CompletionTone>,
    #[serde(default)]
    pub presets: Vec<BlockPreset>,
    #[serde(default = "default_next_preset_id")]
    pub next_preset_id: u32,
}

impl Default for BlocksState {
    fn default() -> Self {
        Self {
            blocks: default_blocks(),
            next_block_id: default_next_block_id(),
            active_block_id: None,
            block_spent: BTreeMap::new(),
            completion_tones: BTreeMap::new(),
            presets: Vec::new(),
            next_preset_id: default_next_preset_id(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Block {
    pub id: u32,
    pub name: String,
    pub color: String,
    pub percent: u8,
    pub emoji: String,
    pub good: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BlockPreset {
    pub id: u32,
    pub name: String,
    pub blocks: Vec<Block>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CompletionTone {
    Good,
    Bad,
    Neutral,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BlockTimerState {
    #[serde(default)]
    pub target_at: Option<String>,
    #[serde(default)]
    pub started: bool,
    #[serde(default)]
    pub total_duration_ms: u64,
    #[serde(default)]
    pub remaining_ms: u64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Schedule {
    #[serde(default)]
    pub default_time: String,
    #[serde(default)]
    pub weekday_overrides: BTreeMap<u8, String>,
    #[serde(default)]
    pub date_overrides: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default)]
    pub appearance: AppearanceSettings,
    #[serde(default)]
    pub sound: SoundSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppearanceSettings {
    #[serde(default)]
    pub theme: ThemePreference,
}

impl Default for AppearanceSettings {
    fn default() -> Self {
        Self {
            theme: ThemePreference::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SoundSettings {
    #[serde(default = "default_notification_volume")]
    pub notification_volume: u8,
    #[serde(default)]
    pub completion_sounds: CompletionSoundSettings,
}

impl Default for SoundSettings {
    fn default() -> Self {
        Self {
            notification_volume: default_notification_volume(),
            completion_sounds: CompletionSoundSettings::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CompletionSoundSettings {
    #[serde(default = "default_good_completion_sound")]
    pub good: CompletionTone,
    #[serde(default = "default_bad_completion_sound")]
    pub bad: CompletionTone,
    #[serde(default = "default_neutral_completion_sound")]
    pub neutral: CompletionTone,
}

impl Default for CompletionSoundSettings {
    fn default() -> Self {
        Self {
            good: default_good_completion_sound(),
            bad: default_bad_completion_sound(),
            neutral: default_neutral_completion_sound(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ThemePreference {
    System,
    Light,
    Dark,
}

impl Default for ThemePreference {
    fn default() -> Self {
        Self::System
    }
}

fn app_state_version() -> u32 {
    APP_STATE_VERSION
}

#[tauri::command]
pub fn load_app_state(app: AppHandle) -> Result<AppState, String> {
    let path = app_state_path(&app)?;

    match fs::read_to_string(&path) {
        Ok(contents) => serde_json::from_str(&contents)
            .map_err(|error| format!("Failed to parse app state: {error}")),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(AppState::default()),
        Err(error) => Err(format!("Failed to read app state: {error}")),
    }
}

#[tauri::command]
pub fn save_app_state(app: AppHandle, state: AppState) -> Result<(), String> {
    let path = app_state_path(&app)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create app state directory: {error}"))?;
    }

    let contents = serde_json::to_string_pretty(&state)
        .map_err(|error| format!("Failed to serialize app state: {error}"))?;

    fs::write(&path, contents).map_err(|error| format!("Failed to write app state: {error}"))
}

fn app_state_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|directory| directory.join(APP_STATE_FILE_NAME))
        .map_err(|error| format!("Failed to resolve app state path: {error}"))
}

fn default_next_block_id() -> u32 {
    2
}

fn default_next_preset_id() -> u32 {
    1
}

fn default_notification_volume() -> u8 {
    100
}

fn default_good_completion_sound() -> CompletionTone {
    CompletionTone::Good
}

fn default_bad_completion_sound() -> CompletionTone {
    CompletionTone::Bad
}

fn default_neutral_completion_sound() -> CompletionTone {
    CompletionTone::Neutral
}

fn default_blocks() -> Vec<Block> {
    vec![Block {
        id: 1,
        name: "Idle".to_string(),
        color: "bg-gray-500".to_string(),
        percent: 25,
        emoji: "⏲️".to_string(),
        good: Some(false),
    }]
}
