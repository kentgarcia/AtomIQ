/**
 * Which existing test scripts read the master DB for a given table, so an edit runs only the gates
 * that can fail because of it. `validate:content`'s own rules already run inside every store save,
 * so they are not listed. Tables that are not here only need that validation.
 */
export const CHECKS_BY_TABLE = {
  npcs: ["test:voice"],
  npc_lines: ["test:voice"],
  chat_nodes: ["test:chats", "test:voice"],
  feed_templates: ["test:feed", "test:voice"],
  blog_posts: ["test:feed", "test:voice"],
  blog_comments: ["test:feed", "test:voice"],
  blog_references: ["test:feed"],
  scan_targets: ["test:scanner"],
  scan_target_references: ["test:scanner"],
  safety_cards: ["test:safety"],
  safety_card_references: ["test:safety"],
  map_sites: ["test:map"],
  map_site_references: ["test:map"],
  mythbuster_questions: ["test:content"],
  myths: ["test:content"],
  encyclopedia_entries: ["test:content"],
  units: ["test:content"],
  unit_statements: ["test:content"],
  objectives: ["test:content"],
  lessons: ["test:content"],
  path_nodes: ["test:content"],
  items: ["test:content"],
  lesson_cards: ["test:content"],
  content_references: ["test:content"],
};

/** @param {Iterable<string>} tables @returns {string[]} npm script names, each once */
export function checksFor(tables) {
  const out = new Set();
  for (const t of tables) for (const c of CHECKS_BY_TABLE[t] ?? []) out.add(c);
  return [...out];
}
