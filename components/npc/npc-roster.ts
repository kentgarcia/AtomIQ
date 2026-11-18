/**
 * The cast: seed data and fallback for the `npcs` and `npc_lines` tables (docs/NPC_TEACHERS_SPEC.md §5).
 *
 * The content database is the source of truth once seeded (`scripts/content-migration/add-npcs.mjs`
 * writes these rows). This file is what the seed script reads, what tests check, and what the app
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
    id: "npc-ada",
    name: "Ada",
    title: "Atom teacher",
    field: "atoms",
    unitId: "inside-the-atom",
    position: 1,
    bio: "Ada has asked what things are made of since she was small. She teaches the atom: what is inside it, and why that matters.",
    spec: {
      skin: trio(CUSTOM.skinPink), head: "tombstone", headWidth: 100, eyes: "pill", nose: "single",
      hair: { style: "curls", color: CUSTOM.hairBrown[0], shade: CUSTOM.hairBrown[1] },
      outfit: { kind: "sweater", color: O.macaw, shade: O.whale },
      accent: { kind: "marble", color: O.cardinal, shade: O.fireAnt },
    },
  },
  {
    id: "npc-hal",
    name: "Hal",
    title: "Radioactivity teacher",
    field: "radioactivity",
    unitId: "radioactivity",
    position: 2,
    bio: "Hal is patient and tells things slowly and exactly. He teaches why some atoms change, and how long that takes.",
    spec: {
      skin: trio(CUSTOM.skinTan), head: "capsule", headWidth: 104, eyes: "round", nose: "double",
      hair: { style: "crop", color: CUSTOM.hairWhite[0], shade: CUSTOM.hairWhite[1] },
      facialHair: "moustache",
      outfit: { kind: "vest", color: O.bee, shade: O.camel, collar: O.blueJay },
      accent: { kind: "watch", color: O.humpback, shade: O.narwhal },
    },
  },
  {
    id: "npc-ray",
    name: "Ray",
    title: "Radiation teacher",
    field: "radiation-and-matter",
    unitId: "radiation-meets-matter",
    position: 3,
    bio: "Ray is practical and a little blunt. He teaches what radiation does when it meets things, and how to stop it.",
    spec: {
      skin: trio(CUSTOM.skinDeep), head: "tombstone", headWidth: 98, eyes: "glasses-square", nose: "double",
      hair: { style: "crop", color: CUSTOM.hairBlack[0], shade: CUSTOM.hairBlack[1] },
      outfit: { kind: "hoodie", color: O.beetle, shade: O.betta, collar: O.snow },
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
    bio: "Mina is warm and calm about risk. She teaches what radiation does to the body, and how big the dose really is.",
    spec: {
      skin: trio(CUSTOM.skinBrown), head: "tombstone", headWidth: 100, eyes: "pill", nose: "single",
      hair: { style: "bun", color: CUSTOM.hairBlack[0], shade: CUSTOM.hairBlack[1] },
      outfit: { kind: "coat", color: O.featherGreen, shade: O.treeFrog, collar: O.snow },
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
    bio: "Kofi is an engineer who likes to see how things work. He teaches where nuclear energy comes from and how a reactor uses it.",
    spec: {
      skin: trio(CUSTOM.skinGuideWarm), head: "tombstone", headWidth: 104, eyes: "dots", nose: "double",
      hair: { style: "crop", color: CUSTOM.hairDark[0], shade: CUSTOM.hairDark[1] },
      facialHair: "beard",
      outfit: { kind: "shirt", color: O.fox, shade: O.guineaPig },
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
    bio: "Tess is quick and loves gadgets. She teaches how nuclear tools help in hospitals, farms and factories.",
    spec: {
      skin: trio(CUSTOM.skinGuideLight), head: "capsule", headWidth: 96, eyes: "round", nose: "single",
      hair: { style: "wrap", color: O.flamingo, shade: O.pig },
      outfit: { kind: "shirt", color: O.whale, shade: O.humpback },
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
    bio: "Sage weighs both sides before deciding. They teach how nuclear power is kept safe, what happens to waste, and the choices society makes.",
    spec: {
      skin: trio(CUSTOM.skinOlive), head: "tombstone", headWidth: 100, eyes: "pill", nose: "single",
      hair: { style: "bob", color: CUSTOM.hairDark[0], shade: CUSTOM.hairDark[1] },
      outfit: { kind: "sweater", color: O.crab, shade: O.cardinal },
      accent: { kind: "notebook", color: O.humpback, shade: O.narwhal },
    },
  },
];

/**
 * Voice lines. Plain text, 20 words or fewer, no fact that is not in the lesson (rule R3).
 * Units 1 and 2 are authored, so Ada and Hal have lines; the others get theirs with their units.
 */
export const NPC_LINES: NpcLineRow[] = [
  { id: "line-ada-meet", npcId: "npc-ada", kind: "meet", text: "Hi, I'm Ada! Let's find out what everything is made of.", pose: "greet" },
  { id: "line-ada-sign-off", npcId: "npc-ada", kind: "sign_off", text: "Nice work. You now know what is inside an atom.", pose: "proud" },
  { id: "line-ada-intro-atoms-are-everywhere", npcId: "npc-ada", kind: "lesson_intro", lessonId: "atoms-are-everywhere", text: "Today you'll see what everything around you is made of, and how small an atom really is.", pose: "greet" },
  { id: "line-ada-intro-protons-neutrons-electrons", npcId: "npc-ada", kind: "lesson_intro", lessonId: "protons-neutrons-electrons", text: "We'll open up an atom and meet its three particles. You'll learn what each one does.", pose: "explain" },
  { id: "line-ada-intro-elements-and-the-periodic-table", npcId: "npc-ada", kind: "lesson_intro", lessonId: "elements-and-the-periodic-table", text: "The number of protons tells you which element an atom is. Let's build some.", pose: "point" },
  { id: "line-ada-intro-isotopes", npcId: "npc-ada", kind: "lesson_intro", lessonId: "isotopes", text: "Atoms of one element can differ a little. You'll learn what isotopes are.", pose: "explain" },
  { id: "line-ada-intro-stable-and-unstable-nuclei", npcId: "npc-ada", kind: "lesson_intro", lessonId: "stable-and-unstable-nuclei", text: "Some nuclei stay the same and some can change. You'll see why that matters.", pose: "think" },
  { id: "line-ada-tease", npcId: "npc-ada", kind: "tease", text: "Finish my unit first, and I'll show you the rest.", pose: "idle" },
  { id: "line-hal-meet", npcId: "npc-hal", kind: "meet", text: "I'm Hal. Take your time. We'll watch how some atoms change, slowly and exactly.", pose: "greet" },
  { id: "line-hal-sign-off", npcId: "npc-hal", kind: "sign_off", text: "Well done. Radioactivity is a natural part of the world, and now you know how it works.", pose: "proud" },
  { id: "line-hal-intro-why-nuclei-decay", npcId: "npc-hal", kind: "lesson_intro", lessonId: "why-nuclei-decay", text: "Some nuclei change all by themselves, and nobody can say when. Let's find out why.", pose: "explain" },
  { id: "line-hal-intro-alpha-beta-gamma", npcId: "npc-hal", kind: "lesson_intro", lessonId: "alpha-beta-gamma", text: "When a nucleus changes, something comes out. Let's meet the three things it can be.", pose: "point" },
  { id: "line-hal-intro-half-life", npcId: "npc-hal", kind: "lesson_intro", lessonId: "half-life", text: "My pocket watch ticks for a whole crowd of atoms, not for one. Let's see how.", pose: "think" },
  { id: "line-hal-intro-decay-chains", npcId: "npc-hal", kind: "lesson_intro", lessonId: "decay-chains", text: "One change is not always the end. Let's follow a nucleus all the way down.", pose: "explain" },
  { id: "line-hal-intro-radioactivity-is-natural", npcId: "npc-hal", kind: "lesson_intro", lessonId: "radioactivity-is-natural", text: "Here is something nobody expects: radioactivity was always here. Let's find where.", pose: "greet" },
  { id: "line-hal-tease", npcId: "npc-hal", kind: "tease", text: "Finish my unit first. There is more to learn about what radiation does.", pose: "idle" },
];
