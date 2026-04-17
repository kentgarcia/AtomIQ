/**
 * Sync Manager
 *
 * Handles synchronization between local SQLite database and Supabase.
 */

import { type SupabaseClient } from "@supabase/supabase-js";
import * as SQLite from "expo-sqlite";
import { Database } from "../supabase.types";
import { SYNCABLE_TABLES, SyncableTable } from "./schema";
import { SyncQueueItem, SyncStatus } from "./types";
import { generateUUID, now } from "./utils";

// Sync configuration
export interface SyncConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  syncInterval: number; // in milliseconds
  enabled: boolean;
}

const DEFAULT_CONFIG: SyncConfig = {
  batchSize: 50,
  maxRetries: 3,
  retryDelay: 1000,
  syncInterval: 30000, // 30 seconds
  enabled: false, // Disabled by default until Supabase is configured
};

// Sync event types
export type SyncEventType =
  | "sync_started"
  | "sync_completed"
  | "sync_failed"
  | "conflict_detected"
  | "records_pushed"
  | "records_pulled";

export interface SyncEvent {
  type: SyncEventType;
  table?: string;
  count?: number;
  error?: string;
  timestamp: number;
}

type SyncEventListener = (event: SyncEvent) => void;

/**
 * Sync Manager class
 *
 * Manages local-first synchronization with a remote Supabase database.
 */
export class SyncManager {
  private db: SQLite.SQLiteDatabase;
  private config: SyncConfig;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isSyncing: boolean = false;
  private listeners: SyncEventListener[] = [];
  private supabase: SupabaseClient<Database> | null = null;

  constructor(db: SQLite.SQLiteDatabase, config: Partial<SyncConfig> = {}) {
    this.db = db;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize sync status for all tables
   */
  async initialize(): Promise<void> {
    for (const table of SYNCABLE_TABLES) {
      const existing = await this.db.getFirstAsync<SyncStatus>(
        "SELECT * FROM sync_status WHERE table_name = ?",
        [table],
      );

      if (!existing) {
        await this.db.runAsync(
          `INSERT INTO sync_status (id, table_name, last_synced_at, last_sync_version, is_syncing, error)
           VALUES (?, ?, NULL, 0, 0, NULL)`,
          [generateUUID(), table],
        );
      }
    }
  }

  /**
   * Set Supabase client (call this when Supabase is configured)
   */
  setSupabaseClient(client: SupabaseClient<Database>): void {
    this.supabase = client;
    this.setEnabled(true);
  }

  /**
   * Clear Supabase client and disable sync
   */
  clearSupabaseClient(): void {
    this.supabase = null;
    this.setEnabled(false);
  }

  /**
   * Whether sync is currently enabled with a configured remote client
   */
  isEnabled(): boolean {
    return this.config.enabled && this.supabase !== null;
  }

  /**
   * Enable/disable sync
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (enabled) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  /**
   * Start automatic sync interval
   */
  startAutoSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      if (this.config.enabled && !this.isSyncing) {
        this.syncAll().catch(console.error);
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Add a sync event listener
   */
  addListener(listener: SyncEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Emit a sync event
   */
  private emit(event: SyncEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Sync listener error:", error);
      }
    }
  }

  /**
   * Add item to sync queue
   */
  async addToQueue(
    tableName: string,
    recordId: string,
    operation: "insert" | "update" | "delete",
    payload: any,
  ): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO sync_queue (id, table_name, record_id, operation, payload, created_at, attempts, last_attempt_at, error)
       VALUES (?, ?, ?, ?, ?, ?, 0, NULL, NULL)`,
      [
        generateUUID(),
        tableName,
        recordId,
        operation,
        JSON.stringify(payload),
        now(),
      ],
    );
  }

  /**
   * Get pending sync items
   */
  async getPendingItems(limit: number = 100): Promise<SyncQueueItem[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM sync_queue ORDER BY created_at ASC LIMIT ?`,
      [limit],
    );

    return rows.map((row) => ({
      ...row,
      payload: row.payload,
    }));
  }

  /**
   * Remove item from sync queue
   */
  async removeFromQueue(id: string): Promise<void> {
    await this.db.runAsync("DELETE FROM sync_queue WHERE id = ?", [id]);
  }

  /**
   * Update queue item after failed attempt
   */
  async markQueueItemFailed(id: string, error: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE sync_queue SET attempts = attempts + 1, last_attempt_at = ?, error = ? WHERE id = ?`,
      [now(), error, id],
    );
  }

  /**
   * Get sync status for a table
   */
  async getSyncStatus(tableName: string): Promise<SyncStatus | null> {
    return this.db.getFirstAsync<SyncStatus>(
      "SELECT * FROM sync_status WHERE table_name = ?",
      [tableName],
    );
  }

  /**
   * Update sync status for a table
   */
  async updateSyncStatus(
    tableName: string,
    updates: Partial<SyncStatus>,
  ): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (updates.last_synced_at !== undefined) {
      sets.push("last_synced_at = ?");
      values.push(updates.last_synced_at);
    }
    if (updates.last_sync_version !== undefined) {
      sets.push("last_sync_version = ?");
      values.push(updates.last_sync_version);
    }
    if (updates.is_syncing !== undefined) {
      sets.push("is_syncing = ?");
      values.push(updates.is_syncing ? 1 : 0);
    }
    if (updates.error !== undefined) {
      sets.push("error = ?");
      values.push(updates.error);
    }

    if (sets.length > 0) {
      values.push(tableName);
      await this.db.runAsync(
        `UPDATE sync_status SET ${sets.join(", ")} WHERE table_name = ?`,
        values,
      );
    }
  }

  /**
   * Get dirty records from a table
   */
  async getDirtyRecords(tableName: SyncableTable): Promise<any[]> {
    return this.db.getAllAsync(
      `SELECT * FROM ${tableName} WHERE is_dirty = 1`,
      [],
    );
  }

  /**
   * Mark records as synced
   */
  async markRecordsSynced(
    tableName: SyncableTable,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) return;

    const placeholders = ids.map(() => "?").join(", ");
    await this.db.runAsync(
      `UPDATE ${tableName} SET synced_at = ?, is_dirty = 0 WHERE id IN (${placeholders})`,
      [now(), ...ids],
    );
  }

  /**
   * Sync all tables
   */
  async syncAll(): Promise<void> {
    if (this.isSyncing || !this.config.enabled) return;

    this.isSyncing = true;
    this.emit({ type: "sync_started", timestamp: now() });

    try {
      // Push local changes first
      await this.pushChanges();

      // Pull remote changes
      await this.pullChanges();

      this.emit({ type: "sync_completed", timestamp: now() });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.emit({ type: "sync_failed", error: errorMessage, timestamp: now() });
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Push local changes to remote
   */
  async pushChanges(): Promise<void> {
    for (const table of SYNCABLE_TABLES) {
      await this.pushTableChanges(table);
    }
  }

  /**
   * Push changes for a specific table
   */
  async pushTableChanges(tableName: SyncableTable): Promise<void> {
    if (!this.supabase) return;

    const remoteTableName = this.getRemoteTableName(tableName);
    if (!remoteTableName) return;

    const dirtyRecords = await this.getDirtyRecords(tableName);

    if (dirtyRecords.length === 0) return;

    await this.updateSyncStatus(tableName, { is_syncing: true });

    try {
      const [currentAuthUserId, currentLocalUserId] = await Promise.all([
        this.getCurrentAuthUserId(),
        this.getCurrentLocalUserId(),
      ]);

      const targetLocalUserId =
        currentLocalUserId || dirtyRecords[0]?.id || null;

      if (remoteTableName === "users" && !currentAuthUserId) {
        throw new Error("Missing Supabase auth session for users sync");
      }

      const mappedRecords = dirtyRecords.map((record) =>
        this.toRemoteRecord(tableName, record, {
          currentAuthUserId,
          currentLocalUserId: targetLocalUserId,
        }),
      );
      let pushError: Error | null = null;

      if (remoteTableName === "users") {
        const { error } = await this.supabase
          .from("users")
          .upsert(
            mappedRecords as Database["public"]["Tables"]["users"]["Insert"][],
            {
              onConflict: "user_id",
              defaultToNull: false,
            },
          );

        pushError = error;
      }

      if (pushError) {
        throw pushError;
      }

      // Mark as synced
      const ids = dirtyRecords.map((r) => r.id);
      await this.markRecordsSynced(tableName, ids);

      this.emit({
        type: "records_pushed",
        table: tableName,
        count: dirtyRecords.length,
        timestamp: now(),
      });

      await this.updateSyncStatus(tableName, {
        last_synced_at: now(),
        is_syncing: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await this.updateSyncStatus(tableName, {
        is_syncing: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Pull remote changes
   */
  async pullChanges(): Promise<void> {
    for (const table of SYNCABLE_TABLES) {
      await this.pullTableChanges(table);
    }
  }

  /**
   * Pull changes for a specific table
   */
  async pullTableChanges(tableName: SyncableTable): Promise<void> {
    if (!this.supabase) return;

    const remoteTableName = this.getRemoteTableName(tableName);
    if (!remoteTableName) return;

    const status = await this.getSyncStatus(tableName);
    const lastSyncedAt = status?.last_synced_at || 0;
    const lastSyncedIso = new Date(lastSyncedAt).toISOString();

    try {
      const remoteRecords: any[] = [];

      if (remoteTableName === "users") {
        const [currentAuthUserId, currentLocalUserId] = await Promise.all([
          this.getCurrentAuthUserId(),
          this.getCurrentLocalUserId(),
        ]);

        if (!currentAuthUserId && !currentLocalUserId) {
          await this.updateSyncStatus(tableName, {
            last_synced_at: now(),
            error: null,
          });
          return;
        }

        let usersQuery = this.supabase
          .from("users")
          .select(
            "id, user_id, username, display_name, friend_code, display_name_updated_at, next_display_name_change_at, avatar_url, total_xp, current_streak, longest_streak, myths_busted, lessons_completed, created_at, updated_at, is_npc",
          )
          .gt("updated_at", lastSyncedIso);

        if (
          currentAuthUserId &&
          currentLocalUserId &&
          currentLocalUserId !== currentAuthUserId
        ) {
          usersQuery = usersQuery.or(
            `id.eq.${currentAuthUserId},user_id.eq.${currentLocalUserId}`,
          );
        } else if (currentAuthUserId) {
          usersQuery = usersQuery.eq("id", currentAuthUserId);
        } else if (currentLocalUserId) {
          usersQuery = usersQuery.eq("user_id", currentLocalUserId);
        }

        const { data, error } = await usersQuery;

        if (error) {
          throw error;
        }

        remoteRecords.push(
          ...(data || [])
            .filter((record) => !record.is_npc)
            .map((record) => this.fromRemoteRecord(tableName, record)),
        );
      }

      if (remoteRecords.length > 0) {
        await this.mergeRemoteRecords(tableName, remoteRecords);

        this.emit({
          type: "records_pulled",
          table: tableName,
          count: remoteRecords.length,
          timestamp: now(),
        });
      }

      await this.updateSyncStatus(tableName, {
        last_synced_at: now(),
        error: null,
      });
    } catch (error) {
      console.error(`Error pulling changes for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Merge remote records with local (handle conflicts)
   */
  async mergeRemoteRecords(
    tableName: SyncableTable,
    remoteRecords: any[],
  ): Promise<void> {
    for (const remote of remoteRecords) {
      const local = await this.db.getFirstAsync<any>(
        `SELECT * FROM ${tableName} WHERE id = ?`,
        [remote.id],
      );

      if (!local) {
        // New record from remote, insert it
        await this.insertRemoteRecord(tableName, remote);
      } else if (local.is_dirty) {
        // Conflict: both local and remote have changes
        await this.handleConflict(tableName, local, remote);
      } else {
        // No local changes, update with remote
        await this.updateFromRemote(tableName, remote);
      }
    }
  }

  private getRemoteTableName(tableName: SyncableTable): "users" | null {
    if (tableName === "user_profiles") {
      return "users";
    }

    return null;
  }

  private isTableSyncSupported(tableName: SyncableTable): boolean {
    return this.getRemoteTableName(tableName) !== null;
  }

  private toRemoteRecord(
    tableName: SyncableTable,
    record: any,
    context?: {
      currentAuthUserId: string | null;
      currentLocalUserId: string | null;
    },
  ): Record<string, any> {
    if (tableName === "user_profiles") {
      const payload: Record<string, any> = {
        user_id: record.id,
        username: record.username,
        display_name: record.display_name || record.username,
        friend_code: record.friend_code || null,
        display_name_updated_at: record.display_name_updated_at
          ? new Date(record.display_name_updated_at).toISOString()
          : null,
        next_display_name_change_at: record.next_display_name_change_at
          ? new Date(record.next_display_name_change_at).toISOString()
          : null,
        avatar_url: record.avatar_url,
        total_xp: record.total_xp,
        current_streak: record.current_streak,
        longest_streak: record.longest_streak,
        myths_busted: record.myths_busted,
        lessons_completed: record.lessons_completed,
        updated_at: new Date(record.updated_at || now()).toISOString(),
      };

      // Bind only the active local profile to the current auth user.
      if (
        context?.currentAuthUserId &&
        context.currentLocalUserId &&
        record.id === context.currentLocalUserId
      ) {
        payload.id = context.currentAuthUserId;
      }

      return payload;
    }

    return record;
  }

  private async getCurrentAuthUserId(): Promise<string | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      return session?.user?.id ?? null;
    } catch (error) {
      console.warn(
        "[Sync] Unable to read auth user id for sync mapping:",
        error,
      );
      return null;
    }
  }

  private async getCurrentLocalUserId(): Promise<string | null> {
    try {
      const legacy = await this.db.getFirstAsync<{ user_id: string | null }>(
        `SELECT user_id
         FROM user_profile
         WHERE user_id IS NOT NULL
         ORDER BY updated_at DESC
         LIMIT 1`,
      );

      if (legacy?.user_id) {
        return legacy.user_id;
      }
    } catch {
      // Ignore legacy table lookup failures and fallback to local-first table.
    }

    try {
      const localFirst = await this.db.getFirstAsync<{ id: string | null }>(
        `SELECT id
         FROM user_profiles
         WHERE deleted_at IS NULL
           AND id NOT LIKE 'npc_user_%'
         ORDER BY updated_at DESC
         LIMIT 1`,
      );

      return localFirst?.id || null;
    } catch (error) {
      console.warn("[Sync] Unable to resolve current local user id:", error);
      return null;
    }
  }

  private fromRemoteRecord(
    tableName: SyncableTable,
    record: any,
  ): Record<string, any> {
    if (tableName === "user_profiles") {
      const totalXP = Number(record.total_xp || 0);
      const displayName = record.display_name || record.username || "Scientist";
      const fallbackFriendCode =
        typeof record.username === "string" &&
        /^[A-Z0-9]{6}$/.test(record.username)
          ? record.username
          : null;

      return {
        id: record.user_id || record.id,
        username: record.username || "scientist",
        display_name: displayName,
        friend_code: record.friend_code || fallbackFriendCode,
        display_name_updated_at: record.display_name_updated_at
          ? this.toTimestamp(record.display_name_updated_at)
          : null,
        next_display_name_change_at: record.next_display_name_change_at
          ? this.toTimestamp(record.next_display_name_change_at)
          : 0,
        email: null,
        avatar_url: record.avatar_url || null,
        bio: null,
        total_xp: totalXP,
        current_streak: Number(record.current_streak || 0),
        longest_streak: Number(record.longest_streak || 0),
        myths_busted: Number(record.myths_busted || 0),
        lessons_completed: Number(record.lessons_completed || 0),
        level: Math.floor(totalXP / 100) + 1,
        is_premium: 0,
        notification_preferences: null,
        created_at: this.toTimestamp(record.created_at),
        updated_at: this.toTimestamp(record.updated_at),
        synced_at: now(),
        is_dirty: 0,
        deleted_at: null,
        version: 1,
      };
    }

    return record;
  }

  private toTimestamp(value: unknown): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return now();
  }

  /**
   * Insert a record from remote
   */
  private async insertRemoteRecord(
    tableName: SyncableTable,
    record: any,
  ): Promise<void> {
    const columns = Object.keys(record);
    const placeholders = columns.map(() => "?").join(", ");
    const values = Object.values(record);

    await this.db.runAsync(
      `INSERT OR REPLACE INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`,
      values,
    );
  }

  /**
   * Update local record with remote data
   */
  private async updateFromRemote(
    tableName: SyncableTable,
    record: any,
  ): Promise<void> {
    const columns = Object.keys(record).filter((k) => k !== "id");
    const setClause = columns.map((col) => `${col} = ?`).join(", ");
    const values = [...columns.map((col) => record[col]), record.id];

    await this.db.runAsync(
      `UPDATE ${tableName} SET ${setClause}, is_dirty = 0, synced_at = ? WHERE id = ?`,
      [...values.slice(0, -1), now(), record.id],
    );
  }

  /**
   * Handle sync conflict
   * Default strategy: Last-write-wins based on updated_at
   */
  private async handleConflict(
    tableName: SyncableTable,
    local: any,
    remote: any,
  ): Promise<void> {
    this.emit({
      type: "conflict_detected",
      table: tableName,
      timestamp: now(),
    });

    // Last-write-wins strategy
    if (remote.updated_at > local.updated_at) {
      // Remote is newer, overwrite local
      await this.updateFromRemote(tableName, remote);
    } else {
      // Local is newer, keep local (will be pushed on next sync)
      console.log(`[Sync] Keeping local version for ${tableName}:${local.id}`);
    }
  }

  /**
   * Force sync now
   */
  async syncNow(): Promise<void> {
    if (this.isSyncing) {
      console.log("[Sync] Sync already in progress");
      return;
    }
    await this.syncAll();
  }

  /**
   * Get overall sync status
   */
  async getOverallStatus(): Promise<{
    lastSyncedAt: number | null;
    pendingChanges: number;
    isSyncing: boolean;
    tables: SyncStatus[];
  }> {
    const tables = await this.db.getAllAsync<SyncStatus>(
      "SELECT * FROM sync_status",
    );

    let dirtyCount = 0;
    for (const table of SYNCABLE_TABLES) {
      if (!this.isTableSyncSupported(table)) {
        continue;
      }

      const count = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${table} WHERE is_dirty = 1`,
      );
      dirtyCount += count?.count || 0;
    }

    const lastSyncedAt = tables.reduce(
      (max, t) => {
        if (!t.last_synced_at) return max;
        return t.last_synced_at > (max || 0) ? t.last_synced_at : max;
      },
      null as number | null,
    );

    return {
      lastSyncedAt,
      // Pending count should only include records that can actually be pushed.
      pendingChanges: dirtyCount,
      isSyncing: this.isSyncing,
      tables,
    };
  }

  /**
   * Clear all sync data (for logout/reset)
   */
  async clearSyncData(): Promise<void> {
    await this.db.runAsync("DELETE FROM sync_queue");
    await this.db.runAsync(
      "UPDATE sync_status SET last_synced_at = NULL, last_sync_version = 0, error = NULL",
    );
  }
}

// Export a factory function
export const createSyncManager = (
  db: SQLite.SQLiteDatabase,
  config?: Partial<SyncConfig>,
): SyncManager => {
  return new SyncManager(db, config);
};
