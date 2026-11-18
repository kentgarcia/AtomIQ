import { useCallback, useEffect, useRef, useState } from "react";

import {
  ensureBlogCards,
  getFeed,
  getFeedPostsEnabled,
  getUnseenCount,
  markSeen,
  subscribeFeed,
  subscribeFeedPostsEnabled,
  type FeedItem,
} from "@/services/feed";

export interface FeedState {
  /** Posts and blog cards, newest first. Empty until the first load finishes. */
  items: FeedItem[];
  /** True until the first load finishes. */
  loading: boolean;
  /** Posts not yet seen (0 while the feed is muted). */
  unseenCount: number;
  /** The Settings "Feed posts" switch. */
  enabled: boolean;
  /** Unlocks any blog pieces, then reloads (pull to refresh, and when Discover gains focus). */
  refresh: () => Promise<void>;
  /** Mark items as seen as they scroll into view (ignores ids already seen). */
  markSeen: (ids: readonly string[]) => void;
}

/**
 * The Discover feed: items, the unseen count and the mute switch, kept current as posts and reactions
 * change. Call `refresh()` when Discover gains focus: it creates blog cards for newly unlocked pieces.
 * Reactions go through `react` / `toggleReaction` in `services/feed.ts`; the list updates by itself.
 */
export function useFeed(): FeedState {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const seen = useRef(new Set<string>());

  const load = useCallback(
    (): Promise<void> =>
      Promise.all([getFeed(), getUnseenCount(), getFeedPostsEnabled()])
        .then(([list, count, on]) => {
          setItems(list);
          setUnseenCount(count);
          setEnabled(on);
          list.forEach((i) => i.seen && seen.current.add(i.id));
        })
        .catch((error) => {
          console.warn("[feed] load", error);
        })
        .finally(() => setLoading(false)),
    [],
  );

  const refresh = useCallback(async () => {
    await ensureBlogCards();
    await load();
  }, [load]);

  useEffect(() => {
    void load();
    const stopFeed = subscribeFeed(() => void load());
    const stopMute = subscribeFeedPostsEnabled(() => void load());
    return () => {
      stopFeed();
      stopMute();
    };
  }, [load]);

  const markItemsSeen = useCallback((ids: readonly string[]) => {
    const fresh = ids.filter((id) => !seen.current.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => seen.current.add(id));
    void markSeen(fresh);
  }, []);

  return { items, loading, unseenCount, enabled, refresh, markSeen: markItemsSeen };
}

/** Just the number for the dot on the Feed tab icon (0 while muted). Cheap: no list is loaded. */
export function useFeedUnseenCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void getUnseenCount().then((n) => {
        if (!cancelled) setCount(n);
      });
    };
    load();
    const stopFeed = subscribeFeed(load);
    const stopMute = subscribeFeedPostsEnabled(load);
    return () => {
      cancelled = true;
      stopFeed();
      stopMute();
    };
  }, []);
  return count;
}
