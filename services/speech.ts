import * as Speech from "expo-speech";
import type { SpeechOptions } from "expo-speech";

/**
 * Guarded expo-speech wrapper (Google Play readiness).
 *
 * TTS was only ever tested on iPhone. On Android the engine varies
 * (Google TTS vs Samsung TTS vs none installed, voice data not
 * downloaded, OEM rate clamping), and failures surface as a native
 * `onError` callback that most call sites never handled — leaving
 * `isSpeaking` stuck at true with a dead speaker button.
 *
 * Rules enforced here:
 * - Every `speakSafely` call injects an `onError` handler that funnels
 *   into the caller's `onStopped`, so speaking state always resets.
 * - Synchronous throws (missing engine) and empty text also reset.
 * - Over-long input is truncated to `maxSpeechInputLength`.
 * - `stopSpeech` never throws / never floats an unhandled rejection.
 */

export const stopSpeech = (): void => {
  void (async () => {
    try {
      await Speech.stop();
    } catch {
      // No engine, already stopped, or activity gone — safe to ignore.
    }
  })();
};

/**
 * Strip characters that Android TTS engines choke on. Lesson key points
 * (the only slide type that regularly fails) are full of `•` bullets and
 * stray newlines — Google/Samsung TTS fires `onError` and speaks nothing
 * for those, while iOS reads them fine. Normalizing centrally fixes every
 * call site (lessons, encyclopedia, mythbuster) at once.
 */
const sanitizeSpeechText = (text: string): string =>
  text
    .replace(/[•·▪▫◦]/g, ". ")
    .replace(/\s+/g, " ")
    .replace(/(\.\s*){2,}/g, ". ")
    .trim();

export const speakSafely = (
  text: string,
  options: SpeechOptions = {},
): void => {
  const { onStopped, onError, ...rest } = options;

  const reset = (): void => {
    try {
      onStopped?.();
    } catch {
      // Caller cleanup must never crash the speaker.
    }
  };

  const fail = (error: unknown): void => {
    reset();
    try {
      onError?.(error as Error);
    } catch {
      // Ignore caller error-handler failures.
    }
  };

  const trimmed = sanitizeSpeechText(text ?? "");
  if (!trimmed) {
    reset();
    return;
  }

  const safe =
    trimmed.length > Speech.maxSpeechInputLength
      ? trimmed.slice(0, Speech.maxSpeechInputLength)
      : trimmed;

  try {
    Speech.speak(safe, {
      ...rest,
      onStopped,
      onError: (error: Error) => fail(error),
    });
  } catch (error) {
    fail(error);
  }
};
