/**
 * Row → domain-object mapping for the curriculum tables.
 *
 * Framework-free (no expo imports, erasable syntax only) so the repository in
 * services/content-db.ts and the Node tests share one implementation.
 */

import type {
  CardKind,
  CardTier,
  Item,
  ItemSurface,
  ItemType,
  Lesson,
  LessonCard,
  LessonContent,
  Objective,
  PathNode,
  PathNodeConfig,
  PathNodeKind,
  Reference,
  ReferenceKind,
  ResolvedCard,
  Unit,
  UnitTone,
} from "./types";

export interface UnitRow {
  id: string;
  position: number;
  title: string;
  subtitle: string;
  description: string;
  goal: string;
  guidebook: string;
  icon: string;
  tone: string;
  teacher_npc_id?: string | null;
}

export interface ObjectiveRow {
  id: string;
  unit_id: string;
  position: number;
  statement: string;
  misconception: string | null;
}

export interface LessonRow {
  id: string;
  unit_id: string;
  title: string;
  description: string;
  estimated_minutes: number;
  xp_reward: number;
  teaches: string;
  relies_on: string;
}

export interface PathNodeRow {
  id: string;
  unit_id: string;
  position: number;
  kind: string;
  lesson_id: string | null;
  config: string;
}

export interface ItemRow {
  id: string;
  objective_id: string;
  type: string;
  data: string;
  difficulty: number;
  surfaces: string;
  reference_ids: string;
}

export interface LessonCardRow {
  lesson_id: string;
  id: string;
  position: number;
  kind: string;
  type: string;
  tier: string;
  item_id: string | null;
  scored: number;
  data: string;
}

export interface ReferenceRow {
  id: string;
  kind: string;
  publisher: string;
  title: string;
  authors: string;
  year: string;
  url: string;
  accessed: string;
  verified: number;
  note: string;
}

export interface LessonReferenceRow extends ReferenceRow {
  supports: string;
}

/** Parse a JSON column; anything unreadable becomes the fallback. */
export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw === null || raw === undefined || raw === "") return fallback;
  try {
    const value = JSON.parse(raw) as unknown;
    return (value ?? fallback) as T;
  } catch {
    return fallback;
  }
}

const asArray = (raw: string | null | undefined): string[] => {
  const v = parseJson<unknown>(raw, []);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
};

const asRecord = (raw: string | null | undefined): Record<string, unknown> => {
  const v = parseJson<unknown>(raw, {});
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
};

export function mapUnit(row: UnitRow): Unit {
  const guide = asRecord(row.guidebook);
  return {
    id: row.id,
    position: row.position,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    goal: row.goal,
    guidebook: {
      ...(typeof guide.summary === "string" ? { summary: guide.summary } : {}),
      ...(Array.isArray(guide.termIds) ? { termIds: guide.termIds.filter((x): x is string => typeof x === "string") } : {}),
    },
    icon: row.icon,
    tone: row.tone as UnitTone,
    ...(row.teacher_npc_id ? { teacherNpcId: row.teacher_npc_id } : {}),
  };
}

export function mapObjective(row: ObjectiveRow): Objective {
  return {
    id: row.id,
    unitId: row.unit_id,
    position: row.position,
    statement: row.statement,
    ...(row.misconception ? { misconception: row.misconception } : {}),
  };
}

export function mapLesson(row: LessonRow): Lesson {
  return {
    id: row.id,
    unitId: row.unit_id,
    title: row.title,
    description: row.description,
    estimatedMinutes: row.estimated_minutes,
    xpReward: row.xp_reward,
    teaches: asArray(row.teaches),
    reliesOn: asArray(row.relies_on),
  };
}

export function mapPathNode(row: PathNodeRow): PathNode {
  return {
    id: row.id,
    unitId: row.unit_id,
    position: row.position,
    kind: row.kind as PathNodeKind,
    ...(row.lesson_id ? { lessonId: row.lesson_id } : {}),
    config: asRecord(row.config) as PathNodeConfig,
  };
}

export function mapItem(row: ItemRow): Item {
  return {
    id: row.id,
    objectiveId: row.objective_id,
    type: row.type as ItemType,
    data: asRecord(row.data),
    difficulty: Math.min(3, Math.max(1, row.difficulty)) as 1 | 2 | 3,
    surfaces: asArray(row.surfaces) as ItemSurface[],
    referenceIds: asArray(row.reference_ids),
  };
}

export function mapReference(row: ReferenceRow): Reference {
  return {
    id: row.id,
    kind: row.kind as ReferenceKind,
    publisher: row.publisher,
    title: row.title,
    authors: row.authors,
    year: row.year,
    url: row.url,
    accessed: row.accessed,
    verified: row.verified === 1,
    note: row.note,
  };
}

export function mapCard(row: LessonCardRow): LessonCard {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    position: row.position,
    kind: row.kind as CardKind,
    type: row.type,
    tier: row.tier as CardTier,
    ...(row.item_id ? { itemId: row.item_id } : {}),
    scored: row.scored === 1,
    data: asRecord(row.data),
  };
}

/** Assemble a playable lesson: ordered cards with their bank items attached. */
export function buildLessonContent(
  lessonRow: LessonRow,
  cardRows: LessonCardRow[],
  itemRows: ItemRow[],
  referenceRows: LessonReferenceRow[],
): LessonContent {
  const items = new Map(itemRows.map((r) => [r.id, mapItem(r)]));
  const cards: ResolvedCard[] = [...cardRows]
    .sort((a, b) => a.position - b.position)
    .map((row) => {
      const card = mapCard(row);
      const item = card.itemId ? items.get(card.itemId) : undefined;
      return item ? { ...card, item } : card;
    });
  return {
    lesson: mapLesson(lessonRow),
    cards,
    references: referenceRows.map((r) => ({ ...mapReference(r), supports: r.supports })),
  };
}
