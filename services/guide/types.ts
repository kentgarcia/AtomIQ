/**
 * AtomIQ Guide — domain types.
 *
 * AtomIQ Guide is a rule-based, pill-driven navigation system. There is no
 * free-text input; the user advances entirely by tapping predefined pills.
 * Every type below is consumed by the deterministic rule engine
 * (`services/guide/engine.ts`) and the conversation UI (`app/(tabs)/chat.tsx`).
 */

export type GuideIntent =
  | "learn" // I want to learn about...
  | "explore" // I want to explore...
  | "discover" // I want to discover...
  | "practice" // I want to test myself...
  | "review" // I want to review...
  | "continue" // I want to continue learning...
  | "progress"; // I want to see my progress...

export type PillKind = "intent" | "topic" | "category" | "action" | "item" | "utility";

export interface GuidePill {
  id: string;
  label: string;
  kind: PillKind;
  icon?: string;
  /** Machine payload consumed by the engine on selection. */
  payload:
    | { type: "intent"; intent: GuideIntent }
    | { type: "topic"; topicId: string }
    | { type: "category"; categoryId: string }
    | {
        type: "action";
        action: GuideAction;
        destination?: GuideDestination;
        /** Aggregate selectors pick the best item at selection time. */
        aggregate?:
          | "recommended-lesson"
          | "recommended-game"
          | "weak-quiz"
          | "topic-quiz"
          | "topic-game"
          | "topic-encyclopedia"
          | "topic-articles"
          | "review-lesson"
          | "review-encyclopedia"
          | "retry-quiz"
          | "random-game";
        /** Optional reference id (quiz id, unit id, topic id) for context. */
        refId?: string;
      }
    | { type: "item"; itemId: string; itemKind: GuideCard["kind"] }
    | { type: "utility"; utility: "change-topic" | "start-over" };
}

export type GuideAction =
  | "start_lesson"
  | "read_encyclopedia"
  | "read_article"
  | "play_game"
  | "take_quiz"
  | "open_profile"
  | "open_feature";

/**
 * Every destination maps to a real, verified expo-router path in this repo.
 * The UI translates these into `router.push` calls — never to a generated URL.
 */
export type GuideDestination =
  | { screen: "lesson"; id: string } // /lesson/${id}
  | { screen: "quiz"; id: string } // /quiz/${id}
  | { screen: "encyclopedia-entry"; id: string } // /explorer/encyclopedia-entry?id=${id}
  | { screen: "article"; id: string } // /article-detail?id=${id}
  | { screen: "maze"; id: string } // /explorer/atom-maze?id=${id}
  | { screen: "journey"; id: string } // /explorer/journey?id=${id}
  | { screen: "mythbuster" } // /mythbuster
  | { screen: "tab-discover" } // /(tabs)/community
  | { screen: "tab-games" } // /(tabs)/awards
  | { screen: "tab-profile" } // /(tabs)/profile
  | { screen: "encyclopedia-list" }; // /encyclopedia

export interface GuideCard {
  kind: "lesson" | "quiz" | "encyclopedia" | "article" | "game" | "profile-summary";
  title: string;
  subtitle?: string; // e.g. "Unit 2 • Beginner"
  body?: string; // description / excerpt / summary lines
  destination: GuideDestination;
  ctaLabel: string; // e.g. "Start Lesson →"
  badge?: string; // e.g. "Needs Review"
  status?: "available" | "completed" | "locked" | "recommended";
  reward?: string; // e.g. "+50 XP"
  duration?: string; // e.g. "5 min"
}

export interface GuideTurn {
  id: string;
  role: "guide" | "user";
  /** Bot prompt text (guide turns) or the chosen pill label (user turns). */
  text: string;
  /** Present on unanswered guide turns and answered guide turns (so the
   *  "Change" affordance can restore them). */
  pills?: GuidePill[];
  /** Terminal turns render one or more cards instead of pills. */
  cards?: GuideCard[];
  /** Optional utility row appended below a guide turn (Start Over, etc.). */
  utilities?: GuidePill[];
}

export interface GuideProfile {
  displayName: string;
  totalXp: number;
  level: number;
  mythsBusted: number;
  lessonsCompleted: number;
}

export interface GuideContext {
  profile: GuideProfile;
  currentLevelId: string | null; // first levels row with status 'current' & type 'lesson'
  currentUnitId: string | null;
  completedIds: string[];
  weakQuizIds: string[]; // completed quizzes with stars<=1 && attempts>1
  unlockedUnitIds: string[];
}

export type MascotMood = "greeting" | "thinking" | "excited" | "explaining" | "celebrating" | "encouraging";

export interface GuideState {
  turns: GuideTurn[];
  intent: GuideIntent | null;
  topicId: string | null;
  action: GuideAction | null;
  mascotMood: MascotMood;
  selectedPill: GuidePill | null;
}
