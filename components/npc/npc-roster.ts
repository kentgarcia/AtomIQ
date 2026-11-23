/**
 * The cast: seed data and fallback for the `npcs` and `npc_lines` tables (docs/features/NPC_TEACHERS_SPEC.md §5).
 *
 * The master of these words is `content/source/characters/*.atomiq` (built into the database by
 * `npm run content:sync`; `npm run test:source-adapters` fails when this file says something else).
 * This file is what tests check, what the shop and screens read without a database, and what the app
 * falls back to when a bundled database predates the NPC tables, so a teacher is never missing.
 * Pure data with no imports beyond types and the palette.
 */

import { CUSTOM, OFFICIAL as O } from "./npc-palette.ts";
import type { NpcSpec } from "./npc-art.ts";

const trio = (t: readonly string[]) => ({ base: t[0], shade: t[1], feature: t[2] });

export type NpcLineKind = "meet" | "lesson_intro" | "sign_off" | "tease" | "journey_intro";

export interface NpcRow {
  id: string;
  name: string;
  title: string;
  field: string;
  bio: string;
  spec: NpcSpec;
  position: number;
  /** The unit this teacher owns (units.teacher_npc_id is set from it). */
  unitId: string;
}

export interface NpcLineRow {
  id: string;
  npcId: string;
  kind: NpcLineKind;
  lessonId?: string | null;
  journeyId?: string | null;
  text: string;
  pose: string;
}

export const NPC_ROSTER: NpcRow[] = [
  {
    id: "npc-hal",
    name: "Hal",
    title: "Atom teacher",
    field: "atoms",
    unitId: "inside-the-atom",
    position: 1,
    bio: "I am Hal. I teach what is inside the atom, slowly and exactly, because small things deserve it. I keep rocks on my desk and I have named every one. Reginald is in charge.",
    spec: {
      skin: trio(CUSTOM.skinGuideLight), head: "capsule", headWidth: 106, eyes: "pill", nose: "button",
      hair: { style: "cloud", color: O.lion, shade: O.camel },
      // A pale lab coat (the `collar` colour; pure white would vanish on a white page) over a blue jumper (the outfit colour); his cover stays the yellow of his old vest
      outfit: { kind: "whitecoat", color: O.humpback, shade: O.narwhal, collar: O.anchovy },
      accent: { kind: "sample", color: O.monkey, shade: O.grizzly },
      cover: { color: O.bee, shade: O.camel },
    },
  },
  {
    id: "npc-ada",
    name: "Ada",
    title: "Radioactivity teacher",
    field: "radioactivity",
    unitId: "radioactivity",
    position: 2,
    bio: "hi, i'm ada. i teach why some atoms change and how long it takes, which is my favourite thing in the whole world. i carry a flask called sparkle, and one of my bows is, um, slightly green now~",
    spec: {
      skin: trio(CUSTOM.skinPink), head: "tombstone", headWidth: 102, eyes: "sparkle", nose: "single", blush: O.pig,
      hair: { style: "pigtailbows", color: CUSTOM.hairBrown[0], shade: CUSTOM.hairBrown[1] },
      // A pink shirt under a tan apron (the apron is the `collar` colour); the violet of the bows, the badge and the flask is the accent
      outfit: { kind: "apron", color: O.starfish, shade: CUSTOM.skinBubblegum[1], collar: O.cheetah },
      accent: { kind: "flask", color: O.beetle, shade: O.betta },
    },
  },
  {
    id: "npc-ray",
    name: "Ray",
    title: "Radiation teacher",
    field: "radiation-and-matter",
    unitId: "radiation-meets-matter",
    position: 3,
    bio: "I'm Ray. I teach what radiation does when it meets things, and how to stop it. I'll tell you straight: no hype, no scare, just what the numbers say. Ask me anything. You'll get a short answer.",
    spec: {
      skin: trio(CUSTOM.skinDeep), head: "tombstone", headWidth: 98, eyes: "glasses-square", nose: "double", mouth: "smirk",
      hair: { style: "flattop", color: CUSTOM.hairBlack[0], shade: CUSTOM.hairBlack[1] },
      // A purple field hoodie with a chest dosimeter badge and a front kangaroo pocket; his clipboard and holstered counter are the accent
      outfit: { kind: "fieldhoodie", color: O.beetle, shade: O.betta, collar: O.snow },
      accent: { kind: "clipboard", color: O.fox, shade: O.guineaPig },
    },
  },
  {
    id: "npc-mina",
    name: "Mina",
    title: "Radiation and health teacher",
    field: "radiation-and-the-body",
    unitId: "radiation-and-the-body",
    position: 4,
    bio: "I'm Mina. I teach what radiation does to the body, and how big a dose really is. A lot of people worry about it, and that's fair. I'll go through it with you, one calm step at a time, until it makes sense.",
    spec: {
      skin: trio(CUSTOM.skinBrown), head: "tombstone", headWidth: 100, eyes: "lashes", nose: "single", blush: O.crab,
      hair: { style: "crownbun", color: CUSTOM.hairBlack[0], shade: CUSTOM.hairBlack[1] },
      // A green clinician coat with a red heart lapel pin and a monthly dose badge over a white scrub top; her stethoscope and dose card are the accent
      outfit: { kind: "clinician", color: O.featherGreen, shade: O.treeFrog, collar: O.snow },
      accent: { kind: "stethoscope", color: O.whale, shade: O.narwhal },
    },
  },
  {
    id: "npc-kofi",
    name: "Kofi",
    title: "Nuclear energy teacher",
    field: "nuclear-energy",
    unitId: "energy-from-the-nucleus",
    position: 5,
    bio: "I'm Kofi, an engineer. I teach where nuclear energy comes from and how a reactor uses it. I like to see how things work, so we'll build the picture piece by piece. The hard hat is optional. Mine isn't!",
    spec: {
      skin: trio(CUSTOM.skinGuideWarm), head: "tombstone", headWidth: 104, eyes: "dots", nose: "double",
      hair: { style: "workcrop", color: CUSTOM.hairDark[0], shade: CUSTOM.hairDark[1] },
      facialHair: "beard",
      // An orange hi-vis engineer vest with reflective shoulder bands and a clearance badge over a blue work shirt; his hard hat, hip tool pouch and blueprint are the accent
      outfit: { kind: "workvest", color: O.fox, shade: O.guineaPig, collar: O.humpback },
      accent: { kind: "hardhat", color: O.bee, shade: O.camel },
    },
  },
  {
    id: "npc-tess",
    name: "Tess",
    title: "Nuclear technology teacher",
    field: "nuclear-technology",
    unitId: "nuclear-technology-at-work",
    position: 6,
    bio: "I'm Tess! I teach how nuclear tools help in hospitals, farms and factories. I love a good gadget. Short lessons, quick answers, and you can be on to the next one before I finish this sentence!",
    spec: {
      skin: trio(CUSTOM.skinTan), head: "capsule", headWidth: 96, eyes: "glasses-round", nose: "button",
      hair: { style: "knotwrap", color: O.flamingo, shade: O.pig },
      // A blue tech vest with a chest tracer-sensor module and clipped styluses over an Iguana collar; her glowing tracer vial and hip gadget pack are the accent
      outfit: { kind: "techvest", color: O.whale, shade: O.humpback, collar: O.iguana },
      accent: { kind: "vial", color: O.moonJelly, shade: O.blueJay },
    },
  },
  {
    id: "npc-sage",
    name: "Sage",
    title: "Safety and society teacher",
    field: "safety-waste-society",
    unitId: "safety-waste-society",
    position: 7,
    bio: "I'm Sage. I teach how nuclear power is kept safe, what happens to waste, and the choices a society makes. I like to look at both sides before I decide. I'll show you both, and then it's your call.",
    spec: {
      skin: trio(CUSTOM.skinOlive), head: "tombstone", headWidth: 100, eyes: "pill", nose: "single",
      hair: { style: "layeredbob", color: CUSTOM.hairDark[0], shade: CUSTOM.hairDark[1] },
      // A coral shawl-collar cardigan with a golden leaf pin and a fountain pen over a collared shirt; their two-column notebook and folio bag are the accent
      outfit: { kind: "scholar", color: O.crab, shade: O.cardinal, collar: O.canary },
      accent: { kind: "notebook", color: O.humpback, shade: O.narwhal },
    },
  },
];

/**
 * Voice lines. Plain text, 20 words or fewer, no fact that is not in the lesson (rule R3).
 * Units 1 and 2 are authored, so Hal (Inside the Atom) and Ada (Radioactivity) have lines; the others get theirs with their units.
 */
export const NPC_LINES: NpcLineRow[] = [
  { id: "line-hal-meet", npcId: "npc-hal", kind: "meet", text: "Hi, I'm Hal. Let's find out what everything is made of.", pose: "greet" },
  { id: "line-hal-sign-off", npcId: "npc-hal", kind: "sign_off", text: "Well done. Now you know what is inside an atom, and why that matters.", pose: "proud" },
  { id: "line-hal-intro-atoms-are-everywhere", npcId: "npc-hal", kind: "lesson_intro", lessonId: "atoms-are-everywhere", text: "Today you'll see what everything around you is made of, and how small an atom really is.", pose: "greet" },
  { id: "line-hal-intro-protons-neutrons-electrons", npcId: "npc-hal", kind: "lesson_intro", lessonId: "protons-neutrons-electrons", text: "We'll open up an atom and meet its three particles. You'll learn what each one does.", pose: "explain" },
  { id: "line-hal-intro-elements-and-the-periodic-table", npcId: "npc-hal", kind: "lesson_intro", lessonId: "elements-and-the-periodic-table", text: "The number of protons tells you which element an atom is. Let's build some.", pose: "point" },
  { id: "line-hal-intro-isotopes", npcId: "npc-hal", kind: "lesson_intro", lessonId: "isotopes", text: "Atoms of one element can differ a little. You'll learn what isotopes are.", pose: "explain" },
  { id: "line-hal-intro-stable-and-unstable-nuclei", npcId: "npc-hal", kind: "lesson_intro", lessonId: "stable-and-unstable-nuclei", text: "Some nuclei stay the same and some can change. You'll see why that matters.", pose: "think" },
  { id: "line-hal-tease", npcId: "npc-hal", kind: "tease", text: "Finish my unit first, and I'll show you the rest.", pose: "idle" },
  { id: "line-ada-meet", npcId: "npc-ada", kind: "meet", text: "Hi, I'm Ada. Let's find out why some atoms change, and how long it takes.", pose: "greet" },
  { id: "line-ada-sign-off", npcId: "npc-ada", kind: "sign_off", text: "Well done. Radioactivity is a natural part of the world, and now you know how it works.", pose: "proud" },
  { id: "line-ada-intro-why-nuclei-decay", npcId: "npc-ada", kind: "lesson_intro", lessonId: "why-nuclei-decay", text: "Some nuclei change all by themselves, and nobody can say when. Let's find out why.", pose: "explain" },
  { id: "line-ada-intro-alpha-beta-gamma", npcId: "npc-ada", kind: "lesson_intro", lessonId: "alpha-beta-gamma", text: "When a nucleus changes, something comes out. Let's meet the three things it can be.", pose: "point" },
  { id: "line-ada-intro-half-life", npcId: "npc-ada", kind: "lesson_intro", lessonId: "half-life", text: "A half-life ticks for a whole crowd of atoms, not for one. Let's see how.", pose: "think" },
  { id: "line-ada-intro-decay-chains", npcId: "npc-ada", kind: "lesson_intro", lessonId: "decay-chains", text: "One change is not always the end. Let's follow a nucleus all the way down.", pose: "explain" },
  { id: "line-ada-intro-radioactivity-is-natural", npcId: "npc-ada", kind: "lesson_intro", lessonId: "radioactivity-is-natural", text: "Here is something nobody expects: radioactivity was always here. Let's find where.", pose: "greet" },
  { id: "line-ada-tease", npcId: "npc-ada", kind: "tease", text: "Finish my unit first. There is more to learn about what radiation does.", pose: "idle" },
  { id: "line-ray-meet", npcId: "npc-ray", kind: "meet", text: "I'm Ray. Radiation, what it does to things, what stops it. Short answers. Let's go.", pose: "greet" },
  { id: "line-ray-sign-off", npcId: "npc-ray", kind: "sign_off", text: "Unit done. You can say what radiation does and what stops it. Noted. Good work.", pose: "proud" },
  { id: "line-ray-tease", npcId: "npc-ray", kind: "tease", text: "Finish my unit first. After that: what radiation does to the body. That one is Mina's.", pose: "idle" },
  { id: "line-ray-intro-ionizing-or-not", npcId: "npc-ray", kind: "lesson_intro", lessonId: "ionizing-or-not", text: "Not all radiation is the same. First job: sort out which kind can knock electrons off atoms.", pose: "point" },
  { id: "line-ray-intro-what-stops-what", npcId: "npc-ray", kind: "lesson_intro", lessonId: "what-stops-what", text: "Three kinds, three different stoppers. Paper, thin metal, thick lead. Learn which is which.", pose: "explain" },
  { id: "line-ray-intro-irradiated-or-contaminated", npcId: "npc-ray", kind: "lesson_intro", lessonId: "irradiated-or-contaminated", text: "Standing near a source is not the same as having material on you. Let's separate the two.", pose: "think" },
  { id: "line-ray-intro-detecting-radiation", npcId: "npc-ray", kind: "lesson_intro", lessonId: "detecting-radiation", text: "Puzzle. A detector reads something in an empty field. Is it broken? Let's find out.", pose: "point" },
  { id: "line-ray-intro-becquerel-gray-sievert", npcId: "npc-ray", kind: "lesson_intro", lessonId: "becquerel-gray-sievert", text: "Three units, three questions. Get the unit wrong and the number means nothing. Let's get them right.", pose: "explain" },
  { id: "line-mina-meet", npcId: "npc-mina", kind: "meet", text: "I'm Mina. I teach what radiation does to the body. We'll go one calm step at a time.", pose: "greet" },
  { id: "line-mina-sign-off", npcId: "npc-mina", kind: "sign_off", text: "Unit done. You can say how big a dose is, how the body copes, and what lowers it.", pose: "proud" },
  { id: "line-mina-tease", npcId: "npc-mina", kind: "tease", text: "That's all of my lessons for now. More is on the way, and I'll be here when it arrives.", pose: "idle" },
  { id: "line-mina-intro-the-dose-scale", npcId: "npc-mina", kind: "lesson_intro", lessonId: "the-dose-scale", text: "How big is a dose, really? You get a little every day, and that's fine. Let's use numbers.", pose: "explain" },
  { id: "line-mina-intro-radiation-and-cells", npcId: "npc-mina", kind: "lesson_intro", lessonId: "radiation-and-cells", text: "Radiation can damage a cell. That's a real worry. The other half matters just as much. Let's see both.", pose: "think" },
  { id: "line-mina-intro-dose-and-time", npcId: "npc-mina", kind: "lesson_intro", lessonId: "dose-and-time", text: "The same amount can mean different things, depending on how fast it arrives. Let's compare the two.", pose: "point" },
  { id: "line-mina-intro-time-distance-shielding", npcId: "npc-mina", kind: "lesson_intro", lessonId: "time-distance-shielding", text: "A dose isn't fixed. There are three ways to lower it. We'll take them one at a time.", pose: "explain" },
  { id: "line-mina-intro-risk-in-perspective", npcId: "npc-mina", kind: "lesson_intro", lessonId: "risk-in-perspective", text: "Last lesson. No new facts, just a calm way to read a scary number. Take your time with it.", pose: "idle" },
];
