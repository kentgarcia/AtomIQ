/**
 * The quest chest's two animations, baked from assets/lottie/Chest_open.lottie and Chest_loop.lottie
 * (`scripts/bake-lottie-sprites.mjs`): opening (38 frames, once) and the open chest's glow (104
 * frames, looping). Change the numbers here if the sheets are baked again.
 */

import type { SpriteSheetSpec } from "@/components/ui/SpriteSheet";

export const CHEST_OPEN: SpriteSheetSpec = { source: require("@/assets/images/chest/chest-open.webp"), cols: 8, frames: 38, fps: 25 };
export const CHEST_LOOP: SpriteSheetSpec = { source: require("@/assets/images/chest/chest-loop.webp"), cols: 8, frames: 104, fps: 25 };
