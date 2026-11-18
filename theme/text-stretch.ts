/**
 * Text stretch — draws text taller without making it wider or bigger (TEST: only on the Home map
 * for now, meant for the whole app later).
 *
 * THE CONTROL: `TEXT_STRETCH_Y` below (1 = off, 1.12 = 12% taller).
 *
 * HOW IT IS APPLIED: a screen imports `Text` from "@/components/ui/text" instead of from
 * "react-native" (one line per file). To roll it out, change that import in more files; to remove
 * it, change the import back (or set the number to 1, which turns it off everywhere at once).
 *
 * It is a transform, so layout does not move: it grows from the middle of the line box, which has
 * slack above and below the glyphs.
 */

export const TEXT_STRETCH_Y: number = 1.08;

/** Style that stretches text (nothing at all while the stretch is off). */
export const stretchStyle =
    TEXT_STRETCH_Y === 1
        ? undefined
        : ({ transformOrigin: "center", transform: [{ scaleY: TEXT_STRETCH_Y }] } as const);
