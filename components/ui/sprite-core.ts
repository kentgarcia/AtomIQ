/**
 * Playing a sprite sheet (a grid of frames in one image), as pure maths so it is unit-tested
 * (`scripts/test-sprite.mjs`): which frame a clock shows and where that frame sits in the grid.
 * `SpriteSheet.tsx` only draws it. Sheets are made by `scripts/bake-lottie-sprites.mjs`.
 */

/** The frame to show `elapsedMs` into the animation: it loops, or holds the last frame. */
export function frameIndex(elapsedMs: number, fps: number, count: number, loop: boolean): number {
  'worklet';
  if (count <= 1 || fps <= 0 || !(elapsedMs > 0)) return 0;
  const raw = Math.floor((elapsedMs * fps) / 1000);
  return loop ? raw % count : Math.min(count - 1, raw);
}

/** How far the sheet is moved so frame `index` shows in the window: negative px, in the display size. */
export function cellOffset(index: number, cols: number, size: number): { x: number; y: number } {
  'worklet';
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: -col * size, y: -row * size };
}

/** The whole animation in ms. */
export function sheetDuration(count: number, fps: number): number {
  return Math.round((count / fps) * 1000);
}
