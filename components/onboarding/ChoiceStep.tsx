/**
 * A question screen (why they came, how much they know, the daily goal): the question, Shrodi
 * beside a bubble, and the choices as the lesson's own option rows. A tap flips the row at once
 * (it pops), Shrodi's mood glides to happy and his reply replaces his hint in the bubble, and
 * Continue is on from the first frame, never after the typing. Tier B; no state waits for motion.
 */

import { View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { type SharedValue } from "react-native-reanimated";

import { OptionRow } from "@/components/lesson/cards/shared";
import { PAGE_FX, riseIn } from "@/components/motion/cascade-fx";
import { useCascadeSfx } from "@/components/motion/use-cascade-sfx";
import { ShrodiSays } from "@/components/onboarding/ShrodiSays";
import { choicesFor, PROMPTS, shrodiLine, type QuestionStep, type Tone } from "@/services/onboarding-core";
import { impactLight } from "@/services/haptics";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

const useStyles = createStyles((theme) => ({
  title: { ...fontFaces.heavy, fontSize: fontSizes["6xl"], lineHeight: 34, color: theme.colors.text },
  // The title and Shrodi's line sit on top; the options are centred in the room under them (as a lesson's options are)
  body: { flexGrow: 1, gap: spacing.xl },
  options: { flexGrow: 1, justifyContent: "center", gap: spacing.sm },
}));

/** One question's page: the title, Shrodi's line and the options. The frame around it (bar, button) is `QuestionFlow`'s and stays put. */
export function ChoicePage({ step, picked, direction, onPick }: { step: QuestionStep; picked: string | number | null; direction: SharedValue<number>; onPick: (id: string | number) => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const choices = choicesFor(step);
  // Sound for each beat: Shrodi's pop, then a soft tick as each option lands
  useCascadeSfx(direction, "reward.pop", PAGE_FX.fox, 0, 1);
  useCascadeSfx(direction, "ui.tick", PAGE_FX.options + 120, PAGE_FX.optionStep, choices.length);
  const c = theme.colors;
  const tones: Record<Tone, { color: string; dark: string }> = {
    blue: { color: c.guide, dark: c.guideLip },
    green: { color: c.success, dark: c.successDark },
    yellow: { color: c.warning, dark: c.warningDark },
    purple: { color: c.sky, dark: c.skyLip },
    red: { color: c.error, dark: c.dangerDark },
    orange: { color: c.primary, dark: c.primaryDark },
  };
  return (
    <View style={styles.body}>
      <Animated.View entering={riseIn(direction, PAGE_FX.title)}>
        <Text accessibilityRole="header" style={styles.title}>
          {PROMPTS[step].title}
        </Text>
      </Animated.View>
      <ShrodiSays text={shrodiLine(step, picked)} still arrive={{ direction, at: PAGE_FX.fox }} />
      <View style={styles.options}>
        {choices.map((c, i) => (
          <Animated.View key={String(c.id)} entering={riseIn(direction, PAGE_FX.options + i * PAGE_FX.optionStep, 0.96)}>
            <OptionRow
                label={c.label}
                hint={c.hint}
                icon={c.icon}
                centerText
                tone={tones[c.tone]}
                state={picked === c.id ? "selected" : "idle"}
                onPress={() => {
                  if (picked !== c.id) {
                    impactLight();
                    void playSfx("ui.select");
                  }
                  onPick(c.id);
                }}
              />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}
