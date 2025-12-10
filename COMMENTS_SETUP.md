# Community Comments - Supabase Integration

## Overview
Comments are now synced with Supabase, allowing users to see each other's comments across the community feed. Comments are loaded on-demand when opening the comment panel to minimize API requests.

## Features Implemented

### ✅ Online-Only Commenting
- Users must be online to post comments
- Check is performed before allowing comment submission
- Clear error message when offline

### ✅ Supabase Sync (Non-Realtime)
- Comments are stored in Supabase PostgreSQL database
- Comments loaded only when opening comment panel
- Efficient API usage - no real-time subscriptions
- Reloads after posting to show new comments and AI replies

### ✅ AI Moderation Integration
- Comments are moderated by Schrödai before posting
- Moderation results (approved/hidden/incorrect) stored in database
- AI correction replies are posted automatically
- All synced to Supabase for everyone to see

### ✅ User Attribution
- Comments include user ID, username, and avatar from user profile
- Schrödai mascot shown for AI moderator replies
- Profile data from existing user system

### ✅ 5-Minute Cooldown
- Prevents comment spam
- Cooldown timer persists across app restarts
- Live countdown display

## Database Schema

The `comments` table was created using Supabase MCP with this structure:

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,                -- ID of the post being commented on
  user_id TEXT NOT NULL,                -- User who posted the comment
  username TEXT NOT NULL,               -- Display name
  avatar_url TEXT,                      -- User avatar (nullable)
  text TEXT NOT NULL,                   -- Comment content
  moderation_status TEXT DEFAULT 'approved',  -- approved, hidden, incorrect
  moderation_reason TEXT,               -- Why hidden (if applicable)
  moderation_correction TEXT,           -- AI correction (if incorrect)
  is_ai_reply BOOLEAN DEFAULT FALSE,    -- True for Schrödai replies
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes
- `idx_comments_post_id` - Fast lookup by post
- `idx_comments_user_id` - Fast lookup by user
- `idx_comments_created_at` - Ordered by time

## RLS Policies

The table has proper Row Level Security:

1. **SELECT Policy**: "Anyone can view approved comments"
   - Shows comments with status 'approved' or 'incorrect'
   - Hidden comments are automatically filtered out
   - No authentication required (public access)

2. **INSERT Policy**: "Anyone can insert comments"
   - Allows posting without authentication
   - User validation handled on client side
   - Works with the anon key

## How It Works

### When Opening Comment Panel:
1. User taps comment icon on a post
2. App calls `fetchComments(postId)` 
3. Supabase returns all approved/incorrect comments for that post
4. Comments displayed in order (oldest first)

### When Posting a Comment:
1. Check if user is online (required)
2. Check cooldown timer (5 minutes between comments)
3. Moderate comment with Schrödai AI
4. Post comment to Supabase with moderation result
5. If incorrect, post AI correction reply
6. Reload all comments from Supabase
7. Display updated list including new comment and AI reply

### Moderation Flow:
- **Approved**: Comment displayed normally
- **Hidden**: Comment not shown (filtered by RLS policy)
- **Incorrect**: Comment shown with fact-check badge + AI correction reply below it

## Files Modified

1. **services/comments-sync.ts**
   - fetchComments() - Load comments for a post
   - postComment() - Submit new comment to Supabase
   - postAIReply() - Post AI correction to Supabase
   - isOnline() - Simple online check

2. **app/(tabs)/community.tsx**
   - Integrated Supabase sync
   - Added online check before posting
   - Load comments when opening panel
   - Reload after posting to show updates
   - Loading state with mascot animation

3. **Supabase Migration** (via MCP)
   - Created `comments` table
   - Added indexes for performance
   - Configured RLS policies
   - Auto-update timestamp trigger

## Testing

### To Verify Setup:
```sql
-- Check table exists
SELECT * FROM comments LIMIT 5;

-- Check RLS policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'comments';

-- Test insert (will work with anon key)
INSERT INTO comments (post_id, user_id, username, text)
VALUES ('test-post-1', 'test-user', 'Test User', 'Test comment');

-- Verify it appears
SELECT * FROM comments WHERE post_id = 'test-post-1';
```

### In the App:
1. Open any post in community feed
2. Tap comment icon
3. Write a comment
4. Submit and wait for AI moderation
5. Comment should appear with your username
6. If incorrect, Schrödai's reply appears below

### Multi-User Testing:
1. Post a comment from User A
2. Open same post on User B's device
3. Tap comment icon - should see User A's comment
4. User B posts a comment
5. User A can refresh by closing and reopening panel

## Performance Optimization

- **No Real-time**: Saves on Supabase real-time quota
- **Load on Demand**: Comments only fetched when panel opens
- **Efficient Queries**: Indexes on post_id for fast filtering
- **RLS Filtering**: Database filters hidden comments automatically

## Security

- RLS policies prevent viewing hidden comments
- Client-side validation for user profile
- Moderation happens before storing
- Supabase anon key is safe for public access

## Future Enhancements

Potential improvements:
- Pull-to-refresh to reload comments
- Optimistic UI updates
- Comment editing and deletion
- Pagination for posts with many comments
- User blocking
- Report functionality

