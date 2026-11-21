/**
 * FooterRow — the lesson footer's main button, with a Back button on its left when there is a
 * previous step. The top bar of a lesson is always a close button; stepping back lives here.
 *
 * The Back button is the bezeled icon button at the main button's height (a lesson button's inner
 * height is 52), so the two line up. Both animate: the row rises in when it first appears and sinks
 * out when it goes (a short ease-out, under 300 ms), the Back button fades in and out on its own
 * while the main button glides to its new width. With reduced motion they simply appear and go.
 */

import type { ReactNode } from "react";
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown, LinearTransition } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { EASE_OUT } from "@/components/motion/motion";
import { IconButton } from "@/components/ui/icon-button";
import { spacing } from "@/theme";

/** Inner height of a lesson's main button (the large bezeled size). */
const BACK_SIZE = 52;
/** The room a main button takes in the footer: its face, the bezel round it and its lip. */
export const FOOTER_BUTTON_HEIGHT = BACK_SIZE + 2 * 3 + 3;

export function FooterRow({ onBack, children }: { onBack?: (() => void) | null; children?: ReactNode }) {
  const reduced = useReducedMotion();
  // Back only ever sits beside a main button: a card with none (graded as soon as it is answered) shows nothing.
  if (!children) return null;
  const rise = reduced ? undefined : FadeInDown.duration(200).easing(EASE_OUT);
  const sink = reduced ? undefined : FadeOutDown.duration(150);
  const glide = reduced ? undefined : LinearTransition.duration(200).easing(EASE_OUT);
  return (
    <Animated.View entering={rise} exiting={sink} layout={glide} style={{ flexDirection: "row", alignItems: "center", gap: onBack ? spacing.sm : 0 }}>
      {onBack ? (
        <Animated.View entering={reduced ? undefined : FadeIn.duration(180)} exiting={reduced ? undefined : FadeOut.duration(120)}>
          <IconButton icon="ArrowLeft2" variant="neutral" size={BACK_SIZE} accessibilityLabel="Previous step" onPress={onBack} />
        </Animated.View>
      ) : null}
      <Animated.View layout={glide} style={{ flex: 1 }}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}
