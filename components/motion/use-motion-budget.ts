/**
 * How much decorative motion this phone gets (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §5.4): the idle loops' rate and the share of a
 * burst's particles, from the device tier and then the learner's animation level (`motion-level-core.ts`: reduced holds idle loops
 * still and halves bursts). Event motion (a pop, a stamp, a claim) is never throttled by the tier: it is short and carries meaning;
 * its off-switches are the "off" level and the system's reduced motion. The tier is fixed for the session; the level can change.
 */
import { budgetForLevel } from "@/components/motion/motion-level-core";
import { getDeviceTier, getMotionBudget } from "@/services/device-profile";
import type { DeviceTier, MotionBudget } from "@/services/device-profile-core";
import { useMotionLevel } from "@/services/motion-level";

export function useMotionBudget(): MotionBudget & { tier: DeviceTier } {
  const level = useMotionLevel();
  return { tier: getDeviceTier(), ...budgetForLevel(getMotionBudget(), level) };
}
