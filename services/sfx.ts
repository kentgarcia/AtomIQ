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
  poolSizeOf,
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
};

/** A native player is not free: keep at most this many alive, least recently used out first. */
const MAX_LIVE_PLAYERS = 40;

interface Slot {
  player: AudioPlayer;
  /** Not played yet, so it is still at 0 and needs no seek. */
  fresh: boolean;
}

/** Insertion order is recency order: a used file is re-inserted at the end. */
const pools = new Map<SfxFile, Slot[]>();
const nextSlot = new Map<SfxFile, number>();
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

const isPlaying = (slots: Slot[]): boolean => {
  try {
    return slots.some((s) => s.player.playing);
  } catch {
    return false;
  }
};

/** Files that are never evicted: the ones a screen needs at the end of a long stretch of other sounds. */
const pinned = new Set<SfxFile>();

const evictIfNeeded = () => {
  let live = 0;
  for (const slots of pools.values()) live += slots.length;
  while (live > MAX_LIVE_PLAYERS) {
    // The least recently used file that is not sounding right now (cutting a playing one off is worse than a spare player)
    let oldest: SfxFile | undefined;
    for (const [file, list] of pools) {
      if (!pinned.has(file) && !isPlaying(list)) {
        oldest = file;
        break;
      }
    }
    if (oldest === undefined) return;
    const slots = pools.get(oldest) ?? [];
    live -= slots.length;
    slots.forEach(removeSlot);
    pools.delete(oldest);
    nextSlot.delete(oldest);
  }
};

const touch = (file: SfxFile, slots: Slot[]) => {
  pools.delete(file);
  pools.set(file, slots);
};

const createSlot = (file: SfxFile): Slot => ({ player: createAudioPlayer(SOURCES[file]), fresh: true });

/** The player for the next play of `file`: a free one, or the next in rotation. */
const takeSlot = (file: SfxFile): Slot => {
  const slots = pools.get(file) ?? [];
  const size = poolSizeOf(file);
  let slot = slots.find((s) => !s.fresh && !s.player.playing);
  if (!slot) slot = slots.find((s) => s.fresh);
  if (!slot && slots.length < size) {
    slot = createSlot(file);
    slots.push(slot);
  }
  if (!slot) {
    const i = (nextSlot.get(file) ?? 0) % slots.length;
    nextSlot.set(file, i + 1);
    slot = slots[i];
  }
  touch(file, slots);
  evictIfNeeded();
  return slot;
};

/** Create the first player of the files these cues use, so the first step or jump of a level is not the load. */
export const warmSfxCues = (cues: readonly SfxCue[]): void => {
  for (const id of new Set(cues.map((c) => CUES[c].file))) {
    try {
      if ((pools.get(id) ?? []).length === 0) {
        touch(id, [createSlot(id)]);
        evictIfNeeded();
      }
    } catch (error) {
      console.warn(`Unable to preload ${id} SFX:`, error);
    }
  }
};

/** Create the first player of every file in a group, so the first play is not the load. */
export const warmSfxGroup = (group: SfxGroup): void => {
  for (const file of filesOfGroup(group)) {
    try {
      if ((pools.get(file) ?? []).length === 0) {
        touch(file, [createSlot(file)]);
        evictIfNeeded();
      }
    } catch (error) {
      console.warn(`Unable to preload ${file} SFX:`, error);
    }
  }
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
  try {
    if ((pools.get(file) ?? []).length === 0) {
      touch(file, [createSlot(file)]);
      evictIfNeeded();
    }
  } catch (error) {
    console.warn(`Unable to preload ${file} SFX:`, error);
  }
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

    const plan = scheduler.plan(cueId, Date.now(), options);
    if (!plan.play) return;

    await configureAudioMode();
    if (plan.stopStinger && stingerPlayer) {
      try {
        stingerPlayer.pause();
      } catch {
        // The old stinger may already be gone.
      }
    }

    const slot = takeSlot(def.file);
    const { player } = slot;
    await whenLoaded(player);
    player.volume = plan.volume;
    // A higher rate is a higher pitch only when pitch correction is off (§7.5).
    player.shouldCorrectPitch = plan.rate === 1;
    player.setPlaybackRate(plan.rate);
    if (!slot.fresh) {
      try {
        await player.seekTo(0);
      } catch {
        // Seek can fail before the source finishes loading; play anyway.
      }
    }
    slot.fresh = false;
    if (def.category === "stinger") stingerPlayer = player;
    player.play();
  } catch (error) {
    console.warn(`Unable to play ${cueId} SFX:`, error);
  }
};

/** Stop a cue that is still playing (a long one when its screen is left). Quietly does nothing if it is not. */
export const stopSfx = (cueId: SfxCue): void => {
  const file = CUES[cueId].file;
  for (const slot of pools.get(file) ?? []) {
    try {
      if (slot.player.playing) slot.player.pause();
    } catch {
      // The player may already be gone.
    }
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
  nextSlot.clear();
  stingerPlayer = null;
  scheduler.reset();
};
