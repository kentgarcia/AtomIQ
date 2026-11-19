/**
 * The result of a level, written straight onto a dark fade at the bottom of the game while the picture above stays
 * on the door (no card, no scrim): the numbers counted up, the stars' next target and
 * the best time, the lessons to review for what was missed, and icon-only buttons (home, again, next). The title and the stars
 * are drawn on the map itself (`ExitView.tsx`), before this rises.
 */

import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { RESULT_FX, resultActionsAt, resultStatAt } from "@/components/celebration/celebration-core";
import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import { IconButton } from "@/components/ui/icon-button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, fontSizes, useTheme, withAlpha } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";

import { HUD_ICON_COLOR, HUD_SHADOW_COLOR } from "./sprites";
import { pointsToNextStar, type Stats, type Summary } from "./platformer-core";
import { formatTime, type Recommendation } from "./story-core";

/** How far the result is lifted off the bottom edge, dp: the gradient still reaches the edge, the writing sits higher. */
const LIFT = 72;

const BLACK = "#000000"; // theme-allow: the result sits on the game picture's dark fade whatever the appearance (EX-16)

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    fade: { position: "absolute", left: 0, right: 0, bottom: 0 },
    body: { gap: 12, paddingTop: 56, paddingHorizontal: 20 },
    grid: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    stat: { flex: 1, alignItems: "center", gap: 2 },
    statLabel: { ...fontFaces.bold, fontSize: fontSizes.xs, color: HUD_ICON_COLOR, opacity: 0.75, textAlign: "center" },
    statValue: { ...fontFaces.heavy, fontSize: 22, color: HUD_ICON_COLOR, textShadowColor: HUD_SHADOW_COLOR, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 },
    score: { ...fontFaces.heavy, fontSize: 20, color: HUD_ICON_COLOR, textAlign: "center" },
    lead: { ...fontFaces.semibold, fontSize: fontSizes.sm, lineHeight: 18, color: HUD_ICON_COLOR, opacity: 0.8, textAlign: "center" },
    best: { ...fontFaces.heavy, color: c.gold, opacity: 1 },
    recs: { gap: 8 },
    recsTitle: { ...fontFaces.heavy, fontSize: fontSizes.md, color: HUD_ICON_COLOR },
    rec: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
    recText: { ...fontFaces.bold, fontSize: fontSizes.md, color: HUD_ICON_COLOR },
    recMissed: { ...fontFaces.semibold, fontSize: fontSizes.sm, color: HUD_ICON_COLOR, opacity: 0.7 },
    actions: { flexDirection: "row", justifyContent: "center", gap: 16, paddingTop: 4 },
  };
});

export interface ResultPanelProps {
  summary: Summary;
  stats: Stats;
  hearts: number;
  /** Lessons that teach what was missed in this level. */
  recommendations?: Recommendation[];
  /** This run is the fastest win of the level so far, and the fastest win (seconds, once saved). */
  newBestTime?: boolean;
  bestTime?: number | null;
  /** Room under the panel for the home indicator, and the most it may grow (its body scrolls past that). */
  bottomInset: number;
  maxHeight: number;
  onAgain: () => void;
  onBack: () => void;
  /** Open the next level (a won level that has a next one). */
  onNext?: () => void;
  onLesson?: (lessonId: string) => void;
}

export function ResultPanel({ summary, stats, hearts, recommendations = [], newBestTime = false, bestTime = null, bottomInset, maxHeight, onAgain, onBack, onNext, onLesson }: ResultPanelProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const rows: { label: string; value?: number; text?: string }[] = [
    { label: "Coins", value: stats.coins },
    { label: "Enemies beaten", value: stats.defeated },
    { label: "Right answers", value: stats.correct },
    ...(summary.won ? [{ label: "Hearts left", value: hearts }] : []),
    { label: "Time", text: formatTime(summary.time, true) },
  ];
  const more = summary.won ? pointsToNextStar(summary.score, summary.maxScore, summary.stars) : null;
  return (
    <Animated.View entering={FadeIn.duration(280)} style={styles.fade} pointerEvents="box-none">
      <LinearGradient pointerEvents="none" colors={[withAlpha(BLACK, 0), withAlpha(BLACK, 0.82), BLACK]} locations={[0, 0.35, 0.7]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      <ScrollView style={{ maxHeight }} contentContainerStyle={[styles.body, { paddingBottom: bottomInset + 16 + LIFT }]} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {rows.map((r, i) => (
            <Reveal key={r.label} at={resultStatAt(i)} style={styles.stat}>
              {r.text !== undefined ? <Text style={styles.statValue}>{r.text}</Text> : <CountUp from={0} to={r.value ?? 0} at={resultStatAt(i)} duration={RESULT_FX.countMs} style={styles.statValue} />}
              <Text style={styles.statLabel}>{r.label}</Text>
            </Reveal>
          ))}
        </View>
        <Reveal at={resultStatAt(rows.length)}>
          <Text style={styles.score}>Score {summary.score}</Text>
          {more !== null ? <Text style={styles.lead}>{more} more points for the next star</Text> : null}
          {summary.won && bestTime !== null ? <Text style={[styles.lead, newBestTime && styles.best]}>{newBestTime ? `New best time: ${formatTime(bestTime, true)}` : `Best time: ${formatTime(bestTime, true)}`}</Text> : null}
          {!summary.won ? <Text style={styles.lead}>Every question you met is behind you now. Try again, you know more.</Text> : null}
        </Reveal>
        {recommendations.length > 0 ? (
          <Reveal at={resultActionsAt(rows.length)} style={styles.recs}>
            <Text style={styles.recsTitle}>Review these lessons</Text>
            {recommendations.map((r) => (
              <Pressable key={r.lessonId} onPress={() => onLesson?.(r.lessonId)} accessibilityRole="button" accessibilityLabel={`Open lesson ${r.title}`} style={styles.rec}>
                <Icon name="Book1" size={22} color={theme.colors.gold} variant="Bold" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.recText}>{r.title}</Text>
                  <Text style={styles.recMissed}>{r.missed === 1 ? "1 question missed" : `${r.missed} questions missed`}</Text>
                </View>
                <Icon name="ArrowRight2" size={18} color={HUD_ICON_COLOR} />
              </Pressable>
            ))}
          </Reveal>
        ) : null}
        <Reveal at={resultActionsAt(rows.length)} style={styles.actions}>
          <IconButton icon="Home2" variant="neutral" accessibilityLabel="Back to levels" onPress={onBack} />
          <IconButton icon="Refresh" variant={summary.won && onNext ? "neutral" : "primary"} accessibilityLabel={summary.won ? "Play again" : "Try again"} onPress={onAgain} />
          {summary.won && onNext ? <IconButton icon="ArrowRight2" variant="primary" accessibilityLabel="Next level" onPress={onNext} /> : null}
        </Reveal>
      </ScrollView>
    </Animated.View>
  );
}
