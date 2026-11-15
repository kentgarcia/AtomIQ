/**
 * SlidingHighlight — one "selected" pill that travels from the old option to
 * the new one (docs/CONTINUITY_SPEC.md, C8).
 *
 * Usage:
 *   const hl = useSlidingHighlight(activeId);
 *   // each option: onLayout={hl.onItemLayout(id)} and draws its selected look
 *   // only when `hl.restId === id` (null while the pill is travelling)
 *   // inside the same positioned container as the options:
 *   <SlidingHighlight state={hl} style={...selected look} renderContent={...} />
 *
 * While the pill travels no option draws its selected look, so nothing is
 * drawn twice; when it lands, the destination option takes over in the same
 * commit that removes the pill. Reduced motion, a first selection and options
 * that have not been measured yet switch instantly.
 */
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { DURATION, EASE_DRAWER } from "@/theme/motion";

type Rect = { x: number; y: number; width: number; height: number };

export interface SlidingHighlightState {
  /** Pass to each option's `onLayout`. */
  onItemLayout: (id: string) => (event: LayoutChangeEvent) => void;
  /** The option that draws its own selected look; null while travelling. */
  restId: string | null;
  moving: boolean;
  fromId: string | null;
  toId: string | null;
  x: SharedValue<number>;
  y: SharedValue<number>;
  w: SharedValue<number>;
  h: SharedValue<number>;
  progress: SharedValue<number>;
}

export function useSlidingHighlight(activeId: string | null): SlidingHighlightState {
  const reducedMotion = useReducedMotion();
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const [settledId, setSettledId] = useState<string | null>(activeId);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const w = useSharedValue(0);
  const h = useSharedValue(0);
  const progress = useSharedValue(1);

  const onItemLayout = useCallback(
    (id: string) => (event: LayoutChangeEvent) => {
      const { x: lx, y: ly, width, height } = event.nativeEvent.layout;
      setRects((prev) => {
        const p = prev[id];
        if (p && p.x === lx && p.y === ly && p.width === width && p.height === height) return prev;
        return { ...prev, [id]: { x: lx, y: ly, width, height } };
      });
    },
    [],
  );

  const from = settledId ? rects[settledId] : undefined;
  const to = activeId ? rects[activeId] : undefined;
  const canTravel = !reducedMotion && !!from && !!to;
  if (settledId !== activeId && !canTravel) setSettledId(activeId);
  const moving = settledId !== activeId;

  // At rest the shared values mirror the settled option, so a trip starts
  // exactly where the old option is.
  useEffect(() => {
    if (moving) return;
    const r = settledId ? rects[settledId] : undefined;
    if (!r) return;
    x.value = r.x;
    y.value = r.y;
    w.value = r.width;
    h.value = r.height;
  }, [moving, settledId, rects, x, y, w, h]);

  useEffect(() => {
    if (!moving || !to) return;
    const config = { duration: DURATION.sheet, easing: EASE_DRAWER };
    const target = activeId;
    progress.value = 0;
    progress.value = withTiming(1, config);
    x.value = withTiming(to.x, config);
    y.value = withTiming(to.y, config);
    w.value = withTiming(to.width, config);
    h.value = withTiming(to.height, config, (finished) => {
      // A retargeted trip cancels this one (finished === false); the newer trip settles.
      if (finished) runOnJS(setSettledId)(target);
    });
  }, [moving, to, activeId, x, y, w, h, progress]);

  return {
    onItemLayout,
    restId: moving ? null : settledId,
    moving,
    fromId: settledId,
    toId: activeId,
    x,
    y,
    w,
    h,
    progress,
  };
}

export function SlidingHighlight({
  state,
  style,
  renderContent,
}: {
  state: SlidingHighlightState;
  /** The selected look (fill, border, radius). Size and position are animated. */
  style: StyleProp<ViewStyle>;
  /** Content of an option as it looks when selected; cross-faded mid-trip. */
  renderContent: (id: string) => React.ReactNode;
}) {
  const { x, y, w, h, progress } = state;
  const box = useAnimatedStyle(() => ({
    width: w.value,
    height: h.value,
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));
  const fromFade = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5], [1, 0], "clamp"),
  }));
  const toFade = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.5, 1], [0, 1], "clamp"),
  }));

  if (!state.moving || !state.toId) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[style, styles.pill, box]}
    >
      {state.fromId ? (
        <Animated.View style={[styles.content, fromFade]}>{renderContent(state.fromId)}</Animated.View>
      ) : null}
      <Animated.View style={[styles.content, toFade]}>{renderContent(state.toId)}</Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    left: 0,
    top: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  content: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
