import * as Speech from "expo-speech";

import type { ReadAloudEngine } from "./media-core";

/**
 * expo-speech adapter for the shared Read Aloud controller
 * (services/media-core.ts → services/media.ts).
 *
 * Do NOT call expo-speech from screens. Use `useReadAloud` /
 * `<ReadAloudButton />`, which route through the single controller so every
 * surface shares one state machine (spec §4.1, docs/critical/MEDIA_POLICY.md).
 *
 * Android TTS engines vary (Google vs Samsung vs none installed, voice data
 * missing, OEM rate clamping) and report failures through `onError`; the
 * controller turns every one of those paths into a visible, self-healing
 * state, so this adapter only has to be honest and never throw.
 */
export const expoSpeechEngine: ReadAloudEngine = {
  speak(text, options, callbacks) {
    const safe =
      text.length > Speech.maxSpeechInputLength
        ? text.slice(0, Speech.maxSpeechInputLength)
        : text;

    Speech.speak(safe, {
      language: options.language,
      rate: options.rate,
      pitch: options.pitch,
      onStart: callbacks.onStart,
      onDone: callbacks.onDone,
      onStopped: callbacks.onStopped,
      onError: (error: Error) => callbacks.onError(error),
    });
  },

  async stop() {
    try {
      await Speech.stop();
    } catch {
      // No engine, already stopped, or activity gone — safe to ignore.
    }
  },

  async isSpeaking() {
    try {
      return await Speech.isSpeakingAsync();
    } catch {
      return true; // a failed probe is not evidence of silence
    }
  },
};
