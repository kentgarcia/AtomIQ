/**
 * Explorer Storage System
 * Manages progress tracking for AtomIQ Explorer journeys, nodes, and mazes
 */

import * as SQLite from 'expo-sqlite';
import { getDatabase } from './database';

// Types
export interface JourneyProgress {
  journeyId: string;
  currentNodeId: string;
  completedNodes: string[];
  unlockedNodes: string[];
  startedAt: string;
  completedAt?: string;
  xpEarned: number;
  lastAccessedAt: string;
}

export interface MazeProgress {
  mazeId: string;
  currentRoomId: string;
  completedRooms: string[];
  score: number;
  startedAt: string;
  completedAt?: string;
  bestScore?: number;
  attempts: number;
}

// Initialize Explorer tables
export const initExplorerStorage = async () => {
  const db = getDatabase();
  
  await db.execAsync(`
    -- Journey Progress
    CREATE TABLE IF NOT EXISTS explorer_journeys (
      journey_id TEXT PRIMARY KEY,
      current_node_id TEXT,
      completed_nodes TEXT, -- JSON array of node IDs
      unlocked_nodes TEXT, -- JSON array of node IDs
      started_at DATETIME,
      completed_at DATETIME,
      xp_earned INTEGER DEFAULT 0,
      last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Maze Progress
    CREATE TABLE IF NOT EXISTS explorer_mazes (
      maze_id TEXT PRIMARY KEY,
      current_room_id TEXT,
      completed_rooms TEXT, -- JSON array of room IDs
      score INTEGER DEFAULT 0,
      started_at DATETIME,
      completed_at DATETIME,
      best_score INTEGER DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Node Completion (for detailed tracking)
    CREATE TABLE IF NOT EXISTS explorer_nodes (
      journey_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      xp_earned INTEGER DEFAULT 0,
      PRIMARY KEY (journey_id, node_id),
      FOREIGN KEY (journey_id) REFERENCES explorer_journeys(journey_id)
    );
  `);
};

// Journey Progress Operations

export const getJourneyProgress = async (journeyId: string): Promise<JourneyProgress | null> => {
  const db = getDatabase();
  const result = await db.getFirstAsync<{
    journey_id: string;
    current_node_id: string;
    completed_nodes: string;
    unlocked_nodes: string;
    started_at: string;
    completed_at: string | null;
    xp_earned: number;
    last_accessed_at: string;
  }>(
    'SELECT * FROM explorer_journeys WHERE journey_id = ?',
    [journeyId]
  );
  
  if (!result) return null;
  
  return {
    journeyId: result.journey_id,
    currentNodeId: result.current_node_id,
    completedNodes: JSON.parse(result.completed_nodes || '[]'),
    unlockedNodes: JSON.parse(result.unlocked_nodes || '[]'),
    startedAt: result.started_at,
    completedAt: result.completed_at || undefined,
    xpEarned: result.xp_earned,
    lastAccessedAt: result.last_accessed_at,
  };
};

export const startJourney = async (journeyId: string, firstNodeId: string): Promise<void> => {
  const db = getDatabase();
  const existing = await getJourneyProgress(journeyId);
  
  if (!existing) {
    await db.runAsync(
      `INSERT INTO explorer_journeys 
       (journey_id, current_node_id, completed_nodes, unlocked_nodes, started_at, last_accessed_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        journeyId,
        firstNodeId,
        JSON.stringify([]),
        JSON.stringify([firstNodeId]),
      ]
    );
  } else {
    await db.runAsync(
      `UPDATE explorer_journeys 
       SET last_accessed_at = CURRENT_TIMESTAMP 
       WHERE journey_id = ?`,
      [journeyId]
    );
  }
};

export const completeJourneyNode = async (
  journeyId: string,
  nodeId: string,
  xpEarned: number = 0
): Promise<void> => {
  const db = getDatabase();
  const progress = await getJourneyProgress(journeyId);
  
  if (!progress) {
    await startJourney(journeyId, nodeId);
  }
  
  const completedNodes = progress?.completedNodes || [];
  if (!completedNodes.includes(nodeId)) {
    completedNodes.push(nodeId);
  }
  
  await db.runAsync(
    `UPDATE explorer_journeys 
     SET completed_nodes = ?, 
         xp_earned = xp_earned + ?,
         last_accessed_at = CURRENT_TIMESTAMP
     WHERE journey_id = ?`,
    [JSON.stringify(completedNodes), xpEarned, journeyId]
  );
  
  // Track individual node completion
  await db.runAsync(
    `INSERT OR REPLACE INTO explorer_nodes (journey_id, node_id, xp_earned)
     VALUES (?, ?, ?)`,
    [journeyId, nodeId, xpEarned]
  );
};

export const updateJourneyCurrentNode = async (
  journeyId: string,
  nodeId: string
): Promise<void> => {
  const db = getDatabase();
  const progress = await getJourneyProgress(journeyId);
  
  if (!progress) {
    await startJourney(journeyId, nodeId);
    return;
  }
  
  const unlockedNodes = progress.unlockedNodes || [];
  if (!unlockedNodes.includes(nodeId)) {
    unlockedNodes.push(nodeId);
  }
  
  await db.runAsync(
    `UPDATE explorer_journeys 
     SET current_node_id = ?,
         unlocked_nodes = ?,
         last_accessed_at = CURRENT_TIMESTAMP
     WHERE journey_id = ?`,
    [nodeId, JSON.stringify(unlockedNodes), journeyId]
  );
};

export const completeJourney = async (journeyId: string): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE explorer_journeys 
     SET completed_at = CURRENT_TIMESTAMP,
         last_accessed_at = CURRENT_TIMESTAMP
     WHERE journey_id = ?`,
    [journeyId]
  );
};

export const getAllJourneyProgress = async (): Promise<JourneyProgress[]> => {
  const db = getDatabase();
  const results = await db.getAllAsync<{
    journey_id: string;
    current_node_id: string;
    completed_nodes: string;
    unlocked_nodes: string;
    started_at: string;
    completed_at: string | null;
    xp_earned: number;
    last_accessed_at: string;
  }>('SELECT * FROM explorer_journeys ORDER BY last_accessed_at DESC');
  
  return results.map(result => ({
    journeyId: result.journey_id,
    currentNodeId: result.current_node_id,
    completedNodes: JSON.parse(result.completed_nodes || '[]'),
    unlockedNodes: JSON.parse(result.unlocked_nodes || '[]'),
    startedAt: result.started_at,
    completedAt: result.completed_at || undefined,
    xpEarned: result.xp_earned,
    lastAccessedAt: result.last_accessed_at,
  }));
};

// Maze Progress Operations

export const getMazeProgress = async (mazeId: string): Promise<MazeProgress | null> => {
  const db = getDatabase();
  const result = await db.getFirstAsync<{
    maze_id: string;
    current_room_id: string;
    completed_rooms: string;
    score: number;
    started_at: string;
    completed_at: string | null;
    best_score: number;
    attempts: number;
    last_accessed_at: string;
  }>(
    'SELECT * FROM explorer_mazes WHERE maze_id = ?',
    [mazeId]
  );
  
  if (!result) return null;
  
  return {
    mazeId: result.maze_id,
    currentRoomId: result.current_room_id,
    completedRooms: JSON.parse(result.completed_rooms || '[]'),
    score: result.score,
    startedAt: result.started_at,
    completedAt: result.completed_at || undefined,
    bestScore: result.best_score || undefined,
    attempts: result.attempts,
  };
};

export const startMaze = async (mazeId: string, firstRoomId: string): Promise<void> => {
  const db = getDatabase();
  const existing = await getMazeProgress(mazeId);
  
  if (!existing) {
    await db.runAsync(
      `INSERT INTO explorer_mazes 
       (maze_id, current_room_id, completed_rooms, score, started_at, attempts, last_accessed_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP)`,
      [
        mazeId,
        firstRoomId,
        JSON.stringify([]),
        0,
      ]
    );
  } else {
    await db.runAsync(
      `UPDATE explorer_mazes 
       SET current_room_id = ?,
           score = 0,
           completed_rooms = ?,
           started_at = CURRENT_TIMESTAMP,
           attempts = attempts + 1,
           last_accessed_at = CURRENT_TIMESTAMP
       WHERE maze_id = ?`,
      [firstRoomId, JSON.stringify([]), mazeId]
    );
  }
};

export const updateMazeProgress = async (
  mazeId: string,
  roomId: string,
  score: number,
  completedRooms: string[]
): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE explorer_mazes 
     SET current_room_id = ?,
         score = ?,
         completed_rooms = ?,
         last_accessed_at = CURRENT_TIMESTAMP
     WHERE maze_id = ?`,
    [roomId, score, JSON.stringify(completedRooms), mazeId]
  );
};

export const completeMaze = async (
  mazeId: string,
  finalScore: number
): Promise<void> => {
  const db = getDatabase();
  const progress = await getMazeProgress(mazeId);
  const bestScore = progress?.bestScore || 0;
  
  await db.runAsync(
    `UPDATE explorer_mazes 
     SET completed_at = CURRENT_TIMESTAMP,
         score = ?,
         best_score = ?,
         last_accessed_at = CURRENT_TIMESTAMP
     WHERE maze_id = ?`,
    [
      finalScore,
      Math.max(bestScore, finalScore),
      mazeId
    ]
  );
};

export const getAllMazeProgress = async (): Promise<MazeProgress[]> => {
  const db = getDatabase();
  const results = await db.getAllAsync<{
    maze_id: string;
    current_room_id: string;
    completed_rooms: string;
    score: number;
    started_at: string;
    completed_at: string | null;
    best_score: number;
    attempts: number;
    last_accessed_at: string;
  }>('SELECT * FROM explorer_mazes ORDER BY last_accessed_at DESC');
  
  return results.map(result => ({
    mazeId: result.maze_id,
    currentRoomId: result.current_room_id,
    completedRooms: JSON.parse(result.completed_rooms || '[]'),
    score: result.score,
    startedAt: result.started_at,
    completedAt: result.completed_at || undefined,
    bestScore: result.best_score || undefined,
    attempts: result.attempts,
  }));
};

// Helper: Check if node is unlocked
export const isNodeUnlocked = async (
  journeyId: string,
  nodeId: string
): Promise<boolean> => {
  const progress = await getJourneyProgress(journeyId);
  if (!progress) return false;
  return progress.unlockedNodes.includes(nodeId);
};

// Helper: Check if journey is completed
export const isJourneyCompleted = async (journeyId: string): Promise<boolean> => {
  const progress = await getJourneyProgress(journeyId);
  return progress?.completedAt !== undefined;
};

// Helper: Get journey completion percentage
export const getJourneyCompletionPercentage = async (
  journeyId: string,
  totalNodes: number
): Promise<number> => {
  const progress = await getJourneyProgress(journeyId);
  if (!progress) return 0;
  return Math.round((progress.completedNodes.length / totalNodes) * 100);
};

export default {
  initExplorerStorage,
  getJourneyProgress,
  startJourney,
  completeJourneyNode,
  updateJourneyCurrentNode,
  completeJourney,
  getAllJourneyProgress,
  getMazeProgress,
  startMaze,
  updateMazeProgress,
  completeMaze,
  getAllMazeProgress,
  isNodeUnlocked,
  isJourneyCompleted,
  getJourneyCompletionPercentage,
};

