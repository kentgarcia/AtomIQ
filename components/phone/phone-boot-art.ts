/**
 * The phone's power-on screen colours (EX-18): fixed, a dark phone screen whatever the app's theme, like a real phone starting.
 * Flat colour only. The bar's yellow is the lesson yellow.
 */
export const BOOT_COLORS = {
  screen: "#0E1318",
  word: "#FFFFFF",
  track: "#FFFFFF2E",
  fill: "#FFC800",
} as const;

/** Sizes, dp. */
export const BOOT_SIZES = { logo: 96, logoRadius: 26, trackWidth: 140, trackHeight: 6 } as const;
