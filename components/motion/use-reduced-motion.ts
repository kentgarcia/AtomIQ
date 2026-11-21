/**
 * The app's reduced-motion hooks. Use these, never `useReducedMotion` from react-native-reanimated: that one reads only the
 * system setting, once, and knows nothing of the learner's animation level (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §5.6).
 *
 *   useReducedMotion()  every animation off: the level is "off" or the system asks for reduced motion. The old meaning of the
 *                       hook, so every existing `if (reduced) show the end` path is the "off" level for free.
 *   useIdleStill()      nothing may run on its own (idle life, loops, shine, twinkles, bobbing cues): the level is "reduced" or
 *                       "off", or the system asks. Use it, in place of `reduced`, to gate a LOOP; a one-shot the learner caused
 *                       keeps `useReducedMotion()`.
 */
import { useReducedMotion as useSystemReducedMotion } from "react-native-reanimated";

import { allMotionOff, idleOff } from "@/components/motion/motion-level-core";
import { useMotionLevel } from "@/services/motion-level";

export function useReducedMotion(): boolean {
  return allMotionOff(useMotionLevel(), useSystemReducedMotion());
}

export function useIdleStill(): boolean {
  return idleOff(useMotionLevel(), useSystemReducedMotion());
}
