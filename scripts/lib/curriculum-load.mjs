/**
 * Loading authored curriculum modules into a database (shared by the cutover
 * script and the content tests). Keep the authoring format in sync with
 * scripts/content-migration/curriculum/unit-*.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const MIGRATION_DIR = path.resolve(HERE, "..", "content-migration");
export const UNIT_FILES = ["unit-1.mjs"];

const json = (v) => JSON.stringify(v);

export function curriculumDdl() {
  const sql = fs.readFileSync(path.join(MIGRATION_DIR, "schema.sql"), "utf8");
  const a = sql.indexOf("-- BEGIN curriculum-v2");
  const b = sql.indexOf("-- END curriculum-v2");
  if (a < 0 || b < 0) throw new Error("schema.sql is missing the curriculum-v2 markers");
  return sql.slice(a, b);
}

/** The `npcs` block of schema.sql (teachers and their lines). */
export function npcsDdl() {
  const sql = fs.readFileSync(path.join(MIGRATION_DIR, "schema.sql"), "utf8");
  const a = sql.indexOf("-- BEGIN npcs");
  const b = sql.indexOf("-- END npcs");
  if (a < 0 || b < 0) throw new Error("schema.sql is missing the npcs markers");
  return sql.slice(a, b);
}

/** Seed the cast from components/npc/npc-roster.ts and point each existing unit at its teacher. */
export async function seedNpcs(db) {
  const { NPC_ROSTER, NPC_LINES } = await import(pathToFileURL(path.resolve(HERE, "..", "..", "components", "npc", "npc-roster.ts")).href);
  for (const n of NPC_ROSTER) db.prepare("INSERT INTO npcs (id, name, title, field, bio, spec, position) VALUES (?,?,?,?,?,?,?)").run(n.id, n.name, n.title, n.field, n.bio, JSON.stringify(n.spec), n.position);
  const lessons = new Set(db.prepare("SELECT id FROM lessons").all().map((r) => r.id));
  for (const l of NPC_LINES) if (!l.lessonId || lessons.has(l.lessonId)) db.prepare("INSERT INTO npc_lines (id, npc_id, kind, lesson_id, journey_id, text, pose) VALUES (?,?,?,?,?,?,?)").run(l.id, l.npcId, l.kind, l.lessonId ?? null, l.journeyId ?? null, l.text, l.pose);
  for (const n of NPC_ROSTER) db.prepare("UPDATE units SET teacher_npc_id = ? WHERE id = ?").run(n.id, n.unitId);
}

/** Import every authored unit module. */
export async function loadUnitModules(files = UNIT_FILES) {
  const out = [];
  for (const file of files) out.push(await import(pathToFileURL(path.join(MIGRATION_DIR, "curriculum", file)).href));
  return out;
}

export function insertUnit(db, mod) {
  const ins = (sql, ...params) => db.prepare(sql).run(...params);
  const u = mod.unit;
  ins("INSERT INTO units (id, position, title, subtitle, description, goal, guidebook, icon, tone) VALUES (?,?,?,?,?,?,?,?,?)", u.id, u.position, u.title, u.subtitle, u.description, u.goal, json(u.guidebook), u.icon, u.tone);
  for (const o of mod.objectives) ins("INSERT INTO objectives (id, unit_id, position, statement, misconception) VALUES (?,?,?,?,?)", o.id, o.unitId, o.position, o.statement, o.misconception ?? null);
  for (const r of mod.references) {
    ins("INSERT OR REPLACE INTO content_references (id, kind, publisher, title, authors, year, url, accessed, verified, note) VALUES (?,?,?,?,?,?,?,?,?,?)", r.id, r.kind, r.publisher, r.title, r.authors ?? "", r.year ?? "", r.url ?? "", r.accessed ?? "", r.verified ? 1 : 0, r.note ?? "");
  }
  mod.unitReferenceIds.forEach((id, i) => ins("INSERT INTO unit_references (unit_id, reference_id, position) VALUES (?,?,?)", u.id, id, i));
  for (const l of mod.lessons) {
    const L = l.lesson;
    ins("INSERT INTO lessons (id, unit_id, title, description, estimated_minutes, xp_reward, teaches, relies_on) VALUES (?,?,?,?,?,?,?,?)", L.id, L.unitId, L.title, L.description, L.estimatedMinutes, L.xpReward, json(L.teaches), json(L.reliesOn));
  }
  for (const n of mod.pathNodes) ins("INSERT INTO path_nodes (id, unit_id, position, kind, lesson_id, config) VALUES (?,?,?,?,?,?)", n.id, n.unitId, n.position, n.kind, n.lessonId ?? null, json(n.config));
  for (const it of mod.itemBank) ins("INSERT INTO items (id, objective_id, type, data, difficulty, surfaces, reference_ids) VALUES (?,?,?,?,?,?,?)", it.id, it.objectiveId, it.type, json(it.data), it.difficulty, json(it.surfaces), json(it.referenceIds));
  for (const l of mod.lessons) {
    l.cards.forEach((c, position) => {
      ins("INSERT INTO lesson_cards (lesson_id, id, position, kind, type, tier, item_id, scored, data) VALUES (?,?,?,?,?,?,?,?,?)", l.lesson.id, c.id, position, c.kind, c.type, c.tier, c.itemId ?? null, c.scored ? 1 : 0, json(c.data));
    });
    l.references.forEach((r, i) => ins("INSERT INTO lesson_references (lesson_id, reference_id, supports, position) VALUES (?,?,?,?)", l.lesson.id, r.referenceId, r.supports, i));
  }
}
