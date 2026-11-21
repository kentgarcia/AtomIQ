/**
 * Warm the sounds a screen needs when it opens and let them go when it is left (docs/features/PERFORMANCE_AND_SOUND_SPEC.md
 * §4.4 A). `name` is a set in `SFX_SETS` (services/sfx-core.ts): the cues the screen plays in its first seconds. Sounds
 * are not unloaded at once on leaving, only marked as the first to go when room is needed, because the next screen may use
 * the same files. A cue outside the set still plays, a little late the first time.
 */
import { useEffect } from "react";

import { releaseSfxSet, warmSfxSet, type SfxSetName } from "@/services/sfx";

export function useSfxSet(name: SfxSetName): void {
  useEffect(() => {
    warmSfxSet(name);
    return () => releaseSfxSet(name);
  }, [name]);
}
