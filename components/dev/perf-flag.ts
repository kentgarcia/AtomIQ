/**
 * Whether the performance probe exists in this build. On in every development build, and in a release build only when
 * it was built with `EXPO_PUBLIC_PERF_PROBE=1` (the `preview` profile in eas.json sets it, so the APK that gives the
 * performance verdict carries it; `production` does not). The probe costs one UI-thread callback per frame, so nothing
 * of it runs unless this is true.
 */
export const PERF_PROBE_ON: boolean = __DEV__ || process.env.EXPO_PUBLIC_PERF_PROBE === "1";
