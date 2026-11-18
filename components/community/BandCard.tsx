/**
 * The card construction of the Discovery Hub and the Encyclopedia, the same as the Profile cards
 * (PassportCard, StreakCard): a face on a lip, optionally with a yellow header band that holds
 * the title and white circle buttons.
 *
 *   BandCard    face + lip + header band (title, `left` and `right` slots) + body. Give it
 *               `onPress` and the whole card is one button that sinks onto its lip.
 *   LipCard     face + lip and nothing else: list rows, image cards, the entry's sections.
 *   BandCircle  the white circle on the band (icon in the band's colour); a button when it has
 *               `onPress`, plain decoration otherwise.
 *
 * `tone="danger"` makes the band red (white title) and the body the error surface, for a
 * "Myth busted" card.
 */

import React from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "@/components/ui/text";

import { Icon } from "@/components/ui/icon";
import { createStyles, fontFaces, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";

export type BandTone = "default" | "danger";

function useTone(tone: BandTone) {
  const c = useTheme().theme.colors;
  return tone === "danger"
    ? { band: c.error, lip: c.dangerDark, face: c.errorSurface, icon: c.error }
    : { band: c.lessonHeader, lip: c.lessonLip, face: c.card, icon: c.lessonHeader };
}

export function BandCircle({
  icon,
  onPress,
  label,
  tone = "default",
}: {
  icon: string;
  onPress?: () => void;
  /** Spoken name when it is a button. */
  label?: string;
  tone?: BandTone;
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const t = useTone(tone);
  const glyph = <Icon name={icon} size={20} color={t.icon} variant="Bold" />;
  if (!onPress) return <View style={styles.circle}>{glyph}</View>;
  return (
    <Pressable onPress={onPress} hitSlop={6} style={styles.circle} accessibilityRole="button" accessibilityLabel={label}>
      {glyph}
    </Pressable>
  );
}

export interface LipCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  tone?: BandTone;
  style?: StyleProp<ViewStyle>;
  /** Style of the face (padding, gap, direction). */
  faceStyle?: StyleProp<ViewStyle>;
}

export function LipCard({ children, onPress, accessibilityLabel, tone = "default", style, faceStyle }: LipCardProps) {
  const styles = makeStyles(useTheme().theme);
  const t = useTone(tone);
  const lip = <View pointerEvents="none" style={[styles.lip, { backgroundColor: t.lip }]} />;
  if (!onPress) {
    return (
      <View style={[styles.card, style]}>
        {lip}
        <View style={[styles.face, { backgroundColor: t.face }, faceStyle]}>{children}</View>
      </View>
    );
  }
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={[styles.card, style]}>
      {({ pressed }) => (
        <>
          {lip}
          <View style={[styles.face, { backgroundColor: t.face }, faceStyle, pressed && styles.pressed]}>{children}</View>
        </>
      )}
    </Pressable>
  );
}

export interface BandCardProps extends Omit<LipCardProps, "faceStyle" | "children"> {
  title: string;
  children?: React.ReactNode;
  /** Before the title on the band (a back circle). */
  left?: React.ReactNode;
  /** After the title on the band (a BandCircle, a read-aloud button). */
  right?: React.ReactNode;
  /** Style of the body under the band; the body is left out when there are no children. */
  bodyStyle?: StyleProp<ViewStyle>;
}

export function BandCard({ title, left, right, children, onPress, accessibilityLabel, tone = "default", style, bodyStyle }: BandCardProps) {
  const styles = makeStyles(useTheme().theme);
  const t = useTone(tone);
  return (
    <LipCard onPress={onPress} accessibilityLabel={accessibilityLabel} tone={tone} style={style}>
      <View style={[styles.header, { backgroundColor: t.band }]}>
        {left}
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        {right}
      </View>
      {children ? <View style={[styles.body, bodyStyle]}>{children}</View> : null}
    </LipCard>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    /* The lip layer starts `lip` down, so it only shows along the bottom edge */
    card: { paddingBottom: controls.lip },
    lip: { position: "absolute", top: controls.lip, left: 0, right: 0, bottom: 0, borderRadius: 20 },
    face: { borderRadius: 20, overflow: "hidden" },
    pressed: { transform: [{ translateY: controls.pressTravel }] },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
    title: { flex: 1, fontSize: 20, ...fontFaces.heavy, color: c.lessonHeaderText },
    /* White circle on the band; the icon takes the band's colour */
    circle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: c.onPrimary },
    body: { padding: 16, gap: 12 },
  };
});
