import { useEffect, useState } from "react";

import { findNoteBySource, listNotes, subscribeNotes, type Note, type NoteSource } from "@/services/field-notes";

/** The notes (most recently changed first, filtered by `query`), kept current as notes change. */
export function useFieldNotes(query = ""): { notes: Note[]; loaded: boolean } {
  const [state, setState] = useState<{ notes: Note[]; loaded: boolean }>({ notes: [], loaded: false });
  useEffect(() => {
    let alive = true;
    const load = () =>
      void listNotes(query).then((notes) => {
        if (alive) setState({ notes, loaded: true });
      });
    load();
    const stop = subscribeNotes(load);
    return () => {
      alive = false;
      stop();
    };
  }, [query]);
  return state;
}

/** The id of the note a source was clipped into, or null; follows changes. */
export function useClippedNoteId(type: NoteSource, sourceId: string | undefined): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (!sourceId) return;
    let alive = true;
    const load = () =>
      void findNoteBySource(type, sourceId).then((n) => {
        if (alive) setId(n?.id ?? null);
      });
    load();
    const stop = subscribeNotes(load);
    return () => {
      alive = false;
      stop();
    };
  }, [type, sourceId]);
  return id;
}
