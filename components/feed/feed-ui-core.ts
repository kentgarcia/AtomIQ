/**
 * The pure parts of the feed screens (docs/features/NPC_FEED_SPEC.md §3, §4, §11): relative times, the words
 * a screen reader hears, where a chip leads, the Ranks captions and which items are new. No React,
 * no theme: erasable syntax and `.ts` import extensions so `node --test` runs it
 * (`scripts/test-feed-ui.mjs`).
 */

import type { FeedChipKind, Reaction } from "../../content/types.ts";

/* ------------------------------------------------------------------ */
/* Time                                                                */
/* ------------------------------------------------------------------ */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** "now", "5m", "2h", "3d", "2w": the short time beside a post's author. A time in the future reads "now". */
export function relativeTime(createdAt: number, now: number): string {
  const diff = Math.max(0, now - createdAt);
  if (diff < MIN) return "now";
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d`;
  return `${Math.floor(diff / WEEK)}w`;
}

const plural = (n: number, unit: string): string => `${n} ${unit}${n === 1 ? "" : "s"}`;

/** The same time in words for a screen reader: "just now", "5 minutes ago", "1 hour ago". */
export function relativeTimeSpoken(createdAt: number, now: number): string {
  const diff = Math.max(0, now - createdAt);
  if (diff < MIN) return "just now";
  if (diff < HOUR) return `${plural(Math.floor(diff / MIN), "minute")} ago`;
  if (diff < DAY) return `${plural(Math.floor(diff / HOUR), "hour")} ago`;
  if (diff < WEEK) return `${plural(Math.floor(diff / DAY), "day")} ago`;
  return `${plural(Math.floor(diff / WEEK), "week")} ago`;
}

/* ------------------------------------------------------------------ */
/* Reactions                                                           */
/* ------------------------------------------------------------------ */

export const REACTION_ORDER: readonly Reaction[] = ["like", "love", "clap", "wow"];

export const REACTION_NAMES: Record<Reaction, string> = { like: "Like", love: "Love", clap: "Clap", wow: "Wow" };

/** The subset of a reaction summary the words need (so tests need no service). */
export interface ReactionFacts {
  total: number;
  others: number;
  mine: Reaction | null;
}

/** The small line beside the stack: "You and 3 others", "3 others", "You", or "" when nobody reacted. */
export function reactionLine(s: ReactionFacts): string {
  if (s.total === 0) return "";
  if (s.mine) return s.others === 0 ? "You" : `You and ${plural(s.others, "other")}`;
  return plural(s.others, "other");
}

/** What a screen reader hears for the whole reaction summary: "3 reactions, including yours: clap". */
export function reactionSpoken(s: ReactionFacts): string {
  if (s.total === 0) return "No reactions yet";
  const base = plural(s.total, "reaction");
  return s.mine ? `${base}, including yours: ${s.mine}` : base;
}

/** The learner's button: a labelled toggle, "React: clap, selected" or "React". */
export function reactButtonLabel(mine: Reaction | null): string {
  return mine ? `React: ${mine}, selected` : "React";
}

/** A picker button. */
export function pickerButtonLabel(reaction: Reaction, mine: Reaction | null): string {
  return mine === reaction ? `${REACTION_NAMES[reaction]}, selected. Tap to remove` : REACTION_NAMES[reaction];
}

/** "2 Clap, 1 Love": the rows of the "who reacted" sheet grouped by reaction, most used first. */
export function groupReactors<T extends { reaction: Reaction }>(rows: readonly T[]): { reaction: Reaction; rows: T[] }[] {
  const groups = REACTION_ORDER.map((reaction) => ({ reaction, rows: rows.filter((r) => r.reaction === reaction) })).filter((g) => g.rows.length > 0);
  return groups.sort((a, b) => b.rows.length - a.rows.length || REACTION_ORDER.indexOf(a.reaction) - REACTION_ORDER.indexOf(b.reaction));
}

/* ------------------------------------------------------------------ */
/* Chips and where they lead                                           */
/* ------------------------------------------------------------------ */

/** A route the screens open with `router.push` / `router.navigate`; a tab is navigated to, the rest pushed. */
export interface FeedTarget {
  href: string;
  /** `tab` switches tab (Home, Quests); `push` opens a screen on top. */
  how: "tab" | "push";
}

export const HOME_HREF = "/(tabs)";
export const QUESTS_HREF = "/(tabs)/quests";
export const RANKS_HREF = "/ranks";
export const ENCYCLOPEDIA_HREF = "/encyclopedia";
export const BLOGS_HREF = "/blogs";
/** The posts the learner has reacted to (the third Discover shortcut). */
export const REACTED_HREF = "/reacted";
export const PROFILE_HREF = "/(tabs)/profile";

export const lessonHref = (lessonId: string): string => `/lesson/${encodeURIComponent(lessonId)}`;
/** A teacher's profile page. */
export const npcHref = (npcId: string): string => `/npc/${encodeURIComponent(npcId)}`;
export const blogHref = (blogId: string): string => `/blog/${encodeURIComponent(blogId)}`;
export const entryHref = (entryId: string): string => `/explorer/encyclopedia-entry?id=${encodeURIComponent(entryId)}`;

/** What a feed chip opens: the lesson, the unit on the Home map, Quests, or Ranks. `null` when it has nothing to open. */
export function chipTarget(chip: { kind: FeedChipKind; target: string | null }): FeedTarget | null {
  switch (chip.kind) {
    case "lesson":
      return chip.target ? { href: lessonHref(chip.target), how: "push" } : null;
    case "unit":
      return { href: HOME_HREF, how: "tab" };
    case "quests":
      return { href: QUESTS_HREF, how: "tab" };
    case "ranks":
      return { href: RANKS_HREF, how: "push" };
    default:
      return null;
  }
}

export const CHIP_LABELS: Record<FeedChipKind, string> = {
  lesson: "Open lesson",
  unit: "See on the map",
  quests: "Open Quests",
  ranks: "See the ranking",
};

/**
 * What a comment's chip opens: a lesson or an encyclopedia entry. A lesson the learner has not
 * unlocked yet (`lockedLessonIds`) comes back with `locked: true`, and the screen shows it shut.
 */
export function commentChipTarget(
  chip: { lessonId?: string; entryId?: string } | null,
  lockedLessonIds: ReadonlySet<string> | readonly string[] = [],
): { target: FeedTarget; label: string; locked: boolean } | null {
  if (!chip) return null;
  if (chip.lessonId) {
    const locked = Array.isArray(lockedLessonIds) ? lockedLessonIds.includes(chip.lessonId) : (lockedLessonIds as ReadonlySet<string>).has(chip.lessonId);
    return { target: { href: lessonHref(chip.lessonId), how: "push" }, label: locked ? "Lesson locked" : "Open lesson", locked };
  }
  if (chip.entryId) return { target: { href: entryHref(chip.entryId), how: "push" }, label: "Open entry", locked: false };
  return null;
}

/** What a blog `next` block opens: the lesson, or the unit on the Home map. */
export function nextTarget(block: { lessonId?: string; unitId?: string }): FeedTarget | null {
  if (block.lessonId) return { href: lessonHref(block.lessonId), how: "push" };
  if (block.unitId) return { href: HOME_HREF, how: "tab" };
  return null;
}

/* ------------------------------------------------------------------ */
/* Words for screen readers                                            */
/* ------------------------------------------------------------------ */

/** One post is one accessible item: "Ada, Atom teacher, 2 hours ago: text. 3 reactions". */
export function postSpokenLabel(p: { name: string; title: string; when: string; text: string; reactions: string }): string {
  return `${p.name}, ${p.title}, ${p.when}: ${p.text}. ${p.reactions}`;
}

/** One blog card as one item: "Blog piece by Ada, 3 min read, 2 hours ago: title. hook. 3 reactions". */
export function blogSpokenLabel(p: { name: string; when: string; title: string; hook: string; readMin: number; reactions: string }): string {
  return `Blog piece by ${p.name}, ${p.readMin} min read, ${p.when}: ${p.title}. ${p.hook}. ${p.reactions}`;
}

/** A blog comment as read aloud: "Mina, comment: text". */
export const commentSpokenLabel = (name: string, text: string): string => `${name}, comment: ${text}`;

/** The reading time shown on a blog card and in the reader: "3 min read". */
export const readTimeLabel = (readMin: number): string => `${Math.max(1, Math.round(readMin))} min read`;

/* ------------------------------------------------------------------ */
/* Ranks                                                               */
/* ------------------------------------------------------------------ */

/** 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st. */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "Week of 16 Nov" from a `YYYY-MM-DD` Monday; the key itself when it is not a date. */
export function weekCaption(weekKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekKey);
  if (!m) return weekKey;
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return weekKey;
  return `Week of ${Number(m[3])} ${month}`;
}

/** The Ranks entry card line: "You are 3rd this week", or an invitation while the learner has no XP yet. */
export function rankEntryLine(learnerRank: number, learnerXp: number): string {
  return learnerXp > 0 ? `You are ${ordinal(learnerRank)} this week` : "See how you compare this week";
}

/** "120 XP". */
export const xpLabel = (xp: number): string => `${Math.max(0, Math.round(xp))} XP`;

/** A rank row as one item: "3rd, Mina, 120 XP" (the learner's is marked "you"). */
export function rankRowSpoken(r: { rank: number; name: string; xp: number; isLearner: boolean }): string {
  return `${ordinal(r.rank)}, ${r.isLearner ? `${r.name}, you` : r.name}, ${xpLabel(r.xp)}`;
}

/* ------------------------------------------------------------------ */
/* New items                                                           */
/* ------------------------------------------------------------------ */

/**
 * Ids in `items` that were not in `known`: the ones that fade in. On the first load `known` is `null`
 * and nothing is new, so a screen that opens does not animate the whole list.
 */
export function newItemIds(known: ReadonlySet<string> | null, items: readonly { id: string }[]): string[] {
  if (!known) return [];
  return items.filter((i) => !known.has(i.id)).map((i) => i.id);
}

/** Wait before each new post lands, so they arrive one by one. */
export const DRIP_MS = 520;
/** More than this many arrivals at once: the older ones are just there, only the newest few land one by one. */
export const DRIP_MAX = 5;

/**
 * Arrivals the list has not shown yet, as a plan: `instant` appear at once (the overflow, oldest first),
 * `queued` land one by one, oldest first, so the newest post ends on top. `shown` is `null` on the first
 * load, when everything is simply there.
 */
export function dripPlan(shown: ReadonlySet<string> | null, items: readonly { id: string }[], max: number = DRIP_MAX): { instant: string[]; queued: string[] } {
  if (!shown) return { instant: items.map((i) => i.id), queued: [] };
  const pending = items.filter((i) => !shown.has(i.id)).map((i) => i.id).reverse();
  const cut = Math.max(0, pending.length - max);
  return { instant: pending.slice(0, cut), queued: pending.slice(cut) };
}

/* ------------------------------------------------------------------ */
/* The flat post layout: action phrase, figure pose, "Liked by" line   */
/* ------------------------------------------------------------------ */

export type FeedKindName = "celebrate" | "milestone" | "nudge" | "tease";
export type FigurePose = "idle" | "greet" | "explain" | "point" | "think" | "proud" | "cheer" | "sorry";

/** The light phrase after the poster's name by post kind: "cheered you on", "shared a milestone", "has a nudge", "has a teaser". */
export const KIND_ACTIONS: Record<FeedKindName, string> = {
  celebrate: "cheered you on",
  milestone: "shared a milestone",
  nudge: "has a nudge",
  tease: "has a teaser",
};

/** The same pose for each kind of post, for the figure beside the bubble. */
export const KIND_POSES: Record<FeedKindName, FigurePose> = { celebrate: "cheer", milestone: "proud", nudge: "point", tease: "think" };

/**
 * A feed item does not carry its template kind yet, so when `kind` is missing the chip stands in for
 * it (a lesson chip is a celebration, a map chip a milestone, a Quests chip a nudge, a ranking chip a
 * teaser). A blog card is always "wrote a blog piece".
 */
const KIND_FROM_CHIP: Record<string, FeedKindName> = { lesson: "celebrate", unit: "milestone", quests: "nudge", ranks: "tease" };

export function resolveKind(p: { kind?: FeedKindName | null; chipKind?: string | null }): FeedKindName {
  if (p.kind) return p.kind;
  return (p.chipKind && KIND_FROM_CHIP[p.chipKind]) || "celebrate";
}

/** The phrase after "You" for a post written from the learner's own point of view. */
export const LEARNER_ACTIONS: Record<FeedKindName, string> = {
  celebrate: "celebrated",
  milestone: "reached a milestone",
  nudge: "left a note",
  tease: "left a note",
};

/** "cheered you on" etc.; a blog card is "wrote a blog piece"; the learner's own post is "reached a milestone" etc. */
export function actionPhrase(p: { blog?: boolean; kind?: FeedKindName | null; chipKind?: string | null; learner?: boolean }): string {
  if (p.blog) return "wrote a blog piece";
  return p.learner ? LEARNER_ACTIONS[resolveKind(p)] : KIND_ACTIONS[resolveKind(p)];
}

export const figurePose = (p: { kind?: FeedKindName | null; chipKind?: string | null }): FigurePose => KIND_POSES[resolveKind(p)];

/** Line 2 of a post header: "2h · Atom teacher". */
export const metaLine = (when: string, title: string): string => (title ? `${when} · ${title}` : when);

export interface TextSegment {
  text: string;
  bold: boolean;
}

/**
 * "Liked by Mina and others" as styled pieces (names bold, the rest regular). `names` are the heads
 * shown (up to 3), `others` everyone but the learner. Nothing when no NPC reacted (an empty list), so
 * the line is left out.
 *   1 reactor: Liked by Mina       2: Liked by Mina and Hal       3 or more: Liked by Mina and 2 others
 * When the learner reacted too, "You" leads: Liked by You / You and Mina / You, Mina and 2 others.
 */
export function likedBySegments(names: readonly string[], others: number, mine = false): TextSegment[] {
  const lead: TextSegment = { text: "Liked by ", bold: false };
  if (mine) {
    // The learner's own reaction leads the line: "Liked by You", "You and Mina", "You, Mina and 2 others"
    const you: TextSegment = { text: "You", bold: true };
    if (others <= 0) return [lead, you];
    const first: TextSegment = names.length > 0 ? { text: names[0], bold: true } : { text: plural(others, "other"), bold: false };
    if (others === 1 || names.length === 0) return [lead, you, { text: " and ", bold: false }, first];
    return [lead, you, { text: ", ", bold: false }, first, { text: " and ", bold: false }, { text: plural(others - 1, "other"), bold: false }];
  }
  if (others <= 0) return [];
  if (names.length === 0) return [lead, { text: plural(others, "other"), bold: false }];
  const first: TextSegment = { text: names[0], bold: true };
  if (others === 1) return [lead, first];
  if (others === 2 && names.length >= 2) return [lead, first, { text: " and ", bold: false }, { text: names[1], bold: true }];
  const rest = others - 1;
  return [lead, first, { text: " and ", bold: false }, { text: plural(rest, "other"), bold: false }];
}

/** The same line as one string for a screen reader. */
export const likedBySpoken = (segments: readonly TextSegment[]): string => segments.map((s) => s.text).join("");

/** The pill label: "Like, 6 reactions", "React: clap, selected, 3 reactions". */
export function reactPillLabel(mine: Reaction | null, total: number): string {
  const base = reactButtonLabel(mine);
  return total > 0 ? `${base}, ${plural(total, "reaction")}` : base;
}

/** The Weekly ranking banner: the big line and the small one under it. */
export function rankBannerLines(
  rank: number,
  xp: number,
  above: string | null,
): { title: string; sub: string } {
  if (xp <= 0) return { title: "Weekly ranking", sub: "Be the first to earn XP this week" };
  const title = `You're ${ordinal(rank)} this week`;
  if (rank <= 1) return { title, sub: "You lead the table" };
  return { title, sub: above ? `Pass ${above} to climb` : "Keep going to climb" };
}

/** The shortcut circles at the top of Discover (the Feed tab), in order. Blogs lists every unlocked blog piece. */
export const SHORTCUTS = [
  { key: "encyclopedia", label: "AtomDex", icon: "Book", href: "/encyclopedia" },
  { key: "periodic", label: "Periodic table", icon: "Element4", href: "/periodic-table" },
  { key: "reacted", label: "Reacted", icon: "Heart", href: REACTED_HREF },
  { key: "blogs", label: "Blogs", icon: "DocumentText", href: BLOGS_HREF },
] as const;

/** The button beside the reaction pill on a blog card: "View 2 comments", "View 1 comment"; `null` when there are none. */
export function commentsLabel(count: number): string | null {
  if (!Number.isFinite(count) || count < 1) return null;
  const n = Math.floor(count);
  return `View ${n} ${n === 1 ? "comment" : "comments"}`;
}
