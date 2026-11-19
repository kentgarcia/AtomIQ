import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import type { LevelRecord } from "@/components/platformer/story-core";
import { getStoryRecords } from "@/services/story-progress";

/** The saved story results, reloaded each time the screen comes into focus (a level just played shows its stars). */
export function useStoryProgress(): { records: LevelRecord[]; loaded: boolean } {
  const [state, setState] = useState<{ records: LevelRecord[]; loaded: boolean }>({ records: [], loaded: false });
  useFocusEffect(
    useCallback(() => {
      let live = true;
      getStoryRecords()
        .then((records) => live && setState({ records, loaded: true }))
        .catch(() => live && setState((s) => ({ ...s, loaded: true })));
      return () => {
        live = false;
      };
    }, []),
  );
  return state;
}
