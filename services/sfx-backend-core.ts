/**
 * The seam under `playSfx` (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §4.4 D and §12).
 *
 * Framework-free and unit-tested (`npm run test:sfx`). `sfx.ts` decides WHETHER a cue plays (gates, scheduler, diag);
 * a backend decides HOW: `expo-audio` keeps a small pool of native players, `react-native-audio-api` decodes each file
 * once and plays it through cheap sources. Which one runs is `pickBackend`, a pure function, and it is the only place
 * the platform split lives. Nothing in this file imports an audio library.
 */
import { SFX_FILES, type SfxCategory, type SfxFile } from "./sfx-core.ts";

export type BackendId = "expo-audio" | "audio-api";

/** What one play asks of a backend. The backend never reads the catalog. */
export interface PlayRequest {
  /** For the diag only. */
  cue: string;
  file: SfxFile;
  volume: number;
  /** 1 is the file as recorded; any other value changes the pitch with it (no time stretch). */
  rate: number;
  /** How many overlapping copies of this file may sound (the cue's `pool`). Engines without players may ignore it. */
  pool: number;
  category: SfxCategory;
}

export type PlayResult =
  | { outcome: "played" }
  /** Started after the engine had to load or decode first. */
  | { outcome: "late"; ms: number }
  | { outcome: "lost"; reason: string }
  | { outcome: "error"; message: string };

export interface SfxBackend {
  readonly id: BackendId;
  /** Audio mode / context. Safe to call twice. Rejects when the engine cannot start: `sfx.ts` then falls back. */
  configure: () => Promise<void>;
  /** Make these files ready to play at once, a few per turn so a screen is never stalled. Never throws. */
  warm: (files: readonly SfxFile[]) => void;
  /** Never let go of these files while the app runs. */
  pin: (file: SfxFile) => void;
  /** These files may be let go when room is needed (a screen was left). They are not unloaded at once. */
  release: (files: readonly SfxFile[]) => void;
  /** Never throws. */
  play: (request: PlayRequest) => Promise<PlayResult>;
  /** Stop a file that is still sounding. Does nothing if it is not. */
  stop: (file: SfxFile) => void;
  unload: () => Promise<void>;
  /** Native players or decoded buffers alive, for the probe. */
  liveCount: () => number;
}

/* ------------------------------------------------------------------ */
/* Which engine                                                        */
/* ------------------------------------------------------------------ */

export interface PickInput {
  /** `Platform.OS`. */
  os: string;
  /** The audio-api native module loaded (false in Expo Go, on iOS, or when the package is missing). */
  moduleLoaded: boolean;
  /** `EXPO_PUBLIC_SFX_BACKEND`, to force an engine for an A/B on one device. */
  override?: string | undefined;
}

export interface Pick {
  id: BackendId;
  /** For the log: why this one. */
  reason: string;
}

/**
 * The split: `react-native-audio-api` on Android only, and only when its native module loads (a development build or an
 * APK; never Expo Go). Everything else, every iPhone included, gets `expo-audio`. An override can ask for either, but
 * `audio-api` is refused anywhere it cannot run: the app must never be left silent and the new engine must never reach
 * an iPhone before it has been heard on one (spec §4.4 D, step 4).
 */
export const pickBackend = ({ os, moduleLoaded, override }: PickInput): Pick => {
  const forced = override === "expo-audio" || override === "audio-api" ? override : undefined;
  if (forced === "expo-audio") return { id: "expo-audio", reason: "override" };
  const canRun = os === "android" && moduleLoaded;
  if (forced === "audio-api") {
    return canRun ? { id: "audio-api", reason: "override" } : { id: "expo-audio", reason: os !== "android" ? "override refused: audio-api is Android only" : "override refused: audio-api module not loaded" };
  }
  if (canRun) return { id: "audio-api", reason: "android with the audio-api module" };
  return { id: "expo-audio", reason: os !== "android" ? "not Android" : "audio-api module not loaded (Expo Go?)" };
};

/* ------------------------------------------------------------------ */
/* The expo-audio engine: a small pool of native players               */
/* ------------------------------------------------------------------ */

/**
 * Most native players alive at once. Each is an ExoPlayer or AVPlayer; Android also gives each its own media session
 * and, once prepared, an AudioTrack, and limits those per process. A starting value, to be replaced by the phase 0 sweep.
 */
export const livePlayerCap = (os: string): number => (os === "android" ? 24 : 32);

/** What the eviction plan needs to know of a file's players. */
export interface PoolEntry {
  file: SfxFile;
  players: number;
  /** A player of it is reserved or sounding right now. */
  busy: boolean;
  pinned: boolean;
  /** Its screen was left: it goes before anything that is simply old. */
  released: boolean;
}

/**
 * Which files to unload so that `needed` more players fit under `cap`. `entries` is in recency order, least recent
 * first. Released files go first, then the least recent. Pinned and busy files are never taken (cutting a sound off is
 * worse than a spare player), so fewer than asked for may come back.
 */
export const planEvictions = (entries: readonly PoolEntry[], cap: number, needed = 1): SfxFile[] => {
  let live = entries.reduce((sum, e) => sum + e.players, 0);
  const out: SfxFile[] = [];
  const candidates = entries.filter((e) => !e.pinned && !e.busy);
  const ordered = [...candidates.filter((e) => e.released), ...candidates.filter((e) => !e.released)];
  for (const entry of ordered) {
    if (live + needed <= cap) break;
    out.push(entry.file);
    live -= entry.players;
  }
  return out;
};

/**
 * Which of `files` to create a player for now: the ones with none, no more than fit under `cap` once released files
 * are let go. A set larger than the room is cut at the end rather than evicting its own first files.
 */
export const planWarm = (files: readonly SfxFile[], entries: readonly PoolEntry[], cap: number): SfxFile[] => {
  const have = new Set(entries.filter((e) => e.players > 0).map((e) => e.file));
  const todo = [...new Set(files)].filter((f) => !have.has(f));
  const live = entries.reduce((sum, e) => sum + e.players, 0);
  const ours = new Set(files);
  const reclaimable = entries.filter((e) => !e.pinned && !e.busy && !ours.has(e.file)).reduce((sum, e) => sum + e.players, 0);
  const room = Math.max(0, cap - live + reclaimable);
  return todo.slice(0, room);
};

/** A lost play is tried once more on a fresh player only for cues the learner is waiting on. A stinger or a decorative cue that arrives a second late is worse than none. */
export const retryAllowed = (category: SfxCategory): boolean => category === "feedback" || category === "tap" || category === "reward" || category === "panel";

/* ------------------------------------------------------------------ */
/* The audio-api engine: decoded buffers in memory                     */
/* ------------------------------------------------------------------ */

/** Memory the decoded buffers may take together. 127 files are about 14 MB; this leaves room and keeps a low-RAM phone safe. */
export const BUFFER_BUDGET_BYTES = 32 * 1024 * 1024;

/** A decoded mono buffer: 32-bit floats at 44.1 kHz. */
export const decodedBytes = (file: SfxFile): number => Math.ceil((SFX_FILES[file] / 1000) * 44100) * 4;

export interface BufferEntry {
  file: SfxFile;
  bytes: number;
  busy: boolean;
  pinned: boolean;
  released: boolean;
}

/** Which decoded files to drop so that `incomingBytes` more fit under `budget`. Same order as `planEvictions`. */
export const planBufferEvictions = (entries: readonly BufferEntry[], budget: number, incomingBytes: number): SfxFile[] => {
  let total = entries.reduce((sum, e) => sum + e.bytes, 0);
  const out: SfxFile[] = [];
  const candidates = entries.filter((e) => !e.pinned && !e.busy);
  const ordered = [...candidates.filter((e) => e.released), ...candidates.filter((e) => !e.released)];
  for (const entry of ordered) {
    if (total + incomingBytes <= budget) break;
    out.push(entry.file);
    total -= entry.bytes;
  }
  return out;
};
