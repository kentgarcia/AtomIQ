/**
 * Glossary term markers in lesson text: "[[atomic-number|atomic number]]".
 * The id is an encyclopedia entry id; the second part is what the learner sees.
 * Framework-free so tests and tooling share the parser.
 */

export type TextSegment = { text: string; termId?: undefined } | { text: string; termId: string };

// A marker is [[id|shown]]. A bare [[id]] still works (the id is shown), so a slip in the text never prints its brackets;
// the content rules make it an error all the same.
const TERM_RE = /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g;

export function splitTerms(input: string): TextSegment[] {
  const out: TextSegment[] = [];
  let last = 0;
  for (const m of input.matchAll(TERM_RE)) {
    const index = m.index ?? 0;
    if (index > last) out.push({ text: input.slice(last, index) });
    out.push({ text: m[2] ?? m[1], termId: m[1] });
    last = index + m[0].length;
  }
  if (last < input.length) out.push({ text: input.slice(last) });
  return out.length ? out : [{ text: input }];
}

/** The text a screen reader or Read Aloud should speak: markers resolved to their shown text. */
export function plainText(input: string): string {
  return input.replace(TERM_RE, (_m, id: string, shown?: string) => shown ?? id);
}
