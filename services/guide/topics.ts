/**
 * AtomIQ Guide — content model.
 *
 * Topics are not hardcoded pill labels inside the screen. Each topic is a
 * canonical definition (id, label, keywords, source units) that resolves to
 * real content rows via `getTopicContent`. The screen/engine never render a
 * topic pill unless `getTopicContent` returns at least one item, which is the
 * "dynamic pill generation" / "no dead ends" rule from the product spec.
 */

import type { Lesson } from "@/content/curriculum/types";
import type {
  EncyclopediaEntry,
  Journey,
} from "@/content/explorer/types";
import { getAllJourneys } from "@/content/explorer";
import { contentRepository } from "@/services/content-db";

/**
 * A practice node or checkpoint on the path. The Guide offers these where it used to
 * offer unit quizzes. Ids are path node ids and open /practice/<id>.
 */
export interface PracticeEntry {
  id: string;
  title: string;
  description: string;
  unitId: string;
  kind: "practice" | "checkpoint";
  tags: string[];
  difficulty: string;
}

export interface TopicDef {
  id: string;
  label: string;
  icon: string;
  /** Matched against tags / categories / titles / descriptions. */
  keywords: string[];
  /** Lessons & quizzes owned by these units count toward the topic. */
  unitIds: string[];
}

/** Curated registry, seeded from the curriculum so every topic has coverage. */
export const TOPICS: TopicDef[] = [
  {
    id: "atoms",
    label: "Atoms",
    icon: "Atom",
    keywords: ["atom", "atomic", "isotope", "nucleus", "element"],
    unitIds: ["inside-the-atom"],
  },
  {
    id: "nuclear-reactions",
    label: "Nuclear Reactions",
    icon: "Flash",
    keywords: ["fission", "fusion", "decay", "reaction", "chain"],
    unitIds: ["radioactivity", "energy-from-the-nucleus"],
  },
  {
    id: "radiation",
    label: "Radiation",
    icon: "ShieldTick",
    keywords: [
      "radiation",
      "alpha",
      "beta",
      "gamma",
      "shielding",
      "dose",
      "sievert",
    ],
    unitIds: ["radiation-meets-matter", "radiation-and-the-body"],
  },
  {
    id: "everyday-nuclear",
    label: "Nuclear in Daily Life",
    icon: "Heart",
    keywords: [
      "medicine",
      "medical",
      "industrial",
      "agriculture",
      "food",
      "environment",
      "diagnos",
    ],
    unitIds: ["nuclear-technology-at-work"],
  },
  {
    id: "safety-security",
    label: "Safety & Security",
    icon: "ShieldSecurity",
    keywords: ["safety", "security", "policy", "regulation", "protection"],
    unitIds: ["safety-waste-society"],
  },
  {
    id: "reactors-energy",
    label: "Reactors & Energy",
    icon: "Setting2",
    keywords: ["reactor", "energy", "waste", "sustainability", "power", "green"],
    unitIds: ["energy-from-the-nucleus", "safety-waste-society"],
  },
];

export const getTopicById = (id: string): TopicDef | undefined =>
  TOPICS.find((t) => t.id === id);

/** All content catalogs, loaded once per Guide mount. */
export interface LoadedContent {
  lessons: Lesson[];
  /** Practice nodes and checkpoints (formerly unit quizzes). */
  quizzes: PracticeEntry[];
  encyclopedia: EncyclopediaEntry[];
  journeys: Journey[];
}

/** Unit titles for card subtitles, filled by `loadGuideContent`. */
let unitTitles = new Map<string, string>();

export const loadGuideContent = async (): Promise<LoadedContent> => {
  const [units, nodes, lessons, encyclopedia] = await Promise.all([
    contentRepository.getUnits(),
    contentRepository.getPathNodes(),
    contentRepository.getLessons(),
    contentRepository.getAllEncyclopediaEntries(),
  ]);
  unitTitles = new Map(units.map((u) => [u.id, u.title]));
  const quizzes: PracticeEntry[] = nodes
    .filter((n) => n.kind !== "lesson")
    .map((n) => {
      const unit = units.find((u) => u.id === n.unitId);
      const checkpoint = n.kind === "checkpoint";
      return {
        id: n.id,
        title: checkpoint ? `${unit?.title ?? "Unit"} checkpoint` : `${unit?.title ?? "Unit"} practice`,
        description: checkpoint ? "Show what you learned in this unit." : "Mixed questions on what you have learned so far.",
        unitId: n.unitId,
        kind: n.kind as "practice" | "checkpoint",
        tags: [],
        difficulty: checkpoint ? "intermediate" : "beginner",
      };
    });
  const journeys = getAllJourneys();
  return { lessons, quizzes, encyclopedia, journeys };
};

const lower = (v: string | undefined | null): string =>
  (v ?? "").toLowerCase();

const keywordHit = (keywords: string[], ...fields: (string | undefined | null)[]): boolean => {
  const haystack = fields.map(lower).join(" ");
  return keywords.some((kw) => haystack.includes(kw));
};

export interface TopicContent {
  lessons: Lesson[];
  quizzes: PracticeEntry[];
  encyclopedia: EncyclopediaEntry[];
  /** Global games (MythBuster, Atom Maze) are always available. */
  hasMythBuster: boolean;
}

/**
 * Resolve a topic to its backing content. Deterministic, no fabrication: an
 * empty bucket simply means the engine must not emit the matching pill.
 */
export const getTopicContent = (
  topic: TopicDef,
  content: LoadedContent,
): TopicContent => {
  const lessons = content.lessons.filter(
    (l) =>
      topic.unitIds.includes(l.unitId) ||
      keywordHit(topic.keywords, l.title, l.description),
  );

  const quizzes = content.quizzes.filter(
    (q) =>
      (q.unitId ? topic.unitIds.includes(q.unitId) : false) ||
      keywordHit(topic.keywords, ...q.tags, q.title, q.description),
  );

  const encyclopedia = content.encyclopedia.filter((e) =>
    keywordHit(topic.keywords, e.term, e.definition, e.category),
  );

  return {
    lessons,
    quizzes,
    encyclopedia,
    hasMythBuster: true,
  };
};

/** Topic ids that actually have at least one resolvable item. */
export const getAvailableTopicIds = (
  content: LoadedContent,
): string[] =>
  TOPICS.filter((t) => {
    const c = getTopicContent(t, content);
    return (
      c.lessons.length > 0 ||
      c.quizzes.length > 0 ||
      c.encyclopedia.length > 0
    );
  }).map((t) => t.id);

// ---------------------------------------------------------------------------
// EXPLORE / DISCOVER category derivation (built from real content only)
// ---------------------------------------------------------------------------

export interface GuideCategory {
  id: string;
  label: string;
  icon: string;
  /** content-only filter: which entries belong to this category. */
  matches: (entry: EncyclopediaEntry) => boolean;
}

const ALL_EXPLORE_CATEGORIES: GuideCategory[] = [
  {
    id: "matter",
    label: "Matter & Atoms",
    icon: "Atom",
    matches: (e) =>
      /atom|matter|nucleus|isotope|particle/i.test(`${e.term} ${e.definition}`),
  },
  {
    id: "radiation",
    label: "Radiation",
    icon: "ShieldTick",
    matches: (e) => /radiation|alpha|beta|gamma|dose/i.test(`${e.term} ${e.definition}`),
  },
  {
    id: "medicine",
    label: "Medicine",
    icon: "Heart",
    matches: (e) => /medic|health|diagnos|therapy/i.test(`${e.term} ${e.definition}`),
  },
  {
    id: "energy",
    label: "Energy",
    icon: "Flash",
    matches: (e) => /energy|reactor|fusion|fission|power/i.test(`${e.term} ${e.definition}`),
  },
  {
    id: "history",
    label: "History",
    icon: "Chart",
    matches: (e) => /histor|curie|fermi|rutherford|discover/i.test(`${e.term} ${e.definition}`),
  },
  {
    id: "environment",
    label: "Environment",
    icon: "Heart",
    matches: (e) => /environment|climate|waste|earth/i.test(`${e.term} ${e.definition}`),
  },
];

/** Encyclopedia categories that have at least one entry in the DB. */
export const getExploreCategories = (
  content: LoadedContent,
): GuideCategory[] =>
  ALL_EXPLORE_CATEGORIES.filter((cat) =>
    content.encyclopedia.some((e) => cat.matches(e)),
  );

/** Unit title lookup (for card subtitles). */
export const getUnitTitle = (unitId: string | undefined): string | null => {
  if (!unitId) return null;
  return unitTitles.get(unitId) ?? null;
};

/** Capitalize a difficulty / enum value for display. */
export const titleCase = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);
