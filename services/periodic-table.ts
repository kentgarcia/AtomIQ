/**
 * Periodic table service — lookup, search and deep-link helpers.
 *
 * Everything here reads the bundled data module (`content/periodic-table`),
 * so it works offline and does not touch the content database. Lessons,
 * quizzes, Lab content and the encyclopedia should link into an element with
 * `openElement(router, "C")` (or the `<ElementChip />` component).
 */

import type { Href, ImperativeRouter } from "expo-router";

import {
  CATEGORY_LABELS,
  ELEMENTS,
  type ElementCategory,
  type PeriodicElement,
} from "@/content/periodic-table/elements";

export { ELEMENTS, CATEGORY_LABELS };
export type { ElementCategory, PeriodicElement };

const BY_SYMBOL = new Map<string, PeriodicElement>();
const BY_NAME = new Map<string, PeriodicElement>();
const BY_NUMBER = new Map<number, PeriodicElement>();

for (const element of ELEMENTS) {
  BY_SYMBOL.set(element.symbol.toLowerCase(), element);
  BY_NAME.set(element.name.toLowerCase(), element);
  BY_NUMBER.set(element.atomicNumber, element);
}

/** Alternate spellings and isotope names people (and the encyclopedia) use. */
const ALIASES: Record<string, string> = {
  aluminium: "Al",
  caesium: "Cs",
  sulphur: "S",
  deuterium: "H",
  tritium: "H",
  protium: "H",
};

export const TOTAL_ELEMENTS = ELEMENTS.length;

export const getElementBySymbol = (symbol: string | null | undefined): PeriodicElement | undefined =>
  symbol ? BY_SYMBOL.get(symbol.trim().toLowerCase()) : undefined;

export const getElementByAtomicNumber = (n: number): PeriodicElement | undefined => BY_NUMBER.get(n);

export const getElementByName = (name: string | null | undefined): PeriodicElement | undefined => {
  if (!name) return undefined;
  const key = name.trim().toLowerCase();
  return BY_NAME.get(key) ?? getElementBySymbol(ALIASES[key]);
};

/** Look up by symbol ("C"), name ("Carbon"), atomic number ("6") or alias. */
export const findElement = (query: string | number | null | undefined): PeriodicElement | undefined => {
  if (query === null || query === undefined) return undefined;
  if (typeof query === "number") return BY_NUMBER.get(query);
  const trimmed = query.trim();
  if (!trimmed) return undefined;
  if (/^\d{1,3}$/.test(trimmed)) return BY_NUMBER.get(Number(trimmed));
  return getElementBySymbol(trimmed) ?? getElementByName(trimmed);
};

/**
 * Cheap link from an encyclopedia-style term or id to an element. Looks only at
 * the first word, so "Uranium-235", "uranium-enrichment" and "Radon" resolve
 * but "Radioactive Decay" or "Heavy Water" do not. No regex over long text.
 */
export const findElementForTerm = (term: string | null | undefined): PeriodicElement | undefined => {
  if (!term) return undefined;
  const lower = term.toLowerCase();
  let end = lower.length;
  for (let i = 0; i < lower.length; i++) {
    const ch = lower.charCodeAt(i);
    // stop at the first character that is not a-z
    if (ch < 97 || ch > 122) {
      end = i;
      break;
    }
  }
  if (end < 3) return undefined;
  return getElementByName(lower.slice(0, end));
};

/** Unique elements referenced by a term plus related term ids (max `limit`). */
export const findElementsForTerms = (
  terms: readonly (string | null | undefined)[],
  limit = 4,
): PeriodicElement[] => {
  const found: PeriodicElement[] = [];
  for (const term of terms) {
    const element = findElementForTerm(term);
    if (element && !found.includes(element)) {
      found.push(element);
      if (found.length >= limit) break;
    }
  }
  return found;
};

/**
 * Typed-route hrefs. Cast because expo-router regenerates its typed route
 * union (`.expo/types`) only when the dev server runs.
 */
export const PERIODIC_TABLE_HREF = "/periodic-table" as Href;

export const elementRoute = (symbol: string): Href =>
  `/periodic-table/${encodeURIComponent(symbol)}` as Href;

/** Navigate to an element's detail screen. Unknown symbols open the table. */
export const openElement = (router: ImperativeRouter, symbolOrName: string): void => {
  const element = findElement(symbolOrName);
  if (!element) {
    router.push(PERIODIC_TABLE_HREF);
    return;
  }
  router.push(elementRoute(element.symbol));
};

export const openPeriodicTable = (router: ImperativeRouter): void => {
  router.push(PERIODIC_TABLE_HREF);
};

/** Short category phrase for screen readers: "reactive nonmetal". */
export const categorySpoken = (category: ElementCategory): string =>
  CATEGORY_LABELS[category].toLowerCase();

/** "Carbon, symbol C, atomic number 6, reactive nonmetal" */
export const elementAccessibilityLabel = (element: PeriodicElement): string =>
  `${element.name}, symbol ${element.symbol}, atomic number ${element.atomicNumber}, ${categorySpoken(element.category)}`;

export const formatAtomicMass = (element: PeriodicElement): string =>
  element.massIsMassNumber ? `[${element.atomicMass}]` : String(element.atomicMass);

export interface ElementFilter {
  query?: string;
  category?: ElementCategory | null;
}

export const matchesQuery = (element: PeriodicElement, rawQuery: string): boolean => {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  if (/^\d+$/.test(query)) return element.atomicNumber === Number(query);
  if (element.name.toLowerCase().includes(query)) return true;
  return query.length <= 3 && element.symbol.toLowerCase().startsWith(query);
};

export const matchesFilter = (element: PeriodicElement, filter: ElementFilter): boolean => {
  if (filter.category && element.category !== filter.category) return false;
  return matchesQuery(element, filter.query ?? "");
};

export const filterElements = (filter: ElementFilter): PeriodicElement[] =>
  ELEMENTS.filter((element) => matchesFilter(element, filter));
