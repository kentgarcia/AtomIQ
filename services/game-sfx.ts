import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { getSoundEnabled } from "./storage";

export type GameSfx = "punch" | "correct" | "wrong" | "gameover";

const sfxSources: Record<GameSfx, number> = {
  punch: require("../assets/sfx/punch.mp3"),
  correct: require("../assets/sfx/correct.mp3"),
  wrong: require("../assets/sfx/wrong.mp3"),
  gameover: require("../assets/sfx/gameover.mp3"),
};

const soundCache: Partial<Record<GameSfx, Audio.Sound>> = {};
let audioModeConfigured = false;

const configureAudioMode = async () => {
  if (audioModeConfigured) {
    return;
  }

  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      playThroughEarpieceAndroid: false,
    });
  } catch (error) {
    console.warn("Unable to configure audio mode for game SFX:", error);
  } finally {
    audioModeConfigured = true;
  }
};

const getOrCreateSound = async (type: GameSfx): Promise<Audio.Sound> => {
  const cached = soundCache[type];
  if (cached) {
    return cached;
  }

  const { sound } = await Audio.Sound.createAsync(sfxSources[type], {
    shouldPlay: false,
    volume: 1,
  });

  soundCache[type] = sound;
  return sound;
};

export const preloadGameSfx = async (): Promise<void> => {
  await configureAudioMode();
  await Promise.all(
    (Object.keys(sfxSources) as GameSfx[]).map(getOrCreateSound),
  );
};

export const playGameSfx = async (type: GameSfx): Promise<void> => {
  try {
    const soundEnabled = await getSoundEnabled();
    if (!soundEnabled) {
      return;
    }

    await configureAudioMode();
    const sound = await getOrCreateSound(type);
    await sound.replayAsync();
  } catch (error) {
    console.warn(`Unable to play ${type} game SFX:`, error);
  }
};

export const unloadGameSfx = async (): Promise<void> => {
  const sounds = Object.values(soundCache).filter(Boolean) as Audio.Sound[];

  await Promise.all(
    sounds.map(async (sound) => {
      try {
        await sound.unloadAsync();
      } catch {
        // Ignore unload failures.
      }
    }),
  );

  for (const key of Object.keys(soundCache) as GameSfx[]) {
    delete soundCache[key];
  }
};
