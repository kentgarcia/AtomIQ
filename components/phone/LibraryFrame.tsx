/**
 * The top of the Reference Library (library-palette.ts): a dark wood header with the back button, the title and its count (the app's usual header row, `band-header.tsx`),
 * and under them a row of books standing on a shelf plank. `Plank` is the same plank under each unit's books in the list.
 */

import { memo, type ReactNode } from "react";
import { View, useWindowDimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Path, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme";

import { BandButton, BandRow, BandTitle } from "./band-header";

import { LIB, headerBooks } from "./library-palette";

const BOOKS_H = 44;
const PLANK = 8;
const LIP = 4;

/** The plank books stand on: a lighter wood face over a darker edge. */
export function Plank() {
  return (
    <View style={{ height: PLANK + LIP, borderRadius: 6, overflow: "hidden", backgroundColor: LIB.plankLip }}>
      <View style={{ height: PLANK, backgroundColor: LIB.plank }} />
    </View>
  );
}

export function LibButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return <BandButton icon={icon} label={label} onPress={onPress} color={LIB.paper} />;
}

/** The title in cream, with an optional count under it. */
export function LibTitle({ children, subtitle }: { children: string; subtitle?: string }) {
  return <BandTitle title={children} subtitle={subtitle} color={LIB.paper} />;
}

/** The books on the header's plank, drawn once as one Svg. */
const Books = memo(function Books({ width }: { width: number }) {
  return (
    <Svg width={width} height={BOOKS_H} pointerEvents="none">
      {headerBooks(width, BOOKS_H).map((b) => (
        <Path key={b.x} d={`M${b.x} ${BOOKS_H}V${BOOKS_H - b.h + 3}Q${b.x} ${BOOKS_H - b.h} ${b.x + 3} ${BOOKS_H - b.h}H${b.x + b.w - 3}Q${b.x + b.w} ${BOOKS_H - b.h} ${b.x + b.w} ${BOOKS_H - b.h + 3}V${BOOKS_H}Z`} fill={b.fill} />
      ))}
      {headerBooks(width, BOOKS_H).flatMap((b) => [
        <Rect key={`t${b.x}`} x={b.x} y={BOOKS_H - b.h + 7} width={b.w} height={3} fill={b.band} />,
        <Rect key={`b${b.x}`} x={b.x} y={BOOKS_H - 10} width={b.w} height={3} fill={b.band} />,
      ])}
    </Svg>
  );
});

export function LibraryFrame({ left, center, right, children }: { left: ReactNode; center?: ReactNode; right?: ReactNode; children: ReactNode }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.mapBackground }}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: LIB.wood, paddingTop: insets.top + 12, zIndex: 2 }}>
        <BandRow left={left} center={center} right={right} />
        <View style={{ marginTop: 10 }}>
          <Books width={width} />
        </View>
        <View style={{ height: PLANK + LIP, backgroundColor: LIB.plankLip }}>
          <View style={{ height: PLANK, backgroundColor: LIB.plank }} />
        </View>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
