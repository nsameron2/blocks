import { useState } from "react";
import { Calendar } from "./Calendar";
import { Schedule } from "./components/Schedule";
import { BlockManager } from "./components/BlockManager";
import {
  NavigationMenu,
  type NavigationPage,
} from "./components/NavigationMenu";
import { Settings } from "./Settings";

function BlocksPage() {
  const [totalDurationMs, setTotalDurationMs] = useState(0);
  const [scheduleStarted, setScheduleStarted] = useState(false);
  const [totalAllocationPercent, setTotalAllocationPercent] = useState(0);

  function handleScheduleStart(durationMs: number) {
    setTotalDurationMs(durationMs);
    setScheduleStarted(true);
  }

  return (
    <section className="flow-root min-h-screen pb-32 pt-8">
      <Schedule
        onStart={handleScheduleStart}
        totalAllocationPercent={totalAllocationPercent}
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

  return (
    <main className="min-h-screen bg-neutral-900 text-white">
      <NavigationMenu
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      <div className="min-h-screen pl-64 sm:pl-96">
        {currentPage === "blocks" && <BlocksPage />}
        {currentPage === "calendar" && <Calendar />}
        {currentPage === "settings" && <Settings />}
      </div>
    </main>
  );
}

export default App;
