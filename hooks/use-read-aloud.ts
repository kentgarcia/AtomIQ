import { useCallback, useEffect, useSyncExternalStore } from "react";

import {
  getMediaPreferences,
  readAloud,
  subscribeMediaPreferences,
} from "@/services/media";
import type {
  MediaPreferences,
  ReadAloudEndReason,
  ReadAloudStatus,
} from "@/services/media-core";

export const useMediaPreferences = (): MediaPreferences =>
  useSyncExternalStore(
    subscribeMediaPreferences,
    getMediaPreferences,
    getMediaPreferences,
  );

export interface UseReadAloud {
  /** Visible state for THIS control (always `idle` when another control owns the channel). */
  status: ReadAloudStatus;
  /** True only while this control is loading or speaking. */
  isActive: boolean;
  /** Read Aloud is turned on in Settings. */
  enabled: boolean;
  /** Play, or stop if this control is already active. */
  toggle: (text: string) => void;
  /** Always (re)start from the beginning — replay. */
  speak: (text: string) => void;
  /** Stop if this control owns the channel. */
  stop: (reason?: ReadAloudEndReason) => void;
}

/**
 * The only way a screen talks to Read Aloud.
 *
 * `ownerId` identifies the control ("quiz:atomic-basics:q3", "guide:message").
 * Changing it (next question, next slide) or unmounting stops this control's
 * narration, so audio can never outlive the thing it was reading.
 */
export function useReadAloud(ownerId: string): UseReadAloud {
  const snapshot = useSyncExternalStore(
    readAloud.subscribe,
    readAloud.getSnapshot,
    readAloud.getSnapshot,
  );
  const { readAloud: enabled } = useMediaPreferences();

  useEffect(() => {
    return () => {
      readAloud.stop("screen-exit", ownerId);
    };
  }, [ownerId]);

  const mine = snapshot.ownerId === ownerId;
  const status: ReadAloudStatus = mine ? snapshot.status : "idle";

  const toggle = useCallback(
    (text: string) => {
      void readAloud.toggle({ ownerId, text });
    },
    [ownerId],
  );
  const speak = useCallback(
    (text: string) => {
      void readAloud.speak({ ownerId, text });
    },
    [ownerId],
  );
  const stop = useCallback(
    (reason: ReadAloudEndReason = "stopped") => {
      readAloud.stop(reason, ownerId);
    },
    [ownerId],
  );

  return {
    status,
    isActive: mine && (status === "loading" || status === "speaking"),
    enabled,
    toggle,
    speak,
    stop,
  };
}
