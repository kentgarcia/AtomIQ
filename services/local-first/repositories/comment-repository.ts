/**
 * Comment Repository
 * 
 * Handles all database operations for comments on posts.
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository, QueryOptions } from '../base-repository';
import { Comment, CommentQueryOptions, CreateComment } from '../types';
import { now } from '../utils';

export class CommentRepository extends BaseRepository<Comment> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'comments', []);
  }

  /**
   * Create a new comment
   */
  async createComment(data: CreateComment): Promise<Comment> {
    // Calculate depth based on parent comment
    let depth = 0;
    if (data.parent_comment_id) {
      const parent = await this.findById(data.parent_comment_id);
      if (parent) {
        depth = parent.depth + 1;
      }
    }
    
    return this.create({
      ...data,
      depth,
      likes_count: 0,
      is_edited: false,
    } as Omit<Comment, keyof import('../types').SyncMetadata>);
  }

  /**
   * Get comments for a post with pagination
   */
  async getPostComments(options: CommentQueryOptions): Promise<Comment[]> {
    const conditions: string[] = ['post_id = ?'];
    const params: any[] = [options.post_id];
    
    if (options.parent_comment_id === null) {
      // Get only top-level comments
      conditions.push('parent_comment_id IS NULL');
    } else if (options.parent_comment_id) {
      // Get replies to a specific comment
      conditions.push('parent_comment_id = ?');
      params.push(options.parent_comment_id);
    }
    
    const whereClause = conditions.join(' AND ');
    
    return this.findWhere(whereClause, params, {
      limit: options.limit,
      offset: options.offset,
      orderBy: options.order_by || 'created_at',
      orderDirection: options.order_direction === 'desc' ? 'DESC' : 'ASC',
    });
  }

  /**
   * Get top-level comments for a post
   */
  async getTopLevelComments(postId: string, options: QueryOptions = {}): Promise<Comment[]> {
    return this.findWhere('post_id = ? AND parent_comment_id IS NULL', [postId], options);
  }

  /**
   * Get replies to a comment
   */
  async getReplies(commentId: string, options: QueryOptions = {}): Promise<Comment[]> {
    return this.findWhere('parent_comment_id = ?', [commentId], options);
  }

  /**
   * Get all replies in a thread (recursive)
   */
  async getThreadReplies(commentId: string): Promise<Comment[]> {
    const sql = `
      WITH RECURSIVE thread AS (
        SELECT * FROM ${this.tableName} WHERE id = ? AND deleted_at IS NULL
        UNION ALL
        SELECT c.* FROM ${this.tableName} c
        JOIN thread t ON c.parent_comment_id = t.id
        WHERE c.deleted_at IS NULL
      )
      SELECT * FROM thread WHERE id != ? ORDER BY created_at ASC
    `;
    
    const rows = await this.db.getAllAsync<any>(sql, [commentId, commentId]);
    return rows.map(row => this.parseRow(row)!).filter(Boolean);
  }

  /**
   * Get comments by author
   */
  async getCommentsByAuthor(authorId: string, options: QueryOptions = {}): Promise<Comment[]> {
    return this.findWhere('author_id = ?', [authorId], options);
  }

  /**
   * Edit a comment
   */
  async editComment(commentId: string, content: string): Promise<Comment | null> {
    const comment = await this.findById(commentId);
    if (!comment) return null;
    
    return this.update(commentId, {
      content,
      is_edited: true,
    } as Partial<Comment>);
  }

  /**
   * Get reply count for a comment
   */
  async getReplyCount(commentId: string): Promise<number> {
    return this.count('parent_comment_id = ?', [commentId]);
  }

  /**
   * Get comment count for a post
   */
  async getPostCommentCount(postId: string): Promise<number> {
    return this.count('post_id = ?', [postId]);
  }

  /**
   * Get most liked comments for a post
   */
  async getMostLikedComments(postId: string, limit: number = 5): Promise<Comment[]> {
    return this.findWhere('post_id = ? AND parent_comment_id IS NULL', [postId], {
      limit,
      orderBy: 'likes_count',
      orderDirection: 'DESC',
    });
  }

  /**
   * Get recent comments across all posts (for moderation)
   */
  async getRecentComments(limit: number = 50): Promise<Comment[]> {
    return this.findAll({
      limit,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });
  }

  /**
   * Get comments mentioning a user
   */
  async getCommentsMentioningUser(username: string, options: QueryOptions = {}): Promise<Comment[]> {
    return this.findWhere('content LIKE ?', [`%@${username}%`], options);
  }

  /**
   * Delete all comments for a post (when post is deleted)
   */
  async deletePostComments(postId: string): Promise<void> {
    const timestamp = now();
    const sql = `
      UPDATE ${this.tableName}
      SET deleted_at = ?, is_dirty = 1, updated_at = ?, version = version + 1
      WHERE post_id = ? AND deleted_at IS NULL
    `;
    await this.db.runAsync(sql, [timestamp, timestamp, postId]);
  }

  /**
   * Get user's comment count
   */
  async getUserCommentCount(userId: string): Promise<number> {
    return this.count('author_id = ?', [userId]);
  }

  /**
   * Check if user has commented on a post
   */
  async hasUserCommented(userId: string, postId: string): Promise<boolean> {
    const count = await this.count('author_id = ? AND post_id = ?', [userId, postId]);
    return count > 0;
  }
}
