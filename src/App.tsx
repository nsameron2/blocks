import { useState } from "react";
import { Schedule } from "./components/Schedule";
import { BlockManager } from "./components/BlockManager";

function App() {
  const [totalDurationMs, setTotalDurationMs] = useState(0);
  const [scheduleStarted, setScheduleStarted] = useState(false);

  function handleScheduleStart(durationMs: number) {
    setTotalDurationMs(durationMs);
    setScheduleStarted(true);
  }

  return (
    <main className="min-h-screen bg-neutral-900 pb-32">
      <h1 className="text-white text-center pt-12 text-7xl font-bold">Blocks</h1>

      <Schedule onStart={handleScheduleStart} />
      <BlockManager totalDurationMs={totalDurationMs} scheduleStarted={scheduleStarted} />
    </main>
  );
}

export default App;
