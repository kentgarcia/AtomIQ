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
 * For now there are two starting designs (`STARTER_AVATARS`: `DEFAULT_AVATAR` and a version with her hair in a bun), chosen
 * once on onboarding's profile step; nothing else in the app lets the design change yet.
 *
 * Storage: the existing `user_profile.avatar_url` text column holds `serializeAvatar(config)`, i.e.
 * `avatar:v1:{...ids}`. Anything else in that column (the old photo file names, an empty string) reads as
 * the default design. Unknown or missing ids fall back to the default for that one choice, so an older
 * app can read a newer value and a newer app can read an older one.
 *
 * The picture behind the figure is a paint (a solid colour, `background`) with an optional `pattern` over
 * it: a wallpaper of small flat pictures (`pattern-art.ts`), drawn white at 50% (`PatternLayer.tsx`), so the
 * shapes are a lighter tone of the paint and the paint still sets the colour.
 *
 * Colours are fixed (theme exception EX-12, like the teachers): the same in light and dark mode. They are
 * taken from `npc-palette.ts` by name, so this file has no colour literals. No imports beyond types and
 * the palette, so Node tests can read it.
 */

import { BROW_STYLES, EAR_STYLES, MOUTH_STYLES, NOSE_STYLES, type BrowStyle, type EarStyle, type MouthStyle, type NoseStyle } from "../npc/face-art.ts";
import { EXTRA_OUTFITS } from "../npc/outfit-art.ts";
import { EARWEAR_STYLES, EYEWEAR_STYLES, HEADWEAR_STYLES, type EarwearStyle, type EyewearStyle, type HeadwearStyle } from "../npc/wear-art.ts";
import type { EyeStyle, HairStyle, NpcSpec, OutfitKind } from "../npc/npc-art.ts";
import { CUSTOM, FACE, OFFICIAL as O } from "../npc/npc-palette.ts";
import { PATTERN_COUNT, PATTERN_IDS } from "./pattern-art.ts";

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
  // Colourful skin, free in the shop: a face, a shade a step darker, and the feature colour (nose, cheeks, lips)
  blue: trio([O.blueJay, O.macaw, O.whale]),
  aqua: trio(CUSTOM.skinAqua),
  green: trio([O.turtle, O.maskGreen, O.treeFrog]),
  yellow: trio([O.duck, O.bee, O.camel]),
  orange: trio([O.lion, O.fox, O.guineaPig]),
  red: trio([O.crab, O.cardinal, O.fireAnt]),
  bubblegum: trio(CUSTOM.skinBubblegum),
  purple: trio([O.beetle, O.betta, O.butterfly]),
} as const;

export const HAIR_COLORS = {
  brown: { color: CUSTOM.hairBrown[0], shade: CUSTOM.hairBrown[1] },
  dark: { color: CUSTOM.hairDark[0], shade: CUSTOM.hairDark[1] },
  black: { color: CUSTOM.hairBlack[0], shade: CUSTOM.hairBlack[1] },
  white: { color: CUSTOM.hairWhite[0], shade: CUSTOM.hairWhite[1] },
  pink: { color: O.flamingo, shade: O.pig },
  blue: { color: O.blueJay, shade: O.macaw },
  // Colourful and natural hair for the shop
  blonde: { color: CUSTOM.hairBlonde[0], shade: CUSTOM.hairBlonde[1] },
  ginger: { color: CUSTOM.hairGinger[0], shade: CUSTOM.hairGinger[1] },
  red: { color: O.cardinal, shade: O.fireAnt },
  green: { color: O.maskGreen, shade: O.treeFrog },
  purple: { color: O.beetle, shade: O.betta },
} as const;

/** Pupil colours; `ink` is the one every face has. */
export const PUPIL_COLORS = {
  ink: { color: FACE.pupil },
  brown: { color: CUSTOM.hairBrown[0] },
  blue: { color: O.humpback },
  green: { color: O.treeFrog },
  amber: { color: O.guineaPig },
  grey: { color: O.wolf },
  purple: { color: O.betta },
  red: { color: O.fireAnt },
} as const;

/** Nose colours besides `natural` (the skin's own feature colour). */
export const NOSE_COLORS = {
  pink: { color: O.pig },
  red: { color: O.crab },
  brown: { color: O.grizzly },
  orange: { color: O.fox },
  plum: { color: O.beetle },
  blue: { color: O.macaw },
  green: { color: O.featherGreen },
  dark: { color: O.eel },
} as const;

/** Outfit colours: the clothes and the one-step-darker shade. */
export const OUTFIT_COLORS = {
  green: { color: O.maskGreen, shade: O.treeFrog },
  blue: { color: O.macaw, shade: O.whale },
  purple: { color: O.beetle, shade: O.betta },
  orange: { color: O.fox, shade: O.guineaPig },
  yellow: { color: O.bee, shade: O.camel },
  pink: { color: O.starfish, shade: CUSTOM.skinBubblegum[1] },
  red: { color: O.crab, shade: O.cardinal },
  teal: { color: O.featherGreen, shade: O.treeFrog },
} as const;

/** Colours for the head, eye and ear accessories: the colour and the one-step-darker shade (`main` and `shade` in `wear-art.ts`). */
export const WEAR_COLORS = {
  red: { color: O.cardinal, shade: O.fireAnt },
  orange: { color: O.fox, shade: O.guineaPig },
  yellow: { color: O.bee, shade: O.camel },
  green: { color: O.maskGreen, shade: O.treeFrog },
  teal: { color: O.featherGreen, shade: O.treeFrog },
  blue: { color: O.macaw, shade: O.whale },
  navy: { color: O.humpback, shade: O.narwhal },
  purple: { color: O.beetle, shade: O.betta },
  pink: { color: O.starfish, shade: CUSTOM.skinBubblegum[1] },
  white: { color: O.snow, shade: O.swan },
  grey: { color: O.hare, shade: O.wolf },
  black: { color: O.eel, shade: FACE.pupil },
} as const;

/**
 * The paints for the picture behind the head: rich Duolingo palette colours paired with their one-step-darker
 * shades, matching the teachers' profile covers (`npc-cover-art.ts`). `sky` is the one everyone starts with.
 */
export const BACKGROUND_COLORS = {
  sky: { color: O.macaw, shade: O.whale },
  sun: { color: O.bee, shade: O.camel },
  bubblegum: { color: O.starfish, shade: CUSTOM.skinBubblegum[1] },
  violet: { color: O.beetle, shade: O.betta },
  mint: { color: O.featherGreen, shade: O.treeFrog },
  amber: { color: O.fox, shade: O.guineaPig },
  azure: { color: O.whale, shade: O.humpback },
  rose: { color: O.crab, shade: O.cardinal },
  blush: { color: O.flamingo, shade: O.crab },
  lime: { color: O.maskGreen, shade: O.featherGreen },
  aqua: { color: O.moonJelly, shade: CUSTOM.skinAqua[1] },
  peach: { color: O.lion, shade: O.fox },
  butter: { color: O.duck, shade: O.bee },
  ice: { color: O.blueJay, shade: O.macaw },
  berry: { color: O.cardinal, shade: O.fireAnt },
  plum: { color: O.betta, shade: O.butterfly },
  indigo: { color: O.humpback, shade: O.narwhal },
} as const;

export const BACKGROUNDS: { readonly [K in keyof typeof BACKGROUND_COLORS]: (typeof BACKGROUND_COLORS)[K]["color"] } = {
  sky: BACKGROUND_COLORS.sky.color,
  sun: BACKGROUND_COLORS.sun.color,
  bubblegum: BACKGROUND_COLORS.bubblegum.color,
  violet: BACKGROUND_COLORS.violet.color,
  mint: BACKGROUND_COLORS.mint.color,
  amber: BACKGROUND_COLORS.amber.color,
  azure: BACKGROUND_COLORS.azure.color,
  rose: BACKGROUND_COLORS.rose.color,
  blush: BACKGROUND_COLORS.blush.color,
  lime: BACKGROUND_COLORS.lime.color,
  aqua: BACKGROUND_COLORS.aqua.color,
  peach: BACKGROUND_COLORS.peach.color,
  butter: BACKGROUND_COLORS.butter.color,
  ice: BACKGROUND_COLORS.ice.color,
  berry: BACKGROUND_COLORS.berry.color,
  plum: BACKGROUND_COLORS.plum.color,
  indigo: BACKGROUND_COLORS.indigo.color,
};

/** The patterns (`PATTERN_DEFS` in `pattern-art.ts`): ids are words, `atomlab`, `polka`... */
export { PATTERN_COUNT, PATTERN_IDS };

export type SkinId = keyof typeof SKIN_TONES;
export type HairColorId = keyof typeof HAIR_COLORS;
export type OutfitColorId = keyof typeof OUTFIT_COLORS;
export type WearColorId = keyof typeof WEAR_COLORS;
/** `natural` follows the hair (brows) or the skin (nose); the rest are fixed. */
export type BrowColorId = "natural" | HairColorId;
export type PupilColorId = keyof typeof PUPIL_COLORS;
export type NoseColorId = "natural" | keyof typeof NOSE_COLORS;
export type BackgroundId = keyof typeof BACKGROUNDS;
/** A pattern id (a word from `PATTERN_IDS`), or `none` for a plain paint. */
export type PatternId = string;
export type HeadId = "tombstone" | "capsule";
export type NoseId = NoseStyle;
export type FacialHairId = "none" | "moustache" | "beard";

/** Every choice an avatar has. Only ids: the colours and shapes live in the catalogs. */
export interface AvatarConfig {
  skin: SkinId;
  head: HeadId;
  eyes: EyeStyle;
  eyebrows: BrowStyle;
  browColor: BrowColorId;
  pupilColor: PupilColorId;
  nose: NoseStyle;
  noseColor: NoseColorId;
  mouth: MouthStyle;
  ears: EarStyle;
  hairStyle: HairStyle;
  hairColor: HairColorId;
  facialHair: FacialHairId;
  outfit: OutfitKind;
  outfitColor: OutfitColorId;
  /** Worn on the head, over the eyes and on the ears (`none` is bare), each with its own colour. */
  headwear: HeadwearStyle;
  headwearColor: WearColorId;
  eyewear: EyewearStyle;
  eyewearColor: WearColorId;
  earwear: EarwearStyle;
  earwearColor: WearColorId;
  /** The paint behind the figure (a solid colour). */
  background: BackgroundId;
  /** A faint pattern drawn over the paint. */
  pattern: PatternId;
}

/** The ids a picker can offer for each choice, in the order to show them. */
export const AVATAR_OPTIONS: { [K in keyof AvatarConfig]: readonly AvatarConfig[K][] } = {
  skin: Object.keys(SKIN_TONES) as SkinId[],
  head: ["tombstone", "capsule"],
  // No glasses: the teachers wear them, an avatar does not
  eyes: ["pill", "round", "dots", "wide", "sparkle", "lashes", "sleepy", "arches", "anime", "power"],
  eyebrows: [...BROW_STYLES],
  browColor: ["natural", ...(Object.keys(HAIR_COLORS) as HairColorId[])],
  pupilColor: Object.keys(PUPIL_COLORS) as PupilColorId[],
  nose: [...NOSE_STYLES],
  noseColor: ["natural", ...(Object.keys(NOSE_COLORS) as (keyof typeof NOSE_COLORS)[])],
  mouth: [...MOUTH_STYLES],
  ears: [...EAR_STYLES],
  hairStyle: ["crop", "buzzcut", "classic", "messy", "sidepart", "curtain", "bowl", "spiky", "wavy", "undercut", "longer", "longstraight", "shortbob", "medium", "highpony", "lowpony", "twintails", "bigbun", "halfup", "longwavy", "curtainbangs", "curls", "bun", "fluffy", "cloud", "flattop", "crownbun", "knotwrap", "workcrop", "layeredbob", "trainer", "shinobi", "pirate", "saiyan", "odango"],
  hairColor: Object.keys(HAIR_COLORS) as HairColorId[],
  facialHair: ["none", "moustache", "beard"],
  outfit: ["hoodie", "sweater", "coat", "vest", "shirt", ...EXTRA_OUTFITS],
  outfitColor: Object.keys(OUTFIT_COLORS) as OutfitColorId[],
  headwear: [...HEADWEAR_STYLES],
  headwearColor: Object.keys(WEAR_COLORS) as WearColorId[],
  eyewear: [...EYEWEAR_STYLES],
  eyewearColor: Object.keys(WEAR_COLORS) as WearColorId[],
  earwear: [...EARWEAR_STYLES],
  earwearColor: Object.keys(WEAR_COLORS) as WearColorId[],
  background: Object.keys(BACKGROUNDS) as BackgroundId[],
  pattern: ["none", ...PATTERN_IDS] as PatternId[],
};

/** The one design every learner has for now. */
export const DEFAULT_AVATAR: AvatarConfig = {
  skin: "warm",
  head: "tombstone",
  eyes: "pill",
  eyebrows: "none",
  browColor: "natural",
  pupilColor: "ink",
  nose: "double",
  noseColor: "natural",
  mouth: "smile",
  ears: "round",
  hairStyle: "crop",
  hairColor: "brown",
  facialHair: "none",
  outfit: "hoodie",
  outfitColor: "green",
  headwear: "none",
  headwearColor: "red",
  eyewear: "none",
  eyewearColor: "black",
  earwear: "none",
  earwearColor: "yellow",
  background: "sky",
  pattern: "none",
};

/** The second starting design: hair in a bun, eyelash eyes, a single nose, a pink sweater on a blush paint. */
export const BUN_AVATAR: AvatarConfig = {
  ...DEFAULT_AVATAR,
  eyes: "lashes",
  nose: "single",
  hairStyle: "bun",
  hairColor: "dark",
  outfit: "sweater",
  outfitColor: "pink",
  background: "blush",
};

/** The two designs the learner picks from when they make their profile. `label` is what a screen reader says. */
export const STARTER_AVATARS = [
  { id: "classic", label: "Avatar with short hair", config: DEFAULT_AVATAR },
  { id: "bun", label: "Avatar with hair in a bun", config: BUN_AVATAR },
] as const;
export type StarterId = (typeof STARTER_AVATARS)[number]["id"];

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
    brows: config.eyebrows,
    ...(config.browColor === "natural" ? {} : { browColor: HAIR_COLORS[config.browColor].color }),
    ...(config.pupilColor === "ink" ? {} : { pupilColor: PUPIL_COLORS[config.pupilColor].color }),
    ...(config.noseColor === "natural" ? {} : { noseColor: NOSE_COLORS[config.noseColor].color }),
    mouth: config.mouth,
    ears: config.ears,
    hair: { style: config.hairStyle, color: hair.color, shade: hair.shade },
    ...(config.facialHair === "none" ? {} : { facialHair: config.facialHair }),
    // A vest hangs over a shirt, so its sleeves are the shirt's colour: never white, which would vanish on a light page.
    outfit: { kind: config.outfit, color: clothes.color, shade: clothes.shade, collar: config.outfit === "vest" ? O.blueJay : O.snow },
    ...(config.headwear === "none" ? {} : { headwear: { style: config.headwear, ...WEAR_COLORS[config.headwearColor] } }),
    ...(config.eyewear === "none" ? {} : { eyewear: { style: config.eyewear, ...WEAR_COLORS[config.eyewearColor] } }),
    ...(config.earwear === "none" ? {} : { earwear: { style: config.earwear, ...WEAR_COLORS[config.earwearColor] } }),
    // No held or worn prop: the avatar is a person, not a teacher of a field.
    accent: { kind: "none", color: O.swan, shade: O.hare },
  };
}

export const avatarBackground = (config: AvatarConfig): string => BACKGROUNDS[config.background];
export const backgroundColors = (id: BackgroundId = DEFAULT_AVATAR.background): { color: string; shade: string } => BACKGROUND_COLORS[id] ?? BACKGROUND_COLORS.sky;
export const avatarBackgroundColors = (config: AvatarConfig): { color: string; shade: string } => backgroundColors(config.background);
