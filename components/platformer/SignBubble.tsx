/**
 * What a readable sign says: a speech bubble over the sign, in the world's own coordinates so it moves
 * with the map. While the hero stands at the sign it pops out of it (scale 0.35 to 1 in 200 ms,
 * ease-out) and its words type themselves out; when the hero walks away it shrinks back into the sign.
 * The bubble keeps inside the screen and grows out of the point over the sign. Timeline in
 * `world-fx-core.ts` (`bubbleFrame`). The wording is the level's own (`signs` in the level file).
 */

import { View } from "react-native";
import { useEffect } from "react";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";

import { TypedTermText } from "@/components/lesson/TypedText";
import { playSfx, stopSfx } from "@/services/sfx";
import { createStyles, fontFaces, fontSizes, useTheme } from "@/theme";

import type { SignTile } from "./platformer-core";
import { SignIconView } from "./SignIcon";
import { WORLD_FX, bubbleFrame } from "./world-fx-core";


const EDGE = 10;

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    card: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 20, borderWidth: 2, borderBottomWidth: 5, borderColor: c.border, borderBottomColor: c.borderStrong, backgroundColor: c.surface },
    icon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.primarySurface },
    copy: { flex: 1, gap: 1 },
    text: { ...fontFaces.bold, fontSize: fontSizes.md, lineHeight: 21, color: c.text },
  };
});

export function SignBubble({ sign, open, tile, viewW, frame }: { sign: SignTile; open: boolean; tile: number; viewW: number; frame: SharedValue<number[]> }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const width = Math.round(Math.max(200, Math.min(tile * 5.6, 280, viewW - EDGE * 2)));
  const centre = (sign.c + 0.5) * tile;
  const isOpen = useSharedValue(open ? 1 : 0);
  const clock = useSharedValue(0);
  useEffect(() => {
    isOpen.set(open ? 1 : 0);
    cancelAnimation(clock);
    clock.set(0);
    clock.set(withTiming(open ? WORLD_FX.bubbleIn : WORLD_FX.bubbleOut, { duration: open ? WORLD_FX.bubbleIn : WORLD_FX.bubbleOut, easing: Easing.linear }));
    return () => cancelAnimation(clock);
  }, [open, isOpen, clock]);

  // A sign's speech bubble pops open: the same soft pop as the lessons' bubbles
  useEffect(() => {
    if (open) void playSfx("lesson.bubble");
  }, [open]);

  // The talking blips end with the bubble: closed, or gone, any that is still sounding is cut off
  useEffect(() => {
    if (!open) stopSfx("lesson.blip");
    return () => stopSfx("lesson.blip");
  }, [open]);

  // Left edge in the world: centred on the sign, but inside the view
  const place = useAnimatedStyle(() => {
    const cam = frame.value[0] ?? 0;
    const left = Math.min(Math.max(centre - width / 2, cam + EDGE), cam + viewW - width - EDGE);
    return { left };
  });
  const bubble = useAnimatedStyle(() => {
    const cam = frame.value[0] ?? 0;
    const left = Math.min(Math.max(centre - width / 2, cam + EDGE), cam + viewW - width - EDGE);
    const f = bubbleFrame(isOpen.get() === 1, clock.get());
    // It grows out of the point over the sign
    const originX = Math.min(width - 28, Math.max(28, centre - left));
    return { opacity: f.opacity, transform: [{ translateY: -f.lift }, { scale: f.scale }], transformOrigin: `${originX}px 100%` };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: sign.r * tile - 12, width, height: 0 }, place]}>
      <Animated.View style={[{ position: "absolute", left: 0, right: 0, bottom: 0 }, bubble]}>
        <View style={styles.card}>
          <View style={styles.icon}>
            <SignIconView icon={sign.icon} size={34} />
          </View>
          <View style={styles.copy}>
            <TypedTermText text={sign.text} style={styles.text} typing={open} blips />
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
