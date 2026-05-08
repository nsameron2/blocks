import { useEffect, useState } from "react";

function toMs(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h * 60 + m) * 60 * 1000;
}

function fmt(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / (60 * 1000)) % 60;
  const h = Math.floor(ms / (60 * 60 * 1000));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface ScheduleProps {
  onStart: (durationMs: number) => void;
}

export function Schedule({ onStart }: ScheduleProps) {
  const [logOnTime, setLogOnTime] = useState(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  });
  const [logOffTime, setLogOffTime] = useState("");
  const [started, setStarted] = useState(false);
  const [remaining, setRemaining] = useState(0);

  function handleSetSchedule() {
    if (!logOffTime) return;
    const now = new Date();
    const todayMs = (now.getHours() * 60 + now.getMinutes()) * 60 * 1000 + now.getSeconds() * 1000;
    let endMs = toMs(logOffTime);
    if (endMs <= todayMs) endMs += 24 * 60 * 60 * 1000;
    const durationMs = endMs - todayMs;
    setRemaining(durationMs);
    setStarted(true);
    onStart(durationMs);
  }

  useEffect(() => {
    if (!started) return;
    const timer = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [started]);

  if (started) {
    return (
      <section className="max-w-4xl mx-auto mt-12 px-6 transition-opacity duration-500">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-white text-xl font-semibold">Countdown</h2>
        </div>
        <div className="text-white text-4xl font-mono font-bold tracking-wider">
          {fmt(remaining)}
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-4xl mx-auto mt-12 px-6 transition-opacity duration-500">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white text-xl font-semibold">Schedule</h2>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-white text-sm">Log on</label>
        <input
          type="time"
          value={logOnTime}
          onChange={(e) => setLogOnTime(e.target.value)}
          className="bg-neutral-800 text-white rounded px-3 py-2 border border-neutral-700 focus:outline-none focus:border-neutral-500"
        />
        <label className="text-white text-sm ml-2">Log off</label>
        <input
          type="time"
          value={logOffTime}
          onChange={(e) => setLogOffTime(e.target.value)}
          className="bg-neutral-800 text-white rounded px-3 py-2 border border-neutral-700 focus:outline-none focus:border-neutral-500"
        />
        <button
          onClick={handleSetSchedule}
          className="bg-neutral-700 text-white px-4 py-2 rounded hover:bg-neutral-600 cursor-pointer"
        >
          Set
        </button>
      </div>
    </section>
  );
}
