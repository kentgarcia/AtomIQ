import { useEffect, useState } from "react";

/**
 * True once `delayMs` has passed since `key` last changed (and true at once when `delayMs` is 0 or
 * less). The lecture uses it to keep Continue hidden for the first moment of each step. The state
 * is only set when the timer fires, never while rendering.
 */
export function useReadyAfter(key: string, delayMs: number): boolean {
  const [readyKey, setReadyKey] = useState<string | null>(null);
  useEffect(() => {
    if (delayMs <= 0) return;
    const timer = setTimeout(() => setReadyKey(key), delayMs);
    return () => clearTimeout(timer);
  }, [key, delayMs]);
  return delayMs <= 0 || readyKey === key;
}
