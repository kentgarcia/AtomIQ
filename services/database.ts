import { UNITS } from "@/content/units";
import * as SQLite from "expo-sqlite";
import { initExplorerStorage } from "./explorer-storage";
import { LOCAL_FIRST_SCHEMA } from "./local-first/schema";

// Database instance
let db: SQLite.SQLiteDatabase | null = null;

const FRIEND_CODE_LENGTH = 6;
const FRIEND_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const DISPLAY_NAME_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

type TableColumnDefinition = Record<string, string>;

const getTableColumns = async (
  database: SQLite.SQLiteDatabase,
  tableName: "user_profile" | "user_profiles",
): Promise<Set<string>> => {
  const table = await database.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    [tableName],
  );

  if (!table) {
    return new Set<string>();
  }

  const columns = await database.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${tableName})`,
  );

  return new Set(columns.map((column) => column.name));
};

const ensureTableColumns = async (
  database: SQLite.SQLiteDatabase,
  tableName: "user_profile" | "user_profiles",
  definitions: TableColumnDefinition,
): Promise<void> => {
  const existingColumns = await getTableColumns(database, tableName);
  if (existingColumns.size === 0) {
    return;
  }

  for (const [columnName, columnDefinition] of Object.entries(definitions)) {
    if (existingColumns.has(columnName)) {
      continue;
    }

    try {
      await database.execAsync(
        `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`,
      );
      console.log(`Migration: Added ${columnName} column to ${tableName}`);
    } catch (error) {
      console.warn(
        `Migration: Unable to add ${columnName} column to ${tableName}:`,
        error,
      );
    }
  }
};

const ensureIdentityProfileColumns = async (
  database: SQLite.SQLiteDatabase,
): Promise<void> => {
  await ensureTableColumns(database, "user_profile", {
    user_id: "TEXT",
    display_name: "TEXT",
    friend_code: "TEXT",
    display_name_updated_at: "INTEGER",
    next_display_name_change_at: "INTEGER",
  });

  await ensureTableColumns(database, "user_profiles", {
    display_name: "TEXT",
    friend_code: "TEXT",
    display_name_updated_at: "INTEGER",
    next_display_name_change_at: "INTEGER",
  });

  const legacyColumns = await getTableColumns(database, "user_profile");
  if (legacyColumns.has("friend_code")) {
    await database.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profile_friend_code
      ON user_profile(friend_code)
      WHERE friend_code IS NOT NULL;
    `);
  }

  const localFirstColumns = await getTableColumns(database, "user_profiles");
  if (localFirstColumns.has("friend_code")) {
    await database.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_friend_code
      ON user_profiles(friend_code)
      WHERE friend_code IS NOT NULL;
    `);
  }
};

// Initialize database
export const initDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync("atomiq.db");

    // Create tables
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      -- User Profile
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE,
        username TEXT,
        display_name TEXT,
        friend_code TEXT,
        display_name_updated_at INTEGER,
        next_display_name_change_at INTEGER,
        avatar_url TEXT,
        total_xp INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        myths_busted INTEGER DEFAULT 0,
        lessons_completed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Units Progress
      CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        color TEXT,
        order_index INTEGER,
        is_locked INTEGER DEFAULT 1,
        completed_at DATETIME
      );
      
      -- Levels Progress
      CREATE TABLE IF NOT EXISTS levels (
        id TEXT PRIMARY KEY,
        unit_id TEXT NOT NULL,
        type TEXT,
        status TEXT DEFAULT 'locked',
        xp_earned INTEGER DEFAULT 0,
        stars INTEGER DEFAULT 0,
        completed_at DATETIME,
        attempts INTEGER DEFAULT 0,
        FOREIGN KEY (unit_id) REFERENCES units(id)
      );
      
      -- Lesson Steps (for tracking individual step completion)
      CREATE TABLE IF NOT EXISTS lesson_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level_id TEXT NOT NULL,
        step_type TEXT,
        step_index INTEGER,
        is_completed INTEGER DEFAULT 0,
        score INTEGER,
        completed_at DATETIME,
        FOREIGN KEY (level_id) REFERENCES levels(id)
      );
      
      -- Daily Activity Log
      CREATE TABLE IF NOT EXISTS daily_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        xp_earned INTEGER DEFAULT 0,
        lessons_completed INTEGER DEFAULT 0,
        myths_busted INTEGER DEFAULT 0,
        time_spent_minutes INTEGER DEFAULT 0,
        UNIQUE(date)
      );
      
      -- Achievements
      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        is_unlocked INTEGER DEFAULT 0,
        unlocked_at DATETIME
      );
      
      -- Leaderboard Cache
      CREATE TABLE IF NOT EXISTS leaderboard (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        username TEXT,
        avatar_url TEXT,
        xp INTEGER,
        is_npc INTEGER DEFAULT 0,
        rank INTEGER,
        cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Personal game leaderboard (best scores per game)
      CREATE TABLE IF NOT EXISTS game_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure legacy/local-first identity columns exist before any queries use them.
    await ensureIdentityProfileColumns(db);

    // Migrate existing databases - add user_id column if it doesn't exist
    try {
      await db.execAsync(`
        ALTER TABLE user_profile ADD COLUMN user_id TEXT;
      `);
      console.log("Migration: Added user_id column to user_profile");
    } catch (error) {
      // Column already exists or table doesn't exist yet, ignore
    }

    try {
      await db.execAsync(`
        ALTER TABLE user_profile ADD COLUMN display_name TEXT;
      `);
      console.log("Migration: Added display_name column to user_profile");
    } catch (error) {
      // Column already exists or table doesn't exist yet, ignore
    }

    try {
      await db.execAsync(`
        ALTER TABLE user_profile ADD COLUMN friend_code TEXT;
      `);
      console.log("Migration: Added friend_code column to user_profile");
    } catch (error) {
      // Column already exists or table doesn't exist yet, ignore
    }

    try {
      await db.execAsync(`
        ALTER TABLE user_profile ADD COLUMN display_name_updated_at INTEGER;
      `);
      console.log(
        "Migration: Added display_name_updated_at column to user_profile",
      );
    } catch (error) {
      // Column already exists or table doesn't exist yet, ignore
    }

    try {
      await db.execAsync(`
        ALTER TABLE user_profile ADD COLUMN next_display_name_change_at INTEGER;
      `);
      console.log(
        "Migration: Added next_display_name_change_at column to user_profile",
      );
    } catch (error) {
      // Column already exists or table doesn't exist yet, ignore
    }

    // Add is_npc to leaderboard cache for offline leaderboard fidelity.
    try {
      await db.execAsync(`
        ALTER TABLE leaderboard ADD COLUMN is_npc INTEGER DEFAULT 0;
      `);
      console.log("Migration: Added is_npc column to leaderboard");
    } catch (error) {
      // Column already exists, ignore.
    }

    // Generate user_id for existing users without one
    const existingUser = await db.getFirstAsync(
      "SELECT * FROM user_profile WHERE user_id IS NULL LIMIT 1",
    );
    if (existingUser) {
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      await db.runAsync(
        "UPDATE user_profile SET user_id = ? WHERE user_id IS NULL",
        [userId],
      );
      console.log("Migration: Generated user_id for existing user");
    }

    // Initialize local-first database schema (for social features and sync)
    await db.execAsync(LOCAL_FIRST_SCHEMA);

    // Re-run safeguards after schema bootstrap for databases upgrading from older layouts.
    await ensureIdentityProfileColumns(db);

    // Initialize levels from syllabus if database is empty
    await initializeLevelsFromSyllabus();

    // Initialize chat history tables
    const { initChatHistoryDB } = await import("./chat-history");
    await initChatHistoryDB();

    // Initialize explorer storage
    await initExplorerStorage();

    console.log("Database initialized successfully");
    return db;
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

// Initialize levels from syllabus (only if database is empty)
const initializeLevelsFromSyllabus = async () => {
  try {
    const database = db;
    if (!database) return;

    // Check if levels already exist
    const existingLevels = await database.getFirstAsync(
      "SELECT COUNT(*) as count FROM levels",
    );
    if (existingLevels && (existingLevels as any).count > 0) {
      console.log("Levels already initialized, skipping...");
      return;
    }

    console.log("Initializing levels from syllabus...");

    // First, insert all units into the units table
    for (const unit of UNITS) {
      await database.runAsync(
        `INSERT OR IGNORE INTO units (id, title, description, color, order_index, is_locked) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          unit.id,
          unit.title,
          unit.description,
          unit.color,
          unit.order,
          unit.order === 1 ? 0 : 1, // First unit is unlocked
        ],
      );
    }

    // Then, insert all lessons and quizzes from the syllabus
    for (const unit of UNITS) {
      // Insert lessons
      for (let i = 0; i < unit.lessonIds.length; i++) {
        const lessonId = unit.lessonIds[i];
        const isFirstLesson = i === 0 && unit.order === 1; // First lesson of first unit

        await database.runAsync(
          `INSERT OR IGNORE INTO levels (id, unit_id, type, status, xp_earned, stars, attempts) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            lessonId,
            unit.id,
            "lesson",
            isFirstLesson ? "current" : "locked",
            0,
            0,
            0,
          ],
        );
      }

      // Insert quizzes
      for (const quizId of unit.quizIds) {
        await database.runAsync(
          `INSERT OR IGNORE INTO levels (id, unit_id, type, status, xp_earned, stars, attempts) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [quizId, unit.id, "quiz", "locked", 0, 0, 0],
        );
      }
    }

    console.log("Levels initialized from syllabus");
  } catch (error) {
    console.error("Error initializing levels:", error);
  }
};

// Get database instance
export const getDatabase = () => {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
};

const getDatabaseReady = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    await initDatabase();
  }

  return getDatabase();
};

const generateFriendCode = (): string => {
  let code = "";

  for (let index = 0; index < FRIEND_CODE_LENGTH; index += 1) {
    const randomIndex = Math.floor(Math.random() * FRIEND_CODE_ALPHABET.length);
    code += FRIEND_CODE_ALPHABET[randomIndex];
  }

  return code;
};

const normalizeLocalFirstUsername = (value: string): string => {
  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized || "Scientist";
};

const normalizeFriendCode = (value: string): string =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, FRIEND_CODE_LENGTH);

const parseTimestampValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }

    const parsedDate = Date.parse(value);
    if (!Number.isNaN(parsedDate)) {
      return parsedDate;
    }
  }

  return null;
};

const resolveUniqueLocalFirstUsername = async (
  database: SQLite.SQLiteDatabase,
  userId: string,
  preferredUsername: string,
): Promise<string> => {
  const existingById = await database.getFirstAsync<{
    username: string | null;
  }>("SELECT username FROM user_profiles WHERE id = ? LIMIT 1", [userId]);

  if (existingById?.username) {
    return existingById.username;
  }

  const base = normalizeLocalFirstUsername(preferredUsername);
  const idSuffix = userId.replace(/[^a-z0-9]/gi, "").toLowerCase() || "user";

  let candidate = base;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const conflict = await database.getFirstAsync<{ id: string }>(
      "SELECT id FROM user_profiles WHERE username = ? AND id <> ? LIMIT 1",
      [candidate, userId],
    );

    if (!conflict) {
      return candidate;
    }

    const suffixLength = Math.min(6 + attempt, idSuffix.length);
    const suffix = idSuffix.slice(0, suffixLength);
    candidate = `${base}_${suffix}`;
  }

  return `${base}_${Date.now().toString(36).slice(-6)}`;
};

const resolveUniqueFriendCode = async (
  database: SQLite.SQLiteDatabase,
  userId: string,
  preferredCode?: string | null,
): Promise<string> => {
  const isFriendCodeAvailable = async (candidate: string): Promise<boolean> => {
    const localFirstConflict = await database.getFirstAsync<{ id: string }>(
      "SELECT id FROM user_profiles WHERE friend_code = ? AND id <> ? LIMIT 1",
      [candidate, userId],
    );

    if (localFirstConflict) {
      return false;
    }

    const legacyConflict = await database.getFirstAsync<{
      user_id: string | null;
    }>(
      "SELECT user_id FROM user_profile WHERE friend_code = ? AND COALESCE(user_id, '') <> ? LIMIT 1",
      [candidate, userId],
    );

    return !legacyConflict;
  };

  const normalizedPreferred = preferredCode
    ? normalizeFriendCode(preferredCode)
    : "";

  if (
    normalizedPreferred.length === FRIEND_CODE_LENGTH &&
    (await isFriendCodeAvailable(normalizedPreferred))
  ) {
    return normalizedPreferred;
  }

  for (let attempt = 0; attempt < 256; attempt += 1) {
    const candidate = generateFriendCode();
    if (await isFriendCodeAvailable(candidate)) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique friend code");
};

// User Profile Operations
export const getLegacyUserProfile = async () => {
  const database = getDatabase();
  const result = await database.getFirstAsync(
    "SELECT * FROM user_profile LIMIT 1",
  );
  return result;
};

export const getUserProfile = async () => {
  const database = getDatabase();
  await ensureIdentityProfileColumns(database);

  const legacyProfile = (await getLegacyUserProfile()) as any;
  const preferredUserId =
    typeof legacyProfile?.user_id === "string" &&
    legacyProfile.user_id.length > 0
      ? legacyProfile.user_id
      : null;

  const localFirstQuery = preferredUserId
    ? `SELECT id, username, display_name, friend_code, display_name_updated_at, next_display_name_change_at, avatar_url, total_xp, current_streak, longest_streak, myths_busted, lessons_completed, created_at, updated_at
       FROM user_profiles
       WHERE deleted_at IS NULL
         AND id = ?
       LIMIT 1`
    : `SELECT id, username, display_name, friend_code, display_name_updated_at, next_display_name_change_at, avatar_url, total_xp, current_streak, longest_streak, myths_busted, lessons_completed, created_at, updated_at
       FROM user_profiles
       WHERE deleted_at IS NULL
         AND id NOT LIKE 'npc_user_%'
       ORDER BY updated_at DESC
       LIMIT 1`;
  const localFirstParams = preferredUserId ? [preferredUserId] : [];

  const localFirstProfile = await database.getFirstAsync<{
    id: string;
    username: string;
    display_name: string | null;
    friend_code: string | null;
    display_name_updated_at: number | null;
    next_display_name_change_at: number | null;
    avatar_url: string | null;
    total_xp: number | null;
    current_streak: number | null;
    longest_streak: number | null;
    myths_busted: number | null;
    lessons_completed: number | null;
    created_at: number | null;
    updated_at: number | null;
  }>(localFirstQuery, localFirstParams);

  if (localFirstProfile) {
    const displayName =
      normalizeLocalFirstUsername(
        localFirstProfile.display_name || localFirstProfile.username,
      ) || "Scientist";

    return {
      id: localFirstProfile.id,
      user_id: localFirstProfile.id,
      username: displayName,
      display_name: displayName,
      friend_code: localFirstProfile.friend_code || null,
      display_name_updated_at: localFirstProfile.display_name_updated_at,
      next_display_name_change_at:
        localFirstProfile.next_display_name_change_at,
      avatar_url: localFirstProfile.avatar_url || "",
      total_xp: Number(localFirstProfile.total_xp || 0),
      current_streak: Number(localFirstProfile.current_streak || 0),
      longest_streak: Number(localFirstProfile.longest_streak || 0),
      myths_busted: Number(localFirstProfile.myths_busted || 0),
      lessons_completed: Number(localFirstProfile.lessons_completed || 0),
      created_at: localFirstProfile.created_at,
      updated_at: localFirstProfile.updated_at,
    };
  }

  if (!legacyProfile) {
    return null;
  }

  const legacyDisplayName = normalizeLocalFirstUsername(
    legacyProfile.display_name || legacyProfile.username || "Scientist",
  );

  return {
    ...legacyProfile,
    username: legacyDisplayName,
    display_name: legacyDisplayName,
    friend_code: legacyProfile.friend_code || null,
    display_name_updated_at: parseTimestampValue(
      legacyProfile.display_name_updated_at,
    ),
    next_display_name_change_at: parseTimestampValue(
      legacyProfile.next_display_name_change_at,
    ),
  };
};

export const createOrUpdateUserProfile = async (profile: {
  user_id?: string;
  username?: string;
  display_name?: string;
  friend_code?: string;
  avatar_url?: string;
  total_xp?: number;
  current_streak?: number;
  longest_streak?: number;
  myths_busted?: number;
  lessons_completed?: number;
}) => {
  const database = getDatabase();
  await ensureIdentityProfileColumns(database);
  const existing = await getLegacyUserProfile();

  const currentProfile = (await getUserProfile()) as any;
  const userId =
    profile.user_id ||
    (existing as any)?.user_id ||
    currentProfile?.user_id ||
    `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  const localFirstCurrent = await database.getFirstAsync<{
    username: string | null;
    display_name: string | null;
    friend_code: string | null;
    display_name_updated_at: number | null;
    next_display_name_change_at: number | null;
  }>(
    `SELECT username, display_name, friend_code, display_name_updated_at, next_display_name_change_at
     FROM user_profiles
     WHERE id = ?
     LIMIT 1`,
    [userId],
  );

  const nowTimestamp = Date.now();
  const hasDisplayNameUpdate =
    typeof profile.display_name === "string" ||
    typeof profile.username === "string";

  const existingDisplayName = normalizeLocalFirstUsername(
    (localFirstCurrent?.display_name ||
      localFirstCurrent?.username ||
      (existing as any)?.display_name ||
      (existing as any)?.username ||
      currentProfile?.display_name ||
      currentProfile?.username ||
      "Scientist") as string,
  );

  const requestedDisplayName = hasDisplayNameUpdate
    ? normalizeLocalFirstUsername(
        (profile.display_name ||
          profile.username ||
          existingDisplayName) as string,
      )
    : existingDisplayName;

  const displayNameChanged =
    hasDisplayNameUpdate && requestedDisplayName !== existingDisplayName;
  const currentNextAllowedAt = parseTimestampValue(
    localFirstCurrent?.next_display_name_change_at ||
      (existing as any)?.next_display_name_change_at ||
      currentProfile?.next_display_name_change_at,
  );

  if (
    displayNameChanged &&
    currentNextAllowedAt !== null &&
    nowTimestamp < currentNextAllowedAt
  ) {
    const cooldownError = new Error(
      "Display name can only be changed once every 7 days",
    ) as Error & { code?: string; nextAllowedAt?: number };
    cooldownError.code = "DISPLAY_NAME_COOLDOWN";
    cooldownError.nextAllowedAt = currentNextAllowedAt;
    throw cooldownError;
  }

  const displayNameUpdatedAt = displayNameChanged
    ? nowTimestamp
    : parseTimestampValue(
        localFirstCurrent?.display_name_updated_at ||
          (existing as any)?.display_name_updated_at ||
          currentProfile?.display_name_updated_at,
      );

  const nextDisplayNameChangeAt = displayNameChanged
    ? nowTimestamp + DISPLAY_NAME_CHANGE_COOLDOWN_MS
    : parseTimestampValue(
        localFirstCurrent?.next_display_name_change_at ||
          (existing as any)?.next_display_name_change_at ||
          currentProfile?.next_display_name_change_at,
      ) || 0;

  const resolvedFriendCode = await resolveUniqueFriendCode(
    database,
    userId,
    profile.friend_code ||
      localFirstCurrent?.friend_code ||
      (existing as any)?.friend_code ||
      currentProfile?.friend_code ||
      null,
  );

  const stableUsernameSeed =
    localFirstCurrent?.username ||
    (existing as any)?.username ||
    currentProfile?.username ||
    resolvedFriendCode;

  const resolvedUsername = await resolveUniqueLocalFirstUsername(
    database,
    userId,
    stableUsernameSeed,
  );

  if (existing) {
    // Update
    await database.runAsync(
      `UPDATE user_profile SET 
        user_id = COALESCE(?, user_id),
        username = COALESCE(?, username),
        display_name = COALESCE(?, display_name),
        friend_code = COALESCE(?, friend_code),
        display_name_updated_at = COALESCE(?, display_name_updated_at),
        next_display_name_change_at = COALESCE(?, next_display_name_change_at),
        avatar_url = COALESCE(?, avatar_url),
        total_xp = COALESCE(?, total_xp),
        current_streak = COALESCE(?, current_streak),
        longest_streak = COALESCE(?, longest_streak),
        myths_busted = COALESCE(?, myths_busted),
        lessons_completed = COALESCE(?, lessons_completed),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        userId,
        hasDisplayNameUpdate ? requestedDisplayName : undefined,
        requestedDisplayName,
        resolvedFriendCode,
        displayNameUpdatedAt,
        nextDisplayNameChangeAt,
        profile.avatar_url,
        profile.total_xp,
        profile.current_streak,
        profile.longest_streak,
        profile.myths_busted,
        profile.lessons_completed,
        (existing as any).id,
      ],
    );
  } else {
    // Create - generate user_id if not provided
    await database.runAsync(
      `INSERT INTO user_profile (user_id, username, display_name, friend_code, display_name_updated_at, next_display_name_change_at, avatar_url, total_xp, current_streak, longest_streak, myths_busted, lessons_completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        requestedDisplayName,
        requestedDisplayName,
        resolvedFriendCode,
        displayNameUpdatedAt,
        nextDisplayNameChangeAt,
        profile.avatar_url || "",
        profile.total_xp || 0,
        profile.current_streak || 0,
        profile.longest_streak || 0,
        profile.myths_busted || 0,
        profile.lessons_completed || 0,
      ],
    );
  }

  // Mirror legacy profile table into local-first profile table.
  const latestProfile = (await getLegacyUserProfile()) as any;
  if (latestProfile?.user_id) {
    const timestamp = Date.now();
    const createdAt = Date.parse(latestProfile.created_at || "");
    const level = Math.floor(Number(latestProfile.total_xp || 0) / 100) + 1;
    const localDisplayName = requestedDisplayName;

    await database.runAsync(
      `INSERT INTO user_profiles (
        id,
        username,
        display_name,
        friend_code,
        display_name_updated_at,
        next_display_name_change_at,
        email,
        avatar_url,
        bio,
        total_xp,
        current_streak,
        longest_streak,
        myths_busted,
        lessons_completed,
        level,
        is_premium,
        notification_preferences,
        created_at,
        updated_at,
        synced_at,
        is_dirty,
        deleted_at,
        version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        username = COALESCE(user_profiles.username, excluded.username),
        display_name = excluded.display_name,
        friend_code = COALESCE(user_profiles.friend_code, excluded.friend_code),
        display_name_updated_at = excluded.display_name_updated_at,
        next_display_name_change_at = excluded.next_display_name_change_at,
        avatar_url = excluded.avatar_url,
        total_xp = excluded.total_xp,
        current_streak = excluded.current_streak,
        longest_streak = excluded.longest_streak,
        myths_busted = excluded.myths_busted,
        lessons_completed = excluded.lessons_completed,
        level = excluded.level,
        updated_at = excluded.updated_at,
        is_dirty = 1,
        version = user_profiles.version + 1`,
      [
        latestProfile.user_id,
        resolvedUsername,
        localDisplayName,
        resolvedFriendCode,
        displayNameUpdatedAt,
        nextDisplayNameChangeAt,
        null,
        latestProfile.avatar_url || null,
        null,
        Number(latestProfile.total_xp || 0),
        Number(latestProfile.current_streak || 0),
        Number(latestProfile.longest_streak || 0),
        Number(latestProfile.myths_busted || 0),
        Number(latestProfile.lessons_completed || 0),
        level,
        0,
        null,
        Number.isNaN(createdAt) ? timestamp : createdAt,
        timestamp,
        null,
        1,
        null,
        1,
      ],
    );
  }
};

export type LocalLeaderboardUser = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_xp: number;
  is_npc: boolean;
};

/**
 * Save remote leaderboard rows into the local snapshot table.
 */
export const saveLeaderboardSnapshot = async (
  rows: LocalLeaderboardUser[],
): Promise<void> => {
  const database = await getDatabaseReady();
  const cachedAt = new Date().toISOString();

  await database.runAsync("DELETE FROM leaderboard");

  if (rows.length === 0) {
    return;
  }

  for (const [index, row] of rows.entries()) {
    await database.runAsync(
      `INSERT INTO leaderboard (user_id, username, avatar_url, xp, is_npc, rank, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        row.user_id,
        row.username,
        row.avatar_url,
        row.total_xp,
        row.is_npc ? 1 : 0,
        index + 1,
        cachedAt,
      ],
    );
  }
};

/**
 * Read leaderboard snapshot from local database.
 */
export const getLeaderboardSnapshot = async (
  limit: number = 100,
): Promise<LocalLeaderboardUser[]> => {
  const database = await getDatabaseReady();

  const rows = await database.getAllAsync<{
    user_id: string | null;
    username: string | null;
    avatar_url: string | null;
    xp: number | null;
    is_npc: number | null;
  }>(
    `SELECT user_id, username, avatar_url, xp, is_npc
     FROM leaderboard
     ORDER BY rank ASC, xp DESC
     LIMIT ?`,
    [limit],
  );

  return rows
    .filter((row) => row.user_id && row.username)
    .map((row) => ({
      user_id: row.user_id as string,
      username: row.username as string,
      avatar_url: row.avatar_url,
      total_xp: Number(row.xp || 0),
      is_npc: Boolean(row.is_npc),
    }));
};

/**
 * Latest local cache timestamp for freshness display.
 */
export const getLeaderboardSnapshotUpdatedAt = async (): Promise<
  number | null
> => {
  const database = await getDatabaseReady();
  const row = await database.getFirstAsync<{ cached_at: string | null }>(
    "SELECT cached_at FROM leaderboard ORDER BY cached_at DESC LIMIT 1",
  );

  if (!row?.cached_at) {
    return null;
  }

  const timestamp = Date.parse(row.cached_at);
  return Number.isNaN(timestamp) ? null : timestamp;
};

// Level Operations
export const getLevelProgress = async (levelId: string) => {
  const database = getDatabase();
  return await database.getFirstAsync("SELECT * FROM levels WHERE id = ?", [
    levelId,
  ]);
};

export const updateLevelProgress = async (
  levelId: string,
  data: {
    status?: string;
    xp_earned?: number;
    stars?: number;
    completed_at?: string;
  },
) => {
  const database = getDatabase();
  const existing = await getLevelProgress(levelId);

  if (existing) {
    await database.runAsync(
      `UPDATE levels SET 
        status = COALESCE(?, status),
        xp_earned = COALESCE(?, xp_earned),
        stars = COALESCE(?, stars),
        completed_at = COALESCE(?, completed_at),
        attempts = attempts + 1
      WHERE id = ?`,
      [data.status, data.xp_earned, data.stars, data.completed_at, levelId],
    );
  } else {
    // Find which unit this level belongs to
    let unitId = "atomic-playground"; // Default to first unit
    let unitData = UNITS[0];

    for (const unit of UNITS) {
      if (unit.lessonIds.includes(levelId) || unit.quizIds.includes(levelId)) {
        unitId = unit.id;
        unitData = unit;
        break;
      }
    }

    // Ensure the unit exists in the units table first
    await database.runAsync(
      `INSERT OR IGNORE INTO units (id, title, description, color, order_index, is_locked) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        unitData.id,
        unitData.title,
        unitData.description,
        unitData.color,
        unitData.order,
        unitData.order === 1 ? 0 : 1,
      ],
    );

    // Now insert the level
    await database.runAsync(
      `INSERT INTO levels (id, unit_id, type, status, xp_earned, stars, completed_at, attempts)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        levelId,
        unitId,
        levelId.includes("quiz") ? "quiz" : "lesson",
        data.status || "locked",
        data.xp_earned || 0,
        data.stars || 0,
        data.completed_at || null,
      ],
    );
  }
};

export const getAllLevels = async () => {
  const database = getDatabase();
  return await database.getAllAsync("SELECT * FROM levels ORDER BY id");
};

// Unlock next lesson/quiz/unit after completing a level
export const unlockNextLevel = async (completedLevelId: string) => {
  const database = getDatabase();

  try {
    // Find which unit this level belongs to
    let currentUnit = null;
    let levelIndexInUnit = -1;
    let isQuiz = false;

    for (const unit of UNITS) {
      const lessonIndex = unit.lessonIds.indexOf(completedLevelId);
      if (lessonIndex !== -1) {
        currentUnit = unit;
        levelIndexInUnit = lessonIndex;
        break;
      }
      const quizIndex = unit.quizIds.indexOf(completedLevelId);
      if (quizIndex !== -1) {
        currentUnit = unit;
        levelIndexInUnit = quizIndex;
        isQuiz = true;
        break;
      }
    }

    if (!currentUnit) {
      console.log("Could not find unit for level:", completedLevelId);
      return;
    }

    // If this was a quiz (last item in unit), unlock the first lesson of the next unit
    if (isQuiz) {
      const nextUnitIndex = UNITS.findIndex((u) => u.id === currentUnit.id) + 1;
      if (nextUnitIndex < UNITS.length) {
        const nextUnit = UNITS[nextUnitIndex];
        if (nextUnit.lessonIds.length > 0) {
          const nextLevelId = nextUnit.lessonIds[0];
          console.log("Unlocking first lesson of next unit:", nextLevelId);

          // Check if level exists, if not insert it
          const existingLevel = await getLevelProgress(nextLevelId);
          if (existingLevel) {
            await database.runAsync(
              "UPDATE levels SET status = ? WHERE id = ? AND status = ?",
              ["current", nextLevelId, "locked"],
            );
          } else {
            // Ensure unit exists
            await database.runAsync(
              `INSERT OR IGNORE INTO units (id, title, description, color, order_index, is_locked) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                nextUnit.id,
                nextUnit.title,
                nextUnit.description,
                nextUnit.color,
                nextUnit.order,
                0,
              ],
            );

            // Insert the level as current
            await database.runAsync(
              `INSERT INTO levels (id, unit_id, type, status, xp_earned, stars, attempts)
               VALUES (?, ?, ?, ?, ?, ?, 0)`,
              [nextLevelId, nextUnit.id, "lesson", "current", 0, 0],
            );
          }

          // Unlock the next unit
          await database.runAsync(
            "UPDATE units SET is_locked = 0 WHERE id = ?",
            [nextUnit.id],
          );
        }
      }
    } else {
      // If this was a lesson, unlock the next lesson or quiz in the same unit
      const nextIndex = levelIndexInUnit + 1;
      if (nextIndex < currentUnit.lessonIds.length) {
        // Unlock next lesson
        const nextLevelId = currentUnit.lessonIds[nextIndex];
        console.log("Unlocking next lesson:", nextLevelId);

        const existingLevel = await getLevelProgress(nextLevelId);
        if (existingLevel) {
          await database.runAsync(
            "UPDATE levels SET status = ? WHERE id = ? AND status = ?",
            ["current", nextLevelId, "locked"],
          );
        } else {
          await database.runAsync(
            `INSERT INTO levels (id, unit_id, type, status, xp_earned, stars, attempts)
             VALUES (?, ?, ?, ?, ?, ?, 0)`,
            [nextLevelId, currentUnit.id, "lesson", "current", 0, 0],
          );
        }
      } else if (currentUnit.quizIds.length > 0) {
        // All lessons done, unlock the quiz
        const quizId = currentUnit.quizIds[0];
        console.log("All lessons completed, unlocking quiz:", quizId);

        const existingQuiz = await getLevelProgress(quizId);
        if (existingQuiz) {
          await database.runAsync(
            "UPDATE levels SET status = ? WHERE id = ? AND status = ?",
            ["current", quizId, "locked"],
          );
        } else {
          await database.runAsync(
            `INSERT INTO levels (id, unit_id, type, status, xp_earned, stars, attempts)
             VALUES (?, ?, ?, ?, ?, ?, 0)`,
            [quizId, currentUnit.id, "quiz", "current", 0, 0],
          );
        }
      }
    }
  } catch (error) {
    console.error("Error unlocking next level:", error);
  }
};

// Daily Activity
export const logDailyActivity = async (
  date: string,
  data: {
    xp_earned?: number;
    lessons_completed?: number;
    myths_busted?: number;
    time_spent_minutes?: number;
  },
) => {
  const database = getDatabase();
  await database.runAsync(
    `INSERT INTO daily_activity (date, xp_earned, lessons_completed, myths_busted, time_spent_minutes)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       xp_earned = xp_earned + excluded.xp_earned,
       lessons_completed = lessons_completed + excluded.lessons_completed,
       myths_busted = myths_busted + excluded.myths_busted,
       time_spent_minutes = time_spent_minutes + excluded.time_spent_minutes`,
    [
      date,
      data.xp_earned || 0,
      data.lessons_completed || 0,
      data.myths_busted || 0,
      data.time_spent_minutes || 0,
    ],
  );
};

export const getDailyActivity = async (startDate: string, endDate: string) => {
  const database = getDatabase();
  return await database.getAllAsync(
    "SELECT * FROM daily_activity WHERE date BETWEEN ? AND ? ORDER BY date DESC",
    [startDate, endDate],
  );
};

/* ---------- Personal game leaderboard ---------- */

export const saveGameScore = async (gameId: string, score: number) => {
  const database = getDatabase();
  await database.runAsync(
    "INSERT INTO game_scores (game_id, score) VALUES (?, ?)",
    [gameId, Math.max(0, Math.round(score))],
  );
};

export type GameBestScore = {
  game_id: string;
  best: number;
  plays: number;
};

export const getBestGameScores = async (): Promise<GameBestScore[]> => {
  const database = getDatabase();
  return (await database.getAllAsync(
    "SELECT game_id, MAX(score) as best, COUNT(*) as plays FROM game_scores GROUP BY game_id ORDER BY best DESC",
  )) as GameBestScore[];
};

export const getGameScores = async (
  gameId: string,
  limit = 10,
): Promise<{ score: number; created_at: string }[]> => {
  const database = getDatabase();
  return (await database.getAllAsync(
    "SELECT score, created_at FROM game_scores WHERE game_id = ? ORDER BY score DESC LIMIT ?",
    [gameId, limit],
  )) as { score: number; created_at: string }[];
};

// Clear all data (for testing/reset)
export const clearAllData = async () => {
  const database = getDatabase();
  await database.execAsync(`
    DELETE FROM user_profile;
    DELETE FROM units;
    DELETE FROM levels;
    DELETE FROM lesson_steps;
    DELETE FROM daily_activity;
    DELETE FROM achievements;
    DELETE FROM leaderboard;
    DELETE FROM game_scores;
  `);
};

const deleteTableRowsIfExists = async (
  database: SQLite.SQLiteDatabase,
  tableName: string,
) => {
  const table = await database.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [tableName],
  );

  if (!table) {
    return;
  }

  await database.execAsync(`DELETE FROM ${tableName};`);
};

export const deleteAccountData = async () => {
  const database = await getDatabaseReady();

  // Delete children before parent tables where foreign keys exist.
  const tableDeletionOrder = [
    "sync_queue",
    "sync_status",
    "poll_votes",
    "likes",
    "comments",
    "bookmarks",
    "bookmark_collections",
    "community_posts",
    "friendships",
    "notifications",
    "user_activities",
    "blocked_users",
    "reports",
    "followed_topics",
    "user_settings",
    "user_profiles",
    "explorer_nodes",
    "explorer_mazes",
    "explorer_journeys",
    "chat_messages",
    "saved_notes",
    "chat_conversations",
    "user_profile",
    "lesson_steps",
    "levels",
    "units",
    "daily_activity",
    "achievements",
    "leaderboard",
    "game_scores",
  ] as const;

  for (const tableName of tableDeletionOrder) {
    await deleteTableRowsIfExists(database, tableName);
  }
};

export default {
  initDatabase,
  getDatabase,
  getLegacyUserProfile,
  getUserProfile,
  createOrUpdateUserProfile,
  getLevelProgress,
  updateLevelProgress,
  getAllLevels,
  unlockNextLevel,
  logDailyActivity,
  getDailyActivity,
  saveGameScore,
  getBestGameScores,
  getGameScores,
  clearAllData,
  deleteAccountData,
};
