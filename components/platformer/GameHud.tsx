/**
 * The platformer's heads-up display. The top row is the lesson screen's own progress bar (the same
 * track, fill and shine, `LessonRun`'s `Header`) with a bare pause icon on its right; on the
 * bar sit only the level's checkpoint flags and the goal flag (a door arch, faded while a boss still guards it). Under
 * the row, top left, are the hearts with the pack's coin and a compact `x 12` in its digit sprites right
 * below, each popping when it changes. The fill reads the per-frame array in `useAnimatedStyle`, so it
 * moves with no React render; the bar steps aside in a battle. A clock (the run's time outside battles, m:ss)
 * sits under the pause icon. Hidden while the level loads and walks in, and on the result.
 */

import { Image, Pressable, View } from "react-native";
import Animated, { useDerivedValue, type SharedValue } from "react-native-reanimated";

import { PopWhen } from "@/components/motion/PopOnce";
import { Icon } from "@/components/ui/icon";
import { useFillStyle } from "@/components/ui/progress-fill";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, radius, spacing, useTheme, withAlpha } from "@/theme";

import { MAX_HEARTS, type Level } from "./platformer-core";
import { HERO_DRAW } from "./platformer-view";
import { HUD_DIGITS, HUD_ICON_COLOR, HUD_MULTIPLY, HUD_SHADOW_COLOR, PROP_SPRITES } from "./sprites";
import { formatTime } from "./story-core";

const COIN = 30;
const DIGIT = 26;
/** The pack's digits sit on a wide canvas, so they are set this close together. */
const DIGIT_STEP = 15;
const HEART = 30;
const FLAG = 30;
const MARK = 24;

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    barWrap: { flex: 1, height: 16, marginRight: spacing.xs },
    bar: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: radius.full, backgroundColor: withAlpha(c.border, 0.9), overflow: "hidden" },
    barFill: { width: "100%", height: "100%", borderRadius: radius.full, backgroundColor: c.primary },
    barShine: { position: "absolute", top: 3, left: spacing.sm, right: spacing.sm, height: 4, borderRadius: radius.full, backgroundColor: withAlpha(c.onPrimary, 0.3) },
    // icon only, no container
    pause: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    pausePressed: { opacity: 0.6 },
    clock: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 2 },
    clockText: { ...fontFaces.heavy, fontSize: 20, lineHeight: 26, color: HUD_ICON_COLOR, textShadowColor: HUD_SHADOW_COLOR, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 },
  };
});

/** A number in the pack's chunky digits: `x` then the digits. */
function HudNumber({ value }: { value: number }) {
  const digits = String(Math.max(0, Math.floor(value))).split("").map(Number);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", height: DIGIT }}>
      <Image source={HUD_MULTIPLY} style={{ width: DIGIT, height: DIGIT, marginRight: DIGIT_STEP - DIGIT }} fadeDuration={0} />
      {digits.map((d, i) => (
        <Image key={i} source={HUD_DIGITS[d]} style={{ width: DIGIT, height: DIGIT, marginRight: i === digits.length - 1 ? 0 : DIGIT_STEP - DIGIT }} fadeDuration={0} />
      ))}
    </View>
  );
}

export interface GameHudProps {
  level: Level;
  tile: number;
  /** Top safe-area inset, px. */
  top: number;
  frame: SharedValue<number[]>;
  hearts: number;
  coins: number;
  /** Keys held (shown only on a level that has keys). */
  keys?: number;
  /** Whole seconds played, outside battles (the timer for the best run). */
  seconds?: number;
  /** The boss still guards the flag. */
  flagLocked: boolean;
  /** In a battle the bar steps aside. */
  inBattle: boolean;
  onPause: () => void;
}

export function GameHud({ level, tile, top, frame, hearts, coins, keys = 0, seconds = 0, flagLocked, inBattle, onPause }: GameHudProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const span = Math.max(1, level.cols - 1);
  const half = (HERO_DRAW * tile) / 2;
  const progress = useDerivedValue(() => {
    const x = ((frame.get()[2] ?? 0) + half) / tile;
    return Math.max(0.04, Math.min(1, x / span));
  });
  const fill = useFillStyle(progress);
  const hasFlag = level.decor.some((d) => d.kind === "flag");
  const checkpoints = level.decor.filter((d) => d.kind === "checkpoint");

  return (
    <View style={{ position: "absolute", left: 12, right: 12, top: top + 8, gap: 8 }} pointerEvents="box-none">
      <View style={styles.top} pointerEvents="box-none">
        <View style={[styles.barWrap, inBattle && { opacity: 0 }]} pointerEvents="none" accessible accessibilityRole="progressbar" accessibilityLabel="Level progress">
          <View style={styles.bar}>
            <Animated.View style={[styles.barFill, fill]}>
              <View style={styles.barShine} />
            </Animated.View>
          </View>
          {checkpoints.map((d, i) => (
            <Image key={`c${i}`} source={PROP_SPRITES.flagB} style={{ position: "absolute", left: `${Math.min(1, d.c / span) * 100}%`, marginLeft: -MARK / 2, top: -(MARK - 16) / 2 - 3, width: MARK, height: MARK }} fadeDuration={0} />
          ))}
          {hasFlag ? <Image source={PROP_SPRITES.doorClosedTop} style={{ position: "absolute", right: -6, top: -(FLAG - 16) / 2 - 6, width: FLAG, height: FLAG, opacity: flagLocked ? 0.45 : 1 }} fadeDuration={0} /> : null}
        </View>
        <Pressable onPress={onPause} hitSlop={8} accessibilityRole="button" accessibilityLabel="Pause" style={({ pressed }) => [styles.pause, pressed && styles.pausePressed]}>
          <Icon name="Pause" size={34} color={HUD_ICON_COLOR} variant="Bold" />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }} pointerEvents="none">
      <View>
        <PopWhen trigger={hearts} intensity={0.6}>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 0 }}>
            {Array.from({ length: MAX_HEARTS }, (_, i) => (
              <Image key={i} source={i < hearts ? PROP_SPRITES.heart : PROP_SPRITES.heartEmpty} style={{ width: HEART, height: HEART, marginRight: -2 }} fadeDuration={0} />
            ))}
          </View>
        </PopWhen>
        <PopWhen trigger={coins} intensity={0.6}>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: -2 }}>
            <Image source={PROP_SPRITES.hudCoin} style={{ width: COIN, height: COIN }} fadeDuration={0} />
            <HudNumber value={coins} />
          </View>
        </PopWhen>
        {level.keys.length > 0 ? (
          <PopWhen trigger={keys} intensity={0.6}>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: -2 }}>
              <Image source={PROP_SPRITES.hudKey} style={{ width: COIN, height: COIN }} fadeDuration={0} />
              <HudNumber value={keys} />
            </View>
          </PopWhen>
        ) : null}
      </View>
        <View style={styles.clock} accessible accessibilityRole="timer" accessibilityLabel={`Time ${formatTime(seconds)}`}>
          <Icon name="Timer1" size={22} color={HUD_ICON_COLOR} variant="Bold" />
          <Text style={styles.clockText}>{formatTime(seconds)}</Text>
        </View>
      </View>
    </View>
  );
}
