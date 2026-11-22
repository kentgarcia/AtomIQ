/**
 * What build the learner has, as one line: `1.0.1 (7) · content 1.2.0`. Framework-free so
 * `scripts/test-build-info.mjs` runs it under Node. Spec: docs/critical/VERSIONING_SPEC.md section 3.5.
 *
 * Three independent numbers (never derive one from another): the app version (`app.json`), the build number
 * (the Android versionCode, kept by EAS) and the content version (`CONTENT_DB_VERSION`).
 */

import { isDraftVersion } from "./content-db-core.ts";

export interface BuildInfoInput {
  /** `Constants.expoConfig?.version`, or null when the platform gives none. */
  appVersion: string | null | undefined;
  /** `Constants.nativeBuildVersion` (the versionCode on Android), or null (Expo Go and the web have none). */
  buildNumber: string | null | undefined;
  /** `CONTENT_DB_VERSION`. */
  contentVersion: string;
}

const clean = (value: string | null | undefined): string | null => {
  const text = (value ?? "").trim();
  return text.length > 0 ? text : null;
};

/** The app version with the build number when there is one: `1.0.1 (7)`; `Unknown` rather than an invented number. */
export function appVersionLabel({ appVersion, buildNumber }: Pick<BuildInfoInput, "appVersion" | "buildNumber">): string {
  const version = clean(appVersion);
  if (!version) return "Unknown";
  const build = clean(buildNumber);
  return build ? `${version} (${build})` : version;
}

/** The content version as the learner reads it: `1.2.0`, or `draft` plus the working version when it is unpublished. */
export function contentVersionLabel(contentVersion: string): string {
  return isDraftVersion(contentVersion) ? `draft (${contentVersion})` : contentVersion;
}

/** The whole line for the About dialog and a bug report: `1.0.1 (7) · content 1.2.0`. */
export function buildLine(input: BuildInfoInput): string {
  return `${appVersionLabel(input)} · content ${contentVersionLabel(input.contentVersion)}`;
}
