# Local-First Database Implementation Summary

## Overview

A comprehensive local-first database system for AtomIQ that stores all data locally in SQLite and is designed to seamlessly sync with Supabase when connected.

## Architecture

```
services/local-first/
├── index.ts                 # Main exports
├── types.ts                 # TypeScript interfaces for all entities
├── schema.ts                # SQLite schema with sync metadata
├── utils.ts                 # Helper functions (UUID, timestamps, etc.)
├── base-repository.ts       # Generic CRUD operations
├── sync-manager.ts          # Supabase sync orchestration
├── hooks.tsx                # React context and hooks
├── README.md                # Detailed documentation
└── repositories/
    ├── index.ts
    ├── profile-repository.ts      # User profiles
    ├── friendship-repository.ts   # Friends, requests, blocking
    ├── post-repository.ts         # Community posts
    ├── comment-repository.ts      # Threaded comments
    ├── like-repository.ts         # Likes for posts/comments
    ├── bookmark-repository.ts     # Bookmarks with collections
    ├── notification-repository.ts # User notifications
    └── activity-repository.ts     # Activity feed/logging
```

## Data Models

### User Profile
- Username, display name, email, avatar, bio
- XP, streaks, level, lessons completed, myths busted
- Premium status and notification preferences

### Social Features
- **Friendships**: Send/accept/decline requests, block users, mutual friends
- **Posts**: Text, image, poll, achievement, milestone, question types
- **Comments**: Threaded replies with depth tracking
- **Likes**: For both posts and comments
- **Bookmarks**: Organize with collections

### Engagement
- **Notifications**: Friend requests, likes, comments, achievements, reminders
- **Activities**: Lesson completed, quiz, myths busted, level up, streak milestones

## Key Features

### 1. Offline-First
- All data stored in SQLite locally
- Full functionality without internet connection
- Instant UI updates

### 2. Sync-Ready Design
- **UUID Primary Keys**: Global uniqueness for sync
- **Sync Metadata**: `synced_at`, `is_dirty`, `deleted_at`, `version`
- **Soft Deletes**: Records marked deleted, never removed
- **Version Control**: Optimistic locking for conflicts

### 3. Conflict Resolution
- Last-write-wins strategy based on `updated_at`
- Version numbers prevent stale data overwrites
- Sync queue for offline changes

## Usage

### Setup Provider

```tsx
import { LocalFirstProvider } from '@/services/local-first';

<LocalFirstProvider>
  <App />
</LocalFirstProvider>
```

### Use Hooks

```tsx
import { useProfile, usePosts, useFriends } from '@/services/local-first';

function MyComponent() {
  const { profile, updateProfile, addXP } = useProfile();
  const { posts, createPost, loadMore } = usePosts();
  const { friends, sendRequest, acceptRequest } = useFriends(userId);
}
```

### Available Hooks

| Hook | Purpose |
|------|---------|
| `useLocalFirst()` | Access all repositories and sync status |
| `useProfile()` | User profile CRUD operations |
| `useFriends(userId)` | Friend management |
| `usePosts(options)` | Community posts with pagination |
| `useComments(postId)` | Post comments |
| `useNotifications(userId)` | Notifications with unread count |
| `useBookmarks(userId)` | Bookmark management |
| `useActivity(userId)` | Activity feed |
| `useLike(userId, type, id)` | Like/unlike functionality |

## Supabase Integration

### Enable Sync

```typescript
const { syncManager } = useLocalFirst();

// When Supabase is configured:
syncManager.setEnabled(true);
syncManager.startAutoSync();
```

### Sync Events

```typescript
syncManager.addListener((event) => {
  switch (event.type) {
    case 'sync_started':
    case 'sync_completed':
    case 'sync_failed':
    case 'conflict_detected':
    case 'records_pushed':
    case 'records_pulled':
      // Handle event
  }
});
```

### Manual Sync

```typescript
const { syncNow, isSyncing, pendingChanges } = useLocalFirst();

<Button onPress={syncNow} disabled={isSyncing}>
  Sync ({pendingChanges} pending)
</Button>
```

## Database Schema Highlights

### Sync Metadata (All Tables)
```sql
id TEXT PRIMARY KEY,           -- UUID for global uniqueness
created_at INTEGER NOT NULL,   -- Unix timestamp
updated_at INTEGER NOT NULL,   -- Unix timestamp
synced_at INTEGER,             -- Last sync time (null = never synced)
is_dirty INTEGER DEFAULT 1,    -- Needs sync flag
deleted_at INTEGER,            -- Soft delete timestamp
version INTEGER DEFAULT 1      -- Optimistic locking
```

### Automatic Triggers
- Auto-update `updated_at` on changes
- Auto-increment `likes_count` and `comments_count`
- Mark records as dirty on local changes

## Repository Methods

### Common Operations (All Repositories)
- `findById(id)` - Get by ID
- `findAll(options)` - Get all with pagination
- `create(data)` - Create new record
- `update(id, data)` - Update existing
- `delete(id)` - Soft delete
- `getDirtyRecords()` - Get unsynced records
- `markAsSynced(ids)` - Mark as synced

### Profile Repository
- `getCurrentProfile()` - Get local user
- `addXP(userId, amount)` - Add XP and recalculate level
- `updateStreak(userId, isConsecutive)` - Update streak
- `getLeaderboard(limit)` - Top users by XP
- `getUserRank(userId)` - User's leaderboard rank

### Friendship Repository
- `sendFriendRequest(from, to)` - Send request
- `acceptFriendRequest(userId, friendId)` - Accept
- `removeFriend(userId, friendId)` - Unfriend
- `blockUser(userId, blockedId)` - Block user
- `getMutualFriends(userId, otherId)` - Mutual friends
- `getFriendSuggestions(userId)` - Friends of friends

### Post Repository
- `createPost(data)` - Create with auto hashtag extraction
- `getFeedPosts(options)` - Feed with filters
- `getTrendingPosts(hours, limit)` - Trending by engagement
- `getPostsByTag(tag)` - Filter by hashtag
- `togglePin(postId)` - Pin/unpin post

### Comment Repository
- `createComment(data)` - Create with depth calculation
- `getTopLevelComments(postId)` - Root comments
- `getReplies(commentId)` - Direct replies
- `getThreadReplies(commentId)` - All nested replies

## File Changes

### New Files Created
- `services/local-first/types.ts`
- `services/local-first/schema.ts`
- `services/local-first/utils.ts`
- `services/local-first/base-repository.ts`
- `services/local-first/sync-manager.ts`
- `services/local-first/hooks.tsx`
- `services/local-first/index.ts`
- `services/local-first/README.md`
- `services/local-first/repositories/*.ts` (8 files)

### Modified Files
- `services/database.ts` - Integrated local-first schema

## Next Steps

1. **Add LocalFirstProvider** to `_layout.tsx` when ready to use
2. **Create Supabase tables** matching the schema
3. **Configure Supabase client** and enable sync
4. **Migrate existing user data** from old tables
5. **Build community UI components** using the hooks

## Future Improvements

- [ ] Real-time sync with Supabase Realtime
- [ ] Background sync with expo-background-fetch
- [ ] Custom conflict resolution strategies
- [ ] Selective table sync
- [ ] Data encryption for sensitive fields
- [ ] Optimistic UI updates
