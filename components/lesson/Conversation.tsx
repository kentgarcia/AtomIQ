/**
 * The teacher, teaching. A run provides the lesson's teacher (`TeacherProvider`); cards then speak
 * through them: a question is asked by the teacher in a speech bubble, and a teaching card is told as a
 * lecture (components/lesson/LecturePage.tsx) of bubbles (`TeacherBubble`), with the learner's own guess as
 * a reply on the right (`LearnerBubble`). The teacher stands beside the first bubble from the chest up and idles. Bubbles hold only what is said, and no
 * name: the teacher is introduced once, on their own page (TeacherIntro), before the first lesson. With no teacher the unit's mascot,
 * Shrodi, tells it instead. Bubbles arrive one after another (a short fade and nudge) when the
 * lecture reveals them. Decorative figure; the words are real text.
 */

import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated from "react-native-reanimated";

import { Shrodi } from "@/components/mascot/Shrodi";
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

/** Head and a strip of shirt, close in and held still (only the face moves). Shrodi stands in when there is no teacher. */
export function TeacherAvatar({ size, teller }: { size: number; teller: Teller | null }) {
  const width = teller ? Math.round((size * 200) / 252) : size;
  return (
    <View style={{ width, height: size, alignItems: "center", overflow: "hidden" }} pointerEvents="none">
      {teller ? <Npc spec={teller.spec} pose="idle" form="bust" size={size} /> : <Shrodi mood="idle" size={size} />}
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

/** Width the teacher's avatar takes beside a bubble, so later bubbles of a run line up with the first. */
function avatarWidthOf(who: Teller | null, size: number): number {
  return who ? Math.round((size * 200) / 252) : size;
}

/**
 * One of the teacher's bubbles. The first of a run has the teacher beside it (from the chest up); the
 * ones after it are indented to line up. `entering` plays when it appears (a lecture reveals bubbles
 * one at a time); leave it out for a bubble that is simply there.
 */
export function TeacherBubble({
  children,
  first,
  teller,
  avatarSize = 84,
  entering,
  gapBefore = 0,
}: {
  children: ReactNode;
  first: boolean;
  teller?: Teller | null;
  avatarSize?: number;
  entering?: ComponentProps<typeof Animated.View>["entering"];
  gapBefore?: number;
}) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const lesson = useLessonTeacher();
  const who = teller === undefined ? lesson : teller;
  return (
    <Animated.View entering={entering} style={[styles.row, { marginTop: gapBefore, alignItems: first ? "center" : "flex-start" }]}>
      {first ? <TeacherAvatar size={avatarSize} teller={who} /> : <View style={{ width: avatarWidthOf(who, avatarSize) }} />}
      <View style={styles.bubble}>
        <Card padding={spacing.lg} gap={spacing.sm}>
          {children}
        </Card>
        {first ? <LeftTail /> : null}
      </View>
    </Animated.View>
  );
}

/** The learner's own reply, on the right. */
export function LearnerBubble({ children, entering, gapBefore = 0 }: { children: ReactNode; entering?: ComponentProps<typeof Animated.View>["entering"]; gapBefore?: number }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return (
    <Animated.View entering={entering} style={[styles.learnerRow, { marginTop: gapBefore }]}>
      <View style={styles.learnerBubble}>
        <Card padding={spacing.lg} gap={spacing.xs}>
          <Text style={styles.you}>You</Text>
          {children}
        </Card>
        <SideTail />
      </View>
    </Animated.View>
  );
}
