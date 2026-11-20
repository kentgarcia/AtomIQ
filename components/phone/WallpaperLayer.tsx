/**
 * An illustrated wallpaper (wallpaper-art.ts) filling its parent: one Svg, drawn `slice` so it covers any screen shape and loses a little of
 * its sides or ends (the picture keeps its calm middle for the app icons). Decorative; it takes no touches.
 */

import { memo } from "react";
import { StyleSheet } from "react-native";
import Svg from "react-native-svg";

import { Shape } from "@/components/scanner/ScannerScene";

import { WALLPAPERS, WALLPAPER_FRAME } from "./wallpaper-art";
import type { WallpaperId } from "./wallpaper-core";

export const WallpaperLayer = memo(function WallpaperLayer({ id }: { id: WallpaperId }) {
  const wp = WALLPAPERS[id];
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      viewBox={`0 0 ${WALLPAPER_FRAME.w} ${WALLPAPER_FRAME.h}`}
      preserveAspectRatio="xMidYMid slice"
      pointerEvents="none"
      accessible={false}
    >
      {wp.shapes.map((s, i) => (
        <Shape key={i} s={s} />
      ))}
    </Svg>
  );
});
