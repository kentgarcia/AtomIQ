/**
 * Readers of OLD versions of the format (spec section 10). When the canonical form of the core or of an adapter changes,
 * the version number goes up, the previous reader stays here, and `content:migrate` reads each file with the reader its
 * header names and writes it with the current writer. Old golden files stay in scripts/golden/content-source so every
 * released version is still read and tested (T8).
 *
 * Today there is one version of everything, so the only reader is the current one.
 */
import { parseSource } from "../core/parse.mjs";

/** @returns {(text: string, opts: { file: string }) => object} a parser for files of this core format. */
export function parserFor(format) {
  if (format === 1) return parseSource;
  throw new Error(`No reader for format ${format}: it is not in scripts/lib/content-source/readers/`);
}

/** The core format number a file declares (its first `format N` line), without parsing the rest. */
export function formatOf(text) {
  const m = /^(?:#.*\n|\n)*format (\d+)\n/.exec(text);
  if (!m) throw new Error('the file does not start with "format N"');
  return Number(m[1]);
}
