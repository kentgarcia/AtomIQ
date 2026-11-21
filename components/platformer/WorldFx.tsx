/**
 * The one-shot effects of the level, drawn in the world's own coordinates (timelines in
 * `world-fx-core.ts`): a coin or a heart springing out of a block, a brick breaking into four
 * pieces, a coin picked up, bursts of stars where a lock opens, a checkpoint is reached and the goal
 * flag opens or is touched. The screen adds an effect when the core reports the event; each one runs on
 * its own linear clock and asks to be removed (`onDone`) when it ends. With reduced motion none is
 * drawn (they are removed at once).
 */

import { useEffect } from "react";
import { Image, View, type ImageSourcePropType } from "react-native";
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { Burst } from "@/components/motion/Burst";
import { BURST } from "@/components/motion/burst-core";
import { useTheme } from "@/theme";

import { PROP_SPRITES, gemSprite } from "./sprites";
import { WORLD_FX, brickPiece, coinGet, coinPop, heartPop } from "./world-fx-core";

export type WorldEffectKind = "coin" | "gem" | "heart" | "brick" | "coinGet" | "gemGet" | "lock" | "checkpoint" | "flag" | "goal";

export interface WorldEffect {
  id: number;
  kind: WorldEffectKind;
  /** Tile (or, for a picked-up coin, the centre in tiles). */
  c: number;
  r: number;
  /** Which gem colour a gem effect shows (the gem's index). */
  variant?: number;
}

const DURATION: Readonly<Record<WorldEffectKind, number>> = {
  coin: WORLD_FX.coin,
  gem: WORLD_FX.coin,
  gemGet: WORLD_FX.coinGet,
  heart: WORLD_FX.heart,
  brick: WORLD_FX.brick,
  coinGet: WORLD_FX.coinGet,
  lock: BURST.total,
  checkpoint: BURST.total,
  flag: BURST.total,
  goal: BURST.total + 200,
};

function CoinPop({ clock, tile, c, r, source = PROP_SPRITES.coin }: { clock: SharedValue<number>; tile: number; c: number; r: number; source?: ImageSourcePropType }) {
  const size = tile * 0.8;
  const anim = useAnimatedStyle(() => {
    const f = coinPop(clock.get());
    return { opacity: f.opacity, transform: [{ translateY: f.dy * tile }, { scaleX: f.sx }] };
  });
  return <Animated.Image source={source} style={[{ position: "absolute", left: c * tile + (tile - size) / 2, top: r * tile, width: size, height: size, opacity: 0 }, anim]} fadeDuration={0} />;
}

function HeartPop({ clock, tile, c, r }: { clock: SharedValue<number>; tile: number; c: number; r: number }) {
  const size = tile * 0.85;
  const anim = useAnimatedStyle(() => {
    const f = heartPop(clock.get());
    return { opacity: f.opacity, transform: [{ translateY: f.dy * tile }, { rotate: `${f.rotate}deg` }, { scale: f.scale }] };
  });
  return <Animated.Image source={PROP_SPRITES.heart} style={[{ position: "absolute", left: c * tile + (tile - size) / 2, top: r * tile, width: size, height: size, opacity: 0 }, anim]} fadeDuration={0} />;
}

/** One quarter of the brick's picture, flying off. */
function BrickPiece({ clock, tile, c, r, i }: { clock: SharedValue<number>; tile: number; c: number; r: number; i: number }) {
  const half = tile / 2;
  const anim = useAnimatedStyle(() => {
    const f = brickPiece(i, clock.get());
    return { opacity: f.opacity, transform: [{ translateX: f.x * tile }, { translateY: f.y * tile }, { rotate: `${f.rotate}deg` }] };
  });
  return (
    <Animated.View style={[{ position: "absolute", left: c * tile + (i % 2) * half, top: r * tile + Math.floor(i / 2) * half, width: half, height: half, overflow: "hidden", opacity: 0 }, anim]}>
      <Image source={PROP_SPRITES.brick} style={{ position: "absolute", left: -(i % 2) * half, top: -Math.floor(i / 2) * half, width: tile, height: tile }} fadeDuration={0} />
    </Animated.View>
  );
}

function CoinGet({ clock, tile, c, r, source = PROP_SPRITES.coin }: { clock: SharedValue<number>; tile: number; c: number; r: number; source?: ImageSourcePropType }) {
  const size = tile * 0.8;
  const anim = useAnimatedStyle(() => {
    const f = coinGet(clock.get());
    return { opacity: f.opacity, transform: [{ translateY: f.dy * tile }, { scale: f.scale }] };
  });
  return <Animated.Image source={source} style={[{ position: "absolute", left: c * tile - size / 2, top: r * tile - size / 2, width: size, height: size, opacity: 0 }, anim]} fadeDuration={0} />;
}

/** Stars and a ring centred on a point of the world. */
function BurstAt({ clock, x, y, diameter, reach, count, tone }: { clock: SharedValue<number>; x: number; y: number; diameter: number; reach: number; count: number; tone: "warning" | "success" | "primary" }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const color = tone === "warning" ? c.warning : tone === "success" ? c.success : c.primary;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x - diameter / 2, top: y - diameter / 2, width: diameter, height: diameter }}>
      <Burst clock={clock} at={0} diameter={diameter} color={color} ringColor={c.primary} reach={reach} count={count} />
    </View>
  );
}

function EffectView({ effect, tile, onDone }: { effect: WorldEffect; tile: number; onDone: (id: number) => void }) {
  const reduced = useReducedMotion();
  const clock = useSharedValue(0);
  const total = DURATION[effect.kind];
  useEffect(() => {
    if (reduced) {
      onDone(effect.id);
      return;
    }
    clock.set(withTiming(total, { duration: total, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(onDone)(effect.id);
    }));
    return () => cancelAnimation(clock);
  }, [clock, effect.id, onDone, reduced, total]);
  if (reduced) return null;
  const { c, r, kind } = effect;
  switch (kind) {
    case "coin":
      return <CoinPop clock={clock} tile={tile} c={c} r={r} />;
    case "gem":
      return (
        <>
          <CoinPop clock={clock} tile={tile} c={c} r={r} source={gemSprite(effect.variant ?? 0)} />
          <BurstAt clock={clock} x={(c + 0.5) * tile} y={(r - 0.6) * tile} diameter={tile} reach={tile * 1.1} count={6} tone="primary" />
        </>
      );
    case "gemGet":
      return (
        <>
          <CoinGet clock={clock} tile={tile} c={c} r={r} source={gemSprite(effect.variant ?? 0)} />
          <BurstAt clock={clock} x={c * tile} y={r * tile} diameter={tile * 0.9} reach={tile * 1} count={6} tone="primary" />
        </>
      );
    case "heart":
      return (
        <>
          <HeartPop clock={clock} tile={tile} c={c} r={r} />
          <BurstAt clock={clock} x={(c + 0.5) * tile} y={(r - 0.6) * tile} diameter={tile} reach={tile * 1.1} count={6} tone="success" />
        </>
      );
    case "brick":
      return (
        <>
          {[0, 1, 2, 3].map((i) => (
            <BrickPiece key={i} clock={clock} tile={tile} c={c} r={r} i={i} />
          ))}
        </>
      );
    case "coinGet":
      return <CoinGet clock={clock} tile={tile} c={c} r={r} />;
    case "lock":
      return <BurstAt clock={clock} x={(c + 0.5) * tile} y={(r + 0.5) * tile} diameter={tile * 1.2} reach={tile * 1.6} count={8} tone="warning" />;
    case "checkpoint":
      return <BurstAt clock={clock} x={(c + 0.5) * tile} y={(r + 0.4) * tile} diameter={tile * 1.1} reach={tile * 1.3} count={7} tone="success" />;
    case "flag":
      return <BurstAt clock={clock} x={(c + 0.5) * tile} y={(r + 0.5) * tile} diameter={tile * 1.6} reach={tile * 2.1} count={10} tone="warning" />;
    case "goal":
      return <BurstAt clock={clock} x={(c + 0.5) * tile} y={(r + 0.5) * tile} diameter={tile * 2} reach={tile * 2.6} count={12} tone="warning" />;
  }
}

export function WorldFx({ effects, tile, onDone }: { effects: readonly WorldEffect[]; tile: number; onDone: (id: number) => void }) {
  return (
    <>
      {effects.map((e) => (
        <EffectView key={e.id} effect={e} tile={tile} onDone={onDone} />
      ))}
    </>
  );
}
