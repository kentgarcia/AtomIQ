/**
 * Teaching cards: explain, story, reveal. Told by the teacher as a short chat: the title and figure
 * first, then the body as a few bubbles (a story is told by the teacher it names, or the lesson's
 * teacher). A reveal answers the learner's guess, which shows as their own reply on the right.
 * Short text (60 words or fewer) with a figure.
 */

import { useMemo } from "react";
import { Text, View } from "react-native";

import { Conversation, useLessonTeacher, type Message } from "@/components/lesson/Conversation";
import { bubblesFor } from "@/components/lesson/conversation-core";
import { useNpc } from "@/components/npc/use-npc";
import type { ExplainData, RevealData, StoryData } from "@/content/curriculum/types";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

import { FigureView, TermText, useCardStyles } from "./shared";

const useStyles = createStyles((theme) => ({
  wrap: { gap: spacing.xl },
  head: { gap: spacing.xs },
  headRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  tag: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
  title: { ...fontFaces.heavy, flex: 1, fontSize: fontSizes["5xl"], lineHeight: 32, color: theme.colors.text },
}));

export interface TeachGuess {
  /** What the learner picked or entered, as text. */
  text: string;
}

export function TeachCard({
  type,
  data,
  cardId,
  guess,
}: {
  type: "explain" | "story" | "reveal";
  data: ExplainData | StoryData | RevealData;
  cardId: string;
  guess?: TeachGuess | null;
}) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const card = useCardStyles(theme);
  const lessonTeacher = useLessonTeacher();
  const story = data as StoryData;
  const named = useNpc(type === "story" ? story.speaker : null);
  // A story names its own teller; everything else is the lesson's teacher (Shrodi when there is none).
  const teller = named ? { name: named.name, spec: named.spec } : lessonTeacher;
  const kicker = type === "story" ? story.tag : undefined;

  const messages = useMemo<Message[]>(() => {
    const list: Message[] = [];
    if (type === "reveal" && guess) list.push({ from: "learner", render: () => <Text style={card.body}>{guess.text}</Text> });
    for (const text of bubblesFor(data.body, 3)) list.push({ from: "teacher", render: () => <TermText text={text} style={card.body} /> });
    return list;
  }, [type, guess, data.body, card.body]);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        {kicker ? <Text style={styles.tag}>{kicker}</Text> : null}
        <View style={styles.headRow}>
          {data.title ? (
            <Text accessibilityRole="header" style={styles.title}>
              {data.title}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>
      </View>
      {data.figure ? <FigureView figure={data.figure} /> : null}
      <Conversation messages={messages} teller={teller} />
    </View>
  );
}
