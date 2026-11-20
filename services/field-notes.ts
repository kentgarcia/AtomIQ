/**
 * Field Notes over the user-state database (SQL, limits and helpers in `field-notes-core.ts`). The notebook is
 * private and on the device only: nothing here logs a note's text.
 */

import { getDatabase } from "@/services/database";
import { createFieldNotesStore, type CreateResult, type NewNote, type Note, type NoteSource, type NotesDb } from "@/services/field-notes-core";

export {
  KIND_LOOK,
  NOTE_FILTERS,
  NOTE_LIMITS,
  clampBody,
  clampTitle,
  clipSnippet,
  counterOf,
  filterNotes,
  isEmptyNote,
  noteCountLabel,
  noteDateLabel,
  noteKind,
  notePreview,
  noteTitle,
  sourceHref,
  sourceLabel,
  type Note,
  type NoteFilter,
  type NoteKind,
  type NoteSource,
} from "@/services/field-notes-core";

const randomId = () => `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const store = createFieldNotesStore(() => getDatabase() as unknown as NotesDb, randomId);

type Listener = () => void;
const listeners = new Set<Listener>();

/** Called whenever a note is made, saved or deleted (the list and the "Add to Field Notes" buttons follow it). */
export function subscribeNotes(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const changed = () =>
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // A listener's failure never undoes a save.
    }
  });

/** Notes, most recently changed first; `query` filters by text. Never rejects. */
export async function listNotes(query = ""): Promise<Note[]> {
  try {
    return await store.list(query);
  } catch {
    console.warn("[field-notes] list failed");
    return [];
  }
}

export async function getNote(id: string): Promise<Note | null> {
  try {
    return await store.get(id);
  } catch {
    return null;
  }
}

export async function findNoteBySource(type: NoteSource, sourceId: string): Promise<Note | null> {
  try {
    return await store.findBySource(type, sourceId);
  } catch {
    return null;
  }
}

/** Make a note. `{ ok: false, reason: "full" }` when the notebook holds 200; a database failure is `reason: "error"`. */
export async function createNote(input: NewNote = {}): Promise<CreateResult | { ok: false; reason: "error" }> {
  try {
    const result = await store.create(input, Date.now());
    if (result.ok) changed();
    return result;
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Save a note's title and body. Never rejects; `false` when it was not saved. */
export async function saveNote(id: string, fields: { title: string; body: string }): Promise<boolean> {
  try {
    const saved = await store.save(id, fields, Date.now());
    if (saved) changed();
    return saved;
  } catch {
    return false;
  }
}

export async function deleteNote(id: string): Promise<boolean> {
  try {
    const removed = await store.remove(id, Date.now());
    if (removed) changed();
    return removed;
  } catch {
    return false;
  }
}

/**
 * Clip something into the notebook: the note that already holds it when there is one, else a new note with the
 * quoted line filled in. Returns the note's id to open, or why it could not be made.
 */
export async function clipToNotes(input: { type: NoteSource; id: string; title: string; snippet: string }): Promise<{ ok: true; id: string } | { ok: false; reason: "full" | "error" }> {
  const existing = await findNoteBySource(input.type, input.id);
  if (existing) return { ok: true, id: existing.id };
  const made = await createNote({ title: input.title, source: { type: input.type, id: input.id, snippet: input.snippet } });
  return made.ok ? { ok: true, id: made.note.id } : { ok: false, reason: made.reason };
}
