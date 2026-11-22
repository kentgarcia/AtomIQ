# Versioning spec

Status: **built 2026-11-22 except the steps that need a person** (section 6): the EAS config, `check:version`, the Settings line and its test are in; seeding the remote build counter, publishing content `1.0.0` (needs every source verified) and the two Play docs' older text are not. Written after the first EAS `preview` APK, when every build turned out to carry the same numbers.

## 1. The problem

Today any two builds, made days apart, are indistinguishable:

| Where | Value now | Notes |
| --- | --- | --- |
| `app.json` `expo.version` | `1.0.0` | shown in Settings (`app/settings.tsx`, `APP_VERSION`) |
| `package.json` `version` | `1.0.0` | a second copy, nothing reads it |
| `app.json` `expo.android.versionCode` | `1` | edited by hand |
| `eas.json` `cli.appVersionSource` | not set | EAS warns it will be required; today it falls back to `app.json` |
| `CONTENT_DB_VERSION` | `0.0.0+draft.37c177` | no content release has been published yet |

Consequences: a tester cannot say which build they have, a bug report cannot be tied to a build, Google Play rejects a reused `versionCode` (even for a rejected binary), and a draft-content build looks the same as a published one.

## 2. The numbers and who owns each

There are four independent version axes. Never derive one from another.

1. **App version** (`expo.version`, semver `MAJOR.MINOR.PATCH`). What the learner sees. Bumped by a person when something user-visible ships. Owner: `app.json`.
2. **Build number** (`versionCode`, one integer). What Android and Play compare. Goes up on **every** binary that is built, never reused, never lowered. Owner: **EAS** (see 3), not a hand edit.
3. **Content version** (`CONTENT_DB_VERSION`, semver, or `<last>+draft.<hash>`). Owner: the content pipeline (`npm run release:content`). Never edited by hand (CLAUDE.md). It moves on its own schedule: new lessons can ship by over-the-air update or inside the next build, and a build can carry old content.
4. **Content schema version** (`CONTENT_SCHEMA_VERSION`) and **legal version** (`LEGAL_VERSION`). Bumped only by the rules already written for them (a schema change is a content major; a changed Privacy Policy or Terms text bumps `LEGAL_VERSION`).

A build is identified by the triple **app version + build number + content version**, for example `1.0.1 (7) · content 1.2.0`.

## 3. Decisions

### 3.1 EAS owns the build number

In `eas.json`:

```json
{
  "cli": { "version": ">= 13.2.0", "appVersionSource": "remote" },
  "build": {
    "preview":    { "distribution": "internal", "android": { "buildType": "apk" }, "autoIncrement": true },
    "production": { "autoIncrement": true, "android": { "buildType": "app-bundle" } }
  }
}
```

- `remote` keeps the counter on Expo's servers, so two machines or a retry can never collide, and one counter covers APKs and AABs (Play only ever sees the AAB, but a gap in numbers is harmless; a repeat is not).
- Seed the counter once, before the first build under this rule, to a number **higher than any versionCode ever uploaded to Play**: `npx eas-cli build:version:set -p android`. Check the Play Console first. If nothing was ever uploaded, start from the current `1`.
- Once remote is on, `expo.android.versionCode` in `app.json` is no longer the source. Delete it so nobody edits a number that does nothing.
- `development` builds do not need `autoIncrement`.

Open check before adopting: confirm in the EAS docs for the installed `eas-cli` that `autoIncrement` with `appVersionSource: "remote"` is the supported pairing (the CLI itself warns about `appVersionSource`), and that the first build after the switch prints the number it used.

### 3.2 One source for the semver

`app.json` `expo.version` is the source. `package.json` `version` must equal it (or be dropped from the rules). Add a check, `npm run check:version`, that fails when they differ, and wire it into `eas-build-post-install` next to `check:content-published`, the same way. Cheap, and it removes the "which one did I forget" question.

### 3.3 Bump rules for the app version

| Change | Bump |
| --- | --- |
| Any build handed to testers that differs from the last one by code only | none (the build number tells them apart) |
| A release to Play (any track): fixes only | patch |
| A release to Play with a new feature or screen | minor |
| A change that breaks stored data or needs a reinstall, or a rewrite | major |

The build number goes up on every build; the app version only on a release. Two builds can share `1.0.1` and still differ by `(7)` and `(8)`.

### 3.4 Content version in a build

- **`preview` (tester APK):** may carry a draft (`+draft.<hash>`). That is what `check-content-published.mjs` already allows (it warns).
- **`production` (Play AAB):** must carry a published content version. The gate already fails the build otherwise (`ATOMIQ_ALLOW_DRAFT=1` overrides, do not use it for a release).
- The first release is a published `1.0.0` (the ledger says "first publish creates 1.0.0"). Do this before the first production build. It needs every source verified (`verified = 1`), so schedule the review.

### 3.5 Show the build inside the app

Settings should show the whole triple, not only `expo.version`. Sources, all already available:

- app version: `Constants.expoConfig?.version`
- build number: `Constants.nativeBuildVersion` (the Android versionCode)
- content version: `CONTENT_DB_VERSION` from `services/content-db.ts`

Suggested line under the version row: `1.0.1 (7) · content 1.2.0`, with `draft` shown plainly when the content is a draft. A tap-to-copy on it makes bug reports easy. Remove the hard-coded `"1.0.0"` fallback in `APP_VERSION`, because a wrong number is worse than none.

### 3.6 Record every build

Per release (Play), not per tester build:

1. Git tag `v<app version>+<build number>` on the commit that was built, for example `v1.0.1+7`.
2. Commit the content files first if a publish happened (CLAUDE.md lists them), so the tag contains the content that shipped.
3. If the release also goes out as an over-the-air update, `npm run release:content -- --record-update <eas-group-id>`.

EAS builds the working tree, so an uncommitted tree gives a build that no tag can reproduce. Commit before a release build; for a quick tester APK it is optional.

## 4. Release runbook (what to do, in order)

Tester APK (`preview`):

1. `npm run typecheck`, `npm run lint`, the check and test scripts for what changed.
2. `npm run validate:content` then `npm run sync-content`.
3. `npx eas-cli build -p android --profile preview`. The build number goes up by itself.
4. Note the number from the build page next to the issue or the test round.

Play release (`production`):

1. Publish content: `npm run release:content -- --publish --notes "…"`, and commit the content files.
2. Bump `expo.version` in `app.json` (and `package.json`); commit.
3. All gates above, plus `check:content-published` and `check:version`.
4. `npx eas-cli build -p android --profile production`.
5. Tag `v<version>+<build>`; record the update id if any.
6. Update `docs/critical/PLAY_RELEASE_CHECKLIST.md` section 1 to match this spec.

## 5. Docs that disagree with this spec

- `docs/critical/PLAY_RELEASE_CHECKLIST.md` section 1 and `docs/critical/GOOGLE_PLAY_LAUNCH_SPEC.md` P0-3 tell people to bump `versionCode` by hand in `app.json`. Replace with "EAS auto-increments it".
- Both call `node scripts/sync-content.js`; the script is `npm run sync-content`.
- `GOOGLE_PLAY_LAUNCH_SPEC.md` still names Expo SDK 54; the project is on SDK 58.

## 6. Work to do (in order)

Done: 1 (config; the counter still has to be seeded once with `npx eas-cli build:version:set -p android`), 2 (`services/build-info-core.ts`, `test:build-info`; no tap-to-copy because `expo-clipboard` is not installed), 3 (`check:version`, in `eas-build-post-install`), 5 (the Play checklist, CLAUDE.md). Open: 4.


1. Set `appVersionSource: "remote"` and `autoIncrement`; seed the counter; remove `versionCode` from `app.json`.
2. Settings: show app version, build number and content version (`test` for the formatting helper, kept in a framework-free `*-core.ts` like the rest).
3. `scripts/check-version.mjs` and `npm run check:version`; add to `eas-build-post-install`.
4. Publish content `1.0.0` once sources are verified.
5. Update the two Play docs and add a short pointer to this spec in `CLAUDE.md` under Commands.

## 7. Not decided

- Whether to ship content over the air (`expo-updates` is not installed today) or only inside builds. Until it is, a content change means a new build, and the content version in the triple is the only way to tell what a build has.
- Whether tester APKs should show a visible "preview" badge in Settings (`process.env.EAS_BUILD_PROFILE` is available at build time through `app.config.ts`, which the project does not have yet).
