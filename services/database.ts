import { UNITS } from '@/content/units';
import * as SQLite from 'expo-sqlite';
import { initExplorerStorage } from './explorer-storage';
import { LOCAL_FIRST_SCHEMA } from './local-first/schema';

// Database instance
let db: SQLite.SQLiteDatabase | null = null;

// Initialize database
export const initDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync('atomiq.db');
    
    // Create tables
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      -- User Profile
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
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
        rank INTEGER,
        cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Initialize local-first database schema (for social features and sync)
    await db.execAsync(LOCAL_FIRST_SCHEMA);
    
    // Initialize levels from syllabus if database is empty
    await initializeLevelsFromSyllabus();
    
    // Initialize chat history tables
    const { initChatHistoryDB } = await import('./chat-history');
    await initChatHistoryDB();
    
    // Initialize explorer storage
    await initExplorerStorage();
    
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Initialize levels from syllabus (only if database is empty)
const initializeLevelsFromSyllabus = async () => {
  try {
    const database = db;
    if (!database) return;

    // Check if levels already exist
    const existingLevels = await database.getFirstAsync('SELECT COUNT(*) as count FROM levels');
    if (existingLevels && (existingLevels as any).count > 0) {
      console.log('Levels already initialized, skipping...');
      return;
    }

    console.log('Initializing levels from syllabus...');

    // Insert all lessons and quizzes from the syllabus
    for (const unit of UNITS) {
      // Insert lessons
      for (let i = 0; i < unit.lessonIds.length; i++) {
        const lessonId = unit.lessonIds[i];
        const isFirstLesson = i === 0 && unit.order === 1; // First lesson of first unit
        
        await database.runAsync(
          `INSERT OR IGNORE INTO levels (id, unit_id, type, status, xp_earned, stars, attempts) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [lessonId, unit.id, 'lesson', isFirstLesson ? 'current' : 'locked', 0, 0, 0]
        );
      }

      // Insert quizzes
      for (const quizId of unit.quizIds) {
        await database.runAsync(
          `INSERT OR IGNORE INTO levels (id, unit_id, type, status, xp_earned, stars, attempts) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [quizId, unit.id, 'quiz', 'locked', 0, 0, 0]
        );
      }
    }

    console.log('Levels initialized from syllabus');
  } catch (error) {
    console.error('Error initializing levels:', error);
  }
};

// Get database instance
export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

// User Profile Operations
export const getUserProfile = async () => {
  const database = getDatabase();
  const result = await database.getFirstAsync('SELECT * FROM user_profile LIMIT 1');
  return result;
};

export const createOrUpdateUserProfile = async (profile: {
  username?: string;
  avatar_url?: string;
  total_xp?: number;
  current_streak?: number;
  longest_streak?: number;
  myths_busted?: number;
  lessons_completed?: number;
}) => {
  const database = getDatabase();
  const existing = await getUserProfile();
  
  if (existing) {
    // Update
    await database.runAsync(
      `UPDATE user_profile SET 
        username = COALESCE(?, username),
        avatar_url = COALESCE(?, avatar_url),
        total_xp = COALESCE(?, total_xp),
        current_streak = COALESCE(?, current_streak),
        longest_streak = COALESCE(?, longest_streak),
        myths_busted = COALESCE(?, myths_busted),
        lessons_completed = COALESCE(?, lessons_completed),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        profile.username,
        profile.avatar_url,
        profile.total_xp,
        profile.current_streak,
        profile.longest_streak,
        profile.myths_busted,
        profile.lessons_completed,
        (existing as any).id
      ]
    );
  } else {
    // Create
    await database.runAsync(
      `INSERT INTO user_profile (username, avatar_url, total_xp, current_streak, longest_streak, myths_busted, lessons_completed)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        profile.username || 'Scientist',
        profile.avatar_url || '',
        profile.total_xp || 0,
        profile.current_streak || 0,
        profile.longest_streak || 0,
        profile.myths_busted || 0,
        profile.lessons_completed || 0
      ]
    );
  }
};

// Level Operations
export const getLevelProgress = async (levelId: string) => {
  const database = getDatabase();
  return await database.getFirstAsync('SELECT * FROM levels WHERE id = ?', [levelId]);
};

export const updateLevelProgress = async (levelId: string, data: {
  status?: string;
  xp_earned?: number;
  stars?: number;
  completed_at?: string;
}) => {
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
      [data.status, data.xp_earned, data.stars, data.completed_at, levelId]
    );
  } else {
    await database.runAsync(
      `INSERT INTO levels (id, unit_id, status, xp_earned, stars, completed_at, attempts)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [levelId, levelId.split('-')[0], data.status || 'locked', data.xp_earned || 0, data.stars || 0, data.completed_at || null]
    );
  }
};

export const getAllLevels = async () => {
  const database = getDatabase();
  return await database.getAllAsync('SELECT * FROM levels ORDER BY id');
};

// Daily Activity
export const logDailyActivity = async (date: string, data: {
  xp_earned?: number;
  lessons_completed?: number;
  myths_busted?: number;
  time_spent_minutes?: number;
}) => {
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
      data.time_spent_minutes || 0
    ]
  );
};

export const getDailyActivity = async (startDate: string, endDate: string) => {
  const database = getDatabase();
  return await database.getAllAsync(
    'SELECT * FROM daily_activity WHERE date BETWEEN ? AND ? ORDER BY date DESC',
    [startDate, endDate]
  );
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
  `);
};

export default {
  initDatabase,
  getDatabase,
  getUserProfile,
  createOrUpdateUserProfile,
  getLevelProgress,
  updateLevelProgress,
  getAllLevels,
  logDailyActivity,
  getDailyActivity,
  clearAllData,
};

