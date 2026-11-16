/**
 * The "Teacher lines" preference (Settings): whether speech bubbles and sign-off chips show.
 * A tiny external store so every screen follows the switch at once. Defaults to on; the lesson
 * itself never depends on it.
 */

import { useSyncExternalStore } from "react";

import { getTeacherLinesEnabled, setTeacherLinesEnabled } from "@/services/storage";

let enabled = true;
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load() {
  if (loaded) return;
  loaded = true;
  void getTeacherLinesEnabled()
    .then((value) => {
      if (value !== enabled) {
        enabled = value;
        emit();
      }
    })
    .catch(() => undefined);
}

export function setTeacherLines(value: boolean): void {
  enabled = value;
  loaded = true;
  emit();
  void setTeacherLinesEnabled(value).catch(() => undefined);
}

export function useTeacherLines(): boolean {
  load();
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => enabled,
    () => true,
  );
}
