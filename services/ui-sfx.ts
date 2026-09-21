import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
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
let clickPlayer: AudioPlayer | null = null;
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
    // UI clicks: mix with other apps (no audio-focus steal on Android),
    // play in silent mode (iOS), never record or run in background.
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
      allowsRecording: false,
      shouldPlayInBackground: false,
    });
  } catch (error) {
    console.warn("Unable to configure audio mode for UI SFX:", error);
  } finally {
    audioModeConfigured = true;
  }
};

const getOrCreateClickPlayer = (): AudioPlayer => {
  if (clickPlayer) {
    return clickPlayer;
  }

  const player = createAudioPlayer(buttonClickSource);
  player.volume = 0.65;
  clickPlayer = player;
  return player;
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
  try {
    getOrCreateClickPlayer();
  } catch (error) {
    console.warn("Unable to preload button click SFX:", error);
  }
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
    const player = getOrCreateClickPlayer();
    try {
      await player.seekTo(0);
    } catch {
      // Seek can fail before the source finishes loading; fall through
      // and attempt playback anyway.
    }
    player.play();
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
  if (!clickPlayer) {
    return;
  }

  try {
    clickPlayer.remove();
  } catch {
    // Ignore unload failures.
  } finally {
    clickPlayer = null;
  }
};
