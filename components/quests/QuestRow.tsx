/**
 * QuestRow — one quest as a compact row: on the left the quest's title with a progress bar under
 * it (the lesson progress bar's design: a 22 dp pill, the count in white, centred inside it), on the
 * right the action button. The button has one fixed width, so "Claim +5", "Done" and "Play" never
 * change the row's layout.
 *
 * Claiming plays a short ceremony (`claim-fx-core.ts`): the bar slowly fills with green, sparkles
 * stream off its front and burst at its end, XP coins scatter and are pulled to the Profile tab of
 * the tab bar (drawn by `ClaimCoinLayer`), and the claim is saved as the first coin lands. With
 * reduced motion the claim is saved at once, with no particles.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useOneShotClock } from "@/components/motion/motion";
import { ClaimFx } from "@/components/quests/ClaimFx";
import { emitClaimFlight } from "@/components/quests/claim-fx-bus";
import { CLAIM_AT, CLAIM_TOTAL, fillAmount } from "@/components/quests/claim-fx-core";
import type { MissionView } from "@/hooks/use-missions";
import { impactLight } from "@/services/haptics";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";
import { EASE_OUT } from "@/theme/motion";

export interface QuestRowProps {
  mission: MissionView;
  /** The button beside the bar. `busy` while the claim plays; `startClaim` begins it. */
  renderAction: (busy: boolean, startClaim: () => void) => ReactNode;
  /** Save the claim (XP and state). Called as the first coin lands. */
  onClaim: (mission: MissionView) => Promise<void> | void;
}

function QuestRowBase({ mission, renderAction, onClaim }: QuestRowProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();

  const pillRef = useRef<React.ComponentRef<typeof View>>(null);
  const [bar, setBar] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [playing, setPlaying] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const clock = useOneShotClock(CLAIM_TOTAL, playing, false);

  // The fill of progress, which grows when the quest moves on
  const ratio = mission.target ? Math.min(1, mission.progress / mission.target) : 0;
  const progressFill = useSharedValue(ratio);
  useEffect(() => {
    progressFill.set(reducedMotion ? ratio : withTiming(ratio, { duration: 260, easing: EASE_OUT }));
  }, [progressFill, ratio, reducedMotion]);
  // Widths are in px of the pill's full width: a percent would leave out its padding and stop short
  const barWidth = bar.width;
  const progressStyle = useAnimatedStyle(() => ({ width: progressFill.get() * barWidth }));
  // The claim fill: the brand yellow sweeping across, driven by the claim clock
  const claimStyle = useAnimatedStyle(() => ({ width: fillAmount(clock.get()) * barWidth }));

  const finish = useCallback(async () => {
    await onClaim(mission);
  }, [onClaim, mission]);

  const startClaim = useCallback(() => {
    if (playing) return;
    if (reducedMotion) {
      void finish();
      return;
    }
    setPlaying(true);
    impactLight();
    // The coins fly above the tab bar and land on its Profile tab: tell that layer where they start
    pillRef.current?.measureInWindow((x: number, y: number, w: number, h: number) => {
      emitClaimFlight({ x: x + w / 2, y: y + h / 2 });
    });
    timers.current.push(setTimeout(() => void finish(), CLAIM_AT));
    timers.current.push(setTimeout(() => setPlaying(false), CLAIM_TOTAL));
  }, [playing, reducedMotion, finish]);

  const busy = playing;

  return (
    <View style={[styles.row, busy && styles.rowPlaying]}>
      <View
        style={styles.main}
        accessible
        accessibilityLabel={`${mission.title}. ${mission.description}. ${mission.progress} of ${mission.target}. ${mission.reward} XP${mission.isClaimed ? ", claimed" : ""}`}
      >
        <Text style={styles.title} numberOfLines={2}>
          {mission.title}
        </Text>
        <View
          ref={pillRef}
          collapsable={false}
          style={styles.track}
          onLayout={(e) => setBar(e.nativeEvent.layout)}
        >
          <Animated.View pointerEvents="none" style={[styles.fill, { backgroundColor: c.lessonHeader }, progressStyle]} />
          {mission.isClaimed ? (
            <View pointerEvents="none" style={[styles.fill, styles.fillFull, styles.fillClaimed]} />
          ) : (
            <Animated.View pointerEvents="none" style={[styles.fill, styles.fillClaimed, claimStyle]} />
          )}
          <Text style={styles.count}>
            {mission.progress} / {mission.target}
          </Text>
        </View>
        {playing ? <ClaimFx clock={clock} bar={bar} /> : null}
      </View>

      {renderAction(busy, startClaim)}
    </View>
  );
}

export const QuestRow = memo(QuestRowBase);

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    /** Above the rows below it while its sparkles fly */
    rowPlaying: { zIndex: 50 },
    main: { flex: 1, gap: 6 },
    title: { fontSize: 16, color: c.text, ...fontFaces.semibold },
    /** The lesson progress bar's shape (22 dp pill); the fills are clipped to it. Mid grey so the white count reads on the empty part. */
    track: {
      height: 22,
      borderRadius: 11,
      overflow: "hidden",
      justifyContent: "center",
      backgroundColor: c.textFaint,
    },
    fill: { position: "absolute", left: 0, top: 0, bottom: 0 },
    fillClaimed: { backgroundColor: c.success },
    /** Fills the whole bar */
    fillFull: { right: 0 },
    count: {
      textAlign: "center",
      fontSize: 12,
      color: c.onPrimary,
      ...fontFaces.heavy,
      fontVariant: ["tabular-nums"],
      textShadowColor: withAlpha(c.shadow, 0.35),
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 1,
    },
  };
});
