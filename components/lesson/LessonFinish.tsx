/**
 * Finish screen: the trophy (assets/lottie/Trophy.lottie, plays once and stays on its last frame), a
 * big title and one line (the title, the line and each earned star land with a stamp, see Stamp.tsx), then three stat tiles (XP, time, accuracy; each revealed in turn and counting up) and Continue pinned at the
 * bottom. The earned stars sit under the line. What was practised and the sources behind the
 * lesson are one tap away under "Details" (closed by default), so the screen stays calm.
 */

import LottieView from "lottie-react-native";
import { useState } from "react";
import { Image, Linking, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { FadeInDown, Keyframe, useReducedMotion } from "react-native-reanimated";

import { useBottomInset } from "@/components/layout";
import { EASE_OUT } from "@/components/motion/motion";
import type { NpcSpec } from "@/components/npc/npc-art";
import { useTeacherLines } from "@/components/npc/teacher-lines";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { Objective, Reference } from "@/content/curriculum/types";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme } from "@/theme";

import { LESSON_FRAME, LessonFrame } from "./LessonFrame";
import { Stamp } from "./Stamp";
import { FINISH_STAMPS, STAMP_LANDS } from "./stamp-core";
import { STAT_FX, shineStart, statStart } from "./stat-reveal-core";
import { SfxOnMount } from "@/components/ui/sfx-on-mount";
import { StatTile } from "./StatTile";
import { TextButton } from "./TextButton";

const XP_ICON = require("@/assets/images/icons/xp.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro bundles the .lottie file as an asset
const TROPHY = require("@/assets/lottie/Trophy.lottie");

const STAGE_HEIGHT = 170;
const TROPHY_SIZE = 190;
const STAGE_WIDTH = 330;
const STAR = 34;

const useStyles = createStyles((theme) => ({
  scroll: { flexGrow: 1, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  content: { gap: spacing.md, flexGrow: 1, justifyContent: "center" },
  hero: { alignItems: "center", gap: spacing.sm },
  stage: { height: STAGE_HEIGHT, width: STAGE_WIDTH, alignSelf: "center", alignItems: "center", justifyContent: "center" },
  title: { ...fontFaces.black, fontSize: fontSizes["8xl"], color: theme.colors.primary, textAlign: "center", marginTop: 0 },
  titleSad: { color: theme.colors.text },
  lines: { gap: spacing.sm },
  message: { ...fontFaces.book, fontSize: fontSizes["2xl"], color: theme.colors.textSecondary, textAlign: "center" },
  signOff: { ...fontFaces.semibold, fontSize: fontSizes.xl, lineHeight: 22, color: theme.colors.textSecondary, textAlign: "center" },
  stars: { flexDirection: "row", gap: spacing.xs, justifyContent: "center" },
  starCell: { width: STAR + spacing.xs, height: STAR + spacing.xs, alignItems: "center", justifyContent: "center" },
  starRing: { position: "absolute", width: STAR, height: STAR, borderRadius: radius.full, borderWidth: 3, borderColor: theme.colors.gold },
  tiles: { flexDirection: "row", justifyContent: "center", gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing["2xl"] },
  label: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
  detailsHead: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, minHeight: 48 },
  detailsText: { ...fontFaces.bold, fontSize: fontSizes.lg, letterSpacing: 0.5, textTransform: "uppercase", color: theme.colors.textMuted },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  rowText: { ...fontFaces.semibold, flex: 1, fontSize: fontSizes.xl, lineHeight: 22, color: theme.colors.text },
  source: { gap: spacing.xxs },
  sourceTitle: { ...fontFaces.bold, fontSize: fontSizes.xl, color: theme.colors.text },
  sourceMeta: { ...fontFaces.medium, fontSize: fontSizes.lg, color: theme.colors.textSecondary },
  sourceLink: { ...fontFaces.semibold, fontSize: fontSizes.lg, color: theme.colors.link, textDecorationLine: "underline" },
  sourceNote: { ...fontFaces.book, fontSize: fontSizes.lg, color: theme.colors.textSecondary },
  footer: { paddingTop: spacing.sm, gap: spacing.sm },
}));

/** A thin ring blooms behind each star as it lands (the moment its stamp touches down), then is gone. */
const ringFlash = new Keyframe({
  0: { opacity: 0.6, transform: [{ scale: 0.7 }] },
  100: { opacity: 0, transform: [{ scale: 1.7 }], easing: EASE_OUT },
}).duration(280);

/** 98 seconds becomes "1:38". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export interface FinishProps {
  title: string;
  /** One line under the title. Left out (or empty) when the title says it all. */
  message?: string;
  /** False for a checkpoint below its pass mark. */
  passed: boolean;
  stars: 1 | 2 | 3;
  xp: number;
  accuracy: number;
  /** How long the run took (ms). Hidden when unknown. */
  durationMs?: number;
  /** Objectives exercised in this run (lessons: those taught). */
  objectives: Objective[];
  references: (Reference & { supports?: string })[];
  continueLabel?: string;
  onContinue: () => void;
  onRetry?: () => void;
  /** The unit teacher: celebrates on the stage and signs off in one line of text. */
  teacher?: { name: string; spec: NpcSpec; text: string } | null;
}

export function LessonFinish({ title, message, passed, stars, xp, accuracy, durationMs, objectives, references, continueLabel = "Continue", onContinue, onRetry, teacher }: FinishProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const bottom = useBottomInset();
  const reduced = useReducedMotion();
  const teacherLines = useTeacherLines();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const percent = Math.round(accuracy * 100);
  const hasDetails = objectives.length > 0 || references.length > 0;
  const showTeacher = !!teacher && passed;
  const time = durationMs !== undefined ? formatDuration(durationMs) : null;
  // The stats are revealed one at a time after the stars have landed (each one counts up as it
  // arrives); the light sweeps once all are in
  const tileCount = (passed && xp > 0 ? 1 : 0) + (time ? 1 : 0) + 1;
  let tileIndex = 0;
  const reveal = () => {
    const n = tileIndex++;
    return { revealAt: statStart(n), shineAt: shineStart(n, tileCount) };
  };

  // Sound (docs/SFX_SPEC.md §6.4), on the screen's own clock: the fanfare is the bed, and the stamp
  // thud, the rising stars and each tile's count-up (one sweep) sit under it at the frames they land. Reduced
  // motion shows everything at once, so only the fanfare plays. A checkpoint below its pass mark
  // gets the soft "wrong" cue, not a fanfare.
  const sounds = (
    <>
      <SfxOnMount cue={passed ? "reward.finish-jingle" : "lesson.answer-wrong"} />
      {!reduced && passed ? (
        <>
          <SfxOnMount cue="lesson.stamp" delay={FINISH_STAMPS.title + STAMP_LANDS} />
          {[0, 1, 2].filter((i) => i < stars).map((i) => (
            <SfxOnMount key={`star-${i}`} cue="lesson.star" index={i} delay={FINISH_STAMPS.stars + i * FINISH_STAMPS.starStep + STAMP_LANDS} />
          ))}
          {Array.from({ length: tileCount }, (_, n) => (
            <SfxOnMount key={`tile-${n}`} cue="count.run" delay={statStart(n) + STAT_FX.countStart} />
          ))}
        </>
      ) : null}
    </>
  );

  return (
    <LessonFrame>
      {sounds}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[LESSON_FRAME, styles.content]}>
          <View style={styles.hero}>
            <Animated.View entering={reduced ? undefined : FadeInDown.duration(300).easing(EASE_OUT)} style={styles.stage}>
              <View>
                {passed ? (
                  // Decorative. With reduced motion it shows the finished trophy and does not play.
                  <View accessible={false} importantForAccessibility="no-hide-descendants">
                    <LottieView
                      source={TROPHY}
                      autoPlay={!reduced}
                      loop={false}
                      progress={reduced ? 1 : undefined}
                      style={{ width: TROPHY_SIZE, height: TROPHY_SIZE }}
                    />
                  </View>
                ) : null}
              </View>
            </Animated.View>
            <Stamp at={FINISH_STAMPS.title}>
              <Text accessibilityRole="header" style={[styles.title, !passed && styles.titleSad]}>{title}</Text>
            </Stamp>
            {message || (showTeacher && teacherLines) ? (
              <Stamp at={FINISH_STAMPS.message} tilt={-1} style={styles.lines}>
                {message ? <Text style={styles.message}>{message}</Text> : null}
                {showTeacher && teacherLines ? <Text style={styles.signOff}>{teacher.text}</Text> : null}
              </Stamp>
            ) : null}
          </View>
          {passed ? (
            <View style={styles.stars} accessible accessibilityLabel={`${stars} of 3 stars`}>
              {[1, 2, 3].map((n) => (
                <View key={n} style={styles.starCell}>
                  {n <= stars ? (
                    <>
                      <Animated.View style={styles.starRing} entering={reduced ? undefined : ringFlash.delay(FINISH_STAMPS.stars + (n - 1) * FINISH_STAMPS.starStep + STAMP_LANDS)} />
                      <Stamp at={FINISH_STAMPS.stars + (n - 1) * FINISH_STAMPS.starStep} tilt={n % 2 === 0 ? -1 : 1}>
                        <Icon name="Star1" size={STAR} color={c.gold} variant="Bold" />
                      </Stamp>
                    </>
                  ) : (
                    <Icon name="Star1" size={STAR} color={c.border} variant="Linear" />
                  )}
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.tiles}>
            {passed && xp > 0 ? (
              <StatTile {...reveal()} tone={c.gold} label="Total XP" value={`${xp}`} countTo={xp} format={String} icon={<Image source={XP_ICON} style={{ width: 28, height: 28 }} resizeMode="contain" />} accessibilityLabel={`${xp} XP earned`} />
            ) : null}
            {time ? (
              <StatTile {...reveal()} tone={c.info} label="Time" value={time} countTo={Math.round((durationMs ?? 0) / 1000)} format={(n) => formatDuration(n * 1000)} icon={<Icon name="Clock" size={26} color={c.info} variant="Bold" />} accessibilityLabel={`Finished in ${time}`} />
            ) : null}
            <StatTile {...reveal()} tone={c.success} label="Accuracy" value={`${percent}%`} countTo={percent} format={(n) => `${n}%`} icon={<Icon name="Target" size={26} color={c.success} variant="Bold" />} accessibilityLabel={`${percent} percent accuracy`} />
          </View>
          {hasDetails ? (
            <View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Details"
                accessibilityState={{ expanded: detailsOpen }}
                accessibilityHint={detailsOpen ? "Hides what you worked on and the sources" : "Shows what you worked on and the sources behind this lesson"}
                onPress={() => setDetailsOpen((o) => !o)}
                style={styles.detailsHead}
              >
                <Text style={styles.detailsText}>Details</Text>
                <Icon name={detailsOpen ? "ArrowUp2" : "ArrowDown2"} size={18} color={c.textMuted} />
              </Pressable>
              {detailsOpen ? (
                <View style={{ gap: spacing.md }}>
                  {objectives.length ? (
                    <Card gap={spacing.sm}>
                      <Text style={styles.label}>What you worked on</Text>
                      {objectives.map((o) => (
                        <View key={o.id} style={styles.row}>
                          <Icon name="TickCircle" size={20} color={c.success} />
                          <Text style={styles.rowText}>{o.statement}</Text>
                        </View>
                      ))}
                    </Card>
                  ) : null}
                  {references.length ? (
                    <Card gap={spacing.sm}>
                      <Text style={styles.label}>Sources ({references.length})</Text>
                      {references.map((r) => (
                        <View key={r.id} style={styles.source}>
                          <Text style={styles.sourceTitle}>{r.title}</Text>
                          <Text style={styles.sourceMeta}>{[r.publisher, r.authors, r.year].filter(Boolean).join(" · ")}</Text>
                          {r.supports ? <Text style={styles.sourceNote}>Supports: {r.supports}</Text> : null}
                          {r.url ? (
                            <Pressable accessibilityRole="link" accessibilityLabel={`Open ${r.title}`} onPress={() => void Linking.openURL(r.url)} hitSlop={8}>
                              <Text style={styles.sourceLink}>Open source</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ))}
                    </Card>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View style={[styles.footer, LESSON_FRAME, { paddingBottom: bottom + spacing.sm }]}>
        {onRetry ? <TextButton label="Try again" onPress={onRetry} /> : null}
        <Button label={continueLabel} onPress={onContinue} />
      </View>
    </LessonFrame>
  );
}
