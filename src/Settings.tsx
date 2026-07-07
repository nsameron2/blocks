import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import type { AppSettings, ThemePreference } from "./lib/appState";

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  Icon: typeof Monitor;
}[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: Dispatch<SetStateAction<AppSettings>>;
}

export function Settings({ settings, onSettingsChange }: SettingsProps) {
  const [volumeInput, setVolumeInput] = useState(
    String(settings.sound.notificationVolume),
  );

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
                        className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded px-3 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--app-focus)] ${
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
              Sound
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
                      className="h-9 w-full rounded-md bg-[var(--app-surface-2)] py-1 pl-2 pr-6 text-right text-sm font-semibold text-[var(--app-text)] outline-none ring-1 ring-[var(--app-border)] [appearance:textfield] focus:ring-2 focus:ring-[var(--app-focus)] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
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
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
