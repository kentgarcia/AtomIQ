/**
 * A teacher, alive. The drawing is `npc-art.ts` (pure data); this file renders it with
 * react-native-svg as stacked layers and gives it idle life.
 *
 * Moves are native view transforms and opacity only (no animated SVG `transform` strings, no
 * gradients: the device failures behind the Shrodi rules):
 *   - the whole body bobs (breathing),
 *   - the head layers sway about the neck (not while a hand is on the face),
 *   - a blink fades the lids layer in and out,
 *   - a new pose cross-fades from the old one (a short fade, never a hard swap).
 * One loop clock drives all of it. Still (frame 0) with reduced motion, when the screen is not in
 * front, when `live` is false, or at chip size. See components/motion/MOTION.md.
 */

import { useIsFocused } from "expo-router";
import { memo, useMemo } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, type SharedValue } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { EASE_OUT, track, useLoopClock, wave, type Keys } from "@/components/motion/motion";

import {
  NPC_BLINKS,
  NPC_BLINK_MS,
  NPC_IDLE_PERIODS,
  NPC_LOOP_MS,
  NPC_VIEWBOX,
  POSES,
  buildNpc,
  mutedSpec,
  treeParts,
  type NpcForm,
  type NpcSpec,
  type Part,
  type PoseId,
} from "./npc-art";

/** The blink as a track over the loop: 0 open, 1 lids down. */
const BLINK: Keys = [
  [0, 0],
  ...NPC_BLINKS.flatMap((t): [number, number][] => [
    [t, 0],
    [t + NPC_BLINK_MS * 0.3, 1],
    [t + NPC_BLINK_MS * 0.6, 1],
    [t + NPC_BLINK_MS, 0],
  ]),
  [NPC_LOOP_MS, 0],
];

/** Neck base in drawing units: the pivot the head sways about. */
const NECK_PIVOT = { x: 0, y: 56 };
const BOB_UNITS = 1.6;
const SWAY_DEG = 1.3;
const FADE_MS = 220;

export interface NpcProps {
  spec: NpcSpec;
  pose?: PoseId;
  /** Rendered height in dp. */
  size?: number;
  /** `hero`: the bust with arms. `head`: head and shoulders (chips, banners). */
  form?: NpcForm;
  /** Idle life. False draws one still frame. Chips pass false. */
  live?: boolean;
  /** The locked ("before") version: cool pastels, never grey. */
  muted?: boolean;
  /** Scales the idle breathing and head sway (default 1). For a figure shown large and still for a while. */
  lively?: number;
  style?: StyleProp<ViewStyle>;
}

function PartView({ part }: { part: Part }) {
  return "fill" in part ? (
    <Path d={part.d} fill={part.fill} fillRule={part.evenOdd ? "evenodd" : undefined} />
  ) : (
    <Path d={part.d} fill="none" stroke={part.stroke} strokeWidth={part.sw} strokeLinecap="round" strokeLinejoin="round" />
  );
}

const Layer = memo(function Layer({ parts, form, width, height }: { parts: Part[]; form: NpcForm; width: number; height: number }) {
  const vb = NPC_VIEWBOX[form];
  return (
    <Svg width={width} height={height} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} style={StyleSheet.absoluteFill}>
      {parts.map((p, i) => (
        <PartView key={i} part={p} />
      ))}
    </Svg>
  );
});

/** One pose of the character: still (a single Svg) or live (layers on a shared clock). */
const Figure = memo(function Figure({
  spec,
  pose,
  form,
  width,
  height,
  clock,
  lively,
}: {
  spec: NpcSpec;
  pose: PoseId;
  form: NpcForm;
  width: number;
  height: number;
  clock: SharedValue<number> | null;
  lively: number;
}) {
  const tree = useMemo(() => buildNpc(spec, pose), [spec, pose]);
  const vb = NPC_VIEWBOX[form];
  const scale = height / vb.h;
  const sway = POSES[pose].sway;
  const origin = `${(NECK_PIVOT.x - vb.x) * scale}px ${(NECK_PIVOT.y - vb.y) * scale}px`;

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: clock ? BOB_UNITS * lively * scale * wave(clock.value, NPC_IDLE_PERIODS.bob) : 0 }],
  }));
  const headStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${clock && sway ? SWAY_DEG * lively * wave(clock.value, NPC_IDLE_PERIODS.sway, 0.25) : 0}deg` }],
  }));
  const lidStyle = useAnimatedStyle(() => ({ opacity: clock ? track(clock.value, BLINK) : 0 }));

  if (!clock) return <Layer parts={treeParts(tree)} form={form} width={width} height={height} />;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
      <Layer parts={tree.back} form={form} width={width} height={height} />
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: origin }, headStyle]}>
        <Layer parts={tree.face} form={form} width={width} height={height} />
        <Animated.View style={[StyleSheet.absoluteFill, lidStyle]}>
          <Layer parts={tree.lids} form={form} width={width} height={height} />
        </Animated.View>
        <Layer parts={tree.top} form={form} width={width} height={height} />
      </Animated.View>
      <Layer parts={tree.front} form={form} width={width} height={height} />
    </Animated.View>
  );
});

/** Decorative: hidden from screen readers. The words a teacher says are always real text beside it. */
export const Npc = memo(function Npc({ spec, pose = "idle", size = 150, form = "hero", live = true, muted = false, lively = 1, style }: NpcProps) {
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const moving = live && focused && !reduced;
  const clock = useLoopClock(NPC_LOOP_MS, moving);
  const shown = useMemo(() => (muted ? mutedSpec(spec) : spec), [spec, muted]);

  const vb = NPC_VIEWBOX[form];
  const width = (size * vb.w) / vb.h;
  const fade = (moving ? { entering: FadeIn.duration(FADE_MS).easing(EASE_OUT), exiting: FadeOut.duration(FADE_MS).easing(EASE_OUT) } : {}) as object;

  return (
    <Animated.View
      style={[{ width, height: size }, style]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      {/* Keyed by pose: a new pose mounts a second figure that fades in while the old one fades out. */}
      <Animated.View key={pose} style={StyleSheet.absoluteFill} {...fade}>
        <Figure spec={shown} pose={pose} form={form} width={width} height={size} clock={moving ? clock : null} lively={lively} />
      </Animated.View>
    </Animated.View>
  );
});
