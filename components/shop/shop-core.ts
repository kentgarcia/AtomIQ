/**
 * The shop, as pure data: its categories, the shape of an item, the items for sale, and how an item
 * previews on the avatar.
 *
 * An item is one choice of the avatar (`components/avatar/avatar-core.ts`), for example the paint
 * "mint" or the pattern "atomlab", with a price in diamonds. Only paints and patterns are for sale so far:
 * every one except the defaults every learner starts with (the `sky` paint and no pattern). Hair, eyes,
 * outfits and skin have no items yet. Previewing an item on the avatar works; buying and owning are not
 * built (they need a table in the user-state DB and a way to spend diamonds).
 */

import { AVATAR_OPTIONS, DEFAULT_AVATAR, type AvatarConfig } from "../avatar/avatar-core.ts";
import { patternDef } from "../avatar/pattern-art.ts";

/** A tab of the shop: which choice of the avatar it sells. */
export type ShopCategoryId = "hair" | "eyes" | "outfit" | "skin" | "paint" | "pattern";

export interface ShopCategory {
  id: ShopCategoryId;
  label: string;
  /** An icon name for `components/ui/icon.tsx`. */
  icon: string;
  /** The avatar choice the items of this tab change. */
  choice: keyof AvatarConfig;
}

export const SHOP_CATEGORIES: readonly ShopCategory[] = [
  { id: "hair", label: "Hair", icon: "Scissor", choice: "hairStyle" },
  { id: "eyes", label: "Eyes", icon: "Eye", choice: "eyes" },
  { id: "outfit", label: "Outfits", icon: "Bag2", choice: "outfit" },
  { id: "skin", label: "Skin", icon: "Colorfilter", choice: "skin" },
  /** Paints are solid colours for the picture behind the avatar; patterns are drawn faintly over the paint. */
  { id: "paint", label: "Paints", icon: "Brush2", choice: "background" },
  { id: "pattern", label: "Patterns", icon: "Shapes", choice: "pattern" },
];

export interface ShopItem {
  /** A shipped id, never reused. */
  id: string;
  /** What a screen reader says: "Mint", "Atom lab". */
  name: string;
  category: ShopCategoryId;
  /** The value the category's avatar choice takes (an id from `AVATAR_OPTIONS`). */
  value: string;
  /** Diamonds. A whole number above zero. */
  price: number;
}

/** What a paint or a pattern costs, in diamonds. A chest pays 5 (daily) or 25 (weekly). */
export const PAINT_PRICE = 20;
export const PATTERN_PRICE = 30;

const titleCase = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

/** Every paint but the starting one, in the order of `AVATAR_OPTIONS`. */
const PAINTS: ShopItem[] = AVATAR_OPTIONS.background
  .filter((id) => id !== DEFAULT_AVATAR.background)
  .map((id) => ({ id: `paint-${id}`, name: titleCase(id), category: "paint", value: id, price: PAINT_PRICE }));

/** Every pattern but "none", named as `pattern-art.ts` names it. */
const PATTERNS: ShopItem[] = AVATAR_OPTIONS.pattern
  .filter((id) => id !== DEFAULT_AVATAR.pattern)
  .map((id) => ({ id: `pattern-${id}`, name: patternDef(id)?.name ?? id, category: "pattern", value: id, price: PATTERN_PRICE }));

export const SHOP_ITEMS: readonly ShopItem[] = [...PAINTS, ...PATTERNS];

export const categoryById = (id: ShopCategoryId): ShopCategory => SHOP_CATEGORIES.find((c) => c.id === id) ?? SHOP_CATEGORIES[0];

export const itemsIn = (category: ShopCategoryId, items: readonly ShopItem[] = SHOP_ITEMS): ShopItem[] => items.filter((i) => i.category === category);

/** The avatar with one item tried on. The base is not changed. */
export function previewConfig(base: AvatarConfig, item: ShopItem): AvatarConfig {
  const { choice } = categoryById(item.category);
  return { ...base, [choice]: item.value };
}
