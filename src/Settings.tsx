import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Monitor, Moon, Sun, Upload } from "lucide-react";
import type {
  AppSettings,
  BuiltInCompletionSound,
  CompletionSound,
  CustomCompletionSound,
  CustomSound,
  TimeFormatPreference,
  ThemePreference,
} from "./lib/appState";
import { completionSoundSource } from "./lib/completionSounds";
import { playSound } from "./lib/soundPlayer";

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  Icon: typeof Monitor;
}[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

const SOUND_OPTIONS: { value: CompletionSound; label: string }[] = [
  { value: "good", label: "Complete" },
  { value: "bad", label: "Alarm beep" },
  { value: "neutral", label: "Chime" },
  { value: "timer", label: "Log off" },
];

const COMPLETION_SOUND_ROWS: {
  tone: BuiltInCompletionSound;
  label: string;
}[] = [
  { tone: "good", label: "Good" },
  { tone: "bad", label: "Bad" },
  { tone: "neutral", label: "Neutral" },
  { tone: "timer", label: "Timer" },
];

const TIME_FORMAT_OPTIONS: { value: TimeFormatPreference; label: string }[] = [
  { value: "12h", label: "12 hour" },
  { value: "24h", label: "24 hour" },
];

function createCustomSoundId(): CustomCompletionSound {
  const uniqueId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  return `custom:${uniqueId}`;
}

function readCustomSoundFile(file: File): Promise<CustomSound> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error(`Failed to read ${file.name}`));
        return;
      }

      resolve({
        id: createCustomSoundId(),
        name: file.name,
        dataUrl: reader.result,
      });
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function soundOptionLabel(
  option: { value: CompletionSound; label: string },
  defaultSound: CompletionSound,
) {
  return option.value === defaultSound
    ? `${option.label} (Default)`
    : option.label;
}

interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: Dispatch<SetStateAction<AppSettings>>;
}

export function Settings({ settings, onSettingsChange }: SettingsProps) {
  const customSoundInputRef = useRef<HTMLInputElement>(null);
  const [volumeInput, setVolumeInput] = useState(
    String(settings.sound.notificationVolume),
  );
  const soundOptions = [
    ...SOUND_OPTIONS,
    ...settings.sound.customSounds.map((sound) => ({
      value: sound.id as CompletionSound,
      label: sound.name,
    })),
  ];

  useEffect(() => {
    setVolumeInput(String(settings.sound.notificationVolume));
  }, [settings.sound.notificationVolume]);

  function updateTheme(theme: ThemePreference) {
    onSettingsChange((previous) => ({
      ...previous,
      appearance: {
        ...previous.appearance,
        theme,
      },
    }));
  }

  function updateTimeFormat(timeFormat: TimeFormatPreference) {
    onSettingsChange((previous) => ({
      ...previous,
      time: {
        ...previous.time,
        timeFormat,
      },
    }));
  }

  function updateNotificationVolume(volume: number) {
    if (!Number.isFinite(volume)) return;

    onSettingsChange((previous) => ({
      ...previous,
      sound: {
        ...previous.sound,
        notificationVolume: Math.max(0, Math.min(100, Math.round(volume))),
      },
    }));
  }

  function handleNotificationVolumeInput(value: string) {
    setVolumeInput(value);
    if (value === "") return;
    updateNotificationVolume(Number(value));
  }

  function updateCompletionSound(
    tone: BuiltInCompletionSound,
    sound: CompletionSound,
  ) {
    onSettingsChange((previous) => ({
      ...previous,
      sound: {
        ...previous.sound,
        completionSounds: {
          ...previous.sound.completionSounds,
          [tone]: sound,
        },
      },
    }));
  }

  async function handleCustomSoundUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    const customSounds = await Promise.all(
      Array.from(files).map(readCustomSoundFile),
    );
    onSettingsChange((previous) => ({
      ...previous,
      sound: {
        ...previous.sound,
        customSounds: [...previous.sound.customSounds, ...customSounds],
      },
    }));
  }

  function previewCompletionSound(sound: CompletionSound) {
    const volume = Math.max(
      0,
      Math.min(1, settings.sound.notificationVolume / 100),
    );
    if (volume === 0) return;

    const source = completionSoundSource(sound, settings.sound.customSounds);
    if (!source) return;

    playSound(source, volume);
  }

  function handleCompletionSoundChange(
    tone: BuiltInCompletionSound,
    sound: CompletionSound,
  ) {
    updateCompletionSound(tone, sound);
    previewCompletionSound(sound);
  }

  return (
    <section
      className="flex min-h-screen justify-center px-8 pb-24 pt-24"
      aria-label="Settings"
    >
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl font-bold text-[var(--app-text)] sm:text-5xl">
          Settings
        </h1>

        <div className="mx-auto mt-10 w-full max-w-2xl space-y-10">
          <section>
            <h2 className="text-xl font-semibold text-[var(--app-subtle)]">
              Appearance
            </h2>
            <div className="mt-3 overflow-hidden rounded-md bg-[var(--app-surface)] ring-1 ring-[var(--app-border)]">
              <div className="flex min-h-20 flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-base font-semibold text-[var(--app-subtle)] sm:text-lg">
                  Theme
                </div>
                <div className="inline-flex rounded-md bg-[var(--app-surface-2)] p-1 ring-1 ring-[var(--app-border)]">
                  {THEME_OPTIONS.map(({ value, label, Icon }) => {
                    const isSelected = settings.appearance.theme === value;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateTheme(value)}
                        aria-pressed={isSelected}
                        className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded px-3 text-sm font-bold transition-colors ${
                          isSelected
                            ? "bg-[var(--app-control)] text-[var(--app-control-text)]"
                            : "text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--app-subtle)]">
              Time
            </h2>
            <div className="mt-3 overflow-hidden rounded-md bg-[var(--app-surface)] ring-1 ring-[var(--app-border)]">
              <div className="flex min-h-20 flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-base font-semibold text-[var(--app-subtle)] sm:text-lg">
                  Time format
                </div>
                <div className="inline-flex rounded-md bg-[var(--app-surface-2)] p-1 ring-1 ring-[var(--app-border)]">
                  {TIME_FORMAT_OPTIONS.map(({ value, label }) => {
                    const isSelected = settings.time.timeFormat === value;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateTimeFormat(value)}
                        aria-pressed={isSelected}
                        className={`inline-flex h-10 cursor-pointer items-center justify-center rounded px-3 text-sm font-bold transition-colors ${
                          isSelected
                            ? "bg-[var(--app-control)] text-[var(--app-control-text)]"
                            : "text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--app-subtle)]">
              Sounds
            </h2>
            <div className="mt-3 overflow-hidden rounded-md bg-[var(--app-surface)] ring-1 ring-[var(--app-border)]">
              <div className="flex min-h-20 flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-base font-semibold text-[var(--app-subtle)] sm:text-lg">
                  Notification volume
                </div>
                <div className="flex w-full items-center gap-3 sm:w-auto">
                  <label className="relative block w-16 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={volumeInput}
                      onChange={(event) =>
                        handleNotificationVolumeInput(event.target.value)
                      }
                      onBlur={() =>
                        setVolumeInput(String(settings.sound.notificationVolume))
                      }
                      aria-label="Notification sound volume percent"
                      className="h-9 w-full rounded-md bg-[var(--app-surface-2)] py-1 pl-2 pr-6 text-right text-sm font-semibold text-[var(--app-text)] outline-none ring-1 ring-[var(--app-border)] [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--app-muted)]">
                      %
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={settings.sound.notificationVolume}
                    onChange={(event) =>
                      updateNotificationVolume(Number(event.target.value))
                    }
                    aria-label="Notification sound volume"
                    className="h-2 w-full cursor-pointer accent-[var(--app-control)] sm:w-64"
                  />
                </div>
              </div>
              <div className="border-t border-[var(--app-border)] px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-base font-semibold text-[var(--app-subtle)] sm:text-lg">
                    Completion sounds
                  </div>
                  <input
                    ref={customSoundInputRef}
                    type="file"
                    accept="audio/*"
                    multiple
                    onChange={(event) => {
                      void handleCustomSoundUpload(event.target.files).finally(
                        () => {
                          event.target.value = "";
                        },
                      );
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => customSoundInputRef.current?.click()}
                    className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--app-secondary-control)] px-3 text-sm font-semibold text-[var(--app-text)] ring-1 ring-[var(--app-border)] transition-colors hover:bg-[var(--app-secondary-control-hover)]"
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {COMPLETION_SOUND_ROWS.map(({ tone, label }) => (
                    <label
                      key={tone}
                      htmlFor={`${tone}-completion-sound`}
                      className="block"
                    >
                      <span className="mb-2 block text-sm font-semibold text-[var(--app-muted)]">
                        {label}
                      </span>
                      <select
                        id={`${tone}-completion-sound`}
                        value={settings.sound.completionSounds[tone]}
                        onChange={(event) =>
                          handleCompletionSoundChange(
                            tone,
                            event.target.value as CompletionSound,
                          )
                        }
                        className="h-9 w-full cursor-pointer rounded-md bg-[var(--app-native-control-bg)] px-3 text-sm font-semibold text-[var(--app-native-control-text)] outline-none ring-1 ring-[var(--app-border)] focus:ring-2 focus:ring-[var(--app-focus)]"
                      >
                        {soundOptions.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                            className="bg-[var(--app-native-control-bg)] text-[var(--app-native-control-text)]"
                          >
                            {soundOptionLabel(option, tone)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
