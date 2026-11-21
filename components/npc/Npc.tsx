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
 * The `bust` form (the lesson teacher) holds still instead: no bob, no sway, so its rounded shirt edge stays
 * put against the frame; only expressions move (blinks, a glance, a grin, each cross-faded over the resting face).
 * One loop clock drives all of it. Still (frame 0) with reduced motion, when the screen is not in
 * front, when `live` is false, or at chip size. See components/motion/MOTION.md.
 */

import { useIsFocused } from "expo-router";
import { memo, useMemo } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import Svg, { ClipPath, Defs, G, Path } from "react-native-svg";

import { EASE_OUT, track, useLoopClock, wave, type Keys } from "@/components/motion/motion";

import {
  NPC_BLINKS,
  NPC_BLINK_MS,
  NPC_IDLE_PERIODS,
  NPC_LOOP_MS,
  NPC_MOOD_FADE,
  NPC_VIEWBOX,
  POSES,
  buildNpc,
  mutedSpec,
  popClipPath,
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

/** A mood's opacity over the loop: 0, up over the fade, held, down over the fade, 0. */
function moodKeys(from: number, to: number): Keys {
  return [
    [0, 0],
    [from, 0],
    [from + NPC_MOOD_FADE, 1],
    [to, 1],
    [to + NPC_MOOD_FADE, 0],
    [NPC_LOOP_MS, 0],
  ];
}

/** One expression of the bust, faded in over the resting face and out again. */
function MoodLayer({ parts, from, to, form, width, height, clock }: { parts: Part[]; from: number; to: number; form: NpcForm; width: number; height: number; clock: SharedValue<number> }) {
  const keys = useMemo(() => moodKeys(from, to), [from, to]);
  const style = useAnimatedStyle(() => ({ opacity: track(clock.value, keys) }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Layer parts={parts} form={form} width={width} height={height} />
    </Animated.View>
  );
}

export interface NpcProps {
  spec: NpcSpec;
  pose?: PoseId;
  /** Rendered height in dp. */
  size?: number;
  /** `hero`: the bust with arms. `head`: head and shoulders (chips, banners). `bust`: the lesson teacher, close in and held still. */
  form?: NpcForm;
  /** Idle life. False draws one still frame. Chips pass false. */
  live?: boolean;
  /** The locked ("before") version: cool pastels, never grey. */
  muted?: boolean;
  /**
   * Draws an outline of this colour round the whole figure (a flat ring, `OUTLINE_W` drawing units thick, behind it), so it stands out from a
   * background of its own colour. The ring is a still silhouette: use it with the held-still `bust` or `live={false}`, not a breathing figure.
   */
  outline?: string;
  /** Scales the idle breathing and head sway (default 1). For a figure shown large and still for a while. The `bust` ignores it: it never moves. */
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
      {form === "pop" ? (
        <>
          <Defs>
            <ClipPath id="pop-clip">
              <Path d={popClipPath()} />
            </ClipPath>
          </Defs>
          <G clipPath="url(#pop-clip)">
            {parts.map((p, i) => (
              <PartView key={i} part={p} />
            ))}
          </G>
        </>
      ) : (
        parts.map((p, i) => <PartView key={i} part={p} />)
      )}
    </Svg>
  );
});

/** How thick an outline is, in drawing units, and how far the outline's picture reaches past the form's box (half the thickness, plus a little). */
const OUTLINE_W = 6;
const OUTLINE_PAD = OUTLINE_W / 2 + 1;

/**
 * The ring round a figure: every part of the drawing as one colour, fattened by a round-joined stroke, under the figure. Its picture is a few
 * units larger than the form's box on the sides and the top (not the bottom: the bust's shirt ends flush there), so the ring is not cut off.
 */
const OutlineLayer = memo(function OutlineLayer({ spec, pose, form, width, height, color }: { spec: NpcSpec; pose: PoseId; form: NpcForm; width: number; height: number; color: string }) {
  const parts = useMemo(() => treeParts(buildNpc(spec, pose, form)), [spec, pose, form]);
  const vb = NPC_VIEWBOX[form];
  const k = height / vb.h;
  const pad = OUTLINE_PAD * k;
  return (
    <Svg
      width={width + 2 * pad}
      height={height + pad}
      viewBox={`${vb.x - OUTLINE_PAD} ${vb.y - OUTLINE_PAD} ${vb.w + 2 * OUTLINE_PAD} ${vb.h + OUTLINE_PAD}`}
      style={{ position: "absolute", left: -pad, top: -pad }}
    >
      {parts.map((p, i) =>
        "fill" in p ? (
          <Path key={i} d={p.d} fill={color} fillRule={p.evenOdd ? "evenodd" : undefined} stroke={color} strokeWidth={OUTLINE_W} strokeLinejoin="round" />
        ) : (
          <Path key={i} d={p.d} fill="none" stroke={color} strokeWidth={p.sw + OUTLINE_W} strokeLinecap="round" strokeLinejoin="round" />
        ),
      )}
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
  const tree = useMemo(() => buildNpc(spec, pose, form), [spec, pose, form]);
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
  // The held-still bust: what lies under the fading layers (back, face) and what lies over them (top, front) never moves, so each is ONE
  // Svg instead of two (docs/features/RENDER_COST_SPEC.md C2: the lesson teacher was 8 Svg views, now 6)
  const stillUnder = useMemo(() => [...tree.back, ...tree.face], [tree]);
  const stillOver = useMemo(() => [...tree.top, ...tree.front], [tree]);

  if (!clock) return <Layer parts={treeParts(tree)} form={form} width={width} height={height} />;
  if (tree.moods) {
    // Held still: nothing translates or rotates, only expressions change
    return (
      <Animated.View style={StyleSheet.absoluteFill}>
        <Layer parts={stillUnder} form={form} width={width} height={height} />
        {tree.moods.map((m, i) => (
          <MoodLayer key={i} parts={m.face} from={m.from} to={m.to} form={form} width={width} height={height} clock={clock} />
        ))}
        <Animated.View style={[StyleSheet.absoluteFill, lidStyle]}>
          <Layer parts={tree.lids} form={form} width={width} height={height} />
        </Animated.View>
        <Layer parts={stillOver} form={form} width={width} height={height} />
      </Animated.View>
    );
  }
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
export const Npc = memo(function Npc({ spec, pose = "idle", size = 150, form = "hero", live = true, muted = false, outline, lively = 1, style }: NpcProps) {
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
      {outline ? <OutlineLayer spec={shown} pose={pose} form={form} width={width} height={size} color={outline} /> : null}
      {/* Keyed by pose: a new pose mounts a second figure that fades in while the old one fades out. */}
      <Animated.View key={pose} style={StyleSheet.absoluteFill} {...fade}>
        <Figure spec={shown} pose={pose} form={form} width={width} height={size} clock={moving ? clock : null} lively={lively} />
      </Animated.View>
    </Animated.View>
  );
});
