use serde::Deserialize;
use serde_json::Value;
use std::time::Duration;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCompletionRequest {
    pub url: String,
    pub api_key: String,
    pub body: Value,
}

#[tauri::command]
pub async fn request_ai_completion(request: AiCompletionRequest) -> Result<Value, String> {
    if request.url.trim().is_empty() {
        return Err("The AI API URL is empty.".to_string());
    }
    if request.api_key.trim().is_empty() {
        return Err("The AI API key is empty.".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| format!("Failed to create AI client: {error}"))?;
    let response = client
        .post(request.url)
        .bearer_auth(request.api_key)
        .json(&request.body)
        .send()
        .await
        .map_err(|error| format!("AI request failed: {error}"))?;
    let status = response.status();
    let body = response
        .json::<Value>()
        .await
        .map_err(|error| format!("Failed to decode the AI response: {error}"))?;

    if !status.is_success() {
        let message = body
            .get("error")
            .and_then(|error| error.get("message"))
            .and_then(Value::as_str)
            .map(str::to_owned)
            .unwrap_or_else(|| format!("AI request failed with status {status}."));
        return Err(message);
    }

    Ok(body)
}
