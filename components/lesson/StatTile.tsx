/**
 * A square stat tile for the finish screen: a coloured shell with a small label across the top and a
 * rounded face inside holding an icon over a big value (XP, time, accuracy). The label text colour
 * is picked for contrast against the shell, never assumed white.
 *
 * The finish screen reveals the tiles one at a time (`revealAt`). Each reveal is one clock played
 * once (timeline and maths in `stat-reveal-core.ts`): the icon and value appear alone and big with
 * small stars bursting round them while the number counts up, the stars are pulled back in as
 * they settle to tile size, the tile fades in around them with a ring of light and two twinkling
 * corner stars. Once every tile is in, a band of light glides across each tile (`shineAt`),
 * tile after tile, and comes round again every few seconds. With reduced motion the tile is
 * simply there, with its final number and no shine.
 */

import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { createStyles, fontFaces, fontSizes, pickReadableText, radius, spacing, useTheme, withAlpha } from "@/theme";

import { Sparkle } from "./Sparkle";
import { STAT_FX, STAT_TOTAL, cornerStarFrame, countValue, starFrame, statFrame } from "./stat-reveal-core";

const STAR_SIZE = 16;
const CORNER_STAR_SIZE = 20;
const RING_WIDTH = 4;
/** The tiles are square; on a tablet they stop growing here and the row is centred. */
const TILE_MAX_WIDTH = 112;

const useStyles = createStyles((theme) => ({
  tile: { flex: 1, aspectRatio: 1, maxWidth: TILE_MAX_WIDTH },
  shellWrap: { flex: 1 },
  shell: { flex: 1, borderRadius: radius.xl, paddingHorizontal: 3, paddingBottom: 3, overflow: "hidden" },
  label: { ...fontFaces.heavy, fontSize: fontSizes.md, letterSpacing: 0.8, textTransform: "uppercase", textAlign: "center", paddingVertical: spacing.xs },
  value: { ...fontFaces.black, fontSize: fontSizes["6xl"], color: theme.colors.text, fontVariant: ["tabular-nums"] },
  face: { flex: 1, borderRadius: radius.lg, backgroundColor: theme.colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xs },
  shine: { position: "absolute", top: -12, bottom: -12, left: 0 },
  ring: { position: "absolute", top: -RING_WIDTH, left: -RING_WIDTH, right: -RING_WIDTH, bottom: -RING_WIDTH, borderRadius: radius.xl + RING_WIDTH, borderWidth: RING_WIDTH },
  hero: { position: "absolute", alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xs, zIndex: 2 },
  star: { position: "absolute", zIndex: 3 },
}));

/** How long one sweep of light takes, and how long the tile rests before the next one. */
export const SHINE_SWEEP_MS = 700;
export const SHINE_REPEAT_MS = 4600;

interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One of the stars round the icon and value, placed from the middle of the face. */
function BurstStar({ i, clock, face, color }: { i: number; clock: SharedValue<number>; face: FaceBox; color: string }) {
  const styles = useStyles(useTheme().theme);
  const anim = useAnimatedStyle(() => {
    const f = starFrame(i, clock.get());
    return { opacity: f.opacity, transform: [{ translateX: f.x }, { translateY: f.y }, { rotate: `${f.rotate}deg` }, { scale: f.scale }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.star, { left: face.x + face.width / 2 - STAR_SIZE / 2, top: face.y + face.height / 2 - STAR_SIZE / 2 }, anim]}
    >
      <Sparkle size={STAR_SIZE} color={color} />
    </Animated.View>
  );
}

/** A star that twinkles on a corner of the tile while the ring flashes. */
function CornerStar({ i, clock, color }: { i: 0 | 1; clock: SharedValue<number>; color: string }) {
  const styles = useStyles(useTheme().theme);
  const anim = useAnimatedStyle(() => {
    const f = cornerStarFrame(i, clock.get());
    return { opacity: f.opacity, transform: [{ rotate: `${f.rotate}deg` }, { scale: f.scale }] };
  });
  const place = i === 0 ? { top: -CORNER_STAR_SIZE / 2, right: -CORNER_STAR_SIZE / 2 } : { bottom: -CORNER_STAR_SIZE / 2, left: -CORNER_STAR_SIZE / 2 };
  return (
    <Animated.View pointerEvents="none" style={[styles.star, place, anim]}>
      <Sparkle size={CORNER_STAR_SIZE} color={color} />
    </Animated.View>
  );
}

export interface StatTileProps {
  tone: string;
  label: string;
  /** The final text of the value. */
  value: string;
  icon: ReactNode;
  accessibilityLabel: string;
  /** When the reveal starts, ms after the screen appears. Omit to show the tile at once. */
  revealAt?: number;
  /** When its first sweep of light starts, ms after the screen appears. Omit for no shine. */
  shineAt?: number;
  /** Count the value up from 0 to this number during the reveal. Needs `format`. */
  countTo?: number;
  /** Turns the counted number into the text shown (`${n}%`, "1:38"). */
  format?: (n: number) => string;
}

export function StatTile({ tone, label, value, icon, accessibilityLabel, revealAt, shineAt, countTo, format }: StatTileProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const reduced = useReducedMotion();
  const animate = !reduced && revealAt !== undefined;
  const shines = animate && shineAt !== undefined;
  const counts = animate && countTo !== undefined && format !== undefined;
  const [width, setWidth] = useState(0);
  const [face, setFace] = useState<FaceBox | null>(null);
  const [counted, setCounted] = useState(0);
  // The reveal clock: 0 (nothing shown) up to STAT_TOTAL (the finished tile). Finished from the start without a reveal.
  const clock = useSharedValue(animate ? 0 : STAT_TOTAL);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (!animate || revealAt === undefined) return;
    cancelAnimation(clock);
    clock.set(0);
    clock.set(withDelay(revealAt, withTiming(STAT_TOTAL, { duration: STAT_TOTAL, easing: Easing.linear })));
    return () => cancelAnimation(clock);
  }, [animate, revealAt, clock]);

  // The number is text, so it is counted on the JS thread: one update per new whole number
  useAnimatedReaction(
    () => (counts ? countValue(clock.get(), countTo ?? 0) : 0),
    (v, prev) => {
      if (counts && v !== prev) runOnJS(setCounted)(v);
    },
    [counts, countTo],
  );

  useEffect(() => {
    if (!shines || shineAt === undefined) return;
    const rest = SHINE_REPEAT_MS - SHINE_SWEEP_MS;
    sweep.set(0);
    sweep.set(
      withDelay(
        shineAt,
        withRepeat(withSequence(withTiming(1, { duration: SHINE_SWEEP_MS, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: rest }), withTiming(0, { duration: 0 })), -1, false),
      ),
    );
    return () => cancelAnimation(sweep);
  }, [shines, shineAt, sweep]);

  const shellStyle = useAnimatedStyle(() => {
    const f = statFrame(clock.get());
    return { opacity: f.shellOpacity, transform: [{ scale: f.shellScale }] };
  });
  const ringStyle = useAnimatedStyle(() => {
    const f = statFrame(clock.get());
    return { opacity: f.ringOpacity, transform: [{ scale: f.ringScale }] };
  });
  const heroStyle = useAnimatedStyle(() => {
    const f = statFrame(clock.get());
    return { opacity: f.heroOpacity, transform: [{ scale: f.heroScale }] };
  });
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: statFrame(clock.get()).iconScale }] }));

  // The band of light is a third of the tile wide and leans; it starts fully off the left edge and ends off the right
  const band = Math.max(40, width * 0.34);
  const shineStyle = useAnimatedStyle(() => ({
    opacity: sweep.get() > 0 && sweep.get() < 1 ? 1 : 0,
    transform: [{ translateX: -band * 1.5 + sweep.get() * (width + band * 3) }, { rotate: "18deg" }],
  }));

  const light = theme.palettes.tab.white;
  const shown = counts && format ? format(counted) : value;
  const content = (text: string, withPulse: boolean) => (
    <>
      {withPulse ? <Animated.View style={iconStyle}>{icon}</Animated.View> : icon}
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {text}
      </Text>
    </>
  );

  return (
    <View style={styles.tile} accessible accessibilityLabel={accessibilityLabel}>
      <Animated.View style={[styles.shellWrap, animate ? shellStyle : null]}>
        <View style={[styles.shell, { backgroundColor: tone }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          <Text style={[styles.label, { color: pickReadableText(tone, [c.onPrimary, c.text]) }]} numberOfLines={1} adjustsFontSizeToFit>
            {label}
          </Text>
          {/* The face holds the finished icon and value unseen, so the tile is the right size; the visible ones are the hero below */}
          <View style={styles.face} onLayout={(e) => setFace(e.nativeEvent.layout)}>
            <View style={{ opacity: 0, alignItems: "center" }}>{content(value, false)}</View>
          </View>
          {shines ? (
            <Animated.View pointerEvents="none" style={[styles.shine, { width: band }, shineStyle]}>
              <LinearGradient
                colors={[withAlpha(light, 0), withAlpha(light, 0.5), withAlpha(light, 0)]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          ) : null}
        </View>
      </Animated.View>
      {animate ? <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: light }, ringStyle]} /> : null}
      {face ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.hero, { left: face.x, top: face.y, width: face.width, height: face.height }, animate ? heroStyle : null]}
        >
          {content(shown, animate)}
        </Animated.View>
      ) : null}
      {animate && face
        ? Array.from({ length: STAT_FX.starCount }, (_, i) => <BurstStar key={i} i={i} clock={clock} face={face} color={tone} />)
        : null}
      {animate ? (
        <>
          <CornerStar i={0} clock={clock} color={tone} />
          <CornerStar i={1} clock={clock} color={tone} />
        </>
      ) : null}
    </View>
  );
}
