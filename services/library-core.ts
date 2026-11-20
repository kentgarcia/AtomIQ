/**
 * The Reference Library (docs/PHONE_SPEC.md §5.10): every source the app cites in one list. Framework-free so
 * `scripts/test-library.mjs` runs it with plain Node. It turns the content database's references, the places that
 * cite them and the sources written on AtomDex entries into one de-duplicated list, and groups it two ways
 * (by unit, or all of them A to Z). Unverified sources are shown as such, never hidden.
 */

export interface LibraryReferenceRow {
  id: string;
  kind: string;
  publisher: string;
  title: string;
  year: string;
  url: string;
  verified: boolean;
}

/** Where a reference is cited. `unitId` is set for a unit, a lesson or a blog piece that belongs to one. */
export interface LibraryLink {
  refId: string;
  kind: "unit" | "lesson" | "blog";
  label: string;
  unitId: string | null;
}

/** A source written on an AtomDex entry (not a row of `content_references`). */
export interface EntrySourceRow {
  entryId: string;
  entryTerm: string;
  title: string;
  url: string;
  author: string;
  type: string;
}

export interface LibraryUnit {
  id: string;
  title: string;
  position: number;
}

export interface LibraryRef {
  /** `content_references.id`, or `src:<url>` for a source taken from an AtomDex entry. */
  id: string;
  title: string;
  publisher: string;
  year: string;
  kind: string;
  url: string;
  verified: boolean;
  /** Where it is cited: "Unit: Inside the Atom", "Lesson: ...", "Blog: ...", "AtomDex: Quark". */
  citedBy: string[];
  /** The units that cite it (directly, or through a lesson or blog piece). */
  unitIds: string[];
}

/** A URL reduced to what makes two links the same page: no scheme, no `www.`, no `#fragment`, no trailing slash. */
export function normalizeUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/#.*$/, "")
    .replace(/\/+$/, "");
}

const hostOf = (url: string): string => normalizeUrl(url).split("/")[0] ?? "";

const push = <T,>(list: T[], item: T) => {
  if (!list.includes(item)) list.push(item);
};

/** The one list: content references first (they carry the verified mark), then AtomDex sources that are not already in it. */
export function buildLibrary(input: { references: LibraryReferenceRow[]; links: LibraryLink[]; entrySources: EntrySourceRow[] }): LibraryRef[] {
  const out = new Map<string, LibraryRef>();
  const byUrl = new Map<string, string>();

  for (const r of input.references) {
    out.set(r.id, { id: r.id, title: r.title, publisher: r.publisher, year: r.year, kind: r.kind, url: r.url, verified: r.verified, citedBy: [], unitIds: [] });
    const key = normalizeUrl(r.url);
    if (key && !byUrl.has(key)) byUrl.set(key, r.id);
  }

  const cite = (ref: LibraryRef, label: string, unitId: string | null) => {
    push(ref.citedBy, label);
    if (unitId) push(ref.unitIds, unitId);
  };

  for (const l of input.links) {
    const ref = out.get(l.refId);
    if (!ref) continue;
    const prefix = l.kind === "unit" ? "Unit" : l.kind === "lesson" ? "Lesson" : "Blog";
    cite(ref, `${prefix}: ${l.label}`, l.unitId);
  }

  for (const s of input.entrySources) {
    if (!s.url.trim() || !s.title.trim()) continue;
    const key = normalizeUrl(s.url);
    const existing = byUrl.get(key);
    const label = `AtomDex: ${s.entryTerm}`;
    if (existing) {
      cite(out.get(existing)!, label, null);
      continue;
    }
    const id = `src:${key}`;
    const ref: LibraryRef = { id, title: s.title, publisher: s.author || hostOf(s.url), year: "", kind: s.type, url: s.url, verified: false, citedBy: [], unitIds: [] };
    out.set(id, ref);
    byUrl.set(key, id);
    cite(ref, label, null);
  }

  return [...out.values()].sort(byTitle);
}

const byTitle = (a: LibraryRef, b: LibraryRef) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) || a.id.localeCompare(b.id);

export interface LibrarySection {
  key: string;
  title: string;
  refs: LibraryRef[];
}

/** By unit (in the path's order), then what no unit cites: sources only AtomDex entries and blog pieces use. Empty sections are left out. */
export function groupByUnit(refs: readonly LibraryRef[], units: readonly LibraryUnit[]): LibrarySection[] {
  const sections: LibrarySection[] = [];
  const used = new Set<string>();
  for (const u of [...units].sort((a, b) => a.position - b.position)) {
    const list = refs.filter((r) => r.unitIds.includes(u.id));
    list.forEach((r) => used.add(r.id));
    if (list.length) sections.push({ key: u.id, title: u.title, refs: [...list].sort(byTitle) });
  }
  const rest = refs.filter((r) => !used.has(r.id));
  if (rest.length) sections.push({ key: "other", title: "More sources", refs: [...rest].sort(byTitle) });
  return sections;
}

/** The whole list in one section, A to Z. */
export function allSection(refs: readonly LibraryRef[]): LibrarySection[] {
  return refs.length ? [{ key: "all", title: "All sources", refs: [...refs].sort(byTitle) }] : [];
}

/** Keep the sources whose title, publisher or what cites them contains `query` (a title search appears once the list is long). */
export function filterRefs(refs: readonly LibraryRef[], query: string): LibraryRef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...refs];
  return refs.filter((r) => [r.title, r.publisher, ...r.citedBy].some((t) => t.toLowerCase().includes(q)));
}

/** A search box earns its place once the list passes about forty sources. */
export const SEARCH_AFTER = 40;

export const kindLabel = (kind: string): string =>
  ({ official: "Official", textbook: "Textbook", research: "Research", article: "Article", video: "Video", book: "Book" })[kind] ?? "Source";

/** The line under a title: publisher, year and kind. */
export function sourceLine(r: Pick<LibraryRef, "publisher" | "year" | "kind">): string {
  return [r.publisher, r.year, kindLabel(r.kind)].filter(Boolean).join(" · ");
}

export const verifiedLabel = (verified: boolean): string => (verified ? "Verified" : "Unchecked");

/** What cites a source, shortened for a row: the first two and "+N more". */
export function citedByLine(citedBy: readonly string[], shown = 2): string {
  if (citedBy.length === 0) return "";
  const first = citedBy.slice(0, shown).join(", ");
  return citedBy.length > shown ? `${first} +${citedBy.length - shown} more` : first;
}
