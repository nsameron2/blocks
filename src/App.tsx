import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Schedule } from "./Schedule";
import { Timer } from "./components/Timer";
import { BlockManager } from "./components/BlockManager";
import {
  NavigationMenu,
  type NavigationPage,
} from "./components/NavigationMenu";
import {
  createDefaultAppState,
  loadAppState,
  saveAppState,
  type AISettings,
  type AppState,
  type AppSettings,
  type BlocksState,
  type BlockTimerState,
  type CompletionSoundSettings,
  type CustomSound,
  type ResolvedTheme,
  type TimeFormatPreference,
  type ThemePreference,
} from "./lib/appState";
import {
  resolveNextLogOffDate,
  type LogOffSchedule,
} from "./lib/logOffSchedule";
import { Settings } from "./Settings";
import { advanceSession, updateSessionBlocks } from "./lib/session";

const APP_STATE_SAVE_DEBOUNCE_MS = 500;
const SYSTEM_DARK_MODE_QUERY = "(prefers-color-scheme: dark)";

function applyStateUpdate<T>(current: T, update: SetStateAction<T>) {
  return typeof update === "function"
    ? (update as (current: T) => T)(current)
    : update;
}

function systemPrefersDarkMode() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(SYSTEM_DARK_MODE_QUERY).matches
  );
}

function resolveTheme(
  theme: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (theme === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  return theme;
}

function BlocksPage({
  blocksState,
  blockTimerState,
  onBlocksStateChange,
  onBlockTimerStateChange,
  onAppReset,
  targetLogOffAt,
  resolvedTheme,
  timeFormat,
  notificationVolume,
  completionSounds,
  customSounds,
  aiSettings,
}: {
  blocksState: BlocksState;
  blockTimerState: BlockTimerState;
  onBlocksStateChange: Dispatch<SetStateAction<BlocksState>>;
  onBlockTimerStateChange: Dispatch<SetStateAction<BlockTimerState>>;
  onAppReset: () => void;
  targetLogOffAt: Date | null;
  resolvedTheme: ResolvedTheme;
  timeFormat: TimeFormatPreference;
  notificationVolume: number;
  completionSounds: CompletionSoundSettings;
  customSounds: CustomSound[];
  aiSettings: AISettings;
}) {
  const totalAllocationPercent = blocksState.blocks.reduce(
    (sum, block) => sum + block.percent,
    0,
  );

  function resetBlockProgress() {
    onBlocksStateChange((previous) => ({
      ...previous,
      blockSpent: {},
      completionTones: {},
    }));
  }

  function resetBlockSession() {
    onBlocksStateChange((previous) => ({
      ...previous,
      activeBlockId: null,
      blockSpent: {},
      completionTones: {},
    }));
  }

  return (
    <section className="flow-root min-h-screen pb-32 pt-8">
      <Timer
        state={blockTimerState}
        onStateChange={onBlockTimerStateChange}
        onStart={resetBlockProgress}
        onReset={resetBlockSession}
        onAppReset={onAppReset}
        totalAllocationPercent={totalAllocationPercent}
        targetLogOffAt={targetLogOffAt}
        timeFormat={timeFormat}
        notificationVolume={notificationVolume}
        completionSounds={completionSounds}
        customSounds={customSounds}
      />
      <BlockManager
        blocksState={blocksState}
        onBlocksStateChange={onBlocksStateChange}
        totalDurationMs={blockTimerState.totalDurationMs}
        scheduleStarted={blockTimerState.started}
        resolvedTheme={resolvedTheme}
        notificationVolume={notificationVolume}
        completionSounds={completionSounds}
        customSounds={customSounds}
        aiSettings={aiSettings}
      />
    </section>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>("blocks");
  const [appState, setAppState] = useState<AppState>(createDefaultAppState);
  const [appStateLoaded, setAppStateLoaded] = useState(false);
  const [resolutionNow, setResolutionNow] = useState(() => new Date());
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    systemPrefersDarkMode,
  );

  const targetLogOffAt = useMemo(
    () => resolveNextLogOffDate(appState.schedule, resolutionNow),
    [appState.schedule, resolutionNow],
  );
  const resolvedTheme = useMemo(
    () => resolveTheme(appState.settings.appearance.theme, systemPrefersDark),
    [appState.settings.appearance.theme, systemPrefersDark],
  );

  const setBlocksState = useCallback<Dispatch<SetStateAction<BlocksState>>>(
    (update) => {
      const now = Date.now();
      setAppState((previous) => updateSessionBlocks(previous, update, now));
    },
    [],
  );

  const setBlockTimerState = useCallback<
    Dispatch<SetStateAction<BlockTimerState>>
  >(
    (update) => {
      setAppState((previous) => ({
        ...previous,
        blockTimer: applyStateUpdate(previous.blockTimer, update),
      }));
    },
    [],
  );

  const setScheduleState = useCallback((schedule: LogOffSchedule) => {
    setAppState((previous) => ({
      ...previous,
      schedule,
    }));
  }, []);

  const setAppSettings = useCallback<Dispatch<SetStateAction<AppSettings>>>(
    (update) => {
      setAppState((previous) => ({
        ...previous,
        settings: applyStateUpdate(previous.settings, update),
      }));
    },
    [],
  );

  const resetAppState = useCallback(() => {
    setCurrentPage("blocks");
    setResolutionNow(new Date());
    setAppState((previous) => {
      const defaults = createDefaultAppState();

      return {
        ...defaults,
        blocks: {
          ...defaults.blocks,
          presets: previous.blocks.presets,
          nextPresetId: previous.blocks.nextPresetId,
        },
      };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateAppState() {
      try {
        const savedState = await loadAppState();
        if (!cancelled) {
          setAppState(savedState);
        }
      } catch (error) {
        console.error("Failed to load app state", error);
      } finally {
        if (!cancelled) {
          setAppStateLoaded(true);
        }
      }
    }

    void hydrateAppState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!appStateLoaded) return;

    const saveTimer = window.setTimeout(() => {
      void saveAppState(appState).catch((error) => {
        console.error("Failed to save app state", error);
      });
    }, APP_STATE_SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(saveTimer);
  }, [appState, appStateLoaded]);

  useEffect(() => {
    if (!appStateLoaded || !appState.blockTimer.started) return;

    const timer = setInterval(() => {
      const now = Date.now();
      setAppState((previous) => advanceSession(previous, now));
    }, 1000);
    return () => clearInterval(timer);
  }, [appStateLoaded, appState.blockTimer.started]);

  useEffect(() => {
    const timer = setInterval(() => setResolutionNow(new Date()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia(SYSTEM_DARK_MODE_QUERY);
    const updateSystemTheme = () => setSystemPrefersDark(mediaQuery.matches);

    updateSystemTheme();
    mediaQuery.addEventListener("change", updateSystemTheme);
    return () => mediaQuery.removeEventListener("change", updateSystemTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  return (
    <main
      className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] transition-colors"
      data-theme={resolvedTheme}
    >
      <NavigationMenu
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      <div className="min-h-screen pl-64 sm:pl-96">
        <div hidden={currentPage !== "blocks"}>
          <BlocksPage
            key={appStateLoaded ? "hydrated" : "default"}
            blocksState={appState.blocks}
            blockTimerState={appState.blockTimer}
            onBlocksStateChange={setBlocksState}
            onBlockTimerStateChange={setBlockTimerState}
            onAppReset={resetAppState}
            targetLogOffAt={targetLogOffAt}
            resolvedTheme={resolvedTheme}
            timeFormat={appState.settings.time.timeFormat}
            notificationVolume={appState.settings.sound.notificationVolume}
            completionSounds={appState.settings.sound.completionSounds}
            customSounds={appState.settings.sound.customSounds}
            aiSettings={appState.settings.ai}
          />
        </div>
        {currentPage === "schedule" && (
          <Schedule
            logOffSchedule={appState.schedule}
            onLogOffScheduleSave={setScheduleState}
            timeFormat={appState.settings.time.timeFormat}
          />
        )}
        {currentPage === "settings" && (
          <Settings
            settings={appState.settings}
            onSettingsChange={setAppSettings}
          />
        )}
      </div>
    </main>
  );
}

export default App;
