/**
 * The figure library (docs/features/CONTENT_SOURCE_PHASE5_SPEC.md section 2). A lesson card or item names a figure by
 * id (`figure: half-life-bars`) and the app draws it from here, like blog art and chat stickers.
 *
 * `resolveFigure` never throws: an unknown id, or arguments the function rejects, gives `null`, and the caller shows
 * the card without a picture. `validate:content` makes the same cases an error, so they cannot ship.
 * Pure TypeScript with erasable syntax and `.ts` imports: the app, `node --test` and the content tooling share it.
 */
import * as figureModule from "./figures.ts";

export * from "./shapes.ts";
export * from "./figures.ts";

/** What a figure function returns: a scene and the words a screen reader says for it. */
export interface FigureResult {
  scene: { height: number; shapes: Record<string, unknown>[]; [key: string]: unknown };
  altText: string;
}

/**
 * Exports of figures.ts that are not card figures: hotspot scenes carry tap targets (their items use them inline), and
 * `firstTenGrid` is a helper that returns bare shapes.
 */
const NOT_CARD_FIGURES = new Set(["atomHotspot", "changeHotspot", "firstTenGrid"]);

/** `halfLifeBars` -> `half-life-bars`. */
export const figureId = (name: string): string => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

type FigureFn = (...args: never[]) => unknown;

/** id -> function, for every exported figure. Built once from the module, so a new figure needs no registration. */
export const FIGURES: Readonly<Record<string, FigureFn>> = Object.freeze(
  Object.fromEntries(
    Object.entries(figureModule)
      .filter(([name, value]) => typeof value === "function" && !NOT_CARD_FIGURES.has(name))
      .map(([name, value]) => [figureId(name), value as FigureFn]),
  ),
);

export const figureIds = (): string[] => Object.keys(FIGURES).sort();

/** Draw a figure by id. `null` when the id is unknown, the arguments are rejected, or the result is not a figure. */
export function resolveFigure(ref: unknown, args?: unknown): FigureResult | null {
  if (typeof ref !== "string") return null;
  const fn = Object.prototype.hasOwnProperty.call(FIGURES, ref) ? FIGURES[ref] : null;
  if (!fn) return null;
  if (args !== undefined && !Array.isArray(args)) return null;
  try {
    const out = (fn as (...a: unknown[]) => unknown)(...((args as unknown[] | undefined) ?? []));
    const r = out as Partial<FigureResult> | null;
    if (!r || typeof r !== "object" || !r.scene || typeof r.scene !== "object" || !Array.isArray(r.scene.shapes) || typeof r.altText !== "string") return null;
    return r as FigureResult;
  } catch {
    return null;
  }
}

/**
 * A card's or item's `figure` field as the app draws it. A figure with a `ref` becomes `{ scene, altText, ...rest }`
 * (the stored `altText` wins when there is one); a figure with an inline `scene` is returned as it is.
 * `problem` says why a figure cannot be drawn (hydrate then drops it, the content rules make it an error).
 */
export function expandFigure(fig: unknown): { figure: unknown; problem?: string } {
  if (!fig || typeof fig !== "object" || Array.isArray(fig)) return { figure: fig };
  const f = fig as Record<string, unknown>;
  if (!("ref" in f)) return { figure: fig };
  if ("scene" in f) return { figure: fig, problem: "a figure has a ref or a scene, never both" };
  const r = resolveFigure(f.ref, f.args);
  if (!r) return { figure: undefined, problem: `figure "${String(f.ref)}" is not in the figure library, or its arguments were rejected` };
  const rest: Record<string, unknown> = { ...f };
  delete rest.ref;
  delete rest.args;
  return { figure: { ...rest, scene: r.scene, altText: typeof f.altText === "string" && f.altText.trim() ? f.altText : r.altText } };
}

const warned = new Set<string>();

/** `data` of a card or item with its figure drawn. An unknown figure is dropped (the card still plays) and logged once. */
export function withDrawnFigure(data: Record<string, unknown>): Record<string, unknown> {
  if (!data.figure) return data;
  const { figure, problem } = expandFigure(data.figure);
  if (problem && !warned.has(problem)) {
    warned.add(problem);
    console.warn(`[figures] ${problem}`);
  }
  const out = { ...data };
  if (figure === undefined) delete out.figure;
  else out.figure = figure;
  return out;
}
