/**
 * SettingsCard / SettingsRow — the Settings screen's list: a flat section (no card face, border or lip, but the
 * card's inner side spacing) with a bold title, and rows split by dashed lines. A row is a colourful round
 * icon, a bold label, and on the right one of: a value (muted text), a round arrow button, a
 * toggle, or nothing. A row with `onPress` is a button; a toggle row is a switch. A row has no line of explanation under
 * its label: where it needs one, `onInfo` adds a small round info button beside the label that the screen answers with a dialog.
 */

import React from "react";
import { ActivityIndicator, Pressable, View, type HostInstance } from "react-native";
import { Text } from "@/components/ui/text";

import { Icon } from "@/components/ui/icon";
import { Toggle } from "@/components/ui/toggle";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";

export function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = makeStyles(useTheme().theme);
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {rows.map((row, i) => (
        <View key={i} style={i > 0 ? styles.divided : undefined}>
          {row}
        </View>
      ))}
    </View>
  );
}

export interface SettingsRowProps {
  icon: string;
  /** Colour of the icon and its round tint. */
  color: string;
  label: string;
  /** An info button beside the label (for a row that needs explaining); the screen opens the explanation. */
  onInfo?: () => void;
  /** Right side, muted text (e.g. the version). */
  value?: string;
  /** Right side, a round arrow button (the row must have `onPress`). */
  arrow?: boolean;
  /** Right side, a toggle: pass both. */
  toggle?: { value: boolean; onChange: (next: boolean) => void };
  onPress?: () => void;
  /** A spinner instead of the arrow. */
  busy?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  /** Spoken after the label (what the row does). */
  hint?: string;
  /** Ref of the row, for a modal that grows out of it. */
  anchor?: React.Ref<HostInstance>;
}

export function SettingsRow({ icon, color, label, onInfo, value, arrow, toggle, onPress, busy, destructive, disabled, hint, anchor }: SettingsRowProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const c = theme.colors;
  const tone = destructive ? c.error : color;

  const body = (
    <>
      <View style={[styles.icon, { backgroundColor: withAlpha(tone, 0.14) }]}>
        <Icon name={icon} size={20} color={tone} variant="Bold" />
      </View>
      <View style={styles.labelBox}>
        <Text style={[styles.label, destructive && { color: c.error }]} numberOfLines={2}>
          {label}
        </Text>
        {onInfo ? (
          <Pressable
            onPress={onInfo}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`About ${label}`}
            style={({ pressed }) => [styles.info, pressed && styles.rowPressed]}
          >
            <Icon name="InfoCircle" size={20} color={c.textMuted} variant="Bold" />
          </Pressable>
        ) : null}
      </View>
      {value ? (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {toggle ? <Toggle value={toggle.value} onValueChange={toggle.onChange} accessibilityLabel={label} /> : null}
      {arrow ? (
        busy ? (
          <ActivityIndicator color={tone} size="small" />
        ) : (
          <View style={[styles.arrow, { backgroundColor: destructive ? c.error : c.primary }]}>
            <Icon name="ArrowRight2" size={16} color={c.onPrimary} variant="Bold" />
          </View>
        )
      ) : null}
    </>
  );

  // A toggle row's switch is its own control, so the row itself is not a button
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      ref={anchor}
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {body}
    </Pressable>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    card: { marginBottom: 20, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
    title: { fontSize: 20, ...fontFaces.heavy, color: c.text, marginBottom: 4 },
    divided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 10 },
    rowPressed: { opacity: 0.6 },
    icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    labelBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    info: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
    label: { flexShrink: 1, fontSize: 16, ...fontFaces.heavy, color: c.text },
    value: { flexShrink: 1, maxWidth: "45%", fontSize: 15, ...fontFaces.medium, color: c.textMuted },
    arrow: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  };
});
