# Local-First Database

A comprehensive local-first database solution for AtomIQ that provides offline functionality with all data stored on-device in SQLite.

## Features

- **Offline-First**: All data is stored locally in SQLite, allowing full functionality without internet
- **UUID Primary Keys**: Global uniqueness for every record
- **Soft Deletes**: Records are never permanently deleted
- **Version Control**: Optimistic locking for safe updates
- **React Hooks**: Easy-to-use React context and hooks for data access

## Architecture

```
services/local-first/
├── index.ts                 # Main exports
├── types.ts                 # TypeScript interfaces
├── schema.ts                # SQLite schema definitions
├── utils.ts                 # Helper functions
├── base-repository.ts       # Generic CRUD operations
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

## Future Improvements

- [ ] Optimistic UI updates
- [ ] Background data maintenance with expo-background-fetch
- [ ] Encryption for sensitive data
