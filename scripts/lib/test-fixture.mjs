/**
 * Test helper: a throwaway repo layout (master DB copy + version constants) so
 * tests can run the real content tooling without touching real content.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { REPO_ROOT, makePaths } from "./content-paths.mjs";

export function makeFixture({ constants = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "atomiq-fixture-"));
  const paths = makePaths(root);
  fs.mkdirSync(path.dirname(paths.master), { recursive: true });
  fs.mkdirSync(path.dirname(paths.tsFile), { recursive: true });

  // Consistent copy of the real master (it is usually in WAL mode).
  const src = new DatabaseSync(path.join(REPO_ROOT, "content", "database", "content.db"), { readOnly: true });
  try {
    src.exec(`VACUUM INTO '${paths.master.replace(/'/g, "''")}'`);
  } finally {
    src.close();
  }
  if (constants) {
    fs.writeFileSync(
      paths.tsFile,
      'export const CONTENT_DB_VERSION = "0.0.0+draft.000000";\nexport const CONTENT_SCHEMA_VERSION = 2;\n',
    );
  }
  return {
    paths,
    root,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

/** Run SQL against the fixture master. */
export function sql(paths, statement, ...params) {
  const db = new DatabaseSync(paths.master);
  try {
    return db.prepare(statement).run(...params);
  } finally {
    db.close();
  }
}

export function query(paths, statement, ...params) {
  const db = new DatabaseSync(paths.master, { readOnly: true });
  try {
    return db.prepare(statement).all(...params);
  } finally {
    db.close();
  }
}

export const noChecks = () => {};
