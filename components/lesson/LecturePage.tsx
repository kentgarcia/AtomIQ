/**
 * A lecture page: teaching cards told as one growing page (lecture-core.ts). Each card is a title (a
 * short phrase, top-left) and its steps, the teacher's speech bubbles and the figure, revealed one at
 * a time; the cards before it stay above, already read, and the next card is added below. The newest
 * bubble types itself out. This component only draws what it is given: `LessonRun` decides how many
 * steps of the current card are shown and when Continue appears.
 */

import { useMemo } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { LearnerBubble, TeacherBubble, useLessonTeacher } from "@/components/lesson/Conversation";
import { EASE_OUT } from "@/components/motion/motion";
import { useNpc } from "@/components/npc/use-npc";
import type { ResolvedCard, StoryData } from "@/content/curriculum/types";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

import { FigureView, useCardStyles } from "./cards/shared";
import { lectureSteps } from "./lecture-core";
import { TypedTermText } from "./TypedText";

const useStyles = createStyles((theme) => ({
  page: { gap: spacing["2xl"] },
  block: { gap: spacing.lg },
  head: { gap: spacing.xs },
  tag: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
  title: { ...fontFaces.heavy, fontSize: fontSizes["5xl"], lineHeight: 32, color: theme.colors.text },
}));

export interface TeachGuess {
  /** What the learner picked or entered, as text. */
  text: string;
}

export interface LectureBlockInfo {
  card: ResolvedCard;
  /** How many steps are showing. At least 1; more than the card has means all of them. */
  shown: number;
  /** True when the last showing step has just arrived: it fades in and its bubble types. */
  animateLast: boolean;
  /** The learner's guess this card (a reveal) answers. */
  guess?: TeachGuess | null;
}

/** How many steps a card has. */
export function stepCountOf(card: ResolvedCard): number {
  const d = card.data as { body?: string; figure?: unknown; figureAt?: number };
  return lectureSteps(String(d.body ?? ""), Boolean(d.figure), d.figureAt).length;
}

function LectureBlock({ info }: { info: LectureBlockInfo }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const card = useCardStyles(theme);
  const reduced = useReducedMotion();
  const lessonTeacher = useLessonTeacher();
  const data = info.card.data as { title?: string; body?: string; figure?: ResolvedCard["data"]["figure"]; figureAt?: number } & Partial<StoryData>;
  // A story names its own teller; everything else is the lesson's teacher (Shrodi when there is none).
  const named = useNpc(info.card.type === "story" ? (data.speaker ?? null) : null);
  const teller = named ? { name: named.name, spec: named.spec } : lessonTeacher;
  const steps = useMemo(() => lectureSteps(String(data.body ?? ""), Boolean(data.figure), data.figureAt), [data.body, data.figure, data.figureAt]);
  const shown = Math.max(1, Math.min(info.shown, steps.length));
  const kicker = info.card.type === "story" ? data.tag : undefined;
  const enter = reduced ? undefined : FadeInDown.duration(220).easing(EASE_OUT);

  return (
    <View style={styles.block}>
      {kicker || data.title ? (
        <View style={styles.head}>
          {kicker ? <Text style={styles.tag}>{kicker}</Text> : null}
          {data.title ? (
            <Text accessibilityRole="header" style={styles.title}>
              {data.title}
            </Text>
          ) : null}
        </View>
      ) : null}
      {info.guess ? (
        <LearnerBubble>
          <Text style={card.body}>{info.guess.text}</Text>
        </LearnerBubble>
      ) : null}
      {steps.slice(0, shown).map((step, i) => {
        const latest = info.animateLast && i === shown - 1;
        if (step.kind === "figure") {
          return data.figure ? (
            <Animated.View key={i} entering={latest ? enter : undefined}>
              <FigureView figure={data.figure} />
            </Animated.View>
          ) : null;
        }
        const first = steps[i - 1]?.kind !== "bubble";
        return (
          <TeacherBubble key={i} first={first} teller={teller} entering={latest ? enter : undefined}>
            <TypedTermText text={step.text} style={card.body} typing={latest} />
          </TeacherBubble>
        );
      })}
    </View>
  );
}

export function LecturePage({ blocks }: { blocks: LectureBlockInfo[] }) {
  const styles = useStyles(useTheme().theme);
  return (
    <View style={styles.page}>
      {blocks.map((b) => (
        <LectureBlock key={b.card.id} info={b} />
      ))}
    </View>
  );
}
