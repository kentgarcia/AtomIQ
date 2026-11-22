/**
 * The language the learner reads authored content in (docs/features/CONTENT_SOURCE_I18N_SPEC.md): one module-level value that
 * screens follow with `useContentLocale`. `initContentLocale` reads the saved choice once at start-up; until then, and when
 * nothing is saved, it is the base language, which reads the content exactly as written. `setContentLocale` changes it at once
 * and saves it. Which languages exist is `contentRepository.getTranslationLocales()`; the rules are in
 * `content/i18n/i18n-core.ts`.
 */
import { useSyncExternalStore } from "react";

import { BASE_LOCALE, normalizeLocale } from "@/content/i18n/i18n-core";
import { STORAGE_KEYS, getItem, setItem } from "@/services/storage";

let locale: string = BASE_LOCALE;
const listeners = new Set<() => void>();

const apply = (next: string) => {
  if (next === locale) return;
  locale = next;
  listeners.forEach((l) => l());
};

export const getContentLocale = (): string => locale;

export async function initContentLocale(): Promise<void> {
  try {
    apply(normalizeLocale(await getItem<string>(STORAGE_KEYS.CONTENT_LOCALE)) ?? BASE_LOCALE);
  } catch {
    apply(BASE_LOCALE);
  }
}

/** Pass the base language (or a code that is not one) to read the content as written. */
export async function setContentLocale(next: string): Promise<void> {
  const chosen = normalizeLocale(next) ?? BASE_LOCALE;
  apply(chosen);
  try {
    await setItem(STORAGE_KEYS.CONTENT_LOCALE, chosen);
  } catch {
    // The language is in use for this session even if it could not be saved.
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useContentLocale = (): string => useSyncExternalStore(subscribe, getContentLocale, getContentLocale);
