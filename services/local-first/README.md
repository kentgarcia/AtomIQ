# Local-First Database

A comprehensive local-first database solution for AtomIQ that enables offline functionality and can sync with Supabase when connected.

## Features

- **Offline-First**: All data is stored locally in SQLite, allowing full functionality without internet
- **Sync-Ready**: Designed with Supabase sync in mind, with all the infrastructure in place
- **UUID Primary Keys**: Global uniqueness for seamless sync
- **Soft Deletes**: Records are never permanently deleted, allowing for proper sync
- **Version Control**: Optimistic locking for conflict resolution
- **Dirty Tracking**: Automatically tracks local changes that need to be synced

## Architecture

```
services/local-first/
├── index.ts                 # Main exports
├── types.ts                 # TypeScript interfaces
├── schema.ts                # SQLite schema definitions
├── utils.ts                 # Helper functions
├── base-repository.ts       # Generic CRUD operations
├── sync-manager.ts          # Sync orchestration
├── hooks.tsx                # React context and hooks
└── repositories/
    ├── index.ts
    ├── profile-repository.ts
    ├── friendship-repository.ts
    ├── post-repository.ts
    ├── comment-repository.ts
    ├── like-repository.ts
    ├── bookmark-repository.ts
    ├── notification-repository.ts
    └── activity-repository.ts
```

## Quick Start

### 1. Setup Provider

The `LocalFirstProvider` is already integrated into the app. If you need to add it manually:

```tsx
import { LocalFirstProvider } from '@/services/local-first';

export default function App() {
  return (
    <LocalFirstProvider>
      <YourApp />
    </LocalFirstProvider>
  );
}
```

### 2. Use Hooks

```tsx
import { 
  useProfile, 
  usePosts, 
  useFriends, 
  useComments,
  useNotifications,
  useBookmarks,
  useLike,
} from '@/services/local-first';

function MyComponent() {
  // User Profile
  const { profile, updateProfile, addXP } = useProfile();
  
  // Community Posts
  const { posts, createPost, deletePost, loadMore } = usePosts();
  
  // Friends
  const { friends, sendRequest, acceptRequest } = useFriends(userId);
  
  // Comments
  const { comments, addComment, getReplies } = useComments(postId);
  
  // Notifications
  const { notifications, unreadCount, markAsRead } = useNotifications(userId);
  
  // Bookmarks
  const { bookmarks, toggleBookmark, isBookmarked } = useBookmarks(userId);
  
  // Likes
  const { isLiked, likeCount, toggle } = useLike(userId, 'post', postId);
}
```

### 3. Direct Repository Access

For advanced use cases, access repositories directly:

```tsx
import { useLocalFirst } from '@/services/local-first';

function AdvancedComponent() {
  const { posts, comments, likes, isReady } = useLocalFirst();
  
  const handleComplexOperation = async () => {
    if (!isReady) return;
    
    // Create a post
    const post = await posts.createPost({
      author_id: userId,
      type: 'text',
      content: 'Hello World!',
      visibility: 'public',
    });
    
    // Search posts
    const results = await posts.searchPosts('nuclear', { limit: 10 });
    
    // Get trending posts
    const trending = await posts.getTrendingPosts(24, 20);
  };
}
```

## Data Models

### User Profile

```typescript
interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  myths_busted: number;
  lessons_completed: number;
  level: number;
  is_premium: boolean;
}
```

### Community Post

```typescript
interface CommunityPost {
  id: string;
  author_id: string;
  type: 'text' | 'image' | 'poll' | 'achievement' | 'milestone' | 'question';
  title: string | null;
  content: string;
  media_urls: string[] | null;
  poll_options: PollOption[] | null;
  visibility: 'public' | 'friends' | 'private';
  tags: string[] | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_pinned: boolean;
  is_featured: boolean;
}
```

### Friendship

```typescript
interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked' | 'declined';
  initiated_by: string;
  accepted_at: number | null;
}
```

## Sync with Supabase

The database is designed to sync seamlessly with Supabase. Here's how to enable sync:

### 1. Create Supabase Tables

Use the same schema defined in `schema.ts`. Here's an example for the `community_posts` table:

```sql
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES user_profiles(id),
  type TEXT NOT NULL CHECK(type IN ('text', 'image', 'poll', 'achievement', 'milestone', 'question')),
  title TEXT,
  content TEXT NOT NULL,
  media_urls JSONB,
  poll_options JSONB,
  visibility TEXT NOT NULL DEFAULT 'public',
  tags JSONB,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  achievement_id UUID,
  lesson_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1
);

-- Enable RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view public posts"
  ON community_posts FOR SELECT
  USING (visibility = 'public' AND deleted_at IS NULL);

CREATE POLICY "Users can view their own posts"
  ON community_posts FOR SELECT
  USING (author_id = auth.uid());

CREATE POLICY "Users can create posts"
  ON community_posts FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update their own posts"
  ON community_posts FOR UPDATE
  USING (author_id = auth.uid());
```

### 2. Initialize Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
```

### 3. Enable Sync

```typescript
import { useLocalFirst } from '@/services/local-first';

function SyncSetup() {
  const { syncManager } = useLocalFirst();
  
  useEffect(() => {
    if (syncManager) {
      // When Supabase client is ready:
      // syncManager.setSupabaseClient(supabase);
      syncManager.setEnabled(true);
      syncManager.startAutoSync();
    }
    
    return () => {
      syncManager?.stopAutoSync();
    };
  }, [syncManager]);
}
```

### 4. Conflict Resolution

The sync manager uses a **last-write-wins** strategy by default:

1. If the remote record is newer (higher `updated_at`), the local record is overwritten
2. If the local record is newer, it will be pushed on the next sync

You can customize this by modifying the `handleConflict` method in `sync-manager.ts`.

## Best Practices

### 1. Always Check Readiness

```typescript
const { isReady, posts } = useLocalFirst();

if (!isReady) {
  return <LoadingSpinner />;
}
```

### 2. Use Pagination

```typescript
const { posts, loadMore, hasMore } = usePosts({ limit: 20 });

// Load more when reaching the end of the list
<FlatList
  data={posts}
  onEndReached={() => hasMore && loadMore()}
  onEndReachedThreshold={0.5}
/>
```

### 3. Refresh After Mutations

```typescript
const { refresh, createPost } = usePosts();

const handleSubmit = async () => {
  await createPost(data);
  // The hook automatically updates, but you can force refresh if needed
  await refresh();
};
```

### 4. Handle Sync Status

```typescript
const { isSyncing, pendingChanges, syncNow } = useLocalFirst();

// Show sync indicator
{isSyncing && <Text>Syncing...</Text>}
{pendingChanges > 0 && <Text>{pendingChanges} pending changes</Text>}

// Manual sync button
<Button onPress={syncNow} disabled={isSyncing}>
  Sync Now
</Button>
```

## Migration Guide

When migrating from the old database structure:

1. The old `user_profile` table is still used for backward compatibility
2. New social features use the `user_profiles` table (note the 's')
3. Run a one-time migration to copy data from old to new tables:

```typescript
const migrateUserProfile = async () => {
  const oldProfile = await getUserProfile(); // From old database.ts
  if (oldProfile) {
    await profiles.upsertCurrentProfile({
      username: oldProfile.username,
      display_name: oldProfile.username,
      total_xp: oldProfile.total_xp,
      current_streak: oldProfile.current_streak,
      longest_streak: oldProfile.longest_streak,
      myths_busted: oldProfile.myths_busted,
      lessons_completed: oldProfile.lessons_completed,
      level: Math.floor(oldProfile.total_xp / 100) + 1,
      email: null,
      avatar_url: oldProfile.avatar_url,
      bio: null,
      is_premium: false,
      notification_preferences: null,
    });
  }
};
```

## Troubleshooting

### Database Not Ready

If hooks return null data, ensure the provider is properly wrapped:

```tsx
// ❌ Wrong
<LocalFirstProvider>
  <Component />
</LocalFirstProvider>

// ✅ Correct - Provider should be at the root
<StorageProvider>
  <LocalFirstProvider>
    <App />
  </LocalFirstProvider>
</StorageProvider>
```

### Sync Not Working

1. Check if sync is enabled: `syncManager.setEnabled(true)`
2. Verify network connectivity
3. Check Supabase credentials
4. Review sync queue for errors:

```typescript
const items = await syncManager.getPendingItems();
console.log('Pending sync items:', items);
```

### Conflicts

Enable conflict detection listener:

```typescript
syncManager.addListener((event) => {
  if (event.type === 'conflict_detected') {
    console.log(`Conflict in ${event.table}`);
  }
});
```

## Future Improvements

- [ ] Real-time sync with Supabase Realtime
- [ ] Optimistic UI updates
- [ ] Background sync with expo-background-fetch
- [ ] Sync queue persistence across app restarts
- [ ] Custom conflict resolution strategies
- [ ] Selective sync (e.g., only sync specific tables)
- [ ] Encryption for sensitive data
