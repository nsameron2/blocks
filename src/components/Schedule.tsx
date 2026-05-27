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

  return (
    <section className="max-w-lg mx-auto mt-8 px-6">
      <h2
        className={`text-white text-xl mb-4 transition-opacity duration-500 ${
          started ? "opacity-0" : "opacity-100"
        }`}
      >
        Please input your log off time
      </h2>
      <div className="h-24">
        {started ? (
          <div className="flex items-center justify-center w-full h-full text-white text-6xl rounded-md bg-neutral-800 px-6 font-mono font-bold tracking-wider">
            {fmt(remaining)}
          </div>
        ) : (
          <input
            type="time"
            value={logOffTime}
            onChange={(e) => setLogOffTime(e.target.value)}
            className="block w-full h-full bg-neutral-800 text-white text-6xl font-mono font-bold tracking-wider rounded-md px-6 text-center focus:outline-none focus:ring-2 focus:ring-neutral-500"
          />
        )}
      </div>
      <button
        onClick={handleSetSchedule}
        disabled={!logOffTime || started}
        className={`mt-4 bg-neutral-700 text-white px-6 py-2 rounded hover:bg-neutral-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity duration-500 ${
          started ? "opacity-0 pointer-events-none" : ""
        }`}
      >
        Start
      </button>
    </section>
  );
}
