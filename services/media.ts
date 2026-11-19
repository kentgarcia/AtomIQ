/**
 * Media runtime — the single place that owns Read Aloud, sound-effect and
 * music state for the whole app. See docs/MEDIA_POLICY.md.
 *
 * - One Read Aloud controller (one utterance at a time, app-wide).
 * - One preference store (`soundEffects`, `music`, `readAloud`) read by
 *   lessons, quizzes, Schrodi/Guide, games and settings alike.
 * - One lifecycle: backgrounding, route changes and screen-reader changes
 *   are handled here, never per screen.
 */
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { AccessibilityInfo, AppState, type AppStateStatus } from "react-native";

import {
  DEFAULT_MEDIA_ENVIRONMENT,
  DEFAULT_MEDIA_PREFERENCES,
  canPlayMusic,
  createReadAloudController,
  getRouteMediaPolicy,
  type MediaEnvironment,
  type MediaPreferences,
  type ReadAloudController,
  type RouteMediaPolicy,
} from "./media-core";
import { expoSpeechEngine } from "./speech";
import {
  getMusicEnabled,
  getReadAloudEnabled,
  getSoundEnabled,
  setMusicEnabled,
  setReadAloudEnabled,
  setSoundEnabled,
} from "./storage";

/* ------------------------------------------------------------------ */
/* Read Aloud                                                          */
/* ------------------------------------------------------------------ */

export const readAloud: ReadAloudController = createReadAloudController({
  engine: expoSpeechEngine,
});

/* ------------------------------------------------------------------ */
/* Preferences                                                         */
/* ------------------------------------------------------------------ */

let preferences: MediaPreferences = { ...DEFAULT_MEDIA_PREFERENCES };
let hydration: Promise<MediaPreferences> | null = null;
const preferenceListeners = new Set<() => void>();

const notifyPreferences = () => {
  for (const listener of Array.from(preferenceListeners)) {
    try {
      listener();
    } catch {
      // ignore subscriber failures
    }
  }
};

const applyPreferenceSideEffects = () => {
  readAloud.setEnabled(preferences.readAloud);
  syncMusic();
};

let preferencesLoaded = false;

/** True once the stored preferences are in memory, so a gate can be read without awaiting. */
export const areMediaPreferencesLoaded = (): boolean => preferencesLoaded;

/** Load persisted preferences once. Safe to call from many places. */
export const ensureMediaPreferencesLoaded = (): Promise<MediaPreferences> => {
  if (!hydration) {
    hydration = (async () => {
      try {
        const [soundEffects, music, read] = await Promise.all([
          getSoundEnabled(),
          getMusicEnabled(),
          getReadAloudEnabled(),
        ]);
        preferences = { soundEffects, music, readAloud: read };
      } catch (error) {
        console.warn("[media] Could not load preferences, using defaults:", error);
      }
      applyPreferenceSideEffects();
      preferencesLoaded = true;
      notifyPreferences();
      return preferences;
    })();
  }
  return hydration;
};

export const getMediaPreferences = (): MediaPreferences => preferences;

export const subscribeMediaPreferences = (listener: () => void): (() => void) => {
  preferenceListeners.add(listener);
  return () => {
    preferenceListeners.delete(listener);
  };
};

const persisters: Record<keyof MediaPreferences, (value: boolean) => Promise<void>> = {
  soundEffects: setSoundEnabled,
  music: setMusicEnabled,
  readAloud: setReadAloudEnabled,
};

export const setMediaPreference = (
  key: keyof MediaPreferences,
  value: boolean,
): void => {
  if (preferences[key] === value) return;
  preferences = { ...preferences, [key]: value };
  applyPreferenceSideEffects();
  notifyPreferences();
  void persisters[key](value).catch((error) => {
    console.warn(`[media] Could not persist ${key}:`, error);
  });
};

/* ------------------------------------------------------------------ */
/* Environment + route                                                 */
/* ------------------------------------------------------------------ */

let environment: MediaEnvironment = {
  ...DEFAULT_MEDIA_ENVIRONMENT,
  appActive: AppState.currentState === "active" || AppState.currentState == null,
};
let routePolicy: RouteMediaPolicy = getRouteMediaPolicy("");
let lastPathname = "";

export const getMediaEnvironment = (): MediaEnvironment => environment;
export const getCurrentRouteMediaPolicy = (): RouteMediaPolicy => routePolicy;

/** Call on every pathname change (root layout). */
export const setMediaPathname = (pathname: string): void => {
  const changed = pathname !== lastPathname;
  lastPathname = pathname;
  routePolicy = getRouteMediaPolicy(pathname);
  if (changed) {
    // Narration never follows the learner to another screen.
    readAloud.stop("route-change");
  }
  syncMusic();
};

const handleAppState = (status: AppStateStatus) => {
  environment = { ...environment, appActive: status === "active" };
  if (!environment.appActive) {
    // Policy: speech never resumes on its own after backgrounding.
    readAloud.stop("background");
  }
  syncMusic();
};

let lifecycleInstalled = false;
let lifecycleCleanup: (() => void) | null = null;

/** Install AppState + screen-reader listeners once (root layout). */
export const installMediaLifecycle = (): (() => void) => {
  if (lifecycleInstalled && lifecycleCleanup) return lifecycleCleanup;
  lifecycleInstalled = true;

  void ensureMediaPreferencesLoaded();

  const appStateSub = AppState.addEventListener("change", handleAppState);
  handleAppState((AppState.currentState ?? "active") as AppStateStatus);

  const updateScreenReader = (active: boolean) => {
    environment = { ...environment, screenReaderActive: active };
  };
  void AccessibilityInfo.isScreenReaderEnabled()
    .then(updateScreenReader)
    .catch(() => undefined);
  const readerSub = AccessibilityInfo.addEventListener(
    "screenReaderChanged",
    updateScreenReader,
  );

  lifecycleCleanup = () => {
    appStateSub.remove();
    readerSub.remove();
    readAloud.stop("screen-exit");
    stopMusic();
    lifecycleInstalled = false;
    lifecycleCleanup = null;
  };
  return lifecycleCleanup;
};

/* ------------------------------------------------------------------ */
/* Background music channel                                            */
/* ------------------------------------------------------------------ */

/**
 * Music obeys the same rules as everything else: the `music` preference,
 * a music-enabled surface (game routes) and an active app. No tracks are
 * bundled in this release; `registerMusicTrack` is the extension point and
 * the policy is enforced the moment one is registered.
 */
let musicSource: number | string | null = null;
let musicPlayer: AudioPlayer | null = null;

export const registerMusicTrack = (source: number | string | null): void => {
  stopMusic();
  musicSource = source;
  syncMusic();
};

const stopMusic = () => {
  if (!musicPlayer) return;
  try {
    musicPlayer.pause();
    musicPlayer.remove();
  } catch {
    // ignore unload failures
  }
  musicPlayer = null;
};

export function syncMusic(): void {
  if (musicSource === null) return;
  const allowed = canPlayMusic(preferences, environment, routePolicy);
  if (!allowed) {
    if (musicPlayer) {
      try {
        musicPlayer.pause();
      } catch {
        // ignore
      }
    }
    return;
  }
  try {
    if (!musicPlayer) {
      musicPlayer = createAudioPlayer(musicSource);
      musicPlayer.loop = true;
      musicPlayer.volume = 0.35;
    }
    musicPlayer.play();
  } catch (error) {
    console.warn("[media] Could not play music:", error);
  }
}
