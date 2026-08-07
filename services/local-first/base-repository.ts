/**
 * Base Repository
 * 
 * A generic repository pattern implementation for local-first database operations.
 * Handles CRUD operations with sync metadata management.
 */

import * as SQLite from 'expo-sqlite';
import { SyncMetadata } from './types';
import {
    buildPlaceholders,
    createSyncMetadata,
    markDirty,
    notDeleted,
    now,
    safeJsonParse,
    safeJsonStringify,
    softDelete
} from './utils';

// Type for SQLite row result
type SQLiteRow = Record<string, any>;

// Base query options
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  includeDeleted?: boolean;
}

// Transaction callback type
export type TransactionCallback<T> = (tx: SQLite.SQLiteDatabase) => Promise<T>;

/**
 * Base Repository class that all entity repositories extend.
 * Provides common CRUD operations with sync metadata handling.
 */
export abstract class BaseRepository<T extends SyncMetadata> {
  protected db: SQLite.SQLiteDatabase;
  protected tableName: string;
  protected jsonColumns: string[] = [];

  constructor(db: SQLite.SQLiteDatabase, tableName: string, jsonColumns: string[] = []) {
    this.db = db;
    this.tableName = tableName;
    this.jsonColumns = jsonColumns;
  }

  /**
   * Parse JSON columns from SQLite row
   */
  protected parseRow(row: SQLiteRow | null): T | null {
    if (!row) return null;
    
    const parsed = { ...row } as any;
    
    // Parse JSON columns
    for (const col of this.jsonColumns) {
      if (parsed[col]) {
        parsed[col] = safeJsonParse(parsed[col]);
      }
    }
    
    // Convert SQLite booleans to JS booleans
    if ('is_dirty' in parsed) parsed.is_dirty = parsed.is_dirty === 1;
    if ('is_pinned' in parsed) parsed.is_pinned = parsed.is_pinned === 1;
    if ('is_featured' in parsed) parsed.is_featured = parsed.is_featured === 1;
    if ('is_premium' in parsed) parsed.is_premium = parsed.is_premium === 1;
    if ('is_edited' in parsed) parsed.is_edited = parsed.is_edited === 1;
    if ('is_read' in parsed) parsed.is_read = parsed.is_read === 1;
    if ('is_default' in parsed) parsed.is_default = parsed.is_default === 1;
    if ('notification_enabled' in parsed) parsed.notification_enabled = parsed.notification_enabled === 1;
    if ('sound_enabled' in parsed) parsed.sound_enabled = parsed.sound_enabled === 1;
    if ('haptics_enabled' in parsed) parsed.haptics_enabled = parsed.haptics_enabled === 1;
    if ('auto_play_videos' in parsed) parsed.auto_play_videos = parsed.auto_play_videos === 1;
    if ('data_saver_mode' in parsed) parsed.data_saver_mode = parsed.data_saver_mode === 1;
    
    return parsed as T;
  }

  /**
   * Prepare data for insertion/update (stringify JSON, convert booleans)
   */
  protected prepareData(data: Partial<T>): Record<string, any> {
    const prepared = { ...data } as Record<string, any>;
    
    // Stringify JSON columns
    for (const col of this.jsonColumns) {
      if (col in prepared && prepared[col] !== undefined) {
        prepared[col] = safeJsonStringify(prepared[col]);
      }
    }
    
    // Convert JS booleans to SQLite booleans
    for (const key of Object.keys(prepared)) {
      if (typeof prepared[key] === 'boolean') {
        prepared[key] = prepared[key] ? 1 : 0;
      }
    }
    
    return prepared;
  }

  /**
   * Find a record by ID
   */
  async findById(id: string, includeDeleted: boolean = false): Promise<T | null> {
    const whereClause = includeDeleted ? '' : ` AND ${notDeleted()}`;
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?${whereClause}`;
    const row = await this.db.getFirstAsync<SQLiteRow>(sql, [id]);
    return this.parseRow(row);
  }

  /**
   * Find all records with optional query options
   */
  async findAll(options: QueryOptions = {}): Promise<T[]> {
    const {
      limit,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'DESC',
      includeDeleted = false,
    } = options;

    let sql = `SELECT * FROM ${this.tableName}`;
    
    if (!includeDeleted) {
      sql += ` WHERE ${notDeleted()}`;
    }
    
    sql += ` ORDER BY ${orderBy} ${orderDirection}`;
    
    if (limit) {
      sql += ` LIMIT ${limit} OFFSET ${offset}`;
    }
    
    const rows = await this.db.getAllAsync<SQLiteRow>(sql);
    return rows.map(row => this.parseRow(row)!).filter(Boolean);
  }

  /**
   * Find records matching a WHERE clause
   */
  async findWhere(
    whereClause: string,
    params: any[] = [],
    options: QueryOptions = {}
  ): Promise<T[]> {
    const {
      limit,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'DESC',
      includeDeleted = false,
    } = options;

    let sql = `SELECT * FROM ${this.tableName} WHERE ${whereClause}`;
    
    if (!includeDeleted) {
      sql += ` AND ${notDeleted()}`;
    }
    
    sql += ` ORDER BY ${orderBy} ${orderDirection}`;
    
    if (limit) {
      sql += ` LIMIT ${limit} OFFSET ${offset}`;
    }
    
    const rows = await this.db.getAllAsync<SQLiteRow>(sql, params);
    return rows.map(row => this.parseRow(row)!).filter(Boolean);
  }

  /**
   * Find first record matching a WHERE clause
   */
  async findFirstWhere(
    whereClause: string,
    params: any[] = [],
    includeDeleted: boolean = false
  ): Promise<T | null> {
    let sql = `SELECT * FROM ${this.tableName} WHERE ${whereClause}`;
    
    if (!includeDeleted) {
      sql += ` AND ${notDeleted()}`;
    }
    
    sql += ' LIMIT 1';
    
    const row = await this.db.getFirstAsync<SQLiteRow>(sql, params);
    return this.parseRow(row);
  }

  /**
   * Count records matching optional WHERE clause
   */
  async count(whereClause?: string, params: any[] = [], includeDeleted: boolean = false): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    
    const conditions: string[] = [];
    if (whereClause) {
      conditions.push(whereClause);
    }
    if (!includeDeleted) {
      conditions.push(notDeleted());
    }
    
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    const result = await this.db.getFirstAsync<{ count: number }>(sql, params);
    return result?.count ?? 0;
  }

  /**
   * Check if a record exists
   */
  async exists(id: string, includeDeleted: boolean = false): Promise<boolean> {
    const count = await this.count('id = ?', [id], includeDeleted);
    return count > 0;
  }

  /**
   * Create a new record
   */
  async create(data: Omit<T, keyof SyncMetadata>, id?: string): Promise<T> {
    const syncMetadata = createSyncMetadata(id);
    const fullData = { ...data, ...syncMetadata };
    const prepared = this.prepareData(fullData as Partial<T>);
    
    const columns = Object.keys(prepared);
    const placeholders = buildPlaceholders(columns.length);
    const values = Object.values(prepared);
    
    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    await this.db.runAsync(sql, values);
    
    // Return the created record
    return this.findById(syncMetadata.id) as Promise<T>;
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    
    const updateData = {
      ...data,
      ...markDirty(),
      version: existing.version + 1,
    };
    
    const prepared = this.prepareData(updateData);
    const columns = Object.keys(prepared);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...Object.values(prepared), id];
    
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    
    await this.db.runAsync(sql, values);
    
    return this.findById(id);
  }

  /**
   * Soft delete a record
   */
  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;
    
    const deleteData = softDelete();
    const sql = `UPDATE ${this.tableName} SET deleted_at = ?, is_dirty = 1, version = version + 1 WHERE id = ?`;
    
    await this.db.runAsync(sql, [deleteData.deleted_at, id]);
    
    return true;
  }

  /**
   * Permanently delete a record (use with caution)
   */
  async hardDelete(id: string): Promise<boolean> {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await this.db.runAsync(sql, [id]);
    return result.changes > 0;
  }

  /**
   * Restore a soft-deleted record
   */
  async restore(id: string): Promise<T | null> {
    const sql = `UPDATE ${this.tableName} SET deleted_at = NULL, is_dirty = 1, updated_at = ?, version = version + 1 WHERE id = ?`;
    await this.db.runAsync(sql, [now(), id]);
    return this.findById(id);
  }

  /**
   * Get all dirty (unsynced) records
   */
  async getDirtyRecords(): Promise<T[]> {
    return this.findWhere('is_dirty = 1', [], { includeDeleted: true });
  }

  /**
   * Mark records as synced
   */
  async markAsSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    
    const placeholders = buildPlaceholders(ids.length);
    const sql = `UPDATE ${this.tableName} SET synced_at = ?, is_dirty = 0 WHERE id IN (${placeholders})`;
    
    await this.db.runAsync(sql, [now(), ...ids]);
  }

  /**
   * Upsert a record (insert or update)
   */
  async upsert(data: T): Promise<T> {
    const existing = await this.findById(data.id, true);
    
    if (existing) {
      // If existing record is newer, skip update
      if (existing.version >= data.version) {
        return existing;
      }
      return this.update(data.id, data) as Promise<T>;
    }
    
    // Insert new record
    const prepared = this.prepareData(data);
    const columns = Object.keys(prepared);
    const placeholders = buildPlaceholders(columns.length);
    const values = Object.values(prepared);
    
    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    await this.db.runAsync(sql, values);
    
    return this.findById(data.id) as Promise<T>;
  }

  /**
   * Bulk insert records
   */
  async bulkCreate(records: Omit<T, keyof SyncMetadata>[]): Promise<void> {
    if (records.length === 0) return;
    
    // Use transaction for better performance
    const timestamp = now();
    
    for (const record of records) {
      const syncMetadata = createSyncMetadata();
      syncMetadata.created_at = timestamp;
      syncMetadata.updated_at = timestamp;
      
      const fullData = { ...record, ...syncMetadata };
      const prepared = this.prepareData(fullData as Partial<T>);
      
      const columns = Object.keys(prepared);
      const placeholders = buildPlaceholders(columns.length);
      const values = Object.values(prepared);
      
      const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
      await this.db.runAsync(sql, values);
    }
  }

  /**
   * Bulk upsert records (for sync operations)
   */
  async bulkUpsert(records: T[]): Promise<void> {
    for (const record of records) {
      await this.upsert(record);
    }
  }

  /**
   * Search records using LIKE query
   */
  async search(
    columns: string[],
    query: string,
    options: QueryOptions = {}
  ): Promise<T[]> {
    if (!query.trim()) {
      return this.findAll(options);
    }
    
    const searchTerm = `%${query.toLowerCase()}%`;
    const whereConditions = columns.map(col => `LOWER(${col}) LIKE ?`);
    const whereClause = `(${whereConditions.join(' OR ')})`;
    const params = columns.map(() => searchTerm);
    
    return this.findWhere(whereClause, params, options);
  }

  /**
   * Get records created after a specific timestamp (for incremental sync)
   */
  async getCreatedAfter(timestamp: number): Promise<T[]> {
    return this.findWhere('created_at > ?', [timestamp], { includeDeleted: true });
  }

  /**
   * Get records updated after a specific timestamp (for incremental sync)
   */
  async getUpdatedAfter(timestamp: number): Promise<T[]> {
    return this.findWhere('updated_at > ?', [timestamp], { includeDeleted: true });
  }
}
