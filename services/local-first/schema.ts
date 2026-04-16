/**
 * Local-First Database Schema
 *
 * This file contains the SQL schema for the local-first database.
 * All tables include sync metadata for future Supabase synchronization.
 */

export const LOCAL_FIRST_SCHEMA = `
-- Enable Write-Ahead Logging for better performance
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ==================== CORE TABLES ====================

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  friend_code TEXT UNIQUE,
  display_name_updated_at INTEGER,
  next_display_name_change_at INTEGER,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  myths_busted INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  is_premium INTEGER DEFAULT 0,
  notification_preferences TEXT, -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  is_dirty INTEGER DEFAULT 1,
  deleted_at INTEGER,
  version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_friend_code ON user_profiles(friend_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_next_display_name_change ON user_profiles(next_display_name_change_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_synced ON user_profiles(synced_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_dirty ON user_profiles(is_dirty) WHERE is_dirty = 1;

-- ==================== SOCIAL TABLES ====================

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'blocked', 'declined')),
  initiated_by TEXT NOT NULL,
  accepted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  is_dirty INTEGER DEFAULT 1,
  deleted_at INTEGER,
  version INTEGER DEFAULT 1,
  UNIQUE(user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_dirty ON friendships(is_dirty) WHERE is_dirty = 1;

-- ==================== COMMUNITY TABLES ====================

-- Community Posts
CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('text', 'image', 'poll', 'achievement', 'milestone', 'question')),
  title TEXT,
  content TEXT NOT NULL,
  media_urls TEXT, -- JSON array
  poll_options TEXT, -- JSON array
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public', 'friends', 'private')),
  tags TEXT, -- JSON array
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  is_pinned INTEGER DEFAULT 0,
  is_featured INTEGER DEFAULT 0,
  achievement_id TEXT,
  lesson_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  is_dirty INTEGER DEFAULT 1,
  deleted_at INTEGER,
  version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_posts_author ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON community_posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON community_posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_created ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON community_posts(is_featured) WHERE is_featured = 1;
CREATE INDEX IF NOT EXISTS idx_posts_dirty ON community_posts(is_dirty) WHERE is_dirty = 1;

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  parent_comment_id TEXT,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  is_edited INTEGER DEFAULT 0,
  depth INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  is_dirty INTEGER DEFAULT 1,
  deleted_at INTEGER,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_dirty ON comments(is_dirty) WHERE is_dirty = 1;

-- Likes
CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  likeable_type TEXT NOT NULL CHECK(likeable_type IN ('post', 'comment')),
  likeable_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  is_dirty INTEGER DEFAULT 1,
  deleted_at INTEGER,
  version INTEGER DEFAULT 1,
  UNIQUE(user_id, likeable_type, likeable_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_likeable ON likes(likeable_type, likeable_id);
CREATE INDEX IF NOT EXISTS idx_likes_dirty ON likes(is_dirty) WHERE is_dirty = 1;

-- Poll Votes
CREATE TABLE IF NOT EXISTS poll_votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  is_dirty INTEGER DEFAULT 1,
  deleted_at INTEGER,
  version INTEGER DEFAULT 1,
  UNIQUE(poll_id, user_id),
  FOREIGN KEY (poll_id) REFERENCES community_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_dirty ON poll_votes(is_dirty) WHERE is_dirty = 1;

-- ==================== USER ENGAGEMENT TABLES ====================

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bookmarkable_type TEXT NOT NULL CHECK(bookmarkable_type IN ('post', 'article', 'lesson', 'myth')),
  bookmarkable_id TEXT NOT NULL,
  notes TEXT,
  collection_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  is_dirty INTEGER DEFAULT 1,
  deleted_at INTEGER,
  version INTEGER DEFAULT 1,
  UNIQUE(user_id, bookmarkable_type, bookmarkable_id),
  FOREIGN KEY (collection_id) REFERENCES bookmark_collections(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_type ON bookmarks(bookmarkable_type);
CREATE INDEX IF NOT EXISTS idx_bookmarks_collection ON bookmarks(collection_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_dirty ON bookmarks(is_dirty) WHERE is_dirty = 1;

-- Bookmark Collections
CREATE TABLE IF NOT EXISTS bookmark_collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  is_dirty INTEGER DEFAULT 1,
  deleted_at INTEGER,
  version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_bookmark_collections_user ON bookmark_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_collections_dirty ON bookmark_collections(is_dirty) WHERE is_dirty = 1;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('friend_request', 'friend_accepted', 'post_like', 'comment', 'comment_reply', 'mention', 'achievement', 'streak_reminder', 'new_content')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data TEXT, -- JSON
  is_read INTEGER DEFAULT 0,
  read_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  is_dirty INTEGER DEFAULT 1,
  deleted_at INTEGER,
  version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = 0;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_dirty ON notifications(is_dirty) WHERE is_dirty = 1;

-- User Activity
CREATE TABLE IF NOT EXISTS user_activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('lesson_completed', 'quiz_completed', 'myth_busted', 'achievement_unlocked', 'streak_milestone', 'level_up', 'friend_added')),
  title TEXT NOT NULL,
  description TEXT,
  xp_earned INTEGER DEFAULT 0,
  metadata TEXT, -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  is_dirty INTEGER DEFAULT 1,
  deleted_at INTEGER,
  version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_dirty ON user_activities(is_dirty) WHERE is_dirty = 1;

-- Blocked Users
CREATE TABLE IF NOT EXISTS blocked_users (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  blocked_user_id TEXT NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  is_dirty INTEGER DEFAULT 1,
  deleted_at INTEGER,
  version INTEGER DEFAULT 1,
  UNIQUE(user_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_user ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_dirty ON blocked_users(is_dirty) WHERE is_dirty = 1;

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  reportable_type TEXT NOT NULL CHECK(reportable_type IN ('post', 'comment', 'user')),
  reportable_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('spam', 'harassment', 'inappropriate', 'misinformation', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  is_dirty INTEGER DEFAULT 1,
  deleted_at INTEGER,
  version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_dirty ON reports(is_dirty) WHERE is_dirty = 1;

-- Followed Topics
CREATE TABLE IF NOT EXISTS followed_topics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  notification_enabled INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  is_dirty INTEGER DEFAULT 1,
  deleted_at INTEGER,
  version INTEGER DEFAULT 1,
  UNIQUE(user_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_followed_topics_user ON followed_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_followed_topics_topic ON followed_topics(topic);
CREATE INDEX IF NOT EXISTS idx_followed_topics_dirty ON followed_topics(is_dirty) WHERE is_dirty = 1;

-- ==================== SETTINGS TABLES ====================

-- User Settings (local-only by default)
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  theme TEXT NOT NULL DEFAULT 'system' CHECK(theme IN ('light', 'dark', 'system')),
  language TEXT NOT NULL DEFAULT 'en',
  sound_enabled INTEGER DEFAULT 1,
  haptics_enabled INTEGER DEFAULT 1,
  auto_play_videos INTEGER DEFAULT 1,
  data_saver_mode INTEGER DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

-- ==================== SYNC TABLES ====================

-- Sync Queue (tracks pending changes to sync to server)
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('insert', 'update', 'delete')),
  payload TEXT NOT NULL, -- JSON stringified data
  created_at INTEGER NOT NULL,
  attempts INTEGER DEFAULT 0,
  last_attempt_at INTEGER,
  error TEXT,
  UNIQUE(table_name, record_id, operation)
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON sync_queue(table_name);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at ASC);

-- Sync Status (tracks overall sync state per table)
CREATE TABLE IF NOT EXISTS sync_status (
  id TEXT PRIMARY KEY,
  table_name TEXT UNIQUE NOT NULL,
  last_synced_at INTEGER,
  last_sync_version INTEGER DEFAULT 0,
  is_syncing INTEGER DEFAULT 0,
  error TEXT
);

-- ==================== TRIGGERS ====================

-- Auto-update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS user_profiles_updated_at
AFTER UPDATE ON user_profiles
BEGIN
  UPDATE user_profiles SET updated_at = strftime('%s', 'now') * 1000, is_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS community_posts_updated_at
AFTER UPDATE ON community_posts
BEGIN
  UPDATE community_posts SET updated_at = strftime('%s', 'now') * 1000, is_dirty = 1 WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS comments_updated_at
AFTER UPDATE ON comments
BEGIN
  UPDATE comments SET updated_at = strftime('%s', 'now') * 1000, is_dirty = 1 WHERE id = NEW.id;
END;

-- Auto-increment comments_count on post when comment is added
CREATE TRIGGER IF NOT EXISTS increment_comments_count
AFTER INSERT ON comments
WHEN NEW.deleted_at IS NULL
BEGIN
  UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
END;

-- Auto-decrement comments_count on post when comment is soft-deleted
CREATE TRIGGER IF NOT EXISTS decrement_comments_count
AFTER UPDATE OF deleted_at ON comments
WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
BEGIN
  UPDATE community_posts SET comments_count = comments_count - 1 WHERE id = NEW.post_id;
END;

-- Auto-increment likes_count on post when liked
CREATE TRIGGER IF NOT EXISTS increment_post_likes
AFTER INSERT ON likes
WHEN NEW.likeable_type = 'post' AND NEW.deleted_at IS NULL
BEGIN
  UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = NEW.likeable_id;
END;

-- Auto-decrement likes_count on post when unliked (soft-delete)
CREATE TRIGGER IF NOT EXISTS decrement_post_likes
AFTER UPDATE OF deleted_at ON likes
WHEN NEW.likeable_type = 'post' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
BEGIN
  UPDATE community_posts SET likes_count = likes_count - 1 WHERE id = NEW.likeable_id;
END;

-- Auto-increment likes_count on comment when liked
CREATE TRIGGER IF NOT EXISTS increment_comment_likes
AFTER INSERT ON likes
WHEN NEW.likeable_type = 'comment' AND NEW.deleted_at IS NULL
BEGIN
  UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.likeable_id;
END;

-- Auto-decrement likes_count on comment when unliked (soft-delete)
CREATE TRIGGER IF NOT EXISTS decrement_comment_likes
AFTER UPDATE OF deleted_at ON likes
WHEN NEW.likeable_type = 'comment' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
BEGIN
  UPDATE comments SET likes_count = likes_count - 1 WHERE id = NEW.likeable_id;
END;
`;

// Table names for sync operations
export const SYNCABLE_TABLES = [
  "user_profiles",
  "friendships",
  "community_posts",
  "comments",
  "likes",
  "poll_votes",
  "bookmarks",
  "bookmark_collections",
  "notifications",
  "user_activities",
  "blocked_users",
  "reports",
  "followed_topics",
] as const;

export type SyncableTable = (typeof SYNCABLE_TABLES)[number];
