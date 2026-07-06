use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const APP_STATE_VERSION: u32 = 1;

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
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            version: APP_STATE_VERSION,
            blocks: BlocksState::default(),
            block_timer: BlockTimerState::default(),
            schedule: Schedule::default(),
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
}

impl Default for BlocksState {
    fn default() -> Self {
        Self {
            blocks: default_blocks(),
            next_block_id: default_next_block_id(),
            active_block_id: None,
            block_spent: BTreeMap::new(),
            completion_tones: BTreeMap::new(),
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

fn app_state_version() -> u32 {
    APP_STATE_VERSION
}

fn default_next_block_id() -> u32 {
    2
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
