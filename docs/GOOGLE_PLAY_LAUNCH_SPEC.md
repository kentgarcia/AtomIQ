# AtomIQ — Google Play Launch Readiness Spec

**Date:** 2026-09-21
**Baseline upgraded:** 2026-11-07 — Expo SDK 58 / React Native 0.88 / React 19.3 / Expo Router 58 (target API 36, compile API 37, min API 24).
**Baseline inspected:** `app.json` v1.0.0 / versionCode 1, `eas.json`, `package.json` (Expo SDK ~54.0.36, RN 0.81.5, React 19, newArchEnabled), `services/content-db.ts` (CONTENT_DB_VERSION hash-derived), custom tab bar, `expo-av` SFX, `expo-speech` TTS, `expo-haptics`, edge-to-edge enabled.
**Constraint:** tested only in Expo Go on iPhone. Zero Android device testing so far. This spec assumes every Android code path is unverified.

---

## 1. Current-state summary (what's already good)

| Area | State |
|---|---|
| Package ID | `com.dostpnri.atomiq` set in `app.json` — valid, keep it forever once published |
| Icons | `icon.png` 1024×1024 ✓; adaptive foreground 512×512 ✓; background 512×512 ✓; monochrome ✓ |
| Splash | `splash-icon.png` 1024×1024, plugin configured with light/dark bg |
| Orientation | Portrait locked — fine for launch |
| Edge-to-edge | Always enabled on SDK 58 (required for Android 15+ / targetSdk 35+); the old `edgeToEdgeEnabled` flag is no longer valid |
| Keyboard | `softwareKeyboardLayoutMode: resize` set |
| Permissions | Only `INTERNET` — minimal surface |
| Privacy/Terms | In-app `privacy-policy` + `terms-of-service` screens exist |
| Offline-first | Content ships as `assets/database/content.db` (604 KB) + `sync-content.js` hash-versioned reseed; total `assets/` ~21 MB |
| EAS project | `projectId` present; `preview` profile builds APK |

---

## 2. P0 blockers — must fix before any Play submission

### P0-1. Production profile builds an APK; Play requires AAB
`eas.json > build.production.android.buildType` is `"apk"`. Play Console rejects APKs for new apps — production **must** be `aab` (Play signs + splits by ABI).

```json
"production": {
  "android": { "buildType": "app-bundle" }
}
```

Keep `preview` as `apk` for sideload/QA. After changing, run:
`eas build --platform android --profile production`, then `eas submit --platform android`.

### P0-2. `expo-av` is deprecated in SDK 54
`services/game-sfx.ts` and `services/ui-sfx.ts` both import from `expo-av` (`Audio`, `InterruptionModeAndroid/IOS`). In SDK 54 `expo-av` is legacy; the supported path is `expo-audio`. Risk on Android: audio-focus/ducking regressions, silent-mode divergence, background-play policy flags. Decide:
- **Option A (recommended):** migrate both SFX services to `expo-audio` before launch.
- **Option B:** pin + smoke-test `expo-av@~16.0.8` on 3+ physical Android devices and accept deprecation warnings.
Either way, verify `playsInSilentModeIOS`-equivalent behavior has an Android counterpart tested with Ringermode Silent/Vibrate/Normal + a second audio app (Spotify/YouTube) in foreground.

### P0-3. Versioning discipline
`version: 1.0.0` + `versionCode: 1` is correct for a first upload. Rule going forward: **every Play upload bumps `versionCode` (+1 integer, never reused)**; bump `version` (semver string) on user-visible releases. Add a checklist line to the release runbook so a rejected/re-uploaded binary never reuses versionCode 1.

### P0-4. Signing + upload key
Decide once, before first upload: let Play App Signing manage the key (default, recommended). Back up the upload keystore per EAS docs. Record who holds the EAS credentials — losing this blocks all future updates.

### P0-5. Target API / 16 KB page-size readiness
New apps must target the current required API (Android 16 / API 36 as of SDK 58). Expo SDK 58 handles this by default — **do not** override `targetSdkVersion`. Verify in the EAS build log that `targetSdkVersion = 36`, `compileSdkVersion = 37`, and that the build is 16 KB-page-size compatible (SDK 58 + RN 0.88 + New Architecture is; confirm no legacy `.so` warns in the build output).

---

## 3. Android-specific risks (iPhone-only testing debt)

Ordered by likelihood × impact. Each becomes a QA gate in §5.

### A. System back button (HIGH)
Only `app/explorer/atom-maze.tsx:1441` handles `BackHandler`. Everywhere else (lesson flow, quiz, mythbuster runs, onboarding, modals, article/encyclopedia detail) the hardware back button falls through to default router behavior — likely exits the screen mid-quiz or exits the app entirely with no confirm. iPhone has no equivalent, so this is fully untested.
**Spec:** define one global policy — e.g. back always pops router stack; back on tab root does nothing (or double-tap-to-exit toast); back during active game/quiz/lesson shows the same exit-confirmation sheet as the Atom Maze. Implement in root layout, not per-screen.

### B. Edge-to-edge + custom tab bar (HIGH)
`edgeToEdgeEnabled: true` means content draws under the status bar, cutouts, and gesture/3-button nav bar. The app uses a custom floating tab bar (`app/(tabs)/_layout.tsx`, absolute, `bottom: insets.bottom + 16`, `elevation: 16` + iOS shadow props). Verified patterns exist (`useSafeAreaInsets` in ~20 screens) but:
- 3-button nav bar height ≠ gesture bar height; test both.
- The 180px bottom `LinearGradient` fade + floating pill may overlap Android nav scrim or obscure lesson CTA buttons on small screens — audit `lesson/[id].tsx`, `quiz/[id].tsx`, `mythbuster/index.tsx` CTA rows against `insets.bottom`.
- `StatusBar` from `expo-status-bar` is themed by colorScheme only; on Android confirm contrast against dark/light themes with edge-to-edge (no `backgroundColor` prop relied upon).
- Punch-hole/cutout: onboarding hero + full-screen game headers must be checked with `insets.top`.

### C. TTS (`expo-speech`) fragmentation (HIGH)
TTS is core UX (lesson views, quiz, encyclopedia, mythbuster call `Speech.speak` with `{ language: "en", rate: 0.9 }`). Android behavior differs per engine (Google TTS vs Samsung TTS vs none installed), per voice data download state, and per OEM speech-rate clamping. iPhone testing proves nothing here. Also several screens lack `onError` handling — a missing engine can leave `isSpeaking=true` stuck.
**Spec:** on Android, wrap every `speak()` with `Speech.getAvailableVoicesAsync()` / `isSpeakingAsync` guards, add `onError` → reset state + toast, always `Speech.stop()` on unmount/blur (some screens do, audit all), and test with (a) Google TTS default, (b) no TTS engine / offline voice data, (c) rate extremes.

### D. Haptics + Vibration (MEDIUM)
`expo-haptics` `impactAsync(Light/Medium)` and `notificationAsync(Success/Error)` are called in ~10 screens; `Vibration.vibrate(70)` is used for damage feedback. Many low-end Android devices have weak/absent vibrators, and some users disable touch vibration system-wide — calls must never throw or block. Confirm every call is fire-and-forget (`void …`) with try/catch, and that the profile "haptics" toggle gates **both** `expo-haptics` and `Vibration`. Test on at least one device with vibration disabled.

### E. Audio focus + silent/vibrate modes (MEDIUM)
`ui-sfx.ts` installs global `Pressable`/`TouchableOpacity` `defaultProps.onPressIn` click sounds; `game-sfx.ts` caches `Audio.Sound` objects. On Android verify: sounds respect the in-app sound toggle on every route; sounds duck (not blast over) navigation/music per `shouldDuckAndroid`; rapid taps don't overlap/leak (60 ms throttle exists — verify on 120 Hz devices); sounds unload on unmount; no crash when Bluetooth SCO/headset disconnects mid-playback.

### F. Keyboard + `KeyboardAvoidingView` (MEDIUM)
`onboarding.tsx:372` and `(tabs)/profile.tsx:710` use `behavior={ios ? "padding" : "height"}`. `"height"` + `resize` mode is usually right on Android, but profile name inputs + onboarding forms must be tested with Gboard, SwiftKey, and Samsung Keyboard, including autocomplete/autocorrect bars and one-handed mode. Watch for the floating tab bar covering inputs.

### G. SQLite seeding on Android (MEDIUM)
`ensureContentDatabase()` copies the bundled DB via `importAssetDatabaseAsync` (native primitive) with an `expo-file-system` fallback, guarded by version-marker + integrity `SELECT COUNT(*) FROM lessons`. Android-specific failure modes to force-test: fresh install, upgrade over stale `content.db.version`, low-storage (<100 MB free), corrupted DB file, first-launch airplane mode, and `assets/database/content.db-shm/-wal` sidecars leaking into the bundle (they exist in the repo — confirm they are **not** packaged; only `content.db` should ship). Log tag `[content-db]` must be clean in `adb logcat` on first run.

### H. Fonts (MEDIUM-LOW)
9 SNPro weights load via `useFonts`; root layout renders `null` until loaded (no splash-hide race on iOS observed). On Android cold start with slow storage, measure time-to-interactive; confirm fallback doesn't flash system font mid-lesson (`typography.ts` Android branch uses `serif`/`monospace` fallbacks — spot-check Atom Maze `Courier→monospace` substitution rendering). Confirm `expo-font` plugin entry + all `.ttf` files are bundled in the release AAB (test on a fresh install, not dev).

### I. Visual deltas: shadows, SVG, images (LOW-MEDIUM)
- `elevation: 16` vs iOS `shadow*` props render differently — audit cards/tab bar on Android for harsh/offset shadows.
- `react-native-svg` triangle marker + mascot `discover.svg` must render on API 26–36 (no dev-only cache).
- `.webp` feed/author images + `.png` icons via `expo-image` — verify on Android (especially `contentFit="contain"` in tab icons).
- `Platform.select` typography + `monospace` fallbacks — screenshot-compare headings/body on Pixel + Samsung.

### J. `expo-web-browser` / external links (LOW)
`services/open-url.ts` opens links (articles, encyclopedia, LinkedIn in settings). On Android this is Custom Tabs — test Chrome disabled / no browser / work-profile edge cases; every external open must have a `Linking.openURL` fallback (partially present — audit).

---

## 4. Play Console / policy checklist

- [ ] **Package:** `com.dostpnri.atomiq` — immutable after first upload. Confirm no rename planned.
- [ ] **Signing:** Play App Signing on; upload key backed up; EAS `credentials` documented.
- [ ] **Content rating (IARC):** Education app, no ads/IAP; "Community" tab is local bundled articles (no real UGC, no chat with strangers) — answer UGC questions as NO; TTS reads science content only. Complete questionnaire truthfully; expect Everyone / Everyone 10+.
- [ ] **Target audience:** if under-13 can use it, complete Families / Designed for Families declarations if applicable; otherwise set 13+ and reflect in listing + privacy policy.
- [ ] **Data safety form:** app is offline-first (SQLite + AsyncStorage, no account, no analytics seen in deps). Permissions `INTERNET` + `ACCESS_NETWORK_STATE` need justification — if the app truly works fully offline, either **remove** them or declare "no data collected/shared" consistently with actual `expo-web-browser` external opens. Any crash reporting added later invalidates the form — re-declare.
- [ ] **Privacy policy URL (required):** in-app screen is not enough — host `privacy-policy` content at a public URL and link it in Console + in-app settings.
- [ ] **In-app delete-data:** settings has "delete all local data" — verify it wipes SQLite + AsyncStorage + resets onboarding, and describe it in Data safety ("data deletion" path).
- [ ] **Ads/IAP declaration:** none — declare none; ensure no test ad SDK strings in the binary.
- [ ] **News / health claims:** nuclear/radiation-safety educational content — keep tone educational, no medical advice; avoids "News" category pitfalls by listing under **Education**.
- [ ] **Accessibility:** TalkBack traversal of lesson/quiz/game CTAs, minimum 48dp touch targets, content descriptions on icon-only tab buttons.
- [ ] **64-bit + ABI splits:** Play handles via AAB — confirm `arm64-v8a` + `armeabi-v7a` (and x86_64 for Chromebooks if claimed) in build output.

---

## 5. QA gates (do not submit until all green)

### Gate 1 — Build hygiene
- [ ] `npm run typecheck` clean; `npm run lint` clean (or triaged).
- [ ] `node scripts/sync-content.js` run; bundled `content.db` fresh; `CONTENT_DB_VERSION` matches.
- [ ] Release AAB builds from clean checkout via `eas build --platform android --profile production`.
- [ ] Install AAB on a physical device via internal track — cold start, no dev tools.

### Gate 2 — Device matrix (minimum)
| Device class | Example | OS | Nav mode |
|---|---|---|---|
| Pixel (reference) | Pixel 8/9 | Android 15+ | gesture |
| Samsung (OEM skin) | A-series / S-series | Android 14/15 | 3-button + gesture |
| Low-end / 4 GB RAM | Moto G / Redmi | Android 12–13 | 3-button |
| Large screen | 7–10" tablet or foldable | Android 14+ | gesture |
| No-Google-TTS | any with TTS data cleared | — | — |

### Gate 3 — Scenario checklist (each device where marked *)
- [ ] Fresh install → onboarding → tabs; kill + relaunch (fast path, no reseed).
- [ ] Full lesson + quiz + mythbuster quick/challenge/endless with sound ON/OFF, haptics ON/OFF *.
- [ ] TTS on every speak surface; interrupt (navigate away mid-speech); engine-missing case.
- [ ] Hardware back on: lesson mid-step, quiz mid-question, mythbuster mid-run, maze (confirm sheet), modal, tab root *.
- [ ] Rotation attempt (locked portrait — confirm no layout break on foldables), multi-window (Android 12L+), font-size 200% + display-size Large.
- [ ] Airplane mode entire session; low storage; upgrade install over previous versionCode.
- [ ] Dark / Light / System theme + edge-to-edge status/nav contrast *.
- [ ] External links (article, encyclopedia, settings LinkedIn) with Chrome present/absent.
- [ ] Profile: rename, avatar, delete-all-data → onboarding resets.
- [ ] 30-min soak: no ANR, no `Audio.Sound` leak (`adb shell dumpsys meminfo com.dostpnri.atomiq` stable).

### Gate 4 — Pre-launch report
Upload to **Closed testing** first; fix all crashes/ANRs in Pre-launch report (Firebase Test Lab) — especially on API 26–29 if minSdk allows them.

---

## 6. Store listing assets (prepare in parallel)

- [ ] App name: **AtomIQ** (confirm uniqueness vs existing listings).
- [ ] Short description (≤80 chars) + full description (Education-framed, offline-first, no accounts).
- [ ] Icon 512×512 (from 1024 master, check monochrome legibility at 48dp).
- [ ] Feature graphic 1024×500 (no text in safe-zone edges).
- [ ] Screenshots: ≥2 phone (16:9/9:16), 7" + 10" tablet sets; include light + dark theme; lesson, quiz, mythbuster, lab, maze.
- [ ] Category: Education; contact email + website; content-rating badge after questionnaire.
- [ ] Release notes for v1.0.0; staged rollout plan (e.g. 10% → 50% → 100%).

---

## 7. Suggested execution order (4 workstreams)

1. **Build & config (0.5 day):** P0-1 (AAB), P0-3/P0-4 (versioning + signing), confirm targetSdk/page-size in build log, decide P0-2 (expo-audio migration scope).
2. **Android UX hardening (2–4 days):** back-button policy (A), tab-bar/inset audit (B), TTS guards (C), haptics/audio gates (D/E), keyboard pass (F).
3. **Data + fonts verification (0.5–1 day):** seeding edge cases (G), cold-start fonts (H), shadow/SVG/webp sweep (I), Custom Tabs fallback (J).
4. **Console + listing + closed testing (2–5 days wall-clock):** §4 forms, §6 assets, closed-track upload, pre-launch report triage, staged rollout.

**Definition of done:** release AAB from `production` profile passes Gates 1–4, Data-safety + rating + policy URL live, staged rollout at 10% crash-free for 48 h before full rollout.

---

## 8. Decisions needed from you

1. `expo-av` → `expo-audio` migration before v1, or ship pinned + accept deprecation risk?
2. `INTERNET`/`ACCESS_NETWORK_STATE` — anything actually fetched at runtime? If fully offline, remove both to simplify Data safety.
3. Target audience age floor (under-13 allowed?) — determines Families declarations.
4. Privacy-policy public URL host (needed before Console submission).
5. Closed-testing group (emails / Google Group) + rollout % plan.
