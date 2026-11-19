/**
 * The touch controls: left and right on the left, jump on the right. Each button is its own gesture,
 * so a thumb on each side works together (the lesson-style Pressable cannot do two touches at once).
 * A button is "down" from the first touch until the finger lifts, wherever the finger has moved to.
 * The pictures are Kenney's Mobile Controls (CC0; sources in `assets/images/controls/vector`, baked 4x into `assets/images/controls`): a dark pad, a glowing outline over it while pressed.
 */

import { useCallback, useEffect, useState } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import type { Input } from "./platformer-core";
import { CONTROL_SPRITES } from "./sprites";

const SIZE = { side: 84, jump: 104 } as const;

const styles = StyleSheet.create({
  deck: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 },
  cluster: { flexDirection: "row", gap: 14 },
  center: { alignItems: "center", justifyContent: "center" },
  layer: { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" },
});

type Key = keyof Input;
type Look = { face: number; lit: number; glyph: number; flip?: boolean };

const LOOKS: Record<Key, Look> = {
  left: { face: CONTROL_SPRITES.padLeft, lit: CONTROL_SPRITES.padLeftLit, glyph: CONTROL_SPRITES.arrow, flip: true },
  right: { face: CONTROL_SPRITES.padRight, lit: CONTROL_SPRITES.padRightLit, glyph: CONTROL_SPRITES.arrow },
  jump: { face: CONTROL_SPRITES.padCircle, lit: CONTROL_SPRITES.padCircleLit, glyph: CONTROL_SPRITES.jump },
};

function PadButton({ name, label, big, onChange }: { name: Key; label: string; big?: boolean; onChange: (key: Key, down: boolean) => void }) {
  const [down, setDown] = useState(false);
  const set = useCallback(
    (value: boolean) => {
      setDown(value);
      onChange(name, value);
    },
    [name, onChange],
  );
  const gesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .onBegin(() => set(true))
    .onFinalize(() => set(false));
  const size = big ? SIZE.jump : SIZE.side;
  const look = LOOKS[name];
  const glyph = Math.round(size * (big ? 0.5 : 0.42));
  return (
    <GestureDetector gesture={gesture}>
      <View accessible accessibilityRole="button" accessibilityLabel={label} style={[styles.center, { width: size, height: size, transform: [{ translateY: down ? 3 : 0 }, { scale: down ? 0.96 : 1 }] }]}>
        <Image source={look.face} style={styles.layer} fadeDuration={0} resizeMode="contain" />
        {down ? <Image source={look.lit} style={styles.layer} fadeDuration={0} resizeMode="contain" /> : null}
        <Image source={look.glyph} style={{ width: glyph, height: glyph, opacity: down ? 1 : 0.85, transform: look.flip ? [{ scaleX: -1 }] : undefined }} fadeDuration={0} resizeMode="contain" />
      </View>
    </GestureDetector>
  );
}

export function Controls({ onChange }: { onChange: (key: Key, down: boolean) => void }) {
  // On the web the keyboard plays too (arrows or A and D, and space, W or the up arrow to jump)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const map: Record<string, Key> = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", ArrowUp: "jump", w: "jump", W: "jump", " ": "jump" };
    const handle = (down: boolean) => (e: KeyboardEvent) => {
      const key = map[e.key];
      if (!key) return;
      e.preventDefault();
      onChange(key, down);
    };
    const onDown = handle(true);
    const onUp = handle(false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [onChange]);

  return (
    <View style={styles.deck}>
      <View style={styles.cluster}>
        <PadButton name="left" label="Move left" onChange={onChange} />
        <PadButton name="right" label="Move right" onChange={onChange} />
      </View>
      <PadButton name="jump" label="Jump" big onChange={onChange} />
    </View>
  );
}
