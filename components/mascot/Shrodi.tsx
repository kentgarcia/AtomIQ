/**
 * Shrodi, AtomIQ's fox scientist, alive.
 *
 * The drawing and every move live in `shrodi-art.ts` (pure data and worklets). This
 * file only renders that tree with react-native-svg and drives it with one loop clock
 * (idle life: breathing, blinks, glances, tail and ear follow-through) and one pose
 * value that glides between moods (never swapping drawings).
 *
 * Still (frame 0, a good drawing) with reduced motion, when the screen is not in
 * front, or when `live` is false. See components/motion/MOTION.md.
 */

import { useIsFocused } from "expo-router";
import { memo, useEffect, useId, useMemo } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg";

import { EASE_IN_OUT, useLoopClock } from "@/components/motion/motion";
import { useMotionBudget } from "@/components/motion/use-motion-budget";
import { idleQuantumMs } from "@/services/device-profile-core";

import {
  HEAD_SCALE,
  POSES,
  SHRODI_LOOP_MS,
  SHRODI_PIVOTS,
  SHRODI_VIEWBOX,
  buildShrodi,
  frameOf,
  type Frame,
  type Mood,
  type Node,
  type Pose,
} from "./shrodi-art";

const STATIC = { g: G, path: Path, circle: Circle, ellipse: Ellipse, rect: Rect, line: Line, polygon: Polygon, clipPath: ClipPath, defs: Defs } as const;
const MOVING = {
  path: Animated.createAnimatedComponent(Path),
  circle: Animated.createAnimatedComponent(Circle),
  ellipse: Animated.createAnimatedComponent(Ellipse),
  rect: Animated.createAnimatedComponent(Rect),
  line: Animated.createAnimatedComponent(Line),
  polygon: Animated.createAnimatedComponent(Polygon),
} as const;

/** Under this height (dp) Shrodi is a picture, not an animation. */
const SMALLEST_LIVE = 64;

/** How long one mood takes to glide into the next. */
const MOOD_MS = 450;

type FrameValue = SharedValue<Frame>;

/** A shape whose own attributes (points, path data, circle centre, opacity) are recomputed every frame. */
function MovingShape({ node, frame }: { node: Node; frame: FrameValue }) {
  const dyn = node.dyn;
  const props = useAnimatedProps(() => (dyn ? dyn(frame.value) : {}));
  const T = MOVING[node.tag as keyof typeof MOVING] as React.ComponentType<Record<string, unknown>>;
  return <T animatedProps={props} {...(node.a ?? {})} />;
}

function NodeView({ node, frame }: { node: Node; frame: FrameValue }) {
  if (node.dyn) return <MovingShape node={node} frame={frame} />;
  const T = STATIC[node.tag] as React.ComponentType<Record<string, unknown>>;
  const extra: Record<string, unknown> = node.id ? { id: node.id } : {};
  return (
    <T {...(node.a ?? {})} {...extra}>
      {node.ch?.map((c, i) => <NodeView key={i} node={c} frame={frame} />)}
    </T>
  );
}

export interface ShrodiProps {
  mood?: Mood;
  /** Rendered height in dp (the width follows the artwork). */
  size?: number;
  /** Play the idle life (default). Always still with reduced motion. */
  live?: boolean;
  /** Leave the arms and paws out (head, coat and tail only), for a picture where he peeks out from behind something. */
  armless?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const Shrodi = memo(function Shrodi({ mood = "idle", size = 160, live = true, armless = false, style, accessibilityLabel }: ShrodiProps) {
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const budget = useMotionBudget();
  // A small Shrodi (a list row, a chat head) holds frame 0, and so does every Shrodi on a phone whose budget has no idle motion:
  // frame 0 is a good drawing (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §5.3 step 4)
  const running = live && focused && !reduced && size >= SMALLEST_LIVE && budget.idleFps > 0;
  const clock = useLoopClock(SHRODI_LOOP_MS, running);
  // On a mid-range phone the idle is held to 30 steps a second: the clock reads the same between steps, so the shape updates
  // have nothing new to send. Blinks and glances read the same at 30. Moods still glide at full rate through `pose`.
  const quantum = idleQuantumMs(budget.idleFps);
  const idleClock = useDerivedValue(() => (quantum > 0 ? Math.floor(clock.value / quantum) * quantum : clock.value));

  // The pose glides to each new mood; an interrupted glide continues from where it is.
  const pose = useSharedValue<Pose>(POSES[mood]);
  useEffect(() => {
    pose.value = reduced ? POSES[mood] : withTiming(POSES[mood], { duration: MOOD_MS, easing: EASE_IN_OUT });
  }, [mood, reduced, pose]);

  const frame = useDerivedValue(() => frameOf(pose.value, idleClock.value));

  // SVG clip ids are global to the screen: make them unique per instance.
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const layers = useMemo(() => buildShrodi(`sh${id}`, { arms: !armless }), [id, armless]);

  const vb = SHRODI_VIEWBOX;
  const scale = size / vb.h;
  const width = vb.w * scale;
  const origin = (p: { x: number; y: number }) => `${(p.x - vb.x) * scale}px ${(p.y - vb.y) * scale}px`;

  // Whole-layer moves are native view transforms (no animated SVG transform strings).
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: frame.value.bob * scale }, { rotate: `${frame.value.lean}deg` }],
  }));
  const headStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${frame.value.tilt}deg` }, { scale: HEAD_SCALE }],
  }));

  const layer = (nodes: Node[]) => (
    <Svg width={width} height={size} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} style={StyleSheet.absoluteFill}>
      {nodes.map((node, i) => (
        <NodeView key={i} node={node} frame={frame} />
      ))}
    </Svg>
  );

  return (
    <Animated.View
      style={[{ width, height: size, transformOrigin: origin(SHRODI_PIVOTS.lean) }, bodyStyle, style]}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "image" : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? "yes" : "no-hide-descendants"}
    >
      {layer(layers.back)}
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: origin(SHRODI_PIVOTS.tilt) }, headStyle]}>{layer(layers.head)}</Animated.View>
      {layer(layers.front)}
    </Animated.View>
  );
});

export type { Mood };
