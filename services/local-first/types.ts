/**
 * Local-First Database Types
 * 
 * These types define the schema for a local-first database that can sync with Supabase.
 * All entities include sync metadata (synced_at, is_dirty, deleted_at) for conflict resolution.
 */

// Base types for sync support
export interface SyncMetadata {
  id: string; // UUID for global uniqueness
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
  synced_at: number | null; // Last sync timestamp, null if never synced
  is_dirty: boolean; // True if local changes need to be synced
  deleted_at: number | null; // Soft delete timestamp, null if not deleted
  version: number; // Optimistic locking version
}

// User Profile
export interface UserProfile extends SyncMetadata {
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
  notification_preferences: NotificationPreferences | null;
}

export interface NotificationPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
  streak_reminders: boolean;
  new_content_alerts: boolean;
  friend_activity: boolean;
}

// Friend Relationships
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked' | 'declined';

export interface Friendship extends SyncMetadata {
  user_id: string; // The user who owns this relationship
  friend_id: string; // The friend's user ID
  status: FriendshipStatus;
  initiated_by: string; // Who sent the friend request
  accepted_at: number | null;
}

export interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: number;
  responded_at: number | null;
}

// Community Posts
export type PostType = 'text' | 'image' | 'poll' | 'achievement' | 'milestone' | 'question';
export type PostVisibility = 'public' | 'friends' | 'private';

export interface CommunityPost extends SyncMetadata {
  author_id: string;
  type: PostType;
  title: string | null;
  content: string;
  media_urls: string[] | null; // JSON array of image/video URLs
  poll_options: PollOption[] | null; // For poll type posts
  visibility: PostVisibility;
  tags: string[] | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_pinned: boolean;
  is_featured: boolean;
  achievement_id: string | null; // For achievement type posts
  lesson_id: string | null; // For milestone type posts
}

export interface PollOption {
  id: string;
  text: string;
  votes_count: number;
}

// Comments
export interface Comment extends SyncMetadata {
  post_id: string;
  author_id: string;
  parent_comment_id: string | null; // For nested replies
  content: string;
  likes_count: number;
  is_edited: boolean;
  depth: number; // Nesting level (0 = top-level)
}

// Likes (for posts and comments)
export type LikeableType = 'post' | 'comment';

export interface Like extends SyncMetadata {
  user_id: string;
  likeable_type: LikeableType;
  likeable_id: string; // post_id or comment_id
}

// Poll Votes
export interface PollVote extends SyncMetadata {
  poll_id: string; // Same as post_id for poll posts
  option_id: string;
  user_id: string;
}

// Bookmarks
export type BookmarkableType = 'post' | 'article' | 'lesson' | 'myth';

export interface Bookmark extends SyncMetadata {
  user_id: string;
  bookmarkable_type: BookmarkableType;
  bookmarkable_id: string;
  notes: string | null;
  collection_id: string | null; // For organizing bookmarks
}

export interface BookmarkCollection extends SyncMetadata {
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
}

// Notifications
export type NotificationType = 
  | 'friend_request' 
  | 'friend_accepted' 
  | 'post_like' 
  | 'comment' 
  | 'comment_reply'
  | 'mention'
  | 'achievement'
  | 'streak_reminder'
  | 'new_content';

export interface Notification extends SyncMetadata {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any> | null; // Additional context (post_id, friend_id, etc.)
  is_read: boolean;
  read_at: number | null;
}

// User Activity (for feed and stats)
export type ActivityType = 
  | 'lesson_completed' 
  | 'quiz_completed' 
  | 'myth_busted' 
  | 'achievement_unlocked'
  | 'streak_milestone'
  | 'level_up'
  | 'friend_added';

export interface UserActivity extends SyncMetadata {
  user_id: string;
  type: ActivityType;
  title: string;
  description: string | null;
  xp_earned: number;
  metadata: Record<string, any> | null;
}

// Blocked Users
export interface BlockedUser extends SyncMetadata {
  user_id: string;
  blocked_user_id: string;
  reason: string | null;
}

// Reports (for moderation)
export type ReportType = 'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'other';
export type ReportableType = 'post' | 'comment' | 'user';

export interface Report extends SyncMetadata {
  reporter_id: string;
  reportable_type: ReportableType;
  reportable_id: string;
  type: ReportType;
  description: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
}

// Following Topics/Tags
export interface FollowedTopic extends SyncMetadata {
  user_id: string;
  topic: string; // e.g., 'nuclear-safety', 'fusion', 'history'
  notification_enabled: boolean;
}

// User Settings (local-only, syncs to profile)
export interface UserSettings {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  sound_enabled: boolean;
  haptics_enabled: boolean;
  auto_play_videos: boolean;
  data_saver_mode: boolean;
  updated_at: number;
}

// Sync Queue - tracks pending changes to sync
export interface SyncQueueItem {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'insert' | 'update' | 'delete';
  payload: string; // JSON stringified data
  created_at: number;
  attempts: number;
  last_attempt_at: number | null;
  error: string | null;
}

// Sync Status - tracks overall sync state
export interface SyncStatus {
  id: string;
  table_name: string;
  last_synced_at: number | null;
  last_sync_version: number;
  is_syncing: boolean;
  error: string | null;
}

// ==================== Helper Types ====================

// For creating new entities (omit sync metadata, id is auto-generated)
export type CreateUserProfile = Omit<UserProfile, keyof SyncMetadata>;
export type CreateFriendship = Omit<Friendship, keyof SyncMetadata>;
export type CreateCommunityPost = Omit<CommunityPost, keyof SyncMetadata | 'likes_count' | 'comments_count' | 'shares_count'>;
export type CreateComment = Omit<Comment, keyof SyncMetadata | 'likes_count' | 'is_edited'>;
export type CreateLike = Omit<Like, keyof SyncMetadata>;
export type CreateBookmark = Omit<Bookmark, keyof SyncMetadata>;
export type CreateNotification = Omit<Notification, keyof SyncMetadata>;

// For updating entities
export type UpdateUserProfile = Partial<CreateUserProfile>;
export type UpdateCommunityPost = Partial<Pick<CommunityPost, 'title' | 'content' | 'media_urls' | 'visibility' | 'tags'>>;
export type UpdateComment = Partial<Pick<Comment, 'content'>>;

// Query types
export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface PostQueryOptions extends PaginationOptions {
  author_id?: string;
  visibility?: PostVisibility;
  type?: PostType;
  tags?: string[];
  is_featured?: boolean;
  order_by?: 'created_at' | 'likes_count' | 'comments_count';
  order_direction?: 'asc' | 'desc';
}

export interface CommentQueryOptions extends PaginationOptions {
  post_id: string;
  parent_comment_id?: string | null;
  order_by?: 'created_at' | 'likes_count';
  order_direction?: 'asc' | 'desc';
}

// User with profile preview (for friend lists, mentions, etc.)
export interface UserPreview {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
}

// Post with author info
export interface PostWithAuthor extends CommunityPost {
  author: UserPreview;
  is_liked: boolean;
  is_bookmarked: boolean;
}

// Comment with author info
export interface CommentWithAuthor extends Comment {
  author: UserPreview;
  is_liked: boolean;
  replies_count: number;
}

// Friend with profile info
export interface FriendWithProfile extends Friendship {
  friend: UserPreview;
}

// Feed item (unified type for activity feed)
export interface FeedItem {
  id: string;
  type: 'post' | 'activity' | 'achievement';
  timestamp: number;
  data: PostWithAuthor | UserActivity;
}
