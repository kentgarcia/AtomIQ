/**
 * The `react-native-audio-api` sound engine (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §4.4 D): every file is decoded
 * once into an in-memory buffer, and a play is one cheap buffer source through a gain node. No player per file, so no
 * per-file media session, no `AudioTrack` per file, no per-play seek and no main-thread player commands. Any number of
 * copies of a file may sound at once.
 *
 * ANDROID ONLY, and only when the native module loads (an Android development build or an APK, never Expo Go): see
 * `pickBackend`. This is the ONLY file that imports `react-native-audio-api`, and only through `loadAudioApi`, a guarded
 * `require`: in Expo Go the package's native module is missing and loading it throws, which must read as "not
 * available", never as a crash or a silent app. `sfx.ts` falls back to `expo-audio` if this engine cannot start.
 *
 * Not heard on a device yet: the checklist in the spec's phase 0 spike (pitch, mixing, decode of a bundled `.wav` in a
 * release build, latency) is what turns this from written into adopted.
 */
import type { SfxBackend, PlayRequest, PlayResult } from "./sfx-backend-core";
import { BUFFER_BUDGET_BYTES, decodedBytes, planBufferEvictions } from "./sfx-backend-core";
import type { SfxFile } from "./sfx-core";

type AudioApi = typeof import("react-native-audio-api");
type Context = InstanceType<AudioApi["AudioContext"]>;
type Buffer = Awaited<ReturnType<Context["decodeAudioData"]>>;
type Source = ReturnType<Context["createBufferSource"]>;

/** The native module, or null when it cannot load (Expo Go, a missing package). Never throws. */
export const loadAudioApi = (): AudioApi | null => {
  try {
    // A guarded require on purpose: Metro bundles the package, but only code that reaches here may touch its native module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-audio-api") as AudioApi;
  } catch {
    return null;
  }
};

const WARM_CHUNK = 3;

export const createAudioApiBackend = (api: AudioApi, sources: Record<SfxFile, number>): SfxBackend => {
  let ctx: Context | null = null;
  /** Insertion order is recency order. */
  const buffers = new Map<SfxFile, Buffer>();
  const loading = new Map<SfxFile, Promise<Buffer | null>>();
  const active = new Map<SfxFile, Set<Source>>();
  const pinned = new Set<SfxFile>();
  const released = new Set<SfxFile>();
  /** Files that could not be decoded: not tried again on every play (each try is native work and a warning), until `unload`. */
  const failed = new Map<SfxFile, string>();

  const context = (): Context => {
    if (!ctx) ctx = new api.AudioContext({ latencyHint: "interactive" });
    return ctx;
  };

  /** A bundled file's `require` id to something the decoder takes: the id itself, or, if that fails in a release build, a local file made by expo-asset. */
  const decode = async (file: SfxFile): Promise<Buffer> => {
    const c = context();
    try {
      return await c.decodeAudioData(sources[file]);
    } catch (first) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Asset } = require("expo-asset") as typeof import("expo-asset");
        const asset = await Asset.fromModule(sources[file]).downloadAsync();
        if (!asset.localUri) throw first;
        return await c.decodeAudioData(asset.localUri);
      } catch {
        throw first;
      }
    }
  };

  const makeRoomFor = (file: SfxFile) => {
    const entries = [...buffers.keys()].map((f) => ({
      file: f,
      bytes: decodedBytes(f),
      busy: (active.get(f)?.size ?? 0) > 0,
      pinned: pinned.has(f),
      released: released.has(f),
    }));
    for (const f of planBufferEvictions(entries, BUFFER_BUDGET_BYTES, decodedBytes(file))) {
      buffers.delete(f);
      released.delete(f);
    }
  };

  const ensureBuffer = (file: SfxFile): Promise<Buffer | null> => {
    const have = buffers.get(file);
    if (have) {
      buffers.delete(file);
      buffers.set(file, have);
      return Promise.resolve(have);
    }
    if (failed.has(file)) return Promise.resolve(null);
    const pending = loading.get(file);
    if (pending) return pending;
    const job = decode(file)
      .then((buffer) => {
        makeRoomFor(file);
        buffers.set(file, buffer);
        return buffer;
      })
      .catch((error) => {
        console.warn(`Unable to decode ${file} SFX:`, error);
        failed.set(file, error instanceof Error ? error.message : String(error));
        return null;
      })
      .finally(() => {
        loading.delete(file);
      });
    loading.set(file, job);
    return job;
  };

  const warm: SfxBackend["warm"] = (files) => {
    for (const f of files) released.delete(f);
    const todo = [...new Set(files)].filter((f) => !buffers.has(f) && !loading.has(f));
    const step = () => {
      for (const file of todo.splice(0, WARM_CHUNK)) void ensureBuffer(file);
      if (todo.length > 0) setTimeout(step, 16);
    };
    step();
  };

  const play = async (req: PlayRequest): Promise<PlayResult> => {
    try {
      const started = Date.now();
      const buffer = buffers.get(req.file) ?? (await ensureBuffer(req.file));
      if (!buffer) return { outcome: "lost", reason: `decode-failed${failed.has(req.file) ? `: ${failed.get(req.file)}` : ""}` };
      const c = context();
      if (c.state === "suspended") await c.resume();
      const source = c.createBufferSource({ pitchCorrection: req.rate === 1 });
      source.buffer = buffer;
      source.playbackRate.value = req.rate;
      const gain = c.createGain();
      gain.gain.value = req.volume;
      source.connect(gain);
      gain.connect(c.destination);
      let set = active.get(req.file);
      if (!set) {
        set = new Set();
        active.set(req.file, set);
      }
      set.add(source);
      source.onended = () => {
        active.get(req.file)?.delete(source);
        try {
          gain.disconnect();
        } catch {
          // Already gone.
        }
      };
      source.start();
      released.delete(req.file);
      const lateBy = Date.now() - started;
      return lateBy > 30 ? { outcome: "late", ms: lateBy } : { outcome: "played" };
    } catch (error) {
      return { outcome: "error", message: error instanceof Error ? error.message : String(error) };
    }
  };

  return {
    id: "audio-api",
    configure: async () => {
      const c = context();
      try {
        // Effects mix with other apps: the library must not take or hold audio focus for them.
        api.AudioManager.disableSessionManagement();
      } catch (error) {
        console.warn("Unable to relax the audio session for SFX:", error);
      }
      if (c.state === "suspended") await c.resume();
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
    stop: (file) => {
      for (const source of [...(active.get(file) ?? [])]) {
        try {
          source.stop();
        } catch {
          // Already ended.
        }
      }
    },
    unload: async () => {
      for (const set of active.values()) for (const s of set) {
        try {
          s.stop();
        } catch {
          // Already ended.
        }
      }
      active.clear();
      buffers.clear();
      loading.clear();
      released.clear();
      failed.clear();
      const old = ctx;
      ctx = null;
      try {
        await old?.close();
      } catch {
        // Already closed.
      }
    },
    liveCount: () => buffers.size,
  };
};
