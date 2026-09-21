import * as Haptics from "expo-haptics";
import { Vibration } from "react-native";
import { getHapticsEnabled } from "./storage";

/**
 * Guarded haptics wrapper (Google Play readiness).
 *
 * Many low-end Android devices have weak or absent vibrators, and users
 * can disable touch vibration system-wide — raw `expo-haptics` promises
 * then reject, and every floating (non-awaited) call site becomes an
 * unhandled rejection. This module centralizes all feedback:
 *
 * - Every call is fire-and-forget, wrapped in try/catch.
 * - Every call honors the user-facing haptics toggle (settings screen),
 *   including `Vibration.vibrate`, which the toggle previously ignored.
 */

let hapticsGate: boolean | null = null;

export const setHapticsGate = (enabled: boolean): void => {
  hapticsGate = enabled;
};

const isEnabled = async (): Promise<boolean> => {
  if (hapticsGate !== null) {
    return hapticsGate;
  }
  try {
    hapticsGate = await getHapticsEnabled();
  } catch {
    hapticsGate = true;
  }
  return hapticsGate;
};

const run = (fn: () => Promise<unknown> | unknown): void => {
  void (async () => {
    try {
      if (!(await isEnabled())) {
        return;
      }
      await fn();
    } catch {
      // Absent vibrator / disabled vibration — safe to ignore.
    }
  })();
};

export const impactLight = (): void => {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
};

export const impactMedium = (): void => {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
};

export const notifySuccess = (): void => {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
};

export const notifyError = (): void => {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
};

export const select = (): void => {
  run(() => Haptics.selectionAsync());
};

/** Gated replacement for `Vibration.vibrate` (Atom Maze damage feedback). */
export const vibrate = (pattern: number | number[]): void => {
  run(async () => {
    Vibration.vibrate(pattern);
  });
};
