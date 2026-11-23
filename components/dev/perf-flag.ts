/**
 * Whether the performance probe exists in this build: development builds only, the same rule as the dev admin panel.
 * A release build (preview APK or production bundle) never has it, because Metro folds `__DEV__` to false and drops
 * the files behind it. To measure on a release-like build again, turn this into
 * `__DEV__ || process.env.EXPO_PUBLIC_PERF_PROBE === "1"` and build with that variable set. The probe costs one
 * UI-thread callback per frame, so nothing of it runs unless this is true.
 */
export const PERF_PROBE_ON: boolean = __DEV__;
