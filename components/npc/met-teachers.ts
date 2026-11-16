/**
 * Whether the learner has been introduced to a teacher (the introduction page before their first
 * lesson). `null` while it loads, so nothing flashes in and out.
 */

import { useEffect, useState } from "react";

import { getMetTeachers } from "@/services/storage";

export function useTeacherMet(npcId: string | null | undefined): boolean | null {
  const [met, setMet] = useState<boolean | null>(null);
  useEffect(() => {
    if (!npcId) return;
    let alive = true;
    void getMetTeachers()
      .then((ids) => alive && setMet(ids.includes(npcId)))
      .catch(() => alive && setMet(true));
    return () => {
      alive = false;
    };
  }, [npcId]);
  return npcId ? met : null;
}
