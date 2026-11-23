/**
 * The picture in a sign's speech bubble (`SignIcon` in platformer-core.ts): the thing the sign is about, so a
 * sign about the arrow buttons shows the arrow buttons, one about springs shows a spring, one about a lesson
 * shows a book. The sign on the map stays the signpost tile (`PROP_SPRITES.sign`). Built from the game's own
 * sprites (and the touch controls' pads), drawn standing on the bottom edge of a `size` square and centred on
 * it; some pictures are wider than the square and spill over its sides.
 */

import { Image, View, type ImageSourcePropType } from "react-native";

import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/theme";

import type { SignIcon } from "./platformer-core";
import { CONTROL_SPRITES, EMOTE_ASPECT, EMOTE_SPRITES, ENEMY_SPRITES, LAVA_SPRITES, PROP_SPRITES, TERRAIN, WATER_SPRITES } from "./sprites";

/** One image placed in the square: its size and left edge are shares of the square's side, `up` lifts it off the bottom. */
interface Part {
  source: ImageSourcePropType;
  w: number;
  h: number;
  x: number;
  up?: number;
  flip?: boolean;
  rotate?: number;
}

const single = (source: ImageSourcePropType, w = 0.9, h = w): Part[] => [{ source, w, h, x: (1 - w) / 2 }];
const pad = (face: ImageSourcePropType, glyph: ImageSourcePropType, x: number, flip: boolean): Part[] => [
  { source: face, w: 0.55, h: 0.55, x },
  { source: glyph, w: 0.26, h: 0.26, x: x + 0.145, up: 0.145, flip },
];
const cloud = TERRAIN.grass.cloud;
const platform = (up: number): Part[] => [
  { source: cloud.left, w: 0.34, h: 0.34, x: 0.16, up },
  { source: cloud.middle, w: 0.34, h: 0.34, x: 0.33, up },
  { source: cloud.right, w: 0.34, h: 0.34, x: 0.5, up },
];

/** What each icon is made of. */
export const SIGN_PARTS: Readonly<Record<Exclude<SignIcon, "lesson" | "tip">, Part[]>> = {
  sign: single(PROP_SPRITES.sign, 1),
  move: [...pad(CONTROL_SPRITES.padLeft, CONTROL_SPRITES.arrow, -0.05, true), ...pad(CONTROL_SPRITES.padRight, CONTROL_SPRITES.arrow, 0.5, false)],
  jump: [{ source: CONTROL_SPRITES.padCircle, w: 0.8, h: 0.8, x: 0.1 }, { source: CONTROL_SPRITES.jump, w: 0.4, h: 0.4, x: 0.3, up: 0.2 }],
  coin: single(PROP_SPRITES.coin, 0.8),
  gem: single(PROP_SPRITES.gemBlue, 0.85),
  enemy: single(ENEMY_SPRITES.slime[0], 0.9),
  boss: single(ENEMY_SPRITES.boss[0], 1),
  checkpoint: single(PROP_SPRITES.flagA, 1),
  door: [{ source: PROP_SPRITES.doorClosedTop, w: 0.6, h: 0.6, x: 0.2, up: 0.6 }, { source: PROP_SPRITES.doorClosed, w: 0.6, h: 0.6, x: 0.2 }],
  spring: single(PROP_SPRITES.spring, 0.9),
  plank: single(PROP_SPRITES.plank, 1),
  bridge: single(PROP_SPRITES.bridge, 1),
  belt: single(PROP_SPRITES.conveyor, 0.85),
  saw: single(PROP_SPRITES.saw, 0.9),
  lava: single(LAVA_SPRITES.lava_top, 0.85),
  water: single(WATER_SPRITES.water_top, 0.85),
  key: single(PROP_SPRITES.key, 0.85),
  lock: single(PROP_SPRITES.lock, 0.85),
  block: single(PROP_SPRITES.blockCoin, 0.85),
  heart: single(PROP_SPRITES.blockHeart, 0.85),
  brick: single(PROP_SPRITES.brick, 0.85),
  spikes: single(PROP_SPRITES.spikes, 0.9),
  beam: single(PROP_SPRITES.beamEmitter, 0.9),
  dose: single(PROP_SPRITES.beamEmitter, 0.9),
  lead: single(PROP_SPRITES.lead, 0.85),
  platform: platform(0),
  lift: [...platform(0), { source: CONTROL_SPRITES.arrow, w: 0.34, h: 0.34, x: 0.33, up: 0.5, rotate: -90 }],
};

export function SignIconView({ icon, size }: { icon: SignIcon; size: number }) {
  const { theme } = useTheme();
  const c = theme.colors;
  if (icon === "lesson") {
    const d = Math.round(size * 0.8);
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "flex-end" }}>
        <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
          <Icon name="Book1" size={Math.round(d * 0.58)} color={c.onPrimary} variant="Bold" />
        </View>
      </View>
    );
  }
  if (icon === "tip") {
    const h = Math.round(size * 0.95);
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "flex-end" }}>
        <Image source={EMOTE_SPRITES.idea} style={{ width: Math.round(h * EMOTE_ASPECT), height: h }} resizeMode="contain" fadeDuration={0} />
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size }}>
      {SIGN_PARTS[icon].map((p, i) => (
        <Image
          key={i}
          source={p.source}
          resizeMode="contain"
          fadeDuration={0}
          style={{ position: "absolute", left: p.x * size, bottom: (p.up ?? 0) * size, width: p.w * size, height: p.h * size, transform: [...(p.rotate ? [{ rotate: `${p.rotate}deg` }] : []), ...(p.flip ? [{ scaleX: -1 }] : [])] }}
        />
      ))}
    </View>
  );
}
