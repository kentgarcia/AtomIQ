/**
 * Value types (spec 4.3). A column's type is declared by the adapter and never guessed from a value:
 *   (a list is never null: no `key:` lines at all means an empty list)
 *   text   inline `key: value` when it fits on a line, else an indented block; both read back as a string
 *   prose  always an indented block (or the record body)
 *   int, num, id, json, list (one `key: item` line per string), jsonl (a block, one JSON value per line)
 * A null is an absent attribute; an empty string is `key:` with nothing after it.
 *
 * `encodeValue(field, value)` returns the Entry list for the attribute (or [] for null) and throws a
 * plain Error when the value cannot be written losslessly (the caller adds the table and id).
 * `decodeValue(field, entries)` is the inverse and throws SourceError-compatible `{ message, entry }` errors.
 */
import { ID_PATTERN } from "./parse.mjs";

export const INLINE_MAX = 120;
export const JSON_INLINE_MAX = 100;

const entry = (key, value, lines = null) => ({ key, value, lines, line: null, comments: [] });

/** Throw unless a string can be a block of lines (no edge newlines, no trailing spaces, no tabs, no CR). */
function proseLines(s, what) {
  if (/[\t\r]/.test(s)) throw new Error(`${what} contains a tab or carriage return`);
  const lines = s.split("\n");
  if (lines[0] === "" || lines[lines.length - 1] === "") throw new Error(`${what} starts or ends with a newline`);
  for (const l of lines) if (/\s$/.test(l)) throw new Error(`${what} has trailing whitespace on a line`);
  return lines;
}

const inlineOk = (s) => s.length <= INLINE_MAX && !s.includes("\n") && !/^\s|\s$/.test(s) && !/[\t\r]/.test(s);

function encodeText(key, s, field) {
  if (typeof s !== "string") throw new Error(`${field.col} is ${typeof s}, expected a string`);
  if (s === "") return [entry(key, "")];
  if (field.type !== "prose" && !field.body && inlineOk(s)) return [entry(key, s)];
  return [entry(key, "", proseLines(s, field.col))];
}

function textOf(e, field) {
  if (e.lines) return e.lines.join("\n");
  return e.value;
}

const INT_RE = /^-?\d+$/;
const NUM_RE = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

/** The compact JSON of a value on one line. */
const compact = (v) => JSON.stringify(v);

/**
 * @param {{ col: string, type: string, key?: string, body?: boolean }} field
 * @returns {object[]} entries (key null for a body)
 */
export function encodeValue(field, value) {
  const key = field.body ? null : (field.key ?? field.col);
  if (value === null || value === undefined) return [];
  switch (field.type) {
    case "text":
    case "prose":
    case "id": {
      if (field.type === "id" && !ID_PATTERN.test(String(value))) throw new Error(`${field.col} "${value}" is not a valid id`);
      if (field.body) {
        if (typeof value !== "string") throw new Error(`${field.col} is ${typeof value}, expected a string`);
        return [entry(null, "", proseLines(value, field.col))];
      }
      return encodeText(key, value, field);
    }
    case "int":
      if (!Number.isInteger(value)) throw new Error(`${field.col} is ${JSON.stringify(value)}, expected an integer`);
      return [entry(key, String(value))];
    case "num":
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${field.col} is ${JSON.stringify(value)}, expected a number`);
      return [entry(key, String(value))];
    case "json": {
      const one = compact(value);
      if (one === undefined) throw new Error(`${field.col} cannot be written as JSON`);
      if (one.length <= JSON_INLINE_MAX) return [entry(key, one)];
      return [entry(key, "", JSON.stringify(value, null, 2).split("\n"))];
    }
    case "list": {
      if (!Array.isArray(value)) throw new Error(`${field.col} is not a list`);
      return value.map((item) => {
        if (typeof item !== "string") throw new Error(`${field.col} has a non-string item`);
        if (item !== "" && !inlineOk(item)) throw new Error(`${field.col} item "${item.slice(0, 30)}..." does not fit on one line (use a jsonl field)`);
        return entry(key, item);
      });
    }
    case "jsonl": {
      if (!Array.isArray(value)) throw new Error(`${field.col} is not a list`);
      if (value.length === 0) return [entry(key, "")]; // `key:` alone is an empty list; an absent key is null
      return [entry(key, "", value.map((v) => compact(v)))];
    }
    default:
      throw new Error(`unknown value type "${field.type}" for ${field.col}`);
  }
}

/**
 * @param {object[]} entries the entries of this attribute (zero or more)
 * @returns {{ value: unknown } | { absent: true }}
 */
export function decodeValue(field, entries) {
  if (entries.length === 0) return { absent: true };
  const bad = (message, e = entries[0]) => Object.assign(new Error(message), { entry: e });
  const one = () => {
    if (entries.length > 1) throw bad(`"${field.key ?? field.col}" is given twice`, entries[1]);
    return entries[0];
  };
  switch (field.type) {
    case "text":
    case "prose":
    case "id": {
      const e = one();
      const s = textOf(e, field);
      if (field.type === "id" && !ID_PATTERN.test(s)) throw bad(`"${s}" is not a valid id`);
      return { value: s };
    }
    case "int": {
      const e = one();
      if (e.lines || !INT_RE.test(e.value)) throw bad(`"${e.value}" is not an integer`);
      return { value: Number(e.value) };
    }
    case "num": {
      const e = one();
      if (e.lines || !NUM_RE.test(e.value)) throw bad(`"${e.value}" is not a number`);
      return { value: Number(e.value) };
    }
    case "json": {
      const e = one();
      const src = e.lines ? e.lines.join("\n") : e.value;
      try {
        return { value: JSON.parse(src) };
      } catch (err) {
        throw bad(`invalid JSON: ${err.message}`);
      }
    }
    case "list": {
      for (const e of entries) if (e.lines) throw bad(`"${field.key ?? field.col}" items are single lines`, e);
      return { value: entries.map((e) => e.value) };
    }
    case "jsonl": {
      const e = one();
      if (!e.lines) {
        if (e.value === "") return { value: [] };
        throw bad(`"${field.key ?? field.col}" is a block with one JSON value per line`);
      }
      return {
        value: e.lines.map((l) => {
          try {
            return JSON.parse(l);
          } catch (err) {
            throw bad(`invalid JSON line: ${err.message}`);
          }
        }),
      };
    }
    default:
      throw bad(`unknown value type "${field.type}"`);
  }
}

/** Structural equality of two row values (objects compared without regard to key order, as the DB does for JSON). */
export function sameValue(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => sameValue(x, b[i]));
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => k in b && sameValue(a[k], b[k]));
}
