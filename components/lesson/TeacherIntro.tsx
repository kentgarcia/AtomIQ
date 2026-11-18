/**
 * The introduction page, shown once before the learner's first lesson with a teacher: the teacher at
 * hero size, waving, with a greeting, their name and title, and a line about who they are. After it,
 * the teacher's bubbles carry no name. Reduced motion shows a still teacher.
 */

import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { PressableIconButton, useBottomInset } from "@/components/layout";
import { EASE_OUT } from "@/components/motion/motion";
import { Npc as NpcView } from "@/components/npc/Npc";
import { BubbleTail } from "@/components/npc/SpeechBubble";
import { useTeacherLines } from "@/components/npc/teacher-lines";
import { useNpcLine } from "@/components/npc/use-npc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { Npc } from "@/content/npcs";
import { createStyles, fontFaces, fontSizes, spacing, useResponsiveLayout, useTheme } from "@/theme";

import { LESSON_FRAME, LessonFrame } from "./LessonFrame";

const useStyles = createStyles((theme) => ({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scroll: { flexGrow: 1, justifyContent: "center", paddingVertical: spacing.lg },
  content: { alignItems: "center", gap: spacing.lg },
  kicker: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.8, textTransform: "uppercase", color: theme.colors.textMuted },
  bubbleWrap: { alignSelf: "stretch", alignItems: "center" },
  greeting: { ...fontFaces.semibold, fontSize: fontSizes["3xl"], lineHeight: 28, color: theme.colors.text, textAlign: "center" },
  who: { alignItems: "center", gap: spacing.xs },
  name: { ...fontFaces.black, fontSize: fontSizes["9xl"], lineHeight: 46, color: theme.colors.text, textAlign: "center" },
  title: { ...fontFaces.bold, fontSize: fontSizes["2xl"], color: theme.colors.primaryLight, textAlign: "center" },
  bio: { ...fontFaces.book, fontSize: fontSizes.xl, lineHeight: 26, color: theme.colors.textSecondary, textAlign: "center" },
  footer: { paddingTop: spacing.md },
}));

export function TeacherIntro({ npc, onClose, onContinue }: { npc: Npc; onClose: () => void; onContinue: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const layout = useResponsiveLayout();
  const bottom = useBottomInset();
  const reduced = useReducedMotion();
  const linesOn = useTeacherLines();
  const meet = useNpcLine(npc.id, "meet");
  const gutter = { paddingHorizontal: spacing.xl } as const;

  return (
    <LessonFrame>
      <View style={[LESSON_FRAME, styles.header, { paddingTop: layout.insets.top + spacing.xs }]}>
        <PressableIconButton accessibilityLabel="Close" onPress={onClose}>
          <Icon name="Close" size={26} color={theme.colors.textSecondary} />
        </PressableIconButton>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={reduced ? undefined : FadeInDown.duration(250).easing(EASE_OUT)} style={[LESSON_FRAME, gutter, styles.content]}>
          <Text style={styles.kicker}>Meet your teacher</Text>
          {meet && linesOn ? (
            <View style={styles.bubbleWrap}>
              <Card padding={spacing.lg} style={{ alignSelf: "stretch" }}>
                <Text style={styles.greeting}>{meet.text}</Text>
              </Card>
              <BubbleTail />
            </View>
          ) : null}
          <NpcView spec={npc.spec} pose="greet" size={230} />
          <View style={styles.who}>
            <Text accessibilityRole="header" style={styles.name}>{npc.name}</Text>
            <Text style={styles.title}>{npc.title}</Text>
          </View>
          <Text style={styles.bio}>{npc.bio}</Text>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, LESSON_FRAME, gutter, { paddingBottom: bottom + spacing.sm }]}>
        <Button label="Let's go" accessibilityLabel={`Meet ${npc.name} and start the lesson`} onPress={onContinue} />
      </View>
    </LessonFrame>
  );
}
