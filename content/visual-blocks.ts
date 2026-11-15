/**
 * Visual lesson block validation — pure and framework-free.
 *
 * Imported by the app (renderer fallback) and by Node tests
 * (`npm run test:visuals`, Node 22 type stripping). Keep it that way:
 * relative imports only, `import type` only, no enums, no path aliases,
 * no React / React Native.
 *
 * See docs/completed/VISUAL_LESSON_BLOCKS.md.
 */

import type { VisualBlock } from "./types";

export const VISUAL_BLOCK_KINDS = [
  "diagram",
  "process_flow",
  "model",
  "comparison_cards",
  "annotated_illustration",
  "real_life_example",
] as const;

export const VISUAL_TONES = [
  "primary",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
  "neutral",
] as const;

/** Kinds whose content depends on external facts/data/imagery: `source` is mandatory. */
export const SOURCE_REQUIRED_KINDS: readonly string[] = [
  "comparison_cards",
  "real_life_example",
];

const SCENE_KINDS: readonly string[] = ["diagram", "model", "annotated_illustration"];
const SCENE_WIDTH = 100;
const MIN_PLAIN_TEXT = 40;
const MIN_ALT_TEXT = 20;

export interface VisualValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

type Rec = Record<string, unknown>;

const isRec = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function checkScene(scene: unknown, path: string, errors: string[]): void {
  if (!isRec(scene)) {
    errors.push(`${path} must be an object`);
    return;
  }
  const height = scene.height;
  if (!isNum(height) || height < 20 || height > 120) {
    errors.push(`${path}.height must be a number between 20 and 120`);
  }
  const h = isNum(height) ? height : 120;
  if (!Array.isArray(scene.shapes) || scene.shapes.length === 0) {
    errors.push(`${path}.shapes must be a non-empty array`);
    return;
  }
  scene.shapes.forEach((shape: unknown, i: number) => {
    const p = `${path}.shapes[${i}]`;
    if (!isRec(shape)) {
      errors.push(`${p} must be an object`);
      return;
    }
    const need = (keys: string[]) => {
      for (const k of keys) if (!isNum(shape[k])) errors.push(`${p}.${k} must be a number`);
    };
    switch (shape.t) {
      case "rect":
        need(["x", "y", "w", "h"]);
        break;
      case "circle":
        need(["x", "y", "r"]);
        break;
      case "line":
        need(["x1", "y1", "x2", "y2"]);
        break;
      case "text":
        need(["x", "y"]);
        if (!isStr(shape.text)) errors.push(`${p}.text must be a non-empty string`);
        break;
      default:
        errors.push(`${p}.t must be rect, circle, line or text`);
        return;
    }
    if (shape.tone !== undefined && !(VISUAL_TONES as readonly unknown[]).includes(shape.tone)) {
      errors.push(`${p}.tone "${String(shape.tone)}" is not a valid tone`);
    }
    for (const k of ["x", "x1", "x2"]) {
      const v = shape[k];
      if (isNum(v) && (v < 0 || v > SCENE_WIDTH)) errors.push(`${p}.${k} is outside the 0-${SCENE_WIDTH} scene width`);
    }
    for (const k of ["y", "y1", "y2"]) {
      const v = shape[k];
      if (isNum(v) && (v < 0 || v > h)) errors.push(`${p}.${k} is outside the 0-${h} scene height`);
    }
  });
}

function checkSource(block: Rec, errors: string[], warnings: string[]): void {
  const source = block.source;
  const required = SOURCE_REQUIRED_KINDS.includes(String(block.kind));
  if (source === undefined || source === null) {
    if (required) errors.push(`source is required for kind "${String(block.kind)}" (cite a reference or mark it { type: "original", note })`);
    else warnings.push("no source: add { type: \"original\", note } or a reference");
    return;
  }
  if (!isRec(source)) {
    errors.push("source must be an object");
    return;
  }
  if (source.type === "original") {
    if (!isStr(source.note)) errors.push("source.note is required when source.type is \"original\"");
  } else if (source.type === "reference") {
    if (!isStr(source.publisher)) errors.push("source.publisher is required for a reference source");
    if (!isStr(source.title)) errors.push("source.title is required for a reference source");
  } else {
    errors.push('source.type must be "original" or "reference"');
  }
}

/** Does `plainText` mention `needle` (case/space-insensitive)? */
function mentions(plainText: string, needle: string): boolean {
  return norm(plainText).includes(norm(needle));
}

/**
 * Validate one visual block. Never throws. `errors` make the block unfit to
 * publish/render as a figure; `warnings` are advisory.
 */
export function validateVisualBlock(input: unknown): VisualValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRec(input)) {
    return { ok: false, errors: ["block must be an object"], warnings };
  }
  const block = input;
  const kind = block.kind;

  if (!(VISUAL_BLOCK_KINDS as readonly unknown[]).includes(kind)) {
    errors.push(`kind must be one of ${VISUAL_BLOCK_KINDS.join(", ")}`);
  }
  for (const key of ["id", "learningObjective", "title", "explanation", "altText", "plainText"]) {
    if (!isStr(block[key])) errors.push(`${key} is required and must be a non-empty string`);
  }

  if (isStr(block.altText)) {
    if (isStr(block.title) && norm(block.altText) === norm(block.title)) {
      errors.push("altText must describe what the visual shows, not repeat the title");
    }
    if (block.altText.trim().length < MIN_ALT_TEXT) errors.push(`altText is too short (< ${MIN_ALT_TEXT} characters)`);
    if (isStr(block.plainText) && norm(block.altText) === norm(block.plainText)) {
      errors.push("altText and plainText must differ (alt text is a short description; plainText is the full equivalent)");
    }
  }
  if (isStr(block.plainText) && block.plainText.trim().length < MIN_PLAIN_TEXT) {
    errors.push(`plainText is too short (< ${MIN_PLAIN_TEXT} characters) to fully convey the content`);
  }
  if (block.caption !== undefined && !isStr(block.caption)) errors.push("caption must be a non-empty string when present");
  if (block.credit !== undefined && !isStr(block.credit)) errors.push("credit must be a non-empty string when present");
  checkSource(block, errors, warnings);

  if (block.responsive !== undefined) {
    const r = block.responsive;
    if (!isRec(r)) errors.push("responsive must be an object");
    else {
      if (r.stackBelow !== undefined && !isNum(r.stackBelow)) errors.push("responsive.stackBelow must be a number");
      if (r.tabletLayout !== undefined && r.tabletLayout !== "side-by-side" && r.tabletLayout !== "stacked") {
        errors.push('responsive.tabletLayout must be "side-by-side" or "stacked"');
      }
    }
  }

  const plain = isStr(block.plainText) ? block.plainText : "";

  if (typeof kind === "string" && SCENE_KINDS.includes(kind)) {
    checkScene(block.scene, "scene", errors);
    if (!Array.isArray(block.callouts) || block.callouts.length < 2) {
      errors.push("callouts must be an array with at least 2 entries");
    } else {
      const seen = new Set<string>();
      const h = isRec(block.scene) && isNum(block.scene.height) ? block.scene.height : 120;
      block.callouts.forEach((c: unknown, i: number) => {
        const p = `callouts[${i}]`;
        if (!isRec(c)) {
          errors.push(`${p} must be an object`);
          return;
        }
        if (!isStr(c.id)) errors.push(`${p}.id is required`);
        else if (seen.has(c.id)) errors.push(`${p}.id "${c.id}" is duplicated`);
        else seen.add(c.id);
        if (!isStr(c.label)) errors.push(`${p}.label is required`);
        else if (plain && !mentions(plain, c.label)) errors.push(`plainText does not mention callout "${c.label}"`);
        if (!isStr(c.detail)) errors.push(`${p}.detail is required`);
        if (!isNum(c.x) || c.x < 0 || c.x > SCENE_WIDTH) errors.push(`${p}.x must be within 0-${SCENE_WIDTH}`);
        if (!isNum(c.y) || c.y < 0 || c.y > h) errors.push(`${p}.y must be within 0-${h}`);
      });
    }
    if (block.key !== undefined) {
      if (!Array.isArray(block.key)) errors.push("key must be an array");
      else {
        block.key.forEach((k: unknown, i: number) => {
          if (!isRec(k) || !isStr(k.label) || !(VISUAL_TONES as readonly unknown[]).includes(k.tone)) {
            errors.push(`key[${i}] needs a label and a valid tone`);
          } else if (plain && !mentions(plain, k.label)) {
            errors.push(`plainText does not mention key entry "${k.label}"`);
          }
        });
      }
    }
    if (kind === "model" && (!Array.isArray(block.key) || block.key.length === 0)) {
      warnings.push("model blocks should define a key so each hue/shape is explained");
    }
  } else if (kind === "process_flow") {
    if (!Array.isArray(block.steps) || block.steps.length < 2) {
      errors.push("steps must be an array with at least 2 entries");
    } else {
      block.steps.forEach((s: unknown, i: number) => {
        const p = `steps[${i}]`;
        if (!isRec(s) || !isStr(s.label)) {
          errors.push(`${p}.label is required`);
          return;
        }
        if (plain && !mentions(plain, s.label)) errors.push(`plainText does not mention step "${s.label}"`);
        if (s.value !== undefined && !isStr(s.value)) errors.push(`${p}.value must be a non-empty string`);
        if (s.meter !== undefined && (!isNum(s.meter) || s.meter < 0 || s.meter > 1)) {
          errors.push(`${p}.meter must be a number between 0 and 1`);
        }
      });
    }
  } else if (kind === "comparison_cards") {
    if (!Array.isArray(block.items) || block.items.length < 2) {
      errors.push("items must be an array with at least 2 entries");
    } else {
      let allNumeric = true;
      block.items.forEach((it: unknown, i: number) => {
        const p = `items[${i}]`;
        if (!isRec(it) || !isStr(it.label) || !isStr(it.value)) {
          errors.push(`${p} needs a label and a value`);
          allNumeric = false;
          return;
        }
        if (plain && !mentions(plain, it.label)) errors.push(`plainText does not mention item "${it.label}"`);
        if (it.numeric !== undefined && (!isNum(it.numeric) || it.numeric <= 0)) {
          errors.push(`${p}.numeric must be a positive number`);
        }
        if (it.numeric === undefined) allNumeric = false;
      });
      const scale = block.scale;
      if (scale !== undefined && scale !== "log" && scale !== "linear" && scale !== "none") {
        errors.push('scale must be "log", "linear" or "none"');
      }
      if ((scale === "log" || scale === "linear") && !allNumeric) {
        errors.push("scale requires every item to have a numeric value");
      }
    }
  } else if (kind === "real_life_example") {
    for (const key of ["headline", "whatYouSee", "theScience", "whyItMatters"]) {
      if (!isStr(block[key])) errors.push(`${key} is required for real_life_example`);
    }
    if (block.facts !== undefined && (!Array.isArray(block.facts) || !block.facts.every(isStr))) {
      errors.push("facts must be an array of non-empty strings");
    }
    if (block.scene !== undefined) checkScene(block.scene, "scene", errors);
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** Returns the raw `visuals` array of a step payload (empty when absent/invalid). Never throws. */
export function getStepVisuals(stepData: unknown): unknown[] {
  if (!isRec(stepData)) return [];
  const v = stepData.visuals;
  return Array.isArray(v) ? v : [];
}

/** True when `block` passes validation (type guard for the renderer). */
export function isRenderableVisualBlock(block: unknown): block is VisualBlock {
  return validateVisualBlock(block).ok;
}

/**
 * Structured text a degraded renderer can show for a malformed block:
 * whatever teaching text survives, in reading order.
 */
export function fallbackTextParts(block: unknown): { title?: string; explanation?: string; plainText?: string } {
  if (!isRec(block)) return {};
  return {
    title: isStr(block.title) ? block.title : undefined,
    explanation: isStr(block.explanation) ? block.explanation : undefined,
    plainText: isStr(block.plainText) ? block.plainText : undefined,
  };
}

/** Normalised position (0.04-1) of `value` on the chosen bar scale; used by comparison cards. */
export function barFraction(
  value: number,
  values: number[],
  scale: "log" | "linear",
): number {
  const positives = values.filter((v) => v > 0);
  const max = Math.max(...positives);
  const min = Math.min(...positives);
  if (!(value > 0) || !isFinite(max)) return 0.04;
  if (scale === "linear") return Math.max(0.04, Math.min(1, value / max));
  if (max === min) return 1;
  // Log scale: smallest value gets a short-but-visible bar, largest fills the track.
  const f = (Math.log10(value) - Math.log10(min)) / (Math.log10(max) - Math.log10(min));
  return Math.max(0.06, Math.min(1, 0.06 + f * 0.94));
}

/** Text a Read Aloud control should speak for a list of visual blocks (title, teaching text, plain-text equivalent). */
export function getVisualSpeechText(visuals: unknown[]): string {
  const parts: string[] = [];
  for (const block of visuals) {
    const t = fallbackTextParts(block);
    if (t.title) parts.push(t.title);
    if (t.explanation) parts.push(t.explanation);
    if (t.plainText) parts.push(t.plainText);
  }
  return parts.join(" ");
}
