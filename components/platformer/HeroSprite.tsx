/**
 * Shows one frame of Shrodi's sprite sheet (hero-anim-core.ts says which frame is which): the whole
 * sheet is one picture, moved behind a window the size of one cell. `HeroFrame` shows a frame it is
 * given; `HeroClip` plays one of the self-running modes (the idle loop with its fidget, the cheer, the
 * flinch) for the cards that sit over the game. The world draws the hero itself, from the frame array
 * (PlatformerWorld.tsx), so a frame costs no React render.
 */

import { useEffect, useState } from "react";
import { Image, View } from "react-native";

import { SHEET, SHEET_ROWS, cellOf, modeFrame, type ClipMode } from "./hero-anim-core";
import { HERO_SHEET } from "./sprites";

export function HeroFrame({ size, frame }: { size: number; frame: number }) {
  const px = Math.round(size);
  const { col, row } = cellOf(frame);
  return (
    <View style={{ width: px, height: px, overflow: "hidden" }}>
      <Image source={HERO_SHEET} style={{ position: "absolute", left: -col * px, top: -row * px, width: SHEET.cols * px, height: SHEET_ROWS * px }} fadeDuration={0} />
    </View>
  );
}

const TICK_MS = 83;

function Running({ size, mode }: { size: number; mode: ClipMode }) {
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTicks((n) => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);
  return <HeroFrame size={size} frame={modeFrame(mode, (ticks * TICK_MS) / 1000)} />;
}

/** Plays a mode from its start; a new mode remounts it (the key), so it begins again from its first frame. */
export function HeroClip({ size, mode }: { size: number; mode: ClipMode }) {
  return <Running key={mode} size={size} mode={mode} />;
}
