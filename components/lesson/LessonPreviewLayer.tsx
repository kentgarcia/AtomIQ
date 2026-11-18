/**
 * LessonPreviewLayer — the lesson preview as a full-screen layer on the Home map, so the bubble's zoom
 * and the page arriving are one animation on one screen (a route change would cut between two screens).
 *
 * It is a transparent `Modal` (so it also covers the tab bar and the status bar) holding the normal
 * `LessonPreview`. Opening: it fades in over the dissolving bubble and settles from slightly zoomed
 * (`previewInFrame`). It stays mounted while `data` is set. Leaving (X, Android back, or after Start has opened the lesson behind it): it fades
 * and shrinks a little (`previewOutFrame`), then calls `onGone`. With reduced motion it only fades.
 * Timing and maths are in `components/path/bubble-motion-core.ts`.
 */

import { useEffect, useRef } from "react";
import { Modal } from "react-native";
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { ResumeLessonOverlay } from "@/components/lesson/LessonDialogs";
import { LessonPreview } from "@/components/lesson/LessonPreview";
import { PREVIEW_FX, previewInFrame, previewOutFrame } from "@/components/path/bubble-motion-core";
import type { LessonPreviewData } from "@/services/lesson-preview";

export interface LessonPreviewLayerProps {
  /** What to show, or null for nothing (the layer is unmounted once it has left). */
  data: LessonPreviewData | null;
  /** True while it should be on screen; false makes it leave. */
  open: boolean;
  onClose: () => void;
  onProceed: () => void;
  /**
   * The "pick up where you left off?" question, drawn inside this modal (not as a second modal, which
   * would not reliably show over it). Null: not asking.
   */
  resume?: { percent: number; onContinue: () => void; onStartAgain: () => void; onCancel: () => void } | null;
  /** Called when it has finished leaving. */
  onGone: () => void;
}

export function LessonPreviewLayer({ data, open, onClose, onProceed, resume = null, onGone }: LessonPreviewLayerProps) {
  const reduced = useReducedMotion();
  // ms since the launch started (arriving, up to the end of the arrival) and since it started leaving
  const arrive = useSharedValue(0);
  const leave = useSharedValue(0);
  const leaving = useSharedValue(0);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && data) {
      wasOpen.current = true;
      cancelAnimation(leave);
      leaving.set(0);
      leave.set(0);
      arrive.set(0);
      const total = PREVIEW_FX.delay + PREVIEW_FX.inMs;
      arrive.set(withTiming(total, { duration: reduced ? 120 : total, easing: Easing.linear }));
      return;
    }
    if (!open && wasOpen.current) {
      wasOpen.current = false;
      cancelAnimation(arrive);
      leaving.set(1);
      leave.set(
        withTiming(PREVIEW_FX.outMs, { duration: reduced ? 120 : PREVIEW_FX.outMs, easing: Easing.linear }, (done) => {
          if (done) {
            // Ready for the next time it opens: nothing shows until the arrival starts
            arrive.set(0);
            leaving.set(0);
            runOnJS(onGone)();
          }
        }),
      );
    }
  }, [open, data, arrive, leave, leaving, onGone, reduced]);

  const style = useAnimatedStyle(() => {
    if (leaving.get() === 1) {
      const f = previewOutFrame(reduced ? (leave.get() / 120) * PREVIEW_FX.outMs : leave.get());
      return { opacity: f.opacity, transform: [{ scale: reduced ? 1 : f.scale }] };
    }
    const f = previewInFrame(reduced ? (arrive.get() / 120) * (PREVIEW_FX.delay + PREVIEW_FX.inMs) : arrive.get());
    return { opacity: f.opacity, transform: [{ scale: reduced ? 1 : f.scale }] };
  });

  // Mounted while there is something to show: the parent clears `data` in `onGone`
  if (!data) return null;
  return (
    <Modal transparent animationType="none" statusBarTranslucent navigationBarTranslucent visible onRequestClose={resume ? resume.onCancel : onClose}>
      <Animated.View style={[{ flex: 1 }, style]}>
        <LessonPreview
          lesson={data.lesson}
          unit={data.unit}
          objectives={data.objectives}
          referenceCount={data.referenceCount}
          cardCount={data.cardCount}
          isReplay={data.isReplay}
          onClose={onClose}
          onProceed={onProceed}
        />
      </Animated.View>
      {resume ? <ResumeLessonOverlay percent={resume.percent} onContinue={resume.onContinue} onStartAgain={resume.onStartAgain} onCancel={resume.onCancel} /> : null}
    </Modal>
  );
}
