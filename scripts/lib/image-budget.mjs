/**
 * The picture budget (docs/features/RENDER_COST_SPEC.md A1). A picture is decoded to width x height x 4 bytes when it is first drawn, and
 * that decode is a frame the learner feels: a 3200 x 2560 photo is 31 MB. Photos are shown at most a screen wide, so 1024 px on the long
 * edge is sharp on a phone. A sprite sheet or a store icon may be bigger, but must say why, here, with the most it may decode to.
 */

/** The longest edge of any picture, in pixels. */
export const MAX_EDGE = 1024;
/** The most a picture may take decoded, in MB (1024 x 1024 is 4 MB). */
export const MAX_MB = 4.5;

/** Pictures allowed to be bigger: path (from the repo root) -> { mb: most they may decode to, why }. */
export const EXCEPTIONS = {
  "assets/images/icon.png": { mb: 4.5, why: "the 1024 px store icon Expo asks for (the app itself shows a 256 px copy, mascot/icon-256.png)" },
  "assets/images/platformer/characters/character_shrodi_sheet.png": { mb: 16.5, why: "Shrodi's 62 frame sheet, 256 px a frame so zoomed battles stay sharp; only the platformer loads it" },
  "assets/images/chest/chest-loop.webp": { mb: 6.5, why: "the quest chest's glow, 52 frames at 168 px (a sprite sheet is one picture)" },
  "assets/images/chest/chest-open.webp": { mb: 4.5, why: "the quest chest's opening, 38 frames at 168 px" },
};

/** What is wrong with a picture, or null. `file` is relative to the repo root with forward slashes. */
export function problemWith(file, { w, h }) {
  const mb = (w * h * 4) / 1024 / 1024;
  const exception = EXCEPTIONS[file];
  if (exception) return mb > exception.mb ? `decodes to ${mb.toFixed(1)} MB, over its ${exception.mb} MB exception` : null;
  const edge = Math.max(w, h);
  if (edge > MAX_EDGE) return `${w}x${h}: the long edge is over ${MAX_EDGE} px`;
  if (mb > MAX_MB) return `decodes to ${mb.toFixed(1)} MB, over ${MAX_MB} MB`;
  return null;
}
