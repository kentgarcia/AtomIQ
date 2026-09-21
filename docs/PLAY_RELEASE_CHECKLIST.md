# AtomIQ — Play Release Checklist (run every release)

## 1. Version bump (P0-3)
- [ ] `app.json > expo.version`: bump semver for user-visible releases (e.g. `1.0.0` → `1.0.1`).
- [ ] `app.json > expo.android.versionCode`: **+1 integer, never reuse** — not even for a rejected binary. Play rejects reused versionCodes.
- [ ] `node scripts/sync-content.js` run so `CONTENT_DB_VERSION` matches the bundled DB (content changes auto-bump it).

## 2. Signing (P0-4, one-time + verify each release)
- [ ] Play App Signing enabled on first upload (recommended default).
- [ ] Upload key credentials held by: ______________ (fill in; EAS manages via `eas credentials`).
- [ ] Never lose the upload key — loss blocks all future updates.

## 3. Build config verify (P0-5)
- [ ] `eas.json > build.production.android.buildType` is `"app-bundle"` (Play rejects APKs).
- [ ] No `targetSdkVersion` / `minSdkVersion` overrides in `app.json` — Expo SDK 54 defaults apply (target API 35 / Android 15, min API 24).
- [ ] In the EAS build log, confirm: `targetSdkVersion = 35`, no legacy-`.so` / 16 KB-page-size warnings, and output is a single `.aab`.
- [ ] Confirm merged manifest permissions contain ONLY:
  `INTERNET`, `ACCESS_NETWORK_STATE`, `MODIFY_AUDIO_SETTINGS`, `VIBRATE` (if added by plugins).
  Must NOT contain `RECORD_AUDIO` (disabled via `expo-audio` plugin `recordAudioAndroid: false`), `FOREGROUND_SERVICE*`, or location/camera/mic permissions.

## 4. Pre-upload gates
- [ ] `npm run typecheck` clean, `npm run lint` clean-or-triaged.
- [ ] Release AAB installed from the Play **Closed testing** track on a physical device; cold start clean; `[content-db]` log clean.
- [ ] Pre-launch (Firebase Test Lab) report: zero crashes/ANRs.

## 5. Rollout
- [ ] Staged rollout 10% → 50% → 100%; hold 48 h crash-free at 10% before widening.
- [ ] Release notes written; store listing (descriptions, screenshots, feature graphic, policy URL) up to date.
