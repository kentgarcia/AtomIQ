/**
 * Core format v1: text -> AST. See docs/features/CONTENT_SOURCE_SPEC.md section 4.
 *
 * Lines are one of: a comment (`# ...`), blank, an attribute (`key: value`), a block attribute
 * (`key:` and the indented lines right under it), a record header (`keyword id [id...]`) or an
 * indented line, which belongs to the block above it (or is the record body after a blank line).
 * Prose is always indented and structure never is, so prose needs no escaping.
 *
 * The parser is generic: it knows no adapter. Nothing unrecognised is ignored.
 *
 * AST:
 *   { file, format, adapter: { name, version }, comments, scope: Entry[], records: Record[], trailing }
 *   Record { keyword, ids: string[], line, comments: string[], entries: Entry[] }
 *   Entry  { key: string | null (the body), value: string, lines: string[] | null (a block), line, comments: string[] }
 */
import { SourceError } from "./errors.mjs";

export const CORE_FORMAT = 1;
export const INDENT = "    ";
export const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

const isBlank = (s) => s === "";
const isIndented = (s) => s.startsWith(" ");

/** @returns {{ key: string, value: string } | null} a `key: value` line, or null when it is a record header. */
function asEntry(line) {
  const sp = line.indexOf(" ");
  const token = sp === -1 ? line : line.slice(0, sp);
  if (token.length < 2 || !token.endsWith(":")) return null;
  return { key: token.slice(0, -1), value: sp === -1 ? "" : line.slice(sp + 1) };
}

/**
 * @param {string} text
 * @param {{ file?: string }} [opts]
 */
export function parseSource(text, { file = "<source>" } = {}) {
  const fail = (line, message, hint) => {
    throw new SourceError(message, { file, line, hint });
  };
  if (text.charCodeAt(0) === 0xfeff) fail(1, "the file starts with a byte order mark (BOM); save it as plain UTF-8");
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") lines.pop(); // the final newline
  lines.forEach((l, i) => {
    if (l.includes("\r")) fail(i + 1, "a carriage return (CRLF line ending); the format is LF only");
    if (l.includes("\t")) fail(i + 1, "a tab; indent with spaces");
    if (l !== "" && /\s$/.test(l)) fail(i + 1, "trailing whitespace");
  });

  let i = 0;
  let pending = [];
  const takeComments = () => {
    const c = pending;
    pending = [];
    return c;
  };
  const skipBlankAndComments = () => {
    while (i < lines.length && (isBlank(lines[i]) || lines[i].startsWith("#"))) {
      if (lines[i].startsWith("#")) pending.push(lines[i].slice(1).replace(/^ /, ""));
      i++;
    }
  };

  // --- header: format, adapter -------------------------------------------------------------------------------------------------------------
  skipBlankAndComments();
  const headComments = takeComments();
  const fm = /^format (\d+)$/.exec(lines[i] ?? "");
  if (!fm) fail(i + 1, 'the first line must be "format 1"');
  const format = Number(fm[1]);
  if (format !== CORE_FORMAT) fail(i + 1, `unknown format ${format}: this toolchain reads format ${CORE_FORMAT}`);
  i++;
  skipBlankAndComments();
  const am = /^adapter (\S+) (\d+)$/.exec(lines[i] ?? "");
  if (!am) fail(i + 1, 'the second line must be "adapter <name> <version>"');
  const adapter = { name: am[1], version: Number(am[2]) };
  const adapterLine = i + 1;
  i++;

  const ast = { file, format, adapter, adapterLine, comments: headComments, scope: [], records: [], trailing: [] };
  let cur = null;

  /** Collect the run of indented and blank lines starting at `from`; returns the stripped lines (trailing blanks dropped). */
  const collectRun = (from) => {
    let j = from;
    const out = [];
    while (j < lines.length && (isBlank(lines[j]) || isIndented(lines[j]))) {
      const l = lines[j];
      if (!isBlank(l) && !l.startsWith(INDENT)) fail(j + 1, "indent prose with exactly 4 spaces");
      out.push(isBlank(l) ? "" : l.slice(INDENT.length));
      j++;
    }
    let end = out.length;
    while (end > 0 && out[end - 1] === "") end--;
    // lines of `lines` actually consumed: up to the last nonblank one
    return { lines: out.slice(0, end), next: from + end };
  };

  while (true) {
    skipBlankAndComments();
    if (i >= lines.length) break;
    const line = lines[i];
    if (isIndented(line)) fail(i + 1, "an indented line with no block above it", "a record body goes after a blank line; a block goes right under its `key:` line");
    const entry = asEntry(line);
    const here = i + 1;
    if (!entry) {
      // a record header: keyword id [id...]
      const parts = line.split(" ");
      if (parts.some((p) => p === "")) fail(here, "extra spaces in a record header");
      const [keyword, ...ids] = parts;
      if (!/^[a-z][a-z0-9_]*$/.test(keyword)) fail(here, `"${keyword}" is not a record keyword (a record header is: keyword id...)`);
      if (ids.length === 0) fail(here, `the ${keyword} record has no id`);
      for (const id of ids) if (!ID_PATTERN.test(id)) fail(here, `"${id}" is not a valid id (letters, digits and . _ / - only)`);
      cur = { keyword, ids, line: here, comments: takeComments(), entries: [] };
      ast.records.push(cur);
      i++;
    } else {
      const { key, value } = entry;
      if (value !== "" && /^\s|\s$/.test(value)) fail(here, `extra space after "${key}:"`);
      const e = { key, value, lines: null, line: here, comments: takeComments() };
      i++;
      if (value === "" && i < lines.length && isIndented(lines[i])) {
        const run = collectRun(i);
        e.lines = run.lines;
        i = run.next;
      }
      (cur ? cur.entries : ast.scope).push(e);
    }

    // An indented run after a blank line is the record body.
    let j = i;
    while (j < lines.length && isBlank(lines[j])) j++;
    if (j > i && j < lines.length && isIndented(lines[j])) {
      if (!cur) fail(j + 1, "a body outside a record");
      if (cur.entries.some((x) => x.key === null)) fail(j + 1, `the ${cur.keyword} ${cur.ids.join(" ")} record has two bodies`);
      const run = collectRun(j);
      cur.entries.push({ key: null, value: "", lines: run.lines, line: j + 1, comments: takeComments() });
      i = run.next;
    } else if (j === i && j < lines.length && isIndented(lines[j])) {
      fail(j + 1, "an indented line with no block above it", "a record body goes after a blank line; a block goes right under a `key:` line");
    }
  }
  ast.trailing = takeComments();
  return ast;
}
