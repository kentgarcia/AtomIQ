/**
 * Speech-bubble emotes over the hero and the enemies (pure maths and rules, no React, unit-tested with
 * `npm run test:platformer`). The pictures are Kenney's Emotes (`sprites.ts`, `EMOTE_SPRITES`); this file
 * says which one shows for what happens and how a bubble moves.
 *
 * A bubble pops out of nothing at the speaker's head (0.2 to 1.18 to 0.97 to 1 over 340 ms, anchored at
 * its tail), hangs with a tiny bob while it is held, and shrinks away and fades in its last 200 ms.
 * Reduced motion: it is simply there for the hold, no pop, no bob.
 */

import { flow, seg } from "../motion/motion-core.ts";
import type { EnemyKind } from "./platformer-core.ts";

export type EmoteName = "exclamation" | "question" | "anger" | "heartBroken" | "heart" | "faceHappy" | "faceSad" | "star" | "stars" | "swirl" | "laugh" | "idea" | "sleep" | "dots3";

export const EMOTE_NAMES: readonly EmoteName[] = ["exclamation", "question", "anger", "heartBroken", "heart", "faceHappy", "faceSad", "star", "stars", "swirl", "laugh", "idea", "sleep", "dots3"];

export type EmoteTarget = { kind: "hero" } | { kind: "enemy"; index: number };

export interface EmoteRequest {
  target: EmoteTarget;
  name: EmoteName;
  /** How long it is held after the pop, ms (default `EMOTE.hold`). */
  hold?: number;
}

/** A bubble that is up: the request plus an id (and the enemy's kind, for the height of its head). */
export interface EmoteInstance extends EmoteRequest {
  id: number;
  enemyKind?: EnemyKind;
}

export const EMOTE = { pop: 340, out: 200, hold: 1100, sleepHold: 2200, sleepAfter: 7, sleepEvery: 4.5 } as const;

/** The whole life of a bubble, ms. */
export const emoteTotal = (hold: number = EMOTE.hold): number => EMOTE.pop + hold + EMOTE.out;

export interface EmotePose {
  /** About its tail tip (the bottom middle). */
  scale: number;
  opacity: number;
  /** Lift in tiles (negative is up). */
  dy: number;
}

export function emotePose(t: number, hold: number = EMOTE.hold): EmotePose {
  'worklet';
  const total = EMOTE.pop + hold + EMOTE.out;
  if (t <= 0 || t >= total) return { scale: 0, opacity: 0, dy: 0 };
  const leave = seg(t, EMOTE.pop + hold, total, 'inOut');
  const settled = Math.max(0, t - EMOTE.pop);
  return {
    scale: t < EMOTE.pop ? flow(t, [[0, 0.2], [130, 1.18], [250, 0.97], [EMOTE.pop, 1]]) : 1 - 0.25 * leave,
    opacity: seg(t, 0, 70) * (1 - leave),
    dy: -0.03 * Math.sin(settled / 260) - 0.08 * leave,
  };
}

/** What the speakers say when the world reports something (the hero's moments; battles are in `emotesForAnswer`). */
export function emotesForEvent(event: { type: string; reward?: string; reason?: string; enemy?: number }, isBoss: (enemy: number) => boolean = () => false): EmoteRequest[] {
  const hero: EmoteTarget = { kind: "hero" };
  switch (event.type) {
    case "hurt":
      return [{ target: hero, name: "heartBroken" }];
    case "battle": {
      const index = event.enemy ?? 0;
      return [{ target: { kind: "enemy", index }, name: isBoss(index) ? "anger" : "exclamation", hold: 900 }];
    }
    case "block":
      return event.reward === "heart" ? [{ target: hero, name: "heart" }] : [];
    case "key":
      return [{ target: hero, name: "idea" }];
    case "unlock":
      return [{ target: hero, name: "faceHappy" }];
    case "locked":
    case "flag-locked":
      return [{ target: hero, name: "question" }];
    case "checkpoint":
      return [{ target: hero, name: "star" }];
    default:
      return [];
  }
}

/** The fight's answer: a right one dizzies the enemy (a beating blow cheers the hero instead), a wrong one makes it laugh and breaks the hero's heart. */
export function emotesForAnswer(correct: boolean, lethal: boolean, enemy: number): EmoteRequest[] {
  const foe: EmoteTarget = { kind: "enemy", index: enemy };
  if (correct) return lethal ? [{ target: { kind: "hero" }, name: "stars" }] : [{ target: foe, name: "swirl" }, { target: { kind: "hero" }, name: "faceHappy" }];
  return [{ target: foe, name: "laugh" }, { target: { kind: "hero" }, name: "heartBroken" }];
}

/** The hero falls asleep standing still: true when a "zZ" is due (`idle` seconds standing, `sinceLast` seconds since the last one, or Infinity). */
export const sleepDue = (idle: number, sinceLast: number): boolean => idle >= EMOTE.sleepAfter && sinceLast >= EMOTE.sleepEvery;
