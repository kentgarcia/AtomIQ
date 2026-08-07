/**
 * Bookmark Repository
 * 
 * Handles all database operations for bookmarks.
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository, QueryOptions } from '../base-repository';
import { Bookmark, BookmarkableType, BookmarkCollection } from '../types';
import { now } from '../utils';

export class BookmarkRepository extends BaseRepository<Bookmark> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'bookmarks', []);
  }

  /**
   * Add a bookmark
   */
  async addBookmark(
    userId: string, 
    bookmarkableType: BookmarkableType, 
    bookmarkableId: string,
    notes?: string,
    collectionId?: string
  ): Promise<Bookmark | null> {
    // Check if already bookmarked
    const existing = await this.findFirstWhere(
      'user_id = ? AND bookmarkable_type = ? AND bookmarkable_id = ?',
      [userId, bookmarkableType, bookmarkableId],
      true // Include deleted
    );
    
    if (existing) {
      if (existing.deleted_at) {
        // Restore the bookmark
        return this.restore(existing.id);
      }
      // Already bookmarked - update notes if provided
      if (notes !== undefined || collectionId !== undefined) {
        return this.update(existing.id, {
          ...(notes !== undefined && { notes }),
          ...(collectionId !== undefined && { collection_id: collectionId }),
        } as Partial<Bookmark>);
      }
      return existing;
    }
    
    return this.create({
      user_id: userId,
      bookmarkable_type: bookmarkableType,
      bookmarkable_id: bookmarkableId,
      notes: notes || null,
      collection_id: collectionId || null,
    } as Omit<Bookmark, keyof import('../types').SyncMetadata>);
  }

  /**
   * Remove a bookmark
   */
  async removeBookmark(userId: string, bookmarkableType: BookmarkableType, bookmarkableId: string): Promise<boolean> {
    const existing = await this.findFirstWhere(
      'user_id = ? AND bookmarkable_type = ? AND bookmarkable_id = ?',
      [userId, bookmarkableType, bookmarkableId]
    );
    
    if (!existing) return false;
    
    return this.delete(existing.id);
  }

  /**
   * Toggle bookmark
   */
  async toggleBookmark(
    userId: string, 
    bookmarkableType: BookmarkableType, 
    bookmarkableId: string
  ): Promise<{ bookmarked: boolean; bookmark: Bookmark | null }> {
    const existing = await this.findFirstWhere(
      'user_id = ? AND bookmarkable_type = ? AND bookmarkable_id = ?',
      [userId, bookmarkableType, bookmarkableId]
    );
    
    if (existing) {
      await this.delete(existing.id);
      return { bookmarked: false, bookmark: null };
    }
    
    const bookmark = await this.addBookmark(userId, bookmarkableType, bookmarkableId);
    return { bookmarked: true, bookmark };
  }

  /**
   * Check if user has bookmarked something
   */
  async hasBookmarked(userId: string, bookmarkableType: BookmarkableType, bookmarkableId: string): Promise<boolean> {
    const count = await this.count(
      'user_id = ? AND bookmarkable_type = ? AND bookmarkable_id = ?',
      [userId, bookmarkableType, bookmarkableId]
    );
    return count > 0;
  }

  /**
   * Get user's bookmarks
   */
  async getUserBookmarks(userId: string, options: QueryOptions = {}): Promise<Bookmark[]> {
    return this.findWhere('user_id = ?', [userId], options);
  }

  /**
   * Get user's bookmarks by type
   */
  async getUserBookmarksByType(
    userId: string, 
    bookmarkableType: BookmarkableType, 
    options: QueryOptions = {}
  ): Promise<Bookmark[]> {
    return this.findWhere(
      'user_id = ? AND bookmarkable_type = ?',
      [userId, bookmarkableType],
      options
    );
  }

  /**
   * Get user's bookmarks in a collection
   */
  async getBookmarksInCollection(userId: string, collectionId: string, options: QueryOptions = {}): Promise<Bookmark[]> {
    return this.findWhere(
      'user_id = ? AND collection_id = ?',
      [userId, collectionId],
      options
    );
  }

  /**
   * Get uncategorized bookmarks
   */
  async getUncategorizedBookmarks(userId: string, options: QueryOptions = {}): Promise<Bookmark[]> {
    return this.findWhere(
      'user_id = ? AND collection_id IS NULL',
      [userId],
      options
    );
  }

  /**
   * Move bookmark to collection
   */
  async moveToCollection(bookmarkId: string, collectionId: string | null): Promise<Bookmark | null> {
    return this.update(bookmarkId, { collection_id: collectionId } as Partial<Bookmark>);
  }

  /**
   * Update bookmark notes
   */
  async updateNotes(bookmarkId: string, notes: string | null): Promise<Bookmark | null> {
    return this.update(bookmarkId, { notes } as Partial<Bookmark>);
  }

  /**
   * Get bookmarked IDs for a type
   */
  async getBookmarkedIds(userId: string, bookmarkableType: BookmarkableType): Promise<string[]> {
    const bookmarks = await this.getUserBookmarksByType(userId, bookmarkableType);
    return bookmarks.map(b => b.bookmarkable_id);
  }

  /**
   * Bulk check if user has bookmarked multiple items
   */
  async bulkHasBookmarked(
    userId: string,
    items: { type: BookmarkableType; id: string }[]
  ): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    
    if (items.length === 0) return result;
    
    const conditions: string[] = [];
    const params: any[] = [userId];
    
    for (const item of items) {
      conditions.push('(bookmarkable_type = ? AND bookmarkable_id = ?)');
      params.push(item.type, item.id);
    }
    
    const sql = `
      SELECT bookmarkable_type, bookmarkable_id 
      FROM ${this.tableName}
      WHERE user_id = ? AND (${conditions.join(' OR ')})
      AND deleted_at IS NULL
    `;
    
    const rows = await this.db.getAllAsync<{ bookmarkable_type: string; bookmarkable_id: string }>(sql, params);
    
    // Initialize all as false
    for (const item of items) {
      result.set(`${item.type}:${item.id}`, false);
    }
    
    // Mark bookmarked items
    for (const row of rows) {
      result.set(`${row.bookmarkable_type}:${row.bookmarkable_id}`, true);
    }
    
    return result;
  }

  /**
   * Get bookmark count by type
   */
  async getBookmarkCountByType(userId: string): Promise<Record<BookmarkableType, number>> {
    const sql = `
      SELECT bookmarkable_type, COUNT(*) as count
      FROM ${this.tableName}
      WHERE user_id = ? AND deleted_at IS NULL
      GROUP BY bookmarkable_type
    `;
    
    const rows = await this.db.getAllAsync<{ bookmarkable_type: BookmarkableType; count: number }>(sql, [userId]);
    
    const result: Record<BookmarkableType, number> = {
      post: 0,
      article: 0,
      lesson: 0,
      myth: 0,
    };
    
    for (const row of rows) {
      result[row.bookmarkable_type] = row.count;
    }
    
    return result;
  }
}

/**
 * Bookmark Collection Repository
 */
export class BookmarkCollectionRepository extends BaseRepository<BookmarkCollection> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'bookmark_collections', []);
  }

  /**
   * Create a collection
   */
  async createCollection(userId: string, name: string, description?: string): Promise<BookmarkCollection> {
    return this.create({
      user_id: userId,
      name,
      description: description || null,
      is_default: false,
    } as Omit<BookmarkCollection, keyof import('../types').SyncMetadata>);
  }

  /**
   * Get user's collections
   */
  async getUserCollections(userId: string): Promise<BookmarkCollection[]> {
    return this.findWhere('user_id = ?', [userId], { orderBy: 'name', orderDirection: 'ASC' });
  }

  /**
   * Get or create default collection
   */
  async getOrCreateDefaultCollection(userId: string): Promise<BookmarkCollection> {
    const existing = await this.findFirstWhere('user_id = ? AND is_default = 1', [userId]);
    
    if (existing) return existing;
    
    return this.create({
      user_id: userId,
      name: 'Saved',
      description: 'Default collection',
      is_default: true,
    } as Omit<BookmarkCollection, keyof import('../types').SyncMetadata>);
  }

  /**
   * Rename a collection
   */
  async renameCollection(collectionId: string, name: string): Promise<BookmarkCollection | null> {
    return this.update(collectionId, { name } as Partial<BookmarkCollection>);
  }

  /**
   * Delete collection and move bookmarks to uncategorized
   */
  async deleteCollection(db: SQLite.SQLiteDatabase, collectionId: string): Promise<boolean> {
    // Move bookmarks to uncategorized
    const timestamp = now();
    await db.runAsync(
      `UPDATE bookmarks SET collection_id = NULL, is_dirty = 1, updated_at = ? WHERE collection_id = ?`,
      [timestamp, collectionId]
    );
    
    // Delete the collection
    return this.delete(collectionId);
  }
}
