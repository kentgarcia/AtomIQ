/**
 * The controls row shared by the phone apps' coloured headers (the Notes pad, the Library's wood, the Chats postbox). Each header keeps
 * its own art and colours, but the row is the app's usual header (`ScreenHeader`): 24 dp side padding, 48 dp slots with a 24 dp icon, and
 * a centred 22 dp title with a 13 dp subtitle (the count, as on Contacts), so every page of the app reads the same. The colour is the
 * header's own (cream on wood and red, ink on the yellow pad), passed in.
 */

import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { fontFaces } from "@/theme";

export const BAND = { side: 24, slot: 48, icon: 24 } as const;

/** A 48 dp icon button, bare: just the icon in the header's colour. */
export function BandButton({ icon, label, onPress, color }: { icon: string; label: string; onPress: () => void; color: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: BAND.slot, height: BAND.slot, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}
    >
      <Icon name={icon} size={BAND.icon} color={color} variant="Bold" />
    </Pressable>
  );
}

/** The centred title and, under it, a muted subtitle. */
export function BandTitle({ title, subtitle, color }: { title: string; subtitle?: string; color: string }) {
  return (
    <View style={{ alignItems: "center", maxWidth: "100%" }}>
      <Text accessibilityRole="header" numberOfLines={1} style={{ fontSize: 22, lineHeight: 28, textAlign: "center", ...fontFaces.heavy, color }}>
        {title}
      </Text>
      {subtitle ? (
        <Text numberOfLines={1} style={{ fontSize: 13, lineHeight: 18, textAlign: "center", ...fontFaces.medium, color, opacity: 0.8 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/** The row itself: a left control, a right control, and the title centred on the screen whatever is on either side of it. */
export function BandRow({ left, center, right }: { left: ReactNode; center?: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ height: BAND.slot, paddingHorizontal: BAND.side, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ width: BAND.slot, alignItems: "flex-start" }}>{left}</View>
      <View style={{ width: BAND.slot, alignItems: "flex-end" }}>{right}</View>
      <View pointerEvents="box-none" style={{ position: "absolute", left: BAND.side + BAND.slot, right: BAND.side + BAND.slot, height: BAND.slot, alignItems: "center", justifyContent: "center" }}>
        {center}
      </View>
    </View>
  );
}
