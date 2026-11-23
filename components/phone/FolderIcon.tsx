/**
 * A folder on the phone's home screen: a soft tile in the same face-and-lip shape as the app icons, holding a 3 x 3 peek of the apps
 * inside (their own little tiles, grey for the ones not installed yet), with its name beneath on the same chip. A dot on the corner says
 * something inside is new. Pressing it opens the folder (`FolderDialog`).
 */

import { memo } from "react";
import { Pressable, View } from "react-native";

import { AppGlyph, hasGlyph } from "@/components/phone/AppGlyph";
import { APP_ICON_TILE, ICON_TILES } from "@/components/phone/app-icon-art";
import { phoneTile } from "@/components/phone/phone-palette";
import { Text } from "@/components/ui/text";
import type { PhoneApp } from "@/services/phone-core";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";

const LIP = 4;
const PEEK = 9;

/** The face and lip an app's tile wears: its own white or dark tile, the catalog colour, or grey while it is not installed. */
export function useAppTile(app: PhoneApp, locked: boolean) {
  const { theme } = useTheme();
  const own = APP_ICON_TILE[app.id];
  return locked ? phoneTile(theme.colors, "grey") : own ? ICON_TILES[own] : phoneTile(theme.colors, app.color);
}

function MiniTile({ app, locked, size }: { app: PhoneApp; locked: boolean; size: number }) {
  const tile = useAppTile(app, locked);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.27, backgroundColor: tile.face, overflow: "hidden" }}>
      {!locked && hasGlyph(app.id) ? <AppGlyph id={app.id} size={size} face={tile.face} lip={tile.lip} /> : null}
    </View>
  );
}

export interface FolderIconProps {
  name: string;
  /** The apps inside, in order, and which are not installed yet. */
  members: { app: PhoneApp; locked: boolean }[];
  size: number;
  /** Something inside is new: a dot on the corner. */
  dot: boolean;
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
}

function FolderIconBase({ name, members, size, dot, label, onPress, onLongPress }: FolderIconProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const styles = useStyles(theme);
  const radius = Math.round(size * 0.27);
  const pad = Math.round(size * 0.1);
  const gap = Math.round(size * 0.06);
  const mini = Math.floor((size - pad * 2 - gap * 2) / 3);
  const peek = members.slice(0, PEEK);
  return (
    <View style={[styles.cell, { width: size + 20 }]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={4}
        style={({ pressed }) => ({ width: size, height: size + LIP, transform: [{ scale: pressed ? 0.92 : 1 }] })}
      >
        <View style={[styles.lip, { top: LIP, height: size, borderRadius: radius, backgroundColor: withAlpha(c.text, 0.22) }]} />
        <View style={[styles.face, { height: size, borderRadius: radius, padding: pad, gap, backgroundColor: withAlpha(c.card, 0.66) }]}>
          {peek.map((m) => (
            <MiniTile key={m.app.id} app={m.app} locked={m.locked} size={mini} />
          ))}
        </View>
        {dot ? <View pointerEvents="none" accessible={false} style={[styles.dot, { backgroundColor: c.error, borderColor: c.background }]} /> : null}
      </Pressable>
      <View style={[styles.chip, { backgroundColor: withAlpha(c.card, 0.92) }]}>
        <Text numberOfLines={2} style={[styles.name, { color: c.text }]}>
          {name}
        </Text>
      </View>
    </View>
  );
}

export const FolderIcon = memo(FolderIconBase);

const useStyles = createStyles(() => ({
  cell: { alignItems: "center", gap: 8 },
  lip: { position: "absolute", left: 0, right: 0 },
  face: { position: "absolute", left: 0, right: 0, top: 0, flexDirection: "row", flexWrap: "wrap", alignContent: "flex-start", overflow: "hidden" },
  dot: { position: "absolute", top: -5, right: -5, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  chip: { maxWidth: "100%", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  name: { fontSize: 12, lineHeight: 15, textAlign: "center", ...fontFaces.bold },
}));
