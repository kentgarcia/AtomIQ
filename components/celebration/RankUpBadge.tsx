/**
 * One badge of the "ranked up" dialog (timeline in `celebration-core.ts`, tier D): a ring fills
 * round the OLD level's picture, then on the first frame of the pop the picture flips to the new level
 * (no cross-fade) while it squashes, springs, hangs and lands (`PopOnce`), with a burst of gold stars
 * at the hang. A badge past `RANK_UP.maxAnimated` is drawn plain, already at its new level. Reduced
 * motion also shows the new level at once.
 *
 * The haptic is here, on the pop's landing; the sound (`reward.rank-up`) is played by the screen
 * when the dialog opens.
 */

import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedProps, useAnimatedStyle, useReducedMotion } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { AchievementBadge } from "@/components/achievements/AchievementBadge";
import { DIALOG_SETTLE_MS, POP_CONTACT, RANK_UP, RANK_UP_BADGE_TOTAL, rankRing, rankUpStart } from "@/components/celebration/celebration-core";
import { Burst } from "@/components/motion/Burst";
import { PopOnce } from "@/components/motion/PopOnce";
import { useDelayedClock } from "@/components/motion/use-delayed-clock";
import type { AchievementTrack } from "@/services/achievements-core";
import { impactMedium } from "@/services/haptics";
import { useTheme } from "@/theme";

const RING_STROKE = 5;
const RING_GAP = 6;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function RankUpBadge({ track, from, to, index, size = 56 }: { track: AchievementTrack; from: number; to: number; index: number; size?: number }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const reduced = useReducedMotion();
  const animated = index < RANK_UP.maxAnimated && !reduced;
  const start = DIALOG_SETTLE_MS + rankUpStart(index);
  const clock = useDelayedClock(RANK_UP_BADGE_TOTAL, start, animated);

  useEffect(() => {
    if (!animated) return;
    const id = setTimeout(impactMedium, start + RANK_UP.pop + POP_CONTACT);
    return () => clearTimeout(id);
  }, [animated, start]);

  const box = size + (RING_STROKE + RING_GAP) * 2;
  const radius = (size + RING_GAP * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - rankRing(clock.get()).fill) }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: rankRing(clock.get()).opacity }));
  // The picture flips to the new level on the first frame of the pop
  const oldStyle = useAnimatedStyle(() => ({ opacity: clock.get() < RANK_UP.flip ? 1 : 0 }));
  const newStyle = useAnimatedStyle(() => ({ opacity: clock.get() < RANK_UP.flip ? 0 : 1 }));

  if (!animated) {
    return (
      <View style={{ width: size, height: size }}>
        <AchievementBadge track={track} level={to} size={size} />
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      <PopOnce at={start + RANK_UP.pop} sparkleColor={c.gold} style={{ width: size, height: size }}>
        <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, oldStyle]}>
          <AchievementBadge track={track} level={Math.max(1, from)} size={size} earned={from > 0} />
        </Animated.View>
        <Animated.View style={newStyle}>
          <AchievementBadge track={track} level={to} size={size} />
        </Animated.View>
      </PopOnce>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: -(RING_STROKE + RING_GAP), top: -(RING_STROKE + RING_GAP) }, ringStyle]}>
        <Svg width={box} height={box}>
          <Circle cx={box / 2} cy={box / 2} r={radius} stroke={c.border} strokeWidth={RING_STROKE} fill="none" />
          <AnimatedCircle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            stroke={c.gold}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={[circumference, circumference]}
            rotation={-90}
            originX={box / 2}
            originY={box / 2}
            fill="none"
            animatedProps={ringProps}
          />
        </Svg>
      </Animated.View>
      <Burst clock={clock} at={RANK_UP.burst} diameter={size} color={c.gold} reach={38} />
    </View>
  );
}
