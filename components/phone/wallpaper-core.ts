/**
 * The phone's wallpapers (docs/features/PHONE_SPEC.md §4): the learner's own avatar paint and pattern (`mine`, what a new phone wears), the app's plain
 * page colour (`plain`) or one of five illustrated wallpapers (`wallpaper-art.ts`). Which one is a preference. Framework-free and tested (`test:wallpaper`).
 */

/** The learner's own avatar paint and pattern: the default, what a new phone wears. */
export const OWN_WALLPAPER = "mine";

/** The app's own plain page colour, for a learner who wants the icons on a quiet ground. */
export const PLAIN_WALLPAPER = "plain";

/** The illustrated wallpapers, in the order the picker shows them. All are calm: a few flat shapes and a quiet middle for the icons. */
export const WALLPAPER_IDS = ["orbit", "waves", "hills", "moon", "bubbles"] as const;
export type WallpaperId = (typeof WALLPAPER_IDS)[number];

/** What is chosen: the learner's own paint, the plain page colour, or an illustrated wallpaper. */
export type WallpaperChoice = WallpaperId | typeof OWN_WALLPAPER | typeof PLAIN_WALLPAPER;

/** The order of the picker: the learner's own (the default), the plain colour, then the illustrated ones. */
export const WALLPAPER_CHOICES: readonly WallpaperChoice[] = [OWN_WALLPAPER, PLAIN_WALLPAPER, ...WALLPAPER_IDS];

export const WALLPAPER_NAMES: Readonly<Record<WallpaperChoice, string>> = {
  mine: "My avatar",
  plain: "Plain",
  orbit: "Orbit",
  waves: "Sunny waves",
  hills: "Green hills",
  moon: "Moonlight",
  bubbles: "Bubbles",
};

/** A saved value read back: the plain colour and every wallpaper this version knows are kept; anything else (or nothing saved) is the learner's own. */
export function normalizeWallpaper(raw: unknown): WallpaperChoice {
  if (raw === PLAIN_WALLPAPER) return PLAIN_WALLPAPER;
  return typeof raw === "string" && (WALLPAPER_IDS as readonly string[]).includes(raw) ? (raw as WallpaperId) : OWN_WALLPAPER;
}

/** Whether a choice is one of the illustrated wallpapers. */
export const isIllustrated = (choice: WallpaperChoice): choice is WallpaperId => (WALLPAPER_IDS as readonly string[]).includes(choice);
