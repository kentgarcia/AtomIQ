# 🚀 Supabase Offline-First Implementation Guide

## Status: Ready to Deploy ✅

Your complete offline-first sync infrastructure is set up. Here's what's live and what's next.

---

## 📦 What's Deployed

### 1. **Database Schema** ✅
- 6 tables with full RLS (Row-Level Security)
- Indexes for performance
- All migrations applied and live

### 2. **Sync Services** ✅

#### Profile Sync (`services/profile-sync.ts`)
```tsx
// Push local profile changes to Supabase
await syncProfileToSupabase(userProfile);

// Pull remote profile
const remoteProfile = await syncProfileFromSupabase(userId);

// Merge conflicts (server wins if newer)
const merged = mergeProfileChanges(local, remote);
```

#### Friends Management (`services/friends-sync.ts`)
```tsx
// Search users
const results = await searchUsers('username', currentUserId);

// Send friend request
await sendFriendRequest(fromId, toId, username, avatar);

// Accept request
await acceptFriendRequest(requestId, fromId, toId, ...);

// Get friends list
const friends = await getFriends(userId);
```

#### Hook Integration (`hooks/use-friends-sync.ts`)
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
} = useFriendsSync();
```

### 3. **UI Integration** ✅
- Profile tab with friend search modal
- Friends list display
- Search results with add button
- Loading states

### 4. **Environment Setup** ✅
- `.env.local` configured with live credentials
- TypeScript types generated (`supabase.types.ts`)

---

## 🔄 How Offline-First Works

### User Makes Update
```
User changes profile/adds friend
    ↓
[LOCAL] Update SQLite instantly
[UI] React state updates
[UX] User sees change immediately
    ↓
App checks: Are we online?
    ├─ YES → Sync to Supabase (background)
    └─ NO → Queue for later
```

### When User Goes Online
```
Connection restored
    ↓
Sync queued changes
    ↓
Merge conflicts (server time-based)
    ↓
Update UI with server state
```

---

## 📋 Next Features to Implement

### 1. **Leaderboard Sync** (Recommended Next)
**Files to create:**
- `services/leaderboard-sync.ts`
- `hooks/use-leaderboard.ts`

**Functions needed:**
```tsx
// Fetch and cache leaderboard
const leaderboard = await getLeaderboard(limit = 50);

// Refresh rankings
await syncLeaderboardToLocal();

// Get user rank
const rank = await getUserRank(userId);
```

**Where to use:**
- `app/(tabs)/leaderboard.tsx`

### 2. **Stats Sync** 
**Files to create:**
- `services/stats-sync.ts`

**Functions needed:**
```tsx
// Sync daily stats
await syncDailyStats(userId, stats);

// Get user stats
const stats = await getUserStats(userId);

// Update streak sync
await syncStreakToSupabase(userId, streak);
```

### 3. **Comments Sync**
**Files to create:**
- `services/comments-sync.ts`
- `hooks/use-comments-sync.ts`

**Functions needed:**
```tsx
// Post comment
await postComment(userId, username, content);

// Get feed comments
const comments = await getFeedComments(limit = 20);

// Delete comment
await deleteComment(commentId, userId);
```

**Where to use:**
- `app/(tabs)/community.tsx`

### 4. **Background Sync**
**Create:**
- `services/background-sync.ts`

**Purpose:**
- Auto-sync on app resume
- Periodic sync (every 5 mins if online)
- Queue failed syncs for retry

---

## 🧪 Testing the Setup

### 1. **Test Profile Sync**
```tsx
// In a test component
const { userProfile, syncProfileToSupabase } = useStorage();

const handleTestSync = async () => {
  // Update local profile
  await updateUserProfile({ total_xp: 500 });
  
  // Sync to Supabase
  const success = await syncProfileToSupabase();
  console.log('Synced:', success);
};
```

### 2. **Test Friends**
```tsx
// In profile screen
const { handleSearchUsers, handleSendFriendRequest } = useFriendsSync();

// Search for someone
await handleSearchUsers('scientist');

// Send request
await handleSendFriendRequest(resultUserId);
```

### 3. **Test Offline**
1. Turn off wifi/cellular
2. Make a change (e.g., update profile)
3. See it saves locally ✅
4. Turn connectivity back on
5. Check if it synced to Supabase ✅

---

## 🔐 Security Checklist

- ✅ All tables have RLS enabled
- ✅ Public keys only (prefixed `EXPO_PUBLIC_`)
- ✅ Policies restrict self-access to user data
- ✅ Public leaderboard/comments for visibility
- ✅ No credentials in code

---

## 📊 Database Stats

```
Table              | Rows | RLS | Indexes
-------------------------------------------
users              |  0   | ✅  | user_id
friends            |  0   | ✅  | user_id, friend_id
friend_requests    |  0   | ✅  | to/from_user_id
leaderboard        |  0   | ✅  | total_xp DESC
feed_comments      |  0   | ✅  | user_id, created_at
user_stats         |  0   | ✅  | user_id
```

---

## 🛠️ Development Tips

### Enable Verbose Logging
```tsx
// In supabase.ts
export const supabase = createClient<Database>(url, key, {
  debug: true, // Enable debug logs
  // ... other options
});
```

### Check RLS Policies
1. Go to Supabase Dashboard
2. Select your project
3. Navigate to **Authentication → Policies**
4. Verify all tables have policies

### Monitor Sync Status
```tsx
// Check isOnline status
const { isOnline } = useStorage();

useEffect(() => {
  if (isOnline) {
    console.log('Connected! Syncing now...');
    // Trigger sync
  }
}, [isOnline]);
```

---

## 📁 File Structure

```
services/
├── supabase.ts              ✅ Client setup
├── supabase.types.ts        ✅ Generated types
├── supabase-schema.sql      ✅ Schema reference
├── profile-sync.ts          ✅ Profile sync logic
├── friends-sync.ts          ✅ Friends sync logic
├── leaderboard-sync.ts      📋 TODO
├── stats-sync.ts            📋 TODO
├── comments-sync.ts         📋 TODO
├── background-sync.ts       📋 TODO
└── StorageContext.tsx       ✅ Local-first storage

hooks/
├── use-friends-sync.ts      ✅ Friends hook
├── use-leaderboard.ts       📋 TODO
└── use-comments-sync.ts     📋 TODO
```

---

## 🚨 Common Issues & Solutions

| Issue | Cause | Fix |
|-------|-------|-----|
| "Supabase not configured" | Missing `.env.local` | Check credentials in `.env.local` |
| Friends not searching | Not online | Connect to internet |
| Sync not happening | `isOnline` is false | Check connection or set to true for testing |
| RLS policy error | Policy doesn't exist | Run migrations again |
| Type errors | Types not generated | Run `mcp_supabase_generate_typescript_types` |

---

## ✅ Deployment Checklist

- [x] Supabase project created
- [x] Database schema deployed
- [x] RLS policies configured
- [x] TypeScript types generated
- [x] Environment variables set
- [x] Profile sync implemented
- [x] Friends sync implemented
- [x] UI integration done
- [ ] Leaderboard sync (next)
- [ ] Stats sync (next)
- [ ] Comments sync (next)
- [ ] Background sync (next)
- [ ] E2E testing
- [ ] Performance tuning

---

## 📞 Need Help?

- **Setup issues?** See `SUPABASE_SETUP.md`
- **Deployment status?** See `SUPABASE_DEPLOYED.md`
- **Code examples?** Check implemented services
- **Types reference?** See `supabase.types.ts`

---

**Last Updated**: Dec 10, 2025  
**Status**: Infrastructure Live → Ready for Feature Implementation
