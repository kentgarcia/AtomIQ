/**
 * The dim and the pointing hand (docs/features/TUTORIAL_SPEC.md §4.1), plain Views, no SVG and NO animation: the tour is
 * straightforward and fast, so the dim, the hole and the hand are simply there, and move by simply being somewhere else
 * on the next beat. Nothing here is an animated value, a clock or a layout animation.
 *
 * The dim is ONE View: the hole grown by a very wide border in the scrim colour, with a radius that makes the border's inner
 * edge the rounded hole (`borderHole`). A beat with no target closes the hole to nothing in the middle of the screen, so the
 * whole screen is dim. Nothing in here takes touches: the layer draws the touch strips, and leaves the hole itself empty so a
 * tap there reaches the real control.
 */

import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { HAND_SIZE, HAND_TIP, PointingHand } from "@/components/tutorial/PointingHand";
import { borderHole, type Hole } from "@/components/tutorial/tutorial-fx-core";
import { useTheme } from "@/theme";

export interface SpotlightProps {
  /** Where the hole is, or null for none (the whole screen dim). */
  hole: Hole | null;
  screen: { w: number; h: number };
  /** Whether the pointing hand shows (a `tap` beat with its control lit). */
  hand: boolean;
}

/** How far the hand leans about its fingertip, in degrees. */
const HAND_LEAN = -12;

export const Spotlight = memo(function Spotlight({ hole, screen, hand }: SpotlightProps) {
  const { theme } = useTheme();
  const target: Hole = hole ?? { x: screen.w / 2, y: screen.h / 2, w: 0, h: 0, r: 0 };

  // The hand is always upright and comes from below: its fingertip sits on the lit control, a little in from the bottom edge.
  // A control at the screen's foot leaves the palm off screen, like a hand reaching in. It leans a little about its fingertip,
  // so it looks held and not stamped.
  const inset = Math.min(14, target.h * 0.25);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* the border is the dim; the colour is the theme's modal scrim */}
      <View pointerEvents="none" style={[styles.layer, { borderColor: theme.colors.overlay, borderStyle: "solid" }, borderHole(target, screen)]} />
      {hand ? (
        <View
          style={[
            styles.hand,
            {
              left: target.x + target.w / 2 - HAND_TIP.x,
              top: target.y + target.h - inset - HAND_TIP.y,
              transformOrigin: `${HAND_TIP.x}px ${HAND_TIP.y}px`,
              transform: [{ rotate: `${HAND_LEAN}deg` }],
            },
          ]}
        >
          <PointingHand />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  layer: { position: "absolute" },
  hand: { position: "absolute", width: HAND_SIZE.w, height: HAND_SIZE.h },
});
