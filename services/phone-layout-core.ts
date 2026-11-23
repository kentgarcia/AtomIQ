/**
 * How the learner's home screen is arranged, framework-free so `scripts/test-phone-layout.mjs` can run it.
 *
 * The phone starts in PROGRESSION order (the catalog's order: the order the apps arrive) with the games gathered in one folder, and the
 * learner may arrange it: move icons earlier or later, make folders (named from a short list: the phone has no text input but Field
 * Notes), put icons in them and take them out. What is saved is only that arrangement, the ids in their places; which apps the learner
 * HAS is still derived from progress (`phone-core.ts`), so an app that unlocks later simply appears where the layout already holds it.
 *
 *   defaultLayout      the progression arrangement
 *   sanitizeLayout     any saved value read back safely: unknown or repeated apps dropped, new catalog apps added in place
 *   moveBefore, moveAfter, shift, createFolder, addToFolder, takeOut, renameFolder, dissolveFolder   the arranging, each returns a new layout
 *   homeEntries        what the home screen draws: the installed icons in the learner's order, then the next few still to come
 */

import type { PhoneApp } from "./phone-core.ts";

export type LayoutItem = { kind: "app"; id: string } | { kind: "folder"; id: string; name: string; apps: string[] };

export interface PhoneLayout {
  v: 1;
  items: LayoutItem[];
}

/** The names a folder can take: a short list, so no text input is needed. */
export const FOLDER_NAMES = ["Games", "Science", "Tools", "Favourites", "Extras"] as const;
export const MAX_FOLDER_NAME = 20;

/** The folder the games start in. */
export const GAMES_FOLDER_ID = "folder-games";

/** How many apps still to come show (locked) after the installed ones: the phone shows what is next, not everything that ever will be. */
export const UPCOMING_SHOWN = 3;

const live = (catalog: readonly PhoneApp[]): PhoneApp[] => catalog.filter((a) => a.status === "live");

/** The position of an app in the catalog, which is its place in the progression. */
const rankOf = (catalog: readonly PhoneApp[]): Map<string, number> => new Map(live(catalog).map((a, i) => [a.id, i]));

/** The progression arrangement: the catalog's order, with the games collapsed into one folder where the first game sits. */
export function defaultLayout(catalog: readonly PhoneApp[]): PhoneLayout {
  const items: LayoutItem[] = [];
  const games: string[] = [];
  let folderAt = -1;
  for (const app of live(catalog)) {
    if (app.group === "games") {
      if (folderAt < 0) {
        folderAt = items.length;
        items.push({ kind: "folder", id: GAMES_FOLDER_ID, name: "Games", apps: games });
      }
      games.push(app.id);
    } else items.push({ kind: "app", id: app.id });
  }
  return { v: 1, items };
}

const cloneItem = (it: LayoutItem): LayoutItem => (it.kind === "app" ? { ...it } : { ...it, apps: [...it.apps] });
const clone = (l: PhoneLayout): PhoneLayout => ({ v: 1, items: l.items.map(cloneItem) });

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The lowest catalog rank among an item's apps (a folder sits where its first app would). */
const itemRank = (it: LayoutItem, ranks: Map<string, number>): number =>
  it.kind === "app" ? (ranks.get(it.id) ?? Infinity) : Math.min(...it.apps.map((a) => ranks.get(a) ?? Infinity));

/**
 * Any saved value, read back as a valid layout for this catalog. Unknown apps and repeats are dropped, folders keep a name and lose
 * their emptiness, and an app the layout does not hold yet (a new catalog row) is added: into the games folder when it is a game,
 * else after the last item that comes before it in the progression. Nothing at all gives the default.
 */
export function sanitizeLayout(raw: unknown, catalog: readonly PhoneApp[]): PhoneLayout {
  const apps = live(catalog);
  if (!isRec(raw) || raw.v !== 1 || !Array.isArray(raw.items)) return defaultLayout(catalog);
  const known = new Set<string>(apps.map((a) => a.id));
  const used = new Set<string>();
  const takeApp = (id: unknown): string | null => {
    if (typeof id !== "string" || !known.has(id) || used.has(id)) return null;
    used.add(id);
    return id;
  };
  const folderIds = new Set<string>();
  const items: LayoutItem[] = [];
  for (const it of raw.items) {
    if (!isRec(it)) continue;
    if (it.kind === "app") {
      const id = takeApp(it.id);
      if (id) items.push({ kind: "app", id });
    } else if (it.kind === "folder" && typeof it.id === "string" && it.id && !folderIds.has(it.id) && Array.isArray(it.apps)) {
      const members = it.apps.map(takeApp).filter((x): x is string => x !== null);
      if (members.length === 0) continue;
      folderIds.add(it.id);
      const name = typeof it.name === "string" && it.name.trim() ? it.name.trim().slice(0, MAX_FOLDER_NAME) : "Folder";
      items.push({ kind: "folder", id: it.id, name, apps: members });
    }
  }
  const layout: PhoneLayout = { v: 1, items };
  const ranks = rankOf(catalog);
  for (const app of apps) {
    if (used.has(app.id)) continue;
    const games = layout.items.find((i) => i.kind === "folder" && i.id === GAMES_FOLDER_ID);
    if (app.group === "games" && games && games.kind === "folder") {
      games.apps.push(app.id);
      continue;
    }
    const mine = ranks.get(app.id) ?? Infinity;
    let at = 0;
    layout.items.forEach((it, i) => {
      if (itemRank(it, ranks) < mine) at = i + 1;
    });
    layout.items.splice(at, 0, { kind: "app", id: app.id });
  }
  return layout;
}

/** The folder an app is in, or null when it sits on the home screen itself. */
export const folderOf = (layout: PhoneLayout, appId: string): Extract<LayoutItem, { kind: "folder" }> | null =>
  layout.items.find((i): i is Extract<LayoutItem, { kind: "folder" }> => i.kind === "folder" && i.apps.includes(appId)) ?? null;

const indexOfItem = (items: LayoutItem[], id: string): number => items.findIndex((i) => i.id === id);

/** Take an app out of wherever it is (home screen or a folder), dropping a folder that empties. Returns where it was on the home screen. */
function detach(layout: PhoneLayout, appId: string): number {
  const top = layout.items.findIndex((i) => i.kind === "app" && i.id === appId);
  if (top >= 0) {
    layout.items.splice(top, 1);
    return top;
  }
  const fi = layout.items.findIndex((i) => i.kind === "folder" && i.apps.includes(appId));
  if (fi < 0) return layout.items.length;
  const f = layout.items[fi] as Extract<LayoutItem, { kind: "folder" }>;
  f.apps = f.apps.filter((a) => a !== appId);
  if (f.apps.length === 0) {
    layout.items.splice(fi, 1);
    return fi;
  }
  return fi + 1;
}

/** Put the home-screen item `itemId` (an app or a folder) just before `targetId`. An app inside a folder is taken out first. */
export function moveBefore(layout: PhoneLayout, itemId: string, targetId: string): PhoneLayout {
  if (itemId === targetId) return layout;
  const next = clone(layout);
  if (indexOfItem(next.items, targetId) < 0) return layout;
  let item: LayoutItem;
  const at = indexOfItem(next.items, itemId);
  if (at >= 0) item = next.items.splice(at, 1)[0];
  else {
    if (!folderOf(next, itemId)) return layout;
    detach(next, itemId);
    item = { kind: "app", id: itemId };
  }
  const to = indexOfItem(next.items, targetId);
  next.items.splice(to < 0 ? next.items.length : to, 0, item);
  return next;
}

/** Put the home-screen item `itemId` just after `targetId` (an app inside a folder is taken out first). */
export function moveAfter(layout: PhoneLayout, itemId: string, targetId: string): PhoneLayout {
  if (itemId === targetId) return layout;
  const next = clone(layout);
  if (indexOfItem(next.items, targetId) < 0) return layout;
  let item: LayoutItem;
  const at = indexOfItem(next.items, itemId);
  if (at >= 0) item = next.items.splice(at, 1)[0];
  else {
    if (!folderOf(next, itemId)) return layout;
    detach(next, itemId);
    item = { kind: "app", id: itemId };
  }
  next.items.splice(indexOfItem(next.items, targetId) + 1, 0, item);
  return next;
}

/** Move a home-screen item one place earlier (`-1`) or later (`1`). */
export function shift(layout: PhoneLayout, itemId: string, delta: -1 | 1): PhoneLayout {
  const i = indexOfItem(layout.items, itemId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= layout.items.length) return layout;
  const next = clone(layout);
  [next.items[i], next.items[j]] = [next.items[j], next.items[i]];
  return next;
}

/** A folder id nobody has used. */
const newFolderId = (layout: PhoneLayout): string => {
  let n = 1;
  const taken = new Set(layout.items.map((i) => i.id));
  while (taken.has(`folder-${n}`)) n++;
  return `folder-${n}`;
};

/** A new folder holding `appId`, where that app was. */
export function createFolder(layout: PhoneLayout, appId: string, name: string): PhoneLayout {
  const next = clone(layout);
  const at = detach(next, appId);
  next.items.splice(Math.min(at, next.items.length), 0, { kind: "folder", id: newFolderId(next), name: name.trim().slice(0, MAX_FOLDER_NAME) || "Folder", apps: [appId] });
  return next;
}

/** Put an app in a folder (from the home screen or another folder). */
export function addToFolder(layout: PhoneLayout, appId: string, folderId: string): PhoneLayout {
  if (!layout.items.some((i) => i.kind === "folder" && i.id === folderId)) return layout;
  if (folderOf(layout, appId)?.id === folderId) return layout;
  const next = clone(layout);
  detach(next, appId);
  const f = next.items.find((i) => i.kind === "folder" && i.id === folderId);
  if (!f || f.kind !== "folder") return layout;
  f.apps.push(appId);
  return next;
}

/** Take an app out of its folder: it lands on the home screen right after the folder, which goes when it is empty. */
export function takeOut(layout: PhoneLayout, appId: string): PhoneLayout {
  const f = folderOf(layout, appId);
  if (!f) return layout;
  const next = clone(layout);
  const at = detach(next, appId);
  next.items.splice(Math.min(at, next.items.length), 0, { kind: "app", id: appId });
  return next;
}

export function renameFolder(layout: PhoneLayout, folderId: string, name: string): PhoneLayout {
  const clean = name.trim().slice(0, MAX_FOLDER_NAME);
  if (!clean) return layout;
  return { v: 1, items: layout.items.map((i) => (i.kind === "folder" && i.id === folderId ? { ...i, name: clean, apps: [...i.apps] } : cloneItem(i))) };
}

/** Undo a folder: its apps go onto the home screen in its place, in their order. */
export function dissolveFolder(layout: PhoneLayout, folderId: string): PhoneLayout {
  const at = indexOfItem(layout.items, folderId);
  const f = layout.items[at];
  if (!f || f.kind !== "folder") return layout;
  const next = clone(layout);
  next.items.splice(at, 1, ...f.apps.map((id): LayoutItem => ({ kind: "app", id })));
  return next;
}

/** What the home screen draws. */
export type HomeEntry =
  | { kind: "app"; app: PhoneApp; locked: boolean }
  | { kind: "folder"; id: string; name: string; members: { app: PhoneApp; locked: boolean }[] };

/**
 * The home screen: installed icons in the learner's own order (a folder is there once one of its apps is installed), then the next
 * `upcoming` apps still to come, locked, in progression order. Apps inside folders are never in the "to come" row: the folder's own
 * page shows its locked members.
 */
export function homeEntries(layout: PhoneLayout, catalog: readonly PhoneApp[], isInstalled: (id: string) => boolean, upcoming: number = UPCOMING_SHOWN): HomeEntry[] {
  const byId = new Map<string, PhoneApp>(live(catalog).map((a) => [a.id, a]));
  const entries: HomeEntry[] = [];
  const topLevel = new Set<string>();
  for (const it of layout.items) {
    if (it.kind === "app") {
      const app = byId.get(it.id);
      if (!app) continue;
      topLevel.add(app.id);
      if (isInstalled(app.id)) entries.push({ kind: "app", app, locked: false });
    } else {
      const members = it.apps.flatMap((id) => {
        const app = byId.get(id);
        return app ? [{ app, locked: !isInstalled(id) }] : [];
      });
      if (members.some((m) => !m.locked)) entries.push({ kind: "folder", id: it.id, name: it.name, members });
    }
  }
  const soon = live(catalog)
    .filter((a) => topLevel.has(a.id) && !isInstalled(a.id))
    .slice(0, Math.max(0, upcoming));
  for (const app of soon) entries.push({ kind: "app", app, locked: true });
  return entries;
}
