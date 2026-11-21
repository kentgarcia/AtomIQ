/**
 * Errors of the content source toolchain. A SourceError points at a place in a file (`file:line: message`);
 * parse and sync report every problem this way so a person (or an agent) can go straight to it.
 */
export class SourceError extends Error {
  /** @param {string} message @param {{ file?: string, line?: number, hint?: string }} [where] */
  constructor(message, where = {}) {
    super(message);
    this.name = "SourceError";
    this.file = where.file ?? null;
    this.line = where.line ?? null;
    this.hint = where.hint ?? null;
  }

  /** `file:line: message` (the parts that are known). */
  format() {
    const at = this.file ? `${this.file}${this.line ? `:${this.line}` : ""}: ` : "";
    return `${at}${this.message}`;
  }
}

/** Throw a SourceError for an AST node (record or entry) that carries a `line`. */
export function failAt(file, node, message) {
  throw new SourceError(message, { file, line: node?.line ?? null });
}
