/**
 * Activity tracker — framework-free core (docs/ACTIVITY_TRACKER.md).
 *
 * Pure date-key math, the intensity scale, dedupe rules, heat-map grid layout,
 * summaries, a model of the existing app-open streak, and a storage-agnostic
 * engine. No React Native, no path aliases, no enums, relative imports only,
 * so it runs under plain `node --test` (Node strips the TS types).
 *
 * Time model
 * - A "day key" is the LOCAL calendar date `YYYY-MM-DD` at the moment of the
 *   event. It is computed from an instant plus a timezone offset expressed
 *   like `Date#getTimezoneOffset()` (minutes, UTC minus local; positive west
 *   of Greenwich). The offset is injected (`Clock`), never read from process
 *   state in the pure functions, so tests can simulate any timezone / DST day.
 * - Day arithmetic is civil-calendar arithmetic (UTC date math on the key),
 *   so DST (23/25 hour days) never skips or repeats a key.
 */

/* ------------------------------------------------------------------ */
/* Kinds, weights, dedupe policy                                       */
/* ------------------------------------------------------------------ */

export const ACTIVITY_KINDS = [
  "lesson_step",
  "lesson_complete",
  "quiz_attempt",
  "quiz_complete",
  "lab_session",
  "game_session",
  "article_read",
  "periodic_table_explore",
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export interface KindPolicy {
  /** Points toward the day's intensity per counted event. */
  weight: number;
  /** Max counted events per distinct id per day (id-less events share one id). */
  maxPerId: number;
  /** Max counted events of this kind per day, across all ids. */
  maxPerDay: number;
  /** Plain-words label: [singular, plural]. */
  label: [string, string];
}

/**
 * Light anti-farming rules. Repeating the same action never counts more than
 * `maxPerId` times a day, and no kind counts more than `maxPerDay` times.
 */
export const KIND_POLICY: Record<ActivityKind, KindPolicy> = {
  lesson_step: { weight: 1, maxPerId: 1, maxPerDay: 60, label: ["lesson step", "lesson steps"] },
  lesson_complete: { weight: 2, maxPerId: 1, maxPerDay: 10, label: ["lesson completed", "lessons completed"] },
  quiz_attempt: { weight: 1, maxPerId: 3, maxPerDay: 10, label: ["quiz attempt", "quiz attempts"] },
  quiz_complete: { weight: 2, maxPerId: 1, maxPerDay: 10, label: ["quiz completed", "quizzes completed"] },
  lab_session: { weight: 2, maxPerId: 1, maxPerDay: 10, label: ["lab session", "lab sessions"] },
  game_session: { weight: 2, maxPerId: 5, maxPerDay: 10, label: ["game session", "game sessions"] },
  article_read: { weight: 1, maxPerId: 1, maxPerDay: 10, label: ["article read", "articles read"] },
  periodic_table_explore: { weight: 1, maxPerId: 1, maxPerDay: 10, label: ["periodic table exploration", "periodic table explorations"] },
};

export const isActivityKind = (value: unknown): value is ActivityKind =>
  typeof value === "string" && (ACTIVITY_KINDS as readonly string[]).includes(value);

/* ------------------------------------------------------------------ */
/* Intensity scale                                                     */
/* ------------------------------------------------------------------ */

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Minimum weighted points for levels 1..4.
 * 0: none · 1: 1 point · 2: 2-3 · 3: 4-6 · 4: 7 or more (the ceiling).
 */
export const LEVEL_MIN_POINTS = [1, 2, 4, 7] as const;

export const levelForPoints = (points: number): ActivityLevel => {
  if (!Number.isFinite(points) || points < LEVEL_MIN_POINTS[0]) return 0;
  if (points >= LEVEL_MIN_POINTS[3]) return 4;
  if (points >= LEVEL_MIN_POINTS[2]) return 3;
  if (points >= LEVEL_MIN_POINTS[1]) return 2;
  return 1;
};

export const LEVEL_DESCRIPTIONS: Record<ActivityLevel, string> = {
  0: "no activity",
  1: "light activity",
  2: "some activity",
  3: "busy day",
  4: "very busy day",
};

/* ------------------------------------------------------------------ */
/* Dates (local day keys)                                              */
/* ------------------------------------------------------------------ */

export interface Clock {
  /** Epoch milliseconds. */
  ms: number;
  /** Minutes, `Date#getTimezoneOffset()` convention (UTC - local). */
  offsetMin: number;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Local calendar date key for an instant in a given timezone offset. */
export const dayKeyFromInstant = (ms: number, offsetMin: number): string => {
  const shifted = new Date(ms - offsetMin * 60_000);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
};

/** Local calendar date key of a `Date` using the device's own local parts. */
export const dayKeyFromLocalDate = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const clockNow = (): Clock => {
  const d = new Date();
  return { ms: d.getTime(), offsetMin: d.getTimezoneOffset() };
};

const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const isDayKey = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const m = KEY_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
};

const keyToUtcMs = (key: string): number => {
  const m = KEY_RE.exec(key);
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

const utcMsToKey = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
};

export const addDays = (key: string, days: number): string =>
  utcMsToKey(keyToUtcMs(key) + days * 86_400_000);

/** Whole civil days from `a` to `b` (b - a). */
export const daysBetween = (a: string, b: string): number =>
  Math.round((keyToUtcMs(b) - keyToUtcMs(a)) / 86_400_000);

/** 0 = Sunday ... 6 = Saturday. */
export const weekdayOf = (key: string): number => new Date(keyToUtcMs(key)).getUTCDay();

export const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** "Tuesday 4 March" (year added when `withYear`). */
export const formatDayLong = (key: string, withYear = false): string => {
  const m = KEY_RE.exec(key);
  if (!m) return key;
  const base = `${WEEKDAY_NAMES[weekdayOf(key)]} ${Number(m[3])} ${MONTH_NAMES[Number(m[2]) - 1]}`;
  return withYear ? `${base} ${m[1]}` : base;
};

/** Parse a stored timestamp: ISO-8601, or SQLite `YYYY-MM-DD HH:MM:SS` (UTC). */
export const parseStoredTimestamp = (value: unknown): number | null => {
  if (typeof value !== "string" || value.length < 10) return null;
  const sqlite = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(\.\d+)?$/.exec(value);
  const ms = Date.parse(sqlite ? `${sqlite[1]}T${sqlite[2]}${sqlite[3] ?? ""}Z` : value);
  return Number.isFinite(ms) ? ms : null;
};

/* ------------------------------------------------------------------ */
/* Day record                                                          */
/* ------------------------------------------------------------------ */

export interface DayRecord {
  /** Local calendar date key. */
  date: string;
  /** Counted events per kind. */
  counts: Partial<Record<ActivityKind, number>>;
  /** Counted events across all kinds. */
  total: number;
  /** Weighted points (drives `level`). */
  points: number;
  level: ActivityLevel;
  /** Dedupe ledger: kind -> id -> times counted. */
  seen: Partial<Record<ActivityKind, Record<string, number>>>;
  /** ISO timestamp of the last event written to this day (diagnostics). */
  lastEventAt: string;
  /** Timezone offset (getTimezoneOffset minutes) at that last event. */
  lastTzOffsetMin: number;
  /** True when any counts on this day came from the one-time history import. */
  imported?: boolean;
}

export const emptyDay = (date: string): DayRecord => ({
  date,
  counts: {},
  total: 0,
  points: 0,
  level: 0,
  seen: {},
  lastEventAt: "",
  lastTzOffsetMin: 0,
});

const NO_ID = "_";
const MAX_ID_LENGTH = 80;

const normalizeId = (id: unknown): string => {
  if (id === undefined || id === null || id === "") return NO_ID;
  return String(id).slice(0, MAX_ID_LENGTH);
};

/**
 * Apply one event to a day record. Returns the SAME object when the event is
 * deduped (nothing to persist), otherwise a new record. Never decrements.
 */
export const applyEvent = (
  record: DayRecord,
  kind: ActivityKind,
  meta: { id?: string | number } | undefined,
  at: { ms: number; offsetMin: number },
  options: { imported?: boolean } = {},
): DayRecord => {
  const policy = KIND_POLICY[kind];
  if (!policy) return record;
  const id = normalizeId(meta?.id);
  const kindCount = record.counts[kind] ?? 0;
  const idCount = record.seen[kind]?.[id] ?? 0;
  if (kindCount >= policy.maxPerDay || idCount >= policy.maxPerId) return record;

  const counts = { ...record.counts, [kind]: kindCount + 1 };
  const seen = { ...record.seen, [kind]: { ...record.seen[kind], [id]: idCount + 1 } };
  const points = record.points + policy.weight;
  const next: DayRecord = {
    ...record,
    counts,
    seen,
    total: record.total + 1,
    points,
    level: levelForPoints(points),
    lastEventAt: new Date(at.ms).toISOString(),
    lastTzOffsetMin: at.offsetMin,
  };
  if (options.imported) next.imported = true;
  return next;
};

/** Defensive parse of a persisted record (tolerates old/corrupt rows). */
export const sanitizeDay = (raw: any): DayRecord | null => {
  if (!raw || !isDayKey(raw.date)) return null;
  const base = emptyDay(raw.date);
  let points = 0;
  let total = 0;
  for (const kind of ACTIVITY_KINDS) {
    const n = Math.max(0, Math.floor(Number(raw.counts?.[kind]) || 0));
    if (n > 0) {
      base.counts[kind] = n;
      total += n;
      points += n * KIND_POLICY[kind].weight;
    }
    const ledger = raw.seen?.[kind];
    if (ledger && typeof ledger === "object") {
      const clean: Record<string, number> = {};
      for (const [id, c] of Object.entries(ledger)) {
        const v = Math.max(0, Math.floor(Number(c) || 0));
        if (v > 0) clean[String(id).slice(0, MAX_ID_LENGTH)] = v;
      }
      base.seen[kind] = clean;
    }
  }
  base.total = total;
  base.points = points;
  base.level = levelForPoints(points);
  base.lastEventAt = typeof raw.lastEventAt === "string" ? raw.lastEventAt : "";
  base.lastTzOffsetMin = Number(raw.lastTzOffsetMin) || 0;
  if (raw.imported) base.imported = true;
  return base;
};

/* ------------------------------------------------------------------ */
/* Plain-language descriptions                                         */
/* ------------------------------------------------------------------ */

export const pluralize = (n: number, [one, many]: [string, string]) =>
  `${n} ${n === 1 ? one : many}`;

export const activityCountLabel = (n: number) => `${n} ${n === 1 ? "activity" : "activities"}`;

/** Ordered `["2 lesson steps", "1 quiz completed"]` list for the details panel. */
export const describeCounts = (record: DayRecord | undefined): string[] => {
  if (!record) return [];
  const out: string[] = [];
  for (const kind of ACTIVITY_KINDS) {
    const n = record.counts[kind] ?? 0;
    if (n > 0) out.push(pluralize(n, KIND_POLICY[kind].label));
  }
  return out;
};

/** "Tuesday 4 March: 3 activities, level 2". */
export const cellAccessibilityLabel = (key: string, record: DayRecord | undefined): string => {
  const total = record?.total ?? 0;
  const level = record?.level ?? 0;
  return `${formatDayLong(key)}: ${activityCountLabel(total)}, level ${level}`;
};

/* ------------------------------------------------------------------ */
/* Heat-map grid                                                       */
/* ------------------------------------------------------------------ */

/**
 * Week rule: columns are weeks; rows are weekdays. `weekStart` 0 = Sunday-first
 * (default; matches GitHub and the streak screen's S M T W T F S row), 1 =
 * Monday-first. The final column is the week containing today; cells after
 * today are `null` (never rendered, never tappable). `rangeStart` (optional)
 * blanks cells before it, giving a partial first week.
 */
export interface GridOptions {
  todayKey: string;
  weeks: number;
  weekStart?: 0 | 1;
  rangeStart?: string;
}

export interface MonthLabel {
  column: number;
  label: string;
}

export interface WeekGrid {
  /** columns[c][r] = day key, or null for padding / future cells. */
  columns: (string | null)[][];
  monthLabels: MonthLabel[];
  /** Row index -> weekday short label for the grid's left rail. */
  rowLabels: string[];
  weekStart: 0 | 1;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const buildWeekGrid = ({ todayKey, weeks, weekStart = 0, rangeStart }: GridOptions): WeekGrid => {
  const nWeeks = Math.max(1, Math.floor(weeks));
  const offsetInWeek = (weekdayOf(todayKey) - weekStart + 7) % 7;
  const lastColumnStart = addDays(todayKey, -offsetInWeek);
  const firstColumnStart = addDays(lastColumnStart, -(nWeeks - 1) * 7);

  const columns: (string | null)[][] = [];
  for (let c = 0; c < nWeeks; c += 1) {
    const colStart = addDays(firstColumnStart, c * 7);
    const col: (string | null)[] = [];
    for (let r = 0; r < 7; r += 1) {
      const key = addDays(colStart, r);
      const future = key > todayKey;
      const beforeRange = rangeStart !== undefined && key < rangeStart;
      col.push(future || beforeRange ? null : key);
    }
    columns.push(col);
  }

  // Month labels: the column holding the 1st of a month; plus the first
  // column. Skip the first-column label if the next one would collide.
  const monthLabels: MonthLabel[] = [];
  columns.forEach((col, c) => {
    const first = col.find((k) => k !== null) as string | undefined;
    if (!first) return;
    const hasMonthStart = col.some((k) => k !== null && k.endsWith("-01"));
    if (hasMonthStart) {
      const monthKey = col.find((k) => k !== null && k.endsWith("-01")) as string;
      monthLabels.push({ column: c, label: SHORT_MONTHS[Number(monthKey.slice(5, 7)) - 1] });
    } else if (c === 0) {
      monthLabels.push({ column: 0, label: SHORT_MONTHS[Number(first.slice(5, 7)) - 1] });
    }
  });
  if (monthLabels.length > 1 && monthLabels[0].column === 0 && monthLabels[1].column < 3) {
    monthLabels.shift();
  }

  const rowLabels = Array.from({ length: 7 }, (_, r) => SHORT_WEEKDAYS[(weekStart + r) % 7]);
  return { columns, monthLabels, rowLabels, weekStart };
};

/** How many whole week columns fit a width (min 1). */
export const weeksThatFit = (availableWidth: number, cell: number, gap: number, railWidth = 0): number => {
  const usable = Math.max(0, availableWidth - railWidth);
  return Math.max(1, Math.floor((usable + gap) / (cell + gap)));
};

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

export const SUMMARY_WEEKS = 12;

export interface ActivitySummary {
  activeDays: number;
  windowDays: number;
  todayCount: number;
}

export const summarizeActivity = (
  days: Record<string, DayRecord>,
  todayKey: string,
  weeks = SUMMARY_WEEKS,
): ActivitySummary => {
  const windowDays = weeks * 7;
  const start = addDays(todayKey, -(windowDays - 1));
  let activeDays = 0;
  for (const [key, rec] of Object.entries(days)) {
    if (key >= start && key <= todayKey && rec.total > 0) activeDays += 1;
  }
  return { activeDays, windowDays, todayCount: days[todayKey]?.total ?? 0 };
};

export const summaryText = (currentStreak: number, s: ActivitySummary, weeks = SUMMARY_WEEKS): string => {
  const streak = Math.max(0, Math.floor(currentStreak || 0));
  return (
    `Current streak ${streak} ${streak === 1 ? "day" : "days"} · ` +
    `${s.activeDays} active ${s.activeDays === 1 ? "day" : "days"} in the last ${weeks} weeks · ` +
    `Today: ${activityCountLabel(s.todayCount)}`
  );
};

/* ------------------------------------------------------------------ */
/* Existing streak model                                               */
/* ------------------------------------------------------------------ */

/**
 * Model of the EXISTING streak (services/utils.ts `checkDailyStreak` +
 * StorageContext `incrementStreak` / `ensureDailyTracking`). That system is a
 * once-per-day app-open check-in state machine whose state lives in the
 * profile (`current_streak`, `longest_streak`) and AsyncStorage
 * (`last_active_date`). The streak UI keeps reading that stored state; this
 * model exists so tests can prove the decision rules are what we document:
 *
 *   first ever open            -> streak + 1
 *   same local day             -> unchanged
 *   previous local day         -> streak + 1 (longest = max)
 *   gap of 2+ days             -> streak = 0 (today is NOT counted; the next
 *                                 consecutive day makes it 1)
 *   clock moved backwards      -> unchanged, last_active_date moves back
 *
 * `openDays` are the local day keys of successful app opens, in time order.
 * The activity heat-map never recomputes a competing streak; it shows this one.
 */
export const simulateExistingStreak = (
  openDays: string[],
): { current: number; longest: number; lastActive: string | null } => {
  let current = 0;
  let longest = 0;
  let lastActive: string | null = null;
  for (const today of openDays) {
    if (lastActive === null) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      const diff = daysBetween(lastActive, today);
      if (diff === 1) {
        current += 1;
        longest = Math.max(longest, current);
      } else if (diff > 1) {
        current = 0;
      }
    }
    lastActive = today;
  }
  return { current, longest, lastActive };
};

/* ------------------------------------------------------------------ */
/* Historical import (real timestamps only)                            */
/* ------------------------------------------------------------------ */

export interface HistoricalEvent {
  kind: ActivityKind;
  id: string;
  /** Real stored timestamp (ISO or SQLite UTC string). */
  timestamp: string;
}

/**
 * Place historical events on local days. `offsetAt(ms)` returns the device's
 * timezone offset at that instant (the app passes `new Date(ms).getTimezoneOffset()`).
 * Events with unreadable timestamps or in the future are skipped — nothing is
 * invented, and history is merged through the same dedupe ledger as live events.
 */
export const importHistoricalEvents = (
  days: Record<string, DayRecord>,
  events: HistoricalEvent[],
  nowMs: number,
  offsetAt: (ms: number) => number,
): { days: Record<string, DayRecord>; imported: number } => {
  const out = { ...days };
  let imported = 0;
  for (const ev of events) {
    const ms = parseStoredTimestamp(ev.timestamp);
    if (ms === null || ms > nowMs || !isActivityKind(ev.kind)) continue;
    const offsetMin = offsetAt(ms);
    const key = dayKeyFromInstant(ms, offsetMin);
    const before = out[key] ?? emptyDay(key);
    const after = applyEvent(before, ev.kind, { id: ev.id }, { ms, offsetMin }, { imported: true });
    if (after !== before) {
      // Keep a real live-event timestamp if one exists on that day.
      out[key] = before.lastEventAt && before.lastEventAt > after.lastEventAt
        ? { ...after, lastEventAt: before.lastEventAt, lastTzOffsetMin: before.lastTzOffsetMin }
        : after;
      imported += 1;
    }
  }
  return { days: out, imported };
};

/* ------------------------------------------------------------------ */
/* Engine (storage-agnostic)                                           */
/* ------------------------------------------------------------------ */

export interface ActivityStore {
  loadAll(): Promise<unknown[]>;
  saveDays(days: DayRecord[]): Promise<void>;
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
}

export interface EngineOptions {
  store: ActivityStore;
  clock?: () => Clock;
  /** Debounce for write-behind persistence. 0 = next macrotask. */
  debounceMs?: number;
  onError?: (error: unknown) => void;
}

export const IMPORT_META_KEY = "history_import_v1";

export interface ActivityEngine {
  record(kind: ActivityKind, meta?: { id?: string | number }): void;
  flush(): Promise<void>;
  getDays(): Promise<Record<string, DayRecord>>;
  importHistory(events: HistoricalEvent[], offsetAt: (ms: number) => number): Promise<number>;
  subscribe(listener: () => void): () => void;
}

export const createActivityEngine = (options: EngineOptions): ActivityEngine => {
  const { store, clock = clockNow, debounceMs = 800, onError } = options;
  let days: Record<string, DayRecord> = {};
  let loaded: Promise<void> | null = null;
  let chain: Promise<void> = Promise.resolve();
  const dirty = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();

  const report = (error: unknown) => {
    try {
      onError?.(error);
    } catch {
      /* never throw */
    }
  };

  const notify = () => {
    listeners.forEach((l) => {
      try {
        l();
      } catch {
        /* listener errors never break recording */
      }
    });
  };

  const ensureLoaded = (): Promise<void> => {
    if (!loaded) {
      loaded = (async () => {
        try {
          const rows = await store.loadAll();
          const next: Record<string, DayRecord> = {};
          for (const raw of rows) {
            const day = sanitizeDay(raw);
            if (!day) continue;
            // If duplicate rows exist, keep the richer one — never lose data.
            const existing = next[day.date];
            if (!existing || day.points > existing.points) next[day.date] = day;
          }
          days = next;
        } catch (error) {
          loaded = null; // retry on next call; events wait in `pending`
          throw error;
        }
      })();
    }
    return loaded;
  };

  // Events captured while the store could not be read yet. They are replayed
  // (in order, with their original timestamps) once a load succeeds, so a
  // not-yet-ready database can neither drop events nor overwrite stored days.
  const pending: { kind: ActivityKind; meta?: { id?: string | number }; at: Clock }[] = [];

  const applyOne = (kind: ActivityKind, meta: { id?: string | number } | undefined, at: Clock) => {
    const key = dayKeyFromInstant(at.ms, at.offsetMin);
    const before = days[key] ?? emptyDay(key);
    const after = applyEvent(before, kind, meta, at);
    if (after === before) return;
    days[key] = after;
    dirty.add(key);
    schedule();
  };

  const ready = async (): Promise<boolean> => {
    try {
      await ensureLoaded();
    } catch (error) {
      report(error);
      return false;
    }
    if (pending.length > 0) {
      for (const item of pending.splice(0)) applyOne(item.kind, item.meta, item.at);
    }
    return true;
  };

  const persist = async () => {
    timer = null;
    if (dirty.size === 0) return;
    const keys = Array.from(dirty);
    const batch = keys.map((k) => days[k]).filter(Boolean);
    try {
      await store.saveDays(batch);
      keys.forEach((k) => dirty.delete(k));
    } catch (error) {
      report(error); // stays dirty; retried on next flush
    }
  };

  const schedule = () => {
    if (timer !== null) return;
    timer = setTimeout(() => {
      chain = chain.then(persist).catch(report);
    }, Math.max(0, debounceMs));
    // Do not keep a Node process alive just for a pending flush.
    (timer as any)?.unref?.();
  };

  const enqueue = (task: () => Promise<void>) => {
    chain = chain.then(task).catch(report);
    return chain;
  };

  return {
    record(kind, meta) {
      try {
        if (!isActivityKind(kind)) return;
        const at = clock(); // time of the EVENT, captured synchronously
        void enqueue(async () => {
          if (!(await ready())) {
            if (pending.length < 500) pending.push({ kind, meta, at });
            return;
          }
          applyOne(kind, meta, at);
          notify();
        });
      } catch (error) {
        report(error);
      }
    },
    flush() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      return enqueue(persist);
    },
    async getDays() {
      await chain;
      await enqueue(async () => {
        await ready();
      });
      return { ...days };
    },
    async importHistory(events, offsetAt) {
      let imported = 0;
      await enqueue(async () => {
        try {
          if (!(await ready())) return;
          if ((await store.getMeta(IMPORT_META_KEY)) !== null) return; // already done
          const result = importHistoricalEvents(days, events, clock().ms, offsetAt);
          for (const key of Object.keys(result.days)) {
            if (result.days[key] !== days[key]) dirty.add(key);
          }
          days = result.days;
          imported = result.imported;
          await store.saveDays(Array.from(dirty).map((k) => days[k]).filter(Boolean));
          dirty.clear();
          await store.setMeta(IMPORT_META_KEY, new Date(clock().ms).toISOString());
          notify();
        } catch (error) {
          report(error);
        }
      });
      return imported;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
