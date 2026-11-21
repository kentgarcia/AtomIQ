/**
 * Shrodi's tour, the framework-free part (docs/features/TUTORIAL_SPEC.md): the catalog of beats, which beat comes
 * next, how an interrupted tour is picked up again, who skips what, and the SQL of `tutorial_steps`.
 * No React and no storage, so `scripts/test-tutorial.mjs` runs it under Node. The overlay is in
 * `components/tutorial/`, the runtime glue in `services/tutorial.ts`.
 *
 * What is stored is only the tour's own steps (a beat is written the moment its real action happens).
 * Everything else, "is lesson 1 finished", "which beat is current", is derived each time.
 */

/** Where a beat shows. The layer shows a beat only on its own screen. */
export type ScreenId = "home" | "feed" | "phone" | "chats" | "quests" | "profile" | "shop" | "games" | "story-map";

/** Which layer draws a beat: the one in the root layout, or the one inside the lesson preview's modal. */
export type TutorialHost = "root" | "preview";

/** What the learner did on a real control (reported by that screen), or got from the route. */
export type TutorialEvent =
  | "node-bubble-opened"
  | "preview-opened"
  | "lesson-started"
  | "tab-feed-opened"
  | "tab-phone-opened"
  | "app-opened:chats"
  | "story-thread-opened";

/** A lit thing. Each is declared by one `useTutorialTarget` in source (`check:tutorial` keeps both lists equal). */
export type TargetId =
  | "home.node.current"
  | "home.bubble.button"
  | "home.preview.start"
  | "tab.feed"
  | "tab.phone"
  | "phone.app.chats"
  | "chats.story";

export type TutorialMood = "idle" | "wave" | "happy" | "cheer" | "think" | "oops" | "wow" | "smile";

export interface Beat {
  /** Never renamed or reused once shipped: it is the stored key. */
  id: string;
  screen: ScreenId;
  host: TutorialHost;
  /** What is lit. No target: Shrodi alone, centred, no hole. */
  target?: TargetId;
  /** At most `MAX_WORDS` words. */
  say: string;
  mood: TutorialMood;
  /** `tap`: the learner presses the real control (`until`). `look`: Shrodi's "Got it". */
  mode: "tap" | "look";
  until?: TutorialEvent;
  /** False when the lit thing is transient (a bubble, a preview): a resume goes back to the last stable beat. */
  stable: boolean;
}

export interface Chapter {
  id: string;
  beats: readonly Beat[];
  /** The chapter that must be done first (`null`: starts after onboarding). */
  after: string | null;
  /** A progress fact that ends the chapter once true, however the beats went. */
  goal?: "first-lesson-done";
}

export interface Intro {
  id: string;
  screen: ScreenId;
  beats: readonly Beat[];
}

export const MAX_WORDS = 12;
/** The story thread the tour sends the learner to: Shrodi's message when the first lesson is finished (`chat_nodes`, trigger `lessons_completed:1`). */
export const TOUR_STORY_EVENT = "lessons_completed:1";
export const MAX_CHAPTER_BEATS = 3;
export const MAX_INTRO_BEATS = 3;
/** Pays once, in diamonds, when the guided tour is finished (not skipped). */
export const TOUR_REWARD_DIAMONDS = 10;

const beat = (b: Beat): Beat => b;

export const CHAPTERS: readonly Chapter[] = [
  {
    id: "first-lesson",
    after: null,
    goal: "first-lesson-done",
    beats: [
      beat({ id: "first-lesson.node", screen: "home", host: "root", target: "home.node.current", say: "This is your path. Tap the first circle!", mood: "wave", mode: "tap", until: "node-bubble-opened", stable: true }),
      beat({ id: "first-lesson.bubble", screen: "home", host: "root", target: "home.bubble.button", say: "Press it to peek inside.", mood: "happy", mode: "tap", until: "preview-opened", stable: false }),
      beat({ id: "first-lesson.start", screen: "home", host: "preview", target: "home.preview.start", say: "Start your first lesson!", mood: "cheer", mode: "tap", until: "lesson-started", stable: false }),
    ],
  },
  {
    id: "feed",
    after: "first-lesson",
    beats: [
      beat({ id: "feed.tab", screen: "home", host: "root", target: "tab.feed", say: "Nice! Your teachers noticed. See what they posted.", mood: "happy", mode: "tap", until: "tab-feed-opened", stable: true }),
      // A look beat, not a tap: the reaction pill sits in the feed list, which has to be scrolled to on a small screen or large text, and
      // the learner cannot scroll while only the lit control works. So the tour just says that posts arrive over time.
      beat({ id: "feed.new-posts", screen: "feed", host: "root", say: "Teachers post here from time to time. Come back often!", mood: "happy", mode: "look", stable: true }),
    ],
  },
  {
    id: "phone",
    after: "feed",
    beats: [
      beat({ id: "phone.tab", screen: "feed", host: "root", target: "tab.phone", say: "Now check your phone.", mood: "wave", mode: "tap", until: "tab-phone-opened", stable: true }),
      beat({ id: "phone.chats", screen: "phone", host: "root", target: "phone.app.chats", say: "Your chats live here. Tap Chats!", mood: "wow", mode: "tap", until: "app-opened:chats", stable: true }),
      beat({ id: "phone.story", screen: "chats", host: "root", target: "chats.story", say: "I wrote to you! Open it.", mood: "wave", mode: "tap", until: "story-thread-opened", stable: true }),
    ],
  },
];

/**
 * Screen intros (a few beats the first time a screen is opened). There are none now: Quests, Profile, the Shop, Games and the Atom Maze map
 * had one each and were removed (2026-11-22); only the three chapters above guide the learner. The machinery stays (`introBeat`, `pickBeat`,
 * the replay rows) so a screen can get one again by adding an entry here and one `useTutorialTarget` per beat.
 */
export const INTROS: readonly Intro[] = [];

/* ---- what is recorded --------------------------------------------------------------------------- */

export type StepStatus = "done" | "skipped";
export type Steps = ReadonlyMap<string, StepStatus>;

/** Marker rows. They are not beats: they say how the tour ended. */
export const MARK_REWARD = "tutorial.reward";
export const MARK_SKIPPED = "tutorial.skipped";
export const MARK_LEGACY = "tutorial.legacy";
/** The tabs are open for good: written when the tour is finished, skipped, or an existing learner is let in. */
export const MARK_FREE = "tutorial.free";

export const stepsOf = (rows: readonly { stepId: string; status: StepStatus }[]): Steps => new Map(rows.map((r) => [r.stepId, r.status]));

/** The facts the rules read about the learner. */
export interface TutorialProgress {
  onboardingDone: boolean;
  /** Finished lessons (replays are not counted twice). */
  lessonsCompleted: number;
  /** The first lesson of the first unit is finished. */
  firstLessonDone: boolean;
}

export const NO_TUTORIAL_PROGRESS: TutorialProgress = { onboardingDone: false, lessonsCompleted: 0, firstLessonDone: false };

/* ---- chapters ------------------------------------------------------------------------------------ */

export type ChapterState = "done" | "active" | "waiting-goal" | "locked";

const recorded = (steps: Steps, id: string) => steps.has(id);

export function goalMet(chapter: Chapter, progress: TutorialProgress): boolean {
  return chapter.goal === "first-lesson-done" ? progress.firstLessonDone : false;
}

/** A chapter is done when its goal is true, or every beat is recorded (and it has no goal). */
export function chapterState(chapter: Chapter, steps: Steps, progress: TutorialProgress): ChapterState {
  // A learner who skipped, or was let in as an existing one, is done with every chapter, whatever beats were added since
  if (recorded(steps, MARK_SKIPPED) || recorded(steps, MARK_LEGACY)) return "done";
  if (goalMet(chapter, progress)) return "done";
  const allBeats = chapter.beats.every((b) => recorded(steps, b.id));
  if (allBeats) return chapter.goal ? "waiting-goal" : "done";
  const prior = chapter.after ? CHAPTERS.find((c) => c.id === chapter.after) : undefined;
  if (prior && chapterState(prior, steps, progress) !== "done") return "locked";
  if (!prior && !progress.onboardingDone) return "locked";
  return "active";
}

/** True once a chapter has at least one beat recorded and is not finished: a screen intro stays out of the way. */
function chapterStarted(chapter: Chapter, steps: Steps, progress: TutorialProgress): boolean {
  const state = chapterState(chapter, steps, progress);
  return (state === "active" || state === "waiting-goal") && chapter.beats.some((b) => recorded(steps, b.id));
}

/** The first beat of the first unfinished chapter, or null. The layer shows it only on the beat's own screen. */
export function chapterBeat(steps: Steps, progress: TutorialProgress): Beat | null {
  for (const chapter of CHAPTERS) {
    const state = chapterState(chapter, steps, progress);
    if (state === "done") continue;
    if (state !== "active") return null; // waiting for its goal, or not yet its turn
    return chapter.beats.find((b) => !recorded(steps, b.id)) ?? null;
  }
  return null;
}

/** The beat of the first screen intro for `screen` that still has one, when intros are allowed. */
export function introBeat(steps: Steps, progress: TutorialProgress, screen: ScreenId): Beat | null {
  if (!progress.onboardingDone) return null;
  const first = CHAPTERS[0];
  if (chapterState(first, steps, progress) !== "done") return null;
  if (CHAPTERS.some((c) => chapterStarted(c, steps, progress))) return null;
  const intro = INTROS.find((i) => i.screen === screen);
  return intro?.beats.find((b) => !recorded(steps, b.id)) ?? null;
}

export interface Pick {
  beat: Beat;
  kind: "chapter" | "intro";
  /** 1-based place in its chapter or intro, and the count, for the progress dots. */
  index: number;
  total: number;
}

/**
 * The beat to show now. A chapter's beat wins whatever the screen (the layer then waits for its screen);
 * otherwise the intro of `screen`. `enabled` false (Tips off) shows nothing.
 */
export function pickBeat(steps: Steps, progress: TutorialProgress, screen: ScreenId | null, enabled: boolean): Pick | null {
  if (!enabled || !progress.onboardingDone) return null;
  const chapterNext = chapterBeat(steps, progress);
  if (chapterNext) {
    const chapter = CHAPTERS.find((c) => c.beats.some((b) => b.id === chapterNext.id))!;
    return { beat: chapterNext, kind: "chapter", index: chapter.beats.indexOf(chapterNext) + 1, total: chapter.beats.length };
  }
  if (!screen) return null;
  const introNext = introBeat(steps, progress, screen);
  if (!introNext) return null;
  const intro = INTROS.find((i) => i.beats.some((b) => b.id === introNext.id))!;
  return { beat: introNext, kind: "intro", index: intro.beats.indexOf(introNext) + 1, total: intro.beats.length };
}

/**
 * Where a resume lands. A beat whose lit thing is transient (an open bubble, a preview) cannot be recreated after the
 * app was killed or the thing was closed, so while the next beat of an unfinished chapter is unstable the tour steps
 * back: the beat before it is forgotten (returned here, so the runtime can delete the rows) until the next beat is a
 * stable one. A chapter that has shown every beat (waiting for its goal) is left alone.
 */
export function resumeAdjust(steps: Steps, progress: TutorialProgress): string[] {
  const forget: string[] = [];
  for (const chapter of CHAPTERS) {
    if (chapterState(chapter, steps, progress) !== "active") continue;
    let next = chapter.beats.findIndex((b) => !recorded(steps, b.id));
    while (next > 0 && !chapter.beats[next].stable) {
      next -= 1;
      forget.push(chapter.beats[next].id);
    }
  }
  return forget;
}

/* ---- skipping, existing learners, the reward ----------------------------------------------------- */

const allChapterBeats = () => CHAPTERS.flatMap((c) => c.beats.map((b) => b.id));

/** Skip tour: every unrecorded chapter beat is recorded as skipped, with the marker that stops the reward and the redirect. */
export function skipTourRows(steps: Steps): string[] {
  return [...allChapterBeats().filter((id) => !recorded(steps, id)), ...[MARK_SKIPPED, MARK_FREE].filter((m) => !recorded(steps, m))];
}

/**
 * An existing learner (onboarded, at least one lesson finished, no tour row yet) has the chapters recorded as
 * skipped so the tour never starts. The screen intros still show once. Returns the rows to write.
 */
export function legacyRows(steps: Steps, progress: TutorialProgress): string[] {
  if (steps.size > 0 || !progress.onboardingDone || progress.lessonsCompleted < 1) return [];
  return [...allChapterBeats(), MARK_LEGACY, MARK_SKIPPED, MARK_FREE];
}

/** True when the guided tour was finished by playing it and its reward has not been paid. */
export function rewardDue(steps: Steps, progress: TutorialProgress): boolean {
  if (recorded(steps, MARK_REWARD) || recorded(steps, MARK_SKIPPED) || recorded(steps, MARK_LEGACY)) return false;
  return CHAPTERS.every((c) => chapterState(c, steps, progress) === "done");
}

/** Replay the tour: the chapter rows and markers go (the reward row stays, so a replay never pays twice). */
export function replayChapterRows(steps: Steps): string[] {
  return [...allChapterBeats().filter((id) => recorded(steps, id)), ...[MARK_SKIPPED, MARK_LEGACY].filter((m) => recorded(steps, m))];
}

/* ---- the tabs ------------------------------------------------------------------------------------ */

/** The tab routes of `app/(tabs)`. Home is never locked. */
export type TabName = "index" | "quests" | "community" | "phone" | "awards" | "profile";

/**
 * Every tab is open once the tour is over: finished, skipped, or an existing learner. Tips off opens them too (a switched-off
 * tour must not lock anything), and so does a replay (it writes `MARK_FREE` first).
 */
export function tabsFree(steps: Steps, progress: TutorialProgress, enabled: boolean): boolean {
  if (!progress.onboardingDone || !enabled) return true;
  if (recorded(steps, MARK_FREE) || recorded(steps, MARK_SKIPPED) || recorded(steps, MARK_LEGACY)) return true;
  return CHAPTERS.every((c) => chapterState(c, steps, progress) === "done");
}

/**
 * Whether a tab is locked. During the tour only Home is open at first; the Feed opens when the first lesson is finished (its
 * chapter's turn) and the Phone when the Feed chapter is done (the Phone chapter's turn). The rest open with the tour's end.
 */
export function tabLocked(tab: TabName, steps: Steps, progress: TutorialProgress, enabled: boolean): boolean {
  if (tab === "index" || tabsFree(steps, progress, enabled)) return false;
  if (tab === "community") return chapterState(CHAPTERS.find((c) => c.id === "feed")!, steps, progress) === "locked";
  if (tab === "phone") return chapterState(CHAPTERS.find((c) => c.id === "phone")!, steps, progress) === "locked";
  return true;
}

/** What a locked tab says when it is pressed. */
export function tabLockHint(progress: TutorialProgress): string {
  return progress.firstLessonDone ? "Follow Shrodi's tour to unlock this tab." : "Complete your first lesson to unlock this tab.";
}

/** True when the tour is over and the "free" marker is not written yet. */
export function freeRowDue(steps: Steps, progress: TutorialProgress): boolean {
  return progress.onboardingDone && !recorded(steps, MARK_FREE) && CHAPTERS.every((c) => chapterState(c, steps, progress) === "done");
}

/** Show the screen intros again. */
export function replayIntroRows(steps: Steps): string[] {
  return INTROS.flatMap((i) => i.beats.map((b) => b.id)).filter((id) => recorded(steps, id));
}

/* ---- the lesson redirect ------------------------------------------------------------------------- */

/** A cold start, or coming back after this long away, may redirect again. */
export const REDIRECT_AWAY_MS = 5 * 60 * 1000;

/**
 * Whether to send the learner back into lesson 1: the chapter has shown every beat and is waiting for the lesson to
 * finish, the tour is on and was not skipped, and it has not already done so this session.
 */
export function shouldRedirectToLesson(opts: { steps: Steps; progress: TutorialProgress; enabled: boolean; redirectedThisSession: boolean }): boolean {
  const { steps, progress, enabled, redirectedThisSession } = opts;
  if (!enabled || redirectedThisSession || recorded(steps, MARK_SKIPPED) || !progress.onboardingDone) return false;
  return chapterState(CHAPTERS[0], steps, progress) === "waiting-goal";
}

/** Whether coming back to the foreground counts as a new session. */
export const isNewSession = (awayMs: number): boolean => awayMs >= REDIRECT_AWAY_MS;

/* ---- where things are --------------------------------------------------------------------------- */

/** A pathname as the tour reads it: groups such as `/(tabs)` dropped (as the Android back policy does), no trailing slash, "/" for the root. */
export function normalizePath(pathname: string | null | undefined): string {
  const p = (pathname ?? "")
    .replace(/\/\([^/]+\)/g, "")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
  return p === "" ? "/" : p;
}

/** The screen a route is, for the screens the tour knows (a tab root, the shop, the Atom Maze map), else null. */
export function screenOfPath(pathname: string | null | undefined): ScreenId | null {
  if (pathname === null || pathname === undefined) return null;
  const p = normalizePath(pathname);
  switch (p) {
    case "/":
    case "/index":
      return "home";
    case "/community":
      return "feed";
    case "/phone":
      return "phone";
    case "/phone-apps/chats":
      return "chats";
    case "/quests":
      return "quests";
    case "/profile":
      return "profile";
    case "/awards":
      return "games";
    case "/shop":
      return "shop";
    case "/explorer/story":
      return "story-map";
    default:
      return null;
  }
}

/** Routes where the tour never draws: a lesson run, practice, a game level, onboarding, the dev screens. */
export function isQuietPath(pathname: string | null | undefined): boolean {
  const p = normalizePath(pathname);
  return /^\/(lesson|practice|quiz|mythbuster|onboarding|explorer\/platformer)(\/|$)/.test(p);
}

interface NodeLike {
  id: string;
  unitId: string;
  position: number;
  kind: string;
  lessonId?: string;
}

/** The first lesson of the first unit: the one the tour sends the learner to. */
export function firstLessonNodeOf(units: readonly { id: string; position: number }[], nodes: readonly NodeLike[]): NodeLike | null {
  const ordered = [...units].sort((a, b) => a.position - b.position);
  for (const unit of ordered) {
    const lessons = nodes.filter((n) => n.unitId === unit.id && n.kind === "lesson" && n.lessonId).sort((a, b) => a.position - b.position);
    if (lessons.length > 0) return lessons[0];
  }
  return null;
}

/* ---- the SQL of `tutorial_steps` ----------------------------------------------------------------- */

export interface TutorialDb {
  runAsync(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

export function createTutorialStore(getDb: () => Promise<TutorialDb> | TutorialDb) {
  /** Record a step. A step already recorded as done is never downgraded. `true` when a row was written. */
  async function record(stepId: string, status: StepStatus, now: number): Promise<boolean> {
    const db = await getDb();
    const result = await db.runAsync("INSERT OR IGNORE INTO tutorial_steps (step_id, status, at, updated_at) VALUES (?,?,?,?)", [stepId, status, now, now]);
    return result.changes > 0;
  }

  async function recordMany(stepIds: readonly string[], status: StepStatus, now: number): Promise<void> {
    for (const id of stepIds) await record(id, status, now);
  }

  async function forget(stepIds: readonly string[]): Promise<void> {
    const db = await getDb();
    for (const id of stepIds) await db.runAsync("DELETE FROM tutorial_steps WHERE step_id = ?", [id]);
  }

  async function list(): Promise<{ stepId: string; status: StepStatus }[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ step_id: string; status: string }>("SELECT step_id, status FROM tutorial_steps WHERE deleted_at IS NULL");
    return rows.map((r) => ({ stepId: r.step_id, status: r.status === "skipped" ? "skipped" : "done" }));
  }

  return { record, recordMany, forget, list };
}

/** The table, kept here so the test and `services/local-first/schema.ts` cannot drift apart. */
export const TUTORIAL_STEPS_SQL = `CREATE TABLE IF NOT EXISTS tutorial_steps (
  step_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT 0,
  synced_at INTEGER,
  is_dirty INTEGER DEFAULT 1,
  deleted_at INTEGER,
  version INTEGER DEFAULT 1
);`;

/* ---- validation (used by the test) --------------------------------------------------------------- */

export const wordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;
export const allBeats = (): Beat[] => [...CHAPTERS.flatMap((c) => c.beats), ...INTROS.flatMap((i) => i.beats)];
