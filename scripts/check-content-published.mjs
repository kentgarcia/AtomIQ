#!/usr/bin/env node
/**
 * Release gate: bundled content must be a published version, never a draft.
 *
 *   npm run check:content-published
 *
 * Wired into `eas-build-post-install`, so production EAS builds fail when the
 * bundle carries unpublished edits. Other EAS profiles (preview/development)
 * only warn, so testers can install a build with draft content. Set
 * ATOMIQ_ALLOW_DRAFT=1 to downgrade the failure to a warning anywhere.
 */
import { makePaths } from "./lib/content-paths.mjs";
import { checkPublished } from "./lib/releases.mjs";

const result = checkPublished(makePaths());
if (result.ok) {
  console.log(`[content] ${result.message}`);
  process.exit(0);
}

const profile = process.env.EAS_BUILD_PROFILE;
const lenient = process.env.ATOMIQ_ALLOW_DRAFT === "1" || (profile && profile !== "production");
console.error(`[content] ${lenient ? "WARNING" : "ERROR"}: ${result.message}`);
process.exit(lenient ? 0 : 1);
