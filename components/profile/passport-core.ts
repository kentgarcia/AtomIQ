/**
 * The Explorer Passport as pure data (no React), so the numbers on it are unit-tested
 * (`scripts/test-passport.mjs`) and `PassportCard.tsx` only draws them.
 *
 * - `passportNumber`: the printed number, from the friend code when there is one, otherwise from
 *   the user id, so a passport never shows an empty field and never changes between renders.
 * - `barcodeBars`: the strip along the bottom. It is decorative, but it is made from the number,
 *   so two explorers never share a barcode and the same explorer always gets the same one.
 * - `explorerTitle`: the rank printed under the name.
 */

export const PASSPORT_PREFIX = "AQ";

/** Friend codes are 6 characters of A-Z and 0-9; anything else falls back to the user id. */
const CODE_RE = /^[A-Z0-9]{6}$/;

/** FNV-1a, 32 bit: small, stable, and good enough to spread a short string over the bars. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** A tiny seeded generator (mulberry32), so a barcode is a function of its seed alone. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** "AQ-7K3M9P". Prefers the friend code; falls back to six characters made from the user id. */
export function passportNumber(friendCode: string | null | undefined, userId: string): string {
  const code = (friendCode ?? "").trim().toUpperCase();
  if (CODE_RE.test(code)) return `${PASSPORT_PREFIX}-${code}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const next = rng(hashString(userId || "atomiq"));
  let out = "";
  for (let i = 0; i < 6; i += 1) out += alphabet[Math.floor(next() * alphabet.length)];
  return `${PASSPORT_PREFIX}-${out}`;
}

export interface BarcodeBar {
  /** Width in px. */
  width: number;
  /** Space left after the bar, in px. */
  gap: number;
}

export const BARCODE = {
  count: 34,
  widths: [1.5, 2.5, 4],
  gaps: [1.5, 2.5, 4],
} as const;

/** The bars of the strip, from the passport number. */
export function barcodeBars(number: string): BarcodeBar[] {
  const next = rng(hashString(number));
  const pick = (list: readonly number[]) => list[Math.floor(next() * list.length)];
  return Array.from({ length: BARCODE.count }, () => ({ width: pick(BARCODE.widths), gap: pick(BARCODE.gaps) }));
}

/** Total width of a barcode, so the strip can be centred or clipped to its box. */
export function barcodeWidth(bars: readonly BarcodeBar[]): number {
  return bars.reduce((sum, bar) => sum + bar.width + bar.gap, 0);
}

export const LEVEL_XP = 100;

export const EXPLORER_TITLES = [
  { title: "Atomic Novice", minLevel: 1 },
  { title: "Isotope Initiate", minLevel: 5 },
  { title: "Fusion Explorer", minLevel: 10 },
  { title: "Quantum Master", minLevel: 20 },
] as const;

export function levelFromXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / LEVEL_XP) + 1;
}

export function explorerTitle(level: number): string {
  let title: string = EXPLORER_TITLES[0].title;
  for (const t of EXPLORER_TITLES) if (level >= t.minLevel) title = t.title;
  return title;
}

export const LEVEL_SEGMENTS = 10;

/** How many of the level bar's segments are lit for a 0..1 progress (never all ten before the level is done). */
export function filledSegments(progress: number, count: number = LEVEL_SEGMENTS): number {
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  return Math.min(count, Math.floor(p * count));
}

export const MAX_SHOWCASE = 3;

export interface EarnedBadge {
  id: number;
  /** Levels earned (1 or more). */
  level: number;
}

/**
 * The badges to show on the passport. `saved` is what the explorer picked (ids, in the order
 * picked), or null if they never picked: then the best earned ones are shown, highest level first,
 * ties in the order given. A saved id that is not earned is dropped.
 */
export function resolveShowcase(saved: readonly number[] | null | undefined, earned: readonly EarnedBadge[]): number[] {
  if (!saved) {
    return earned
      .map((b, i) => ({ b, i }))
      .sort((x, y) => y.b.level - x.b.level || x.i - y.i)
      .slice(0, MAX_SHOWCASE)
      .map(({ b }) => b.id);
  }
  const ids = new Set(earned.map((b) => b.id));
  const out: number[] = [];
  for (const id of saved) if (ids.has(id) && !out.includes(id)) out.push(id);
  return out.slice(0, MAX_SHOWCASE);
}

/** Toggle one badge in a pick: it comes off if it is in, goes on the end if there is room, else nothing changes. */
export function toggleShowcase(selected: readonly number[], id: number): number[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id);
  return selected.length < MAX_SHOWCASE ? [...selected, id] : [...selected];
}
