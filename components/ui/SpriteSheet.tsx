/**
 * SpriteSheet — plays a baked animation: one image holding every frame in a grid, shown through a
 * window one frame big, with the sheet moved by a clock (a loop, or once and hold the last frame).
 * Exactly the pixels that were baked, on every device. Math in `sprite-core.ts`.
 *
 * Not `playing`, it shows frame 0 (use that for a still, and for reduced motion).
 */

import { Image, type ImageSource } from "expo-image";
import { useEffect } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { useLoopClock, useOneShotClock } from "@/components/motion/motion";
import { cellOffset, frameIndex, sheetDuration } from "@/components/ui/sprite-core";

export interface SpriteSheetSpec {
  source: ImageSource | number;
  cols: number;
  frames: number;
  fps: number;
}

export interface SpriteSheetProps {
  sheet: SpriteSheetSpec;
  /** Width and height of one frame as shown (dp). */
  size: number;
  playing?: boolean;
  loop?: boolean;
  /** Called once when a non-looping run reaches its last frame. */
  onEnd?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SpriteSheet({ sheet, size, playing = false, loop = false, onEnd, style }: SpriteSheetProps) {
  const { source, cols, frames, fps } = sheet;
  const rows = Math.ceil(frames / cols);
  const duration = sheetDuration(frames, fps);
  const loopClock = useLoopClock(duration, playing && loop);
  const onceClock = useOneShotClock(duration, playing && !loop, false);
  const clock = loop ? loopClock : onceClock;

  useEffect(() => {
    if (!playing || loop || !onEnd) return;
    const id = setTimeout(onEnd, duration);
    return () => clearTimeout(id);
  }, [playing, loop, onEnd, duration]);

  const moved = useAnimatedStyle(() => {
    const o = cellOffset(frameIndex(clock.get(), fps, frames, loop), cols, size);
    return { transform: [{ translateX: o.x }, { translateY: o.y }] };
  });

  return (
    <View style={[{ width: size, height: size, overflow: "hidden" }, style]} pointerEvents="none">
      <Animated.View style={[{ width: cols * size, height: rows * size }, moved]}>
        <Image source={source} style={{ width: cols * size, height: rows * size }} contentFit="fill" />
      </Animated.View>
    </View>
  );
}
