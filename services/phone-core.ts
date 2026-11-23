/**
 * The phone's rules (docs/features/PHONE_SPEC.md §4 to §6), framework-free so `scripts/test-phone.mjs` can run
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
  /** A single lesson finished: an app that belongs to what that lesson teaches (Build an Atom with "Meet the atom"). */
  | { kind: "lesson"; lessonId: string }
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
  | "map"
  | "mythbuster"
  | "atom-maze"
  | "lab-build-atom"
  | "lab-decay"
  | "lab-shield";

export interface PhoneApp {
  id: PhoneAppId;
  name: string;
  /** Icon name for `components/ui/icon.tsx` (a library alias or an `Aq...` custom icon). */
  icon: string;
  color: PhoneColorRole;
  /** The route the icon pushes. */
  route: string;
  /** Apps of one group start in one folder on the home screen (the games). */
  group?: "games";
  /** `planned` apps are never returned: they are in the catalog so the numbers are in one table. */
  status: "live" | "planned";
  unlock: PhoneUnlock;
}

/**
 * The catalog, in PROGRESSION order: the order the apps arrive as the learner learns, which is also the order of the home screen until
 * the learner arranges it themselves (`phone-layout-core.ts`). The starting apps are five (the hand-over), and every app after them
 * arrives with the lesson, unit or level it belongs to: a game with what it practises, a tool with the moment it becomes useful.
 * The lesson ids are the ones in `content/source/units/*`; first draft to tune in playtest (§6).
 */
export const PHONE_APPS: readonly PhoneApp[] = [
  { id: "chats", name: "Chats", icon: "Message", color: "blue", route: "/phone-apps/chats", status: "live", unlock: { kind: "start" } },
  { id: "contacts", name: "Contacts", icon: "Profile2User", color: "green", route: "/phone-apps/contacts", status: "live", unlock: { kind: "start" } },
  { id: "atomdex", name: "AtomDex", icon: "Book", color: "purple", route: "/encyclopedia", status: "live", unlock: { kind: "start" } },
  { id: "daily-fact", name: "Daily Fact", icon: "Lamp", color: "yellow", route: "/daily-facts", status: "live", unlock: { kind: "start" } },
  { id: "settings", name: "Settings", icon: "Setting", color: "grey", route: "/settings", status: "live", unlock: { kind: "start" } },
  // The games: Atom Maze with the first lesson (its first levels replay it), each lab with the lesson that teaches what it shows
  { id: "atom-maze", name: "Atom Maze", icon: "Grid9", color: "blue", route: "/explorer/story", group: "games", status: "live", unlock: { kind: "lesson", lessonId: "atoms-are-everywhere" } },
  { id: "shop", name: "Shop", icon: "Shop", color: "orange", route: "/shop", status: "live", unlock: { kind: "lessons", count: 2 } },
  { id: "lab-build-atom", name: "Build an Atom", icon: "AqAtom", color: "green", route: "/lab?exp=build-atom", group: "games", status: "live", unlock: { kind: "lesson", lessonId: "protons-neutrons-electrons" } },
  { id: "field-notes", name: "Field Notes", icon: "Note", color: "green", route: "/phone-apps/field-notes", status: "live", unlock: { kind: "lessons", count: 3 } },
  { id: "mythbuster", name: "Myth Buster", icon: "Judge", color: "purple", route: "/mythbuster", group: "games", status: "live", unlock: { kind: "lesson", lessonId: "isotopes" } },
  { id: "scanner", name: "Atom Scanner", icon: "Scan", color: "cyan", route: "/phone-apps/scanner", status: "live", unlock: { kind: "unit", unitId: "inside-the-atom" } },
  { id: "library", name: "Reference Library", icon: "Book1", color: "purple", route: "/phone-apps/library", status: "live", unlock: { kind: "level", level: 3 } },
  { id: "camera", name: "Camera", icon: "Camera", color: "coral", route: "/phone-apps/camera", status: "live", unlock: { kind: "owns-shop-item" } },
  { id: "lab-decay", name: "Decay Lab", icon: "AqUnstable", color: "orange", route: "/lab?exp=decay-lab", group: "games", status: "live", unlock: { kind: "lesson", lessonId: "half-life" } },
  { id: "safety", name: "Safety Guide", icon: "ShieldTick", color: "red", route: "/phone-apps/safety", status: "live", unlock: { kind: "unit", unitId: "radioactivity" } },
  { id: "lab-shield", name: "Radiation Shield", icon: "ShieldTick", color: "cyan", route: "/lab?exp=radiation-shield", group: "games", status: "live", unlock: { kind: "lesson", lessonId: "what-stops-what" } },
  { id: "map", name: "Nuclear Map", icon: "Map", color: "blue", route: "/phone-apps/map", status: "live", unlock: { kind: "level", level: 5 } },
];

/** What the unlock rules and badges read. The runtime builds it from the existing stores. */
export interface PhoneProgress {
  lessonsCompleted: number;
  /** Ids of the units the learner has finished. */
  unitsCompleted: readonly string[];
  /** Ids of the lessons the learner has finished. */
  lessonsDone: readonly string[];
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

export const NO_PROGRESS: PhoneProgress = { lessonsCompleted: 0, unitsCompleted: [], lessonsDone: [], level: 1, shopItemsOwned: 0 };

export function isUnlocked(unlock: PhoneUnlock, p: PhoneProgress): boolean {
  switch (unlock.kind) {
    case "start":
      return true;
    case "lessons":
      return p.lessonsCompleted >= unlock.count;
    case "unit":
      return p.unitsCompleted.includes(unlock.unitId);
    case "lesson":
      return (p.lessonsDone ?? []).includes(unlock.lessonId);
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

/** The live apps the learner does not have yet, in catalog order (shown on the home screen behind a lock). */
export function lockedApps(p: PhoneProgress, catalog: readonly PhoneApp[] = PHONE_APPS): PhoneApp[] {
  return catalog.filter((app) => app.status === "live" && !isUnlocked(app.unlock, p));
}

/** What a locked app asks for: the condition, and where the learner stands on it (null when there is no count). */
export interface UnlockRequirement {
  text: string;
  progress: string | null;
}

/** The words of an unlock condition for the dialog a locked icon opens. `unitTitleOf` names a unit by its id. */
export function unlockRequirement(
  unlock: PhoneUnlock,
  p: PhoneProgress,
  unitTitleOf: (unitId: string) => string | undefined = () => undefined,
  lessonTitleOf: (lessonId: string) => string | undefined = () => undefined,
): UnlockRequirement {
  switch (unlock.kind) {
    case "start":
      return { text: "This app is already on your phone.", progress: null };
    case "lessons": {
      const text = unlock.count === 1 ? "Finish your first lesson." : `Finish ${unlock.count} lessons.`;
      return { text, progress: `${Math.min(p.lessonsCompleted, unlock.count)} of ${unlock.count} lessons finished` };
    }
    case "unit": {
      const title = unitTitleOf(unlock.unitId);
      return { text: title ? `Finish the unit "${title}".` : "Finish a certain unit.", progress: null };
    }
    case "lesson": {
      const title = lessonTitleOf(unlock.lessonId);
      return { text: title ? `Finish the lesson "${title}".` : "Finish a certain lesson.", progress: null };
    }
    case "level":
      return { text: `Reach level ${unlock.level}.`, progress: `You are level ${p.level}` };
    case "owns-shop-item":
      return { text: "Get any item from the Shop.", progress: null };
    case "never":
      return { text: "This app is coming in a later update.", progress: null };
  }
}

/** The unlocked apps whose install moment has not played. */
export function newApps(unlocked: readonly PhoneApp[], seen: ReadonlySet<string>): PhoneApp[] {
  return unlocked.filter((app) => !seen.has(app.id));
}

export type Badge = { kind: "count"; count: number } | { kind: "dot" } | null;

/** What an icon looks like: everything that changes its picture, and nothing that is only a handler. */
export interface IconView {
  app: unknown;
  size: number;
  label: string;
  locked?: boolean;
  badge: Badge;
  install?: { delay: number; newDot: boolean };
}

const sameBadge = (a: Badge, b: Badge): boolean => a === b || (a !== null && b !== null && a.kind === b.kind && (a.kind !== "count" || (b.kind === "count" && a.count === b.count)));

/**
 * Whether two renders of an icon look the same, so the second can be skipped. The Phone tab re-renders several times per visit (focus,
 * the progress read, the install batch) and builds a new press handler each time; comparing only what is drawn keeps every icon (an SVG
 * picture each) from re-rendering for nothing. The badge is compared by value: `badgeOf` builds a new object each call.
 */
export const sameIconView = (a: IconView, b: IconView): boolean =>
  a.app === b.app &&
  a.size === b.size &&
  a.label === b.label &&
  (a.locked ?? false) === (b.locked ?? false) &&
  sameBadge(a.badge, b.badge) &&
  (a.install === undefined) === (b.install === undefined) &&
  a.install?.delay === b.install?.delay &&
  a.install?.newDot === b.install?.newDot;

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

/**
 * How many rows of icons a page holds for the room it has: as many as fit (`rowHeight` is an icon, its name and the gap under it),
 * never fewer than three and never more than six, so a tall phone shows more icons on a page and a short one scrolls to the next.
 */
export function gridRows(availableHeight: number, rowHeight: number, min = 3, max = 6): number {
  if (!(rowHeight > 0) || !Number.isFinite(availableHeight)) return min;
  return Math.max(min, Math.min(max, Math.floor(availableHeight / rowHeight)));
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
