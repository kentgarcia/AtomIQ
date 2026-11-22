/**
 * Translations of authored content: the framework-free rules (docs/features/CONTENT_SOURCE_I18N_SPEC.md).
 *
 * A translation is a flat map `field path -> text` for one record in one language. The app reads a row in the base language and lays
 * a translation over it; whatever the translation does not name stays in the base language. Structure is never translated: only
 * leaves the rules below call words.
 *
 * Paths address a row: a column, then `.key` and `[index]` into JSON columns: `title`, `options[1]`, `data.options[0].label`.
 * The same module is used by the app (runtime lookup), the content tooling (validation) and the tests, so it is erasable TypeScript.
 */

export type PathSegment = string | number;

/** The language the content is written in. A learner on this language reads the base rows untouched. */
export const BASE_LOCALE = "en";

/** A locale is a language, optionally with a region or script: `es`, `pt-BR`, `zh-Hant`. */
export const LOCALE_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/**
 * Keys inside a JSON column whose string value is words for the learner (plus the `items` of a blog list block, see `wordLeaves`). Anything else in a JSON column (ids, art names, icons,
 * types, answers and lists an answer points into) is structure and is never translated.
 */
export const WORD_KEYS: ReadonlySet<string> = new Set([
  "prompt", "statement", "explanation", "label", "note", "title", "body", "hint", "task", "caption", "altText", "text", "name",
  "summary", "description", "question", "blurb", "fact", "tag", "reason", "heading",
]);

/** A saved or typed language code as a locale (`pt_br` -> `pt-BR` is not guessed: only a well formed code is kept), else null. */
export function normalizeLocale(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return LOCALE_RE.test(v) ? v : null;
}

/** `a.b[0].c` -> ["a", "b", 0, "c"]; null for a path that is not well formed. */
export function parsePath(path: string): PathSegment[] | null {
  if (!path) return null;
  const out: PathSegment[] = [];
  const re = /([^.[\]]+)|\[(\d+)\]/g;
  let consumed = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path))) {
    const before = path.slice(consumed, m.index);
    if (before !== "" && before !== ".") return null;
    if (before === "." && out.length === 0) return null;
    out.push(m[1] !== undefined ? m[1] : Number(m[2]));
    consumed = m.index + m[0].length;
  }
  if (consumed !== path.length || out.length === 0 || typeof out[0] === "number") return null;
  return out;
}

export function formatPath(segments: readonly PathSegment[]): string {
  let out = "";
  for (const s of segments) out += typeof s === "number" ? `[${s}]` : out === "" ? s : `.${s}`;
  return out;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The value at a path, or undefined when any step is missing. */
export function getAt(root: unknown, segments: readonly PathSegment[]): unknown {
  let cur: unknown = root;
  for (const s of segments) {
    if (typeof s === "number") {
      if (!Array.isArray(cur) || s >= cur.length) return undefined;
      cur = cur[s];
    } else {
      if (!isRecord(cur) || !(s in cur)) return undefined;
      cur = cur[s];
    }
  }
  return cur;
}

/** A copy of `root` with the string at `segments` replaced; the same object when the path does not exist or is not a string. */
export function setAt<T>(root: T, segments: readonly PathSegment[], text: string): T {
  if (typeof getAt(root, segments) !== "string") return root;
  const go = (node: unknown, i: number): unknown => {
    if (i === segments.length) return text;
    const s = segments[i];
    if (typeof s === "number") {
      const arr = (node as unknown[]).slice();
      arr[s] = go(arr[s], i + 1);
      return arr;
    }
    return { ...(node as Record<string, unknown>), [s]: go((node as Record<string, unknown>)[s], i + 1) };
  };
  return go(root, 0) as T;
}

/** The last key of a path that is a name (skipping `[n]`): the word that says what the leaf is. */
export function leafKey(segments: readonly PathSegment[]): string | null {
  for (let i = segments.length - 1; i >= 0; i--) if (typeof segments[i] === "string") return segments[i] as string;
  return null;
}

/**
 * Every translatable leaf of a JSON value, as `[path, text]`: a non-empty string under a word key, except the `label` of a sticker
 * or reaction reply (that is the id of a picture). `prefix` is the path of the value itself (`replies`, `data`).
 */
export function wordLeaves(value: unknown, prefix: readonly PathSegment[] = []): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const walk = (v: unknown, at: PathSegment[], parent: unknown) => {
    if (typeof v === "string") {
      const key = leafKey(at);
      const listItems = key === "items" && isRecord(parent) && parent.t === "list"; // a blog list block; other `items` are answers' targets
      if (!key || !(WORD_KEYS.has(key) || listItems) || v.trim() === "") return;
      if (key === "label" && isRecord(parent) && (parent.type === "emoji" || parent.type === "react")) return;
      out.push([formatPath(at), v]);
    } else if (Array.isArray(v)) {
      v.forEach((x, i) => walk(x, [...at, i], parent));
    } else if (isRecord(v)) {
      for (const [k, x] of Object.entries(v)) walk(x, [...at, k], v);
    }
  };
  walk(value, [...prefix], null);
  return out;
}

/** The placeholders a text must keep when it is translated: `{name}` values and `[[pic:id]]` pictures. */
export function placeholdersOf(text: string): string[] {
  return [...(text.match(/\{[A-Za-z][A-Za-z0-9_]*\}|\[\[pic:[A-Za-z0-9._-]+\]\]/g) ?? [])].sort();
}

/** True when the translation keeps exactly the placeholders of the base text, each as many times. */
export function samePlaceholders(base: string, translated: string): boolean {
  const a = placeholdersOf(base);
  const b = placeholdersOf(translated);
  return a.length === b.length && a.every((p, i) => p === b[i]);
}

/**
 * Lay a translation over a base row. Entries whose path no longer exists in the row, or is not a string, are ignored: a
 * translation that fell behind its base shows the base text rather than breaking the screen.
 *
 * `columns` are JSON-looking values already parsed (a `data` object, a `replies` array); pass the row as the app hydrates it.
 */
export function applyTranslation<T extends object>(row: T, fields: Readonly<Record<string, string>> | null | undefined): T {
  if (!fields) return row;
  let out = row;
  for (const [path, text] of Object.entries(fields)) {
    const segs = parsePath(path);
    if (!segs || typeof text !== "string" || text === "") continue;
    out = setAt(out, segs, text);
  }
  return out;
}

/**
 * The languages to try for a request, most specific first, ending with the base language: `pt-BR` -> ["pt-BR", "pt", "en"].
 * Only languages in `available` are returned, and the base language is never "available" (it needs no translation).
 */
export function localeChain(requested: string | null | undefined, available: Iterable<string>, base: string = BASE_LOCALE): string[] {
  const have = new Set(available);
  const out: string[] = [];
  let cur = (requested ?? "").trim();
  while (cur) {
    if (cur !== base && have.has(cur)) out.push(cur);
    const cut = cur.lastIndexOf("-");
    cur = cut === -1 ? "" : cur.slice(0, cut);
  }
  return out;
}

/** The translation fields to use for a row: the first language in the chain that has an entry (whole entries do not mix). */
export function pickFields(
  chain: readonly string[],
  entryFor: (locale: string) => Readonly<Record<string, string>> | undefined,
): Readonly<Record<string, string>> | null {
  for (const l of chain) {
    const f = entryFor(l);
    if (f && Object.keys(f).length) return f;
  }
  return null;
}
