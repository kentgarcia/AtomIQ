/**
 * Sound effects runtime (docs/SFX_SPEC.md §7): the one place that requires an audio file or
 * touches expo-audio for effects. Screens call `playSfx("group.name")`; the catalog, gates
 * and scheduling rules are in `sfx-core.ts` and `media-core.ts`.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { Pressable, TouchableOpacity } from "react-native";
import { canPlayCue } from "./media-core";
import {
  CUES,
  createSfxScheduler,
  filesOfGroup,
  pickSlot,
  poolSizeOf,
  SFX_FILES,
  type PlayOptions,
  type SfxCue,
  type SfxFile,
  type SfxGroup,
} from "./sfx-core";
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

/** A native player is not free: keep at most this many alive, least recently used out first. */
const MAX_LIVE_PLAYERS = 64;

/** A play is reserved on its player for the file's length plus this, so two plays never share one player by accident. */
const BUSY_MARGIN_MS = 40;

interface Slot {
  player: AudioPlayer;
  /** Not played yet, so it is still at 0 and needs no seek. */
  fresh: boolean;
  /** Back at 0 after its last play (rewound in the background), so the next play needs no seek and no waiting. */
  rewound: boolean;
  /** Reserved until then (from the moment it is taken, before it has started): never given to a second play, never evicted. */
  busyUntil: number;
  /** Counts plays, so a late rewind knows it has been overtaken. */
  gen: number;
}

/** Insertion order is recency order: a used file is re-inserted at the end. */
const pools = new Map<SfxFile, Slot[]>();
const scheduler = createSfxScheduler();
let stingerPlayer: AudioPlayer | null = null;
let audioModeConfigured = false;
let handlersInstalled = false;

const configureAudioMode = async () => {
  if (audioModeConfigured) return;
  try {
    // Effects mix with other apps (no audio-focus steal on Android), play in silent mode (iOS),
    // never record and never run in the background.
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
      allowsRecording: false,
      shouldPlayInBackground: false,
    });
  } catch (error) {
    console.warn("Unable to configure audio mode for SFX:", error);
  } finally {
    audioModeConfigured = true;
  }
};

const removeSlot = (slot: Slot) => {
  try {
    slot.player.remove();
  } catch {
    // Ignore unload failures.
  }
};

/** Files that are never evicted: the ones a screen needs at the end of a long stretch of other sounds. */
const pinned = new Set<SfxFile>();

/** Time-based, so judging a file costs no native call (a player's `playing` is one per slot). */
const isBusy = (slots: Slot[], now: number): boolean => slots.some((s) => now < s.busyUntil);

const evictIfNeeded = () => {
  let live = 0;
  for (const slots of pools.values()) live += slots.length;
  if (live <= MAX_LIVE_PLAYERS) return;
  const now = Date.now();
  for (const [file, list] of [...pools]) {
    if (live <= MAX_LIVE_PLAYERS) return;
    // The least recently used file that is not reserved or sounding right now (cutting one off is worse than a spare player)
    if (pinned.has(file) || isBusy(list, now)) continue;
    list.forEach(removeSlot);
    pools.delete(file);
    live -= list.length;
  }
};

const touch = (file: SfxFile, slots: Slot[]) => {
  pools.delete(file);
  pools.set(file, slots);
};

const createSlot = (file: SfxFile): Slot => ({ player: createAudioPlayer(SOURCES[file]), fresh: true, rewound: true, busyUntil: 0, gen: 0 });

/** The player for the next play of `file`: a free one (already at 0 first), a new one, or the one that has been busy the longest. */
const takeSlot = (file: SfxFile, now: number): Slot => {
  const slots = pools.get(file) ?? [];
  const size = poolSizeOf(file);
  const pick = pickSlot(slots, size, now);
  let created = false;
  if (pick === "new") {
    slots.push(createSlot(file));
    created = true;
  }
  const slot = pick === "new" ? slots[slots.length - 1] : slots[pick];
  touch(file, slots);
  if (created || slots.length === 1) evictIfNeeded();
  return slot;
};

/** Create the first player of each file that has none yet, a few per turn, so warming a group never stalls the screen it opens with. */
const WARM_CHUNK = 3;
const warmFiles = (files: readonly SfxFile[]): void => {
  const todo = files.filter((f) => (pools.get(f) ?? []).length === 0);
  const step = () => {
    for (const file of todo.splice(0, WARM_CHUNK)) {
      try {
        if ((pools.get(file) ?? []).length === 0) {
          touch(file, [createSlot(file)]);
          evictIfNeeded();
        }
      } catch (error) {
        console.warn(`Unable to preload ${file} SFX:`, error);
      }
    }
    if (todo.length > 0) setTimeout(step, 16);
  };
  step();
};

/** Create the first player of the files these cues use, so the first step or jump of a level is not the load. */
export const warmSfxCues = (cues: readonly SfxCue[]): void => {
  warmFiles([...new Set(cues.map((c) => CUES[c].file))]);
};

/** Create the first player of every file in a group, so the first play is not the load. */
export const warmSfxGroup = (group: SfxGroup): void => {
  warmFiles(filesOfGroup(group));
};

/**
 * A player made just now (its file was evicted from the pool, or never warmed) has not loaded its
 * source yet, and `play()` on it can be silently dropped. Wait for it to load, but never longer than
 * `timeoutMs`, so a cue is late at worst rather than lost.
 */
const whenLoaded = (player: AudioPlayer, timeoutMs = 1500): Promise<void> =>
  new Promise((resolve) => {
    try {
      if (player.isLoaded) {
        resolve();
        return;
      }
      let done = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const sub = player.addListener("playbackStatusUpdate", (status) => {
        if (status.isLoaded) finish();
      });
      function finish() {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        try {
          sub.remove();
        } catch {
          // The player may already be gone.
        }
        resolve();
      }
      timer = setTimeout(finish, timeoutMs);
    } catch {
      resolve();
    }
  });

/**
 * Load a cue's file now and keep it loaded (never evicted) until the app closes. For a cue that
 * comes at the end of a long stretch of other sounds, such as the finish jingle after a lesson or a
 * game, when a least-recently-used file would otherwise have been unloaded by then.
 */
export const pinSfx = (cueId: SfxCue): void => {
  const file = CUES[cueId].file;
  pinned.add(file);
  warmFiles([file]);
};

/** After a play has ended, put its player back at 0 in the background, so the next play starts at once instead of waiting for a seek. */
const rewindLater = (slot: Slot, file: SfxFile, rate: number) => {
  const gen = slot.gen;
  const after = Math.ceil(SFX_FILES[file] / Math.max(rate, 0.25)) + BUSY_MARGIN_MS + 20;
  setTimeout(() => {
    if (slot.gen !== gen) return;
    try {
      // A finished player still wants to play (its play flag stays on), so a bare seek back to 0 would start it again: pause first.
      slot.player.pause();
      void slot.player
        .seekTo(0)
        .then(() => {
          if (slot.gen === gen) slot.rewound = true;
        })
        .catch(() => {});
    } catch {
      // The player may already be gone.
    }
  }, after);
};

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
      return;
    }

    const now = Date.now();
    const plan = scheduler.plan(cueId, now, options);
    if (!plan.play) return;

    if (!audioModeConfigured) await configureAudioMode();
    if (plan.stopStinger && stingerPlayer) {
      try {
        stingerPlayer.pause();
      } catch {
        // The old stinger may already be gone.
      }
    }

    // Reserve the player before anything yields: a second play of this file in the same tick goes to another one.
    const slot = takeSlot(def.file, now);
    const { player } = slot;
    slot.gen += 1;
    slot.busyUntil = now + Math.ceil(SFX_FILES[def.file] / Math.max(plan.rate, 0.25)) + BUSY_MARGIN_MS;
    if (!player.isLoaded) await whenLoaded(player);
    player.volume = plan.volume;
    // A higher rate is a higher pitch only when pitch correction is off (§7.5).
    const correct = plan.rate === 1;
    if (player.shouldCorrectPitch !== correct) player.shouldCorrectPitch = correct;
    player.setPlaybackRate(plan.rate);
    if (!slot.fresh && !slot.rewound) {
      try {
        await player.seekTo(0);
      } catch {
        // Seek can fail before the source finishes loading; play anyway.
      }
    }
    slot.fresh = false;
    slot.rewound = false;
    if (def.category === "stinger") stingerPlayer = player;
    player.play();
    rewindLater(slot, def.file, plan.rate);
  } catch (error) {
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
  const file = CUES[cueId].file;
  const now = Date.now();
  for (const slot of pools.get(file) ?? []) {
    if (now >= slot.busyUntil) continue;
    try {
      slot.player.pause();
    } catch {
      // The player may already be gone.
    }
    slot.rewound = false;
    slot.busyUntil = 0;
    slot.gen += 1;
  }
};

/** Route changes are owned by the media policy; kept so callers do not import media directly. */
export const setSfxPathname = (pathname: string): void => {
  setMediaPathname(pathname);
};

export const initializeSfx = async (): Promise<void> => {
  await configureAudioMode();
  warmSfxGroup("ui");
  warmSfxGroup("lesson");
  await ensureMediaPreferencesLoaded();
};

/** Every Pressable and TouchableOpacity clicks on press-in; the route policy decides where it is heard. */
export const installGlobalUiSfxHandlers = (): void => {
  if (handlersInstalled) return;

  const touchableOpacityAny = TouchableOpacity as any;
  touchableOpacityAny.defaultProps = touchableOpacityAny.defaultProps || {};
  const originalTouchableOnPressIn = touchableOpacityAny.defaultProps.onPressIn;
  touchableOpacityAny.defaultProps.onPressIn = (event: unknown) => {
    void playSfx("ui.press");
    originalTouchableOnPressIn?.(event);
  };

  const pressableAny = Pressable as any;
  pressableAny.defaultProps = pressableAny.defaultProps || {};
  const originalPressableOnPressIn = pressableAny.defaultProps.onPressIn;
  pressableAny.defaultProps.onPressIn = (event: unknown) => {
    void playSfx("ui.press");
    originalPressableOnPressIn?.(event);
  };

  handlersInstalled = true;
};

export const unloadSfx = async (): Promise<void> => {
  for (const slots of pools.values()) slots.forEach(removeSlot);
  pools.clear();
  stingerPlayer = null;
  scheduler.reset();
};
