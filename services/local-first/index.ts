/**
 * Local-First Database
 * 
 * A complete local-first database solution for AtomIQ that can sync with Supabase.
 * 
 * Features:
 * - SQLite-based local storage
 * - Offline-first architecture
 * - Sync-ready with Supabase
 * - Soft deletes and version control
 * - Conflict resolution
 * - React hooks for easy data access
 * 
 * Usage:
 * 
 * 1. Wrap your app with LocalFirstProvider:
 * 
 * ```tsx
 * import { LocalFirstProvider } from '@/services/local-first';
 * 
 * export default function App() {
 *   return (
 *     <LocalFirstProvider>
 *       <YourApp />
 *     </LocalFirstProvider>
 *   );
 * }
 * ```
 * 
 * 2. Use hooks in your components:
 * 
 * ```tsx
 * import { useProfile, usePosts, useFriends } from '@/services/local-first';
 * 
 * function MyComponent() {
 *   const { profile, updateProfile } = useProfile();
 *   const { posts, createPost } = usePosts();
 *   const { friends, sendRequest } = useFriends(userId);
 *   
 *   // Use the data and functions
 * }
 * ```
 * 
 * 3. To enable Supabase sync later:
 * 
 * ```tsx
 * import { useLocalFirst } from '@/services/local-first';
 * 
 * function EnableSync() {
 *   const { syncManager } = useLocalFirst();
 *   
 *   useEffect(() => {
 *     if (syncManager) {
 *       // syncManager.setSupabaseClient(supabaseClient);
 *       syncManager.setEnabled(true);
 *       syncManager.startAutoSync();
 *     }
 *   }, [syncManager]);
 * }
 * ```
 */

// Types
export * from './types';

// Schema
export { LOCAL_FIRST_SCHEMA, SYNCABLE_TABLES } from './schema';
export type { SyncableTable } from './schema';

// Utilities
export * from './utils';

// Base repository
export { BaseRepository } from './base-repository';
export type { QueryOptions, TransactionCallback } from './base-repository';

// Repositories
export * from './repositories';

// Sync manager
export { SyncManager, createSyncManager } from './sync-manager';
export type { SyncConfig, SyncEvent, SyncEventType } from './sync-manager';

// React context and hooks
export {
    LocalFirstProvider, useActivity, useBookmarks, useComments, useFriends, useLike, useLocalFirst, useNotifications, usePosts, useProfile
} from './hooks';

