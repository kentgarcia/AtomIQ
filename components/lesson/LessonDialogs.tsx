/**
 * The two questions a lesson asks, as the house modal (`ModalDialog`) instead of a system alert:
 *   - LeaveLessonDialog: the close button or the Android back key on the first card of a run.
 *   - ResumeLessonDialog: Start on a lesson that was left half way.
 * The X in the header and the Android back key always mean "no, stay as I was" (keep going / cancel).
 */

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { Text } from "@/components/ui/text";
import { MODAL_MARGIN, ModalButton, ModalCard, ModalSecondaryButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { createStyles, fontFaces, fontSizes, useTheme } from "@/theme";

const useStyles = createStyles((theme) => ({
  text: { ...fontFaces.semibold, fontSize: fontSizes.xl, lineHeight: 24, color: theme.colors.textSecondary, textAlign: "center" },
}));

export function LeaveLessonDialog({
  visible,
  saves,
  onStay,
  onLeave,
  noun = "lesson",
}: {
  visible: boolean;
  /** The run is saved as it goes: leaving keeps the place. */
  saves: boolean;
  onStay: () => void;
  onLeave: () => void;
  /** "lesson", "practice", "checkpoint"... */
  noun?: string;
}) {
  const styles = useStyles(useTheme().theme);
  return (
    <ModalDialog
      visible={visible}
      onClose={onStay}
      title={`Leave this ${noun}?`}
      closeLabel="Keep going"
      footer={
        <>
          <ModalButton label="Keep going" onPress={onStay} />
          <ModalSecondaryButton label="Leave" variant={saves ? "secondary" : "destructive"} onPress={onLeave} />
        </>
      }
    >
      <Text style={styles.text}>{saves ? "Your progress is saved. You can pick up where you left off." : "Your progress here will be lost."}</Text>
    </ModalDialog>
  );
}

export function ResumeLessonDialog({
  visible,
  percent,
  onContinue,
  onStartAgain,
  onCancel,
}: {
  visible: boolean;
  /** How far through the saved run was, 0 to 100. */
  percent: number;
  onContinue: () => void;
  onStartAgain: () => void;
  onCancel: () => void;
}) {
  const styles = useStyles(useTheme().theme);
  return (
    <ModalDialog
      visible={visible}
      onClose={onCancel}
      title="Pick up where you left off?"
      closeLabel="Cancel"
      footer={
        <>
          <ModalButton label="Continue" onPress={onContinue} />
          <ModalSecondaryButton label="Start again" onPress={onStartAgain} />
        </>
      }
    >
      <Text style={styles.text}>{`You were ${percent}% through this lesson.`}</Text>
    </ModalDialog>
  );
}

/**
 * The same question as `ResumeLessonDialog`, drawn inside a modal that is already open instead of as a
 * second modal: the lesson preview layer on the Home map is a modal, and a modal opened over another
 * one is not reliably shown (Review would do nothing). It is the house `ModalCard` over its own scrim.
 * Render it as the last child of the host modal; the host's back key should call `onCancel` while it shows.
 */
export function ResumeLessonOverlay({
  percent,
  onContinue,
  onStartAgain,
  onCancel,
}: {
  /** How far through the saved run was, 0 to 100. */
  percent: number;
  onContinue: () => void;
  onStartAgain: () => void;
  onCancel: () => void;
}) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(150)}
      exiting={reduced ? undefined : FadeOut.duration(120)}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors.overlay,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: insets.top + MODAL_MARGIN,
        paddingBottom: insets.bottom + MODAL_MARGIN,
        paddingHorizontal: MODAL_MARGIN,
      }}
    >
      <View style={{ width: "100%", maxWidth: 380 }}>
        <ModalCard
          title="Pick up where you left off?"
          closeLabel="Cancel"
          onClose={onCancel}
          maxWidth={380}
          footer={
            <>
              <ModalButton label="Continue" onPress={onContinue} />
              <ModalSecondaryButton label="Start again" onPress={onStartAgain} />
            </>
          }
        >
          <Text style={styles.text}>{`You were ${percent}% through this lesson.`}</Text>
        </ModalCard>
      </View>
    </Animated.View>
  );
}
