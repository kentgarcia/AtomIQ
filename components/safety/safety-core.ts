/**
 * The Safety Guide's rules (docs/PHONE_SPEC.md §5.9): the cards' shape, their three sections in order, and the words that frame them.
 * This is an educational reference, not an emergency service: the first thing the list says and the last line of every card say so.
 * Framework-free and tested (`test:safety`). The section names mirror `scripts/lib/safety-vocab.mjs`.
 */

export const SAFETY_SECTIONS = ["basics", "happens", "myths"] as const;
export type SafetySection = (typeof SAFETY_SECTIONS)[number];

export const SAFETY_SECTION_TITLES: Readonly<Record<SafetySection, string>> = { basics: "Radiation basics", happens: "If something happens", myths: "Myths that cost people" };

export interface SafetyCard {
  id: string;
  section: SafetySection;
  title: string;
  summary: string;
  /** Two to five short lines. */
  steps: string[];
  /** An `Icon` name. */
  icon: string;
  /** The AtomDex entry the "See in AtomDex" button opens; null hides the button. */
  entryId: string | null;
  position: number;
  /** "Publisher, Title" of each source the card stands on. */
  sources: string[];
}

/** What the list opens with. The app never calls, locates or notifies anyone. */
export const SAFETY_DISCLAIMER = "This guide is for learning. It is not an emergency service. In a real emergency, follow your local authorities and call your local emergency number.";

/** The last line of every card. */
export const SAFETY_FOOT = "For learning only. In a real emergency, follow local authorities and call your local emergency number.";

export interface SafetyGroup {
  section: SafetySection;
  title: string;
  cards: SafetyCard[];
}

/** The cards in their three sections, in reading order; a section with no cards is left out, a card of an unknown section is dropped. */
export function groupCards(cards: readonly SafetyCard[]): SafetyGroup[] {
  return SAFETY_SECTIONS.map((section) => ({
    section,
    title: SAFETY_SECTION_TITLES[section],
    cards: cards.filter((c) => c.section === section).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)),
  })).filter((g) => g.cards.length > 0);
}

/** "3 cards", "1 card". */
export const cardCountText = (n: number): string => (n === 1 ? "1 card" : `${n} cards`);

/** A card a screen can show: it has lines and a title. A row that lost its lines is left out rather than shown empty. */
export const isShowable = (c: Pick<SafetyCard, "title" | "steps">): boolean => c.title.trim().length > 0 && c.steps.length > 0;

/** The lines of a myth card read as "Myth: ..." then "What is true: ..."; this splits one line into its label and its text. */
export function splitLabel(line: string): { label: "Myth" | "What is true" | null; text: string } {
  const m = /^(Myth|What is true):\s*(.*)$/.exec(line);
  return m ? { label: m[1] as "Myth" | "What is true", text: m[2] } : { label: null, text: line };
}
