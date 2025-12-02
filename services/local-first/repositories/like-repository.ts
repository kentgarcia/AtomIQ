/**
 * Like Repository
 * 
 * Handles all database operations for likes on posts and comments.
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository, QueryOptions } from '../base-repository';
import { Like, LikeableType } from '../types';
import { now } from '../utils';

export class LikeRepository extends BaseRepository<Like> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'likes', []);
  }

  /**
   * Like a post or comment
   */
  async like(userId: string, likeableType: LikeableType, likeableId: string): Promise<Like | null> {
    // Check if already liked
    const existing = await this.findFirstWhere(
      'user_id = ? AND likeable_type = ? AND likeable_id = ?',
      [userId, likeableType, likeableId],
      true // Include deleted to handle re-likes
    );
    
    if (existing) {
      if (existing.deleted_at) {
        // Restore the like
        return this.restore(existing.id);
      }
      // Already liked
      return existing;
    }
    
    return this.create({
      user_id: userId,
      likeable_type: likeableType,
      likeable_id: likeableId,
    } as Omit<Like, keyof import('../types').SyncMetadata>);
  }

  /**
   * Unlike a post or comment
   */
  async unlike(userId: string, likeableType: LikeableType, likeableId: string): Promise<boolean> {
    const existing = await this.findFirstWhere(
      'user_id = ? AND likeable_type = ? AND likeable_id = ?',
      [userId, likeableType, likeableId]
    );
    
    if (!existing) return false;
    
    return this.delete(existing.id);
  }

  /**
   * Toggle like (like if not liked, unlike if liked)
   */
  async toggleLike(userId: string, likeableType: LikeableType, likeableId: string): Promise<{ liked: boolean; like: Like | null }> {
    const existing = await this.findFirstWhere(
      'user_id = ? AND likeable_type = ? AND likeable_id = ?',
      [userId, likeableType, likeableId]
    );
    
    if (existing) {
      await this.delete(existing.id);
      return { liked: false, like: null };
    }
    
    const like = await this.like(userId, likeableType, likeableId);
    return { liked: true, like };
  }

  /**
   * Check if user has liked something
   */
  async hasLiked(userId: string, likeableType: LikeableType, likeableId: string): Promise<boolean> {
    const count = await this.count(
      'user_id = ? AND likeable_type = ? AND likeable_id = ?',
      [userId, likeableType, likeableId]
    );
    return count > 0;
  }

  /**
   * Get all likes for a post or comment
   */
  async getLikes(likeableType: LikeableType, likeableId: string, options: QueryOptions = {}): Promise<Like[]> {
    return this.findWhere(
      'likeable_type = ? AND likeable_id = ?',
      [likeableType, likeableId],
      options
    );
  }

  /**
   * Get like count for a post or comment
   */
  async getLikeCount(likeableType: LikeableType, likeableId: string): Promise<number> {
    return this.count(
      'likeable_type = ? AND likeable_id = ?',
      [likeableType, likeableId]
    );
  }

  /**
   * Get user IDs who liked something
   */
  async getLikerIds(likeableType: LikeableType, likeableId: string, limit: number = 100): Promise<string[]> {
    const likes = await this.findWhere(
      'likeable_type = ? AND likeable_id = ?',
      [likeableType, likeableId],
      { limit, orderBy: 'created_at', orderDirection: 'DESC' }
    );
    
    return likes.map(like => like.user_id);
  }

  /**
   * Get all posts liked by a user
   */
  async getLikedPosts(userId: string, options: QueryOptions = {}): Promise<Like[]> {
    return this.findWhere(
      "user_id = ? AND likeable_type = 'post'",
      [userId],
      options
    );
  }

  /**
   * Get all post IDs liked by a user
   */
  async getLikedPostIds(userId: string): Promise<string[]> {
    const likes = await this.getLikedPosts(userId);
    return likes.map(like => like.likeable_id);
  }

  /**
   * Get user's total like count (likes given)
   */
  async getUserLikeCount(userId: string): Promise<number> {
    return this.count('user_id = ?', [userId]);
  }

  /**
   * Get likes received by a user (on their posts/comments)
   */
  async getLikesReceivedCount(userId: string, postIds: string[], commentIds: string[]): Promise<number> {
    if (postIds.length === 0 && commentIds.length === 0) return 0;
    
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (postIds.length > 0) {
      const postPlaceholders = postIds.map(() => '?').join(', ');
      conditions.push(`(likeable_type = 'post' AND likeable_id IN (${postPlaceholders}))`);
      params.push(...postIds);
    }
    
    if (commentIds.length > 0) {
      const commentPlaceholders = commentIds.map(() => '?').join(', ');
      conditions.push(`(likeable_type = 'comment' AND likeable_id IN (${commentPlaceholders}))`);
      params.push(...commentIds);
    }
    
    return this.count(conditions.join(' OR '), params);
  }

  /**
   * Bulk check if user has liked multiple items
   */
  async bulkHasLiked(
    userId: string, 
    items: Array<{ type: LikeableType; id: string }>
  ): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    
    if (items.length === 0) return result;
    
    // Build query for all items
    const conditions: string[] = [];
    const params: any[] = [userId];
    
    for (const item of items) {
      conditions.push('(likeable_type = ? AND likeable_id = ?)');
      params.push(item.type, item.id);
    }
    
    const sql = `
      SELECT likeable_type, likeable_id 
      FROM ${this.tableName}
      WHERE user_id = ? AND (${conditions.join(' OR ')})
      AND deleted_at IS NULL
    `;
    
    const rows = await this.db.getAllAsync<{ likeable_type: string; likeable_id: string }>(sql, params);
    
    // Initialize all as false
    for (const item of items) {
      result.set(`${item.type}:${item.id}`, false);
    }
    
    // Mark liked items
    for (const row of rows) {
      result.set(`${row.likeable_type}:${row.likeable_id}`, true);
    }
    
    return result;
  }

  /**
   * Delete all likes for a post or comment
   */
  async deleteLikesFor(likeableType: LikeableType, likeableId: string): Promise<void> {
    const timestamp = now();
    const sql = `
      UPDATE ${this.tableName}
      SET deleted_at = ?, is_dirty = 1, updated_at = ?, version = version + 1
      WHERE likeable_type = ? AND likeable_id = ? AND deleted_at IS NULL
    `;
    await this.db.runAsync(sql, [timestamp, timestamp, likeableType, likeableId]);
  }
}
