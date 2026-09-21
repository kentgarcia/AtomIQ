import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { getSoundEnabled } from "./storage";

export type GameSfx = "punch" | "correct" | "wrong" | "gameover";

const sfxSources: Record<GameSfx, number> = {
  punch: require("../assets/sfx/punch.mp3"),
  correct: require("../assets/sfx/correct.mp3"),
  wrong: require("../assets/sfx/wrong.mp3"),
  gameover: require("../assets/sfx/gameover.mp3"),
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
    const soundEnabled = await getSoundEnabled();
    if (!soundEnabled) {
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
