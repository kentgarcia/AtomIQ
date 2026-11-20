/**
 * NodeBubble — the speech bubble of a tapped lesson-map node: the lesson's title, where it sits in
 * the unit, and the button that opens it (or a hint when it is still locked). No status line: the
 * node already shows it. Placement and wording are in `node-bubble-core.ts`.
 *
 * It opens under the node, or above it when there is no room below (a node low on the screen,
 * by the navbar); the pointer always aims at the node. A flat card in the unit's colour (the locked
 * grey for a locked node), with no lip. Its motion is measured from a reference clip
 * (`bubble-motion-core.ts`): it pops up out of its pointer (200 ms) while a band of light crosses the
 * button and two sparkles twinkle; held, it sinks to 92%; on release the title goes and it zooms up,
 * fading, with dots and sparkles flying out (120 ms) and then dissolves (260 ms in all). `onLaunch`
 * fires at the release so the map can fade the lesson preview in over the dissolving bubble; `onAction`
 * fires when it is gone. With reduced motion it only fades (no band, sparkles or burst).
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";

import { Sparkle } from "@/components/lesson/Sparkle";
import type { ViewRef } from "@/components/tutorial/use-tutorial-target";
import { BUBBLE_FX, bandFrame, launchFrame, particleFrame, popFrame, pressScale, twinkleFrame } from "@/components/path/bubble-motion-core";
import { BUBBLE, bubbleCopy, bubblePlacement, type BubbleKind, type BubbleSide, type BubbleStatus } from "@/components/path/node-bubble-core";
import type { UnitPalette } from "@/components/path/unit-theme";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, pickReadableText, useTheme, withAlpha } from "@/theme";

export interface NodeBubbleProps {
  /** Centre of the node on the map. */
  x: number;
  y: number;
  mapWidth: number;
  /** Which side of the node it opens on. */
  side: BubbleSide;
  /** Height of the node's section of the map, to anchor a bubble that opens upward. */
  sectionHeight: number;
  title: string;
  kind: BubbleKind;
  status: BubbleStatus;
  /** Position of the node in its unit, from 0. */
  index: number;
  total: number;
  /** The unit's colours. Left out, the app's lesson yellow. A locked node's bubble is the locked grey whatever this is. */
  palette?: UnitPalette;
  /** Wording that replaces the lesson map's own (the Atom Maze map speaks of levels): the small line, a sentence under the title, the button of an open stop and the note of a shut one. */
  copy?: { eyebrow?: string; detail?: string; actionLabel?: string; hint?: string };
  /** Shrodi's tour lights the bubble's button through this ref (docs/features/TUTORIAL_SPEC.md). */
  buttonRef?: React.Ref<ViewRef>;
  /** Called the moment its button is released: the screen starts whatever arrives behind the zoom (the lesson preview). */
  onLaunch?: () => void;
  /** Called once the bubble has zoomed and dissolved away after its button was pressed. */
  onAction: () => void;
}

/** Size of a launch dot and a launch sparkle, dp. */
const DOT_SIZE = 7;
const BURST_STAR_SIZE = 14;
/** The button's corner sparkles, dp. */
const TWINKLE_SIZE = 16;

/** One of the dots and sparkles that fly out of the bubble's edge on launch, placed from the middle of the bubble. */
function BurstBit({ i, clock, size, color }: { i: number; clock: SharedValue<number>; size: { width: number; height: number }; color: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const star = i % 2 === 1;
  const anim = useAnimatedStyle(() => {
    const f = particleFrame(i, clock.get());
    return { opacity: f.opacity, transform: [{ translateX: f.x }, { translateY: f.y }, { scale: f.scale }] };
  });
  // The point on the bubble's edge in this particle's direction (a rounded box is close enough to its bounding box)
  const angle = (i / BUBBLE_FX.particleCount) * Math.PI * 2 + 0.4;
  const hw = size.width / 2;
  const hh = size.height / 2;
  const k = Math.min(hw / Math.max(0.001, Math.abs(Math.cos(angle))), hh / Math.max(0.001, Math.abs(Math.sin(angle))));
  const box = star ? BURST_STAR_SIZE : DOT_SIZE;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.burst, { left: hw + Math.cos(angle) * k - box / 2, top: hh + Math.sin(angle) * k - box / 2, width: box, height: box }, anim]}
    >
      {star ? <Sparkle size={box} color={color} /> : <View style={{ flex: 1, borderRadius: box / 2, backgroundColor: color }} />}
    </Animated.View>
  );
}

function NodeBubbleBase({ x, y, mapWidth, side, sectionHeight, title, kind, status, index, total, palette, copy: words, buttonRef, onLaunch, onAction }: NodeBubbleProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();
  const c = theme.colors;

  const place = bubblePlacement({ x, y, mapWidth, current: status === "current" });
  const base = bubbleCopy({ kind, status, index, total });
  const copy = {
    eyebrow: words?.eyebrow ?? base.eyebrow,
    actionLabel: base.actionLabel === null ? null : (words?.actionLabel ?? base.actionLabel),
    hint: words?.hint ?? base.hint,
  };
  const above = side === "above";

  // A locked node's bubble is the locked grey (the node's own); the others wear their unit's colours
  const locked = status === "locked";
  const face = locked ? c.borderStrong : (palette?.face ?? c.lessonHeader);
  const lip = locked ? c.border : (palette?.lip ?? c.lessonCardLip);
  const ink = locked ? pickReadableText(face, [c.text, c.onPrimary]) : (palette?.ink ?? c.lessonHeaderText);
  const sparkle = c.card;

  // Three clocks, ms: the pop (and the shine and sparkles that follow it), the press (0 to 1), the launch
  const pop = useSharedValue(reducedMotion ? 99999 : 0);
  const press = useSharedValue(0);
  const launch = useSharedValue(0);
  const launching = useRef(false);
  const [bubbleSize, setBubbleSize] = useState<{ width: number; height: number } | null>(null);
  const [buttonWidth, setButtonWidth] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    pop.set(withTiming(BUBBLE_FX.sweepEnd + 700, { duration: BUBBLE_FX.sweepEnd + 700, easing: Easing.linear }));
    return () => cancelAnimation(pop);
  }, [pop, reducedMotion]);
  useEffect(
    () => () => {
      cancelAnimation(press);
      cancelAnimation(launch);
    },
    [press, launch],
  );

  const pressIn = useCallback(() => {
    if (reducedMotion || launching.current) return;
    press.set(withTiming(1, { duration: BUBBLE_FX.pressMs, easing: Easing.out(Easing.quad) }));
  }, [press, reducedMotion]);
  // The release comes just before the press is counted: only a finger that slid off or was cancelled lets the bubble back up
  const pressOut = useCallback(() => {
    setTimeout(() => {
      if (!launching.current) press.set(withTiming(0, { duration: BUBBLE_FX.pressMs, easing: Easing.out(Easing.quad) }));
    }, 0);
  }, [press]);

  const act = useCallback(() => {
    if (launching.current) return;
    launching.current = true;
    onLaunch?.();
    launch.set(
      withTiming(BUBBLE_FX.launchTotalMs, { duration: BUBBLE_FX.launchTotalMs, easing: Easing.linear }, (done) => {
        if (done) runOnJS(onAction)();
      }),
    );
  }, [launch, onAction, onLaunch]);

  const motion = useAnimatedStyle(() => {
    const p = popFrame(pop.get());
    // Reduced motion: no growing, sinking or zooming, only a quick fade
    if (reducedMotion) return { opacity: launch.get() > 0 ? 1 - launch.get() / BUBBLE_FX.launchTotalMs : 1, transform: [{ scale: 1 }] };
    if (launch.get() > 0) {
      const l = launchFrame(launch.get());
      return { opacity: l.opacity, transform: [{ scale: p.scale * l.scale }] };
    }
    return { opacity: p.opacity, transform: [{ scale: p.scale * pressScale(press.get()) }] };
  });
  const textStyle = useAnimatedStyle(() => ({ opacity: launch.get() > 0 && !reducedMotion ? launchFrame(launch.get()).titleOpacity : 1 }));
  const bandStyle = useAnimatedStyle(() => {
    const f = bandFrame(pop.get());
    return { opacity: f.opacity, transform: [{ translateX: f.left * buttonWidth }, { skewX: `-${BUBBLE_FX.bandLean}deg` }] };
  });
  const twinkle0 = useAnimatedStyle(() => {
    const f = twinkleFrame(0, pop.get());
    return { opacity: f.size > 0 ? 1 : 0, transform: [{ rotate: `${f.rotate}deg` }, { scale: f.size }] };
  });
  const twinkle1 = useAnimatedStyle(() => {
    const f = twinkleFrame(1, pop.get());
    return { opacity: f.size > 0 ? 1 : 0, transform: [{ rotate: `${f.rotate}deg` }, { scale: f.size }] };
  });

  return (
    <View
      style={[
        styles.wrap,
        // Below: hangs from its top. Above: stands on its lower edge, whatever its height turns out to be
        above ? { left: place.left, bottom: sectionHeight - place.bottomEdge, width: place.width } : { left: place.left, top: place.top, width: place.width },
      ]}
    >
      {/* It grows from its pointer, so the pop-up looks like it comes out of the node */}
      <Animated.View style={[{ transformOrigin: `${place.arrowLeft + BUBBLE.arrow / 2}px ${above ? "100%" : "0%"}` }, motion]}>
        {/* The pointer, aimed at the node. Below the node it is half hidden behind the face... */}
        {above ? null : <View style={[styles.arrow, { left: place.arrowLeft, backgroundColor: face }]} />}

        <View style={[styles.face, { backgroundColor: face }]} onLayout={(e) => setBubbleSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
          <Animated.View style={[styles.texts, textStyle]}>
            <Text style={[styles.eyebrow, { color: withAlpha(ink, 0.75) }]}>{copy.eyebrow}</Text>
            <Text style={[styles.title, { color: ink }]} accessibilityRole="header">
              {title}
            </Text>
            {words?.detail ? <Text style={[styles.detail, { color: withAlpha(ink, 0.9) }]}>{words.detail}</Text> : null}
          </Animated.View>
          {copy.actionLabel ? (
            <Pressable
              ref={buttonRef}
              collapsable={false}
              accessibilityRole="button"
              accessibilityLabel={`${copy.actionLabel}: ${title}`}
              onPressIn={pressIn}
              onPressOut={pressOut}
              onPress={act}
              style={({ pressed }) => [styles.actionLip, { backgroundColor: lip }, pressed ? styles.actionPressed : null]}
            >
              {({ pressed }) => (
                <View>
                  {/* While it is held the button takes the bubble's colour, as in the clip */}
                  <View style={[styles.actionFace, { backgroundColor: pressed ? face : c.card }]} onLayout={(e) => setButtonWidth(e.nativeEvent.layout.width)}>
                    <Text style={[styles.actionLabel, { color: pressed ? ink : palette ? palette.accent : c.lessonButtonLabel }]}>{copy.actionLabel}</Text>
                    {reducedMotion ? null : (
                      <Animated.View pointerEvents="none" style={[styles.band, { width: buttonWidth * BUBBLE_FX.bandWidth, backgroundColor: withAlpha(face, 0.2) }, bandStyle]} />
                    )}
                  </View>
                  {reducedMotion ? null : (
                    <>
                      <Animated.View pointerEvents="none" style={[styles.twinkle, { top: -TWINKLE_SIZE / 2, right: -TWINKLE_SIZE / 3 }, twinkle0]}>
                        <Sparkle size={TWINKLE_SIZE} color={sparkle} />
                      </Animated.View>
                      <Animated.View pointerEvents="none" style={[styles.twinkle, { bottom: -TWINKLE_SIZE / 2 + 4, left: -TWINKLE_SIZE / 3 }, twinkle1]}>
                        <Sparkle size={TWINKLE_SIZE} color={sparkle} />
                      </Animated.View>
                    </>
                  )}
                </View>
              )}
            </Pressable>
          ) : (
            <Text style={[styles.hint, { color: ink }]}>{copy.hint}</Text>
          )}
        </View>
        {/* ...above the node it hangs off the lower edge */}
        {above ? <View style={[styles.arrowDown, { left: place.arrowLeft, backgroundColor: face }]} /> : null}

        {/* The burst of dots and sparkles on launch (the bubble's own clock is the launch clock) */}
        {reducedMotion || !bubbleSize || !copy.actionLabel
          ? null
          : Array.from({ length: BUBBLE_FX.particleCount }, (_, i) => <BurstBit key={i} i={i} clock={launch} size={bubbleSize} color={sparkle} />)}
      </Animated.View>
    </View>
  );
}

export const NodeBubble = memo(NodeBubbleBase);

const makeStyles = createStyles(() => {
  return {
    wrap: {
      position: "absolute",
      zIndex: 30,
    },
    /** The pointer: a square turned 45 degrees, half of it hidden behind the face. */
    arrow: {
      position: "absolute",
      top: -BUBBLE.arrow / 2 + 2,
      width: BUBBLE.arrow,
      height: BUBBLE.arrow,
      borderRadius: 3,
      transform: [{ rotate: "45deg" }],
    },
    /** The pointer when the bubble is above the node: the same square, hanging off the lower edge. */
    arrowDown: {
      position: "absolute",
      bottom: -BUBBLE.arrow / 2 + 2,
      width: BUBBLE.arrow,
      height: BUBBLE.arrow,
      borderRadius: 3,
      transform: [{ rotate: "45deg" }],
    },
    texts: { gap: 4 },
    /** The band of light across the button (the button clips it to its rounded face). */
    band: { position: "absolute", top: -4, bottom: -4, left: 0 },
    twinkle: { position: "absolute" },
    /** A dot or sparkle of the launch burst, placed from the bubble's top-left. */
    burst: { position: "absolute", zIndex: 2 },
    face: {
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 16,
      gap: 4,
    },
    eyebrow: {
      ...fontFaces.heavy,
      fontSize: 11,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    title: {
      ...fontFaces.heavy,
      fontSize: 20,
      lineHeight: 26,
    },
    detail: {
      ...fontFaces.semibold,
      fontSize: 14,
      lineHeight: 20,
    },
    /** The button: a white face on a lip in the unit's dark colour, sinking onto it when pressed. */
    actionLip: {
      marginTop: 12,
      borderRadius: 14,
      paddingBottom: 4,
    },
    actionPressed: { paddingBottom: 0, marginTop: 16 },
    actionFace: {
      overflow: "hidden",
      minHeight: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    actionLabel: {
      ...fontFaces.heavy,
      fontSize: 15,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    hint: {
      ...fontFaces.regular,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 8,
    },
  };
});
