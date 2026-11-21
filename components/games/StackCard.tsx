/**
 * StackCard — a game or level choice on the Games page and in its in-page difficulty stacks.
 *
 * Same anatomy as every other card in the app (`Card`: 2 px border and a 4 px lip, sinks when pressed),
 * filling the slot it is given with a little air between neighbours and at the sides. Inside: a chunky icon tile in the
 * game's accent (its own darker lip), the title, one muted line about it and a chevron. The pop-in lives
 * on the outer wrapper; reduced motion swaps it for a short fade.
 */

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";
import React from "react";
import { View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

const isHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

/** Darkened accent for the lip under the icon tile. */
const shade = (hex: string, amount: number) => {
  if (!isHex(hex)) return hex;
  const mix = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v + 255 * amount)))
      .toString(16)
      .padStart(2, "0");
  return `#${mix(parseInt(hex.slice(1, 3), 16))}${mix(parseInt(hex.slice(3, 5), 16))}${mix(parseInt(hex.slice(5, 7), 16))}`;
};

/** The icon tile grows with the card, within sensible bounds. */
const tileSizeFor = (height: number) => Math.max(48, Math.min(84, Math.round(height * 0.42)));

export interface StackCardProps {
  title: string;
  /** One short muted line under the title. */
  subtitle?: string;
  color: string;
  icon: string;
  delay: number;
  /** Height of the slot; the card keeps `SLOT_GAP` of air above and below. */
  height: number;
  onPress: () => void;
  /** Play the pop-in on mount. Off when a parent transition owns the entrance. */
  animateIn?: boolean;
}

/** Air kept above and below the card inside its slot. */
const SLOT_GAP = 7;
/** Air kept on the left and right, so the card never touches the screen edge. */
const SLOT_SIDE = 20;

export function StackCard({ title, subtitle, color, icon, delay, height, onPress, animateIn = true }: StackCardProps) {
  const reducedMotion = useReducedMotion();
  const { theme } = useTheme();
  const c = theme.colors;
  const styles = useStyles(theme);
  const tile = tileSizeFor(height);

  return (
    <Animated.View
      entering={
        !animateIn
          ? undefined
          : reducedMotion
            ? FadeIn.duration(120)
            : ZoomIn.duration(280).delay(delay).springify().damping(20).stiffness(260)
      }
      style={[styles.slot, { height }]}
    >
      <Card
        onPress={onPress}
        accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
        padding={0}
        style={styles.card}
        faceStyle={styles.face}
      >
        <View
          style={[
            styles.tileLip,
            { width: tile, height: tile + controls.lip, borderRadius: tile * 0.3, backgroundColor: shade(color, -0.2) },
          ]}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <View style={[styles.tile, { height: tile, borderRadius: tile * 0.3, backgroundColor: color }]}>
            <Icon name={icon} size={Math.round(tile * 0.52)} color={c.onPrimary} variant="Bold" />
          </View>
        </View>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Icon name="ArrowRight2" size={22} color={c.textFaint} variant="Bold" />
      </Card>
    </Animated.View>
  );
}

export default StackCard;

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    slot: { paddingVertical: SLOT_GAP, paddingHorizontal: SLOT_SIDE },
    card: { flex: 1 },
    face: { flex: 1, flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 18 },
    tileLip: { overflow: "hidden" },
    tile: { alignItems: "center", justifyContent: "center" },
    copy: { flex: 1, gap: 4 },
    title: { fontSize: 22, lineHeight: 28, ...fontFaces.heavy, color: c.text },
    subtitle: { fontSize: 15, lineHeight: 21, ...fontFaces.medium, color: c.textMuted },
  };
});
