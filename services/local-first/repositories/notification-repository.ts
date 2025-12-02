/**
 * Notification Repository
 * 
 * Handles all database operations for user notifications.
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository, QueryOptions } from '../base-repository';
import { CreateNotification, Notification, NotificationType } from '../types';
import { now } from '../utils';

export class NotificationRepository extends BaseRepository<Notification> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'notifications', ['data']);
  }

  /**
   * Create a notification
   */
  async createNotification(data: CreateNotification): Promise<Notification> {
    return this.create({
      ...data,
      is_read: false,
      read_at: null,
    } as Omit<Notification, keyof import('../types').SyncMetadata>);
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(userId: string, options: QueryOptions = {}): Promise<Notification[]> {
    return this.findWhere('user_id = ?', [userId], {
      ...options,
      orderBy: options.orderBy || 'created_at',
      orderDirection: options.orderDirection || 'DESC',
    });
  }

  /**
   * Get unread notifications
   */
  async getUnreadNotifications(userId: string, options: QueryOptions = {}): Promise<Notification[]> {
    return this.findWhere('user_id = ? AND is_read = 0', [userId], {
      ...options,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.count('user_id = ? AND is_read = 0', [userId]);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification | null> {
    const notification = await this.findById(notificationId);
    if (!notification || notification.is_read) return notification;
    
    return this.update(notificationId, {
      is_read: true,
      read_at: now(),
    } as Partial<Notification>);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    const timestamp = now();
    const sql = `
      UPDATE ${this.tableName}
      SET is_read = 1, read_at = ?, is_dirty = 1, updated_at = ?, version = version + 1
      WHERE user_id = ? AND is_read = 0 AND deleted_at IS NULL
    `;
    await this.db.runAsync(sql, [timestamp, timestamp, userId]);
  }

  /**
   * Get notifications by type
   */
  async getNotificationsByType(userId: string, type: NotificationType, options: QueryOptions = {}): Promise<Notification[]> {
    return this.findWhere('user_id = ? AND type = ?', [userId, type], options);
  }

  /**
   * Delete old notifications (cleanup)
   */
  async deleteOldNotifications(userId: string, olderThanDays: number = 30): Promise<void> {
    const cutoff = now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const timestamp = now();
    
    const sql = `
      UPDATE ${this.tableName}
      SET deleted_at = ?, is_dirty = 1, updated_at = ?, version = version + 1
      WHERE user_id = ? AND created_at < ? AND deleted_at IS NULL
    `;
    await this.db.runAsync(sql, [timestamp, timestamp, userId, cutoff]);
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: string): Promise<void> {
    const timestamp = now();
    const sql = `
      UPDATE ${this.tableName}
      SET deleted_at = ?, is_dirty = 1, updated_at = ?, version = version + 1
      WHERE user_id = ? AND deleted_at IS NULL
    `;
    await this.db.runAsync(sql, [timestamp, timestamp, userId]);
  }

  /**
   * Create friend request notification
   */
  async createFriendRequestNotification(
    toUserId: string, 
    fromUserId: string, 
    fromUsername: string
  ): Promise<Notification> {
    return this.createNotification({
      user_id: toUserId,
      type: 'friend_request',
      title: 'New Friend Request',
      body: `${fromUsername} wants to be your friend`,
      data: { from_user_id: fromUserId, from_username: fromUsername },
    });
  }

  /**
   * Create post like notification
   */
  async createPostLikeNotification(
    toUserId: string,
    fromUserId: string,
    fromUsername: string,
    postId: string,
    postTitle: string
  ): Promise<Notification> {
    return this.createNotification({
      user_id: toUserId,
      type: 'post_like',
      title: 'New Like',
      body: `${fromUsername} liked your post "${postTitle}"`,
      data: { from_user_id: fromUserId, post_id: postId },
    });
  }

  /**
   * Create comment notification
   */
  async createCommentNotification(
    toUserId: string,
    fromUserId: string,
    fromUsername: string,
    postId: string,
    commentId: string,
    commentPreview: string
  ): Promise<Notification> {
    return this.createNotification({
      user_id: toUserId,
      type: 'comment',
      title: 'New Comment',
      body: `${fromUsername}: ${commentPreview.substring(0, 50)}${commentPreview.length > 50 ? '...' : ''}`,
      data: { from_user_id: fromUserId, post_id: postId, comment_id: commentId },
    });
  }

  /**
   * Create achievement notification
   */
  async createAchievementNotification(
    userId: string,
    achievementTitle: string,
    achievementDescription: string,
    achievementId: string
  ): Promise<Notification> {
    return this.createNotification({
      user_id: userId,
      type: 'achievement',
      title: '🏆 Achievement Unlocked!',
      body: achievementTitle,
      data: { achievement_id: achievementId, description: achievementDescription },
    });
  }

  /**
   * Create streak reminder notification
   */
  async createStreakReminderNotification(userId: string, currentStreak: number): Promise<Notification> {
    return this.createNotification({
      user_id: userId,
      type: 'streak_reminder',
      title: '🔥 Keep Your Streak!',
      body: `Don't lose your ${currentStreak} day streak! Complete a lesson today.`,
      data: { current_streak: currentStreak },
    });
  }

  /**
   * Check if similar notification exists (to prevent duplicates)
   */
  async hasSimilarNotification(
    userId: string, 
    type: NotificationType, 
    dataKey: string, 
    dataValue: string,
    withinMinutes: number = 60
  ): Promise<boolean> {
    const cutoff = now() - (withinMinutes * 60 * 1000);
    
    const notifications = await this.findWhere(
      'user_id = ? AND type = ? AND created_at > ?',
      [userId, type, cutoff]
    );
    
    return notifications.some(n => n.data && (n.data as any)[dataKey] === dataValue);
  }
}
