/**
 * The unit's teacher as a banner that opens the Meet sheet. Renders nothing until the teacher
 * loads, so a unit without one (or a slow load) just has no banner. The sheet lists the unit's
 * lessons under "Teaches". A locked unit shows the teacher muted.
 */

import { useEffect, useState } from "react";

import { contentRepository } from "@/services/content-db";

import { MeetSheet } from "./MeetSheet";
import { TeacherBanner } from "./TeacherBanner";
import { useNpcForUnit } from "./use-npc";

export function UnitTeacher({ unitId, locked = false }: { unitId: string; locked?: boolean }) {
  const npc = useNpcForUnit(unitId);
  const [open, setOpen] = useState(false);
  const [titles, setTitles] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void contentRepository
      .getLessons(unitId)
      .then((lessons) => alive && setTitles(lessons.map((l) => l.title)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [open, unitId]);

  if (!npc) return null;
  return (
    <>
      <TeacherBanner npc={npc} locked={locked} onPress={() => setOpen(true)} />
      <MeetSheet npc={npc} visible={open} lessons={titles} locked={locked} onClose={() => setOpen(false)} />
    </>
  );
}
