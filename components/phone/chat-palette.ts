/**
 * The colours of one conversation, taken from the teacher's cover (their outfit colour and its shade). Two sets:
 *  - the cover's own (`base`, `on`): the header, where the picture is the outfit colour and the title sits on it;
 *  - the faces (`face`, `faceOn`, `lip`): the learner's bubbles and the link button, which carry reading text, so the face is the outfit
 *    colour only while white or the dark ink reads on it at 4.5:1, and is deepened until white does when neither does (Ada's bright blue).
 * Framework-free so `test:chats` can check it. A teacher's bubbles are a light wash of `base` made from the theme in the component, so
 * their text stays the theme's own and dark mode still works.
 */

import { contrastBetween, darken } from "../lesson/visual/color-math.ts";
import { EEL, SNOW } from "../lesson/visual/object-art.ts";

/** WCAG AA for text. */
export const READABLE = 4.5;

export interface ChatPalette {
  /** The outfit colour: the header cover, button edges. */
  base: string;
  /** The darker shade of the outfit. */
  shade: string;
  /** Text and icons that read on the cover (white, or the dark ink on a light outfit). */
  on: string;
  /** Whether `on` is white, so the status bar can be light. */
  onIsLight: boolean;
  /** A bubble or button face that carries text. */
  face: string;
  /** The text on `face`, at least 4.5:1. */
  faceOn: string;
  /** The lip under a face. */
  lip: string;
}

/** The face for reading text: the colour itself if white or ink reads on it, else deepened until white does. */
export function readableFace(color: string): { face: string; on: string } {
  const ink = EEL[2];
  if (contrastBetween(color, SNOW) >= READABLE) return { face: color, on: SNOW };
  if (contrastBetween(color, ink) >= READABLE) return { face: color, on: ink };
  let face = color;
  for (let step = 1; step <= 20 && contrastBetween(face, SNOW) < READABLE; step++) face = darken(color, step * 0.04);
  return { face, on: SNOW };
}

export function chatPalette(outfit: { color: string; shade: string }): ChatPalette {
  const onIsLight = contrastBetween(outfit.color, SNOW) >= contrastBetween(outfit.color, EEL[2]);
  const { face, on } = readableFace(outfit.color);
  return { base: outfit.color, shade: outfit.shade, on: onIsLight ? SNOW : EEL[2], onIsLight, face, faceOn: on, lip: darken(face, 0.22) };
}
