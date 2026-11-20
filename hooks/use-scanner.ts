import { useEffect, useMemo, useState } from "react";

import type { ScanRecord, ScanTarget } from "@/components/scanner/scanner-core";
import { listScans, loadScanTargets, subscribeScans } from "@/services/scanner";

/** The scannable things and what has been scanned; it follows new scans. */
export function useScanner(): { targets: ScanTarget[]; scans: ScanRecord[]; loaded: boolean; scannedIds: ReadonlySet<string> } {
  const [state, setState] = useState<{ targets: ScanTarget[]; scans: ScanRecord[]; loaded: boolean }>({ targets: [], scans: [], loaded: false });
  useEffect(() => {
    let alive = true;
    const load = () =>
      void Promise.all([loadScanTargets(), listScans()]).then(([targets, scans]) => {
        if (alive) setState({ targets, scans, loaded: true });
      });
    load();
    const stop = subscribeScans(load);
    return () => {
      alive = false;
      stop();
    };
  }, []);
  const scannedIds = useMemo(() => new Set(state.scans.map((s) => s.targetId)), [state.scans]);
  return { ...state, scannedIds };
}
