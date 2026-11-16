import { useEffect, useState } from 'react';

/** Current unix time in seconds, updated on an interval. Drives the clock and the sky's phase. */
export function useNow(intervalMs = 20_000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
