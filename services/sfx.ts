/**
 * Sound effects runtime (docs/features/SFX_SPEC.md §7, docs/features/PERFORMANCE_AND_SOUND_SPEC.md §4 and §12): the one
 * place that requires an audio file. Screens call `playSfx("group.name")`; the catalog, gates and scheduling rules are in
 * `sfx-core.ts` and `media-core.ts`, and HOW a sound is played is a backend (`sfx-backend-*.ts`): `react-native-audio-api`
 * on Android when its native module loads, `expo-audio` everywhere else (`pickBackend`). This file decides whether a cue
 * plays, records why not (`sfx-diag.ts`), and hands the play to the engine. It never imports an audio library.
 */
import { Platform } from "react-native";
import { canPlayCue } from "./media-core";
import {
  CUES,
  SFX_SETS,
  createSfxScheduler,
  filesOfCues,
  filesOfSet,
  poolSizeOf,
  type PlayOptions,
  type SfxCue,
  type SfxFile,
  type SfxSetName,
} from "./sfx-core";
import { pickBackend, type BackendId, type SfxBackend } from "./sfx-backend-core";
import { createAudioApiBackend, loadAudioApi } from "./sfx-backend-audio-api";
import { createExpoAudioBackend } from "./sfx-backend-expo-audio";
import { getMotionBudget } from "./device-profile";
import { sfxDiag } from "./sfx-diag";
import {
  areMediaPreferencesLoaded,
  ensureMediaPreferencesLoaded,
  getCurrentRouteMediaPolicy,
  getMediaEnvironment,
  getMediaPreferences,
  readAloud,
  setMediaPathname,
} from "./media";

export type { PlayOptions, SfxCue } from "./sfx-core";

/** The only `require`s of the bundled effects. `check:sfx` keeps this the only place. */
const SOURCES: Record<SfxFile, number> = {
  "ui/press": require("../assets/sfx/ui/press.wav"),
  "ui/release": require("../assets/sfx/ui/release.wav"),
  "ui/tab": require("../assets/sfx/ui/tab.wav"),
  "ui/select": require("../assets/sfx/ui/select.wav"),
  "ui/cancel": require("../assets/sfx/ui/cancel.wav"),
  "ui/modal-open": require("../assets/sfx/ui/modal-open.wav"),
  "ui/modal-close": require("../assets/sfx/ui/modal-close.wav"),
  "ui/lock": require("../assets/sfx/ui/lock.wav"),
  "ui/disable": require("../assets/sfx/ui/disable.wav"),
  "ui/warning": require("../assets/sfx/ui/warning.wav"),
  "ui/equip": require("../assets/sfx/ui/equip.wav"),
  "ui/unequip": require("../assets/sfx/ui/unequip.wav"),
  "ui/tick": require("../assets/sfx/ui/tick.wav"),
  "ui/shop-open": require("../assets/sfx/ui/shop-open.wav"),
  "lesson/answer-correct": require("../assets/sfx/lesson/answer-correct.wav"),
  "lesson/answer-wrong": require("../assets/sfx/lesson/answer-wrong.wav"),
  "lesson/blip": require("../assets/sfx/lesson/blip.wav"),
  "lesson/zoom-in": require("../assets/sfx/lesson/zoom-in.wav"),
  "lesson/zoom-out": require("../assets/sfx/lesson/zoom-out.wav"),
  "lesson/node-zoom": require("../assets/sfx/lesson/node-zoom.wav"),
  "lesson/start": require("../assets/sfx/lesson/start.wav"),
  "lesson/complete": require("../assets/sfx/lesson/complete.wav"),
  "lesson/finish": require("../assets/sfx/lesson/finish.wav"),
  "lesson/unlock": require("../assets/sfx/lesson/unlock.wav"),
  "lesson/whoosh": require("../assets/sfx/lesson/whoosh.wav"),
  "reward/pop": require("../assets/sfx/reward/pop.wav"),
  "reward/coin": require("../assets/sfx/reward/coin.wav"),
  "reward/fill": require("../assets/sfx/reward/fill.wav"),
  "reward/level-up": require("../assets/sfx/reward/level-up.wav"),
  "reward/finish-jingle": require("../assets/sfx/reward/finish-jingle.wav"),
  "reward/rank-up": require("../assets/sfx/reward/rank-up.wav"),
  "reward/achievement": require("../assets/sfx/reward/achievement.wav"),
  "reward/requirements-met": require("../assets/sfx/reward/requirements-met.wav"),
  "reward/chest-open": require("../assets/sfx/reward/chest-open.wav"),
  "reward/purchase": require("../assets/sfx/reward/purchase.wav"),
  "reward/sparkle": require("../assets/sfx/reward/sparkle.wav"),
  "social/message-send": require("../assets/sfx/social/message-send.wav"),
  "social/message-receive": require("../assets/sfx/social/message-receive.wav"),
  "social/notification": require("../assets/sfx/social/notification.wav"),
  "social/new-friend": require("../assets/sfx/social/new-friend.wav"),
  "social/achievement-scroll": require("../assets/sfx/social/achievement-scroll.wav"),
  "game/over": require("../assets/sfx/game/over.wav"),
  "game/count-1": require("../assets/sfx/game/count-1.wav"),
  "game/count-2": require("../assets/sfx/game/count-2.wav"),
  "game/count-3": require("../assets/sfx/game/count-3.wav"),
  "game/count-finish": require("../assets/sfx/game/count-finish.wav"),
  "game/time-up": require("../assets/sfx/game/time-up.wav"),
  "game/explosion": require("../assets/sfx/game/explosion.wav"),
  "game/platformer-jump": require("../assets/sfx/game/platformer-jump.wav"),
  "game/platformer-coin": require("../assets/sfx/game/platformer-coin.wav"),
  "game/platformer-hurt": require("../assets/sfx/game/platformer-hurt.wav"),
  "game/platformer-defeat": require("../assets/sfx/game/platformer-defeat.wav"),
  "game/platformer-battle": require("../assets/sfx/game/platformer-battle.wav"),
  "game/step-grass-left": require("../assets/sfx/game/step-grass-left.wav"),
  "game/step-grass-right": require("../assets/sfx/game/step-grass-right.wav"),
  "game/land-grass": require("../assets/sfx/game/land-grass.wav"),
  "game/step-snow-left": require("../assets/sfx/game/step-snow-left.wav"),
  "game/step-snow-right": require("../assets/sfx/game/step-snow-right.wav"),
  "game/land-snow": require("../assets/sfx/game/land-snow.wav"),
  "game/step-sand-left": require("../assets/sfx/game/step-sand-left.wav"),
  "game/step-sand-right": require("../assets/sfx/game/step-sand-right.wav"),
  "game/land-sand": require("../assets/sfx/game/land-sand.wav"),
  "game/step-stone-left": require("../assets/sfx/game/step-stone-left.wav"),
  "game/step-stone-right": require("../assets/sfx/game/step-stone-right.wav"),
  "game/land-stone": require("../assets/sfx/game/land-stone.wav"),
  "game/step-soil-left": require("../assets/sfx/game/step-soil-left.wav"),
  "game/step-soil-right": require("../assets/sfx/game/step-soil-right.wav"),
  "game/land-soil": require("../assets/sfx/game/land-soil.wav"),
  "game/fall-grass": require("../assets/sfx/game/fall-grass.wav"),
  "game/fall-sand": require("../assets/sfx/game/fall-sand.wav"),
  "game/fall-stone": require("../assets/sfx/game/fall-stone.wav"),
  "game/fall-soil": require("../assets/sfx/game/fall-soil.wav"),
  "game/jump": require("../assets/sfx/game/jump.wav"),
  "game/checkpoint": require("../assets/sfx/game/checkpoint.wav"),
  "game/fireworks-launch": require("../assets/sfx/game/fireworks-launch.wav"),
  "game/fireworks-burst": require("../assets/sfx/game/fireworks-burst.wav"),
  "ui/page-next": require("../assets/sfx/ui/page-next.wav"),
  "ui/page-back": require("../assets/sfx/ui/page-back.wav"),
  "ui/panel-open": require("../assets/sfx/ui/panel-open.wav"),
  "ui/panel-close": require("../assets/sfx/ui/panel-close.wav"),
  "ui/invalid": require("../assets/sfx/ui/invalid.wav"),
  "ui/announce": require("../assets/sfx/ui/announce.wav"),
  "ui/delete": require("../assets/sfx/ui/delete.wav"),
  "ui/tab-right": require("../assets/sfx/ui/tab-right.wav"),
  "ui/equip-confirm": require("../assets/sfx/ui/equip-confirm.wav"),
  "ui/try-on": require("../assets/sfx/ui/try-on.wav"),
  "ui/tab-left": require("../assets/sfx/ui/tab-left.wav"),
  "ui/swatch": require("../assets/sfx/ui/swatch.wav"),
  "ui/geiger": require("../assets/sfx/ui/geiger.wav"),
  "ui/go": require("../assets/sfx/ui/go.wav"),
  "ui/wipe": require("../assets/sfx/ui/wipe.wav"),
  "phone/start-1": require("../assets/sfx/phone/start-1.wav"),
  "phone/start-2": require("../assets/sfx/phone/start-2.wav"),
  "phone/start-3": require("../assets/sfx/phone/start-3.wav"),
  "phone/app-open": require("../assets/sfx/phone/app-open.wav"),
  "phone/app-close": require("../assets/sfx/phone/app-close.wav"),
  "phone/wallpaper": require("../assets/sfx/phone/wallpaper.wav"),
  "phone/typing": require("../assets/sfx/phone/typing.wav"),
  "phone/send": require("../assets/sfx/phone/send.wav"),
  "phone/sticker": require("../assets/sfx/phone/sticker.wav"),
  "phone/end": require("../assets/sfx/phone/end.wav"),
  "phone/archive": require("../assets/sfx/phone/archive.wav"),
  "phone/note-new": require("../assets/sfx/phone/note-new.wav"),
  "phone/note-clip": require("../assets/sfx/phone/note-clip.wav"),
  "phone/shutter": require("../assets/sfx/phone/shutter.wav"),
  "phone/photo-saved": require("../assets/sfx/phone/photo-saved.wav"),
  "phone/camera-option": require("../assets/sfx/phone/camera-option.wav"),
  "phone/scan-lock": require("../assets/sfx/phone/scan-lock.wav"),
  "phone/scan-miss": require("../assets/sfx/phone/scan-miss.wav"),
  "phone/map-open": require("../assets/sfx/phone/map-open.wav"),
  "phone/map-close": require("../assets/sfx/phone/map-close.wav"),
  "phone/map-pin": require("../assets/sfx/phone/map-pin.wav"),
  "phone/map-limit": require("../assets/sfx/phone/map-limit.wav"),
  "phone/book": require("../assets/sfx/phone/book.wav"),
  "reward/coin-tick": require("../assets/sfx/reward/coin-tick.wav"),
  "reward/coin-land": require("../assets/sfx/reward/coin-land.wav"),
  "reward/count-up": require("../assets/sfx/reward/count-up.wav"),
  "reward/stat-up": require("../assets/sfx/reward/stat-up.wav"),
  "reward/stat-down": require("../assets/sfx/reward/stat-down.wav"),
  "reward/podium": require("../assets/sfx/reward/podium.wav"),
  "reward/item-tick": require("../assets/sfx/reward/item-tick.wav"),
  "lesson/pick": require("../assets/sfx/lesson/pick.wav"),
  "lesson/drop": require("../assets/sfx/lesson/drop.wav"),
  "lesson/pair-ok": require("../assets/sfx/lesson/pair-ok.wav"),
  "lesson/lock-in": require("../assets/sfx/lesson/lock-in.wav"),
  "game/get-ready": require("../assets/sfx/game/get-ready.wav"),
  "game/timer-tick": require("../assets/sfx/game/timer-tick.wav"),
};

const scheduler = createSfxScheduler();

/* ------------------------------------------------------------------ */
/* The engine                                                          */
/* ------------------------------------------------------------------ */

let backend: SfxBackend | null = null;
let pickReason = "";
let configuring: Promise<void> | null = null;
/** The stinger that is sounding, so a newer one can stop it. */
let stingerFile: SfxFile | null = null;

const makeExpoAudio = (): SfxBackend => createExpoAudioBackend(SOURCES, getMotionBudget().playerCap);

/** Chosen once, on first use. `pickBackend` is the only place the platform split lives. */
const getBackend = (): SfxBackend => {
  if (backend) return backend;
  const api = Platform.OS === "android" ? loadAudioApi() : null;
  const pick = pickBackend({ os: Platform.OS, moduleLoaded: api !== null, override: process.env.EXPO_PUBLIC_SFX_BACKEND });
  pickReason = pick.reason;
  backend = pick.id === "audio-api" && api ? createAudioApiBackend(api, SOURCES) : makeExpoAudio();
  return backend;
};

/** Start the engine once. If the audio-api engine cannot start, the app switches to expo-audio instead of going silent. */
const ensureConfigured = (): Promise<void> => {
  if (configuring) return configuring;
  configuring = (async () => {
    const engine = getBackend();
    try {
      await engine.configure();
    } catch (error) {
      if (engine.id === "audio-api") {
        console.warn("The audio-api engine could not start; using expo-audio:", error);
        pickReason = "audio-api failed to start";
        void engine.unload().catch(() => {});
        backend = makeExpoAudio();
        await backend.configure();
      } else {
        console.warn("Unable to configure audio for SFX:", error);
      }
    }
  })();
  return configuring;
};

/** For the perf probe: which engine runs, why, and how much it holds. */
export const getSfxEngineInfo = (): { backend: BackendId; reason: string; live: number } => {
  const engine = getBackend();
  return { backend: engine.id, reason: pickReason, live: engine.liveCount() };
};

/* ------------------------------------------------------------------ */
/* Warming                                                             */
/* ------------------------------------------------------------------ */

/** Get a screen's sounds ready (a few per turn, so warming never stalls the screen it opens with). */
export const warmSfxSet = (name: SfxSetName): void => {
  try {
    getBackend().warm(filesOfSet(name));
  } catch (error) {
    console.warn(`Unable to warm the ${name} SFX set:`, error);
  }
};

/** A screen was left: its sounds may be let go when room is needed (not at once: the next screen may use them). */
export const releaseSfxSet = (name: SfxSetName): void => {
  // `core` is never released; a file another warm set also lists stays with that set until it is released too.
  if (name === "core") return;
  try {
    getBackend().release(filesOfSet(name));
  } catch {
    // Nothing to release.
  }
};

/** Get the files of these cues ready, for a screen whose list depends on its data (the Atom Maze's ground). */
export const warmSfxCues = (cues: readonly SfxCue[]): void => {
  try {
    getBackend().warm(filesOfCues(cues));
  } catch (error) {
    console.warn("Unable to warm SFX cues:", error);
  }
};

/**
 * Load a cue's file now and keep it (never let go) until the app closes. For a cue that comes at the end of a long
 * stretch of other sounds, such as the finish jingle after a lesson or a game.
 */
export const pinSfx = (cueId: SfxCue): void => {
  try {
    getBackend().pin(CUES[cueId].file);
  } catch (error) {
    console.warn(`Unable to pin ${cueId} SFX:`, error);
  }
};

/* ------------------------------------------------------------------ */
/* Playing                                                             */
/* ------------------------------------------------------------------ */

/** Play one cue. Never throws; safe to call with `void`. */
export const playSfx = async (cueId: SfxCue, options?: PlayOptions): Promise<void> => {
  try {
    const def = CUES[cueId];
    // Once loaded, the gate is read without yielding: a switch that plays "off" and then mutes in
    // the same tick (Settings) must be judged by the state it was pressed in.
    if (!areMediaPreferencesLoaded()) await ensureMediaPreferencesLoaded();
    const readAloudStatus = readAloud.getSnapshot().status;
    if (
      !canPlayCue(
        def.category,
        getMediaPreferences(),
        getMediaEnvironment(),
        getCurrentRouteMediaPolicy(),
        readAloudStatus === "speaking" || readAloudStatus === "loading",
      )
    ) {
      sfxDiag.record(cueId, "gate");
      return;
    }

    const plan = scheduler.plan(cueId, Date.now(), options);
    if (!plan.play) {
      sfxDiag.record(cueId, plan.reason === "gap" ? "skip-gap" : plan.reason === "burst" ? "skip-burst" : "skip-duck");
      return;
    }

    if (!configuring) await ensureConfigured();
    else await configuring;
    const engine = getBackend();
    if (plan.stopStinger && stingerFile) engine.stop(stingerFile);
    if (def.category === "stinger") stingerFile = def.file;

    const result = await engine.play({
      cue: cueId,
      file: def.file,
      volume: plan.volume,
      rate: plan.rate,
      pool: poolSizeOf(def.file),
      category: def.category,
    });
    if (result.outcome === "late") sfxDiag.record(cueId, "late", { ms: result.ms });
    else if (result.outcome === "played") sfxDiag.record(cueId, "played");
    else if (result.outcome === "lost") sfxDiag.record(cueId, "lost", { detail: result.reason });
    else {
      sfxDiag.record(cueId, "error", { detail: result.message });
      console.warn(`Unable to play ${cueId} SFX:`, result.message);
    }
  } catch (error) {
    sfxDiag.record(cueId, "error", { detail: error instanceof Error ? error.message : String(error) });
    console.warn(`Unable to play ${cueId} SFX:`, error);
  }
};

/** A cue's file, catalog volume and default rate, with no gate or scheduling: for the dev SFX lab (components/dev), which plays old and new sounds side by side. */
export const sfxAssetFor = (cueId: SfxCue): { source: number; volume: number; rate: number } => {
  const def = CUES[cueId];
  return { source: SOURCES[def.file], volume: def.volume, rate: def.rate ?? 1 };
};

/**
 * Play a few cues on one clock: `at` is ms from now. For a moment made of several sounds that do not
 * come from an animation (the phone's hand-over). Returns a function that cancels what has not played yet.
 */
export const playSfxSequence = (steps: readonly { cue: SfxCue; at: number; options?: PlayOptions }[]): (() => void) => {
  const timers = steps.map((step) => setTimeout(() => void playSfx(step.cue, step.options), step.at));
  return () => timers.forEach(clearTimeout);
};

/** Stop a cue that is still playing (a long one when its screen is left). Quietly does nothing if it is not. */
export const stopSfx = (cueId: SfxCue): void => {
  try {
    getBackend().stop(CUES[cueId].file);
  } catch {
    // Nothing to stop.
  }
};

/** Route changes are owned by the media policy; kept so callers do not import media directly. */
export const setSfxPathname = (pathname: string): void => {
  setMediaPathname(pathname);
};

/**
 * Start the engine and, once the first screen has drawn, get the sounds every screen needs ready. Warming does not
 * happen in the root effect: it would land while the splash is hiding and the first screen's entrance is running,
 * on the thread that draws.
 */
export const initializeSfx = async (): Promise<void> => {
  await ensureConfigured();
  // InteractionManager is gone from React Native: one frame to let the first screen draw, then a pause
  requestAnimationFrame(() => {
    setTimeout(() => warmSfxSet("core"), 400);
  });
  await ensureMediaPreferencesLoaded();
};

export const unloadSfx = async (): Promise<void> => {
  const old = backend;
  backend = null;
  configuring = null;
  stingerFile = null;
  scheduler.reset();
  await old?.unload();
};

// Re-exported so a caller never needs sfx-core for a set name
export { SFX_SETS };
export type { SfxSetName };
