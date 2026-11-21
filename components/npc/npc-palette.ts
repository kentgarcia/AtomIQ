/**
 * Colour constants for the NPC teachers (theme exception EX-12).
 *
 * Teachers are fixed-colour characters, like Shrodi (EX-10): the same in light and dark. The
 * official names and values are from Duolingo's public illustration guide, as transcribed in
 * the project skill `duolingo-character-style`. Skin trios and a few hair colours the guide
 * lacks are "custom" and were tuned by eye (docs/features/NPC_TEACHERS_SPEC.md §4.6).
 *
 * Pure data with no imports, so Node tests can read it. Flat #RRGGBB only: no gradients, no alpha.
 */

export const OFFICIAL = {
  // Neutrals
  snow: "#FFFFFF", polar: "#F7F7F7", swan: "#E5E5E5", hare: "#AFAFAF", wolf: "#777777", eel: "#4B4B4B",
  // Reds
  squid: "#EBE3E3", walkingFish: "#FFDFE0", flamingo: "#FFB2B2", pig: "#F5A4A4", crab: "#FF7878", cardinal: "#FF4B4B", fireAnt: "#EA2B2B",
  // Yellows and oranges
  canary: "#FFF5D3", duck: "#FBE56D", bee: "#FFC800", lion: "#FFB100", fox: "#FF9600", cheetah: "#FFCE8E", monkey: "#E5A259", camel: "#E7A601", guineaPig: "#CD7900", grizzly: "#A56644",
  // Greens
  seaSponge: "#D7FFB8", turtle: "#A5ED6E", featherGreen: "#58CC02", maskGreen: "#89E219", treeFrog: "#58A700",
  // Blues
  iguana: "#DDF4FF", anchovy: "#D2E4E8", beluga: "#BBF2FF", moonJelly: "#7AF0F2", blueJay: "#84D8FF", macaw: "#1CB0F6", whale: "#1899D6", humpback: "#2B70C9", narwhal: "#1453A3",
  // Pinks and purples
  starfish: "#FFAADE", beetle: "#CE82FF", betta: "#9069CD", butterfly: "#6F4EA1",
} as const;

/** Face colours the guide gives (eye white, pupil, open mouth, tongue). */
export const FACE = { eyeWhite: "#FFFFFF", pupil: "#3C3C3C", mouth: "#B03A3A", tongue: "#F15A5A", teeth: "#FFFFFF" } as const;

/** Values that are not in the official list, tuned by eye in phase 0. Skin: base, shade, feature. */
export const CUSTOM = {
  skinGuideLight: ["#FFCBA3", "#F5B585", "#E99B5F"],
  skinGuideWarm: ["#F5B092", "#E8946F", "#D97856"],
  skinPink: ["#FFD9C2", "#F8C2A4", "#EBA17E"],
  skinTan: ["#D9A066", "#C4854F", "#A8683A"],
  skinBrown: ["#A56644", "#8E5236", "#753F28"],
  skinOlive: ["#E0B48A", "#CB9A6D", "#B07F52"],
  skinDeep: ["#7A4A33", "#633A27", "#4D2C1D"],
  // Colourful skin for the shop: the official colours cover most of them, these two are between names
  skinBubblegum: ["#FFAADE", "#F58BC7", "#D96AAE"],
  skinAqua: ["#7AF0F2", "#4FD8DB", "#2DB8BC"],
  // Hair colours for the shop that are between official names
  hairBlonde: ["#E8B24A", "#CE9632"],
  hairGinger: ["#D9692A", "#B8501C"],
  hairDark: ["#3B2A24", "#2B1E1A"],
  hairBrown: ["#7C3F25", "#64311D"],
  hairBlack: ["#2E2622", "#211B18"],
  hairWhite: ["#EBE3E3", "#D6C9C9"],
  // The lapels and pockets of a pale coat (`coolShade` in npc-art.ts: the coat colour a fifth of the way to a cool blue): for a white coat, and for Hal's Anchovy one
  coatShade: ["#E4EBEF", "#C0D5DD"],
} as const;

/** Every #RRGGBB the validator accepts: official + face + custom. */
export const ALLOWED_COLORS: ReadonlySet<string> = new Set(
  [
    ...Object.values(OFFICIAL),
    ...Object.values(FACE),
    ...Object.values(CUSTOM).flat(),
    // Lips and shades used by outfits that sit one step darker than an official colour.
  ].map((c) => c.toUpperCase()),
);

/** The muted ("locked") version maps lightness onto this cool pastel ramp. Never grey. */
export const MUTE_DARK: readonly [number, number, number] = [74, 70, 128]; // #4A4680
export const MUTE_LIGHT: readonly [number, number, number] = [222, 218, 255]; // #DEDAFF
/**
 * Clothes are pushed down the ramp in steps of this size until their lightness is at least
 * MUTE_SEPARATION away from the skin's, or hands in front of the clothes vanish (skin and pastel
 * clothes can share a lightness). Deep skin tones need no push.
 */
export const MUTE_CLOTHES_STEP = 0.06;
export const MUTE_SEPARATION = 0.1;

/** Names the cast must not use: Duolingo's own characters are trademarks (spec §4.5). */
export const FORBIDDEN_NAMES: readonly string[] = [
  "duo", "lily", "zari", "bea", "vikram", "eddy", "oscar", "junior", "lin", "falstaff", "lucy", "anna", "ben",
];
