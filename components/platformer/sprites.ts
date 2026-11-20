/**
 * The platformer's pictures: Kenney's New Platformer Pack (CC0), required one by one because Metro
 * needs every `require` spelled out. The pack itself stays in `tools/platformer-art/` as the library; only what
 * the game uses is moved into `assets/images/platformer/<group>/` (backgrounds, enemies, tiles, props, hud,
 * characters), as DOUBLE-size copies drawn from the pack's SVGs by scripts/bake-platformer-sprites-2x.mjs (so
 * they stay sharp on a 3x phone and when a battle zooms in). To use another picture from the pack, add its
 * `require` here in the right group folder and run that script. Nothing here is drawn by code.
 *
 * Sizes: tiles and props 128 px (a tile is 64 px in the pack's units), Shrodi's sheet 256 px a frame, and a
 * character is drawn HERO_DRAW tiles across (platformer-view.ts).
 */

import type { ImageSourcePropType } from "react-native";

import type { EnemyKind } from "./platformer-core";
import type { BiomeName, SceneryKind, TerrainTheme, TileArt } from "./platformer-view";

/**
 * The hero is Shrodi: one sheet of 256 px frames in 8 columns, baked from his art by scripts/bake-shrodi-hero.mjs.
 * Which frame is which is in hero-anim-core.ts; HeroSprite.tsx crops it. (The Kenney characters, e.g. character_yellow_*,
 * stay in the pack folder, `tools/platformer-art/Sprites/Characters`.)
 */
export const HERO_SHEET: ImageSourcePropType = require("../../assets/images/platformer/characters/character_shrodi_sheet.png");

/** Two walking frames of each enemy; the pictures face left. */
export const ENEMY_SPRITES: Readonly<Record<EnemyKind, readonly [ImageSourcePropType, ImageSourcePropType]>> = {
  slime: [require("../../assets/images/platformer/enemies/slime_normal_walk_a.png"), require("../../assets/images/platformer/enemies/slime_normal_walk_b.png")],
  ladybug: [require("../../assets/images/platformer/enemies/ladybug_walk_a.png"), require("../../assets/images/platformer/enemies/ladybug_walk_b.png")],
  snail: [require("../../assets/images/platformer/enemies/snail_walk_a.png"), require("../../assets/images/platformer/enemies/snail_walk_b.png")],
  mouse: [require("../../assets/images/platformer/enemies/mouse_walk_a.png"), require("../../assets/images/platformer/enemies/mouse_walk_b.png")],
  boss: [require("../../assets/images/platformer/enemies/slime_fire_walk_a.png"), require("../../assets/images/platformer/enemies/slime_fire_walk_b.png")],
  bee: [require("../../assets/images/platformer/enemies/bee_a.png"), require("../../assets/images/platformer/enemies/bee_b.png")],
};

/**
 * The ground of each world: a set of terrain pictures per theme (grass, sand, stone, purple, snow). Water is shared.
 * `cloud` is the thin platform piece (left end, middle, right end) the moving platforms are made of.
 */
export type GroundArt = Exclude<TileArt, "water" | "water_top">;
export interface Terrain {
  tiles: Readonly<Record<GroundArt, ImageSourcePropType>>;
  cloud: { left: ImageSourcePropType; middle: ImageSourcePropType; right: ImageSourcePropType };
}
export const TERRAIN: Readonly<Record<TerrainTheme, Terrain>> = {
  grass: {
    tiles: {
      block: require("../../assets/images/platformer/tiles/terrain_grass_block.png"),
      top: require("../../assets/images/platformer/tiles/terrain_grass_block_top.png"),
      top_left: require("../../assets/images/platformer/tiles/terrain_grass_block_top_left.png"),
      top_right: require("../../assets/images/platformer/tiles/terrain_grass_block_top_right.png"),
      left: require("../../assets/images/platformer/tiles/terrain_grass_block_left.png"),
      center: require("../../assets/images/platformer/tiles/terrain_grass_block_center.png"),
      right: require("../../assets/images/platformer/tiles/terrain_grass_block_right.png"),
      bottom_left: require("../../assets/images/platformer/tiles/terrain_grass_block_bottom_left.png"),
      bottom: require("../../assets/images/platformer/tiles/terrain_grass_block_bottom.png"),
      bottom_right: require("../../assets/images/platformer/tiles/terrain_grass_block_bottom_right.png"),
      h_left: require("../../assets/images/platformer/tiles/terrain_grass_horizontal_left.png"),
      h_middle: require("../../assets/images/platformer/tiles/terrain_grass_horizontal_middle.png"),
      h_right: require("../../assets/images/platformer/tiles/terrain_grass_horizontal_right.png"),
    },
    cloud: {
      left: require("../../assets/images/platformer/tiles/terrain_grass_cloud_left.png"),
      middle: require("../../assets/images/platformer/tiles/terrain_grass_cloud_middle.png"),
      right: require("../../assets/images/platformer/tiles/terrain_grass_cloud_right.png"),
    },
  },
  sand: {
    tiles: {
      block: require("../../assets/images/platformer/tiles/terrain_sand_block.png"),
      top: require("../../assets/images/platformer/tiles/terrain_sand_block_top.png"),
      top_left: require("../../assets/images/platformer/tiles/terrain_sand_block_top_left.png"),
      top_right: require("../../assets/images/platformer/tiles/terrain_sand_block_top_right.png"),
      left: require("../../assets/images/platformer/tiles/terrain_sand_block_left.png"),
      center: require("../../assets/images/platformer/tiles/terrain_sand_block_center.png"),
      right: require("../../assets/images/platformer/tiles/terrain_sand_block_right.png"),
      bottom_left: require("../../assets/images/platformer/tiles/terrain_sand_block_bottom_left.png"),
      bottom: require("../../assets/images/platformer/tiles/terrain_sand_block_bottom.png"),
      bottom_right: require("../../assets/images/platformer/tiles/terrain_sand_block_bottom_right.png"),
      h_left: require("../../assets/images/platformer/tiles/terrain_sand_horizontal_left.png"),
      h_middle: require("../../assets/images/platformer/tiles/terrain_sand_horizontal_middle.png"),
      h_right: require("../../assets/images/platformer/tiles/terrain_sand_horizontal_right.png"),
    },
    cloud: {
      left: require("../../assets/images/platformer/tiles/terrain_sand_cloud_left.png"),
      middle: require("../../assets/images/platformer/tiles/terrain_sand_cloud_middle.png"),
      right: require("../../assets/images/platformer/tiles/terrain_sand_cloud_right.png"),
    },
  },
  stone: {
    tiles: {
      block: require("../../assets/images/platformer/tiles/terrain_stone_block.png"),
      top: require("../../assets/images/platformer/tiles/terrain_stone_block_top.png"),
      top_left: require("../../assets/images/platformer/tiles/terrain_stone_block_top_left.png"),
      top_right: require("../../assets/images/platformer/tiles/terrain_stone_block_top_right.png"),
      left: require("../../assets/images/platformer/tiles/terrain_stone_block_left.png"),
      center: require("../../assets/images/platformer/tiles/terrain_stone_block_center.png"),
      right: require("../../assets/images/platformer/tiles/terrain_stone_block_right.png"),
      bottom_left: require("../../assets/images/platformer/tiles/terrain_stone_block_bottom_left.png"),
      bottom: require("../../assets/images/platformer/tiles/terrain_stone_block_bottom.png"),
      bottom_right: require("../../assets/images/platformer/tiles/terrain_stone_block_bottom_right.png"),
      h_left: require("../../assets/images/platformer/tiles/terrain_stone_horizontal_left.png"),
      h_middle: require("../../assets/images/platformer/tiles/terrain_stone_horizontal_middle.png"),
      h_right: require("../../assets/images/platformer/tiles/terrain_stone_horizontal_right.png"),
    },
    cloud: {
      left: require("../../assets/images/platformer/tiles/terrain_stone_cloud_left.png"),
      middle: require("../../assets/images/platformer/tiles/terrain_stone_cloud_middle.png"),
      right: require("../../assets/images/platformer/tiles/terrain_stone_cloud_right.png"),
    },
  },
  purple: {
    tiles: {
      block: require("../../assets/images/platformer/tiles/terrain_purple_block.png"),
      top: require("../../assets/images/platformer/tiles/terrain_purple_block_top.png"),
      top_left: require("../../assets/images/platformer/tiles/terrain_purple_block_top_left.png"),
      top_right: require("../../assets/images/platformer/tiles/terrain_purple_block_top_right.png"),
      left: require("../../assets/images/platformer/tiles/terrain_purple_block_left.png"),
      center: require("../../assets/images/platformer/tiles/terrain_purple_block_center.png"),
      right: require("../../assets/images/platformer/tiles/terrain_purple_block_right.png"),
      bottom_left: require("../../assets/images/platformer/tiles/terrain_purple_block_bottom_left.png"),
      bottom: require("../../assets/images/platformer/tiles/terrain_purple_block_bottom.png"),
      bottom_right: require("../../assets/images/platformer/tiles/terrain_purple_block_bottom_right.png"),
      h_left: require("../../assets/images/platformer/tiles/terrain_purple_horizontal_left.png"),
      h_middle: require("../../assets/images/platformer/tiles/terrain_purple_horizontal_middle.png"),
      h_right: require("../../assets/images/platformer/tiles/terrain_purple_horizontal_right.png"),
    },
    cloud: {
      left: require("../../assets/images/platformer/tiles/terrain_purple_cloud_left.png"),
      middle: require("../../assets/images/platformer/tiles/terrain_purple_cloud_middle.png"),
      right: require("../../assets/images/platformer/tiles/terrain_purple_cloud_right.png"),
    },
  },
  snow: {
    tiles: {
      block: require("../../assets/images/platformer/tiles/terrain_snow_block.png"),
      top: require("../../assets/images/platformer/tiles/terrain_snow_block_top.png"),
      top_left: require("../../assets/images/platformer/tiles/terrain_snow_block_top_left.png"),
      top_right: require("../../assets/images/platformer/tiles/terrain_snow_block_top_right.png"),
      left: require("../../assets/images/platformer/tiles/terrain_snow_block_left.png"),
      center: require("../../assets/images/platformer/tiles/terrain_snow_block_center.png"),
      right: require("../../assets/images/platformer/tiles/terrain_snow_block_right.png"),
      bottom_left: require("../../assets/images/platformer/tiles/terrain_snow_block_bottom_left.png"),
      bottom: require("../../assets/images/platformer/tiles/terrain_snow_block_bottom.png"),
      bottom_right: require("../../assets/images/platformer/tiles/terrain_snow_block_bottom_right.png"),
      h_left: require("../../assets/images/platformer/tiles/terrain_snow_horizontal_left.png"),
      h_middle: require("../../assets/images/platformer/tiles/terrain_snow_horizontal_middle.png"),
      h_right: require("../../assets/images/platformer/tiles/terrain_snow_horizontal_right.png"),
    },
    cloud: {
      left: require("../../assets/images/platformer/tiles/terrain_snow_cloud_left.png"),
      middle: require("../../assets/images/platformer/tiles/terrain_snow_cloud_middle.png"),
      right: require("../../assets/images/platformer/tiles/terrain_snow_cloud_right.png"),
    },
  },
};

export const WATER_SPRITES = {
  water: require("../../assets/images/platformer/tiles/water.png"),
  water_top: require("../../assets/images/platformer/tiles/water_top.png"),
} as const satisfies Record<"water" | "water_top", ImageSourcePropType>;

/** Lava is a pit like water, the same wave sheet in orange. */
export const LAVA_SPRITES = {
  lava: require("../../assets/images/platformer/tiles/lava.png"),
  lava_top: require("../../assets/images/platformer/tiles/lava_top.png"),
} as const satisfies Record<"lava" | "lava_top", ImageSourcePropType>;

/** The picture for a ground or water tile in a world's terrain. */
export const tileSprite = (theme: TerrainTheme, art: TileArt): ImageSourcePropType =>
  art === "water" || art === "water_top" ? WATER_SPRITES[art] : TERRAIN[theme].tiles[art];

/** Scenery pictures: only looked at, drawn behind the hero. `tall` ones are drawn a tile and a half high. */
export const SCENERY_SPRITES: Readonly<Record<SceneryKind, ImageSourcePropType>> = {
  bush: require("../../assets/images/platformer/props/bush.png"),
  rock: require("../../assets/images/platformer/props/rock.png"),
  fence: require("../../assets/images/platformer/props/fence.png"),
  fence_broken: require("../../assets/images/platformer/props/fence_broken.png"),
  torch: require("../../assets/images/platformer/props/torch_on_a.png"),
  cactus: require("../../assets/images/platformer/props/cactus.png"),
  mushroom_red: require("../../assets/images/platformer/props/mushroom_red.png"),
  mushroom_brown: require("../../assets/images/platformer/props/mushroom_brown.png"),
  grass: require("../../assets/images/platformer/props/grass.png"),
  grass_purple: require("../../assets/images/platformer/props/grass_purple.png"),
  sign_left: require("../../assets/images/platformer/props/sign_left.png"),
  sign_right: require("../../assets/images/platformer/props/sign_right.png"),
  sign_exit: require("../../assets/images/platformer/props/sign_exit.png"),
};

export const PROP_SPRITES = {
  coin: require("../../assets/images/platformer/props/coin_gold.png"),
  spikes: require("../../assets/images/platformer/props/spikes.png"),
  bush: require("../../assets/images/platformer/props/bush.png"),
  flagA: require("../../assets/images/platformer/props/flag_yellow_a.png"),
  flagB: require("../../assets/images/platformer/props/flag_yellow_b.png"),
  flagOff: require("../../assets/images/platformer/props/flag_off.png"),
  doorClosed: require("../../assets/images/platformer/props/door_closed.png"),
  doorClosedTop: require("../../assets/images/platformer/props/door_closed_top.png"),
  doorOpen: require("../../assets/images/platformer/props/door_open.png"),
  doorOpenTop: require("../../assets/images/platformer/props/door_open_top.png"),
  sign: require("../../assets/images/platformer/props/sign.png"),
  heart: require("../../assets/images/platformer/hud/hud_heart.png"),
  heartEmpty: require("../../assets/images/platformer/hud/hud_heart_empty.png"),
  hudCoin: require("../../assets/images/platformer/hud/hud_coin.png"),
  star: require("../../assets/images/platformer/hud/hud_star.png"),
  starEmpty: require("../../assets/images/platformer/hud/hud_star_empty.png"),
  blockCoin: require("../../assets/images/platformer/props/block_coin.png"),
  blockHeart: require("../../assets/images/platformer/props/block_exclamation.png"),
  blockEmpty: require("../../assets/images/platformer/props/block_empty.png"),
  brick: require("../../assets/images/platformer/props/brick_brown.png"),
  lock: require("../../assets/images/platformer/props/lock_yellow.png"),
  key: require("../../assets/images/platformer/props/key_yellow.png"),
  spring: require("../../assets/images/platformer/props/spring.png"),
  springOut: require("../../assets/images/platformer/props/spring_out.png"),
  plank: require("../../assets/images/platformer/props/bridge.png"),
  bridge: require("../../assets/images/platformer/props/bridge_logs.png"),
  gemBlue: require("../../assets/images/platformer/props/gem_blue.png"),
  gemGreen: require("../../assets/images/platformer/props/gem_green.png"),
  gemRed: require("../../assets/images/platformer/props/gem_red.png"),
  gemYellow: require("../../assets/images/platformer/props/gem_yellow.png"),
  saw: require("../../assets/images/platformer/props/saw.png"),
  conveyor: require("../../assets/images/platformer/props/conveyor.png"),
  blockGem: require("../../assets/images/platformer/props/block_strong_coin.png"),
  blockGemEmpty: require("../../assets/images/platformer/props/block_strong_empty.png"),
  torchB: require("../../assets/images/platformer/props/torch_on_b.png"),
  hudKey: require("../../assets/images/platformer/hud/hud_key_yellow.png"),
  helmet: require("../../assets/images/platformer/hud/hud_player_helmet_yellow.png"),
} as const satisfies Record<string, ImageSourcePropType>;

/** The colour of the gem at `index`: the four of the pack in turn. */
export const gemSprite = (index: number): ImageSourcePropType => [PROP_SPRITES.gemBlue, PROP_SPRITES.gemGreen, PROP_SPRITES.gemRed, PROP_SPRITES.gemYellow][index % 4];

/**
 * The backdrop is a stack, from the top: solid sky, the clouds, then a biome (its `color` picture ends
 * in the biome's own ground colour, its `fade` one fades back into sky), and below a `color` biome a
 * solid fill of that ground (`ground`: grass, dirt or sand) down to the bottom edge. Every picture is
 * a 256 px tile (512 here) that repeats sideways; they all start and end on the same white and sky
 * so the joins show no seam.
 */
export interface Biome {
  color: ImageSourcePropType;
  fade: ImageSourcePropType;
  /** The solid fill under the `color` picture. */
  ground: ImageSourcePropType;
}
export const BACKGROUND_SKY: ImageSourcePropType = require("../../assets/images/platformer/backgrounds/background_solid_sky.png");
export const BIOMES: Record<BiomeName, Biome> = {
  hills: { color: require("../../assets/images/platformer/backgrounds/background_color_hills.png"), fade: require("../../assets/images/platformer/backgrounds/background_fade_hills.png"), ground: require("../../assets/images/platformer/backgrounds/background_solid_grass.png") },
  trees: { color: require("../../assets/images/platformer/backgrounds/background_color_trees.png"), fade: require("../../assets/images/platformer/backgrounds/background_fade_trees.png"), ground: require("../../assets/images/platformer/backgrounds/background_solid_grass.png") },
  desert: { color: require("../../assets/images/platformer/backgrounds/background_color_desert.png"), fade: require("../../assets/images/platformer/backgrounds/background_fade_desert.png"), ground: require("../../assets/images/platformer/backgrounds/background_solid_sand.png") },
  mushrooms: { color: require("../../assets/images/platformer/backgrounds/background_color_mushrooms.png"), fade: require("../../assets/images/platformer/backgrounds/background_fade_mushrooms.png"), ground: require("../../assets/images/platformer/backgrounds/background_solid_dirt.png") },
};

/** A tile of cloud bank that repeats sideways above the biome. */
export const BACKGROUND_CLOUDS: ImageSourcePropType = require("../../assets/images/platformer/backgrounds/background_clouds.png");

/** The sky colour of the backdrop pictures (their own flat sky, so the repeat has no seam). */
export const SKY_COLOR = "#C3E3FF"; // theme-allow: the platformer art has its own fixed sky

/** The flash over a fighter in a battle: white on an enemy that is hit, red on the hero when hurt. Game art, the same in light and dark. */
export const FLASH_HIT = "#FFFFFF"; // theme-allow: hit flash, game art (EX-16)
export const FLASH_HURT = "#FF4B4B"; // theme-allow: hurt flash, game art (EX-16)

/** The pack's HUD digits (white with the dark outline) and its "x", for the coin counter: `x 20` the way the pack's own sample draws it. */
export const HUD_DIGITS: readonly ImageSourcePropType[] = [
  require("../../assets/images/platformer/hud/hud_character_0.png"),
  require("../../assets/images/platformer/hud/hud_character_1.png"),
  require("../../assets/images/platformer/hud/hud_character_2.png"),
  require("../../assets/images/platformer/hud/hud_character_3.png"),
  require("../../assets/images/platformer/hud/hud_character_4.png"),
  require("../../assets/images/platformer/hud/hud_character_5.png"),
  require("../../assets/images/platformer/hud/hud_character_6.png"),
  require("../../assets/images/platformer/hud/hud_character_7.png"),
  require("../../assets/images/platformer/hud/hud_character_8.png"),
  require("../../assets/images/platformer/hud/hud_character_9.png"),
];
export const HUD_MULTIPLY: ImageSourcePropType = require("../../assets/images/platformer/hud/hud_character_multiply.png");

/** The pause icon's stroke: white over the game's sky and ground in light and dark alike (game art, EX-16 in docs/critical/THEME_EXCEPTION_REGISTER.md). */
export const HUD_SHADOW_COLOR = "#00000099"; // theme-allow: the HUD text's shadow over the game picture (EX-16)
export const HUD_ICON_COLOR = "#FFFFFF"; // theme-allow: drawn over the game picture, not the app surface (EX-16)

/** The touch controls (Kenney's Mobile Controls, style A with its orange highlight): a dark pad, its lit outline, and the glyphs. */
export const CONTROL_SPRITES = {
  padCircle: require("../../assets/images/controls/pad_circle.png"),
  padCircleLit: require("../../assets/images/controls/pad_circle_lit.png"),
  padLeft: require("../../assets/images/controls/pad_left.png"),
  padLeftLit: require("../../assets/images/controls/pad_left_lit.png"),
  padRight: require("../../assets/images/controls/pad_right.png"),
  padRightLit: require("../../assets/images/controls/pad_right_lit.png"),
  arrow: require("../../assets/images/controls/icon_arrow.png"),
  jump: require("../../assets/images/controls/icon_jump.png"),
} as const;

/** The emote balloons (Kenney's Emotes, style 1, baked 4x by `scripts/bake-emotes.mjs`), by `EmoteName`. */
export const EMOTE_SPRITES = {
  exclamation: require("../../assets/images/platformer/emotes/exclamation.png"),
  question: require("../../assets/images/platformer/emotes/question.png"),
  anger: require("../../assets/images/platformer/emotes/anger.png"),
  heartBroken: require("../../assets/images/platformer/emotes/heartBroken.png"),
  heart: require("../../assets/images/platformer/emotes/heart.png"),
  faceHappy: require("../../assets/images/platformer/emotes/faceHappy.png"),
  faceSad: require("../../assets/images/platformer/emotes/faceSad.png"),
  star: require("../../assets/images/platformer/emotes/star.png"),
  stars: require("../../assets/images/platformer/emotes/stars.png"),
  swirl: require("../../assets/images/platformer/emotes/swirl.png"),
  laugh: require("../../assets/images/platformer/emotes/laugh.png"),
  idea: require("../../assets/images/platformer/emotes/idea.png"),
  sleep: require("../../assets/images/platformer/emotes/sleep.png"),
  dots3: require("../../assets/images/platformer/emotes/dots3.png"),
} as const;
/** A balloon's picture is 128 by 152 px: this wide per tall. */
export const EMOTE_ASPECT = 128 / 152;
