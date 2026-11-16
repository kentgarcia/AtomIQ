/**
 * The 3D card: a surface with a 2 px border and a 4 px darker lip under it, the same anatomy as
 * `Button`. Pass `onPress` and it sinks 4 px when pressed. `tone` swaps the colours for a state
 * (correct, wrong, selected); the default is the neutral card.
 */

import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { radius, spacing, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";

export type CardTone = "neutral" | "soft" | "primary" | "success" | "error" | "info";

export interface CardProps {
  children: ReactNode;
  tone?: CardTone;
  /** Padding inside the face. Default `spacing.md`; 0 for a card that manages its own. */
  padding?: number;
  /** Gap between children. */
  gap?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Style for the face (alignment, row direction). */
  faceStyle?: StyleProp<ViewStyle>;
}

export function useCardColors(tone: CardTone) {
  const c = useTheme().theme.colors;
  switch (tone) {
    case "soft":
      return { face: c.surfaceSoft, border: c.border, lip: c.borderStrong };
    case "primary":
      return { face: c.primarySurface, border: c.primaryBorder, lip: c.primaryDark };
    case "success":
      return { face: c.successSurface, border: c.success, lip: c.successDark };
    case "error":
      return { face: c.errorSurface, border: c.error, lip: c.dangerDark };
    case "info":
      return { face: c.infoSurface, border: c.info, lip: c.info };
    default:
      return { face: c.surface, border: c.border, lip: c.borderStrong };
  }
}

export function Card({ children, tone = "neutral", padding = spacing.md, gap, onPress, accessibilityLabel, style, faceStyle }: CardProps) {
  const colors = useCardColors(tone);
  const face = (pressed: boolean) => [
    styles.face,
    { backgroundColor: colors.face, borderColor: colors.border, padding, gap },
    onPress && pressed ? { transform: [{ translateY: controls.pressTravel }] } : null,
    faceStyle,
  ];
  const lip = [styles.lip, { backgroundColor: colors.lip, paddingBottom: controls.lip }, style];
  if (!onPress) {
    return (
      <View style={lip}>
        <View style={face(false)}>{children}</View>
      </View>
    );
  }
  // Pressable: the lip is its own layer, where the face lands when pressed, so no darker colour shows above it.
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={[styles.lip, { paddingBottom: controls.lip }, style]}>
      {({ pressed }) => (
        <>
          <View pointerEvents="none" style={[styles.lipLayer, { top: controls.lip, backgroundColor: colors.lip }]} />
          <View style={face(pressed)}>{children}</View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lip: { borderRadius: radius.xl, overflow: "hidden" },
  lipLayer: { position: "absolute", left: 0, right: 0, bottom: 0, borderRadius: radius.xl },
  face: { borderRadius: radius.xl, borderWidth: controls.border },
});
