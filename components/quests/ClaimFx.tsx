/**
 * ClaimFx — the sparkles of a quest claim, drawn on the quest bar itself: a stream off the fill's
 * front and a burst at its end. (The XP coins fly above the tab bar: `ClaimCoinLayer.tsx`.)
 * The timeline is `claim-fx-core.ts`; this only draws it from one clock (ms).
 *
 * Everything is flat colour (no gradients, no glow). It is decorative: hidden from screen
 * readers and it never takes a touch. Positions are relative to the quest row it plays in.
 */

import React, { memo, useMemo } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";

import {
  burstFrame,
  CLAIM_FX,
  streamFrame,
} from "@/components/quests/claim-fx-core";
import { shadeColor } from "@/components/path/firefly-core";
import { createStyles, useTheme } from "@/theme";

export interface ClaimFxProps {
  clock: SharedValue<number>;
  /** The quest bar: its position inside the row and its size. */
  bar: { x: number; y: number; width: number; height: number };
}

function Sparkle({
  index,
  kind,
  clock,
  bar,
  color,
  size,
}: {
  index: number;
  kind: "stream" | "burst";
  clock: SharedValue<number>;
  bar: ClaimFxProps["bar"];
  color: string;
  size: number;
}) {
  const style = useAnimatedStyle(() => {
    const f =
      kind === "stream"
        ? streamFrame(index, clock.get(), bar.width, bar.height)
        : burstFrame(index, clock.get(), bar.width);
    return { opacity: f.opacity, transform: [{ translateX: f.x }, { translateY: f.y }, { scale: f.scale }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: bar.x + bar.width / 2 - size / 2,
          top: bar.y + bar.height / 2 - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0,
        },
        style,
      ]}
    />
  );
}

function ClaimFxBase({ clock, bar }: ClaimFxProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const c = theme.colors;
  // White and two yellows: the brand's, a light and a deep one
  const sparkColors = useMemo(() => [c.onPrimary, shadeColor(c.lessonHeader, 0.55), c.lessonHeader, shadeColor(c.lessonHeader, -0.15)], [c]);

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.layer}
    >
      {Array.from({ length: CLAIM_FX.streamCount }, (_, i) => (
        <Sparkle key={`s${i}`} index={i} kind="stream" clock={clock} bar={bar} color={sparkColors[i % sparkColors.length]} size={5 + (i % 3)} />
      ))}
      {Array.from({ length: CLAIM_FX.burstCount }, (_, i) => (
        <Sparkle key={`b${i}`} index={i} kind="burst" clock={clock} bar={bar} color={sparkColors[i % sparkColors.length]} size={6 + (i % 3) * 2} />
      ))}
    </View>
  );
}

export const ClaimFx = memo(ClaimFxBase);

const makeStyles = createStyles(() => {
  return {
    /** A zero-size layer at the row's corner: particles position themselves from there, unclipped. */
    layer: { position: "absolute", left: 0, top: 0, width: 0, height: 0, overflow: "visible" },
  };
});
