use std::io::Cursor;
use std::sync::mpsc::{channel, Sender};
use std::sync::{Mutex, OnceLock};

use base64::Engine;
use rodio::{Decoder, OutputStream, Sink};

struct PlayRequest {
    bytes: Vec<u8>,
    volume: f32,
}

static AUDIO_SENDER: OnceLock<Mutex<Sender<PlayRequest>>> = OnceLock::new();

// Sounds play on a dedicated thread: rodio's OutputStream is not Send, and
// keeping one stream alive avoids re-opening the audio device per sound.
fn audio_sender() -> &'static Mutex<Sender<PlayRequest>> {
    AUDIO_SENDER.get_or_init(|| {
        let (sender, receiver) = channel::<PlayRequest>();

        std::thread::spawn(move || {
            let Ok((_stream, handle)) = OutputStream::try_default() else {
                eprintln!("Audio output unavailable; sounds will be dropped.");
                while receiver.recv().is_ok() {}
                return;
            };

            let mut playing: Option<Sink> = None;
            while let Ok(request) = receiver.recv() {
                if let Some(sink) = playing.take() {
                    sink.stop();
                }

                let source = match Decoder::new(Cursor::new(request.bytes)) {
                    Ok(source) => source,
                    Err(error) => {
                        eprintln!("Failed to decode sound: {error}");
                        continue;
                    }
                };
                let sink = match Sink::try_new(&handle) {
                    Ok(sink) => sink,
                    Err(error) => {
                        eprintln!("Failed to open audio sink: {error}");
                        continue;
                    }
                };

                sink.set_volume(request.volume);
                sink.append(source);
                playing = Some(sink);
            }
        });

        Mutex::new(sender)
    })
}

#[tauri::command]
pub fn play_sound(data_base64: String, volume: f32) -> Result<(), String> {
    let volume = volume.clamp(0.0, 1.0);
    if volume == 0.0 {
        return Ok(());
    }

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data_base64.trim())
        .map_err(|error| format!("Failed to decode sound data: {error}"))?;

    audio_sender()
        .lock()
        .map_err(|_| "Audio queue unavailable.".to_string())?
        .send(PlayRequest { bytes, volume })
        .map_err(|error| format!("Failed to queue sound: {error}"))?;

    Ok(())
}
