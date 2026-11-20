/**
 * The top of the legal pad Field Notes is drawn as (notepad-palette.ts): a yellow binding strip with the round back button,
 * the title and a pill on it, ending in a perforated tear edge, over the app's own page. Used by the list and the editor.
 */

import { memo, type ReactNode } from "react";
import { View, useWindowDimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme";

import { BAND, BandButton, BandRow, BandTitle } from "./band-header";

import { PAD, perforation } from "./notepad-palette";

export const BAR = BAND.slot;
const LIP = 4;

/** How far the binding strip reaches down the screen. */
export function useHeadHeight(): number {
  const insets = useSafeAreaInsets();
  return insets.top + 12 + BAR + 12 + LIP;
}

/** A button on the strip: just the dark ink icon, no container. */
export function PadButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return <BandButton icon={icon} label={label} onPress={onPress} color={PAD.ink} />;
}

/** What the strip says in the middle, in ink, with an optional count under it. */
export function PadTitle({ children, subtitle }: { children: string; subtitle?: string }) {
  return <BandTitle title={children} subtitle={subtitle} color={PAD.ink} />;
}

/** The holes along the tear edge: filled with the page's colour, so they read as bites out of the strip. */
const Perforation = memo(function Perforation({ width, page }: { width: number; page: string }) {
  return (
    <Svg width={width} height={14} style={{ position: "absolute", left: 0, bottom: -7 }} pointerEvents="none">
      {perforation(width).map((h) => (
        <Circle key={h.cx} cx={h.cx} cy={7} r={h.r} fill={page} />
      ))}
    </Svg>
  );
});

export function NotepadFrame({ left, center, right, children }: { left: ReactNode; center?: ReactNode; right?: ReactNode; children: ReactNode }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const head = useHeadHeight();
  const page = theme.colors.mapBackground;
  return (
    <View style={{ flex: 1, backgroundColor: page }}>
      <StatusBar style="dark" />
      <View style={{ height: head, paddingTop: insets.top + 12, paddingHorizontal: 24, backgroundColor: PAD.band, borderBottomWidth: LIP, borderBottomColor: PAD.bandLip, zIndex: 2 }}>
        <View style={{ marginHorizontal: -24 }}>
          <BandRow left={left} center={center} right={right} />
        </View>
        <Perforation width={width} page={page} />
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
