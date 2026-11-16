/**
 * Finish screen: a celebration scene (the unit's teacher, hopping and cheering under fireworks), a big
 * title and one line, then three stat tiles (XP, time, accuracy) and Continue pinned at the
 * bottom. The earned stars sit under the line. What was practised and the sources behind the
 * lesson are one tap away under "Details" (closed by default), so the screen stays calm.
 */

import { useEffect, useState } from "react";
import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { Easing, FadeInDown, Keyframe, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { useBottomInset } from "@/components/layout";
import { EASE_OUT } from "@/components/motion/motion";
import type { NpcSpec, PoseId } from "@/components/npc/npc-art";
import { Npc } from "@/components/npc/Npc";
import { useTeacherLines } from "@/components/npc/teacher-lines";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { Objective, Reference } from "@/content/curriculum/types";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme } from "@/theme";

import { LESSON_FRAME, LessonFrame } from "./LessonFrame";
import { Sparkles } from "./Sparkles";
import { StatTile } from "./StatTile";

const XP_ICON = require("@/assets/images/icons/xp.png");

const STAGE_HEIGHT = 280;
const TEACHER_SIZE = 240;
const STAGE_WIDTH = 330;
const STAR = 34;

const useStyles = createStyles((theme) => ({
  scroll: { flexGrow: 1, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  hero: { alignItems: "center", gap: spacing.sm },
  stage: { height: STAGE_HEIGHT, width: STAGE_WIDTH, alignSelf: "center" },
  figures: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "flex-end" },
  title: { ...fontFaces.black, fontSize: fontSizes["8xl"], color: theme.colors.primary, textAlign: "center", marginTop: spacing.md },
  titleSad: { color: theme.colors.text },
  message: { ...fontFaces.book, fontSize: fontSizes["2xl"], color: theme.colors.textSecondary, textAlign: "center" },
  signOff: { ...fontFaces.semibold, fontSize: fontSizes.xl, lineHeight: 22, color: theme.colors.textSecondary, textAlign: "center" },
  signName: { ...fontFaces.bold, color: theme.colors.primaryLight },
  stars: { flexDirection: "row", gap: spacing.xs, justifyContent: "center" },
  starCell: { width: STAR + spacing.xs, height: STAR + spacing.xs, alignItems: "center", justifyContent: "center" },
  starRing: { position: "absolute", width: STAR, height: STAR, borderRadius: radius.full, borderWidth: 3, borderColor: theme.colors.gold },
  tiles: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
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

/** An earned star settles in from slightly small, one after another (a rare, rewarding moment). */
const starIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.7 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
}).duration(320);

/** A thin ring blooms behind each star as it lands, then is gone. */
const ringFlash = new Keyframe({
  0: { opacity: 0.6, transform: [{ scale: 0.7 }] },
  100: { opacity: 0, transform: [{ scale: 1.7 }], easing: EASE_OUT },
}).duration(280);

/**
 * The teacher celebrating: they pop in, then hop three times (up fast, down a little faster, a small
 * squash on landing), rest, and go again, swapping between a cheer and a wave as they do. A sad finish
 * stays still apart from breathing. View transforms only; still with reduced motion.
 */
const HOP_UP = 14;
function CheeringTeacher({ spec, happy }: { spec: NpcSpec; happy: boolean }) {
  const reduced = useReducedMotion();
  const hop = useSharedValue(0);
  const [pose, setPose] = useState<PoseId>(happy ? "cheer" : "sorry");
  useEffect(() => {
    if (reduced || !happy) return;
    const up = { duration: 200, easing: Easing.out(Easing.quad) };
    const down = { duration: 170, easing: Easing.in(Easing.quad) };
    const one = withSequence(withTiming(1, up), withTiming(0, down));
    hop.value = withDelay(500, withRepeat(withSequence(one, one, one, withTiming(0, { duration: 1500 })), -1, false));
    const swap = setInterval(() => setPose((p) => (p === "cheer" ? "greet" : "cheer")), 1700);
    return () => clearInterval(swap);
  }, [reduced, happy, hop]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -HOP_UP * hop.value }, { scaleY: 1 - 0.02 * (1 - hop.value) * (hop.value > 0 ? 1 : 0) }],
  }));
  const enter = reduced ? undefined : FadeInDown.duration(380).easing(EASE_OUT);
  return (
    <Animated.View entering={enter}>
      <Animated.View style={style}>
        <Npc spec={spec} pose={pose} size={TEACHER_SIZE} lively={happy ? 2 : 1} />
      </Animated.View>
    </Animated.View>
  );
}

/** 98 seconds becomes "1:38". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export interface FinishProps {
  title: string;
  message: string;
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

  return (
    <LessonFrame>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[LESSON_FRAME, { gap: spacing.md, flexGrow: 1 }]}>
          <Animated.View entering={reduced ? undefined : FadeInDown.duration(300).easing(EASE_OUT)} style={styles.hero}>
            <View style={styles.stage}>
              {passed ? <Sparkles width={STAGE_WIDTH} height={STAGE_HEIGHT} /> : null}
              <View style={styles.figures}>
                {teacher ? (
                  <CheeringTeacher spec={teacher.spec} happy={passed} />
                ) : passed ? (
                  <Animated.View entering={reduced ? undefined : FadeInDown.duration(380).easing(EASE_OUT)} style={{ paddingBottom: spacing.xl }}>
                    <Icon name="Star1" size={140} color={c.gold} variant="Bold" />
                  </Animated.View>
                ) : null}
              </View>
            </View>
            <Text accessibilityRole="header" style={[styles.title, !passed && styles.titleSad]}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            {showTeacher && teacherLines ? (
              <Text style={styles.signOff} accessibilityLabel={`${teacher.name} says: ${teacher.text}`}>
                <Text style={styles.signName}>{teacher.name}: </Text>
                {teacher.text}
              </Text>
            ) : null}
          </Animated.View>
          {passed ? (
            <View style={styles.stars} accessible accessibilityLabel={`${stars} of 3 stars`}>
              {[1, 2, 3].map((n) => (
                <View key={n} style={styles.starCell}>
                  {n <= stars ? (
                    <>
                      <Animated.View style={styles.starRing} entering={reduced ? undefined : ringFlash.delay(500 + (n - 1) * 160)} />
                      <Animated.View entering={reduced ? undefined : starIn.delay(350 + (n - 1) * 160)}>
                        <Icon name="Star1" size={STAR} color={c.gold} variant="Bold" />
                      </Animated.View>
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
              <StatTile tone={c.gold} label="Total XP" value={`${xp}`} icon={<Image source={XP_ICON} style={{ width: 28, height: 28 }} resizeMode="contain" />} accessibilityLabel={`${xp} XP earned`} />
            ) : null}
            {time ? (
              <StatTile tone={c.info} label="Time" value={time} icon={<Icon name="Clock" size={26} color={c.info} variant="Bold" />} accessibilityLabel={`Finished in ${time}`} />
            ) : null}
            <StatTile tone={c.success} label="First try" value={`${percent}%`} icon={<Icon name="Target" size={26} color={c.success} variant="Bold" />} accessibilityLabel={`${percent} percent right on the first try`} />
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
        <Button label={continueLabel} onPress={onContinue} />
        {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : null}
      </View>
    </LessonFrame>
  );
}
