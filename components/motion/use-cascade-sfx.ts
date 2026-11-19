/**
 * Plays one cue for each beat of a page's cascade (`cascade-fx.ts`), at the moment that beat arrives: `count` cues from `at` ms,
 * `step` ms apart, the first page of the flow waiting for the hello scroll like everything else. `index` rises with the beat so a
 * run of the same sound steps through the cue's variants instead of repeating one. Cleared when the page leaves.
 */

import { useEffect } from "react";
import type { SharedValue } from "react-native-reanimated";

import { leadFor } from "@/components/motion/cascade-fx";
import { playSfx } from "@/services/sfx";
import type { SfxCue } from "@/services/sfx-core";

export function useCascadeSfx(direction: SharedValue<number> | null, cue: SfxCue, at: number, step: number, count: number): void {
  useEffect(() => {
    // No direction: this part of the app does not cascade, so nothing sounds
    if (!direction) return;
    const lead = leadFor(direction.get());
    const ids = Array.from({ length: count }, (_, i) => setTimeout(() => void playSfx(cue, { index: i }), at + lead + i * step));
    return () => ids.forEach(clearTimeout);
  }, [direction, cue, at, step, count]);
}
