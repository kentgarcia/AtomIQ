/**
 * The animation level picker (Settings > Animations; docs/features/PERFORMANCE_AND_SOUND_SPEC.md §5.6): three options, each
 * with what it does, and a tick on the one in use. A tap applies it at once (so the effect can be seen behind the dialog) and
 * saves it; "Done" closes. The rules are in `components/motion/motion-level-core.ts`.
 */

import { Pressable, View } from "react-native";

import { MOTION_LEVELS, MOTION_LEVEL_LABEL, MOTION_LEVEL_NOTE, type MotionLevel } from "@/components/motion/motion-level-core";
import { Icon } from "@/components/ui/icon";
import { ModalButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Text } from "@/components/ui/text";
import { setMotionLevel, useMotionLevel } from "@/services/motion-level";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme, withAlpha } from "@/theme";

const useStyles = createStyles((theme) => ({
  intro: { ...fontFaces.medium, fontSize: fontSizes.md, lineHeight: 20, color: theme.colors.textSecondary, marginBottom: spacing.md },
  list: { gap: spacing.sm },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 2, borderColor: theme.colors.border, backgroundColor: theme.colors.card },
  optionOn: { borderColor: theme.colors.primary, backgroundColor: withAlpha(theme.colors.primary, 0.08) },
  text: { flex: 1, gap: 2 },
  name: { ...fontFaces.heavy, fontSize: fontSizes.lg, color: theme.colors.text },
  note: { ...fontFaces.medium, fontSize: fontSizes.sm, lineHeight: 18, color: theme.colors.textSecondary },
  tick: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.colors.borderStrong },
  tickOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
}));

export function MotionLevelDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const level = useMotionLevel();

  const choose = (next: MotionLevel) => {
    if (next === level) return;
    void playSfx("ui.select");
    void setMotionLevel(next);
  };

  return (
    <ModalDialog visible={visible} onClose={onClose} title="Animations" dismissOnScrim footer={<ModalButton label="Done" onPress={onClose} />}>
      <Text style={styles.intro}>Turn animation down if the app feels slow or choppy on your phone. Your phone&apos;s own &quot;reduce motion&quot; setting is always respected.</Text>
      <View style={styles.list}>
        {MOTION_LEVELS.map((l) => {
          const on = l === level;
          return (
            <Pressable
              key={l}
              onPress={() => choose(l)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${MOTION_LEVEL_LABEL[l]}. ${MOTION_LEVEL_NOTE[l]}`}
              style={[styles.option, on && styles.optionOn]}
            >
              <View style={styles.text}>
                <Text style={styles.name}>{MOTION_LEVEL_LABEL[l]}</Text>
                <Text style={styles.note}>{MOTION_LEVEL_NOTE[l]}</Text>
              </View>
              <View style={[styles.tick, on && styles.tickOn]}>{on ? <Icon name="TickCircle" size={14} color={theme.colors.onPrimary} variant="Bold" /> : null}</View>
            </Pressable>
          );
        })}
      </View>
    </ModalDialog>
  );
}
