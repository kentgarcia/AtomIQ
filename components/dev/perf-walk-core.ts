/**
 * The auto-walk (docs/features/RENDER_COST_SPEC.md A5), as pure data: the screens it opens, in order, twice (a first open, then a
 * revisit), and how long each is held. The runtime is `perf-walk.ts`. One tap on the probe walks all of it and shares the report, so
 * nobody has to remember a route or wait on Home.
 */

export interface WalkStop {
  /** What the report calls it. */
  name: string;
  href: string;
  /** A tab is switched to; anything else is pushed over the tabs and closed again. */
  kind: "tab" | "push";
}

export const WALK_STOPS: readonly WalkStop[] = [
  { name: "Feed", href: "/(tabs)/community", kind: "tab" },
  { name: "Phone", href: "/(tabs)/phone", kind: "tab" },
  { name: "Quests", href: "/(tabs)/quests", kind: "tab" },
  { name: "Profile", href: "/(tabs)/profile", kind: "tab" },
  { name: "Games", href: "/(tabs)/awards", kind: "tab" },
  { name: "Shop", href: "/shop", kind: "push" },
  { name: "Encyclopedia", href: "/encyclopedia", kind: "push" },
  { name: "Chats", href: "/phone-apps/chats", kind: "push" },
  { name: "Contacts", href: "/phone-apps/contacts", kind: "push" },
  { name: "Settings", href: "/settings", kind: "push" },
];

/** How long a screen is held open: long enough for its first frames, its hitch and the settle after it. */
export const HOLD_FIRST_MS = 2600;
export const HOLD_AGAIN_MS = 1800;
/** After a stop, before the next one: lets the half-second window that held the stop's last frames be read, so it does not count for the next. */
export const FLUSH_MS = 700;

export interface WalkPlanStep {
  stop: WalkStop;
  /** 1: first open. 2: revisit. */
  visit: number;
  holdMs: number;
}

/** Every stop once, then every stop again (a revisit is the cost of coming back to a screen that is already built). */
export const walkPlan = (stops: readonly WalkStop[] = WALK_STOPS): WalkPlanStep[] => [
  ...stops.map((stop) => ({ stop, visit: 1, holdMs: HOLD_FIRST_MS })),
  ...stops.map((stop) => ({ stop, visit: 2, holdMs: HOLD_AGAIN_MS })),
];

/** Time the walk takes without the navigation itself, for the button's label. */
export const walkSeconds = (plan: readonly WalkPlanStep[] = walkPlan()): number =>
  Math.round(plan.reduce((sum, s) => sum + s.holdMs + FLUSH_MS, 0) / 1000);
