/**
 * Profile Repository
 * 
 * Handles all database operations for user profiles.
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository, QueryOptions } from './base-repository';
import { CreateUserProfile, UserPreview, UserProfile } from './types';

export class ProfileRepository extends BaseRepository<UserProfile> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'user_profiles', ['notification_preferences']);
  }

  /**
   * Get the current user's profile (there should only be one local profile)
   */
  async getCurrentProfile(): Promise<UserProfile | null> {
    const profiles = await this.findAll({ limit: 1 });
    return profiles[0] || null;
  }

  /**
   * Create or update the current user's profile
   */
  async upsertCurrentProfile(data: CreateUserProfile): Promise<UserProfile> {
    const existing = await this.getCurrentProfile();
    
    if (existing) {
      return this.update(existing.id, data) as Promise<UserProfile>;
    }
    
    return this.create(data);
  }

  /**
   * Find a user by username
   */
  async findByUsername(username: string): Promise<UserProfile | null> {
    return this.findFirstWhere('username = ?', [username.toLowerCase()]);
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<UserProfile | null> {
    return this.findFirstWhere('email = ?', [email.toLowerCase()]);
  }

  /**
   * Update XP and recalculate level
   */
  async addXP(userId: string, xpAmount: number): Promise<UserProfile | null> {
    const profile = await this.findById(userId);
    if (!profile) return null;
    
    const newXP = profile.total_xp + xpAmount;
    const newLevel = Math.floor(newXP / 100) + 1;
    
    return this.update(userId, {
      total_xp: newXP,
      level: newLevel,
    } as Partial<UserProfile>);
  }

  /**
   * Update streak (increment or reset)
   */
  async updateStreak(userId: string, isConsecutive: boolean): Promise<UserProfile | null> {
    const profile = await this.findById(userId);
    if (!profile) return null;
    
    let newStreak = isConsecutive ? profile.current_streak + 1 : 1;
    const newLongestStreak = Math.max(newStreak, profile.longest_streak);
    
    return this.update(userId, {
      current_streak: newStreak,
      longest_streak: newLongestStreak,
    } as Partial<UserProfile>);
  }

  /**
   * Increment lessons completed counter
   */
  async incrementLessonsCompleted(userId: string): Promise<UserProfile | null> {
    const profile = await this.findById(userId);
    if (!profile) return null;
    
    return this.update(userId, {
      lessons_completed: profile.lessons_completed + 1,
    } as Partial<UserProfile>);
  }

  /**
   * Increment myths busted counter
   */
  async incrementMythsBusted(userId: string): Promise<UserProfile | null> {
    const profile = await this.findById(userId);
    if (!profile) return null;
    
    return this.update(userId, {
      myths_busted: profile.myths_busted + 1,
    } as Partial<UserProfile>);
  }

  /**
   * Get user preview (for displaying in lists, mentions, etc.)
   */
  async getUserPreview(userId: string): Promise<UserPreview | null> {
    const profile = await this.findById(userId);
    if (!profile) return null;
    
    return {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      level: profile.level,
    };
  }

  /**
   * Get multiple user previews
   */
  async getUserPreviews(userIds: string[]): Promise<UserPreview[]> {
    if (userIds.length === 0) return [];
    
    const placeholders = userIds.map(() => '?').join(', ');
    const profiles = await this.findWhere(`id IN (${placeholders})`, userIds);
    
    return profiles.map(profile => ({
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      level: profile.level,
    }));
  }

  /**
   * Search users by username or display name
   */
  async searchUsers(query: string, options: QueryOptions = {}): Promise<UserProfile[]> {
    return this.search(['username', 'display_name'], query, options);
  }

  /**
   * Get leaderboard (top users by XP)
   */
  async getLeaderboard(limit: number = 100): Promise<UserProfile[]> {
    return this.findAll({
      limit,
      orderBy: 'total_xp',
      orderDirection: 'DESC',
    });
  }

  /**
   * Get user's rank in leaderboard
   */
  async getUserRank(userId: string): Promise<number> {
    const sql = `
      SELECT COUNT(*) + 1 as rank
      FROM ${this.tableName}
      WHERE total_xp > (SELECT total_xp FROM ${this.tableName} WHERE id = ?)
      AND deleted_at IS NULL
    `;
    
    const result = await this.db.getFirstAsync<{ rank: number }>(sql, [userId]);
    return result?.rank ?? 0;
  }
}
