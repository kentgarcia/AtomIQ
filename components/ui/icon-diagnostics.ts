/**
 * Icon diagnostics — one observable path for every missing/invalid icon name.
 *
 * Records are de-duplicated by requested name so a repeated list renders a
 * single warning. A record is kept even when console output is suppressed in
 * production, and listeners can forward it to the app's diagnostics sink.
 */

import { FALLBACK_ICON_NAME, type IconResolution } from "./icon-registry";

export interface IconDiagnostic extends IconResolution {
  /** Optional context such as screen, lesson id, step id, option id. */
  source?: string;
}

type IconDiagnosticListener = (diagnostic: IconDiagnostic) => void;

const reported = new Map<string, IconDiagnostic>();
const listeners = new Set<IconDiagnosticListener>();

function describe(diagnostic: IconDiagnostic): string {
  const alias =
    diagnostic.requested === diagnostic.resolved
      ? ""
      : ` (aliased to "${diagnostic.resolved}")`;
  const source = diagnostic.source ? ` [${diagnostic.source}]` : "";
  return (
    `Icon "${diagnostic.requested}"${alias} is not an installed Iconsax export` +
    `${source}; rendered fallback "${diagnostic.usedFallback ? FALLBACK_ICON_NAME : diagnostic.resolved}".`
  );
}

/**
 * Record an invalid icon and notify listeners. Returns true when this is the
 * first record for the requested name.
 */
export function reportIconDiagnostic(diagnostic: IconDiagnostic): boolean {
  if (reported.has(diagnostic.requested)) return false;

  reported.set(diagnostic.requested, diagnostic);

  for (const listener of listeners) {
    try {
      listener(diagnostic);
    } catch {
      // A broken diagnostics sink must never break rendering.
    }
  }

  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(describe(diagnostic));
  }

  return true;
}

/** Subscribe to new invalid-icon records. Returns an unsubscribe function. */
export function onIconDiagnostic(listener: IconDiagnosticListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** All unique invalid-icon records observed so far (test/diagnostics use). */
export function getIconDiagnostics(): IconDiagnostic[] {
  return [...reported.values()];
}

/** Clear the de-duplication cache (tests only). */
export function resetIconDiagnostics(): void {
  reported.clear();
}
