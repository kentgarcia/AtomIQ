/**
 * Preview shown before a lesson starts, on the plain lesson background. The unit's teacher (Shrodi
 * when the unit has none) shows from the chest up, idling, on the left with a speech bubble on the
 * right that introduces the lesson. Below: the unit name, title, quick facts,
 * a short description and what the lesson teaches. The start button is pinned at the bottom with
 * the XP it pays.
 */

import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { PressableIconButton, useBottomInset } from "@/components/layout";
import { Shrodi } from "@/components/mascot/Shrodi";
import { EASE_OUT } from "@/components/motion/motion";
import { Npc } from "@/components/npc/Npc";
import { LeftTail } from "@/components/npc/SpeechBubble";
import { useTeacherLines } from "@/components/npc/teacher-lines";
import { useTeacherMet } from "@/components/npc/met-teachers";
import { useNpcForUnitState, useNpcLine } from "@/components/npc/use-npc";
import { useTutorialTarget } from "@/components/tutorial/use-tutorial-target";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { Lesson, Objective, Unit } from "@/content/curriculum/types";
import { createStyles, fontFaces, fontSizes, radius, spacing, useResponsiveLayout, useTheme } from "@/theme";

import { LESSON_FRAME, LessonFrame } from "./LessonFrame";

const TEACHER = 130;
const TEACHER_WIDTH = Math.round((TEACHER * 200) / 252);

/** Side gutter on this screen: wider than the lesson default so the content can breathe. */
const GUTTER = { paddingHorizontal: spacing.xl } as const;

const useStyles = createStyles((theme) => ({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: spacing.xs },
  headerSlot: { width: 48, alignItems: "flex-start" },
  headerCenter: { flex: 1, alignItems: "center" },
  scroll: { paddingBottom: spacing["3xl"] },
  intro: { flexDirection: "row", alignItems: "center", gap: spacing.xl, justifyContent: "center", paddingTop: spacing.sm },
  teacher: { width: TEACHER_WIDTH, height: TEACHER, alignItems: "center", overflow: "hidden" },
  bubble: { flex: 1, maxWidth: 420 },
  bubbleName: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.primaryLight },
  bubbleText: { ...fontFaces.semibold, fontSize: fontSizes.xl, lineHeight: 24, color: theme.colors.text },
  content: { gap: spacing["3xl"], paddingTop: spacing["2xl"] },
  head: { alignItems: "center", gap: spacing.lg },
  titleBlock: { alignItems: "center", gap: spacing.xs },
  unit: { ...fontFaces.semibold, fontSize: fontSizes.xl, color: theme.colors.textMuted, textAlign: "center" },
  title: { ...fontFaces.black, fontSize: fontSizes["7xl"], lineHeight: 38, color: theme.colors.text, textAlign: "center" },
  facts: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", columnGap: spacing.xl, rowGap: spacing.sm },
  fact: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  factText: { ...fontFaces.semibold, fontSize: fontSizes.lg, color: theme.colors.textMuted },
  review: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: theme.colors.successSurface },
  reviewText: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.4, color: theme.colors.text },
  description: { ...fontFaces.book, fontSize: fontSizes.xl, lineHeight: 26, color: theme.colors.textSecondary },
  objectives: { gap: spacing.lg },
  label: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  rowText: { ...fontFaces.semibold, flex: 1, fontSize: fontSizes.xl, lineHeight: 24, color: theme.colors.text },
  footer: { paddingTop: spacing.md },
}));

export function LessonPreview({
  lesson,
  unit,
  objectives,
  referenceCount,
  cardCount,
  isReplay,
  onClose,
  onProceed,
}: {
  lesson: Lesson;
  unit: Unit | null;
  objectives: Objective[];
  referenceCount: number;
  cardCount: number;
  isReplay: boolean;
  onClose: () => void;
  onProceed: () => void;
}) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const layout = useResponsiveLayout();
  const bottom = useBottomInset();
  const reduced = useReducedMotion();
  // Shrodi's tour lights the Start button of the first lesson's preview
  const { ref: startRef } = useTutorialTarget("home.preview.start", { radius: 22 });
  const { npc: teacher, ready: teacherReady } = useNpcForUnitState(unit?.id);
  const intro = useNpcLine(teacher?.id, "lesson_intro", lesson.id);
  const met = useTeacherMet(teacher?.id);
  const linesOn = useTeacherLines();
  const bubbleText = teacher && linesOn ? intro?.text : undefined;

  const facts = [
    { key: "time", icon: "Clock", text: `${lesson.estimatedMinutes} min` },
    { key: "cards", icon: "Layer", text: `${cardCount} ${cardCount === 1 ? "card" : "cards"}` },
    { key: "sources", icon: "Book", text: `${referenceCount} ${referenceCount === 1 ? "source" : "sources"}` },
  ];
  const showXp = !isReplay && lesson.xpReward > 0;
  const action = isReplay ? "Review lesson" : showXp ? `Start +${lesson.xpReward} XP` : "Start lesson";
  const actionLabel = isReplay ? "Review lesson" : showXp ? `Start lesson, earn ${lesson.xpReward} XP` : "Start lesson";

  return (
    <LessonFrame>
      <View style={styles.root}>
        <View style={[LESSON_FRAME, styles.header, { paddingTop: layout.insets.top + spacing.xs }]}>
          <View style={styles.headerSlot}>
            <PressableIconButton accessibilityLabel="Close lesson preview" onPress={onClose}>
              <Icon name="Close" size={26} color={c.textSecondary} />
            </PressableIconButton>
          </View>
          <View style={styles.headerCenter}>
            {isReplay ? (
              <View style={styles.review} accessible accessibilityLabel="Completed: review mode">
                <Icon name="TickCircle" size={16} color={c.success} variant="Bold" />
                <Text style={styles.reviewText}>Review mode</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.headerSlot} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[LESSON_FRAME, GUTTER, styles.intro]}>
            <View style={styles.teacher} pointerEvents="none">
              {!teacherReady ? null : teacher ? (
                <Npc spec={teacher.spec} pose="idle" form="bust" size={TEACHER} />
              ) : (
                <Shrodi mood="idle" size={TEACHER} />
              )}
            </View>
            {bubbleText ? (
              <View style={styles.bubble}>
                <Card padding={spacing.lg} gap={spacing.sm}>
                  {met === false ? <Text style={styles.bubbleName}>{teacher?.name}</Text> : null}
                  <Text style={styles.bubbleText} accessibilityLabel={`${teacher?.name} says: ${bubbleText}`}>{bubbleText}</Text>
                </Card>
                <LeftTail />
              </View>
            ) : null}
          </View>

          <Animated.View entering={reduced ? undefined : FadeIn.duration(300).easing(EASE_OUT)} style={[LESSON_FRAME, GUTTER, styles.content]}>
              <View style={styles.head}>
                <View style={styles.titleBlock}>
                  {unit?.title ? <Text style={styles.unit}>{unit.title}</Text> : null}
                  <Text accessibilityRole="header" style={styles.title}>{lesson.title}</Text>
                </View>
                <View style={styles.facts}>
                  {facts.map((fact) => (
                    <View key={fact.key} style={styles.fact}>
                      <Icon name={fact.icon} size={18} color={c.textMuted} />
                      <Text style={styles.factText}>{fact.text}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text style={styles.description}>{lesson.description}</Text>

              {objectives.length ? (
                <Card padding={spacing.xl}>
                  <View style={styles.objectives}>
                    <Text style={styles.label}>You will learn to</Text>
                    {objectives.map((o) => (
                      <View key={o.id} style={styles.row}>
                        <Icon name="TickCircle" size={22} color={isReplay ? c.success : c.primary} variant="Bold" />
                        <Text style={styles.rowText}>{o.statement}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              ) : null}
            </Animated.View>
        </ScrollView>

        <View style={[styles.footer, LESSON_FRAME, GUTTER, { paddingBottom: bottom + spacing.sm }]}>
          <View ref={startRef} collapsable={false}>
            <Button label={action} accessibilityLabel={actionLabel} shine onPress={onProceed} />
          </View>
        </View>
      </View>
    </LessonFrame>
  );
}
