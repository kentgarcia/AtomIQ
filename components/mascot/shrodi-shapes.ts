/**
 * Shrodi's head shapes, baked from assets/images/mascot/layers/*.svg by
 * scripts/bake-shrodi-layers.py (do not edit by hand; edit the layer and re-run).
 *
 * Each shape is [x0, y0, then (c1x, c1y, c2x, c2y, x, y) per cubic segment], in Shrodi's
 * units. The head base and the muzzle (`HEAD_INNER`) are rotated upright about the
 * head's vertical axis (x = 0); the eye whites are part of the inner base (both the same oval, mirrored): the
 * white in the glasses is the inner base, and the pupils are the only eyes.
 */

export const HEAD_BASE = [59.2, 11.5, 60.2, -35.5, 20.1, -48.4, -0, -49, -52.7, -48.6, -60.9, -7.6, -58.5, 12.8, -61.7, 13.9, -83.7, 50.8, 3.8, 49, 73.8, 47.6, 69.9, 23.4, 59.2, 11.5] as const;
export const HEAD_INNER = [51.7, 19.8, 52.2, 33, 29.5, 43.7, 0.9, 43.7, -27.7, 43.6, -51.2, 32.9, -51.7, 19.6, -52.2, 6.4, -29.5, -4.3, -0.9, -4.2, 27.7, -4.2, 51.2, 6.6, 51.7, 19.8] as const;
/** The two eye whites (drawn as part of the inner base, and the clip for pupils and lids). */
export const EYE_WHITE_L = [-18.2, -23.1, -25.7, -24.4, -33.2, -17.7, -35, -8, -36.8, 1.7, -32.2, 10.7, -24.8, 12.1, -17.3, 13.5, -9.8, 6.8, -8, -3, -6.2, -12.7, -10.8, -21.7, -18.2, -23.1, -18.2, -23.1, -18.2, -23.1, -18.2, -23.1] as const;
export const EYE_WHITE_R = [18.2, -23.1, 25.7, -24.4, 33.2, -17.7, 35, -8, 36.8, 1.7, 32.2, 10.7, 24.8, 12.1, 17.3, 13.5, 9.8, 6.8, 8, -3, 6.2, -12.7, 10.8, -21.7, 18.2, -23.1, 18.2, -23.1, 18.2, -23.1, 18.2, -23.1] as const;
export const EYE_BOX_L = { cx: -21.5, cy: -5.5, w: 27.9, h: 35.5 } as const;
export const EYE_BOX_R = { cx: 21.5, cy: -5.5, w: 27.9, h: 35.5 } as const;
/** The ear as drawn (viewer's right); the left ear is its exact mirror. */
export const EAR_OUTER_R = [46.4, -70.8, 32.6, -70.7, 11.1, -50.3, 2.6, -40.3, 17, -30.7, 31.4, -21.1, 45.7, -11.6, 52, -30.7, 60.1, -70.8, 46.4, -70.8] as const;
export const EAR_INNER_R = [41.8, -59, 32, -59, 18.1, -43.4, 11.4, -36.2, 19.3, -30.2, 27.1, -24.2, 35, -18.1, 39.3, -31.9, 51.7, -59, 41.8, -59] as const;
export const EAR_OUTER_L = [-46.4, -70.8, -32.6, -70.7, -11.1, -50.3, -2.6, -40.3, -17, -30.7, -31.4, -21.1, -45.7, -11.6, -52, -30.7, -60.1, -70.8, -46.4, -70.8] as const;
export const EAR_INNER_L = [-41.8, -59, -32, -59, -18.1, -43.4, -11.4, -36.2, -19.3, -30.2, -27.1, -24.2, -35, -18.1, -39.3, -31.9, -51.7, -59, -41.8, -59] as const;
/** Where an ear turns (the middle of its hidden base edge), viewer's right; the left is mirrored. */
export const EAR_PIVOT_R = { x: 24.2, y: -25.9 } as const;
