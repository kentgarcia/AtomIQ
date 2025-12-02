/**
 * Local-First Database Utilities
 * 
 * Helper functions for database operations, UUID generation, and data handling.
 */

/**
 * Generate a UUID v4 for use as primary keys.
 * This ensures global uniqueness for sync with remote database.
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Get current timestamp in milliseconds (Unix epoch)
 */
export const now = (): number => Date.now();

/**
 * Convert a JavaScript Date to Unix timestamp in milliseconds
 */
export const dateToTimestamp = (date: Date): number => date.getTime();

/**
 * Convert Unix timestamp in milliseconds to JavaScript Date
 */
export const timestampToDate = (timestamp: number): Date => new Date(timestamp);

/**
 * Format timestamp for display
 */
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export const getRelativeTime = (timestamp: number): string => {
  const seconds = Math.floor((now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  
  return timestampToDate(timestamp).toLocaleDateString();
};

/**
 * Safely parse JSON, returning null on error
 */
export const safeJsonParse = <T>(json: string | null | undefined): T | null => {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
};

/**
 * Safely stringify JSON
 */
export const safeJsonStringify = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

/**
 * Convert SQLite boolean (0/1) to JavaScript boolean
 */
export const sqliteBoolToJs = (value: number | null): boolean => {
  return value === 1;
};

/**
 * Convert JavaScript boolean to SQLite boolean (0/1)
 */
export const jsBoolToSqlite = (value: boolean): number => {
  return value ? 1 : 0;
};

/**
 * Build WHERE clause for non-deleted records
 */
export const notDeleted = (): string => 'deleted_at IS NULL';

/**
 * Build WHERE clause for dirty records (need sync)
 */
export const isDirty = (): string => 'is_dirty = 1';

/**
 * Create sync metadata for new records
 */
export const createSyncMetadata = (id?: string) => ({
  id: id || generateUUID(),
  created_at: now(),
  updated_at: now(),
  synced_at: null,
  is_dirty: true,
  deleted_at: null,
  version: 1,
});

/**
 * Mark record as dirty (needs sync)
 */
export const markDirty = () => ({
  updated_at: now(),
  is_dirty: true,
});

/**
 * Mark record as synced
 */
export const markSynced = () => ({
  synced_at: now(),
  is_dirty: false,
});

/**
 * Soft delete a record
 */
export const softDelete = () => ({
  deleted_at: now(),
  is_dirty: true,
});

/**
 * Build SQL placeholders for array (?, ?, ?)
 */
export const buildPlaceholders = (count: number): string => {
  return Array(count).fill('?').join(', ');
};

/**
 * Build SQL SET clause from object
 */
export const buildSetClause = (data: Record<string, any>): { sql: string; values: any[] } => {
  const keys = Object.keys(data);
  const sql = keys.map(key => `${key} = ?`).join(', ');
  const values = keys.map(key => data[key]);
  return { sql, values };
};

/**
 * Deep clone an object (for immutable operations)
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Batch array into chunks for batch operations
 */
export const batchArray = <T>(array: T[], batchSize: number): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
};

/**
 * Retry function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Debounce function for sync operations
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
};

/**
 * Create a unique constraint key for deduplication
 */
export const createUniqueKey = (...parts: (string | number)[]): string => {
  return parts.join(':');
};

/**
 * Normalize search query for consistent matching
 */
export const normalizeSearchQuery = (query: string): string => {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
};

/**
 * Extract hashtags from content
 */
export const extractHashtags = (content: string): string[] => {
  const regex = /#(\w+)/g;
  const matches = content.match(regex);
  return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
};

/**
 * Extract mentions from content (@username)
 */
export const extractMentions = (content: string): string[] => {
  const regex = /@(\w+)/g;
  const matches = content.match(regex);
  return matches ? matches.map(mention => mention.slice(1).toLowerCase()) : [];
};
