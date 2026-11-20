/**
 * Field Notes: the learner's private notebook on the phone (docs/features/PHONE_SPEC.md §10). Framework-free so
 * `scripts/test-field-notes.mjs` runs it on in-memory SQLite: the limits, the SQL over `field_notes`, and the
 * pure helpers the screens use (titles, previews, the source a clipping points back to, the character counter).
 *
 * The notebook is on the device only. Nothing here sends, logs or shares a note.
 */

export const NOTE_LIMITS = { title: 120, body: 2000, snippet: 300, notes: 200 } as const;

/** What a clipping was cut from. */
export type NoteSource = "atomdex" | "fact" | "lesson" | "scan";

export interface Note {
  id: string;
  title: string;
  body: string;
  sourceType: NoteSource | null;
  sourceId: string | null;
  /** The quoted line of a clipping. */
  snippet: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface NotesDb {
  runAsync(sql: string, params?: (string | number | null)[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
}

interface Row {
  id: string;
  title: string;
  body: string;
  source_type: string | null;
  source_id: string | null;
  snippet: string | null;
  created_at: number;
  updated_at: number;
}

const COLUMNS = "id, title, body, source_type, source_id, snippet, created_at, updated_at";

const toNote = (r: Row): Note => ({
  id: r.id,
  title: r.title,
  body: r.body,
  sourceType: (r.source_type as NoteSource | null) ?? null,
  sourceId: r.source_id,
  snippet: r.snippet,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const clampTitle = (s: string): string => s.slice(0, NOTE_LIMITS.title);
export const clampBody = (s: string): string => s.slice(0, NOTE_LIMITS.body);
const clampSnippet = (s: string): string => s.trim().slice(0, NOTE_LIMITS.snippet);

/** Escape `%`, `_` and the escape character so a search for "50%" matches the text, not everything. */
const likePattern = (q: string): string => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export interface NewNote {
  title?: string;
  body?: string;
  source?: { type: NoteSource; id: string; snippet: string };
}

export type CreateResult = { ok: true; note: Note } | { ok: false; reason: "full" };

export function createFieldNotesStore(getDb: () => Promise<NotesDb> | NotesDb, newId: () => string) {
  async function count(): Promise<number> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ n: number }>("SELECT COUNT(*) AS n FROM field_notes WHERE deleted_at IS NULL");
    return rows[0]?.n ?? 0;
  }

  /** Make a note. `full` when the notebook already holds `NOTE_LIMITS.notes`. */
  async function create(input: NewNote, now: number): Promise<CreateResult> {
    const db = await getDb();
    if ((await count()) >= NOTE_LIMITS.notes) return { ok: false, reason: "full" };
    const note: Note = {
      id: newId(),
      title: clampTitle(input.title ?? ""),
      body: clampBody(input.body ?? ""),
      sourceType: input.source?.type ?? null,
      sourceId: input.source?.id ?? null,
      snippet: input.source ? clampSnippet(input.source.snippet) : null,
      createdAt: now,
      updatedAt: now,
    };
    await db.runAsync(
      "INSERT INTO field_notes (id, title, body, source_type, source_id, snippet, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
      [note.id, note.title, note.body, note.sourceType, note.sourceId, note.snippet, now, now],
    );
    return { ok: true, note };
  }

  /** Save a note's title and body (clamped to the limits). `false` when it is gone. */
  async function save(id: string, fields: { title: string; body: string }, now: number): Promise<boolean> {
    const db = await getDb();
    const r = await db.runAsync(
      "UPDATE field_notes SET title = ?, body = ?, updated_at = ?, is_dirty = 1, version = version + 1 WHERE id = ? AND deleted_at IS NULL",
      [clampTitle(fields.title), clampBody(fields.body), now, id],
    );
    return r.changes > 0;
  }

  /** Delete a note (kept as a tombstone with `deleted_at`, like every local-first table, so a later sync can see it). */
  async function remove(id: string, now: number): Promise<boolean> {
    const db = await getDb();
    const r = await db.runAsync("UPDATE field_notes SET deleted_at = ?, updated_at = ?, is_dirty = 1 WHERE id = ? AND deleted_at IS NULL", [now, now, id]);
    return r.changes > 0;
  }

  async function get(id: string): Promise<Note | null> {
    const db = await getDb();
    const rows = await db.getAllAsync<Row>(`SELECT ${COLUMNS} FROM field_notes WHERE id = ? AND deleted_at IS NULL`, [id]);
    return rows[0] ? toNote(rows[0]) : null;
  }

  /** The note cut from a source, if there is one (a source is clipped once). */
  async function findBySource(type: NoteSource, sourceId: string): Promise<Note | null> {
    const db = await getDb();
    const rows = await db.getAllAsync<Row>(
      `SELECT ${COLUMNS} FROM field_notes WHERE source_type = ? AND source_id = ? AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1`,
      [type, sourceId],
    );
    return rows[0] ? toNote(rows[0]) : null;
  }

  /** Notes, most recently changed first; `query` keeps those whose title, body or quoted line contains it. */
  async function list(query = ""): Promise<Note[]> {
    const db = await getDb();
    const q = query.trim();
    const rows = q
      ? await db.getAllAsync<Row>(
          `SELECT ${COLUMNS} FROM field_notes WHERE deleted_at IS NULL
             AND (title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\' OR COALESCE(snippet, '') LIKE ? ESCAPE '\\')
           ORDER BY updated_at DESC, id`,
          [likePattern(q), likePattern(q), likePattern(q)],
        )
      : await db.getAllAsync<Row>(`SELECT ${COLUMNS} FROM field_notes WHERE deleted_at IS NULL ORDER BY updated_at DESC, id`);
    return rows.map(toNote);
  }

  return { count, create, save, remove, get, findBySource, list };
}

// ---- helpers for the screens ----------------------------------------------------------------------

/** A note with nothing in it and no clipping: it is not kept when the learner leaves it. */
export const isEmptyNote = (n: Pick<Note, "title" | "body" | "snippet">): boolean =>
  n.title.trim() === "" && n.body.trim() === "" && !n.snippet;

const firstLine = (s: string): string => s.split("\n").find((l) => l.trim() !== "")?.trim() ?? "";

/** The title in a list: the title, else the first line of the body, else the quoted line, else "Untitled note". */
export function noteTitle(n: Pick<Note, "title" | "body" | "snippet">): string {
  return n.title.trim() || firstLine(n.body) || (n.snippet ? firstLine(n.snippet) : "") || "Untitled note";
}

/** The grey line under a title: the body's first line (or the quoted line), unless that is already the title. */
export function notePreview(n: Pick<Note, "title" | "body" | "snippet">): string {
  const shown = noteTitle(n);
  const line = firstLine(n.body) || (n.snippet ? firstLine(n.snippet) : "");
  return line && line !== shown ? line : "";
}

// ── the list: filters and kinds ──────────────────────────────────────────────────────────────────────

/** The tabs of the Field Notes shelf: everything, the notes the learner wrote, the lines they clipped. */
export type NoteFilter = "all" | "written" | "clipped";
export const NOTE_FILTERS: readonly { id: NoteFilter; label: string }[] = [
  { id: "all", label: "All notes" },
  { id: "written", label: "Written by me" },
  { id: "clipped", label: "Clipped" },
];

export const filterNotes = <T extends Pick<Note, "sourceType">>(notes: readonly T[], filter: NoteFilter): T[] =>
  notes.filter((n) => (filter === "all" ? true : filter === "written" ? !n.sourceType : !!n.sourceType));

/** What a note is: one the learner wrote, or a clipping from one of the places a line can be cut from. */
export type NoteKind = NoteSource | "written";
export const noteKind = (n: Pick<Note, "sourceType">): NoteKind => n.sourceType ?? "written";

/** How a kind looks on a tile: a phone colour role (the same faces as the phone's app icons) and an icon name. */
export const KIND_LOOK: Record<NoteKind, { role: "blue" | "purple" | "yellow" | "cyan" | "green"; icon: string }> = {
  written: { role: "green", icon: "Edit2" },
  atomdex: { role: "purple", icon: "Book" },
  fact: { role: "yellow", icon: "Lamp" },
  scan: { role: "cyan", icon: "Scan" },
  lesson: { role: "blue", icon: "Teacher" },
};

/** "1 note", "12 notes". */
export const noteCountLabel = (n: number): string => `${n} ${n === 1 ? "note" : "notes"}`;

/** What a clipping's block says it was cut from. */
export const sourceLabel = (type: NoteSource): string =>
  type === "atomdex" ? "From the AtomDex" : type === "fact" ? "From a daily fact" : type === "scan" ? "From the Atom Scanner" : "From a lesson";

/** Where a clipping's block opens. */
export function sourceHref(type: NoteSource, id: string): string {
  switch (type) {
    case "atomdex":
      return `/explorer/encyclopedia-entry?id=${encodeURIComponent(id)}`;
    case "fact":
      return "/daily-facts";
    case "lesson":
      return `/lesson/${encodeURIComponent(id)}`;
    case "scan":
      return `/phone-apps/scanner?target=${encodeURIComponent(id)}`;
  }
}

/** The character counter under the body: the text, and whether it is at or near the limit. */
export function counterOf(length: number, max: number): { text: string; warn: boolean; full: boolean } {
  return { text: `${length} / ${max}`, warn: length >= Math.floor(max * 0.9), full: length >= max };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Today", "Yesterday" or "8 Nov" (with the year when it is not this one), by the local calendar day. */
export function noteDateLabel(ts: number, now: number): string {
  const d = new Date(ts);
  const n = new Date(now);
  const day = (x: Date) => Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
  const diff = Math.round((day(n) - day(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === n.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** The first sentence of a text, cut to `max` characters at a word with an ellipsis (a clipping's quoted line). */
export function clipSnippet(text: string, max: number = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const sentence = flat.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? flat;
  if (sentence.length <= max) return sentence;
  const cut = sentence.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), Math.floor(max / 2))).trimEnd()}…`;
}
