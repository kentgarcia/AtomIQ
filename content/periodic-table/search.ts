/**
 * Periodic table search rules, framework-free so `test:periodic` can run them in Node.
 *
 * A short query is a prefix, not a substring: "n" is N, Na, Ne, Ni... and the names that start with
 * it, not every element with an n somewhere in its name. From three letters on the name may match
 * anywhere ("oxy", "ium"). Spellings people use that differ from the table's ("aluminium",
 * "sulphur", "caesium") match too, and so do digits (the atomic number).
 */

import type { ElementCategory, PeriodicElement } from "./elements";

/** Alternate spellings and isotope names, by lowercase word, to the element's symbol. */
export const ALIASES: Record<string, string> = {
  aluminium: "Al",
  caesium: "Cs",
  sulphur: "S",
  deuterium: "H",
  tritium: "H",
  protium: "H",
};

/** The shortest query that may match in the middle of a name or an alias. */
export const SUBSTRING_MIN = 3;

export interface ElementFilter {
  query?: string;
  category?: ElementCategory | null;
}

export const matchesQuery = (element: PeriodicElement, rawQuery: string): boolean => {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  if (/^\d+$/.test(query)) return element.atomicNumber === Number(query);

  const name = element.name.toLowerCase();
  if (name.startsWith(query)) return true;
  if (query.length >= SUBSTRING_MIN && name.includes(query)) return true;

  const symbol = element.symbol.toLowerCase();
  if (query.length <= 3 && symbol.startsWith(query)) return true;

  for (const [alias, target] of Object.entries(ALIASES)) {
    if (target !== element.symbol) continue;
    if (alias.startsWith(query) || (query.length >= SUBSTRING_MIN && alias.includes(query))) return true;
  }
  return false;
};

export const matchesFilter = (element: PeriodicElement, filter: ElementFilter): boolean => {
  if (filter.category && element.category !== filter.category) return false;
  return matchesQuery(element, filter.query ?? "");
};

export const filterElementList = (elements: readonly PeriodicElement[], filter: ElementFilter): PeriodicElement[] =>
  elements.filter((element) => matchesFilter(element, filter));

/**
 * The route param as a plain symbol. A malformed deep link ("%E0%A4%A") makes `decodeURIComponent`
 * throw, which used to crash the screen; it now falls back to the raw text (and so to "not found").
 */
export const symbolFromParam = (param: string | string[] | undefined): string | undefined => {
  const raw = Array.isArray(param) ? param[0] : param;
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};
