import { useEffect, useState } from "react";

export default function CountdownTimer({ kickoff }) {
  const [secondsLeft, setSecondsLeft] = useState(null);

  useEffect(() => {
    const compute = () => {
      const diff = Math.floor((new Date(kickoff) - Date.now()) / 1000);
      setSecondsLeft(diff);
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [kickoff]);

  if (secondsLeft === null || secondsLeft <= 0 || secondsLeft >= 3600) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, "0");

  return (
    <span className="countdown-timer">
      Spel stänger om {mins}:{secs}
    </span>
  );
}
