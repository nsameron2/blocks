import { useEffect, useMemo, useState } from "react";
import { Schedule } from "./Schedule";
import { Schedule as BlockSchedule } from "./components/Schedule";
import { BlockManager } from "./components/BlockManager";
import {
  NavigationMenu,
  type NavigationPage,
} from "./components/NavigationMenu";
import {
  DEFAULT_LOG_OFF_SCHEDULE,
  resolveNextLogOffDate,
  type LogOffSchedule,
} from "./logOffSchedule";
import { Settings } from "./Settings";

function BlocksPage({ targetLogOffAt }: { targetLogOffAt: Date | null }) {
  const [totalDurationMs, setTotalDurationMs] = useState(0);
  const [scheduleStarted, setScheduleStarted] = useState(false);
  const [totalAllocationPercent, setTotalAllocationPercent] = useState(0);

  function handleScheduleStart(durationMs: number) {
    setTotalDurationMs(durationMs);
    setScheduleStarted(true);
  }

  return (
    <section className="flow-root min-h-screen pb-32 pt-8">
      <BlockSchedule
        onStart={handleScheduleStart}
        totalAllocationPercent={totalAllocationPercent}
        targetLogOffAt={targetLogOffAt}
      />
      <BlockManager
        totalDurationMs={totalDurationMs}
        scheduleStarted={scheduleStarted}
        onTotalAllocatedChange={setTotalAllocationPercent}
      />
    </section>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>("blocks");
  const [logOffSchedule, setLogOffSchedule] = useState<LogOffSchedule>(
    DEFAULT_LOG_OFF_SCHEDULE,
  );
  const [resolutionNow, setResolutionNow] = useState(() => new Date());

  const targetLogOffAt = useMemo(
    () => resolveNextLogOffDate(logOffSchedule, resolutionNow),
    [logOffSchedule, resolutionNow],
  );

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
          <BlocksPage targetLogOffAt={targetLogOffAt} />
        )}
        {currentPage === "schedule" && (
          <Schedule
            logOffSchedule={logOffSchedule}
            onLogOffScheduleSave={setLogOffSchedule}
          />
        )}
        {currentPage === "settings" && <Settings />}
      </div>
    </main>
  );
}

export default App;
