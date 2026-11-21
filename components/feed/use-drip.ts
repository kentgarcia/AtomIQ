/**
 * The feed list as the learner sees it: posts that arrive while Discover is in front land one by one
 * (`dripPlan`, `DRIP_MS` apart, oldest first so the newest ends on top) instead of all at once. Posts
 * that arrive while another tab is in front wait and then land the same way when Discover is shown.
 * The first load, and reduced motion, show everything at once.
 */

import { useEffect, useState } from "react";

import { DRIP_MS, dripPlan, needsFullReveal } from "@/components/feed/feed-ui-core";
import type { FeedItem } from "@/services/feed";

export function useDrippedFeed(items: readonly FeedItem[], loading: boolean, active: boolean, reduced: boolean): { shown: FeedItem[]; fresh: ReadonlySet<string> } {
  const [revealed, setRevealed] = useState<ReadonlySet<string> | null>(null);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (loading) return;
    if (revealed === null || reduced) {
      // The first load (and reduced motion) is shown whole: synchronising with the loaded list is the point of this effect.
      // Only when something is missing: `revealed` is a dependency, so a fresh Set every run would loop for ever.
      if (needsFullReveal(revealed, items)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRevealed(new Set(items.map((i) => i.id)));
      }
      return;
    }
    if (!active) return;
    const { instant, queued } = dripPlan(revealed, items);
    if (instant.length === 0 && queued.length === 0) return;
    const timer = setTimeout(() => {
      const landing = queued[0];
      setRevealed((prev) => new Set([...(prev ?? []), ...instant, ...(landing ? [landing] : [])]));
      if (landing) setFresh((prev) => new Set([...prev, landing]));
    }, instant.length > 0 && queued.length === 0 ? 0 : DRIP_MS);
    return () => clearTimeout(timer);
  }, [items, loading, active, reduced, revealed]);

  // Before the first load is recorded everything is shown, so the empty state never flashes.
  return { shown: revealed ? items.filter((i) => revealed.has(i.id)) : [...items], fresh };
}
