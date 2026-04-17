import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { Pressable, TouchableOpacity } from "react-native";
import { getSoundEnabled } from "./storage";

const buttonClickSource = require("../assets/sfx/button-click.mp3");

const GAME_ROUTE_PATTERNS = [
  /^\/quiz(?:\/|$)/,
  /^\/quiz-results(?:\/|$)/,
  /^\/mythbuster(?:\/|$)/,
  /^\/lesson(?:\/|$)/,
  /^\/lab(?:\/|$)/,
  /^\/explorer\/atom-maze(?:\/|$)/,
  /^\/atom-maze(?:\/|$)/,
];

let audioModeConfigured = false;
let clickSound: Audio.Sound | null = null;
let soundEnabledCache: boolean | null = null;
let currentPathname = "";
let handlersInstalled = false;
let lastClickAt = 0;

const normalizePathname = (pathname?: string | null): string => {
  if (!pathname) {
    return "";
  }

  return pathname
    .toLowerCase()
    .replace(/\/(\([^/]+\))/g, "")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
};

const shouldPlayForCurrentRoute = (): boolean => {
  const normalized = normalizePathname(currentPathname);

  if (!normalized) {
    return true;
  }

  return !GAME_ROUTE_PATTERNS.some((pattern) => pattern.test(normalized));
};

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
    console.warn("Unable to configure audio mode for UI SFX:", error);
  } finally {
    audioModeConfigured = true;
  }
};

const getOrCreateClickSound = async (): Promise<Audio.Sound> => {
  if (clickSound) {
    return clickSound;
  }

  const { sound } = await Audio.Sound.createAsync(buttonClickSource, {
    shouldPlay: false,
    volume: 0.65,
  });

  clickSound = sound;
  return sound;
};

const getSoundEnabledCached = async (): Promise<boolean> => {
  if (soundEnabledCache !== null) {
    return soundEnabledCache;
  }

  soundEnabledCache = await getSoundEnabled();
  return soundEnabledCache;
};

export const setUiSfxEnabled = (enabled: boolean): void => {
  soundEnabledCache = enabled;
};

export const setUiSfxPathname = (pathname: string): void => {
  currentPathname = pathname;
};

export const initializeUiSfx = async (): Promise<void> => {
  await configureAudioMode();
  await getOrCreateClickSound();
  await getSoundEnabledCached();
};

export const playButtonClickSfx = async (): Promise<void> => {
  try {
    if (!shouldPlayForCurrentRoute()) {
      return;
    }

    const now = Date.now();
    if (now - lastClickAt < 60) {
      return;
    }

    const soundEnabled = await getSoundEnabledCached();
    if (!soundEnabled) {
      return;
    }

    lastClickAt = now;
    await configureAudioMode();
    const sound = await getOrCreateClickSound();
    await sound.replayAsync();
  } catch (error) {
    console.warn("Unable to play button click SFX:", error);
  }
};

export const installGlobalUiSfxHandlers = (): void => {
  if (handlersInstalled) {
    return;
  }

  const touchableOpacityAny = TouchableOpacity as any;
  touchableOpacityAny.defaultProps = touchableOpacityAny.defaultProps || {};
  const originalTouchableOnPressIn = touchableOpacityAny.defaultProps.onPressIn;
  touchableOpacityAny.defaultProps.onPressIn = (event: unknown) => {
    void playButtonClickSfx();
    originalTouchableOnPressIn?.(event);
  };

  const pressableAny = Pressable as any;
  pressableAny.defaultProps = pressableAny.defaultProps || {};
  const originalPressableOnPressIn = pressableAny.defaultProps.onPressIn;
  pressableAny.defaultProps.onPressIn = (event: unknown) => {
    void playButtonClickSfx();
    originalPressableOnPressIn?.(event);
  };

  handlersInstalled = true;
};

export const unloadUiSfx = async (): Promise<void> => {
  if (!clickSound) {
    return;
  }

  try {
    await clickSound.unloadAsync();
  } catch {
    // Ignore unload failures.
  } finally {
    clickSound = null;
  }
};
