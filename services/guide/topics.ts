/**
 * AtomIQ Guide — content model.
 *
 * Topics are not hardcoded pill labels inside the screen. Each topic is a
 * canonical definition (id, label, keywords, source units) that resolves to
 * real content rows via `getTopicContent`. The screen/engine never render a
 * topic pill unless `getTopicContent` returns at least one item, which is the
 * "dynamic pill generation" / "no dead ends" rule from the product spec.
 */

import { UNITS } from "@/content/units";
import type { Article, ArticleCategory } from "@/content/articles/types";
import type { Lesson, Quiz } from "@/content/types";
import type {
  AtomMazeChallenge,
  EncyclopediaEntry,
  Journey,
} from "@/content/explorer/types";
import { getAllJourneys } from "@/content/explorer";
import { contentRepository } from "@/services/content-db";

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
    unitIds: ["atomic-playground"],
  },
  {
    id: "nuclear-reactions",
    label: "Nuclear Reactions",
    icon: "Flash",
    keywords: ["fission", "fusion", "decay", "reaction", "chain"],
    unitIds: ["nuclear-reactions"],
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
    unitIds: ["radiation-effects", "invisible-rays", "dose-poison"],
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
    unitIds: ["nuclear-everyday-life"],
  },
  {
    id: "safety-security",
    label: "Safety & Security",
    icon: "ShieldSecurity",
    keywords: ["safety", "security", "policy", "regulation", "protection"],
    unitIds: ["nuclear-safety-security"],
  },
  {
    id: "reactors-energy",
    label: "Reactors & Energy",
    icon: "Setting2",
    keywords: ["reactor", "energy", "waste", "sustainability", "power", "green"],
    unitIds: ["engine-room", "green-horizon"],
  },
];

export const getTopicById = (id: string): TopicDef | undefined =>
  TOPICS.find((t) => t.id === id);

/** All content catalogs, loaded once per Guide mount. */
export interface LoadedContent {
  lessons: Lesson[];
  quizzes: Quiz[];
  encyclopedia: EncyclopediaEntry[];
  articles: Article[];
  mazes: AtomMazeChallenge[];
  journeys: Journey[];
}

export const loadGuideContent = async (): Promise<LoadedContent> => {
  const [lessons, quizzes, encyclopedia, articles, mazes] = await Promise.all([
    contentRepository.getAllLessons(),
    contentRepository.getAllQuizzes(),
    contentRepository.getAllEncyclopediaEntries(),
    contentRepository.getAllArticles(),
    contentRepository.getAllMazes(),
  ]);
  const journeys = getAllJourneys();
  return { lessons, quizzes, encyclopedia, articles, mazes, journeys };
};

const lower = (v: string | undefined | null): string =>
  (v ?? "").toLowerCase();

const keywordHit = (keywords: string[], ...fields: (string | undefined | null)[]): boolean => {
  const haystack = fields.map(lower).join(" ");
  return keywords.some((kw) => haystack.includes(kw));
};

export interface TopicContent {
  lessons: Lesson[];
  quizzes: Quiz[];
  encyclopedia: EncyclopediaEntry[];
  articles: Article[];
  /** Global games (MythBuster) are always available; mazes match by keyword. */
  mazes: AtomMazeChallenge[];
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
      keywordHit(topic.keywords, ...l.tags, l.title, l.description),
  );

  const quizzes = content.quizzes.filter(
    (q) =>
      (q.unitId ? topic.unitIds.includes(q.unitId) : false) ||
      keywordHit(topic.keywords, ...q.tags, q.title, q.description),
  );

  const encyclopedia = content.encyclopedia.filter((e) =>
    keywordHit(topic.keywords, e.term, e.definition, e.category),
  );

  const articles = content.articles.filter((a) =>
    keywordHit(topic.keywords, ...a.tags, a.title, a.excerpt, a.category),
  );

  const mazes = content.mazes.filter((m) =>
    keywordHit(topic.keywords, m.title, m.description, m.theme),
  );

  return {
    lessons,
    quizzes,
    encyclopedia,
    articles,
    mazes,
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
      c.encyclopedia.length > 0 ||
      c.articles.length > 0 ||
      c.mazes.length > 0
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

const ARTICLE_CATEGORY_LABELS: Record<ArticleCategory, string> = {
  safety: "Safety",
  history: "History",
  technology: "Technology",
  environment: "Environment",
  health: "Health",
  energy: "Energy",
  science: "Science",
  myths: "Myths & Facts",
};

export interface ArticleCategoryBucket {
  id: ArticleCategory;
  label: string;
  icon: string;
}

const ARTICLE_ICONS: Record<ArticleCategory, string> = {
  safety: "ShieldSecurity",
  history: "Chart",
  technology: "Setting2",
  environment: "Heart",
  health: "Heart",
  energy: "Flash",
  science: "DocumentText",
  myths: "InfoCircle",
};

/** Article categories that have at least one article in the DB. */
export const getDiscoverCategories = (
  content: LoadedContent,
): ArticleCategoryBucket[] => {
  const present = new Set(content.articles.map((a) => a.category));
  return (Object.keys(ARTICLE_CATEGORY_LABELS) as ArticleCategory[])
    .filter((c) => present.has(c))
    .map((c) => ({
      id: c,
      label: ARTICLE_CATEGORY_LABELS[c],
      icon: ARTICLE_ICONS[c],
    }));
};

/** Unit title lookup (for card subtitles). */
export const getUnitTitle = (unitId: string | undefined): string | null => {
  if (!unitId) return null;
  return UNITS.find((u) => u.id === unitId)?.title ?? null;
};

/** Capitalize a difficulty / enum value for display. */
export const titleCase = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);
