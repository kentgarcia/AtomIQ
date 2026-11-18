/**
 * The learner's avatar, as pure data.
 *
 * The avatar is drawn with the teachers' art (`components/npc/npc-art.ts`): the same Duolingo-style
 * shapes, the same rig, the same palette. What is stored is not a picture and not a set of colours but
 * an `AvatarConfig`: one id per choice (skin, hair, eyes, outfit...). `avatarSpec` resolves those ids,
 * through the catalogs below, into the `NpcSpec` the teachers use, so the drawing code never learns that
 * an avatar is different.
 *
 * Customising later is therefore three things and no new drawing code:
 *   1. a screen that lets the learner pick an id from each catalog (`AVATAR_OPTIONS` lists them),
 *   2. `updateUserProfile({ avatar_url: serializeAvatar(config) })` to save it,
 *   3. new catalog rows for anything unlocked later (a hat, a new hair colour).
 * For now there is one fixed design, `DEFAULT_AVATAR`, and nothing in the app lets it change.
 *
 * Storage: the existing `user_profile.avatar_url` text column holds `serializeAvatar(config)`, i.e.
 * `avatar:v1:{...ids}`. Anything else in that column (the old photo file names, an empty string) reads as
 * the default design. Unknown or missing ids fall back to the default for that one choice, so an older
 * app can read a newer value and a newer app can read an older one.
 *
 * The picture behind the figure is a paint (a solid colour, `background`) with an optional `pattern` over
 * it: tiles baked into masks (`scripts/bake-pattern-masks.mjs`), tinted white and drawn at 50%
 * (`PatternLayer.tsx`), so the shapes are a lighter tone of the paint and the paint still sets the colour.
 *
 * Colours are fixed (theme exception EX-12, like the teachers): the same in light and dark mode. They are
 * taken from `npc-palette.ts` by name, so this file has no colour literals. No imports beyond types and
 * the palette, so Node tests can read it.
 */

import type { EyeStyle, HairStyle, NpcSpec, OutfitKind } from "../npc/npc-art.ts";
import { CUSTOM, OFFICIAL as O } from "../npc/npc-palette.ts";

const trio = (t: readonly string[]) => ({ base: t[0], shade: t[1], feature: t[2] });

// ── catalogs: one id to a few colours or a shape name ────────────────────────

export const SKIN_TONES = {
  light: trio(CUSTOM.skinGuideLight),
  warm: trio(CUSTOM.skinGuideWarm),
  pink: trio(CUSTOM.skinPink),
  olive: trio(CUSTOM.skinOlive),
  tan: trio(CUSTOM.skinTan),
  brown: trio(CUSTOM.skinBrown),
  deep: trio(CUSTOM.skinDeep),
} as const;

export const HAIR_COLORS = {
  brown: { color: CUSTOM.hairBrown[0], shade: CUSTOM.hairBrown[1] },
  dark: { color: CUSTOM.hairDark[0], shade: CUSTOM.hairDark[1] },
  black: { color: CUSTOM.hairBlack[0], shade: CUSTOM.hairBlack[1] },
  white: { color: CUSTOM.hairWhite[0], shade: CUSTOM.hairWhite[1] },
  pink: { color: O.flamingo, shade: O.pig },
  blue: { color: O.blueJay, shade: O.macaw },
} as const;

/** Outfit colours: the clothes and the one-step-darker shade. */
export const OUTFIT_COLORS = {
  green: { color: O.maskGreen, shade: O.treeFrog },
  blue: { color: O.macaw, shade: O.whale },
  purple: { color: O.beetle, shade: O.betta },
  orange: { color: O.fox, shade: O.guineaPig },
  yellow: { color: O.bee, shade: O.camel },
  pink: { color: O.starfish, shade: O.beetle },
  red: { color: O.crab, shade: O.cardinal },
  teal: { color: O.featherGreen, shade: O.treeFrog },
} as const;

/** The paints for the picture behind the head: light and fixed, so the figure reads on any page. `sky` is the one everyone starts with. */
export const BACKGROUNDS = {
  sky: O.iguana,
  mint: O.seaSponge,
  sun: O.canary,
  blush: O.walkingFish,
  ice: O.beluga,
  peach: O.cheetah,
  rose: O.flamingo,
  lime: O.turtle,
  butter: O.duck,
  bubblegum: O.starfish,
  aqua: O.moonJelly,
  azure: O.blueJay,
  stone: O.anchovy,
} as const;

/** How many pattern tiles there are (assets/images/pattern, `pattern_000.png` and up; baked into assets/images/pattern-mask). Their ids are `p000`, `p001`... */
export const PATTERN_COUNT = 84;
export const PATTERN_IDS: readonly string[] = Array.from({ length: PATTERN_COUNT }, (_, i) => `p${String(i).padStart(3, "0")}`);

export type SkinId = keyof typeof SKIN_TONES;
export type HairColorId = keyof typeof HAIR_COLORS;
export type OutfitColorId = keyof typeof OUTFIT_COLORS;
export type BackgroundId = keyof typeof BACKGROUNDS;
/** A pattern tile id, or `none` for a plain paint. */
export type PatternId = "none" | `p${number}`;
export type HeadId = "tombstone" | "capsule";
export type NoseId = "single" | "double";
export type FacialHairId = "none" | "moustache" | "beard";

/** Every choice an avatar has. Only ids: the colours and shapes live in the catalogs. */
export interface AvatarConfig {
  skin: SkinId;
  head: HeadId;
  eyes: EyeStyle;
  nose: NoseId;
  hairStyle: HairStyle;
  hairColor: HairColorId;
  facialHair: FacialHairId;
  outfit: OutfitKind;
  outfitColor: OutfitColorId;
  /** The paint behind the figure (a solid colour). */
  background: BackgroundId;
  /** A faint pattern drawn over the paint. */
  pattern: PatternId;
}

/** The ids a picker can offer for each choice, in the order to show them. */
export const AVATAR_OPTIONS: { [K in keyof AvatarConfig]: readonly AvatarConfig[K][] } = {
  skin: Object.keys(SKIN_TONES) as SkinId[],
  head: ["tombstone", "capsule"],
  eyes: ["pill", "round", "dots", "glasses-round", "glasses-square"],
  nose: ["single", "double"],
  hairStyle: ["crop", "curls", "bun", "bob", "wrap"],
  hairColor: Object.keys(HAIR_COLORS) as HairColorId[],
  facialHair: ["none", "moustache", "beard"],
  outfit: ["hoodie", "sweater", "coat", "vest", "shirt"],
  outfitColor: Object.keys(OUTFIT_COLORS) as OutfitColorId[],
  background: Object.keys(BACKGROUNDS) as BackgroundId[],
  pattern: ["none", ...PATTERN_IDS] as PatternId[],
};

/** The one design every learner has for now. */
export const DEFAULT_AVATAR: AvatarConfig = {
  skin: "warm",
  head: "tombstone",
  eyes: "pill",
  nose: "double",
  hairStyle: "crop",
  hairColor: "brown",
  facialHair: "none",
  outfit: "hoodie",
  outfitColor: "green",
  background: "sky",
  pattern: "none",
};

// ── storage format ───────────────────────────────────────────────────────────

const PREFIX = "avatar:v1:";
const KEYS = Object.keys(DEFAULT_AVATAR) as (keyof AvatarConfig)[];

/** A parsed or stored value to a full config: every choice that is missing or unknown becomes the default. */
export function normalizeAvatar(value?: string | null): AvatarConfig {
  const out: AvatarConfig = { ...DEFAULT_AVATAR };
  if (!value || !value.startsWith(PREFIX)) return out;
  let raw: unknown;
  try {
    raw = JSON.parse(value.slice(PREFIX.length));
  } catch {
    return out;
  }
  if (!raw || typeof raw !== "object") return out;
  const given = raw as Record<string, unknown>;
  for (const key of KEYS) {
    const options = AVATAR_OPTIONS[key] as readonly unknown[];
    if (options.includes(given[key])) (out as unknown as Record<string, unknown>)[key] = given[key];
  }
  return out;
}

/** The text saved in `user_profile.avatar_url`. Keys are always in the same order, so equal avatars give equal text. */
export function serializeAvatar(config: AvatarConfig): string {
  const ordered: Record<string, string> = {};
  for (const key of KEYS) ordered[key] = config[key];
  return `${PREFIX}${JSON.stringify(ordered)}`;
}

/** Any stored value to the canonical text. Used when the profile loads and before it is saved. */
export const normalizeAvatarValue = (value?: string | null): string => serializeAvatar(normalizeAvatar(value));

export const DEFAULT_AVATAR_VALUE = serializeAvatar(DEFAULT_AVATAR);

// ── to the teachers' drawing ─────────────────────────────────────────────────

/** The avatar as the `NpcSpec` the teachers' renderer draws. */
export function avatarSpec(config: AvatarConfig): NpcSpec {
  const clothes = OUTFIT_COLORS[config.outfitColor];
  const hair = HAIR_COLORS[config.hairColor];
  return {
    skin: { ...SKIN_TONES[config.skin] },
    head: config.head,
    headWidth: 100,
    eyes: config.eyes,
    nose: config.nose,
    hair: { style: config.hairStyle, color: hair.color, shade: hair.shade },
    ...(config.facialHair === "none" ? {} : { facialHair: config.facialHair }),
    // A vest hangs over a shirt, so its sleeves are the shirt's colour: never white, which would vanish on a light page.
    outfit: { kind: config.outfit, color: clothes.color, shade: clothes.shade, collar: config.outfit === "vest" ? O.blueJay : O.snow },
    // No held or worn prop: the avatar is a person, not a teacher of a field.
    accent: { kind: "none", color: O.swan, shade: O.hare },
  };
}

export const avatarBackground = (config: AvatarConfig): string => BACKGROUNDS[config.background];
