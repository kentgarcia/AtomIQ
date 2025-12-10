/**
 * Supabase Schema Migrations for AtomIQ
 * 
 * This file documents the SQL to create the necessary tables for:
 * - User profiles
 * - Friend relationships and requests
 * - Leaderboard data
 * - Community feed comments
 * 
 * Copy and paste these into your Supabase SQL editor to set up the schema.
 */

-- ============================================
-- User Profiles Table
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  user_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  myths_busted INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read all profiles
CREATE POLICY "Users can view all profiles"
  ON users FOR SELECT
  USING (true);

-- RLS Policy: Public leaderboard reads (anon)
CREATE POLICY "Leaderboard public select"
  ON users FOR SELECT
  TO anon
  USING (true);

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policy: Service role can insert
CREATE POLICY "Service role can insert profiles"
  ON users FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Friends Table
-- ============================================
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  username TEXT,
  avatar_url TEXT,
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS on friends
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own friends
CREATE POLICY "Users can view their own friends"
  ON friends FOR SELECT
  USING (user_id = (SELECT user_id FROM users WHERE id = auth.uid() LIMIT 1));

-- RLS Policy: Users can insert friends
CREATE POLICY "Users can create friend relationships"
  ON friends FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Users can delete their own friends
CREATE POLICY "Users can remove friends"
  ON friends FOR DELETE
  USING (user_id = (SELECT user_id FROM users WHERE id = auth.uid() LIMIT 1));

-- ============================================
-- Friend Requests Table
-- ============================================
CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  from_username TEXT NOT NULL,
  from_avatar_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

-- Enable RLS on friend_requests
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view requests sent to them
CREATE POLICY "Users can view received requests"
  ON friend_requests FOR SELECT
  USING (to_user_id = (SELECT user_id FROM users WHERE id = auth.uid() LIMIT 1));

-- RLS Policy: Users can create requests
CREATE POLICY "Users can create friend requests"
  ON friend_requests FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Users can update requests sent to them
CREATE POLICY "Users can respond to requests"
  ON friend_requests FOR UPDATE
  USING (to_user_id = (SELECT user_id FROM users WHERE id = auth.uid() LIMIT 1));

-- ============================================
-- Leaderboard Table (for caching/ranking)
-- ============================================
CREATE TABLE leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  rank INTEGER,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Enable RLS on leaderboard
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view leaderboard
CREATE POLICY "Leaderboard is public"
  ON leaderboard FOR SELECT
  USING (true);

-- ============================================
-- Community Feed Comments Table
-- ============================================
CREATE TABLE feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Enable RLS on feed_comments
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view comments
CREATE POLICY "Comments are public"
  ON feed_comments FOR SELECT
  USING (true);

-- RLS Policy: Users can insert their own comments
CREATE POLICY "Users can add comments"
  ON feed_comments FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON feed_comments FOR UPDATE
  USING (user_id = (SELECT user_id FROM users WHERE id = auth.uid() LIMIT 1));

-- RLS Policy: Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON feed_comments FOR DELETE
  USING (user_id = (SELECT user_id FROM users WHERE id = auth.uid() LIMIT 1));

-- ============================================
-- User Stats Table (for detailed stats syncing)
-- ============================================
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  total_xp INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  myths_busted INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Enable RLS on user_stats
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view all stats (public leaderboard)
CREATE POLICY "Stats are viewable"
  ON user_stats FOR SELECT
  USING (true);

-- RLS Policy: Users can update their own stats
CREATE POLICY "Users can update their own stats"
  ON user_stats FOR UPDATE
  USING (user_id = (SELECT user_id FROM users WHERE id = auth.uid() LIMIT 1));

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_friends_user_id ON friends(user_id);
CREATE INDEX idx_friends_friend_id ON friends(friend_id);
CREATE INDEX idx_friend_requests_to_user ON friend_requests(to_user_id);
CREATE INDEX idx_friend_requests_from_user ON friend_requests(from_user_id);
CREATE INDEX idx_feed_comments_user_id ON feed_comments(user_id);
CREATE INDEX idx_feed_comments_created_at ON feed_comments(created_at DESC);
CREATE INDEX idx_leaderboard_total_xp ON leaderboard(total_xp DESC);
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);
