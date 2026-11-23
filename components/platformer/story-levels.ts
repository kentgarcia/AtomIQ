/**
 * Story mode: the levels of the Atom Maze, in order, in worlds (`STORY_WORLDS`): the five tutorial levels,
 * then five levels for each unit of the lessons (so far Units 1 to 4, one lesson a level), each unit in its
 * own biome. Each level has its world, the unit its
 * questions come from, what it teaches about the game, and its FIXED question pool. Framework-free.
 *
 * Questions are bank items of the learner's lessons (`items` in the content database, ids below), so
 * the game can recommend the lesson that teaches whatever was missed. A pool goes from easy to hard,
 * and the enemies of a level are given slices of it from the left of the level to the right
 * (`assignQuestions` in story-core.ts), so the questions get harder as the level goes on and the boss
 * at the end asks the last ones. Only multiple choice and fact-or-myth items work in a battle.
 */

import { LEVELS } from "./platformer-levels.ts";
import type { LevelDef } from "./platformer-core.ts";
import type { BiomeName, TerrainTheme } from "./platformer-view.ts";
import type { GlyphId } from "../path/node-glyphs.ts";

/** A stretch of the story: the tutorial or one unit of the lessons, five levels in one look. */
export interface StoryWorld {
  id: string;
  kind: "tutorial" | "unit";
  /** "Tutorial" or "Unit 1": the small line above the title. */
  tag: string;
  title: string;
  subtitle: string;
  /** Position of the unit in the lessons (1 for Unit 1), or null for the tutorial. */
  unitPosition: number | null;
  /** Which colour set it wears (1 yellow, 2 blue, 3 green, 4 purple, 5 red: `unitPalette`). Unit N wears N, as on the lesson map. */
  paletteIndex: number;
  /** The look of its picture on the map (the tutorial changes it level by level; a unit keeps one). */
  biome: BiomeName;
  levelIds: readonly string[];
}

export interface StoryLevel {
  id: string;
  number: number;
  /** The world it belongs to (`STORY_WORLDS`) and its place in it, from 1. */
  worldId: string;
  position: number;
  /** The picture on its map stop (a glyph of the lesson map, `GlyphId`). */
  glyph: GlyphId;
  title: string;
  /** The place, for the map. */
  subtitle: string;
  /** One line about the level. */
  blurb: string;
  /** The goal, shown at the top when the level begins. */
  mission: string;
  /** What this level teaches about playing (shown on the map card). */
  mechanics: readonly string[];
  /** The unit its questions come from (`units.id`). */
  unitId: string;
  theme: TerrainTheme;
  biome: BiomeName;
  /** The biome fades back into sky instead of ending in ground. */
  fadeBiome?: boolean;
  def: LevelDef;
  /** Bank item ids, easy to hard. */
  questions: readonly string[];
}

const def = (id: string): LevelDef => {
  const found = LEVELS.find((l) => l.id === id);
  if (!found) throw new Error(`no level ${id}`);
  return found;
};

export const STORY_LEVELS: readonly StoryLevel[] = [
  {
    id: "atom-meadow",
    worldId: "tutorial",
    position: 1,
    glyph: "book",
    mission: "Reach the door!",
    number: 1,
    title: "Atom Meadow",
    subtitle: "A sunny first stroll",
    blurb: "Learn to run, jump, grab coins and win your first battle.",
    mechanics: ["Run", "Jump", "Coins", "Battles", "Checkpoints"],
    unitId: "inside-the-atom",
    theme: "grass",
    biome: "hills",
    def: def("atom-meadow"),
    questions: ["u1-x-water-atoms", "u1-l1-choice-made-of", "u1-x-neutron-charge", "u1-x-negative", "u1-l1-tom-microscope", "u1-x-see-atom"],
  },
  {
    id: "proton-pines",
    worldId: "tutorial",
    position: 2,
    glyph: "dumbbell",
    mission: "Bump the blocks and reach the door!",
    number: 2,
    title: "Proton Pines",
    subtitle: "A snowy forest of blocks",
    blurb: "Bump blocks for coins and hearts, break bricks and climb the planks.",
    mechanics: ["? blocks", "Heart blocks", "Bricks", "Planks", "Spikes"],
    unitId: "inside-the-atom",
    theme: "snow",
    biome: "trees",
    def: def("proton-pines"),
    questions: [
      "u1-l2-choice-mass", "u1-l2-tom-solid", "u1-x-nucleus-size", "u1-x-empty-space", "u1-x-electrons-inside",
      "u1-l3-choice-gold-oxygen", "u1-x-oxygen-protons", "u1-x-same-element", "u1-l3-tom-gain-proton", "u1-x-true-change-protons",
      "u1-l3-choice-lose-proton", "u1-x-proton-change", "u1-l3-choice-gain-two",
    ],
  },
  {
    id: "neutron-dunes",
    worldId: "tutorial",
    position: 3,
    glyph: "bolt",
    mission: "Spring over the dunes to the door!",
    number: 3,
    title: "Neutron Dunes",
    subtitle: "Hot sand and tall mesas",
    blurb: "Springs fling you over walls and wide gaps. Watch out for bees!",
    mechanics: ["Springs", "Flying foes", "Wide gaps"],
    unitId: "inside-the-atom",
    theme: "sand",
    biome: "desert",
    def: def("neutron-dunes"),
    questions: [
      "u1-l4-choice-share", "u1-x-isotope-neutrons", "u1-x-isotopes-of", "u1-l4-choice-pair", "u1-l4-tom-all-radioactive", "u1-l4-tom-c13-stable",
      "u1-x-isotope-radioactive", "u1-x-isotope-stable-true", "u1-l5-tom-all-stable", "u1-l5-tom-body-stable", "u1-x-stable-meaning", "u1-x-unstable-which",
      "u1-l5-choice-unstable-does", "u1-l5-tom-human-made", "u1-x-potassium", "u1-x-rock-natural",
    ],
  },
  {
    id: "isotope-caverns",
    worldId: "tutorial",
    position: 4,
    glyph: "chain",
    mission: "Find the key and reach the door!",
    number: 4,
    title: "Isotope Caverns",
    subtitle: "Torchlit stone and deep pits",
    blurb: "Ride moving platforms and lifts, find the key and open the lock.",
    mechanics: ["Moving platforms", "Lifts", "Keys", "Locks"],
    unitId: "inside-the-atom",
    theme: "stone",
    biome: "mushrooms",
    def: def("isotope-caverns"),
    questions: [
      "u1-l1-tom-air-empty", "u1-l2-tom-volume", "u1-x-same-element", "u1-x-isotopes-of", "u1-l4-choice-share", "u1-l5-tom-all-stable", "u1-x-stable-meaning", "u1-x-unstable-which",
    ],
  },
  {
    id: "reactor-core",
    worldId: "tutorial",
    position: 5,
    glyph: "trophy",
    mission: "Beat the Reactor Slime to open the door!",
    number: 5,
    title: "Reactor Core",
    subtitle: "The glowing heart of the maze",
    blurb: "Everything you learned, and the Reactor Slime at the end.",
    mechanics: ["Everything so far", "Boss battle"],
    unitId: "inside-the-atom",
    theme: "purple",
    biome: "trees",
    fadeBiome: true,
    def: def("reactor-core"),
    questions: [
      "u1-l2-tom-solid", "u1-x-electrons-inside", "u1-x-oxygen-protons", "u1-l4-tom-c13-stable", "u1-x-isotope-stable-true", "u1-l5-tom-body-stable", "u1-x-nucleus-size", "u1-x-empty-space",
      "u1-l3-tom-gain-proton", "u1-l5-choice-unstable-does",
    ],
  },
  {
    id: "matter-meadow",
    worldId: "inside-the-atom",
    position: 1,
    glyph: "atom",
    mission: "Collect gems and reach the door!",
    number: 6,
    title: "Matter Meadow",
    subtitle: "Atoms are everywhere",
    blurb: "Grab gems worth five coins, cross a bridge of logs and bump a gem block.",
    mechanics: ["Gems", "Gem blocks", "Bridges"],
    unitId: "inside-the-atom",
    theme: "grass",
    biome: "trees",
    def: def("matter-meadow"),
    questions: ["u1-l1-choice-made-of", "u1-l1-tom-air-empty", "u1-l1-tom-microscope", "u1-l1-tom-see-atoms", "u1-x-order-cell", "u1-x-see-atom", "u1-x-water-atoms", "u1-x-balloon-weight", "u1-x-not-atoms"],
  },
  {
    id: "nucleus-nook",
    worldId: "inside-the-atom",
    position: 2,
    glyph: "nucleus",
    mission: "Ride the belts and reach the door!",
    number: 7,
    title: "Nucleus Nook",
    subtitle: "Meet the atom",
    blurb: "Conveyor belts push you along or hold you back. Time your jumps and mind the spikes.",
    mechanics: ["Conveyor belts", "Spikes", "Gems"],
    unitId: "inside-the-atom",
    theme: "grass",
    biome: "trees",
    def: def("nucleus-nook"),
    questions: ["u1-l2-choice-mass", "u1-l2-tom-solid", "u1-l2-tom-volume", "u1-x-electrons-inside", "u1-x-empty-space", "u1-x-negative", "u1-x-neutron-charge", "u1-x-nucleus-size"],
  },
  {
    id: "element-hills",
    worldId: "inside-the-atom",
    position: 3,
    glyph: "table",
    mission: "Dodge the saws and reach the door!",
    number: 8,
    title: "Element Hills",
    subtitle: "Elements",
    blurb: "Saws spin on the ground and hang in the air. Jump the low ones and walk under the high ones.",
    mechanics: ["Saws", "Gem blocks", "Flying foes"],
    unitId: "inside-the-atom",
    theme: "grass",
    biome: "trees",
    def: def("element-hills"),
    questions: ["u1-l3-choice-gold-oxygen", "u1-l3-tom-gain-proton", "u1-x-oxygen-protons", "u1-x-same-element", "u1-x-true-change-protons", "u1-l3-choice-gain-two", "u1-l3-choice-lose-proton", "u1-x-proton-change"],
  },
  {
    id: "isotope-isles",
    worldId: "inside-the-atom",
    position: 4,
    glyph: "isotope",
    mission: "Cross the lava and open the lock!",
    number: 9,
    title: "Isotope Isles",
    subtitle: "Isotopes",
    blurb: "Lava all around: ride platforms and a lift, spring across, then find the key.",
    mechanics: ["Lava", "Moving platforms", "Lifts", "Springs", "Keys"],
    unitId: "inside-the-atom",
    theme: "grass",
    biome: "trees",
    def: def("isotope-isles"),
    questions: ["u1-l4-choice-share", "u1-l4-tom-all-radioactive", "u1-l4-tom-c13-stable", "u1-x-isotope-neutrons", "u1-x-isotope-radioactive", "u1-x-isotope-stable-true", "u1-x-isotopes-of", "u1-l4-choice-pair"],
  },
  {
    id: "stability-summit",
    worldId: "inside-the-atom",
    position: 5,
    glyph: "shield",
    mission: "Beat the Reactor Slime to open the door!",
    number: 10,
    title: "Stability Summit",
    subtitle: "Stable and unstable nuclei",
    blurb: "Belts, saws, lava and a boss: everything from this unit at once.",
    mechanics: ["Everything so far", "Boss battle"],
    unitId: "inside-the-atom",
    theme: "grass",
    biome: "trees",
    fadeBiome: true,
    def: def("stability-summit"),
    questions: [
      "u1-l5-choice-unstable-does", "u1-l5-tom-all-stable", "u1-l5-tom-body-stable", "u1-l5-tom-human-made", "u1-x-stable-meaning", "u1-x-unstable-which",
      "u1-l4-choice-pair", "u1-x-balloon-weight", "u1-x-not-atoms", "u1-l3-choice-gain-two", "u1-x-proton-change", "u1-l3-choice-lose-proton", "u1-x-potassium", "u1-x-rock-natural",
    ],
  },
  {
    id: "decay-dunes",
    worldId: "radioactivity",
    position: 1,
    glyph: "burst",
    mission: "Cross the log bridges and reach the door!",
    number: 11,
    title: "Decay Dunes",
    subtitle: "Why do nuclei decay?",
    blurb: "Bridges of logs span the water: walk across, or jump up through them from below.",
    mechanics: ["Bridges","Heart blocks","Flying foes"],
    unitId: "radioactivity",
    theme: "sand",
    biome: "desert",
    def: def("decay-dunes"),
    questions: [
      "u2-x-tom-by-itself", "u2-l1-tom-person", "u2-l1-choice-why", "u2-x-daughter-name", "u2-l1-tom-chance", "u2-x-tom-exact", "u2-l1-choice-next", "u2-x-rock-alone", "u2-x-two-nuclei",
    ],
  },
  {
    id: "radiation-ridge",
    worldId: "radioactivity",
    position: 2,
    glyph: "rays",
    mission: "Bump the gem blocks and reach the door!",
    number: 12,
    title: "Radiation Ridge",
    subtitle: "Alpha, beta and gamma",
    blurb: "Bump gem blocks from below for gems worth five coins, climb two ridges and mind the spikes.",
    mechanics: ["Gem blocks","Ridges","Spikes"],
    unitId: "radioactivity",
    theme: "sand",
    biome: "desert",
    def: def("radiation-ridge"),
    questions: [
      "u2-x-tom-particles", "u2-l2-tom-same", "u2-l2-tom-light", "u2-l2-tom-pieces", "u2-x-not-particle", "u2-l2-choice-alpha", "u2-l2-choice-electron", "u2-x-em-burst", "u2-x-helium-nucleus", "u2-l2-choice-gamma-element",
    ],
  },
  {
    id: "half-life-hollow",
    worldId: "radioactivity",
    position: 3,
    glyph: "clock",
    mission: "Hop the islands and reach the door!",
    number: 13,
    title: "Half-life Hollow",
    subtitle: "Half-life",
    blurb: "Islands of sand get half as wide each time, 16, 8, 4, 2, and so do their coins.",
    mechanics: ["Narrow islands","Planks","Spikes"],
    unitId: "radioactivity",
    theme: "sand",
    biome: "desert",
    def: def("half-life-hollow"),
    questions: [
      "u2-l3-choice-meaning", "u2-x-half-best", "u2-l3-choice-left", "u2-l3-tom-gone", "u2-x-hundred-left", "u2-l3-tom-timer", "u2-x-tom-exact-one", "u2-l3-tom-crowd", "u2-l3-choice-eighty", "u2-x-three-half-lives", "u2-l3-choice-buster", "u2-x-why-group",
    ],
  },
  {
    id: "decay-chain-canyon",
    worldId: "radioactivity",
    position: 4,
    glyph: "chain",
    mission: "Climb the steps and reach the door!",
    number: 14,
    title: "Decay Chain Canyon",
    subtitle: "Decay chains",
    blurb: "Climb step by step to a high plateau and back down: every step is a new nucleus in the chain.",
    mechanics: ["Steps","Gem blocks","Spikes"],
    unitId: "radioactivity",
    theme: "sand",
    biome: "desert",
    def: def("decay-chain-canyon"),
    questions: [
      "u2-x-still-there", "u2-l4-tom-vanish", "u2-l4-tom-different", "u2-x-what-happened", "u2-l4-tom-stable", "u2-x-chain-end", "u2-l4-choice-next", "u2-x-daughter-name", "u2-l1-tom-person", "u2-l3-tom-gone", "u2-l4-choice-finished", "u2-l3-choice-left",
    ],
  },
  {
    id: "natural-summit",
    worldId: "radioactivity",
    position: 5,
    glyph: "trefoil",
    mission: "Beat the Reactor Slime to open the door!",
    number: 15,
    title: "Natural Summit",
    subtitle: "Radioactivity is natural",
    blurb: "Bridges over lava, belts, saws, gem blocks and a boss: everything from this unit at once.",
    mechanics: ["Everything so far","Boss battle"],
    unitId: "radioactivity",
    theme: "sand",
    biome: "desert",
    fadeBiome: true,
    def: def("natural-summit"),
    questions: [
      "u2-l5-tom-facilities", "u2-x-tom-radon", "u2-x-natural-source", "u2-l5-choice-radon", "u2-l5-choice-space", "u2-x-tom-dangerous", "u2-l5-choice-dangerous", "u2-x-banana-says", "u2-l4-tom-vanish", "u2-l3-tom-gone", "u2-l2-choice-alpha", "u2-l1-tom-person", "u2-x-three-half-lives", "u2-l4-choice-finished", "u2-l5-choice-decides", "u2-x-helium-nucleus",
    ],
  },
  {
    id: "ion-grove",
    worldId: "radiation-meets-matter",
    position: 1,
    glyph: "bolt",
    mission: "Cross the beams and reach the door!",
    number: 16,
    title: "Ion Grove",
    subtitle: "Ionizing or not",
    blurb: "Radiation beams pulse on and off. Wait for the dark, then cross: a hit costs a heart.",
    mechanics: ["Radiation beams","Gems","Flying foes"],
    unitId: "radiation-meets-matter",
    theme: "purple",
    biome: "mushrooms",
    def: def("ion-grove"),
    questions: [
      "u3-l1-choice-ionizing", "u3-l1-tom-same", "u3-l1-tom-ionization", "u3-x-ionizing-def", "u3-x-which-cannot", "u3-l1-tom-light", "u3-l1-choice-xray", "u3-x-not-ionizing", "u3-x-weaker", "u3-x-pair", "u3-x-tom-xray-gamma",
    ],
  },
  {
    id: "shield-wall",
    worldId: "radiation-meets-matter",
    position: 2,
    glyph: "shield",
    mission: "Shelter from the beams and reach the door!",
    number: 17,
    title: "Shield Wall",
    subtitle: "What stops what",
    blurb: "Lead blocks stop a beam, so the ground under a lead roof is safe. Wait there between dashes.",
    mechanics: ["Lead blocks","Radiation beams","Gem blocks"],
    unitId: "radiation-meets-matter",
    theme: "purple",
    biome: "mushrooms",
    def: def("shield-wall"),
    questions: [
      "u3-l2-choice-alpha", "u3-l2-tom-skin", "u3-l2-choice-beta", "u3-x-skin-alpha", "u3-x-tom-same-stop", "u3-x-most-penetrating", "u3-l2-tom-thin-metal", "u3-l2-tom-gamma-paper", "u3-l2-choice-gamma", "u3-l2-choice-apron", "u3-x-gamma-barrier", "u3-x-tom-shield-materials",
    ],
  },
  {
    id: "clean-room",
    worldId: "radiation-meets-matter",
    position: 3,
    glyph: "flask",
    mission: "Keep moving and reach the door!",
    number: 18,
    title: "Clean Room",
    subtitle: "Exposed or contaminated",
    blurb: "Bridges, belts and beams together: stepping out of the beam ends the exposure.",
    mechanics: ["Bridges","Belts","Beams and shelters"],
    unitId: "radiation-meets-matter",
    theme: "purple",
    biome: "mushrooms",
    def: def("clean-room"),
    questions: [
      "u3-l3-choice-contaminated", "u3-l3-tom-spread", "u3-x-contaminated-means", "u3-x-tom-exposed-contaminated", "u3-l3-choice-internal", "u3-l3-choice-stops", "u3-l3-choice-continues", "u3-l3-tom-washing", "u3-x-moving-away", "u3-x-tom-keep-radiation", "u3-x-tom-sealed",
    ],
  },
  {
    id: "click-caves",
    worldId: "radiation-meets-matter",
    position: 4,
    glyph: "pulse",
    mission: "Find the key and reach the door!",
    number: 19,
    title: "Click Caves",
    subtitle: "Detecting radiation",
    blurb: "Platforms over the water, a key and a lock, and beams in the dark.",
    mechanics: ["Moving platforms","Keys","Locks","Springs","Beams and shelters"],
    unitId: "radiation-meets-matter",
    theme: "purple",
    biome: "mushrooms",
    def: def("click-caves"),
    questions: [
      "u3-l4-choice-geiger", "u3-l4-choice-worn", "u3-l4-tom-dosimeter", "u3-x-tom-instruments", "u3-l4-choice-background", "u3-l4-choice-sources", "u3-l4-tom-source", "u3-l4-tom-zero", "u3-x-background-reading", "u3-x-tom-background-natural", "u3-x-scintillator",
    ],
  },
  {
    id: "unit-peaks",
    worldId: "radiation-meets-matter",
    position: 5,
    glyph: "trophy",
    mission: "Beat the Reactor Slime to open the door!",
    number: 20,
    title: "Unit Peaks",
    subtitle: "Becquerel, gray and sievert",
    blurb: "Beams, lead roofs, saws, lava and a boss: everything from this unit at once.",
    mechanics: ["Everything so far","Boss battle"],
    unitId: "radiation-meets-matter",
    theme: "purple",
    biome: "mushrooms",
    fadeBiome: true,
    def: def("unit-peaks"),
    questions: [
      "u3-l5-choice-gray", "u3-l5-choice-sv", "u3-l5-tom-per-second", "u3-l5-tom-same", "u3-x-which-decays", "u3-l5-tom-bq-dose", "u3-x-bq-dose", "u3-x-sv-for", "u3-x-tom-sv-harm", "u3-l1-choice-ionizing", "u3-l2-choice-gamma", "u3-l3-choice-contaminated", "u3-l4-choice-geiger", "u3-x-tom-one-joule", "u3-l5-choice-big-bq",
    ],
  },
  {
    id: "dose-slopes",
    worldId: "radiation-and-the-body",
    position: 1,
    glyph: "gauge",
    mission: "Cross the fields and reach the door!",
    number: 21,
    title: "Dose Slopes",
    subtitle: "The dose scale",
    blurb: "Dose sources have a field round them. Stand in it and a meter fills: cross quickly and you are fine.",
    mechanics: ["Dose sources","Gems","Flying foes"],
    unitId: "radiation-and-the-body",
    theme: "snow",
    biome: "hills",
    def: def("dose-slopes"),
    questions: [
      "u4-l1-choice-average", "u4-l1-tom-workers", "u4-x-natural-most", "u4-x-radon-biggest", "u4-x-everyone-dose", "u4-l1-choice-ill", "u4-x-ct-vs-ill", "u4-x-tom-plant-ct",
    ],
  },
  {
    id: "cell-garden",
    worldId: "radiation-and-the-body",
    position: 2,
    glyph: "cell",
    mission: "Rest behind the lead and reach the door!",
    number: 22,
    title: "Cell Garden",
    subtitle: "Radiation and your cells",
    blurb: "Lead walls shield you from a source. Rest between them and the meter drains.",
    mechanics: ["Lead shields","Dose sources","Gem blocks"],
    unitId: "radiation-and-the-body",
    theme: "snow",
    biome: "hills",
    def: def("cell-garden"),
    questions: [
      "u4-l2-choice-damage", "u4-l2-tom-radio", "u4-x-tom-dna", "u4-x-why-damage", "u4-l2-tom-repair-efficient", "u4-x-tom-repair-true", "u4-l2-choice-not-repaired", "u4-l2-choice-puzzle", "u4-l2-choice-exposed",
    ],
  },
  {
    id: "long-road",
    worldId: "radiation-and-the-body",
    position: 3,
    glyph: "hourglass",
    mission: "Keep moving and reach the door!",
    number: 23,
    title: "Long Road",
    subtitle: "All at once or over time",
    blurb: "A belt under a source keeps you in the field. Jump over it, because time in a field adds up.",
    mechanics: ["Belts under fields","Dose sources","Lead shields"],
    unitId: "radiation-and-the-body",
    theme: "snow",
    biome: "hills",
    def: def("long-road"),
    questions: [
      "u4-l3-choice-doserate", "u4-l3-tom-no-immediate", "u4-x-tom-rate", "u4-l3-choice-symptoms", "u4-x-choice-ars", "u4-l3-choice-low", "u4-l3-tom-same", "u4-l3-choice-spread", "u4-x-tom-hundred",
    ],
  },
  {
    id: "safe-distance",
    worldId: "radiation-and-the-body",
    position: 4,
    glyph: "distance",
    mission: "Stay out of the fields and reach the door!",
    number: 24,
    title: "Safe Distance",
    subtitle: "Time, distance, shielding",
    blurb: "Take the spring up to the planks: the higher you are, the farther from the source.",
    mechanics: ["Springs and planks","Dose sources","Distance"],
    unitId: "radiation-and-the-body",
    theme: "snow",
    biome: "hills",
    def: def("safe-distance"),
    questions: [
      "u4-l4-tom-nothing", "u4-l4-choice-time", "u4-l4-choice-distance", "u4-x-choice-step-back", "u4-x-choice-dentist", "u4-l4-choice-store", "u4-x-choice-shelter", "u4-x-choice-material",
    ],
  },
  {
    id: "summit-view",
    worldId: "radiation-and-the-body",
    position: 5,
    glyph: "trophy",
    mission: "Beat the Reactor Slime to open the door!",
    number: 25,
    title: "Summit View",
    subtitle: "Risk in perspective",
    blurb: "Fields, lead walls, planks and a belt, then a boss: everything from this unit at once.",
    mechanics: ["Everything so far","Boss battle"],
    unitId: "radiation-and-the-body",
    theme: "snow",
    biome: "hills",
    fadeBiome: true,
    def: def("summit-view"),
    questions: [
      "u4-l5-choice-first", "u4-l5-tom-any-deadly", "u4-l5-choice-fast", "u4-l5-tom-large-ill", "u4-x-tom-number", "u4-l5-choice-compare", "u4-l5-choice-scan", "u4-x-tom-small-risk", "u4-l5-choice-calm", "u4-l1-choice-ill", "u4-l3-choice-doserate", "u4-l4-choice-distance",
    ],
  },
];


export const storyLevelById = (id: string | null | undefined): StoryLevel | null => STORY_LEVELS.find((l) => l.id === id) ?? null;

/** The worlds of the story, in order. */
export const STORY_WORLDS: readonly StoryWorld[] = [
  {
    id: "tutorial",
    kind: "tutorial",
    tag: "Tutorial",
    title: "Shrodi's Training",
    subtitle: "Learn the moves, one level at a time",
    unitPosition: null,
    paletteIndex: 3,
    biome: "hills",
    levelIds: ["atom-meadow", "proton-pines", "neutron-dunes", "isotope-caverns", "reactor-core"],
  },
  {
    id: "inside-the-atom",
    kind: "unit",
    tag: "Unit 1",
    title: "Inside the Atom",
    subtitle: "One lesson a level, in an evergreen forest",
    unitPosition: 1,
    paletteIndex: 1,
    biome: "trees",
    levelIds: ["matter-meadow", "nucleus-nook", "element-hills", "isotope-isles", "stability-summit"],
  },
  {
    id: "radioactivity",
    kind: "unit",
    tag: "Unit 2",
    title: "Radioactivity",
    subtitle: "One lesson a level, across the desert",
    unitPosition: 2,
    paletteIndex: 2,
    biome: "desert",
    levelIds: ["decay-dunes", "radiation-ridge", "half-life-hollow", "decay-chain-canyon", "natural-summit"],
  },
  {
    id: "radiation-meets-matter",
    kind: "unit",
    tag: "Unit 3",
    title: "Radiation Meets Matter",
    subtitle: "One lesson a level, through the glowing caves",
    unitPosition: 3,
    paletteIndex: 3,
    biome: "mushrooms",
    levelIds: ["ion-grove", "shield-wall", "clean-room", "click-caves", "unit-peaks"],
  },
  {
    id: "radiation-and-the-body",
    kind: "unit",
    tag: "Unit 4",
    title: "Radiation and the Body",
    subtitle: "One lesson a level, over the snowy slopes",
    unitPosition: 4,
    paletteIndex: 4,
    biome: "hills",
    levelIds: ["dose-slopes", "cell-garden", "long-road", "safe-distance", "summit-view"],
  },
];

export const storyWorldById = (id: string): StoryWorld | null => STORY_WORLDS.find((w) => w.id === id) ?? null;
/** The levels of a world, in order. */
export const levelsOfWorld = (world: StoryWorld): StoryLevel[] => world.levelIds.map((id) => storyLevelById(id)).filter((l): l is StoryLevel => l !== null);
