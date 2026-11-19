/**
 * The option button's pop (timeline in `lesson/cards/option-pop-core.ts`, measured from a reference
 * clip) for anything that earns it: a badge, a tick, a tile, a node. It squashes, springs up tall, hangs,
 * falls stretched, lands squashed, hops a little and settles, and two sparkles twinkle on its corners.
 * The whole child takes the squash (a picture IS its shape); a label that must not squash belongs
 * outside the wrapper.
 *
 *   <PopOnce at={550}>   plays once, `at` ms after it mounts (a moment's own schedule)
 *   <PopWhen trigger={selected} active={selected}>   plays each time `trigger` changes, never on mount
 *
 * Before it plays, and with reduced motion, it is the plain child. Offsets are fractions of the child's
 * height capped like the option's (`POP_REF_HEIGHT`), so a small thing hops as far as a button does;
 * `intensity` scales the whole pop down for things that are seen often (a reaction is 0.4). `usePop` and
 * `PopSparkle` are exported for a thing that draws its own face (the map's node).
 */

import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, type SharedValue } from "react-native-reanimated";

import { Sparkle } from "@/components/lesson/Sparkle";
import { POP_TOTAL, faceFrame, starFrame } from "@/components/lesson/cards/option-pop-core";
import { useDelayedClock } from "@/components/motion/use-delayed-clock";
import { useTriggerClock } from "@/components/motion/use-trigger-clock";

/** The height the option's pop is measured for: a taller child hops and squashes by the same dp. */
export const POP_REF_HEIGHT = 56;
const POP_STAR = 18;

/** The pop's clock: 0 to `POP_TOTAL` ms, `at` ms from now; at `POP_TOTAL` (rest) when `play` is false. */
export function usePop(at: number, play: boolean = true, restart: unknown = 0): SharedValue<number> {
  return useDelayedClock(POP_TOTAL, at, play, restart);
}

/** One twinkling corner sparkle of the pop. `place` positions it on the wrapper. */
export function PopSparkle({ i, clock, at = 0, color, place, size = POP_STAR }: { i: 0 | 1; clock: SharedValue<number>; /** The clock time the pop starts at, when the clock is shared with other beats. */ at?: number; color: string; place: ViewStyle; size?: number }) {
  const anim = useAnimatedStyle(() => {
    const f = starFrame(i, clock.get() - at);
    return { opacity: f.size > 0 ? 1 : 0, transform: [{ rotate: `${f.rotate}deg` }, { scale: f.size }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", opacity: 0 }, place, anim]}>
      <Sparkle size={size} color={color} />
    </Animated.View>
  );
}

interface PopLook {
  /** 1 = the option's pop; less for things seen often. */
  intensity?: number;
  /** The two corner sparkles (needs `sparkleColor`). */
  sparkles?: boolean;
  sparkleColor?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

function PopBody({ clock, intensity = 1, sparkles = true, sparkleColor, style, children }: PopLook & { clock: SharedValue<number> }) {
  const reduced = useReducedMotion();
  const height = useSharedValue(POP_REF_HEIGHT);

  const anim = useAnimatedStyle(() => {
    const h = height.get();
    const ref = Math.min(h, POP_REF_HEIGHT);
    const f = faceFrame(clock.get(), 0);
    const k = Math.min(1, POP_REF_HEIGHT / h) * intensity;
    return { transform: [{ translateY: f.y * ref * intensity }, { scaleX: 1 + (f.sx - 1) * k }, { scaleY: 1 + (f.sy - 1) * k }] };
  });

  return (
    <View style={style}>
      <Animated.View onLayout={(e) => height.set(Math.max(1, e.nativeEvent.layout.height))} style={anim}>
        {children}
      </Animated.View>
      {sparkles && sparkleColor && !reduced ? (
        <>
          <PopSparkle i={0} clock={clock} color={sparkleColor} place={{ left: -6, top: -6 }} />
          <PopSparkle i={1} clock={clock} color={sparkleColor} place={{ right: -4, bottom: -2 }} />
        </>
      ) : null}
    </View>
  );
}

/** Pops once, `at` ms after it mounts (or after `restart` changes). */
export function PopOnce({ at, play = true, restart, ...look }: { at: number; play?: boolean; restart?: unknown } & PopLook) {
  const clock = usePop(at, play, restart);
  return <PopBody clock={clock} {...look} />;
}

/** Pops each time `trigger` changes while `active` is true; never when it mounts. */
export function PopWhen({ trigger, active = true, ...look }: { trigger: unknown; active?: boolean } & PopLook) {
  const clock = useTriggerClock(POP_TOTAL, trigger, active);
  return <PopBody clock={clock} {...look} />;
}
