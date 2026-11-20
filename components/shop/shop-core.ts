/**
 * The shop, as pure data: its categories, the shape of an item, the items for sale, and how an item
 * previews on the avatar.
 *
 * An item is one choice of the avatar (`components/avatar/avatar-core.ts`), for example the paint
 * "mint" or the pattern "atomlab", with a price in diamonds (zero is free). On the shelves: hair styles, the face
 * (eyebrows, eyes, nose, mouth, ears), accessories, clothes, skin tones (free), and every paint and pattern except the defaults every
 * learner starts with (the `sky` paint and no pattern); what a starting design wears is free. Head, eye and ear
 * accessories (bare is free) and seventeen kinds of clothes are on the shelves too. Previewing an item on the
 * avatar works; buying and owning are not built (they need a table in the user-state DB and a way to spend diamonds).
 */

import { AVATAR_OPTIONS, DEFAULT_AVATAR, HAIR_COLORS, NOSE_COLORS, OUTFIT_COLORS, PUPIL_COLORS, SKIN_TONES, STARTER_AVATARS, WEAR_COLORS, type AvatarConfig } from "../avatar/avatar-core.ts";
import { patternDef } from "../avatar/pattern-art.ts";

/** A tab of the shop: which choice of the avatar it sells. */
export type ShopCategoryId = "hair" | "eyebrows" | "eyes" | "nose" | "mouth" | "ears" | "headwear" | "eyewear" | "earwear" | "outfit" | "skin" | "paint" | "pattern";

export interface ShopCategory {
  id: ShopCategoryId;
  label: string;
  /** An icon name for `components/ui/icon.tsx`. */
  icon: string;
  /**
   * The avatar choice the items of this tab change. Missing for a shelf the avatar cannot draw yet: that tab is empty
   * (`choiceItems` and `previewConfig` handle it), so a new kind of thing can be listed before it can be worn.
   */
  choice?: keyof AvatarConfig;
  /** The avatar choice that colours the items of this tab (hair colour for hair styles), shown as a column of swatches while one is tried on. */
  colorChoice?: ColorChoice;
  /** Values of this tab that have nothing to colour (no brows, no nose, eyes drawn as closed arcs): no swatch column for them. */
  noColor?: readonly string[];
}

/** The avatar choices a swatch column can set. */
export type ColorChoice = "hairColor" | "outfitColor" | "browColor" | "pupilColor" | "noseColor" | "headwearColor" | "eyewearColor" | "earwearColor";

export interface ColorOption {
  id: string;
  /** What a screen reader says: "Ginger". */
  name: string;
  color: string;
  shade: string;
}

export const SHOP_CATEGORIES: readonly ShopCategory[] = [
  { id: "hair", label: "Hair", icon: "AqHair", choice: "hairStyle", colorChoice: "hairColor" },
  { id: "eyebrows", label: "Eyebrows", icon: "AqEyebrow", choice: "eyebrows", colorChoice: "browColor", noColor: ["none"] },
  { id: "eyes", label: "Eyes", icon: "Eye", choice: "eyes", colorChoice: "pupilColor", noColor: ["arches"] },
  { id: "nose", label: "Nose", icon: "AqNose", choice: "nose", colorChoice: "noseColor", noColor: ["none"] },
  { id: "mouth", label: "Mouth", icon: "AqMouth", choice: "mouth" },
  { id: "ears", label: "Ears", icon: "AqEar", choice: "ears" },
  { id: "headwear", label: "Head accessories", icon: "AqHat", choice: "headwear", colorChoice: "headwearColor", noColor: ["none"] },
  { id: "eyewear", label: "Eye accessories", icon: "AqGlasses", choice: "eyewear", colorChoice: "eyewearColor", noColor: ["none"] },
  { id: "earwear", label: "Ear accessories", icon: "AqEarring", choice: "earwear", colorChoice: "earwearColor", noColor: ["none"] },
  { id: "outfit", label: "Clothes", icon: "AqShirt", choice: "outfit", colorChoice: "outfitColor" },
  { id: "skin", label: "Skin", icon: "Colorfilter", choice: "skin" },
  /** Paints are solid colours for the picture behind the avatar; patterns are drawn faintly over the paint. */
  { id: "paint", label: "Paints", icon: "Brush2", choice: "background" },
  { id: "pattern", label: "Patterns", icon: "Shapes", choice: "pattern" },
];

/**
 * What the row of tabs on the shop's panel shows: one tab per kind of thing. Most hold one category; the face holds
 * five (eyebrows, eyes, nose, mouth, ears) and the accessories four (head, eye and ear accessories, clothes), which the
 * panel shows as a column of vertical tabs inside the shelf.
 */
export type ShopTabId = "hair" | "face" | "accessories" | "skin" | "paint" | "pattern";

export interface ShopTab {
  id: ShopTabId;
  label: string;
  icon: string;
  /** The categories inside, in order; the first opens first. */
  categories: readonly ShopCategoryId[];
}

export const SHOP_TABS: readonly ShopTab[] = [
  { id: "hair", label: "Hair", icon: "AqHair", categories: ["hair"] },
  { id: "face", label: "Face", icon: "Happyemoji", categories: ["eyebrows", "eyes", "nose", "mouth", "ears"] },
  { id: "accessories", label: "Accessories", icon: "Crown", categories: ["headwear", "eyewear", "earwear", "outfit"] },
  { id: "skin", label: "Skin", icon: "Colorfilter", categories: ["skin"] },
  { id: "paint", label: "Paints", icon: "Brush2", categories: ["paint"] },
  { id: "pattern", label: "Patterns", icon: "Shapes", categories: ["pattern"] },
];

/** A category of the face tab: its tiles show a close-up of the face instead of the whole avatar. */
export const isFaceCategory = (id: ShopCategoryId): boolean => tabById("face").categories.includes(id);

/** How close a tile of this category looks at the avatar: the face (and glasses), the ears (earrings), the chest (clothes), or the whole head. */
export const tileZoom = (id: ShopCategoryId): "face" | "ears" | "chest" | undefined => (isFaceCategory(id) || id === "eyewear" ? "face" : id === "earwear" ? "ears" : id === "outfit" ? "chest" : undefined);

export const tabById = (id: ShopTabId): ShopTab => SHOP_TABS.find((t) => t.id === id) ?? SHOP_TABS[0];

export interface ShopItem {
  /** A shipped id, never reused. */
  id: string;
  /** What a screen reader says: "Mint", "Atom lab". */
  name: string;
  category: ShopCategoryId;
  /** The value the category's avatar choice takes (an id from `AVATAR_OPTIONS`). */
  value: string;
  /** Diamonds. A whole number, zero for free. */
  price: number;
  /** The learner's level from which the item can be bought (1: open from the start). Items can be tried on before. */
  level: number;
  /** What a starting design wears: the learner has it from the start, with nothing to buy. Every other item, free ones too, is got first. */
  starter: boolean;
}

/** What a paint or a pattern costs, in diamonds. A chest pays 5 (daily) or 25 (weekly). Skin is free. */
/** Every price is the base price times this, rounded to whole diamonds and then to a tidy one: ending in 3 goes up to 5, ending in 8 to 10 (23 is 25, 38 is 40). */
export const PRICE_SCALE = 1.5;
const scaled = (base: number): number => {
  const price = Math.round(base * PRICE_SCALE);
  return price % 10 === 3 || price % 10 === 8 ? price + 2 : price;
};
function scaleAll<T extends Record<string, number>>(base: T): { [K in keyof T]: number } {
  return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, scaled(v)])) as { [K in keyof T]: number };
}

export const PAINT_PRICE = scaled(20);
export const PATTERN_PRICE = scaled(30);
export const SKIN_PRICE = 0;
/** A hair style. The ones the starting designs wear (a crop, a bun) are free. Colour is not sold: it will be a customization of its own. */
export const HAIR_STYLE_PRICE = scaled(25);

/**
 * The level that opens an item. Free items are open (1). A paid item starts at its price's tier (dearer is later)
 * and each further group of three on the same shelf waits one level more, so a long shelf opens up gradually as the
 * learner levels up (a level is 100 XP). New items go at the END of a shelf: the level follows the position.
 */
export const TIER_LEVELS: Record<number, number> = Object.fromEntries(Object.entries({ 15: 2, 20: 3, 25: 4, 30: 5, 40: 6, 60: 8, 80: 10 }).map(([price, level]) => [scaled(Number(price)), level]));
export const MAX_UNLOCK_LEVEL = 15;
const ITEMS_PER_LEVEL = 3;

/** A price of zero is free: the tile says "Free" instead of showing diamonds. */
export const isFree = (item: Pick<ShopItem, "price">): boolean => item.price === 0;

const titleCase = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

/** Every paint but the starting one, in the order of `AVATAR_OPTIONS`. */
type RawItem = Omit<ShopItem, "level" | "starter"> & { starter?: boolean };
const PAINTS: RawItem[] = AVATAR_OPTIONS.background
  .filter((id) => id !== DEFAULT_AVATAR.background)
  .map((id) => ({ id: `paint-${id}`, name: titleCase(id), category: "paint", value: id, price: PAINT_PRICE }));

/** Every pattern but "none", named as `pattern-art.ts` names it. */
const PATTERNS: RawItem[] = AVATAR_OPTIONS.pattern
  .filter((id) => id !== DEFAULT_AVATAR.pattern)
  .map((id) => ({ id: `pattern-${id}`, name: patternDef(id)?.name ?? id, category: "pattern", value: id, price: PATTERN_PRICE }));

/** Every skin tone, the one the learner starts with included (it is free, so trying one on and coming back costs nothing). */
const wornSkins = new Set(STARTER_AVATARS.map((a) => a.config.skin as string));
const SKINS: RawItem[] = AVATAR_OPTIONS.skin.map((id) => ({ id: `skin-${id}`, name: titleCase(id), category: "skin", value: id, price: SKIN_PRICE, starter: wornSkins.has(id) }));

/** The hair on the shelf: every style, in the base colour the learner has. What a starting design wears (a crop, a bun) is free. */
const wornByStarters = new Set(STARTER_AVATARS.map((a) => a.config.hairStyle as string));
/** What the shop calls a hair style, where the id alone would not read well. */
const HAIR_NAMES: Record<string, string> = { buzzcut: "Buzz cut", classic: "Classic short", messy: "Messy", sidepart: "Side part", curtain: "Curtain", bowl: "Bowl cut", spiky: "Spiky", wavy: "Wavy", undercut: "Undercut", longer: "Longer", longstraight: "Long straight", shortbob: "Short bob", medium: "Medium", highpony: "High ponytail", lowpony: "Low ponytail", twintails: "Twin tails", bigbun: "Big bun", halfup: "Half up", longwavy: "Long wavy", curtainbangs: "Curtain bangs" };
const HAIR: RawItem[] = AVATAR_OPTIONS.hairStyle.map((id): RawItem => ({ id: `hair-style-${id}`, name: HAIR_NAMES[id] ?? titleCase(id), category: "hair", value: id, price: wornByStarters.has(id) ? 0 : HAIR_STYLE_PRICE, starter: wornByStarters.has(id) }));

/** What one choice costs in the face and outfit tabs, in diamonds (what a starting design wears is free). */
export const FACE_PRICES = scaleAll({ eyebrows: 15, eyes: 20, nose: 15, mouth: 15, ears: 20, headwear: 30, eyewear: 25, earwear: 20, outfit: 40 });
/** Clothes cost more the more is going on: a plain top is the base price, a jacket or a jumper with a pattern more, a costume most. The five the teachers wear and the starting designs' are the base (or free). */
export const OUTFIT_PRICES: Record<string, number> = scaleAll({ jacket: 60, overalls: 60, puffer: 60, scarf: 60, knit: 60, sailor: 80, hawaiian: 80, tuxedo: 80 });
type PricedCategory = keyof typeof FACE_PRICES;

/** What the shop calls each choice of the face and outfit tabs, where the id alone would not read well. */
const NAMES: Record<PricedCategory, Record<string, string>> = {
  eyebrows: { none: "No brows", straight: "Straight", arched: "Arched", thick: "Thick", thin: "Thin", angled: "Angled", worried: "Worried", high: "Raised", bushy: "Bushy" },
  eyes: { pill: "Classic", round: "Round", dots: "Dots", wide: "Wide", sparkle: "Sparkle", lashes: "Lashes", sleepy: "Sleepy", arches: "Happy arches" },
  nose: { single: "Slim", double: "Classic", button: "Button", tiny: "Tiny", long: "Long", wide: "Wide", pointy: "Pointy", round: "Round", none: "No nose" },
  mouth: { smile: "Smile", smirk: "Smirk", wide: "Wide smile", small: "Small", toothy: "Toothy", cat: "Cat", neutral: "Neutral", open: "Open", tongue: "Tongue out" },
  ears: { round: "Round", small: "Small", big: "Big", pointed: "Pointed", elf: "Elf", none: "No ears" },
  headwear: { none: "No hat", beanie: "Beanie", cap: "Baseball cap", headband: "Headband", bow: "Big bow", crown: "Crown", catears: "Cat ears", bunnyears: "Bunny ears", flowers: "Flower crown", wizard: "Wizard hat", party: "Party hat", graduation: "Graduation cap", hardhat: "Hard hat" },
  eyewear: { none: "No glasses", round: "Round glasses", square: "Square glasses", sunglasses: "Sunglasses", heart: "Heart glasses", star: "Star glasses", goggles: "Goggles", eyepatch: "Eyepatch", monocle: "Monocle", cateye: "Cat-eye glasses" },
  earwear: { none: "No earrings", stud: "Studs", hoop: "Hoops", pearl: "Pearls", star: "Stars", gem: "Gems", flower: "Flower", earmuffs: "Earmuffs", headphones: "Headphones" },
  outfit: { hoodie: "Hoodie", sweater: "Sweater", coat: "Lab coat", vest: "Vest", shirt: "Shirt", turtleneck: "Turtleneck", striped: "Striped tee", overalls: "Overalls", cardigan: "Cardigan", jacket: "Zip jacket", polo: "Polo", sailor: "Sailor top", hawaiian: "Aloha shirt", puffer: "Puffer", tuxedo: "Tuxedo", knit: "Nordic knit", scarf: "Scarf sweater" },
};

/** Every choice of a face or outfit tab, the ones the starting designs wear free. */
function choiceItems(category: PricedCategory): RawItem[] {
  const { choice } = SHOP_CATEGORIES.find((c) => c.id === category) ?? SHOP_CATEGORIES[0];
  if (!choice) return [];
  const worn = new Set(STARTER_AVATARS.map((a) => a.config[choice] as string));
  return (AVATAR_OPTIONS[choice] as readonly string[]).map((id) => ({ id: `${category}-${id}`, name: NAMES[category][id] ?? titleCase(id), category, value: id, price: worn.has(id) ? 0 : (category === "outfit" ? OUTFIT_PRICES[id] : undefined) ?? FACE_PRICES[category], starter: worn.has(id) }));
}

/** Gives each item its level: free ones 1, paid ones by tier plus their place among the paid items of the shelf. */
function withLevels(items: RawItem[]): ShopItem[] {
  const paidSoFar = new Map<string, number>();
  return items.map((item) => {
    const starter = Boolean(item.starter);
    if (item.price === 0) return { ...item, starter, level: 1 };
    const n = paidSoFar.get(item.category) ?? 0;
    paidSoFar.set(item.category, n + 1);
    const tier = TIER_LEVELS[item.price] ?? 1;
    return { ...item, starter, level: Math.min(MAX_UNLOCK_LEVEL, tier + Math.floor(n / ITEMS_PER_LEVEL)) };
  });
}

export const SHOP_ITEMS: readonly ShopItem[] = withLevels([...HAIR, ...choiceItems("eyebrows"), ...choiceItems("eyes"), ...choiceItems("nose"), ...choiceItems("mouth"), ...choiceItems("ears"), ...choiceItems("headwear"), ...choiceItems("eyewear"), ...choiceItems("earwear"), ...choiceItems("outfit"), ...SKINS, ...PAINTS, ...PATTERNS]);


export const categoryById = (id: ShopCategoryId): ShopCategory => SHOP_CATEGORIES.find((c) => c.id === id) ?? SHOP_CATEGORIES[0];

export const itemsIn = (category: ShopCategoryId, items: readonly ShopItem[] = SHOP_ITEMS): ShopItem[] => items.filter((i) => i.category === category);

/** The avatar with one item tried on. The base is not changed. */
export function previewConfig(base: AvatarConfig, item: ShopItem): AvatarConfig {
  const { choice } = categoryById(item.category);
  return choice ? { ...base, [choice]: item.value } : base;
}

const COLOR_CATALOGS: Record<ColorChoice, Record<string, { color: string; shade?: string }>> = {
  hairColor: HAIR_COLORS,
  outfitColor: OUTFIT_COLORS,
  browColor: HAIR_COLORS,
  pupilColor: PUPIL_COLORS,
  noseColor: NOSE_COLORS,
  headwearColor: WEAR_COLORS,
  eyewearColor: WEAR_COLORS,
  earwearColor: WEAR_COLORS,
};

/**
 * The colours on offer for a choice, in the order of the catalog. Colours are only tried on: none is sold. Brows and
 * the nose also offer `natural` first (brows follow the hair, the nose follows the skin), shown in the colour it would
 * be on this avatar, which is why the hair and skin are asked for.
 */
export function colorOptions(choice: ColorChoice, look: Pick<AvatarConfig, "hairColor" | "skin"> = DEFAULT_AVATAR): ColorOption[] {
  const rest = Object.entries(COLOR_CATALOGS[choice]).map(([id, c]) => ({ id, name: titleCase(id), color: c.color, shade: c.shade ?? c.color }));
  if (choice === "browColor") {
    const shade = HAIR_COLORS[look.hairColor].shade;
    return [{ id: "natural", name: "Natural", color: shade, shade }, ...rest];
  }
  if (choice === "noseColor") {
    const feature = SKIN_TONES[look.skin].feature;
    return [{ id: "natural", name: "Natural", color: feature, shade: feature }, ...rest];
  }
  return rest;
}

/** The swatch column an item calls for, or null when its tab has no colour to pick, or the item has nothing to colour (no brows, no nose). */
export function colorChoiceOf(item: Pick<ShopItem, "category" | "value"> | null): ColorChoice | null {
  if (!item) return null;
  const cat = categoryById(item.category);
  return cat.colorChoice && !cat.noColor?.includes(item.value) ? cat.colorChoice : null;
}

/** The avatar with one colour set. The config given is not changed. */
export const withColor = (config: AvatarConfig, choice: ColorChoice, id: string): AvatarConfig => ({ ...config, [choice]: id });

// ── owning, equipping, unlocking ─────────────────────────────────────────────

/** What a tile says about an item: worn now, owned, not yet unlocked (level), or on sale. */
export type ItemStatus = "equipped" | "owned" | "locked" | "for-sale";

/** What a starting design wears is the learner's from the start; everything else, free items too, is theirs once got (bought, for nothing if it is free). */
export const isOwned = (item: Pick<ShopItem, "id" | "starter">, owned: ReadonlySet<string>): boolean => item.starter || owned.has(item.id);

/** Whether the avatar wears this item now (its choice has the item's value). */
export function isEquipped(item: Pick<ShopItem, "category" | "value">, config: AvatarConfig): boolean {
  const { choice } = categoryById(item.category);
  return Boolean(choice) && (config[choice as keyof AvatarConfig] as string) === item.value;
}

export function itemStatus(item: ShopItem, ctx: { owned: ReadonlySet<string>; level: number; config: AvatarConfig }): ItemStatus {
  if (isOwned(item, ctx.owned)) return isEquipped(item, ctx.config) ? "equipped" : "owned";
  return ctx.level < item.level ? "locked" : "for-sale";
}

/** Why an item cannot be bought now, or null when it can: already `owned`, `locked` behind a level, or `poor` (not enough diamonds). */
export function buyBlock(item: ShopItem, ctx: { owned: ReadonlySet<string>; level: number; diamonds: number }): "owned" | "locked" | "poor" | null {
  if (isOwned(item, ctx.owned)) return "owned";
  if (ctx.level < item.level) return "locked";
  if (ctx.diamonds < item.price) return "poor";
  return null;
}

// ── what a level opens ───────────────────────────────────────────────────────

/** The items that open on the way from level `from` (not included) up to level `to` (included), in shelf order. */
export function itemsUnlockedBetween(from: number, to: number, items: readonly ShopItem[] = SHOP_ITEMS): ShopItem[] {
  return items.filter((i) => !i.starter && i.level > from && i.level <= to);
}

/**
 * Up to `max` of the unlocked items to show, taking one from each shelf in turn (the shelves in `SHOP_CATEGORIES` order), so a
 * level that opens ten hair styles and one hat shows both. The rest is `total - shown.length`.
 */
export function featuredUnlocks(unlocked: readonly ShopItem[], max: number): ShopItem[] {
  const shelves = SHOP_CATEGORIES.map((c) => unlocked.filter((i) => i.category === c.id)).filter((l) => l.length > 0);
  const out: ShopItem[] = [];
  for (let round = 0; out.length < max; round++) {
    let added = false;
    for (const shelf of shelves) {
      if (out.length >= max) break;
      if (shelf[round]) {
        out.push(shelf[round]);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}
