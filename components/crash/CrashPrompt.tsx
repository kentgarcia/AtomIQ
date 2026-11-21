/**
 * The start-up prompt after a crash (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §5.7): "AtomIQ closed unexpectedly last time",
 * with the animation level that is recommended, and the way out of it. Shown once per start, a moment after the app is up, only when
 * the crash guard found an unanswered crash and the animation can still be lowered. Any answer, and the X, mark that crash as
 * answered, so the same crash is never asked about twice. A repeat crash recommends Disabled instead of Reduced.
 */

import { useEffect, useRef, useState } from "react";

import { MOTION_LEVEL_LABEL, MOTION_LEVEL_NOTE, type MotionLevel } from "@/components/motion/motion-level-core";
import { ModalButton, ModalSecondaryButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Text } from "@/components/ui/text";
import { answerCrashPrompt, useCrashAdvice } from "@/services/crash-guard";
import { setMotionLevel } from "@/services/motion-level";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

/** How long after the app is up before the prompt may show, ms. */
const SHOW_AFTER_MS = 1200;

const useStyles = createStyles((theme) => ({
  text: { ...fontFaces.medium, fontSize: fontSizes.md, lineHeight: 21, color: theme.colors.textSecondary },
  strong: { ...fontFaces.bold, color: theme.colors.text },
  gap: { height: spacing.sm },
}));

export function CrashPrompt() {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const advice = useCrashAdvice();
  const [ready, setReady] = useState(false);
  const shown = useRef(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), SHOW_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  // Once per start: after the answer the advice is gone, and it never reopens until the next start
  useEffect(() => {
    if (!ready || !advice || shown.current) return;
    shown.current = true;
    setOpen(true);
  }, [ready, advice]);

  // Keep the last advice while the dialog closes, so its text does not change as it fades
  const last = useRef(advice);
  if (advice) last.current = advice;
  const shownAdvice = advice ?? last.current;
  if (!shownAdvice) return null;

  const close = () => {
    setOpen(false);
    void answerCrashPrompt();
  };
  const choose = (level: MotionLevel) => {
    void setMotionLevel(level);
    close();
  };
  const other: MotionLevel | null = shownAdvice.level === "reduced" ? "off" : null;
  const repeat = shownAdvice.crashes > 1;

  return (
    <ModalDialog
      visible={open}
      onClose={close}
      title="Run smoother?"
      footer={
        <>
          <ModalButton label={`Use ${MOTION_LEVEL_LABEL[shownAdvice.level]} (recommended)`} onPress={() => choose(shownAdvice.level)} />
          {other ? <ModalSecondaryButton label={`Use ${MOTION_LEVEL_LABEL[other]}`} onPress={() => choose(other)} /> : null}
          <ModalSecondaryButton label="Keep as it is" onPress={close} />
        </>
      }
    >
      <Text style={styles.text}>
        {repeat ? "AtomIQ has closed unexpectedly more than once lately." : "AtomIQ closed unexpectedly last time."} Your phone may be having a hard time with the animations.
      </Text>
      <Text style={styles.gap} />
      <Text style={styles.text}>
        <Text style={styles.strong}>{MOTION_LEVEL_LABEL[shownAdvice.level]}</Text>: {MOTION_LEVEL_NOTE[shownAdvice.level]}
      </Text>
      <Text style={styles.gap} />
      <Text style={styles.text}>You can change this any time in Settings, under Animations.</Text>
    </ModalDialog>
  );
}
