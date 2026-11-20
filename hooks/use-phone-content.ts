import { useEffect, useState } from "react";

import type { MapSite } from "@/components/map/map-core";
import { isShowable, type SafetyCard } from "@/components/safety/safety-core";
import { contentRepository } from "@/services/content-db";

/** The Safety Guide's cards, once. Empty when the bundled content has none (the screen says so). A card without its lines is left out. */
export function useSafetyCards(): { cards: SafetyCard[]; loaded: boolean } {
  const [state, setState] = useState<{ cards: SafetyCard[]; loaded: boolean }>({
    cards: [],
    loaded: false,
  });
  useEffect(() => {
    let alive = true;
    contentRepository
      .getSafetyCards()
      .then(
        (cards) =>
          alive && setState({ cards: cards.filter(isShowable), loaded: true }),
      )
      .catch((error) => {
        console.warn("[safety] cards", error);
        if (alive) setState({ cards: [], loaded: true });
      });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

/** The Nuclear Map's sites, once. Empty when the bundled content has none. */
export function useMapSites(): { sites: MapSite[]; loaded: boolean } {
  const [state, setState] = useState<{ sites: MapSite[]; loaded: boolean }>({
    sites: [],
    loaded: false,
  });
  useEffect(() => {
    let alive = true;
    contentRepository
      .getMapSites()
      .then((sites) => alive && setState({ sites, loaded: true }))
      .catch((error) => {
        console.warn("[map] sites", error);
        if (alive) setState({ sites: [], loaded: true });
      });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
