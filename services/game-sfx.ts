import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { canPlayGameSfx } from "./media-core";
import {
  ensureMediaPreferencesLoaded,
  getMediaEnvironment,
  getMediaPreferences,
} from "./media";

export type GameSfx = "punch" | "correct" | "wrong" | "gameover";

const sfxSources: Record<GameSfx, number> = {
  // Interim mapping to the new library; docs/SFX_SPEC.md replaces this file with the cue catalog.
  punch: require("../assets/sfx/ui/lock.wav"),
  correct: require("../assets/sfx/lesson/answer-correct.wav"),
  wrong: require("../assets/sfx/lesson/answer-wrong.wav"),
  gameover: require("../assets/sfx/game/over.wav"),
};

const soundCache: Partial<Record<GameSfx, AudioPlayer>> = {};
let audioModeConfigured = false;

const configureAudioMode = async () => {
  if (audioModeConfigured) {
    return;
  }

  try {
    // Short game effects: play in silent mode (iOS), mix with other apps
    // (no audio-focus steal on Android), never record or run in background.
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
      allowsRecording: false,
      shouldPlayInBackground: false,
    });
  } catch (error) {
    console.warn("Unable to configure audio mode for game SFX:", error);
  } finally {
    audioModeConfigured = true;
  }
};

const getOrCreatePlayer = (type: GameSfx): AudioPlayer => {
  const cached = soundCache[type];
  if (cached) {
    return cached;
  }

  const player = createAudioPlayer(sfxSources[type]);
  player.volume = 1;
  soundCache[type] = player;
  return player;
};

export const preloadGameSfx = async (): Promise<void> => {
  await configureAudioMode();
  for (const type of Object.keys(sfxSources) as GameSfx[]) {
    try {
      getOrCreatePlayer(type);
    } catch (error) {
      console.warn(`Unable to preload ${type} game SFX:`, error);
    }
  }
};

export const playGameSfx = async (type: GameSfx): Promise<void> => {
  try {
    // One preference source + lifecycle gate shared with UI clicks.
    await ensureMediaPreferencesLoaded();
    if (!canPlayGameSfx(getMediaPreferences(), getMediaEnvironment())) {
      return;
    }

    await configureAudioMode();
    const player = getOrCreatePlayer(type);
    try {
      await player.seekTo(0);
    } catch {
      // Seek can fail before the source finishes loading; fall through
      // and attempt playback anyway.
    }
    player.play();
  } catch (error) {
    console.warn(`Unable to play ${type} game SFX:`, error);
  }
};

/** Correct/wrong feedback — the same cue on every learning surface. */
export const playAnswerSfx = (isCorrect: boolean): Promise<void> =>
  playGameSfx(isCorrect ? "correct" : "wrong");

export const unloadGameSfx = async (): Promise<void> => {
  for (const key of Object.keys(soundCache) as GameSfx[]) {
    const player = soundCache[key];
    if (!player) {
      continue;
    }
    try {
      player.remove();
    } catch {
      // Ignore unload failures.
    }
    delete soundCache[key];
  }
};
