/**
 * Post Repository
 * 
 * Handles all database operations for community posts.
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository, QueryOptions } from '../base-repository';
import {
    CommunityPost,
    CreateCommunityPost,
    PollOption,
    PostQueryOptions
} from '../types';
import { extractHashtags, now } from '../utils';

export class PostRepository extends BaseRepository<CommunityPost> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'community_posts', ['media_urls', 'poll_options', 'tags']);
  }

  /**
   * Create a new post
   */
  async createPost(data: CreateCommunityPost): Promise<CommunityPost> {
    // Extract hashtags from content
    const extractedTags = extractHashtags(data.content);
    const allTags = [...new Set([...(data.tags || []), ...extractedTags])];
    
    return this.create({
      ...data,
      tags: allTags.length > 0 ? allTags : null,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
    } as Omit<CommunityPost, keyof import('../types').SyncMetadata>);
  }

  /**
   * Get posts for feed with pagination
   */
  async getFeedPosts(options: PostQueryOptions): Promise<CommunityPost[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (options.author_id) {
      conditions.push('author_id = ?');
      params.push(options.author_id);
    }
    
    if (options.visibility) {
      conditions.push('visibility = ?');
      params.push(options.visibility);
    } else {
      // Default to public posts
      conditions.push("visibility = 'public'");
    }
    
    if (options.type) {
      conditions.push('type = ?');
      params.push(options.type);
    }
    
    if (options.is_featured !== undefined) {
      conditions.push('is_featured = ?');
      params.push(options.is_featured ? 1 : 0);
    }
    
    if (options.tags && options.tags.length > 0) {
      // Search for any of the tags in the JSON array
      const tagConditions = options.tags.map(() => "tags LIKE ?");
      conditions.push(`(${tagConditions.join(' OR ')})`);
      options.tags.forEach(tag => params.push(`%"${tag}"%`));
    }
    
    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';
    
    return this.findWhere(whereClause, params, {
      limit: options.limit,
      offset: options.offset,
      orderBy: options.order_by || 'created_at',
      orderDirection: options.order_direction === 'asc' ? 'ASC' : 'DESC',
    });
  }

  /**
   * Get posts by author
   */
  async getPostsByAuthor(authorId: string, options: QueryOptions = {}): Promise<CommunityPost[]> {
    return this.findWhere('author_id = ?', [authorId], options);
  }

  /**
   * Get posts visible to a specific user (public + friends' posts)
   */
  async getVisiblePosts(
    userId: string, 
    friendIds: string[], 
    options: QueryOptions = {}
  ): Promise<CommunityPost[]> {
    const allIds = [userId, ...friendIds];
    const placeholders = allIds.map(() => '?').join(', ');
    
    // Get public posts + user's own posts + friends' posts (if visibility allows)
    const whereClause = `
      visibility = 'public' 
      OR author_id = ?
      OR (visibility = 'friends' AND author_id IN (${placeholders}))
    `;
    
    return this.findWhere(whereClause, [userId, ...allIds], options);
  }

  /**
   * Get featured posts
   */
  async getFeaturedPosts(limit: number = 10): Promise<CommunityPost[]> {
    return this.findWhere('is_featured = 1', [], { limit, orderBy: 'created_at', orderDirection: 'DESC' });
  }

  /**
   * Get pinned posts
   */
  async getPinnedPosts(authorId?: string): Promise<CommunityPost[]> {
    const conditions = ['is_pinned = 1'];
    const params: any[] = [];
    
    if (authorId) {
      conditions.push('author_id = ?');
      params.push(authorId);
    }
    
    return this.findWhere(conditions.join(' AND '), params);
  }

  /**
   * Search posts by content or tags
   */
  async searchPosts(query: string, options: QueryOptions = {}): Promise<CommunityPost[]> {
    return this.search(['title', 'content'], query, options);
  }

  /**
   * Get posts by tag
   */
  async getPostsByTag(tag: string, options: QueryOptions = {}): Promise<CommunityPost[]> {
    return this.findWhere("tags LIKE ?", [`%"${tag.toLowerCase()}"%`], options);
  }

  /**
   * Get trending posts (high engagement in recent time)
   */
  async getTrendingPosts(hoursAgo: number = 24, limit: number = 20): Promise<CommunityPost[]> {
    const cutoffTime = now() - (hoursAgo * 60 * 60 * 1000);
    
    const sql = `
      SELECT *, (likes_count + comments_count * 2 + shares_count * 3) as engagement_score
      FROM ${this.tableName}
      WHERE created_at > ? AND visibility = 'public' AND deleted_at IS NULL
      ORDER BY engagement_score DESC
      LIMIT ?
    `;
    
    const rows = await this.db.getAllAsync<any>(sql, [cutoffTime, limit]);
    return rows.map(row => this.parseRow(row)!).filter(Boolean);
  }

  /**
   * Pin/unpin a post
   */
  async togglePin(postId: string): Promise<CommunityPost | null> {
    const post = await this.findById(postId);
    if (!post) return null;
    
    return this.update(postId, { is_pinned: !post.is_pinned } as Partial<CommunityPost>);
  }

  /**
   * Feature/unfeature a post
   */
  async toggleFeature(postId: string): Promise<CommunityPost | null> {
    const post = await this.findById(postId);
    if (!post) return null;
    
    return this.update(postId, { is_featured: !post.is_featured } as Partial<CommunityPost>);
  }

  /**
   * Increment share count
   */
  async incrementShareCount(postId: string): Promise<void> {
    const sql = `
      UPDATE ${this.tableName}
      SET shares_count = shares_count + 1, is_dirty = 1, updated_at = ?, version = version + 1
      WHERE id = ?
    `;
    await this.db.runAsync(sql, [now(), postId]);
  }

  /**
   * Get poll results
   */
  async getPollResults(postId: string): Promise<PollOption[] | null> {
    const post = await this.findById(postId);
    if (!post || post.type !== 'poll' || !post.poll_options) return null;
    
    return post.poll_options;
  }

  /**
   * Update poll vote counts
   */
  async updatePollVotes(postId: string, optionId: string, increment: boolean = true): Promise<void> {
    const post = await this.findById(postId);
    if (!post || !post.poll_options) return;
    
    const updatedOptions = post.poll_options.map(option => {
      if (option.id === optionId) {
        return {
          ...option,
          votes_count: option.votes_count + (increment ? 1 : -1)
        };
      }
      return option;
    });
    
    await this.update(postId, { poll_options: updatedOptions } as Partial<CommunityPost>);
  }

  /**
   * Get posts with achievement type
   */
  async getAchievementPosts(userId?: string, limit: number = 20): Promise<CommunityPost[]> {
    const conditions = ["type = 'achievement'"];
    const params: any[] = [];
    
    if (userId) {
      conditions.push('author_id = ?');
      params.push(userId);
    }
    
    return this.findWhere(conditions.join(' AND '), params, { limit, orderBy: 'created_at', orderDirection: 'DESC' });
  }

  /**
   * Get posts mentioning a user
   */
  async getPostsMentioningUser(username: string, options: QueryOptions = {}): Promise<CommunityPost[]> {
    return this.findWhere('content LIKE ?', [`%@${username}%`], options);
  }

  /**
   * Get user's post count
   */
  async getUserPostCount(userId: string): Promise<number> {
    return this.count('author_id = ?', [userId]);
  }

  /**
   * Get popular tags (most used in recent posts)
   */
  async getPopularTags(limit: number = 20): Promise<{ tag: string; count: number }[]> {
    // This is a simplified version - in production, you might want to use a separate tags table
    const sql = `
      SELECT tags FROM ${this.tableName}
      WHERE tags IS NOT NULL AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1000
    `;
    
    const rows = await this.db.getAllAsync<{ tags: string }>(sql);
    const tagCounts = new Map<string, number>();
    
    for (const row of rows) {
      try {
        const tags = JSON.parse(row.tags) as string[];
        for (const tag of tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      } catch {
        // Skip invalid JSON
      }
    }
    
    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}
