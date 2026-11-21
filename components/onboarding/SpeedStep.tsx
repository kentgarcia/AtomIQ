/**
 * The animation page: shown right after Hello, and only on a phone the device tier found slow (`speedAdvice` in
 * `services/onboarding-core.ts`: Reduced is recommended on a middling phone, Disabled on a weak one). Shrodi asks, the three
 * animation levels are the lesson's own option rows with the recommended one marked and picked to begin with, and Continue
 * keeps the pick. A tap applies the level at once (so the page itself shows it) and saves it, like Settings > Animations.
 *
 * It is deliberately still: no entrance cascade, no typing, the still mascot. A page that offers to calm the app down must
 * not itself be the heaviest thing on a slow phone.
 */

import { useState } from "react";
import { View } from "react-native";

import { OptionRow } from "@/components/lesson/cards/shared";
import { MOTION_LEVELS, MOTION_LEVEL_LABEL, MOTION_LEVEL_NOTE, type MotionLevel } from "@/components/motion/motion-level-core";
import { ShrodiSays } from "@/components/onboarding/ShrodiSays";
import { ContinueFooter, StepLayout } from "@/components/onboarding/StepLayout";
import { Text } from "@/components/ui/text";
import type { SpeedAdvice } from "@/services/onboarding-core";
import { impactLight } from "@/services/haptics";
import { setMotionLevel } from "@/services/motion-level";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

const useStyles = createStyles((theme) => ({
  body: { flexGrow: 1, gap: spacing.xl },
  title: { ...fontFaces.heavy, fontSize: fontSizes["6xl"], lineHeight: 34, color: theme.colors.text },
  options: { flexGrow: 1, justifyContent: "center", gap: spacing.sm },
}));

const ICON: Record<MotionLevel, string> = { max: "Flash", reduced: "Timer1", off: "Slash" };

/** What Shrodi says, by what is recommended. */
const SAY: Record<SpeedAdvice, string> = {
  reduced: "Your phone might find all my moves a bit much. Want me to calm down a little?",
  off: "Your phone looks like it works hard. Want me to hold still so everything stays fast?",
};

export function SpeedStep({ advice, onContinue, onBack }: { advice: SpeedAdvice; onContinue: () => void; onBack: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const [picked, setPicked] = useState<MotionLevel>(advice);

  const tones: Record<MotionLevel, { color: string; dark: string }> = {
    max: { color: c.warning, dark: c.warningDark },
    reduced: { color: c.guide, dark: c.guideLip },
    off: { color: c.success, dark: c.successDark },
  };

  const choose = (level: MotionLevel) => {
    if (level === picked) return;
    impactLight();
    void playSfx("ui.select");
    setPicked(level);
    void setMotionLevel(level);
  };

  return (
    <StepLayout
      footer={
        <ContinueFooter
          onBack={() => {
            void playSfx("nav.page-back");
            onBack();
          }}
          onPress={() => {
            void playSfx("nav.page-next");
            void setMotionLevel(picked);
            onContinue();
          }}
        />
      }
    >
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          Make the app run smoother?
        </Text>
        <ShrodiSays text={SAY[advice]} still typing={false} />
        <View style={styles.options}>
          {MOTION_LEVELS.map((level) => (
            <OptionRow
              key={level}
              label={level === advice ? `${MOTION_LEVEL_LABEL[level]} (recommended)` : MOTION_LEVEL_LABEL[level]}
              hint={MOTION_LEVEL_NOTE[level]}
              icon={ICON[level]}
              centerText
              tone={tones[level]}
              state={picked === level ? "selected" : "idle"}
              onPress={() => choose(level)}
            />
          ))}
        </View>
        <Text style={{ ...fontFaces.medium, fontSize: fontSizes.md, lineHeight: 20, color: c.textSecondary, textAlign: "center" }}>You can change this any time in Settings, under Animations.</Text>
      </View>
    </StepLayout>
  );
}
