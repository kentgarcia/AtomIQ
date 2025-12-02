/**
 * Activity Repository
 * 
 * Handles all database operations for user activities (for feed and stats).
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository, QueryOptions } from '../base-repository';
import { ActivityType, UserActivity } from '../types';
import { now } from '../utils';

export class ActivityRepository extends BaseRepository<UserActivity> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'user_activities', ['metadata']);
  }

  /**
   * Log a user activity
   */
  async logActivity(
    userId: string,
    type: ActivityType,
    title: string,
    description?: string,
    xpEarned: number = 0,
    metadata?: Record<string, any>
  ): Promise<UserActivity> {
    return this.create({
      user_id: userId,
      type,
      title,
      description: description || null,
      xp_earned: xpEarned,
      metadata: metadata || null,
    } as Omit<UserActivity, keyof import('../types').SyncMetadata>);
  }

  /**
   * Get user's activity feed
   */
  async getUserActivity(userId: string, options: QueryOptions = {}): Promise<UserActivity[]> {
    return this.findWhere('user_id = ?', [userId], {
      ...options,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });
  }

  /**
   * Get activity by type
   */
  async getActivityByType(userId: string, type: ActivityType, options: QueryOptions = {}): Promise<UserActivity[]> {
    return this.findWhere('user_id = ? AND type = ?', [userId, type], options);
  }

  /**
   * Get recent activity for multiple users (for social feed)
   */
  async getFriendsActivity(userIds: string[], options: QueryOptions = {}): Promise<UserActivity[]> {
    if (userIds.length === 0) return [];
    
    const placeholders = userIds.map(() => '?').join(', ');
    return this.findWhere(`user_id IN (${placeholders})`, userIds, {
      ...options,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });
  }

  /**
   * Get activity summary for a date range
   */
  async getActivitySummary(
    userId: string, 
    startDate: number, 
    endDate: number
  ): Promise<{ type: ActivityType; count: number; total_xp: number }[]> {
    const sql = `
      SELECT type, COUNT(*) as count, SUM(xp_earned) as total_xp
      FROM ${this.tableName}
      WHERE user_id = ? AND created_at BETWEEN ? AND ? AND deleted_at IS NULL
      GROUP BY type
    `;
    
    return this.db.getAllAsync(sql, [userId, startDate, endDate]);
  }

  /**
   * Get daily XP earned
   */
  async getDailyXP(userId: string, daysBack: number = 7): Promise<{ date: string; xp: number }[]> {
    const startDate = now() - (daysBack * 24 * 60 * 60 * 1000);
    
    const sql = `
      SELECT date(created_at / 1000, 'unixepoch') as date, SUM(xp_earned) as xp
      FROM ${this.tableName}
      WHERE user_id = ? AND created_at > ? AND deleted_at IS NULL
      GROUP BY date(created_at / 1000, 'unixepoch')
      ORDER BY date DESC
    `;
    
    return this.db.getAllAsync(sql, [userId, startDate]);
  }

  /**
   * Log lesson completed activity
   */
  async logLessonCompleted(
    userId: string,
    lessonId: string,
    lessonTitle: string,
    xpEarned: number
  ): Promise<UserActivity> {
    return this.logActivity(
      userId,
      'lesson_completed',
      `Completed: ${lessonTitle}`,
      `Earned ${xpEarned} XP`,
      xpEarned,
      { lesson_id: lessonId }
    );
  }

  /**
   * Log quiz completed activity
   */
  async logQuizCompleted(
    userId: string,
    quizId: string,
    quizTitle: string,
    score: number,
    xpEarned: number
  ): Promise<UserActivity> {
    return this.logActivity(
      userId,
      'quiz_completed',
      `Quiz: ${quizTitle}`,
      `Score: ${score}% - Earned ${xpEarned} XP`,
      xpEarned,
      { quiz_id: quizId, score }
    );
  }

  /**
   * Log myth busted activity
   */
  async logMythBusted(
    userId: string,
    mythTitle: string,
    xpEarned: number
  ): Promise<UserActivity> {
    return this.logActivity(
      userId,
      'myth_busted',
      `Myth Busted: ${mythTitle}`,
      undefined,
      xpEarned,
      { myth_title: mythTitle }
    );
  }

  /**
   * Log achievement unlocked activity
   */
  async logAchievementUnlocked(
    userId: string,
    achievementId: string,
    achievementTitle: string
  ): Promise<UserActivity> {
    return this.logActivity(
      userId,
      'achievement_unlocked',
      `🏆 ${achievementTitle}`,
      'Achievement Unlocked!',
      0,
      { achievement_id: achievementId }
    );
  }

  /**
   * Log streak milestone activity
   */
  async logStreakMilestone(
    userId: string,
    streakDays: number,
    xpEarned: number
  ): Promise<UserActivity> {
    return this.logActivity(
      userId,
      'streak_milestone',
      `🔥 ${streakDays} Day Streak!`,
      `Keep it up! Bonus: ${xpEarned} XP`,
      xpEarned,
      { streak_days: streakDays }
    );
  }

  /**
   * Log level up activity
   */
  async logLevelUp(
    userId: string,
    newLevel: number
  ): Promise<UserActivity> {
    return this.logActivity(
      userId,
      'level_up',
      `🎉 Level ${newLevel}!`,
      'Congratulations on leveling up!',
      0,
      { level: newLevel }
    );
  }

  /**
   * Log friend added activity
   */
  async logFriendAdded(
    userId: string,
    friendId: string,
    friendUsername: string
  ): Promise<UserActivity> {
    return this.logActivity(
      userId,
      'friend_added',
      `New Friend: ${friendUsername}`,
      undefined,
      0,
      { friend_id: friendId, friend_username: friendUsername }
    );
  }

  /**
   * Get total XP earned
   */
  async getTotalXPEarned(userId: string): Promise<number> {
    const sql = `
      SELECT COALESCE(SUM(xp_earned), 0) as total
      FROM ${this.tableName}
      WHERE user_id = ? AND deleted_at IS NULL
    `;
    
    const result = await this.db.getFirstAsync<{ total: number }>(sql, [userId]);
    return result?.total ?? 0;
  }

  /**
   * Get activity count by type
   */
  async getActivityCountByType(userId: string): Promise<Record<ActivityType, number>> {
    const sql = `
      SELECT type, COUNT(*) as count
      FROM ${this.tableName}
      WHERE user_id = ? AND deleted_at IS NULL
      GROUP BY type
    `;
    
    const rows = await this.db.getAllAsync<{ type: ActivityType; count: number }>(sql, [userId]);
    
    const result: Record<ActivityType, number> = {
      lesson_completed: 0,
      quiz_completed: 0,
      myth_busted: 0,
      achievement_unlocked: 0,
      streak_milestone: 0,
      level_up: 0,
      friend_added: 0,
    };
    
    for (const row of rows) {
      result[row.type] = row.count;
    }
    
    return result;
  }
}
