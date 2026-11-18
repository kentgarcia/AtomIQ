/**
 * Achievements that rank up (framework-free, no imports).
 *
 * Each achievement is a track: one number from the profile (lessons done, myths busted, best
 * streak, XP) and a list of thresholds. Reaching a threshold earns the next badge level. A track
 * has up to 12 levels, matching the 12 badge pictures in `assets/images/badge/<badgeDir>/<level>.png`.
 *
 * The same ids as before (1 to 4) are kept (5 and 6 are new) so saved links to the detail screen still work.
 */

/** Where a track's number comes from: a profile column, the quest counter, or the level (from XP). */
export type AchievementField =
  | "lessons_completed"
  | "myths_busted"
  | "longest_streak"
  | "total_xp"
  | "quests_claimed"
  | "level";

/** XP per level, the same rule the level-up pop-up uses (`StorageContext`). */
export const XP_PER_LEVEL = 100;
export const levelFromXp = (xp: number): number => Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;

/** The numbers the tracks read: the profile plus `quests_claimed`. */
export type AchievementSource = Record<string, unknown> | null | undefined;

/** The current number for a track. */
export const achievementValue = (track: { field: AchievementField }, source: AchievementSource): number => {
  const num = (key: string) => {
    const n = Number(source?.[key] ?? 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  return track.field === "level" ? levelFromXp(num("total_xp")) : num(track.field);
};

export interface AchievementTrack {
  /** Stable number used in routes (`/achievement-detail?achievementId=`) and in saved levels. */
  id: number;
  title: string;
  field: AchievementField;
  /** Folder of the badge pictures under `assets/images/badge/`. */
  badgeDir: "lessons-learned" | "myth-buster" | "streak" | "xp" | "quests-claimed" | "level-reached";
  /** Value needed for each level, ascending. Level n needs `tiers[n - 1]`. */
  tiers: readonly number[];
  /** Plain-words requirement for reaching a threshold, e.g. "Complete 5 lessons". */
  requirement: (threshold: number) => string;
  description: string;
  tips: readonly string[];
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const ACHIEVEMENTS: readonly AchievementTrack[] = [
  {
    id: 1,
    title: "Lessons Learned",
    field: "lessons_completed",
    badgeDir: "lessons-learned",
    tiers: [1, 3, 5, 10, 15, 25, 35, 50, 75, 100, 150, 200],
    requirement: (n) => `Complete ${n} ${plural(n, "lesson", "lessons")}`,
    description:
      "Every lesson you finish ranks this badge up. It starts with your very first step into nuclear science and keeps growing as you learn.",
    tips: ["Open the Home map and start the next lesson", "Finish a lesson to count it, even if you have done it before", "A little each day adds up fast"],
  },
  {
    id: 2,
    title: "Myth Buster",
    field: "myths_busted",
    badgeDir: "myth-buster",
    tiers: [1, 3, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300],
    requirement: (n) => `Bust ${n} ${plural(n, "myth", "myths")}`,
    description:
      "You are getting good at telling fact from fiction. Each myth you bust in the Myth Buster game moves this badge up a level.",
    tips: ["Play the Myth Buster game regularly", "Read each claim carefully before you answer", "Think about what the science really says"],
  },
  {
    id: 3,
    title: "On Fire",
    field: "longest_streak",
    badgeDir: "streak",
    tiers: [1, 3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 365],
    requirement: (n) => `Reach a ${n} day streak`,
    description:
      "Keep your learning streak alive. Your longest streak sets this badge's level, so even a streak that ended still counts.",
    tips: ["Open AtomIQ once a day, that alone keeps the streak", "Do a quick quest on busy days", "Do not break the chain"],
  },
  {
    id: 4,
    title: "XP Master",
    field: "total_xp",
    badgeDir: "xp",
    tiers: [50, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000, 15000, 25000],
    requirement: (n) => `Earn ${n.toLocaleString("en-US")} XP`,
    description:
      "Experience points show how much you have learned. Lessons, quizzes, quests and games all add to your total.",
    tips: ["Complete lessons to earn XP", "Claim your quests for bonus XP", "Play the games to top it up"],
  },
  {
    id: 5,
    title: "Quest Crusher",
    field: "quests_claimed",
    badgeDir: "quests-claimed",
    tiers: [1, 3, 5, 10, 20, 35, 50, 75, 100, 150, 200, 300],
    requirement: (n) => `Claim ${n} ${plural(n, "quest", "quests")}`,
    description:
      "Daily and weekly quests are small goals that keep you learning. Every quest you claim counts toward this badge. Quests claimed before this badge existed are not counted.",
    tips: ["Open the Quests tab each day", "Tap Claim on a finished quest to count it", "Weekly quests count too"],
  },
  {
    id: 6,
    title: "Level Up",
    field: "level",
    badgeDir: "level-reached",
    tiers: [2, 3, 5, 8, 10, 15, 20, 30, 40, 50, 75, 100],
    requirement: (n) => `Reach level ${n}`,
    description:
      "Your level goes up every 100 XP. Reach new levels to rank this badge up.",
    tips: ["Finish lessons to earn XP", "Claim quests for bonus XP", "Play the games to top up your XP"],
  },
];

export const achievementById = (id: number): AchievementTrack | undefined =>
  ACHIEVEMENTS.find((a) => a.id === id);

export const maxLevel = (track: AchievementTrack): number => track.tiers.length;

/** How many levels a value has earned: 0 when below the first threshold. */
export const levelFor = (track: AchievementTrack, value: number): number => {
  let level = 0;
  for (const threshold of track.tiers) {
    if (value >= threshold) level += 1;
    else break;
  }
  return level;
};

export interface AchievementProgress {
  /** Levels earned, 0 to `maxLevel`. */
  level: number;
  maxLevel: number;
  maxed: boolean;
  value: number;
  /** Threshold of the next level, or null at the top. */
  next: number | null;
  /** 0 to 1 toward the next level (1 at the top). */
  ratio: number;
  /** The badge picture to show: the level earned, or level 1 (dimmed) while nothing is earned. */
  badgeLevel: number;
  earned: boolean;
}

export const progressFor = (track: AchievementTrack, rawValue: number): AchievementProgress => {
  const value = Number.isFinite(rawValue) && rawValue > 0 ? Math.floor(rawValue) : 0;
  const level = levelFor(track, value);
  const top = maxLevel(track);
  const maxed = level >= top;
  const next = maxed ? null : track.tiers[level];
  return {
    level,
    maxLevel: top,
    maxed,
    value,
    next,
    ratio: next === null ? 1 : Math.min(1, value / next),
    badgeLevel: Math.max(1, level),
    earned: level > 0,
  };
};

/** Saved levels, keyed by achievement id. */
export type AchievementLevels = Record<string, number>;

export const levelsFromProfile = (source: AchievementSource): AchievementLevels => {
  const out: AchievementLevels = {};
  for (const track of ACHIEVEMENTS) {
    out[String(track.id)] = levelFor(track, achievementValue(track, source));
  }
  return out;
};

export interface LevelUp {
  id: number;
  from: number;
  to: number;
}

/** Tracks whose level went up since `saved` (a missing entry counts as level 0). */
export const levelUps = (saved: AchievementLevels, now: AchievementLevels): LevelUp[] => {
  const ups: LevelUp[] = [];
  for (const track of ACHIEVEMENTS) {
    const from = Math.max(0, Math.floor(Number(saved[String(track.id)] ?? 0)) || 0);
    const to = now[String(track.id)] ?? 0;
    if (to > from) ups.push({ id: track.id, from, to });
  }
  return ups;
};

/** Merge, keeping the higher level so a level is never lost (a streak can reset, `longest` cannot). */
export const mergeLevels = (saved: AchievementLevels, now: AchievementLevels): AchievementLevels => {
  const out: AchievementLevels = { ...saved };
  for (const [id, level] of Object.entries(now)) out[id] = Math.max(out[id] ?? 0, level);
  return out;
};
