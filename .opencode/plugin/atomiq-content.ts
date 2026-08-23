// AtomIQ Content Studio — OpenCode plugin.
//
// Exposes the content database to the agent as first-class tools, so it can
// fact-check and generate AtomIQ content directly:
//
//   atomiq_content_search  – search any table by keyword (read-only)
//   atomiq_content_sql     – run read-only SQL (SELECT / WITH / PRAGMA)
//   atomiq_content_write   – insert or update a row (used for generated content)
//
// Requires the studio server: npm run content-studio  (default port 8787,
// override with ATOMIQ_STUDIO_URL).

import { tool } from "@opencode-ai/plugin"

const BASE = process.env.ATOMIQ_STUDIO_URL ?? "http://127.0.0.1:8787"

async function call(path: string, init?: RequestInit) {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
      body: init?.body != null ? JSON.stringify(init.body) : undefined,
    })
  } catch {
    throw new Error(
      `Cannot reach AtomIQ Content Studio at ${BASE}. Start it with: npm run content-studio`,
    )
  }
  const data = (await res.json().catch(() => ({}))) as any
  if (!res.ok) throw new Error(data?.error ?? res.statusText)
  return data
}

export const atomiqContentSearch = tool({
  description:
    "Search rows in an AtomIQ content database table (lessons, quizzes, quiz_questions, mythbuster_questions, myths, mazes, maze_rooms, encyclopedia_entries, articles, posts) by keyword. Read-only.",
  args: {
    table: tool.schema.string().describe("Table name"),
    query: tool.schema.string().describe("Keyword to search for"),
    limit: tool.schema.number().optional().describe("Max rows (default 10)"),
  },
  async execute(args) {
    const data = await call(
      `/api/rows/${args.table}?limit=${args.limit ?? 10}&q=${encodeURIComponent(args.query)}`,
    )
    return JSON.stringify(data.rows, null, 2)
  },
})

export const atomiqContentSql = tool({
  description:
    "Run a READ-ONLY SQL query (SELECT / WITH / PRAGMA only) against the AtomIQ content database.",
  args: {
    sql: tool.schema.string().describe("SQL statement to run"),
  },
  async execute({ sql }) {
    const data = await call("/api/query", { method: "POST", body: { sql } })
    return JSON.stringify(data.rows, null, 2)
  },
})

export const atomiqContentWrite = tool({
  description:
    "Insert or update a row in the AtomIQ content database. For updates, pass pk as {\"col\": value}; values must be JSON-serializable. After writing content, remind the user to press 'Bump version' or call POST /api/bump-version so the app picks up changes.",
  args: {
    table: tool.schema.string().describe("Table name"),
    row: tool.schema.string().describe("Row object as JSON string (column -> value); JSON fields must be valid JSON strings"),
    pk: tool.schema.string().optional().describe('For updates: primary key as JSON string, e.g. {"id":"myth-x"}'),
  },
  async execute({ table, row, pk }) {
    const parsed = JSON.parse(row)
    if (pk) {
      const keyParts = Object.values(JSON.parse(pk)).map(encodeURIComponent).join("~")
      const data = await call(`/api/rows/${table}/${keyParts}`, { method: "PUT", body: parsed })
      return `Updated:\n${JSON.stringify(data.row, null, 2)}`
    }
    const data = await call(`/api/rows/${table}`, { method: "POST", body: parsed })
    return `Inserted:\n${JSON.stringify(data.row, null, 2)}`
  },
})
