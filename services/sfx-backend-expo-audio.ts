/**
 * The `expo-audio` sound engine (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §4.4 A): one native player per file kept in
 * a small least-recently-used pool. This is the engine on iOS and in Expo Go, and the fallback anywhere the audio-api
 * engine cannot run. It is one of the two files that import `expo-audio` for effects (`check:sfx` keeps it so).
 *
 * What it does to stay cheap, because a native player is not: a hard cap on live players that is enforced BEFORE a
 * new one is made, a status-update interval so long that the player never wakes on its own, rewinds done in one batched
 * pass instead of a timer per play, and a play on a player that never loaded is retried once on a fresh one instead of
 * being dropped silently. The pure planning (what to evict, what to warm) is in `sfx-backend-core.ts`.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

import {
  planEvictions,
  planWarm,
  retryAllowed,
  type PlayRequest,
  type PlayResult,
  type PoolEntry,
  type SfxBackend,
} from "./sfx-backend-core";
import { SFX_FILES, pickSlot, type SfxFile } from "./sfx-core";
import { sfxDiag } from "./sfx-diag";

/** A play is reserved on its player for the file's length plus this, so two plays never share one player by accident. */
const BUSY_MARGIN_MS = 40;
/** Finished players are rewound in one pass this often, not by one timer each. */
const REWIND_TICK_MS = 250;
/** How many files a warm step creates per turn. */
const WARM_CHUNK = 3;
/** The first wait for a player to load, then the wait for the retry. */
const LOAD_WAIT_MS = [700, 1000] as const;
/** The player's status interval: it only needs the load and end events, so it never ticks on its own. */
const UPDATE_INTERVAL_MS = 60_000;

interface Slot {
  player: AudioPlayer;
  /** Not played yet, so it is still at 0 and needs no seek. */
  fresh: boolean;
  /** Back at 0 after its last play, so the next play needs no seek and no waiting. */
  rewound: boolean;
  /** Reserved until then (from the moment it is taken, before it has started): never given to a second play, never evicted. */
  busyUntil: number;
  /** Counts plays, so a late rewind knows it has been overtaken. */
  gen: number;
}

/** Wait for a player to load, but never longer than `timeoutMs`. True if it loaded. */
const whenLoaded = (player: AudioPlayer, timeoutMs: number): Promise<boolean> =>
  new Promise((resolve) => {
    try {
      if (player.isLoaded) {
        resolve(true);
        return;
      }
      let done = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const sub = player.addListener("playbackStatusUpdate", (status) => {
        if (status.isLoaded) finish(true);
      });
      function finish(loaded: boolean) {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        try {
          sub.remove();
        } catch {
          // The player may already be gone.
        }
        resolve(loaded);
      }
      timer = setTimeout(() => finish(false), timeoutMs);
    } catch {
      resolve(false);
    }
  });

let audioModeConfigured = false;

export const createExpoAudioBackend = (sources: Record<SfxFile, number>, cap: number): SfxBackend => {
  /** Insertion order is recency order: a used file is re-inserted at the end. */
  const pools = new Map<SfxFile, Slot[]>();
  const pinned = new Set<SfxFile>();
  const released = new Set<SfxFile>();
  let rewinds: { slot: Slot; gen: number; due: number }[] = [];
  let rewindTimer: ReturnType<typeof setTimeout> | null = null;

  const createSlot = (file: SfxFile): Slot => ({
    player: createAudioPlayer(sources[file], { updateInterval: UPDATE_INTERVAL_MS, keepAudioSessionActive: true }),
    fresh: true,
    rewound: true,
    busyUntil: 0,
    gen: 0,
  });

  const removePlayer = (slot: Slot) => {
    try {
      slot.player.remove();
    } catch {
      // Ignore unload failures.
    }
  };

  const entries = (protect?: ReadonlySet<SfxFile>): PoolEntry[] => {
    const now = Date.now();
    return [...pools].map(([file, slots]) => ({
      file,
      players: slots.length,
      busy: slots.some((s) => now < s.busyUntil),
      pinned: pinned.has(file) || (protect?.has(file) ?? false),
      released: released.has(file),
    }));
  };

  /** Let go of enough files that `needed` more players fit under the cap. */
  const makeRoom = (needed: number, protect?: ReadonlySet<SfxFile>) => {
    for (const file of planEvictions(entries(protect), cap, needed)) {
      (pools.get(file) ?? []).forEach(removePlayer);
      pools.delete(file);
      released.delete(file);
      sfxDiag.record(`file:${file}`, "evicted", { detail: file });
    }
  };

  const touch = (file: SfxFile, slots: Slot[]) => {
    pools.delete(file);
    pools.set(file, slots);
  };

  /** The player for the next play of `file`: a free one (already at 0 first), a new one, or the one that has been busy the longest. */
  const takeSlot = (file: SfxFile, size: number, now: number): Slot => {
    const slots = pools.get(file) ?? [];
    const pick = pickSlot(slots, size, now);
    if (pick === "new") {
      makeRoom(1, new Set([file]));
      slots.push(createSlot(file));
    }
    touch(file, slots);
    released.delete(file);
    return pick === "new" ? slots[slots.length - 1] : slots[pick];
  };

  /** A player that never loaded: out of the pool, so the next play makes a fresh one. */
  const dropSlot = (file: SfxFile, slot: Slot) => {
    const slots = pools.get(file) ?? [];
    const i = slots.indexOf(slot);
    if (i >= 0) slots.splice(i, 1);
    if (slots.length === 0) pools.delete(file);
    removePlayer(slot);
  };

  const rewindTick = () => {
    rewindTimer = null;
    const now = Date.now();
    const rest: typeof rewinds = [];
    for (const item of rewinds) {
      if (item.due > now) {
        rest.push(item);
        continue;
      }
      const { slot, gen } = item;
      if (slot.gen !== gen) continue;
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
    }
    rewinds = rest;
    if (rewinds.length > 0) rewindTimer = setTimeout(rewindTick, REWIND_TICK_MS);
  };

  const rewindLater = (slot: Slot, file: SfxFile, rate: number) => {
    const due = Date.now() + Math.ceil(SFX_FILES[file] / Math.max(rate, 0.25)) + BUSY_MARGIN_MS + 20;
    rewinds.push({ slot, gen: slot.gen, due });
    if (!rewindTimer) rewindTimer = setTimeout(rewindTick, REWIND_TICK_MS);
  };

  const warm: SfxBackend["warm"] = (files) => {
    const ours = new Set(files);
    for (const f of ours) released.delete(f);
    const todo = planWarm(files, entries(ours), cap);
    const step = () => {
      for (const file of todo.splice(0, WARM_CHUNK)) {
        try {
          if ((pools.get(file) ?? []).length === 0) {
            makeRoom(1, ours);
            touch(file, [createSlot(file)]);
          }
        } catch (error) {
          console.warn(`Unable to preload ${file} SFX:`, error);
        }
      }
      if (todo.length > 0) setTimeout(step, 16);
    };
    step();
  };

  const play = async (req: PlayRequest): Promise<PlayResult> => {
    try {
      const started = Date.now();
      let attempt = 0;
      for (;;) {
        const now = Date.now();
        const slot = takeSlot(req.file, req.pool, now);
        const { player } = slot;
        // Reserve the player before anything yields: a second play of this file in the same tick goes to another one.
        slot.gen += 1;
        slot.busyUntil = now + Math.ceil(SFX_FILES[req.file] / Math.max(req.rate, 0.25)) + BUSY_MARGIN_MS;
        if (!player.isLoaded) {
          const loaded = await whenLoaded(player, LOAD_WAIT_MS[Math.min(attempt, 1)]);
          if (!loaded) {
            dropSlot(req.file, slot);
            if (attempt === 0 && retryAllowed(req.category)) {
              attempt += 1;
              sfxDiag.record(req.cue, "retried");
              continue;
            }
            return { outcome: "lost", reason: "load-timeout" };
          }
        }
        const lateBy = Date.now() - started;
        player.volume = req.volume;
        // A higher rate is a higher pitch only when pitch correction is off (spec of the sound effects, §7.5).
        const correct = req.rate === 1;
        if (player.shouldCorrectPitch !== correct) player.shouldCorrectPitch = correct;
        player.setPlaybackRate(req.rate);
        if (!slot.fresh && !slot.rewound) {
          try {
            await player.seekTo(0);
          } catch {
            // Seek can fail before the source finishes loading; play anyway.
          }
        }
        slot.fresh = false;
        slot.rewound = false;
        player.play();
        rewindLater(slot, req.file, req.rate);
        return lateBy > 30 ? { outcome: "late", ms: lateBy } : { outcome: "played" };
      }
    } catch (error) {
      return { outcome: "error", message: error instanceof Error ? error.message : String(error) };
    }
  };

  const stop: SfxBackend["stop"] = (file) => {
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

  return {
    id: "expo-audio",
    configure: async () => {
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
    },
    warm,
    pin: (file) => {
      pinned.add(file);
      released.delete(file);
      warm([file]);
    },
    release: (files) => {
      for (const f of files) if (!pinned.has(f)) released.add(f);
    },
    play,
    stop,
    unload: async () => {
      for (const slots of pools.values()) slots.forEach(removePlayer);
      pools.clear();
      released.clear();
      rewinds = [];
      if (rewindTimer) clearTimeout(rewindTimer);
      rewindTimer = null;
    },
    liveCount: () => [...pools.values()].reduce((sum, s) => sum + s.length, 0),
  };
};
