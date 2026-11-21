/**
 * The maths of a progress bar that never animates its width (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §5.3 step 3).
 * Changing `width` on every frame is a layout pass and a native measure each time, which Android feels far more than
 * iOS. The fill is instead drawn at full width and slid left by the share that is empty, a transform, which needs no layout.
 * The track clips it (`overflow: "hidden"` and its own radius), so the right end stays round and the left end is the track's.
 */

/** How far left, in percent of the fill's own width, a fill sits for `value` (0 empty, 1 full). Written to run as a worklet. */
export const fillOffsetPercent = (value: number): number => {
  "worklet";
  const v = value < 0 ? 0 : value > 1 ? 1 : value;
  return (v - 1) * 100;
};

/** The same slide in dp, for a fill that is a fixed number of dp wide (a bar whose padding a percent would leave out). */
export const fillOffsetPx = (value: number, widthPx: number): number => {
  "worklet";
  const v = value < 0 ? 0 : value > 1 ? 1 : value;
  return (v - 1) * widthPx;
};
