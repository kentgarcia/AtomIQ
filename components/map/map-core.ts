/**
 * The Nuclear Map's rules (docs/features/PHONE_SPEC.md §5.8): the site shape, each kind's name and colour, where a site's pin sits on the flat
 * world map (`world-art.ts`, a Robinson projection) and the pan and zoom maths. Framework-free and tested (`test:map`). The view maths are
 * worklets so the screen's gestures run them on the UI thread. The kinds mirror `scripts/lib/map-vocab.mjs`.
 */

import { BEE, EEL, FOX, PLUM, RED, SEA } from "../lesson/visual/object-art.ts";
import { WORLD_MAP, project } from "./world-art.ts";

export const MAP_KINDS = ["discovery", "research", "reactor", "accident", "history", "natural"] as const;
export type MapKind = (typeof MAP_KINDS)[number];

export const MAP_KIND_NAMES: Readonly<Record<MapKind, string>> = { discovery: "Discovery", research: "Research", reactor: "Power", accident: "Accident", history: "History", natural: "Natural" };

/** A pin's colour and its darker lip, per kind (fixed hues from the object art, the same in light and dark mode, theme exception EX-13). */
export const MAP_KIND_COLORS: Readonly<Record<MapKind, { face: string; lip: string }>> = {
  discovery: { face: SEA[1], lip: SEA[2] },
  research: { face: PLUM[1], lip: PLUM[2] },
  reactor: { face: BEE[1], lip: BEE[2] },
  accident: { face: RED[1], lip: RED[2] },
  history: { face: FOX[1], lip: FOX[2] },
  natural: { face: EEL[1], lip: EEL[2] }, // charcoal: the map's land is green, so no pin is
};

export interface MapSite {
  id: string;
  name: string;
  place: string;
  kind: MapKind;
  year: string;
  lat: number;
  lon: number;
  blurb: string;
  fact: string;
  entryId: string | null;
  position: number;
  /** "Publisher, Title" of each source the site stands on. */
  sources: string[];
}

/** A kind the map knows; anything else (a row from a newer content version) reads as history rather than breaking. */
export const kindOf = (kind: string): MapKind => ((MAP_KINDS as readonly string[]).includes(kind) ? (kind as MapKind) : "history");

/** Where a site's pin is, in the map's own units (0 to `WORLD_MAP.width` by 0 to `WORLD_MAP.height`). */
export const sitePoint = (site: Pick<MapSite, "lat" | "lon">): { x: number; y: number } => project(site.lon, site.lat);

/** "18 places", "1 place". */
export const placeCountText = (n: number): string => (n === 1 ? "1 place" : `${n} places`);

/** How many sites of each kind, for the legend. */
export function countByKind(sites: readonly Pick<MapSite, "kind">[]): Record<MapKind, number> {
  const out = Object.fromEntries(MAP_KINDS.map((k) => [k, 0])) as Record<MapKind, number>;
  for (const s of sites) out[kindOf(s.kind)] += 1;
  return out;
}

/** The sites whose kind is switched on, in reading order. */
export const visibleSites = <T extends Pick<MapSite, "kind">>(sites: readonly T[], off: ReadonlySet<string>): T[] => sites.filter((s) => !off.has(kindOf(s.kind)));

// ---------------------------------------------------------------------------
// the view: which part of the world the screen shows
// ---------------------------------------------------------------------------

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 10;

/** `k` is the zoom (1 fits the whole world in the screen's width); `cx`, `cy` the map point at the middle of the screen. */
export interface MapView {
  k: number;
  cx: number;
  cy: number;
}

/** Screen dp per map unit at zoom `k`. */
export function scaleOf(k: number, viewW: number): number {
  'worklet';
  return (k * viewW) / WORLD_MAP.width;
}

/** Keep the zoom in range and the view over the world: an axis where the world is smaller than the screen stays centred (the map has ocean round it at zoom 1). */
export function clampView(v: MapView, viewW: number, viewH: number): MapView {
  'worklet';
  const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k));
  const s = (k * viewW) / WORLD_MAP.width;
  const hx = viewW / (2 * s);
  const hy = viewH / (2 * s);
  const cx = WORLD_MAP.width <= 2 * hx ? WORLD_MAP.width / 2 : Math.min(WORLD_MAP.width - hx, Math.max(hx, v.cx));
  const cy = WORLD_MAP.height <= 2 * hy ? WORLD_MAP.height / 2 : Math.min(WORLD_MAP.height - hy, Math.max(hy, v.cy));
  return { k, cx, cy };
}

/** The screen point (dp) of a map point. */
export function toScreen(v: MapView, viewW: number, viewH: number, x: number, y: number): { x: number; y: number } {
  'worklet';
  const s = (v.k * viewW) / WORLD_MAP.width;
  return { x: (x - v.cx) * s + viewW / 2, y: (y - v.cy) * s + viewH / 2 };
}

/** The view after the finger moved `dx`, `dy` dp from where it was at `from`: the map follows the finger. */
export function pannedView(from: MapView, dx: number, dy: number, viewW: number, viewH: number): MapView {
  'worklet';
  const s = (from.k * viewW) / WORLD_MAP.width;
  return clampView({ k: from.k, cx: from.cx - dx / s, cy: from.cy - dy / s }, viewW, viewH);
}

/** The view after zooming by `factor` about the screen point `fx`, `fy`: the map point under it stays under it (as far as the clamp allows). */
export function zoomedView(from: MapView, factor: number, fx: number, fy: number, viewW: number, viewH: number): MapView {
  'worklet';
  const s0 = (from.k * viewW) / WORLD_MAP.width;
  const wx = from.cx + (fx - viewW / 2) / s0;
  const wy = from.cy + (fy - viewH / 2) / s0;
  const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, from.k * factor));
  const s = (k * viewW) / WORLD_MAP.width;
  return clampView({ k, cx: wx - (fx - viewW / 2) / s, cy: wy - (fy - viewH / 2) / s }, viewW, viewH);
}

/** The view that puts a site in the middle of the screen at zoom `k`, a little above the middle so a card below does not cover it. */
export function focusOnSite(site: Pick<MapSite, "lat" | "lon">, viewW: number, viewH: number, k = 3, lift = 0): MapView {
  const p = sitePoint(site);
  const s = (k * viewW) / WORLD_MAP.width;
  return clampView({ k, cx: p.x, cy: p.y + lift / s }, viewW, viewH);
}

/** The view the map opens on: the whole world. */
export const WORLD_VIEW: MapView = { k: MIN_ZOOM, cx: WORLD_MAP.width / 2, cy: WORLD_MAP.height / 2 };
