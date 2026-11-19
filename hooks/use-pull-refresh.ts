import { useCallback, useEffect, useRef, useState } from "react";

import { useTheme } from "@/theme";

/** The spinner stays at least this long: a refresh that ends in the same frame it began leaves the native spinner stuck. */
const MIN_SPIN_MS = 600;

/**
 * State for a `RefreshControl`. `refreshing` turns on at once, always turns off again (even when
 * `load` throws or never settles within `MAX_WAIT_MS`), and never stays shorter than `MIN_SPIN_MS`,
 * because local reads finish so fast that `true` and `false` land in one render, and the native
 * pull-to-refresh spinner then never gets told to stop.
 */
const MAX_WAIT_MS = 8000;

export function usePullRefresh(load: () => Promise<unknown>): {
  refreshing: boolean;
  onRefresh: () => void;
  /** Spread onto `<RefreshControl>`: every screen's spinner is the same color. */
  spinner: { tintColor: string; colors: string[] };
} {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);
  const alive = useRef(true);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const onRefresh = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    const started = Date.now();
    const work = Promise.resolve()
      .then(() => loadRef.current())
      .catch((error) => console.warn("[refresh]", error));
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, MAX_WAIT_MS));
    void Promise.race([work, timeout]).then(() => {
      const rest = Math.max(0, MIN_SPIN_MS - (Date.now() - started));
      setTimeout(() => {
        busy.current = false;
        if (alive.current) setRefreshing(false);
      }, rest);
    });
  }, []);

  return { refreshing, onRefresh, spinner: { tintColor: theme.colors.primary, colors: [theme.colors.primary] } };
}
