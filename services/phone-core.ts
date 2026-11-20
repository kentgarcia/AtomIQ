/**
 * The phone's rules (docs/PHONE_SPEC.md §4 to §6), framework-free so `scripts/test-phone.mjs` can run
 * them with plain Node.
 *
 *   PHONE_APPS     the catalog: every app, its colour role, glyph, route and when it installs
 *   unlockedApps   which apps the learner has: a pure function of `PhoneProgress`, never stored
 *   newApps        the unlocked apps whose install moment has not played yet
 *   badgeFor       the count or dot on an icon
 *   tabDot         whether the Phone tab shows its dot
 *   pagesOf        the grid split into pages
 *   createPhoneSeenStore   the SQL for `phone_seen` (which installs have played), run on the user-state DB
 *
 * Unlocking is derived from progress the app already stores. Only "this app's arrival has been seen"
 * is saved.
 */

/** When an app installs. A new unit's own apps are new catalog rows with one of these. */
export type PhoneUnlock =
  | { kind: "start" }
  | { kind: "lessons"; count: number }
  | { kind: "unit"; unitId: string }
  | { kind: "level"; level: number }
  | { kind: "owns-shop-item" }
  /** Reserved: never installs (the Nuclear Map). */
  | { kind: "never" };

/** The theme colour role an app's tile is painted with (resolved to a real colour in the UI). */
export type PhoneColorRole = "blue" | "green" | "purple" | "yellow" | "orange" | "grey" | "cyan" | "red" | "coral";

export type PhoneAppId =
  | "chats"
  | "contacts"
  | "atomdex"
  | "daily-fact"
  | "settings"
  | "shop"
  | "field-notes"
  | "scanner"
  | "library"
  | "camera"
  | "safety"
  | "map";

export interface PhoneApp {
  id: PhoneAppId;
  name: string;
  /** Icon name for `components/ui/icon.tsx` (a library alias or an `Aq...` custom icon). */
  icon: string;
  color: PhoneColorRole;
  /** The route the icon pushes. */
  route: string;
  /** `planned` apps are never returned: they are in the catalog so the numbers are in one table. */
  status: "live" | "planned";
  unlock: PhoneUnlock;
}

/** The catalog, in grid order. Starting unlocks are a first draft to tune in playtest (§6). */
export const PHONE_APPS: readonly PhoneApp[] = [
  { id: "chats", name: "Chats", icon: "Message", color: "blue", route: "/phone-apps/chats", status: "live", unlock: { kind: "start" } },
  { id: "contacts", name: "Contacts", icon: "Profile2User", color: "green", route: "/phone-apps/contacts", status: "live", unlock: { kind: "start" } },
  { id: "atomdex", name: "AtomDex", icon: "Book", color: "purple", route: "/encyclopedia", status: "live", unlock: { kind: "start" } },
  { id: "daily-fact", name: "Daily Fact", icon: "Lamp", color: "yellow", route: "/daily-facts", status: "live", unlock: { kind: "start" } },
  { id: "settings", name: "Settings", icon: "Setting", color: "grey", route: "/settings", status: "live", unlock: { kind: "start" } },
  { id: "shop", name: "Shop", icon: "Shop", color: "orange", route: "/shop", status: "live", unlock: { kind: "lessons", count: 1 } },
  { id: "field-notes", name: "Field Notes", icon: "Note", color: "green", route: "/phone-apps/field-notes", status: "live", unlock: { kind: "lessons", count: 2 } },
  { id: "scanner", name: "Atom Scanner", icon: "Scan", color: "cyan", route: "/phone-apps/scanner", status: "live", unlock: { kind: "unit", unitId: "inside-the-atom" } },
  { id: "library", name: "Reference Library", icon: "Book1", color: "purple", route: "/phone-apps/library", status: "live", unlock: { kind: "level", level: 3 } },
  { id: "camera", name: "Camera", icon: "Camera", color: "coral", route: "/phone-apps/camera", status: "live", unlock: { kind: "owns-shop-item" } },
  { id: "safety", name: "Safety Guide", icon: "ShieldTick", color: "red", route: "/phone-apps/safety", status: "live", unlock: { kind: "unit", unitId: "radioactivity" } },
  { id: "map", name: "Nuclear Map", icon: "Map", color: "blue", route: "/phone-apps/map", status: "live", unlock: { kind: "level", level: 5 } },
];

/** What the unlock rules and badges read. The runtime builds it from the existing stores. */
export interface PhoneProgress {
  lessonsCompleted: number;
  /** Ids of the units the learner has finished. */
  unitsCompleted: readonly string[];
  /** The learner's level (a level is 100 XP). */
  level: number;
  /** Shop items owned that are not a starting design's. */
  shopItemsOwned: number;
}

export interface PhoneSignals {
  /** Today's daily fact has not been read. */
  dailyFactUnread: boolean;
  /** Unread messages in Chats. */
  unreadChats: number;
}

export const NO_PROGRESS: PhoneProgress = { lessonsCompleted: 0, unitsCompleted: [], level: 1, shopItemsOwned: 0 };

export function isUnlocked(unlock: PhoneUnlock, p: PhoneProgress): boolean {
  switch (unlock.kind) {
    case "start":
      return true;
    case "lessons":
      return p.lessonsCompleted >= unlock.count;
    case "unit":
      return p.unitsCompleted.includes(unlock.unitId);
    case "level":
      return p.level >= unlock.level;
    case "owns-shop-item":
      return p.shopItemsOwned > 0;
    case "never":
      return false;
  }
}

/** The apps the learner has, in catalog order. Planned apps are never in it. */
export function unlockedApps(p: PhoneProgress, catalog: readonly PhoneApp[] = PHONE_APPS): PhoneApp[] {
  return catalog.filter((app) => app.status === "live" && isUnlocked(app.unlock, p));
}

/** The unlocked apps whose install moment has not played. */
export function newApps(unlocked: readonly PhoneApp[], seen: ReadonlySet<string>): PhoneApp[] {
  return unlocked.filter((app) => !seen.has(app.id));
}

export type Badge = { kind: "count"; count: number } | { kind: "dot" } | null;

/**
 * The corner mark on an icon. `isNew` is an app installed and not opened yet; `enabled` is the Settings
 * "App badges" switch.
 */
export function badgeFor(appId: PhoneAppId, s: PhoneSignals, opts: { isNew: boolean; enabled: boolean }): Badge {
  if (!opts.enabled) return null;
  if (appId === "chats" && s.unreadChats > 0) return { kind: "count", count: s.unreadChats };
  if (appId === "daily-fact" && s.dailyFactUnread) return { kind: "dot" };
  if (opts.isNew) return { kind: "dot" };
  return null;
}

/** The accessibility text that goes with an icon's badge. */
export function badgeLabel(app: PhoneApp, badge: Badge): string {
  if (!badge) return app.name;
  if (badge.kind === "count") return `${app.name}, ${badge.count} unread`;
  if (app.id === "daily-fact") return `${app.name}, new AtomFact available`;
  return `${app.name}, new`;
}

/** Whether the Phone tab shows its dot: a new app waiting, an unread chat or an unread daily fact. */
export function tabDot(s: PhoneSignals, newCount: number, enabled: boolean): boolean {
  if (!enabled) return false;
  return newCount > 0 || s.unreadChats > 0 || s.dailyFactUnread;
}

export const APPS_PER_PAGE = 12;

/** The grid split into pages (twelve icons a page). */
export function pagesOf<T>(items: readonly T[], perPage: number = APPS_PER_PAGE): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage));
  return pages.length > 0 ? pages : [[]];
}

/** Grid columns for the window: three on a narrow window, four otherwise. */
export function gridColumns(windowWidth: number, denseBelowWidth = 360): number {
  return windowWidth < denseBelowWidth ? 3 : 4;
}

/** The apps to bring in during one visit: at most three, the rest wait for the next. */
export const INSTALLS_PER_VISIT = 3;

// ---- phone_seen -----------------------------------------------------------------------------------

export interface PhoneDb {
  runAsync(sql: string, params?: (string | number | null)[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
}

/** An app whose install moment has played, and whether the learner has opened it since. */
export interface SeenApp {
  appId: string;
  opened: boolean;
}

/** The SQL over `phone_seen`, with no framework in it so a test can run it on in-memory SQLite. */
export function createPhoneSeenStore(getDb: () => Promise<PhoneDb> | PhoneDb) {
  /** Record an app's install moment as played. `true` the first time. `opened` marks it opened too (no "New" dot). */
  async function markSeen(appId: string, now: number, opened = false): Promise<boolean> {
    const db = await getDb();
    const result = await db.runAsync("INSERT OR IGNORE INTO phone_seen (app_id, seen_at, opened_at, updated_at) VALUES (?,?,?,?)", [
      appId,
      now,
      opened ? now : null,
      now,
    ]);
    return result.changes > 0;
  }

  /** The learner opened the app: its "New" dot goes. Works for an app whose install moment never played. */
  async function markOpened(appId: string, now: number): Promise<void> {
    const db = await getDb();
    await db.runAsync("INSERT OR IGNORE INTO phone_seen (app_id, seen_at, opened_at, updated_at) VALUES (?,?,?,?)", [appId, now, now, now]);
    await db.runAsync("UPDATE phone_seen SET opened_at = ?, updated_at = ? WHERE app_id = ? AND opened_at IS NULL", [now, now, appId]);
  }

  /** The apps whose install moment has played. */
  async function listSeen(): Promise<SeenApp[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ app_id: string; opened_at: number | null }>(
      "SELECT app_id, opened_at FROM phone_seen WHERE deleted_at IS NULL",
    );
    return rows.map((r) => ({ appId: r.app_id, opened: r.opened_at !== null }));
  }

  return { markSeen, markOpened, listSeen };
}
