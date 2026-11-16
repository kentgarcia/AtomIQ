/**
 * The teacher, teaching. A run provides the lesson's teacher (`TeacherProvider`); cards then speak
 * through them: a question is asked by the teacher in a speech bubble, and a teaching card is told as a
 * short chat (`Conversation`), with the learner's own guess as a reply on the right. The teacher
 * stands beside the first bubble from the chest up and idles. Bubbles hold only what is said, and no
 * name: the teacher is introduced once, on their own page (TeacherIntro), before the first lesson. With no teacher the unit's mascot,
 * Shrodi, tells it instead. Bubbles arrive one after another (a short fade and nudge), or all at once
 * with reduced motion. Decorative figure; the words are real text.
 */

import { createContext, useContext, type ReactNode } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { Shrodi } from "@/components/mascot/Shrodi";
import { EASE_OUT } from "@/components/motion/motion";
import { Npc } from "@/components/npc/Npc";
import type { NpcSpec } from "@/components/npc/npc-art";
import { LeftTail, SideTail } from "@/components/npc/SpeechBubble";
import { Card } from "@/components/ui/card";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

export interface Teller {
  name: string;
  spec: NpcSpec;
}

const TeacherContext = createContext<Teller | null>(null);

/** The teacher of the lesson being played. `null` leaves cards in their plain, teacher-less layout. */
export function TeacherProvider({ teacher, children }: { teacher: Teller | null; children: ReactNode }) {
  return <TeacherContext.Provider value={teacher}>{children}</TeacherContext.Provider>;
}

export function useLessonTeacher(): Teller | null {
  return useContext(TeacherContext);
}

/** Head, neck and chest only: flat base, idle breathing. Shrodi stands in when there is no teacher. */
const LIVELY = 2;
const BASE_SLACK = 2;

export function TeacherAvatar({ size, teller }: { size: number; teller: Teller | null }) {
  const width = teller ? Math.round((size * 200) / 252) : size;
  return (
    <View style={{ width, height: size, alignItems: "center", overflow: "hidden" }} pointerEvents="none">
      {teller ? <Npc spec={teller.spec} pose="idle" form="head" size={size} lively={LIVELY} style={{ marginTop: BASE_SLACK }} /> : <Shrodi mood="idle" size={size} />}
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  bubble: { flex: 1 },
  you: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
  learnerRow: { flexDirection: "row", justifyContent: "flex-end" },
  learnerBubble: { maxWidth: "82%" },
}));

/** A teacher's speech bubble with the teacher beside it. `children` is what is said. */
export function TeacherSays({ children, teller, avatarSize = 72 }: { children: ReactNode; teller?: Teller | null; avatarSize?: number }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const lesson = useLessonTeacher();
  const who = teller === undefined ? lesson : teller;
  return (
    <View style={styles.row}>
      <TeacherAvatar size={avatarSize} teller={who} />
      <View style={styles.bubble}>
        <Card padding={spacing.lg} gap={spacing.sm}>
          {children}
        </Card>
        <LeftTail />
      </View>
    </View>
  );
}

export type Message = { from: "teacher" | "learner"; render: () => ReactNode };

/** Messages one after another: the teacher on the left (avatar beside the first of a run), the learner on the right. */
export function Conversation({ messages, teller, avatarSize = 84 }: { messages: Message[]; teller?: Teller | null; avatarSize?: number }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const reduced = useReducedMotion();
  const lesson = useLessonTeacher();
  const who = teller === undefined ? lesson : teller;
  const avatarWidth = who ? Math.round((avatarSize * 200) / 252) : avatarSize;
  return (
    <View style={{ gap: spacing.md }}>
      {messages.map((m, i) => {
        const first = m.from === "teacher" && messages[i - 1]?.from !== "teacher";
        const enter = reduced ? undefined : FadeInDown.duration(220).delay(i * 380).easing(EASE_OUT);
        const gapBefore = i > 0 && messages[i - 1].from !== m.from ? spacing.sm : 0;
        if (m.from === "learner") {
          return (
            <Animated.View key={i} entering={enter} style={[styles.learnerRow, { marginTop: gapBefore }]}>
              <View style={styles.learnerBubble}>
                <Card padding={spacing.lg} gap={spacing.xs}>
                  <Text style={styles.you}>You</Text>
                  {m.render()}
                </Card>
                <SideTail />
              </View>
            </Animated.View>
          );
        }
        return (
          <Animated.View key={i} entering={enter} style={[styles.row, { marginTop: gapBefore, alignItems: first ? "center" : "flex-start" }]}>
            {first ? <TeacherAvatar size={avatarSize} teller={who} /> : <View style={{ width: avatarWidth }} />}
            <View style={styles.bubble}>
              <Card padding={spacing.lg} gap={spacing.sm}>
                {m.render()}
              </Card>
              {first ? <LeftTail /> : null}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}
