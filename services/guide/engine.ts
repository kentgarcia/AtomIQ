/**
 * AtomIQ Guide — rule engine (pure, no React, no UI imports beyond types).
 *
 * The engine turns a normalised `GuideContext` plus the loaded `LoadedContent`
 * into a linear list of `GuideTurn`s. Every selection is a `GuidePill`; the
 * engine appends a user-echo turn then a new guide turn. There is no network
 * call and no free text — all routing is deterministic and content-backed.
 *
 * Two entry points:
 *   - `initialGuideState(ctx)` — the root menu.
 *   - `applySelection(state, pill, ctx, content)` — advance the conversation.
 */

import type { Article, ArticleCategory } from "@/content/articles/types";
import type {
  AtomMazeChallenge,
  EncyclopediaEntry,
  Journey,
} from "@/content/explorer/types";
import type { Lesson, Quiz } from "@/content/types";

import {
  type LoadedContent,
  type TopicContent,
  type TopicDef,
  getAvailableTopicIds,
  getDiscoverCategories,
  getExploreCategories,
  getTopicById,
  getTopicContent,
  getUnitTitle,
  titleCase,
  TOPICS,
} from "./topics";
import type {
  GuideAction,
  GuideCard,
  GuideContext,
  GuideIntent,
  GuidePill,
  GuideState,
  GuideTurn,
  MascotMood,
} from "./types";

let _seq = 0;
const nid = (prefix = "t"): string => `${prefix}${_seq++}`;

// ---------------------------------------------------------------------------
// Pill builders
// ---------------------------------------------------------------------------

const AGGREGATE_ACTION: Record<
  NonNullable<Extract<GuidePill["payload"], { type: "action" }>["aggregate"]>,
  GuideAction
> = {
  "recommended-lesson": "start_lesson",
  "review-lesson": "start_lesson",
  "recommended-game": "play_game",
  "topic-game": "play_game",
  "random-game": "play_game",
  "weak-quiz": "take_quiz",
  "topic-quiz": "take_quiz",
  "retry-quiz": "take_quiz",
  "review-encyclopedia": "read_encyclopedia",
  "topic-encyclopedia": "read_encyclopedia",
  "topic-articles": "read_article",
};

const intentPill = (intent: GuideIntent, label: string): GuidePill => ({
  id: `p-intent-${intent}`,
  label,
  kind: "intent",
  icon: intentIcon(intent),
  payload: { type: "intent", intent },
});

const intentIcon = (intent: GuideIntent): string => {
  switch (intent) {
    case "learn":
      return "Book";
    case "explore":
      return "SearchNormal";
    case "discover":
      return "InfoCircle";
    case "practice":
      return "Game";
    case "review":
      return "Refresh";
    case "progress":
      return "Chart";
    default:
      return "InfoCircle";
  }
};

const topicPill = (topic: TopicDef): GuidePill => ({
  id: `p-topic-${topic.id}`,
  label: topic.label,
  kind: "topic",
  icon: topic.icon,
  payload: { type: "topic", topicId: topic.id },
});

const categoryPill = (id: string, label: string, icon: string): GuidePill => ({
  id: `p-cat-${id}`,
  label,
  kind: "category",
  icon,
  payload: { type: "category", categoryId: id },
});

const actionPill = (
  id: string,
  label: string,
  icon: string,
  aggregate: NonNullable<
    Extract<GuidePill["payload"], { type: "action" }>["aggregate"]
  >,
  refId?: string,
): GuidePill => ({
  id: `p-act-${id}`,
  label,
  kind: "action",
  icon,
  payload: {
    type: "action",
    action: AGGREGATE_ACTION[aggregate],
    aggregate,
    refId,
  },
});

const itemPill = (
  id: string,
  label: string,
  icon: string,
  itemId: string,
  itemKind: GuideCard["kind"],
): GuidePill => ({
  id: `p-item-${id}`,
  label,
  kind: "item",
  icon,
  payload: { type: "item", itemId, itemKind },
});

const utilityPill = (utility: "change-topic" | "start-over"): GuidePill => ({
  id: `p-util-${utility}`,
  label: utility === "start-over" ? "Start Over" : "Change",
  kind: "utility",
  icon: utility === "start-over" ? "Refresh" : "ArrowLeft",
  payload: { type: "utility", utility },
});

const startOverPill = utilityPill("start-over");

// ---------------------------------------------------------------------------
// Mascot mood — derived from Guide State, not text
// ---------------------------------------------------------------------------

const moodForIntent = (intent: GuideIntent): MascotMood => {
  switch (intent) {
    case "learn":
      return "thinking";
    case "explore":
      return "thinking";
    case "discover":
      return "thinking";
    case "practice":
      return "excited";
    case "review":
      return "encouraging";
    case "progress":
      return "celebrating";
    case "continue":
      return "encouraging";
    default:
      return "thinking";
  }
};

const moodForActionAggregate = (agg: string | undefined): MascotMood => {
  switch (agg) {
    case "recommended-lesson":
    case "review-lesson":
    case "review-encyclopedia":
    case "topic-encyclopedia":
    case "topic-articles":
      return "explaining";
    case "topic-quiz":
    case "retry-quiz":
    case "weak-quiz":
      return "excited";
    case "topic-game":
    case "random-game":
    case "recommended-game":
      return "excited";
    default:
      return "explaining";
  }
};

const moodForPill = (pill: GuidePill): MascotMood => {
  const p = pill.payload;
  if (p.type === "intent") return moodForIntent(p.intent);
  if (p.type === "topic" || p.type === "category") return "excited";
  if (p.type === "action") return moodForActionAggregate(p.aggregate);
  if (p.type === "item") return "explaining";
  if (p.type === "utility" && p.utility === "start-over") return "greeting";
  return "thinking";
};

// ---------------------------------------------------------------------------
// Card builders — hierarchy: [TYPE] Title / Short description / Metadata / CTA
// States: available / completed / locked / recommended
// ---------------------------------------------------------------------------

const isUnitLocked = (unitId: string | undefined, ctx: GuideContext): boolean => {
  if (!unitId) return false;
  return !ctx.unlockedUnitIds.includes(unitId);
};

const lessonCard = (lesson: Lesson, ctx: GuideContext, _content: LoadedContent): GuideCard => {
  const locked = isUnitLocked(lesson.unitId, ctx);
  const completed = (lesson as { completed?: boolean }).completed || ctx.completedIds.includes(lesson.id);
  const isRecommended = !locked && !completed && lesson.id === ctx.currentLevelId;
  return {
    kind: "lesson",
    title: lesson.title,
    subtitle: locked
      ? `Locked • ${getUnitTitle(lesson.unitId) ?? "Lesson"}`
      : `${getUnitTitle(lesson.unitId) ?? "Lesson"} • ${titleCase(lesson.difficulty ?? "beginner")}`,
    body: lesson.description,
    destination: { screen: "lesson", id: lesson.id },
    ctaLabel: locked ? "Locked" : completed ? "Review Lesson →" : "Start Lesson →",
    badge: locked ? "Locked" : completed ? "Completed" : isRecommended ? "Recommended" : undefined,
    status: locked ? "locked" : completed ? "completed" : isRecommended ? "recommended" : "available",
    reward: locked ? undefined : "+20 XP",
    duration: "5 min",
  };
};

const quizCard = (quiz: Quiz, ctx: GuideContext, badge?: string): GuideCard => {
  const locked = isUnitLocked(quiz.unitId, ctx);
  const completed = ctx.completedIds.includes(quiz.id);
  const isRecommended = !locked && badge === "Needs Review";
  return {
    kind: "quiz",
    title: quiz.title,
    subtitle: locked
      ? `Locked • ${getUnitTitle(quiz.unitId) ?? "Quiz"}`
      : `${getUnitTitle(quiz.unitId) ?? "Quiz"} • ${titleCase(quiz.difficulty ?? "beginner")}`,
    body: quiz.description,
    destination: { screen: "quiz", id: quiz.id },
    ctaLabel: locked ? "Locked" : "Take Quiz →",
    badge: locked ? "Locked" : badge ?? (completed ? "Completed" : undefined),
    status: locked ? "locked" : completed && !badge ? "completed" : isRecommended ? "recommended" : "available",
    reward: locked ? undefined : "+50 XP",
    duration: "3 min",
  };
};

const encyclopediaCard = (entry: EncyclopediaEntry): GuideCard => ({
  kind: "encyclopedia",
  title: entry.term,
  subtitle: entry.category,
  body: entry.definition,
  destination: { screen: "encyclopedia-entry", id: entry.id },
  ctaLabel: "Read Entry →",
  status: "available",
  reward: "+10 XP",
  duration: "2 min",
});

const articleCard = (article: Article): GuideCard => ({
  kind: "article",
  title: article.title,
  subtitle: article.category,
  body: article.excerpt,
  destination: { screen: "article", id: article.id },
  ctaLabel: "Read Article →",
  status: "available",
  reward: "+15 XP",
  duration: "4 min",
});

const mazeCard = (maze: AtomMazeChallenge, badge?: string): GuideCard => ({
  kind: "game",
  title: maze.title,
  subtitle: maze.theme ?? "Atom Maze",
  body: maze.description,
  destination: { screen: "maze", id: maze.id },
  ctaLabel: "Play Maze →",
  badge,
  status: badge === "Recommended" ? "recommended" : "available",
  reward: "+30 XP",
  duration: "5 min",
});

const journeyCard = (journey: Journey): GuideCard => ({
  kind: "game",
  title: journey.title,
  subtitle: journey.difficulty ?? "Journey",
  body: journey.description,
  destination: { screen: "journey", id: journey.id },
  ctaLabel: "Start Journey →",
  status: "available",
  reward: "+40 XP",
  duration: "8 min",
});

const mythBusterCard = (): GuideCard => ({
  kind: "game",
  title: "MythBuster",
  subtitle: "Fact or Fiction",
  body: "Test your instincts against common nuclear myths and reveal the facts.",
  destination: { screen: "mythbuster" },
  ctaLabel: "Play Myth Buster →",
  status: "available",
  reward: "+25 XP",
  duration: "3 min",
});

const profileSummaryCard = (ctx: GuideContext): GuideCard => {
  const p = ctx.profile;
  return {
    kind: "profile-summary",
    title: `Level ${p.level} • ${p.displayName}`,
    subtitle: "Your science profile",
    body: [
      `XP: ${p.totalXp}`,
      `Lessons Completed: ${p.lessonsCompleted}`,
      `Myths Busted: ${p.mythsBusted}`,
      p.level > 1
        ? "Keep the streak going, scientist!"
        : "Just getting started!",
    ].join("\n"),
    destination: { screen: "tab-profile" },
    ctaLabel: "Open My Profile →",
    status: "available",
    reward: `${p.totalXp} XP`,
  };
};

// ---------------------------------------------------------------------------
// Content helpers
// ---------------------------------------------------------------------------

const topicContentFor = (
  topicId: string | null,
  content: LoadedContent,
): TopicContent | null => {
  if (!topicId) return null;
  const topic = getTopicById(topicId);
  return topic ? getTopicContent(topic, content) : null;
};

const incompleteLessonsFirst = <T extends { id: string }>(
  items: T[],
  completedIds: string[],
): T[] =>
  [...items].sort((a, b) => {
    const ac = completedIds.includes(a.id) ? 1 : 0;
    const bc = completedIds.includes(b.id) ? 1 : 0;
    return ac - bc;
  });

const topicForQuiz = (quiz: Quiz): TopicDef | undefined => {
  const hay = `${quiz.title} ${quiz.description ?? ""} ${(
    quiz.tags ?? []
  ).join(" ")}`.toLowerCase();
  return TOPICS.find((t) => t.keywords.some((k) => hay.includes(k)));
};

// ---------------------------------------------------------------------------
// Root + intent handlers
// ---------------------------------------------------------------------------

const buildIntentPills = (ctx: GuideContext): GuidePill[] => {
  const pills: GuidePill[] = [
    intentPill("learn", "Learn"),
    intentPill("explore", "Explore"),
    intentPill("practice", "Practice"),
  ];
  if (ctx.weakQuizIds.length > 0) pills.push(intentPill("review", "Review"));
  pills.push(intentPill("progress", "Progress"));
  return pills;
};

export const initialGuideState = (ctx: GuideContext): GuideState => {
  const turn: GuideTurn = {
    id: nid(),
    role: "guide",
    text: `Hi ${ctx.profile.displayName}! I'm Shrodi, your learning companion. What do you want to do?`,
    pills: buildIntentPills(ctx),
    utilities: [startOverPill],
  };
  return { turns: [turn], intent: null, topicId: null, action: null, mascotMood: "greeting", selectedPill: null };
};

const guideTurn = (text: string, pills?: GuidePill[]): GuideTurn => ({
  id: nid(),
  role: "guide",
  text,
  pills,
  utilities: [startOverPill],
});

const guideTurnWithCard = (text: string, card: GuideCard): GuideTurn => ({
  id: nid(),
  role: "guide",
  text,
  cards: [card],
  utilities: [startOverPill],
});

const guideTurnWithCardAndPills = (text: string, card: GuideCard, pills: GuidePill[]): GuideTurn => ({
  id: nid(),
  role: "guide",
  text,
  cards: [card],
  pills,
  utilities: [startOverPill],
});

const completionNextPills = (ctx: GuideContext): GuidePill[] => {
  const pills: GuidePill[] = [
    { id: "p-complete-learn", label: "Learn Something Else", kind: "action", icon: "Book", payload: { type: "action", action: "start_lesson", aggregate: "recommended-lesson" } },
    { id: "p-complete-practice", label: "Practice Again", kind: "action", icon: "Game", payload: { type: "action", action: "play_game", aggregate: "recommended-game" } },
  ];
  if (ctx.weakQuizIds.length) pills.push({ id: "p-complete-review", label: "Review", kind: "intent", icon: "Refresh", payload: { type: "intent", intent: "review" } });
  pills.push({ id: "p-complete-dashboard", label: "Dashboard", kind: "utility", icon: "ArrowLeft", payload: { type: "utility", utility: "start-over" } });
  return pills;
};

const userEcho = (label: string): GuideTurn => ({
  id: nid("u"),
  role: "user",
  text: label,
});

// ---------------------------------------------------------------------------
// Intent → next guide turn
// ---------------------------------------------------------------------------

const handleIntent = (
  intent: GuideIntent,
  ctx: GuideContext,
  content: LoadedContent,
): GuideTurn => {
  switch (intent) {
    case "learn": {
      const available = TOPICS.filter(
        (t) =>
          getAvailableTopicIds(content).includes(t.id) &&
          t.id !== "safety-security" &&
          t.id !== "everyday-nuclear"
      );
      return guideTurn(
        "What would you like to learn about?",
        available.map(topicPill),
      );
    }
    case "explore": {
      const cats = getExploreCategories(content);
      const pills: GuidePill[] = cats.map((c) =>
        categoryPill(c.id, c.label, c.icon),
      );
      if (content.journeys.length) {
        pills.push(categoryPill("journeys", "Guided Journeys", "Chart"));
      }
      return guideTurn("What would you like to explore?", pills);
    }
    case "discover": {
      const cats = getDiscoverCategories(content);
      return guideTurn(
        "What would you like to discover?",
        cats.map((c) => categoryPill(c.id, c.label, c.icon)),
      );
    }
    case "practice": {
      const pills: GuidePill[] = [];
      if (
        ctx.weakQuizIds.length > 0 ||
        ctx.currentLevelId ||
        content.mazes.length > 0
      ) {
        pills.push(
          actionPill(
            "recommended-game",
            "Recommended for Me",
            "Star",
            "recommended-game",
          ),
        );
      }
      pills.push(actionPill("mythbuster", "Myth Buster", "Flash", "topic-game"));
      content.mazes.slice(0, 4).forEach((m) => {
        pills.push(itemPill(`mazepick-${m.id}`, m.title, "Game", m.id, "game"));
      });
      pills.push(
        actionPill("random-game", "Random Challenge", "Game", "random-game"),
      );
      return guideTurn("Choose your challenge.", pills);
    }
    case "review": {
      const weak = ctx.weakQuizIds
        .map((id) => content.quizzes.find((q) => q.id === id))
        .filter(Boolean) as Quiz[];
      if (!weak.length) {
        return guideTurn("You're all caught up — nothing needs review yet!", [
          ...buildIntentPills(ctx),
        ]);
      }
      const pills = weak.map((q) =>
        itemPill(`review-${q.id}`, `Review ${q.title}`, "Refresh", q.id, "quiz"),
      );
      return guideTurn("Let's strengthen what you've learned.", pills);
    }
    case "progress": {
      return guideTurnWithCard(
        "Here's how your science journey is going.",
        profileSummaryCard(ctx),
      );
    }
    default:
      return guideTurn("What would you like to do?", buildIntentPills(ctx));
  }
};

// ---------------------------------------------------------------------------
// Category resolution (explore / discover)
// ---------------------------------------------------------------------------

const handleCategory = (
  categoryId: string,
  _ctx: GuideContext,
  content: LoadedContent,
): GuideTurn => {
  if (categoryId === "journeys") {
    const cards = content.journeys.slice(0, 6).map(journeyCard);
    return guideTurnWithCards("Pick a guided journey.", cards);
  }

  const exploreCats = getExploreCategories(content);
  const exploreCat = exploreCats.find((c) => c.id === categoryId);
  if (exploreCat) {
    const entries = content.encyclopedia
      .filter((e) => exploreCat.matches(e))
      .slice(0, 8);
    const pills = entries.map((e) =>
      itemPill(`enc-${e.id}`, e.term, exploreCat.icon, e.id, "encyclopedia"),
    );
    return guideTurn(`Explore ${exploreCat.label}.`, pills);
  }

  const articleCats = getDiscoverCategories(content);
  const bucket = articleCats.find((c) => c.id === categoryId);
  if (bucket) {
    const articles = content.articles
      .filter((a) => a.category === (bucket.id as ArticleCategory))
      .slice(0, 8);
    const pills = articles.map((a) =>
      itemPill(`art-${a.id}`, a.title, bucket.icon, a.id, "article"),
    );
    return guideTurn(`Discover ${bucket.label}.`, pills);
  }

  return guideTurn("Let me show you what's available.", undefined);
};

// ---------------------------------------------------------------------------
// Topic resolution (learn)
// ---------------------------------------------------------------------------

const handleTopic = (
  topicId: string,
  _ctx: GuideContext,
  content: LoadedContent,
): GuideTurn => {
  const topic = getTopicById(topicId);
  if (!topic)
    return guideTurn("Pick a topic to continue.", buildIntentPills(_ctx));
  const tc = getTopicContent(topic, content);
  const pills: GuidePill[] = [];

  if (tc.lessons.length)
    pills.push(
      actionPill(
        `learn-${topicId}`,
        "Read a Lesson",
        "Book",
        "recommended-lesson",
        topicId,
      ),
    );
  if (tc.encyclopedia.length)
    pills.push(
      actionPill(
        `learn-enc-${topicId}`,
        "Read Encyclopedia",
        "InfoCircle",
        "topic-encyclopedia",
        topicId,
      ),
    );
  if (tc.articles.length)
    pills.push(
      actionPill(
        `art-${topicId}`,
        "Read Articles",
        "DocumentText",
        "topic-articles",
        topicId,
      ),
    );
  if (tc.mazes.length || tc.hasMythBuster)
    pills.push(
      actionPill(`game-${topicId}`, "Play a Game", "Game", "topic-game", topicId),
    );

  return guideTurn(`Great — let's dive into ${topic.label}. What first?`, pills);
};

// ---------------------------------------------------------------------------
// Action resolution → cards
// ---------------------------------------------------------------------------

const resolveActionCards = (
  payload: Extract<GuidePill["payload"], { type: "action" }>,
  ctx: GuideContext,
  content: LoadedContent,
): GuideCard[] => {
  const tc = topicContentFor(payload.refId ?? null, content);
  const refId = payload.refId;

  switch (payload.aggregate) {
    case "recommended-lesson": {
      // 1) topic lessons 2) current unit lessons 3) first incomplete lessons
      const pool =
        tc?.lessons ??
        (ctx.currentUnitId
          ? content.lessons.filter((l) => l.unitId === ctx.currentUnitId)
          : content.lessons);
      const ordered = incompleteLessonsFirst(pool, ctx.completedIds);
      const picked = ordered.slice(0, 3);
      // Never hallucinate — empty bucket returns empty, caller shows safe alternative
      return picked.length ? picked.map((l) => lessonCard(l, ctx, content)) : [];
    }
    case "recommended-game": {
      if (ctx.weakQuizIds.length) {
        const q = content.quizzes.find((q) => q.id === ctx.weakQuizIds[0]);
        if (q) return [quizCard(q, ctx, "Needs Review")];
      }
      if (ctx.currentUnitId) {
        const q = content.quizzes.find((q) => q.unitId === ctx.currentUnitId);
        if (q) return [quizCard(q, ctx)];
      }
      if (content.mazes.length)
        return [mazeCard(content.mazes[0], "Recommended")];
      return [mythBusterCard()];
    }
    case "topic-quiz": {
      const pool = tc?.quizzes ?? [];
      return pool.slice(0, 3).map((q) => quizCard(q, ctx));
    }
    case "topic-game": {
      const pool = tc?.mazes ?? [];
      const cards = pool.slice(0, 2).map((m) => mazeCard(m));
      cards.push(mythBusterCard());
      return cards;
    }
    case "review-lesson": {
      const unitId = refId
        ? (content.quizzes.find((q) => q.id === refId)?.unitId ?? null)
        : ctx.currentUnitId;
      const pool = unitId
        ? content.lessons.filter((l) => l.unitId === unitId)
        : content.lessons;
      return pool.slice(0, 3).map((l) => lessonCard(l, ctx, content));
    }
    case "review-encyclopedia": {
      // Handles both quiz-based review (refId is quiz) and topic-based (refId is topic)
      const topicById = refId ? getTopicById(refId) : undefined;
      if (topicById) {
        return getTopicContent(topicById, content).encyclopedia.slice(0, 3).map((e) => encyclopediaCard(e));
      }
      const quiz = refId ? content.quizzes.find((q) => q.id === refId) : undefined;
      const topic = quiz ? topicForQuiz(quiz) : undefined;
      const pool = topic ? getTopicContent(topic, content).encyclopedia : [];
      return pool.slice(0, 3).map((e) => encyclopediaCard(e));
    }
    case "topic-encyclopedia": {
      const topic = refId ? getTopicById(refId) : null;
      const pool = topic ? getTopicContent(topic, content).encyclopedia : [];
      // Fallback: if no keyword match, show first encyclopedia entries so "nothing here yet" never happens for remaining topics
      const effective = pool.length ? pool : content.encyclopedia.slice(0, 3);
      return effective.slice(0, 3).map((e) => encyclopediaCard(e));
    }
    case "topic-articles": {
      const topic = refId ? getTopicById(refId) : null;
      const pool = topic ? getTopicContent(topic, content).articles : [];
      // Ensure we pull from discovery hub (articles/stories) — fallback to all articles if topic has none
      const effective = pool.length ? pool : content.articles.slice(0, 3);
      return effective.slice(0, 3).map((a) => articleCard(a));
    }
    case "retry-quiz": {
      const q = refId ? content.quizzes.find((q) => q.id === refId) : undefined;
      return q ? [quizCard(q, ctx)] : [];
    }
    case "random-game": {
      const all = content.mazes;
      if (!all.length) return [mythBusterCard()];
      const pick = all[Math.floor(Math.random() * all.length)];
      return [mazeCard(pick, "Random")];
    }
    default:
      return [profileSummaryCard(ctx)];
  }
};

// ---------------------------------------------------------------------------
// Item resolution → single card turn
// ---------------------------------------------------------------------------

const handleItem = (
  payload: Extract<GuidePill["payload"], { type: "item" }>,
  ctx: GuideContext,
  content: LoadedContent,
): GuideTurn => {
  const { itemId, itemKind } = payload;
  switch (itemKind) {
    case "lesson": {
      const item = content.lessons.find((l) => l.id === itemId);
      if (item) {
        const card = lessonCard(item, ctx, content);
        if (card.status === "completed") {
          return guideTurnWithCardAndPills(
            `Nice work!\n\nYou completed:\n${card.title}\n\n${card.reward ?? "+20 XP"}\n\nWhat next?`,
            card,
            completionNextPills(ctx)
          );
        }
        return guideTurnWithCard(item.title, card);
      }
      return guideTurn("I couldn't find that item.", undefined);
    }
    case "quiz": {
      const item = content.quizzes.find((q) => q.id === itemId);
      if (item) {
        const card = quizCard(item, ctx);
        if (card.status === "completed") {
          return guideTurnWithCardAndPills(
            `Nice work!\n\nYou completed:\n${card.title}\n\n${card.reward ?? "+50 XP"}\n\nWhat next?`,
            card,
            completionNextPills(ctx)
          );
        }
        return guideTurnWithCard(item.title, card);
      }
      return guideTurn("I couldn't find that item.", undefined);
    }
    case "encyclopedia": {
      const item = content.encyclopedia.find((e) => e.id === itemId);
      return item
        ? guideTurnWithCard(item.term, encyclopediaCard(item))
        : guideTurn("I couldn't find that item.", undefined);
    }
    case "article": {
      const item = content.articles.find((a) => a.id === itemId);
      return item
        ? guideTurnWithCard(item.title, articleCard(item))
        : guideTurn("I couldn't find that item.", undefined);
    }
    case "game": {
      const maze = content.mazes.find((m) => m.id === itemId);
      return maze
        ? guideTurnWithCard(maze.title, mazeCard(maze))
        : guideTurn("I couldn't find that item.", undefined);
    }
    case "profile-summary":
      return guideTurn("I couldn't find that item.", undefined);
    default:
      return guideTurn("I couldn't find that item.", undefined);
  }
};

// ---------------------------------------------------------------------------
// Public: advance the conversation
// ---------------------------------------------------------------------------

export const applySelection = (
  state: GuideState,
  pill: GuidePill,
  ctx: GuideContext,
  content: LoadedContent,
): GuideState => {
  const payload = pill.payload;

  if (payload.type === "utility") {
    if (payload.utility === "start-over") return initialGuideState(ctx);
    // change-topic is handled by the screen (it truncates turns); treat as
    // a no-op here so we always have a pure fallback.
    return state;
  }

  const newTurns: GuideTurn[] = [...state.turns, userEcho(pill.label)];
  let nextIntent = state.intent;
  let nextTopic = state.topicId;
  let nextAction: GuideAction | null = state.action;
  let nextMood: MascotMood = moodForPill(pill);

  let reply: GuideTurn;
  switch (payload.type) {
    case "intent":
      nextIntent = payload.intent;
      nextTopic = null;
      nextAction = null;
      reply = handleIntent(payload.intent, ctx, content);
      break;
    case "topic":
      nextTopic = payload.topicId;
      nextAction = null;
      reply = handleTopic(payload.topicId, ctx, content);
      break;
    case "category":
      nextAction = null;
      reply = handleCategory(payload.categoryId, ctx, content);
      break;
    case "action": {
      nextAction = payload.action;
      // refine mood with aggregate for richer表情
      nextMood = moodForActionAggregate(payload.aggregate);
      const cards = resolveActionCards(payload, ctx, content);
      if (cards.length > 1) {
        reply = guideTurnWithCards("Here are a few options:", cards);
      } else if (cards.length === 1) {
        reply = guideTurnWithCard("Here you go:", cards[0]);
      } else {
        // Empty — never hallucinate, offer safe alternative
        reply = guideTurn("Nothing here yet.", [intentPill("explore", "Explore Another Topic")]);
        nextMood = "encouraging";
      }
      // celebrating when showing completion/profile cards
      if (cards.some((c) => c.kind === "profile-summary")) nextMood = "celebrating";
      break;
    }
    case "item":
      nextAction = null;
      nextMood = "explaining";
      reply = handleItem(payload, ctx, content);
      if (reply.cards?.some((c) => c.badge === "Completed")) nextMood = "celebrating";
      // if card is locked, show encouraging mood
      if (reply.cards?.some((c) => c.status === "locked")) nextMood = "encouraging";
      break;
    default:
      reply = guideTurn("I didn't catch that.", undefined);
      break;
  }

  return {
    turns: [...newTurns, reply],
    intent: nextIntent,
    topicId: nextTopic,
    action: nextAction,
    mascotMood: nextMood,
    selectedPill: pill,
  };
};

const guideTurnWithCards = (text: string, cards: GuideCard[]): GuideTurn => ({
  id: nid(),
  role: "guide",
  text,
  cards,
  utilities: [startOverPill],
});
