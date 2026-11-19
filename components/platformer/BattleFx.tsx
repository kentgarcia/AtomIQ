/**
 * The effects of one answer in a battle (timeline in `battle-fx-core.ts`): a ring and stars burst out
 * of the point of contact, short impact lines fly out of it, and on a hurt a heart breaks off the
 * hero. A right answer is yellow (a hit), a wrong one red. It sits in the zoomed layer, positioned in
 * the screen pixels the world was drawn at, so it zooms with the picture. `clock` is the answer's
 * clock in ms; everything hangs off `FX.contact`.
 */

import { Image, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, type SharedValue } from "react-native-reanimated";

import { Burst } from "@/components/motion/Burst";
import { useTheme } from "@/theme";

import { FX, IMPACT_LINES, impactLine, lostHeart, type FxKind } from "./battle-fx-core";
import { PROP_SPRITES } from "./sprites";

const LINE_W = 16;
const LINE_H = 4;

function ImpactLine({ i, clock, color, reach }: { i: number; clock: SharedValue<number>; color: string; reach: number }) {
  const anim = useAnimatedStyle(() => {
    const f = impactLine(i, clock.get(), reach);
    return { opacity: f.opacity, transform: [{ rotate: `${f.angle}deg` }, { translateX: f.dist }, { scaleX: f.length / LINE_W }] };
  });
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: -LINE_W / 2, top: -LINE_H / 2, width: LINE_W, height: LINE_H, borderRadius: LINE_H / 2, backgroundColor: color, opacity: 0 }, anim]} />;
}

function BrokenHeart({ clock, size }: { clock: SharedValue<number>; size: number }) {
  const anim = useAnimatedStyle(() => {
    const f = lostHeart(clock.get());
    return { opacity: f.opacity, transform: [{ translateY: f.y }, { rotate: `${f.rotate}deg` }, { scale: f.scale }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: -size / 2, top: -size / 2, opacity: 0 }, anim]}>
      <Image source={PROP_SPRITES.heart} style={{ width: size, height: size }} fadeDuration={0} />
    </Animated.View>
  );
}

export interface BattleFxProps {
  kind: FxKind;
  clock: SharedValue<number>;
  /** The point of contact (the middle of whoever is hit), px in the unzoomed screen. */
  hit: { x: number; y: number };
  /** Just above the hero's head, where the broken heart starts, px. */
  head: { x: number; y: number };
  /** The blow beats the enemy: a bigger burst. */
  lethal: boolean;
  /** One tile in px: the effects are sized from it. */
  tile: number;
}

export function BattleFx({ kind, clock, hit, head, lethal, tile }: BattleFxProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const reduced = useReducedMotion();
  if (reduced) return null;
  const color = kind === "attack" ? c.warning : c.error;
  const ring = kind === "attack" ? c.primary : c.error;
  const diameter = Math.round(tile * (lethal ? 1.5 : 1.1));
  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
      <View style={{ position: "absolute", left: hit.x, top: hit.y, width: 0, height: 0 }}>
        {Array.from({ length: IMPACT_LINES }, (_, i) => (
          <ImpactLine key={i} i={i} clock={clock} color={color} reach={tile * 0.95} />
        ))}
      </View>
      <View style={{ position: "absolute", left: hit.x - diameter / 2, top: hit.y - diameter / 2, width: diameter, height: diameter }}>
        <Burst clock={clock} at={FX.contact} diameter={diameter} color={color} ringColor={ring} reach={tile * (lethal ? 1.5 : 1.0)} count={lethal ? 10 : 6} />
      </View>
      {kind === "hurt" ? (
        <View style={{ position: "absolute", left: head.x, top: head.y, width: 0, height: 0 }}>
          <BrokenHeart clock={clock} size={Math.round(tile * 0.7)} />
        </View>
      ) : null}
    </View>
  );
}
