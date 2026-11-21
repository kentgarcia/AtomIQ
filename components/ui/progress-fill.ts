/**
 * An animated style that makes a full-width, full-height fill show only `value` of the bar (0 to 1), by transform. Use it
 * on the fill and on anything that follows the fill's right edge (sparkles, a burst): all of them are full-width boxes
 * inside the bar's width, with `right: 0` pinning what rides on the edge. The track around the fill clips it.
 * Spec: docs/features/PERFORMANCE_AND_SOUND_SPEC.md §5.3 step 3. Never animate `width` for a bar.
 */
import { useAnimatedStyle, type SharedValue } from "react-native-reanimated";

import { fillOffsetPercent, fillOffsetPx } from "./progress-fill-core";

export function useFillStyle(value: SharedValue<number>) {
  return useAnimatedStyle(() => ({ transform: [{ translateX: `${fillOffsetPercent(value.get())}%` as `${number}%` }] }));
}

/** As `useFillStyle`, for a fill given a fixed `widthPx` (set that width on the fill itself, not here). */
export function useFillPxStyle(value: SharedValue<number>, widthPx: number) {
  return useAnimatedStyle(() => ({ transform: [{ translateX: fillOffsetPx(value.get(), widthPx) }] }));
}
