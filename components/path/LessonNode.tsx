/**
 * LessonNode — one stop on the lesson map: a puck seen from above (an elliptical face on a side band), a white glyph that matches
 * the lesson (`node-glyphs.ts`), soft swirl lines on the face, and, on the current node, a ring
 * that shows how far through the unit the learner is.
 *
 * Everything is flat colour (no gradients: they rendered black on a device). The face sinks onto
 * its lip when pressed; on the current node, white fireflies drift around it. The face is the brand yellow, gray when locked.
 */

import React, { memo, useCallback, useMemo } from "react";
import { TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Polyline, Rect } from "react-native-svg";

import { NODE_REVEAL } from "@/components/celebration/celebration-core";
import { POP_TOTAL, faceFrame } from "@/components/lesson/cards/option-pop-core";
import { STAMP_TOTAL, stampFrame } from "@/components/lesson/stamp-core";
import { PopSparkle } from "@/components/motion/PopOnce";
import { useDelayedClock } from "@/components/motion/use-delayed-clock";
import { darken } from "@/components/lesson/visual/color-math";
import { GLYPHS, GLYPH_VIEWBOX, type GlyphId } from "@/components/path/node-glyphs";
import { Fireflies } from "@/components/path/Fireflies";
import { DISC_LEFT, FIREFLY_AREA, NODE, PUCK_CENTER_Y, ringGeometry, swirlArcs } from "@/components/path/node-geometry";
import type { UnitPalette } from "@/components/path/unit-theme";
import type { ViewRef } from "@/components/tutorial/use-tutorial-target";
import { createStyles, useTheme, withAlpha } from "@/theme";
import { DURATION, PRESS_EASING } from "@/theme/motion";

export type NodeStatus = "locked" | "current" | "completed";

export interface LessonNodeProps {
  /** Centre of the node on the map. */
  x: number;
  y: number;
  status: NodeStatus;
  glyph: GlyphId;
  /** Progress through the unit, 0 to 1. Drawn as a ring around the current node only. */
  progress?: number;
  /** The unit's colours (face, ring, fireflies, check badge). Left out, the app's lesson yellow. Locked nodes ignore it. */
  palette?: UnitPalette;
  /**
   * The map just learned this node changed because a lesson was finished (the duolingo-motion-style skill, tier C):
   * "completed" stamps its check badge on, "unlocked" pops its face (it squashes, springs, hangs, lands, hops) with two
   * sparkles. It plays once, `NODE_REVEAL.wait` ms after `revealKey` changes; with reduced motion nothing plays.
   */
  reveal?: "completed" | "unlocked";
  revealKey?: number;
  /** Shrodi's tour lights the puck through this ref (docs/features/TUTORIAL_SPEC.md); only the node it points at gets one. */
  litRef?: React.Ref<ViewRef>;
  accessibilityLabel: string;
  /** Opens the details bubble (every node, locked ones too: the bubble says why). */
  onPress: () => void;
}

const SWIRLS = swirlArcs();

/**
 * The check badge of a completed node. It has its own clock, created with the badge, so a badge that is
 * about to be stamped on is invisible from its very first frame (a clock shared with the node would show the
 * finished badge for a frame before it started).
 */
function CheckBadge({ stamp, revealKey, pressed, color, ink, style }: { stamp: boolean; revealKey?: number; pressed: SharedValue<number>; color: string; ink: string; style: StyleProp<ViewStyle> }) {
  const clock = useDelayedClock(STAMP_TOTAL, NODE_REVEAL.wait + NODE_REVEAL.check, stamp, revealKey);
  const anim = useAnimatedStyle(() => {
    const f = stampFrame(clock.get(), 1);
    return { opacity: f.opacity, transform: [{ translateY: pressed.get() * NODE.press }, { rotate: `${f.rotate}deg` }, { scale: f.scale }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[style, { backgroundColor: color }, anim]}>
      <Svg width={12} height={12} viewBox="0 0 24 24">
        <Polyline points="20 6 9 17 4 12" stroke={ink} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

function LessonNodeBase({
  x,
  y,
  status,
  glyph,
  progress = 0,
  palette,
  reveal,
  revealKey,
  litRef,
  accessibilityLabel,
  onPress,
}: LessonNodeProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();

  const locked = status === "locked";
  const current = status === "current";
  const completed = status === "completed";

  const unitColor = palette?.face ?? c.lessonHeader;
  const unitInk = palette?.ink ?? c.onPrimary;
  const faceColor = locked ? c.borderStrong : unitColor;
  const lipColor = darken(faceColor, locked ? 0.1 : 0.2);
  const glyphColor = locked ? c.textMuted : unitInk;
  const swirlColor = withAlpha(locked ? c.textMuted : unitInk, locked ? 0.18 : 0.16);

  const pressed = useSharedValue(0);

  const pressIn = useCallback(() => {
    pressed.set(withTiming(reducedMotion ? 0.4 : 1, { duration: reducedMotion ? 120 : DURATION.press, easing: PRESS_EASING }));
  }, [pressed, reducedMotion]);
  const pressOut = useCallback(() => {
    pressed.set(withTiming(0, { duration: reducedMotion ? 120 : DURATION.press, easing: PRESS_EASING }));
  }, [pressed, reducedMotion]);

  // The reveal: one clock (ms), resting on its last frame when there is nothing to show
  const clock = useDelayedClock(NODE_REVEAL.total, NODE_REVEAL.wait, reveal !== undefined, revealKey);
  const popping = reveal === "unlocked";

  // The pop lifts the face off its lip (fractions of the face's height) and squashes it; the side band stays put
  const faceStyle = useAnimatedStyle(() => {
    const f = faceFrame(popping ? clock.get() - NODE_REVEAL.pop : POP_TOTAL, 0);
    return { transform: [{ translateY: pressed.get() * NODE.press + f.y * NODE.faceH }, { scaleX: f.sx }, { scaleY: f.sy }] };
  });

  const shape = GLYPHS[glyph] as { shapes: { d: string; sw?: number; fill?: boolean; evenOdd?: boolean }[]; rotate?: number };
  const glyphScale = NODE.glyph / GLYPH_VIEWBOX;
  const glyphOffset = (NODE.disc - NODE.glyph) / 2;

  const ring = current ? ringGeometry(progress) : null;

  return (
    <View style={[styles.wrap, { left: x - NODE.box / 2, top: y - NODE.box / 2 }]}>
      {/* The current node is the active one: white fireflies drift around it */}
      {current ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: NODE.box / 2 - FIREFLY_AREA.width / 2,
            top: PUCK_CENTER_Y - FIREFLY_AREA.height / 2,
          }}
        >
          <Fireflies width={FIREFLY_AREA.width} height={FIREFLY_AREA.height} count={FIREFLY_AREA.count} color={unitColor} />
        </View>
      ) : null}

      {/* Progress ring: behind the node, centred on the face */}
      {ring ? (
        <Svg
          pointerEvents="none"
          width={NODE.ring.box}
          height={NODE.ring.box}
          style={{
            position: "absolute",
            left: NODE.box / 2 - NODE.ring.box / 2,
            top: PUCK_CENTER_Y - NODE.ring.box / 2,
          }}
        >
          <Circle
            cx={ring.cx}
            cy={ring.cy}
            r={ring.radius}
            stroke={withAlpha(c.onPrimary, 0.28)}
            strokeWidth={ring.stroke}
            fill="none"
          />
          {ring.dash[0] > 0 ? (
            <Circle
              cx={ring.cx}
              cy={ring.cy}
              r={ring.radius}
              stroke={unitColor}
              strokeWidth={ring.stroke}
              strokeLinecap="round"
              strokeDasharray={ring.dash}
              rotation={-90}
              originX={ring.cx}
              originY={ring.cy}
              fill="none"
            />
          ) : null}
          <Circle cx={ring.start[0]} cy={ring.start[1]} r={ring.stroke / 2 + 1} fill={unitColor} />
          {ring.dash[0] > 0 ? <Circle cx={ring.end[0]} cy={ring.end[1]} r={ring.stroke / 2 + 1} fill={unitColor} /> : null}
        </Svg>
      ) : null}

      <View ref={litRef} collapsable={false} style={styles.disc}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={onPress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint="Shows the lesson details"
          style={styles.touch}
        >
          {/* The side band: a bottom ellipse joined to the face by a block */}
          <Svg width={NODE.disc} height={NODE.box} style={styles.layer}>
            <Rect x={0} y={NODE.faceH / 2} width={NODE.disc} height={NODE.lip} fill={lipColor} />
            <Ellipse cx={NODE.disc / 2} cy={NODE.faceH / 2 + NODE.lip} rx={NODE.disc / 2} ry={NODE.faceH / 2} fill={lipColor} />
          </Svg>

          <Animated.View style={[styles.layer, { width: NODE.disc, height: NODE.faceH }, faceStyle]}>
            {/* Drawn as a round disc and squashed to the face's height */}
            <Svg width={NODE.disc} height={NODE.faceH} viewBox={`0 0 ${NODE.disc} ${NODE.disc}`} preserveAspectRatio="none">
              <Circle cx={NODE.disc / 2} cy={NODE.disc / 2} r={NODE.disc / 2} fill={faceColor} />
              {SWIRLS.map((s, i) => (
                <Path key={i} d={s.d} stroke={swirlColor} strokeWidth={s.sw} strokeLinecap="round" fill="none" />
              ))}
              <G
                transform={`translate(${glyphOffset} ${glyphOffset}) scale(${glyphScale})`}
              >
                <G rotation={shape.rotate ?? 0} originX={GLYPH_VIEWBOX / 2} originY={GLYPH_VIEWBOX / 2}>
                  {shape.shapes.map((s, i) => {
                    const fill = s.fill ?? s.sw === undefined;
                    return (
                      <Path
                        key={i}
                        d={s.d}
                        fill={fill ? glyphColor : "none"}
                        fillRule={s.evenOdd ? "evenodd" : undefined}
                        stroke={s.sw ? glyphColor : undefined}
                        strokeWidth={s.sw}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })}
                </G>
              </G>
            </Svg>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* The unlocked node's pop: two sparkles twinkle on the face's corners */}
      {popping && !reducedMotion ? (
        <>
          <PopSparkle i={0} clock={clock} at={NODE_REVEAL.pop} color={unitColor} place={{ left: DISC_LEFT - 6, top: -8 }} />
          <PopSparkle i={1} clock={clock} at={NODE_REVEAL.pop} color={unitColor} place={{ right: DISC_LEFT - 4, top: NODE.faceH - 14 }} />
        </>
      ) : null}

      {/* Completed: a check badge on the lip, following the face down when pressed (stamped on when a lesson was just finished) */}
      {completed ? (
        <CheckBadge stamp={reveal === "completed"} revealKey={revealKey} pressed={pressed} color={unitColor} ink={c.text} style={styles.badge} />
      ) : null}
    </View>
  );
}

export const LessonNode = memo(LessonNodeBase);

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    wrap: {
      position: "absolute",
      width: NODE.box,
      height: NODE.box,
      zIndex: 10,
    },
    disc: {
      position: "absolute",
      left: DISC_LEFT,
      top: 0,
      width: NODE.disc,
      height: NODE.box,
    },
    touch: {
      width: NODE.disc,
      height: NODE.box,
    },
    layer: {
      position: "absolute",
      left: 0,
      top: 0,
    },
    badge: {
      position: "absolute",
      right: DISC_LEFT - 2,
      bottom: 0,
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 3,
      borderColor: c.card,
      backgroundColor: c.lessonHeader,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 20,
    },
  };
});
