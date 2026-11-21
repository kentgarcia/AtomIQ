/**
 * The quest chest's two animations, baked from assets/lottie/Chest_open.lottie and Chest_loop.lottie
 * (`scripts/bake-lottie-sprites.mjs`): opening (38 frames, once) and the open chest's glow (52
 * frames at 12.5 fps, looping: baked at 104 frames at 25 fps and thinned to every other frame with
 * `scripts/thin-sprite-sheet.mjs`, which halves the picture the phone decodes). Change the numbers here if the sheets are baked again.
 */

import type { SpriteSheetSpec } from "@/components/ui/SpriteSheet";

/** The closed chest as a picture of its own: frame 0 of the opening sheet, cropped pixel for pixel (168 px, 11 KB), so a chest that is only sitting there never decodes the 4.5 MB sheet. */
export const CHEST_CLOSED = require("@/assets/images/chest/chest-closed.webp");
export const CHEST_OPEN: SpriteSheetSpec = { source: require("@/assets/images/chest/chest-open.webp"), cols: 8, frames: 38, fps: 25 };
export const CHEST_LOOP: SpriteSheetSpec = { source: require("@/assets/images/chest/chest-loop.webp"), cols: 8, frames: 52, fps: 12.5 };
