import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Schedule } from "./Schedule";
import { Schedule as BlockSchedule } from "./components/Schedule";
import { BlockManager } from "./components/BlockManager";
import {
  NavigationMenu,
  type NavigationPage,
} from "./components/NavigationMenu";
import {
  createDefaultAppState,
  type AppState,
  type BlocksState,
  type BlockTimerState,
} from "./appState";
import {
  resolveNextLogOffDate,
  type LogOffSchedule,
} from "./logOffSchedule";
import { Settings } from "./Settings";

function applyStateUpdate<T>(current: T, update: SetStateAction<T>) {
  return typeof update === "function"
    ? (update as (current: T) => T)(current)
    : update;
}

function BlocksPage({
  blocksState,
  blockTimerState,
  onBlocksStateChange,
  onBlockTimerStateChange,
  targetLogOffAt,
}: {
  blocksState: BlocksState;
  blockTimerState: BlockTimerState;
  onBlocksStateChange: Dispatch<SetStateAction<BlocksState>>;
  onBlockTimerStateChange: Dispatch<SetStateAction<BlockTimerState>>;
  targetLogOffAt: Date | null;
}) {
  const totalAllocationPercent = blocksState.blocks.reduce(
    (sum, block) => sum + block.percent,
    0,
  );

  return (
    <section className="flow-root min-h-screen pb-32 pt-8">
      <BlockSchedule
        state={blockTimerState}
        onStateChange={onBlockTimerStateChange}
        totalAllocationPercent={totalAllocationPercent}
        targetLogOffAt={targetLogOffAt}
      />
      <BlockManager
        blocksState={blocksState}
        onBlocksStateChange={onBlocksStateChange}
        totalDurationMs={blockTimerState.totalDurationMs}
        scheduleStarted={blockTimerState.started}
      />
    </section>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>("blocks");
  const [appState, setAppState] = useState<AppState>(createDefaultAppState);
  const [resolutionNow, setResolutionNow] = useState(() => new Date());

  const targetLogOffAt = useMemo(
    () => resolveNextLogOffDate(appState.schedule, resolutionNow),
    [appState.schedule, resolutionNow],
  );

  const setBlocksState = useCallback<Dispatch<SetStateAction<BlocksState>>>(
    (update) => {
      setAppState((previous) => ({
        ...previous,
        blocks: applyStateUpdate(previous.blocks, update),
      }));
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

  useEffect(() => {
    const timer = setInterval(() => setResolutionNow(new Date()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-neutral-900 text-white">
      <NavigationMenu
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      <div className="min-h-screen pl-64 sm:pl-96">
        {currentPage === "blocks" && (
          <BlocksPage
            blocksState={appState.blocks}
            blockTimerState={appState.blockTimer}
            onBlocksStateChange={setBlocksState}
            onBlockTimerStateChange={setBlockTimerState}
            targetLogOffAt={targetLogOffAt}
          />
        )}
        {currentPage === "schedule" && (
          <Schedule
            logOffSchedule={appState.schedule}
            onLogOffScheduleSave={setScheduleState}
          />
        )}
        {currentPage === "settings" && <Settings />}
      </div>
    </main>
  );
}

export default App;
