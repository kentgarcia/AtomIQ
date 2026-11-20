/**
 * The header of Chats: a plain pillar-box red band with a darker lip, and the app's usual header row on it (`band-header.tsx`): a bare
 * white back icon, a centred white title with its count as a subtitle (`ChatButton`, `ChatTitle`). The red is a fixed colour from the object
 * art's families, the same in light and dark mode like painted metal (theme exception EX-13).
 */

import type { ReactNode } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme";

import { RED, SNOW } from "../lesson/visual/object-art";
import { BandButton, BandRow, BandTitle } from "./band-header";

const LIP = 4;

/** The back button on the red band: a bare white icon. */
export function ChatButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return <BandButton icon={icon} label={label} onPress={onPress} color={SNOW} />;
}

/** The title on the red band: white, with an optional count under it. */
export function ChatTitle({ children, subtitle }: { children: string; subtitle?: string }) {
  return <BandTitle title={children} subtitle={subtitle} color={SNOW} />;
}

export function ChatFrame({ left, center, right, children }: { left: ReactNode; center?: ReactNode; right?: ReactNode; children: ReactNode }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.mapBackground }}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: RED[1], paddingTop: insets.top + 12, zIndex: 2 }}>
        <BandRow left={left} center={center} right={right} />
        <View style={{ height: 12 }} />
        <View style={{ height: LIP, backgroundColor: RED[2] }} />
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
