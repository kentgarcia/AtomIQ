import { useEffect, useState } from "react";

import { getOwnedItems, subscribeOwned } from "@/services/shop";

const NONE: ReadonlySet<string> = new Set();

/** The ids of the shop items the learner has bought, kept current as they buy. */
export function useOwnedItems(): ReadonlySet<string> {
  const [owned, setOwned] = useState<ReadonlySet<string>>(NONE);
  useEffect(() => {
    let cancelled = false;
    getOwnedItems()
      .then((ids) => {
        if (!cancelled) setOwned(new Set(ids));
      })
      .catch(() => undefined);
    const stop = subscribeOwned((ids) => setOwned(new Set(ids)));
    return () => {
      cancelled = true;
      stop();
    };
  }, []);
  return owned;
}
