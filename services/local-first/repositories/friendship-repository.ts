/**
 * Friendship Repository
 * 
 * Handles all database operations for friend relationships.
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository, QueryOptions } from '../base-repository';
import {
    Friendship,
    FriendshipStatus
} from '../types';
import { now } from '../utils';

export class FriendshipRepository extends BaseRepository<Friendship> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'friendships', []);
  }

  /**
   * Send a friend request
   */
  async sendFriendRequest(fromUserId: string, toUserId: string): Promise<Friendship | null> {
    // Check if friendship already exists
    const existing = await this.findFirstWhere(
      '(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [fromUserId, toUserId, toUserId, fromUserId]
    );
    
    if (existing) {
      // If blocked, don't allow
      if (existing.status === 'blocked') return null;
      // If already accepted, return existing
      if (existing.status === 'accepted') return existing;
      // If pending, return existing
      return existing;
    }
    
    // Create friendship records for both users
    const friendship = await this.create({
      user_id: fromUserId,
      friend_id: toUserId,
      status: 'pending',
      initiated_by: fromUserId,
      accepted_at: null,
    } as Omit<Friendship, keyof import('../types').SyncMetadata>);
    
    // Create reverse relationship
    await this.create({
      user_id: toUserId,
      friend_id: fromUserId,
      status: 'pending',
      initiated_by: fromUserId,
      accepted_at: null,
    } as Omit<Friendship, keyof import('../types').SyncMetadata>);
    
    return friendship;
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(userId: string, friendId: string): Promise<boolean> {
    const timestamp = now();
    
    // Update both sides of the relationship
    const updateSql = `
      UPDATE ${this.tableName}
      SET status = 'accepted', accepted_at = ?, is_dirty = 1, updated_at = ?, version = version + 1
      WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
      AND status = 'pending'
      AND deleted_at IS NULL
    `;
    
    const result = await this.db.runAsync(updateSql, [
      timestamp, timestamp,
      userId, friendId, friendId, userId
    ]);
    
    return result.changes > 0;
  }

  /**
   * Decline a friend request
   */
  async declineFriendRequest(userId: string, friendId: string): Promise<boolean> {
    const timestamp = now();
    
    // Update both sides
    const updateSql = `
      UPDATE ${this.tableName}
      SET status = 'declined', is_dirty = 1, updated_at = ?, version = version + 1
      WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
      AND status = 'pending'
      AND deleted_at IS NULL
    `;
    
    const result = await this.db.runAsync(updateSql, [
      timestamp,
      userId, friendId, friendId, userId
    ]);
    
    return result.changes > 0;
  }

  /**
   * Remove a friend (unfriend)
   */
  async removeFriend(userId: string, friendId: string): Promise<boolean> {
    const timestamp = now();
    
    // Soft delete both sides
    const deleteSql = `
      UPDATE ${this.tableName}
      SET deleted_at = ?, is_dirty = 1, updated_at = ?, version = version + 1
      WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
      AND status = 'accepted'
      AND deleted_at IS NULL
    `;
    
    const result = await this.db.runAsync(deleteSql, [
      timestamp, timestamp,
      userId, friendId, friendId, userId
    ]);
    
    return result.changes > 0;
  }

  /**
   * Block a user
   */
  async blockUser(userId: string, blockedUserId: string): Promise<Friendship> {
    // Check if relationship exists
    const existing = await this.findFirstWhere(
      'user_id = ? AND friend_id = ?',
      [userId, blockedUserId]
    );
    
    if (existing) {
      return this.update(existing.id, { status: 'blocked' } as Partial<Friendship>) as Promise<Friendship>;
    }
    
    // Create new blocked relationship
    return this.create({
      user_id: userId,
      friend_id: blockedUserId,
      status: 'blocked',
      initiated_by: userId,
      accepted_at: null,
    } as Omit<Friendship, keyof import('../types').SyncMetadata>);
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string, blockedUserId: string): Promise<boolean> {
    const friendship = await this.findFirstWhere(
      'user_id = ? AND friend_id = ? AND status = ?',
      [userId, blockedUserId, 'blocked']
    );
    
    if (!friendship) return false;
    
    return this.delete(friendship.id);
  }

  /**
   * Get user's friends
   */
  async getFriends(userId: string, options: QueryOptions = {}): Promise<Friendship[]> {
    return this.findWhere(
      'user_id = ? AND status = ?',
      [userId, 'accepted'],
      options
    );
  }

  /**
   * Get pending friend requests received
   */
  async getPendingRequestsReceived(userId: string): Promise<Friendship[]> {
    return this.findWhere(
      'user_id = ? AND status = ? AND initiated_by != ?',
      [userId, 'pending', userId],
      { orderBy: 'created_at', orderDirection: 'DESC' }
    );
  }

  /**
   * Get pending friend requests sent
   */
  async getPendingRequestsSent(userId: string): Promise<Friendship[]> {
    return this.findWhere(
      'user_id = ? AND status = ? AND initiated_by = ?',
      [userId, 'pending', userId],
      { orderBy: 'created_at', orderDirection: 'DESC' }
    );
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(userId: string): Promise<Friendship[]> {
    return this.findWhere(
      'user_id = ? AND status = ?',
      [userId, 'blocked']
    );
  }

  /**
   * Check if two users are friends
   */
  async areFriends(userId: string, otherUserId: string): Promise<boolean> {
    const friendship = await this.findFirstWhere(
      'user_id = ? AND friend_id = ? AND status = ?',
      [userId, otherUserId, 'accepted']
    );
    
    return friendship !== null;
  }

  /**
   * Check if a user is blocked
   */
  async isBlocked(userId: string, otherUserId: string): Promise<boolean> {
    const blocked = await this.findFirstWhere(
      '(user_id = ? AND friend_id = ? AND status = ?) OR (user_id = ? AND friend_id = ? AND status = ?)',
      [userId, otherUserId, 'blocked', otherUserId, userId, 'blocked']
    );
    
    return blocked !== null;
  }

  /**
   * Get friendship status between two users
   */
  async getFriendshipStatus(userId: string, otherUserId: string): Promise<FriendshipStatus | null> {
    const friendship = await this.findFirstWhere(
      'user_id = ? AND friend_id = ?',
      [userId, otherUserId]
    );
    
    return friendship?.status || null;
  }

  /**
   * Get friends count
   */
  async getFriendsCount(userId: string): Promise<number> {
    return this.count('user_id = ? AND status = ?', [userId, 'accepted']);
  }

  /**
   * Get mutual friends between two users
   */
  async getMutualFriends(userId: string, otherUserId: string): Promise<string[]> {
    const sql = `
      SELECT f1.friend_id
      FROM ${this.tableName} f1
      JOIN ${this.tableName} f2 ON f1.friend_id = f2.friend_id
      WHERE f1.user_id = ? AND f2.user_id = ?
      AND f1.status = 'accepted' AND f2.status = 'accepted'
      AND f1.deleted_at IS NULL AND f2.deleted_at IS NULL
    `;
    
    const results = await this.db.getAllAsync<{ friend_id: string }>(sql, [userId, otherUserId]);
    return results.map(r => r.friend_id);
  }

  /**
   * Get friend suggestions (friends of friends)
   */
  async getFriendSuggestions(userId: string, limit: number = 10): Promise<string[]> {
    const sql = `
      SELECT fof.friend_id, COUNT(*) as mutual_count
      FROM ${this.tableName} f
      JOIN ${this.tableName} fof ON f.friend_id = fof.user_id
      WHERE f.user_id = ? AND f.status = 'accepted'
      AND fof.status = 'accepted'
      AND fof.friend_id != ?
      AND fof.friend_id NOT IN (
        SELECT friend_id FROM ${this.tableName}
        WHERE user_id = ? AND deleted_at IS NULL
      )
      AND f.deleted_at IS NULL AND fof.deleted_at IS NULL
      GROUP BY fof.friend_id
      ORDER BY mutual_count DESC
      LIMIT ?
    `;
    
    const results = await this.db.getAllAsync<{ friend_id: string }>(sql, [userId, userId, userId, limit]);
    return results.map(r => r.friend_id);
  }
}
