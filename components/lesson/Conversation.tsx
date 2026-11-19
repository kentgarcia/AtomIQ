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
import { useCascadeDirection } from "@/components/motion/cascade-context";
import { PAGE_FX, bubbleInAt } from "@/components/motion/cascade-fx";
import { useCascadeSfx } from "@/components/motion/use-cascade-sfx";
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
  // In a lesson his bubble pops like Shrodi's in the onboarding, with its sound (what he says is not typed: a question has to be
  // readable at once). The teacher himself just stands there. Anywhere else (no cascade) it is simply there.
  const direction = useCascadeDirection();
  useCascadeSfx(direction, "lesson.bubble", PAGE_FX.bubble, 0, 1);
  return (
    <View style={styles.row}>
      <TeacherAvatar size={avatarSize} teller={who} />
      <Animated.View entering={direction ? bubbleInAt(direction, PAGE_FX.bubble) : undefined} style={styles.bubble}>
        <Card padding={spacing.lg} gap={spacing.sm}>
          {children}
        </Card>
        <LeftTail />
      </Animated.View>
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
  arriving,
  gapBefore = 0,
}: {
  children: ReactNode;
  first: boolean;
  teller?: Teller | null;
  avatarSize?: number;
  entering?: ComponentProps<typeof Animated.View>["entering"];
  /**
   * The bubble that has just appeared in a lecture, as the onboarding's Shrodi does: the bubble pops, with its sound (the teacher
   * himself does not animate). `"page"` is the first bubble of a page (it waits for the title), `"step"`
   * a later one (it follows at once). Needs a cascade; without one `entering` is used.
   */
  arriving?: "page" | "step";
  gapBefore?: number;
}) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const lesson = useLessonTeacher();
  const who = teller === undefined ? lesson : teller;
  const direction = useCascadeDirection();
  const live = arriving && direction ? direction : null;
  const bubbleAt = arriving === "page" ? PAGE_FX.bubble : first ? 140 : 0;
  useCascadeSfx(live, "lesson.bubble", bubbleAt, 0, 1);
  return (
    <Animated.View entering={live ? undefined : entering} style={[styles.row, { marginTop: gapBefore, alignItems: first ? "center" : "flex-start" }]}>
      {first ? (
        <TeacherAvatar size={avatarSize} teller={who} />
      ) : (
        <View style={{ width: avatarWidthOf(who, avatarSize) }} />
      )}
      <Animated.View entering={live ? bubbleInAt(live, bubbleAt) : undefined} style={styles.bubble}>
        <Card padding={spacing.lg} gap={spacing.sm}>
          {children}
        </Card>
        {first ? <LeftTail /> : null}
      </Animated.View>
    </Animated.View>
  );
}

/** When a lecture bubble's first letter appears, ms after its page (or step) starts: after the teacher and the bubble have popped. */
export function bubbleTypeAt(arriving: "page" | "step", first: boolean): number {
  return (arriving === "page" ? PAGE_FX.bubble : first ? 140 : 0) + 200;
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
