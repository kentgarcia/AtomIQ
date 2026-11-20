/**
 * Shrodi's tour, the runtime (docs/features/TUTORIAL_SPEC.md): one small store the overlay and the screens share.
 * It reads the tour's steps from `tutorial_steps`, the learner's progress from the stores the app already
 * has, and tells listeners when something changed. The rules are in `services/tutorial-core.ts`.
 *
 * Nothing here throws: a failed read means "no tour", a failed write is logged and the step is still
 * remembered for this session. Writes go through one queue, so a quick succession cannot land out of order.
 * `emitTutorial` is the hook the screens call at the choke point of a real action, in the manner of the
 * feed's `emit*`: one line, does nothing when the tour is off or the event is not the current beat's.
 */

import { AppState, type AppStateStatus } from "react-native";

import { getDatabase } from "@/services/database";
import { loadPathSnapshot } from "@/services/path-snapshot";
import { countCompletedLessons } from "@/services/path-core";
import { getOnboardingCompleted, getTutorialEnabled, subscribeTutorialEnabled } from "@/services/storage";
import {
  MARK_FREE,
  MARK_REWARD,
  NO_TUTORIAL_PROGRESS,
  TOUR_REWARD_DIAMONDS,
  createTutorialStore,
  firstLessonNodeOf,
  freeRowDue,
  isNewSession,
  legacyRows,
  pickBeat,
  replayChapterRows,
  replayIntroRows,
  resumeAdjust,
  rewardDue,
  shouldRedirectToLesson,
  skipTourRows,
  stepsOf,
  type Pick,
  type ScreenId,
  type StepStatus,
  type Steps,
  type TutorialDb,
  type TutorialEvent,
  type TutorialProgress,
} from "@/services/tutorial-core";
import { addDiamonds } from "@/services/wallet";

const store = createTutorialStore(() => getDatabase() as unknown as TutorialDb);

export interface TutorialSnapshot {
  /** False until the first read finishes: nothing shows meanwhile. */
  loaded: boolean;
  steps: Steps;
  progress: TutorialProgress;
  /** The "Tips from Shrodi" switch. */
  enabled: boolean;
  /** The tour's screen the route is on, or null. */
  screen: ScreenId | null;
  /** How many things (dialogs, a held install moment) want the overlay out of the way. */
  busy: number;
  /** Who they are, for the development log. */
  busyBy: readonly string[];
  /** When `busy` last fell to 0 (ms), so the overlay can wait a moment before it returns. */
  busyClearedAt: number;
  /** Counts up on every change. */
  version: number;
}

let snapshot: TutorialSnapshot = {
  loaded: false,
  steps: new Map(),
  progress: NO_TUTORIAL_PROGRESS,
  enabled: true,
  screen: null,
  busy: 0,
  busyBy: [],
  busyClearedAt: 0,
  version: 0,
};

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeTutorial(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getTutorialSnapshot = (): TutorialSnapshot => snapshot;

function set(patch: Partial<TutorialSnapshot>): void {
  snapshot = { ...snapshot, ...patch, version: snapshot.version + 1 };
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // A listener's failure never stops the others.
    }
  });
}

/* ---- writes ------------------------------------------------------------------------------------- */

let queue: Promise<unknown> = Promise.resolve();
function enqueue(task: () => Promise<unknown>): Promise<void> {
  const next = queue.then(task).then(
    () => undefined,
    (error) => {
      console.warn("[tutorial] write", error);
    },
  );
  queue = next;
  return next;
}

/** Record steps now in memory and in the database. */
function recordSteps(ids: readonly string[], status: StepStatus): Promise<void> {
  if (ids.length === 0) return Promise.resolve();
  const steps = new Map(snapshot.steps);
  for (const id of ids) if (!steps.has(id)) steps.set(id, status);
  set({ steps });
  return enqueue(() => store.recordMany(ids, status, Date.now()));
}

function forgetSteps(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return Promise.resolve();
  const steps = new Map(snapshot.steps);
  for (const id of ids) steps.delete(id);
  set({ steps });
  return enqueue(() => store.forget(ids));
}

/* ---- reading ------------------------------------------------------------------------------------ */

let firstLesson: { nodeId: string; lessonId: string } | null = null;
let resumed = false;

/** What the rules read about the learner. Never rejects: a failed read is "nothing done yet". */
export async function loadTutorialProgress(): Promise<TutorialProgress> {
  let onboardingDone = false;
  try {
    onboardingDone = await getOnboardingCompleted();
  } catch (error) {
    console.warn("[tutorial] onboarding flag", error);
  }
  if (!onboardingDone) return NO_TUTORIAL_PROGRESS;
  try {
    const { units, nodes, state } = await loadPathSnapshot();
    const first = firstLessonNodeOf(units, nodes);
    firstLesson = first && first.lessonId ? { nodeId: first.id, lessonId: first.lessonId } : null;
    return {
      onboardingDone,
      lessonsCompleted: countCompletedLessons(nodes, state),
      firstLessonDone: first ? state.nodes[first.id] === "completed" : false,
    };
  } catch (error) {
    // The path could not be read: the learner is still onboarded (the tour starts at the first lesson), and a later read fixes the rest
    console.warn("[tutorial] progress", error);
    return snapshot.progress.onboardingDone ? snapshot.progress : { ...NO_TUTORIAL_PROGRESS, onboardingDone: true };
  }
}

let loading: Promise<void> | null = null;

/** Read everything once (and again after Delete Account or onboarding): steps, progress, the switch. Never rejects. */
export function loadTutorial(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      // Each read stands alone: one that fails must not switch the whole tour off
      const [rows, progress, enabled] = await Promise.all([
        store.list().catch((error) => {
          console.warn("[tutorial] steps", error);
          return [];
        }),
        loadTutorialProgress(),
        getTutorialEnabled().catch(() => true),
      ]);
      let steps = stepsOf(rows);
      set({ steps, progress, enabled });
      if (progress.onboardingDone) {
        // An existing learner never gets the chapters
        const legacy = legacyRows(steps, progress);
        if (legacy.length > 0) {
          await recordSteps(legacy, "skipped");
          steps = snapshot.steps;
        }
        // A tour finished before the tabs were gated still ends with them open
        if (freeRowDue(steps, progress)) {
          await recordSteps([MARK_FREE], "done");
          steps = snapshot.steps;
        }
        // The first read of a session steps back from a transient beat to the last stable one
        if (!resumed) {
          resumed = true;
          await forgetSteps(resumeAdjust(steps, progress));
        }
      }
    } catch (error) {
      console.warn("[tutorial] load", error);
    } finally {
      set({ loaded: true });
      loading = null;
    }
  })();
  return loading;
}

/** Progress made elsewhere (a lesson finished): read it again. Throttled to one read a second. */
let lastRefresh = 0;
export async function refreshTutorialProgress(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastRefresh < 1000) return;
  lastRefresh = now;
  const progress = await loadTutorialProgress();
  const prev = snapshot.progress;
  if (progress.onboardingDone !== prev.onboardingDone || progress.lessonsCompleted !== prev.lessonsCompleted || progress.firstLessonDone !== prev.firstLessonDone) set({ progress });
}

/** After Delete Account: forget everything in memory so the next onboarding starts the tour again. */
export function resetTutorial(): void {
  resumed = false;
  firstLesson = null;
  redirectedThisSession = false;
  snapshot = { ...snapshot, loaded: false, steps: new Map(), progress: NO_TUTORIAL_PROGRESS, version: snapshot.version + 1 };
  listeners.forEach((l) => l());
}

/* ---- the current beat --------------------------------------------------------------------------- */

export function currentPick(s: TutorialSnapshot = snapshot): Pick | null {
  if (!s.loaded) return null;
  return pickBeat(s.steps, s.progress, s.screen, s.enabled);
}

export function setTutorialScreen(screen: ScreenId | null): void {
  if (snapshot.screen === screen) return;
  set({ screen });
}

/** A real action happened. Recorded only when it is the current beat's own event. Never throws. */
export function emitTutorial(event: TutorialEvent): void {
  try {
    const pick = currentPick();
    if (!pick || pick.beat.mode !== "tap" || pick.beat.until !== event) return;
    void recordSteps([pick.beat.id], "done").then(afterRecord);
  } catch {
    // The tour never breaks the screen that reported it.
  }
}

/** The learner tapped "Got it" on a `look` beat. */
export function finishLookBeat(beatId: string): void {
  const pick = currentPick();
  if (!pick || pick.beat.id !== beatId || pick.beat.mode !== "look") return;
  void recordSteps([beatId], "done").then(afterRecord);
}

/** A `tap` beat's control could not be reached: record it as skipped so the tour moves on. */
export function skipBeat(beatId: string): void {
  const pick = currentPick();
  if (!pick || pick.beat.id !== beatId) return;
  void recordSteps([beatId], "skipped").then(afterRecord);
}

/** A transient beat's target is gone (the bubble closed, the preview left): step back to the last stable beat. */
export function stepBackToStable(): void {
  void forgetSteps(resumeAdjust(snapshot.steps, snapshot.progress));
}

function afterRecord(): void {
  // The tour's last beat opens every tab for good (the Feed and Phone opened as their chapters came up)
  if (freeRowDue(snapshot.steps, snapshot.progress)) void recordSteps([MARK_FREE], "done");
  // A finished tour pays once; the overlay's closing moment reads `rewardIsDue` before this runs.
  void refreshTutorialProgress();
}

/* ---- Skip, replay, the reward ------------------------------------------------------------------- */

export function skipTour(): Promise<void> {
  return recordSteps(skipTourRows(snapshot.steps), "skipped");
}

export async function replayTour(): Promise<void> {
  // A replay never locks the tabs again
  await recordSteps([MARK_FREE], "done");
  await forgetSteps(replayChapterRows(snapshot.steps));
  resumed = true;
}

export function replayIntros(): Promise<void> {
  return forgetSteps(replayIntroRows(snapshot.steps));
}

export const rewardIsDue = (): boolean => snapshot.loaded && snapshot.enabled && rewardDue(snapshot.steps, snapshot.progress);

/** Pay the tour's diamonds once. Returns how many were paid (0 if already paid). Never rejects. */
export async function claimTourReward(): Promise<number> {
  try {
    if (snapshot.steps.has(MARK_REWARD)) return 0;
    const steps = new Map(snapshot.steps);
    steps.set(MARK_REWARD, "done");
    set({ steps });
    // The row is the lock: INSERT OR IGNORE writes it once, and only the call that wrote it pays
    const wrote = await store.record(MARK_REWARD, "done", Date.now());
    if (!wrote) return 0;
    await addDiamonds(TOUR_REWARD_DIAMONDS);
    return TOUR_REWARD_DIAMONDS;
  } catch (error) {
    console.warn("[tutorial] reward", error);
    return 0;
  }
}

/* ---- busy --------------------------------------------------------------------------------------- */

/** Ask the overlay to stay out of the way. Returns the release, which is safe to call twice. */
export function acquireTutorialBusy(label = "unnamed"): () => void {
  set({ busy: snapshot.busy + 1, busyBy: [...snapshot.busyBy, label] });
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const busy = Math.max(0, snapshot.busy - 1);
    const at = snapshot.busyBy.indexOf(label);
    const busyBy = at >= 0 ? [...snapshot.busyBy.slice(0, at), ...snapshot.busyBy.slice(at + 1)] : snapshot.busyBy;
    set({ busy, busyBy, busyClearedAt: busy === 0 ? Date.now() : snapshot.busyClearedAt });
  };
}

/* ---- the lesson redirect ------------------------------------------------------------------------ */

let redirectedThisSession = false;
let backgroundedAt: number | null = null;
let installed = false;

/** Listen for the app leaving and returning: coming back after a while is a new session (may redirect again). */
export function installTutorialLifecycle(): () => void {
  if (installed) return () => undefined;
  installed = true;
  const onChange = (state: AppStateStatus) => {
    if (state === "background" || state === "inactive") {
      if (backgroundedAt === null) backgroundedAt = Date.now();
      return;
    }
    if (state === "active" && backgroundedAt !== null) {
      if (isNewSession(Date.now() - backgroundedAt)) {
        redirectedThisSession = false;
        void refreshTutorialProgress(true);
      }
      backgroundedAt = null;
    }
  };
  const sub = AppState.addEventListener("change", onChange);
  const stopEnabled = subscribeTutorialEnabled((enabled) => set({ enabled }));
  return () => {
    sub.remove();
    stopEnabled();
    installed = false;
  };
}

/** The lesson to carry on with, once, when the tour is waiting on lesson 1; otherwise null. */
export function takeLessonRedirect(): { lessonId: string } | null {
  const s = snapshot;
  if (!s.loaded || !firstLesson) return null;
  if (!shouldRedirectToLesson({ steps: s.steps, progress: s.progress, enabled: s.enabled, redirectedThisSession })) return null;
  redirectedThisSession = true;
  return { lessonId: firstLesson.lessonId };
}
