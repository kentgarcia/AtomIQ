# Supabase Sync Setup for AtomIQ

This guide walks through setting up Supabase for offline-first syncing in AtomIQ. The app stores data locally and syncs when online.

## 📋 Overview

- **Offline-First**: All data lives in local SQLite database
- **Online Sync**: When online, data syncs to Supabase
- **Current Features**: Profile sync, friend management, leaderboard, community comments

## 🚀 Setup Steps

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project
3. Save your credentials:
   - **Project URL** (looks like `https://xxx.supabase.co`)
   - **Anon Key** (public key, safe for client)

### 2. Set Environment Variables

Create a `.env.local` file in your project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> **Note**: These are public keys (prefixed with `EXPO_PUBLIC_`). They're safe to expose because RLS policies control access.

### 3. Create Database Schema

In your Supabase SQL Editor, run the SQL from `services/supabase-schema.sql`:

- Creates `users` table (profile data)
- Creates `friends` table (friend relationships)
- Creates `friend_requests` table (pending requests)
- Creates `leaderboard` table (for caching rankings)
- Creates `feed_comments` table (community comments)
- Creates `user_stats` table (detailed stats)
- Enables Row-Level Security (RLS) on all tables

### 4. Install Dependencies

If not already installed:

```bash
npm install @supabase/supabase-js
```

## 📱 Architecture

### Local-First Flow

```
User Action
    ↓
Update Local SQLite
    ↓
Update React State
    ↓
UI Updates Immediately
    ↓
Check if Online → Sync to Supabase
```

### Storage Hierarchy

1. **Local First**: SQLite + AsyncStorage
   - Instant responses
   - Works offline
   - Persistent across app closes

2. **Cloud**: Supabase
   - Shared leaderboards
   - Friend relationships
   - Community content
   - Syncs when available

## 🔄 Sync Features

### Profile Sync (`services/profile-sync.ts`)

- `syncProfileToSupabase()` - Push local profile to server
- `syncProfileFromSupabase()` - Pull remote profile
- `mergeProfileChanges()` - Conflict resolution (server wins if newer)
- `updateProfileField()` - Single field update

**Auto-triggered**:
- On profile update (if online)
- Periodically (can add interval if needed)

### Friends Sync (`services/friends-sync.ts`)

- `searchUsers()` - Search by username
- `sendFriendRequest()` - Send request
- `acceptFriendRequest()` - Accept & create relationship
- `getFriends()` - Load friends list
- `getFriendRequests()` - Load pending requests
- `removeFriend()` - Remove friend

**Usage Hook** (`hooks/use-friends-sync.ts`):
```tsx
const {
  friends,
  friendRequests,
  searchResults,
  isLoading,
  handleSearchUsers,
  handleSendFriendRequest,
  loadFriends,
  loadFriendRequests,
  handleAcceptFriendRequest,
  handleRemoveFriend,
} = useFriendsSync();
```

## 🛡️ Security (RLS Policies)

All tables have Row-Level Security enabled. Key policies:

- **Users**: Public read, self-update only
- **Friends**: Users see only their own friends
- **Friend Requests**: Users see only requests sent to them
- **Leaderboard**: Public read (for competitions)
- **Feed Comments**: Public read, self update/delete

## 💾 Data Sync Strategy

### Profile Stats

- Updated locally in SQLite immediately
- Synced to Supabase when online
- Server version wins on conflict (newer update_at timestamp)

### Friends

- Created locally as pending
- Synced to server immediately
- Accept/reject happens on server (source of truth)

### Leaderboard

- Local cache populated from server
- Refreshed when online
- Read-only for users (ranked by total_xp DESC)

### Community Comments

- Posted locally first
- Synced to server for visibility
- Can be edited/deleted by author

## 🔌 Online Status Detection

The `StorageContext` includes `isOnline` state:

```tsx
const { isOnline, syncProfileToSupabase } = useStorage();

// Check before offline-restricted features:
if (!isOnline) {
  Alert.alert('Offline', 'Feature requires internet');
  return;
}
```

## 📝 Next Steps

After setup, implement:

1. **Leaderboard Sync** - Fetch & cache rankings
2. **Stats Sync** - Sync detailed daily stats
3. **Comments Sync** - Sync community feed comments
4. **Background Sync** - Auto-sync on interval/app resume
5. **Conflict Resolution** - Handle complex merges

## 🐛 Troubleshooting

**"Supabase not configured"** - Check `.env.local` file and restart Expo

**RLS Policy Error** - Ensure policies exist in Supabase dashboard

**Friends Not Syncing** - Verify `friend_requests` table exists and indexes are created

**Profile Updates Lag** - Profile syncs on field update; can add debounce if needed

## 📚 Files Changed

- `services/supabase.ts` - Supabase client setup
- `services/profile-sync.ts` - Profile sync logic
- `services/friends-sync.ts` - Friends management sync
- `services/supabase-schema.sql` - Database schema (run in Supabase)
- `services/StorageContext.tsx` - Updated with sync methods
- `hooks/use-friends-sync.ts` - Friends hook for UI
- `app/(tabs)/profile.tsx` - Integrated friends search/list
- `content/quizzes/index.ts` - Updated quiz registry

---

**Status**: Profile & friends foundation is ready. Leaderboard and comments sync are next.
