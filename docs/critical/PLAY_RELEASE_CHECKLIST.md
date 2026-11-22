# AtomIQ — Play Release Checklist (run every release)

## 0. Content must be releasable (first release, then every content change)
- [ ] Every source is checked by a person: `content_references`, `scan_target_references`, `safety_card_references`, `map_site_references` all `verified = 1` (safety and health cards first). The publish gate fails on an unverified source.
- [ ] `npm run validate:content` passes, then `npm run release:content -- --publish --notes "…"` (the first publish creates `1.0.0` and starts `shipped-ids.json`, which is what stops a shipped id being renamed or deleted without a reason). Commit the content files together (CLAUDE.md lists them).
- [ ] `npm run check:content-published` passes. Rules for later content changes: `docs/critical/CONTENT_AND_USER_DATA_RULES.md`.

## 1. Version bump (P0-3, `docs/critical/VERSIONING_SPEC.md`)
- [ ] `app.json > expo.version`: bump semver for user-visible releases (e.g. `1.0.0` → `1.0.1`), and the same in `package.json`. `npm run check:version` must pass (it also fails if `expo.android.versionCode` comes back).
- [ ] Build number: **EAS owns it** (`appVersionSource: remote`, `autoIncrement` on `preview` and `production`). Do not edit it by hand. Once, before the first build under this rule, set the counter higher than any versionCode ever uploaded to Play: `npx eas-cli build:version:set -p android` (nothing uploaded yet: start at 1).
- [ ] `npm run sync-content` run so `CONTENT_DB_VERSION` matches the bundled DB.
- [ ] Commit, build, then tag `v<version>+<build number>` on the commit that was built.

## 2. Signing (P0-4, one-time + verify each release)
- [ ] Play App Signing enabled on first upload (recommended default).
- [ ] Upload key credentials held by: ______________ (fill in; EAS manages via `eas credentials`).
- [ ] Never lose the upload key — loss blocks all future updates.

## 3. Build config verify (P0-5)
- [ ] `eas.json > build.production.android.buildType` is `"app-bundle"` (Play rejects APKs).
- [ ] No `targetSdkVersion` / `minSdkVersion` overrides in `app.json` — Expo SDK 58 defaults apply (target API 36 / Android 16, compile API 37, min API 24).
- [ ] In the EAS build log, confirm: `targetSdkVersion = 36`, `compileSdkVersion = 37`, no legacy-`.so` / 16 KB-page-size warnings, and output is a single `.aab`.
- [ ] R8 minification is enabled by default on SDK 58 release builds. Verify the minified preview APK and production AAB on a physical device (fonts, SQLite seeding, images/SVG, audio, TTS, haptics, deep links). Add narrowly scoped keep rules only if a real release-only failure is reproduced.
- [ ] Confirm merged manifest permissions contain ONLY:
  `INTERNET`, `MODIFY_AUDIO_SETTINGS`, `VIBRATE` (if added by plugins).
  Must NOT contain `RECORD_AUDIO` (disabled via `expo-audio` plugin `recordAudioAndroid: false`), `FOREGROUND_SERVICE*`, or location/camera/mic permissions.

## 4. Pre-upload gates
- [ ] `npm run typecheck` clean, `npm run lint` clean-or-triaged.
- [ ] Release AAB installed from the Play **Closed testing** track on a physical device; cold start clean; `[content-db]` log clean.
- [ ] Pre-launch (Firebase Test Lab) report: zero crashes/ANRs.

## 5. Rollout
- [ ] Staged rollout 10% → 50% → 100%; hold 48 h crash-free at 10% before widening.
- [ ] Release notes written; store listing (descriptions, screenshots, feature graphic, policy URL) up to date.
