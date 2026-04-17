/**
 * Local-First Database Context and Hooks
 *
 * Provides React context and hooks for accessing the local-first database.
 */

import * as SQLite from "expo-sqlite";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { QueryOptions } from "./base-repository";
import {
    ActivityRepository,
    BookmarkCollectionRepository,
    BookmarkRepository,
    CommentRepository,
    FriendshipRepository,
    LikeRepository,
    NotificationRepository,
    PostRepository,
    ProfileRepository,
} from "./repositories";
import { LOCAL_FIRST_SCHEMA } from "./schema";
import { createSyncManager, SyncEvent, SyncManager } from "./sync-manager";
import {
    Bookmark,
    Comment,
    CommunityPost,
    Friendship,
    Notification,
    PostQueryOptions,
    UserActivity,
    UserProfile,
} from "./types";

// Database context type
interface LocalFirstContextType {
  isReady: boolean;
  error: Error | null;

  // Repositories
  profiles: ProfileRepository | null;
  friendships: FriendshipRepository | null;
  posts: PostRepository | null;
  comments: CommentRepository | null;
  likes: LikeRepository | null;
  bookmarks: BookmarkRepository | null;
  bookmarkCollections: BookmarkCollectionRepository | null;
  notifications: NotificationRepository | null;
  activities: ActivityRepository | null;

  // Sync manager
  syncManager: SyncManager | null;

  // Sync helpers
  syncNow: () => Promise<void>;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pendingChanges: number;
}

const LocalFirstContext = createContext<LocalFirstContextType>({
  isReady: false,
  error: null,
  profiles: null,
  friendships: null,
  posts: null,
  comments: null,
  likes: null,
  bookmarks: null,
  bookmarkCollections: null,
  notifications: null,
  activities: null,
  syncManager: null,
  syncNow: async () => {},
  isSyncing: false,
  lastSyncedAt: null,
  pendingChanges: 0,
});

// Provider props
interface LocalFirstProviderProps {
  children: React.ReactNode;
}

/**
 * Local-First Database Provider
 */
export const LocalFirstProvider: React.FC<LocalFirstProviderProps> = ({
  children,
}) => {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [syncManager, setSyncManager] = useState<SyncManager | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);

  const refreshSyncStatus = useCallback(async (manager: SyncManager) => {
    try {
      const status = await manager.getOverallStatus();
      setLastSyncedAt(status.lastSyncedAt);
      setPendingChanges(status.pendingChanges);
    } catch (statusError) {
      console.warn("Failed to refresh sync status:", statusError);
    }
  }, []);

  // Initialize database
  useEffect(() => {
    const initDatabase = async () => {
      try {
        const database = await SQLite.openDatabaseAsync("atomiq.db");

        // Run schema migrations
        await database.execAsync(LOCAL_FIRST_SCHEMA);

        // Create sync manager
        const manager = createSyncManager(database);
        await manager.initialize();

        // Add sync event listener
        manager.addListener((event: SyncEvent) => {
          if (event.type === "sync_started") {
            setIsSyncing(true);
          } else if (
            event.type === "sync_completed" ||
            event.type === "sync_failed"
          ) {
            setIsSyncing(false);
            if (event.type === "sync_completed") {
              setLastSyncedAt(event.timestamp);
            }
            void refreshSyncStatus(manager);
          }
        });

        setDb(database);
        setSyncManager(manager);
        setIsReady(true);

        // Get initial sync status
        await refreshSyncStatus(manager);
      } catch (err) {
        console.error("Failed to initialize local-first database:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      }
    };

    initDatabase();
  }, [refreshSyncStatus]);

  // Create repositories
  const repositories = useMemo(() => {
    if (!db) {
      return {
        profiles: null,
        friendships: null,
        posts: null,
        comments: null,
        likes: null,
        bookmarks: null,
        bookmarkCollections: null,
        notifications: null,
        activities: null,
      };
    }

    return {
      profiles: new ProfileRepository(db),
      friendships: new FriendshipRepository(db),
      posts: new PostRepository(db),
      comments: new CommentRepository(db),
      likes: new LikeRepository(db),
      bookmarks: new BookmarkRepository(db),
      bookmarkCollections: new BookmarkCollectionRepository(db),
      notifications: new NotificationRepository(db),
      activities: new ActivityRepository(db),
    };
  }, [db]);

  // Sync now function
  const syncNow = useCallback(async () => {
    if (syncManager) {
      await syncManager.syncNow();
      await refreshSyncStatus(syncManager);
    }
  }, [refreshSyncStatus, syncManager]);

  const value: LocalFirstContextType = {
    isReady,
    error,
    ...repositories,
    syncManager,
    syncNow,
    isSyncing,
    lastSyncedAt,
    pendingChanges,
  };

  return (
    <LocalFirstContext.Provider value={value}>
      {children}
    </LocalFirstContext.Provider>
  );
};

/**
 * Hook to access local-first database context
 */
export const useLocalFirst = () => {
  const context = useContext(LocalFirstContext);
  if (!context) {
    throw new Error("useLocalFirst must be used within a LocalFirstProvider");
  }
  return context;
};

// ==================== Entity-specific Hooks ====================

/**
 * Hook for user profile operations
 */
export const useProfile = () => {
  const { profiles, isReady } = useLocalFirst();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!profiles) return;
    setLoading(true);
    try {
      const currentProfile = await profiles.getCurrentProfile();
      setProfile(currentProfile);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }, [profiles]);

  useEffect(() => {
    if (isReady) {
      refresh();
    }
  }, [isReady, refresh]);

  const updateProfile = useCallback(
    async (data: Partial<UserProfile>) => {
      if (!profiles || !profile) return null;
      const updated = await profiles.update(profile.id, data);
      if (updated) setProfile(updated);
      return updated;
    },
    [profiles, profile],
  );

  const addXP = useCallback(
    async (amount: number) => {
      if (!profiles || !profile) return null;
      const updated = await profiles.addXP(profile.id, amount);
      if (updated) setProfile(updated);
      return updated;
    },
    [profiles, profile],
  );

  return { profile, loading, refresh, updateProfile, addXP };
};

/**
 * Hook for friends operations
 */
export const useFriends = (userId: string) => {
  const { friendships, profiles, isReady } = useLocalFirst();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!friendships) return;
    setLoading(true);
    try {
      const [friendList, pending] = await Promise.all([
        friendships.getFriends(userId),
        friendships.getPendingRequestsReceived(userId),
      ]);
      setFriends(friendList);
      setPendingRequests(pending);
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setLoading(false);
    }
  }, [friendships, userId]);

  useEffect(() => {
    if (isReady) {
      refresh();
    }
  }, [isReady, refresh]);

  const sendRequest = useCallback(
    async (toUserId: string) => {
      if (!friendships) return null;
      const result = await friendships.sendFriendRequest(userId, toUserId);
      await refresh();
      return result;
    },
    [friendships, userId, refresh],
  );

  const acceptRequest = useCallback(
    async (friendId: string) => {
      if (!friendships) return false;
      const result = await friendships.acceptFriendRequest(userId, friendId);
      await refresh();
      return result;
    },
    [friendships, userId, refresh],
  );

  const declineRequest = useCallback(
    async (friendId: string) => {
      if (!friendships) return false;
      const result = await friendships.declineFriendRequest(userId, friendId);
      await refresh();
      return result;
    },
    [friendships, userId, refresh],
  );

  const removeFriend = useCallback(
    async (friendId: string) => {
      if (!friendships) return false;
      const result = await friendships.removeFriend(userId, friendId);
      await refresh();
      return result;
    },
    [friendships, userId, refresh],
  );

  return {
    friends,
    pendingRequests,
    loading,
    refresh,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    friendsCount: friends.length,
    pendingCount: pendingRequests.length,
  };
};

/**
 * Hook for community posts
 */
export const usePosts = (options: Partial<PostQueryOptions> = {}) => {
  const { posts, likes, bookmarks, isReady } = useLocalFirst();
  const [postList, setPostList] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const pageSize = options.limit || 20;

  const refresh = useCallback(async () => {
    if (!posts) return;
    setLoading(true);
    setPage(0);
    try {
      const result = await posts.getFeedPosts({
        ...options,
        limit: pageSize,
        offset: 0,
      });
      setPostList(result);
      setHasMore(result.length === pageSize);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  }, [posts, options, pageSize]);

  useEffect(() => {
    if (isReady) {
      refresh();
    }
  }, [isReady]);

  const loadMore = useCallback(async () => {
    if (!posts || loading || !hasMore) return;

    const nextPage = page + 1;
    try {
      const result = await posts.getFeedPosts({
        ...options,
        limit: pageSize,
        offset: nextPage * pageSize,
      });
      setPostList((prev) => [...prev, ...result]);
      setPage(nextPage);
      setHasMore(result.length === pageSize);
    } catch (error) {
      console.error("Error loading more posts:", error);
    }
  }, [posts, options, page, pageSize, loading, hasMore]);

  const createPost = useCallback(
    async (data: Parameters<PostRepository["createPost"]>[0]) => {
      if (!posts) return null;
      const newPost = await posts.createPost(data);
      setPostList((prev) => [newPost, ...prev]);
      return newPost;
    },
    [posts],
  );

  const deletePost = useCallback(
    async (postId: string) => {
      if (!posts) return false;
      const result = await posts.delete(postId);
      if (result) {
        setPostList((prev) => prev.filter((p) => p.id !== postId));
      }
      return result;
    },
    [posts],
  );

  return {
    posts: postList,
    loading,
    hasMore,
    refresh,
    loadMore,
    createPost,
    deletePost,
  };
};

/**
 * Hook for comments on a post
 */
export const useComments = (postId: string) => {
  const { comments: commentRepo, isReady } = useLocalFirst();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!commentRepo) return;
    setLoading(true);
    try {
      const result = await commentRepo.getTopLevelComments(postId);
      setComments(result);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  }, [commentRepo, postId]);

  useEffect(() => {
    if (isReady) {
      refresh();
    }
  }, [isReady, refresh]);

  const addComment = useCallback(
    async (content: string, authorId: string, parentId?: string) => {
      if (!commentRepo) return null;
      const newComment = await commentRepo.createComment({
        post_id: postId,
        author_id: authorId,
        parent_comment_id: parentId || null,
        content,
        depth: parentId ? 1 : 0,
      });
      await refresh();
      return newComment;
    },
    [commentRepo, postId, refresh],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!commentRepo) return false;
      const result = await commentRepo.delete(commentId);
      if (result) await refresh();
      return result;
    },
    [commentRepo, refresh],
  );

  const getReplies = useCallback(
    async (commentId: string) => {
      if (!commentRepo) return [];
      return commentRepo.getReplies(commentId);
    },
    [commentRepo],
  );

  return {
    comments,
    loading,
    refresh,
    addComment,
    deleteComment,
    getReplies,
    count: comments.length,
  };
};

/**
 * Hook for notifications
 */
export const useNotifications = (userId: string) => {
  const { notifications: notificationRepo, isReady } = useLocalFirst();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!notificationRepo) return;
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        notificationRepo.getUserNotifications(userId, { limit: 50 }),
        notificationRepo.getUnreadCount(userId),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [notificationRepo, userId]);

  useEffect(() => {
    if (isReady) {
      refresh();
    }
  }, [isReady, refresh]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!notificationRepo) return;
      await notificationRepo.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: Date.now() }
            : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [notificationRepo],
  );

  const markAllAsRead = useCallback(async () => {
    if (!notificationRepo) return;
    await notificationRepo.markAllAsRead(userId);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: Date.now() })),
    );
    setUnreadCount(0);
  }, [notificationRepo, userId]);

  return {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
  };
};

/**
 * Hook for bookmarks
 */
export const useBookmarks = (userId: string) => {
  const { bookmarks: bookmarkRepo, isReady } = useLocalFirst();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!bookmarkRepo) return;
    setLoading(true);
    try {
      const result = await bookmarkRepo.getUserBookmarks(userId);
      setBookmarks(result);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    } finally {
      setLoading(false);
    }
  }, [bookmarkRepo, userId]);

  useEffect(() => {
    if (isReady) {
      refresh();
    }
  }, [isReady, refresh]);

  const toggleBookmark = useCallback(
    async (type: Bookmark["bookmarkable_type"], itemId: string) => {
      if (!bookmarkRepo) return null;
      const result = await bookmarkRepo.toggleBookmark(userId, type, itemId);
      await refresh();
      return result;
    },
    [bookmarkRepo, userId, refresh],
  );

  const isBookmarked = useCallback(
    (type: Bookmark["bookmarkable_type"], itemId: string) => {
      return bookmarks.some(
        (b) => b.bookmarkable_type === type && b.bookmarkable_id === itemId,
      );
    },
    [bookmarks],
  );

  return {
    bookmarks,
    loading,
    refresh,
    toggleBookmark,
    isBookmarked,
    count: bookmarks.length,
  };
};

/**
 * Hook for activity feed
 */
export const useActivity = (userId: string, options: QueryOptions = {}) => {
  const { activities, isReady } = useLocalFirst();
  const [activityList, setActivityList] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!activities) return;
    setLoading(true);
    try {
      const result = await activities.getUserActivity(userId, options);
      setActivityList(result);
    } catch (error) {
      console.error("Error fetching activity:", error);
    } finally {
      setLoading(false);
    }
  }, [activities, userId, options]);

  useEffect(() => {
    if (isReady) {
      refresh();
    }
  }, [isReady, refresh]);

  return {
    activities: activityList,
    loading,
    refresh,
  };
};

/**
 * Hook for like operations
 */
export const useLike = (
  userId: string,
  likeableType: "post" | "comment",
  likeableId: string,
) => {
  const { likes, isReady } = useLocalFirst();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!likes) return;
    setLoading(true);
    try {
      const [liked, count] = await Promise.all([
        likes.hasLiked(userId, likeableType, likeableId),
        likes.getLikeCount(likeableType, likeableId),
      ]);
      setIsLiked(liked);
      setLikeCount(count);
    } catch (error) {
      console.error("Error fetching like status:", error);
    } finally {
      setLoading(false);
    }
  }, [likes, userId, likeableType, likeableId]);

  useEffect(() => {
    if (isReady) {
      refresh();
    }
  }, [isReady, refresh]);

  const toggle = useCallback(async () => {
    if (!likes) return;
    const result = await likes.toggleLike(userId, likeableType, likeableId);
    setIsLiked(result.liked);
    setLikeCount((prev) => prev + (result.liked ? 1 : -1));
    return result;
  }, [likes, userId, likeableType, likeableId]);

  return {
    isLiked,
    likeCount,
    loading,
    toggle,
    refresh,
  };
};
