/**
 * The Atom Scanner's runtime (docs/PHONE_SPEC.md §8): loads the targets from the content database, binds `scans` to
 * the user-state database, and tells listeners when a scan was recorded. The rules are in
 * `components/scanner/scanner-core.ts`. Nothing here needs a camera or a permission, and nothing throws into a screen.
 */

import { createScanStore, type ScanRecord, type ScansDb, type ScanTarget } from "@/components/scanner/scanner-core";
import { contentRepository } from "@/services/content-db";
import { getDatabase } from "@/services/database";

const store = createScanStore(() => getDatabase() as unknown as ScansDb);

type Listener = () => void;
const listeners = new Set<Listener>();

/** A scan was recorded. */
export function subscribeScans(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let cache: ScanTarget[] | null = null;

/** The scannable things (empty when the content has none). Cached once read. */
export async function loadScanTargets(): Promise<ScanTarget[]> {
  if (cache) return cache;
  try {
    cache = await contentRepository.getScanTargets();
    return cache;
  } catch (error) {
    console.warn("[scanner] targets", error);
    return [];
  }
}

/** What has been scanned so far. Never rejects. */
export async function listScans(): Promise<ScanRecord[]> {
  try {
    return await store.list();
  } catch (error) {
    console.warn("[scanner] list", error);
    return [];
  }
}

/** A scan finished: remember it. `first` is true the first time that target is scanned. Never rejects. */
export async function recordScan(targetId: string): Promise<{ first: boolean; count: number } | null> {
  try {
    const result = await store.record(targetId, Date.now());
    listeners.forEach((l) => {
      try {
        l();
      } catch {
        // A listener's failure never stops the others.
      }
    });
    return result;
  } catch (error) {
    console.warn("[scanner] record", error);
    return null;
  }
}
