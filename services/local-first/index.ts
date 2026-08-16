/**
 * Local-First Database
 * 
 * A complete local-first database solution for AtomIQ.
 * 
 * Features:
 * - SQLite-based local storage
 * - Offline-first architecture
 * - Soft deletes and version control
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
 */

// Types
export * from './types';

// Schema
export { LOCAL_FIRST_SCHEMA } from './schema';

// Utilities
export * from './utils';

// Base repository
export { BaseRepository } from './base-repository';
export type { QueryOptions, TransactionCallback } from './base-repository';

// Repositories
export * from './repositories';

// React context and hooks
export {
    LocalFirstProvider, useActivity, useBookmarks, useComments, useFriends, useLike, useLocalFirst, useNotifications, usePosts, useProfile
} from './hooks';

