/**
 * Core format v1: AST -> canonical text (spec section 4.4). The one canonical text of an AST:
 * header, scope, then records separated by one blank line; blocks and bodies sit between blank lines;
 * comments are written before the thing they were attached to; LF only, one final newline.
 */
import { CORE_FORMAT, INDENT } from "./parse.mjs";

const commentLines = (c) => (c ?? []).map((t) => (t === "" ? "#" : `# ${t}`));

/** @param {{ comments?: string[], adapter: {name:string,version:number}, scope?: any[], records?: any[], trailing?: string[] }} ast */
export function writeSource(ast) {
  const out = [];
  const blank = () => {
    if (out.length && out[out.length - 1] !== "") out.push("");
  };
  const entry = (e) => {
    out.push(...commentLines(e.comments));
    const block = e.lines !== null && e.lines !== undefined;
    if (e.key === null) {
      blank();
      for (const l of e.lines) out.push(l === "" ? "" : INDENT + l);
      blank();
    } else if (block) {
      blank();
      out.push(`${e.key}:`);
      for (const l of e.lines) out.push(l === "" ? "" : INDENT + l);
      blank();
    } else {
      out.push(e.value === "" ? `${e.key}:` : `${e.key}: ${e.value}`);
    }
  };

  out.push(...commentLines(ast.comments));
  out.push(`format ${CORE_FORMAT}`);
  out.push(`adapter ${ast.adapter.name} ${ast.adapter.version}`);
  for (const e of ast.scope ?? []) entry(e);
  for (const r of ast.records ?? []) {
    blank();
    out.push(...commentLines(r.comments));
    out.push([r.keyword, ...r.ids].join(" "));
    for (const e of r.entries) entry(e);
  }
  if (ast.trailing?.length) {
    blank();
    out.push(...commentLines(ast.trailing));
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  return out.join("\n") + "\n";
}
