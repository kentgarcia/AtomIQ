import { useEffect, useState } from "react";

import { getDiamonds, subscribeDiamonds } from "@/services/wallet";

/** The learner's diamond balance, kept current as rewards arrive. */
export function useDiamonds(): number {
  const [diamonds, setDiamonds] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getDiamonds()
      .then((n) => {
        if (!cancelled) setDiamonds(n);
      })
      .catch(() => undefined);
    const stop = subscribeDiamonds(setDiamonds);
    return () => {
      cancelled = true;
      stop();
    };
  }, []);
  return diamonds;
}
