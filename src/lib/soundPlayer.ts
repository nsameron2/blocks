import { invoke } from "@tauri-apps/api/core";

const base64Cache = new Map<string, Promise<string>>();
let fallbackAudio: HTMLAudioElement | null = null;

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function base64FromDataUrl(dataUrl: string) {
  const separatorIndex = dataUrl.indexOf(",");
  return separatorIndex === -1 ? dataUrl : dataUrl.slice(separatorIndex + 1);
}

function fetchAsBase64(url: string): Promise<string> {
  return fetch(url)
    .then((response) => response.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(base64FromDataUrl(String(reader.result)));
          reader.onerror = () =>
            reject(reader.error ?? new Error(`Failed to read ${url}`));
          reader.readAsDataURL(blob);
        }),
    );
}

function soundBase64(source: string): Promise<string> {
  if (source.startsWith("data:")) {
    return Promise.resolve(base64FromDataUrl(source));
  }

  let cached = base64Cache.get(source);
  if (!cached) {
    cached = fetchAsBase64(source);
    base64Cache.set(source, cached);
  }

  return cached;
}

// Plays through the Rust audio thread in the app (the webview's media stack
// needs GStreamer, which is unreliable inside AppImages); a new sound stops
// the previous one. Falls back to HTMLAudio outside the Tauri runtime.
export function playSound(source: string, volume: number) {
  const clampedVolume = Math.max(0, Math.min(1, volume));
  if (clampedVolume === 0) return;

  if (!isTauriRuntime()) {
    fallbackAudio?.pause();
    const audio = new Audio(source);
    fallbackAudio = audio;
    audio.volume = clampedVolume;
    void audio.play().catch(() => undefined);
    return;
  }

  void soundBase64(source)
    .then((dataBase64) =>
      invoke("play_sound", { dataBase64, volume: clampedVolume }),
    )
    .catch((error) => {
      console.error("Failed to play sound", error);
    });
}
