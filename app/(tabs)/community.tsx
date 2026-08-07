import { Icon } from "@/components/ui/icon";
import { getAllArticles, getAllPosts } from "@/content/articles";
import { useTheme } from "@/theme";
import { moderateComment } from "@/services/comment-moderation";
import {
  fetchComments,
  isOnline,
  postAIReply,
  postComment,
} from "@/services/comments-sync";
import { openExternalUrl } from "@/services/open-url";
import { useStorage } from "@/services/StorageContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CommentPanel } from "@/components/community/CommentPanel";
import { ExpandableText } from "@/components/community/ExpandableText";
import { ReactionButton } from "@/components/community/ReactionButton";
import { ReportModal } from "@/components/community/ReportModal";
import { SavedCollectionPanel } from "@/components/community/SavedCollectionPanel";
import { createStyles } from "@/components/community/styles";
import { REACTIONS } from "@/components/community/types";
import type { Comment, ReactionType } from "@/components/community/types";

// Helper to get image source for local or remote images
const getImageSource = (imagePath: string | number) => {
  if (typeof imagePath === "number") {
    return imagePath; // Already a require() result
  }
  if (typeof imagePath === "string" && imagePath.startsWith("@/assets/")) {
    // Map local image paths to require statements (8 feed images + 4 author images)
    const imageMap: Record<string, any> = {
      // Feed images (matching available files)
      "@/assets/nuclear/feed-1.webp": require("@/assets/nuclear/feed-1.webp"),
      "@/assets/nuclear/feed-2.webp": require("@/assets/nuclear/feed-2.webp"),
      "@/assets/nuclear/feed-3.webp": require("@/assets/nuclear/feed-3.webp"),
      "@/assets/nuclear/feed-4.webp": require("@/assets/nuclear/feed-4.webp"),
      "@/assets/nuclear/feed-5.webp": require("@/assets/nuclear/feed-5.webp"),
      "@/assets/nuclear/feed-6.webp": require("@/assets/nuclear/feed-6.webp"),
      "@/assets/nuclear/feed-9.webp": require("@/assets/nuclear/feed-9.webp"),
      "@/assets/nuclear/feed-10.webp": require("@/assets/nuclear/feed-10.webp"),
      // Author avatars
      "@/assets/nuclear/author/ANSTO.webp": require("@/assets/nuclear/author/ANSTO.webp"),
      "@/assets/nuclear/author/IAEA.webp": require("@/assets/nuclear/author/IAEA.webp"),
      "@/assets/nuclear/author/NEA.webp": require("@/assets/nuclear/author/NEA.webp"),
      "@/assets/nuclear/author/PNRI.webp": require("@/assets/nuclear/author/PNRI.webp"),
    };
    return imageMap[imagePath] || { uri: imagePath };
  }
return { uri: imagePath };
};

// Storage keys
const BOOKMARKS_KEY = "@atomiq_bookmarks";
const COMMENTS_KEY = "@atomiq_comments";

// Helper to generate feed items from articles and posts only
const generateFeedItems = () => {
  const articles = getAllArticles();
  const posts = getAllPosts();

  const feedItems: any[] = [];

  // Add articles as feed items
  articles.forEach((article) => {
    feedItems.push({
      id: `article-${article.id}`,
      type: "article",
      contentType: article.type,
      title: article.title,
      subtitle: article.subtitle,
      content: article.excerpt,
      fullContent: article.content,
      author: article.author,
      publishedDate: article.publishedDate,
      readTime: article.readTime,
      source: article.source,
      sourceUrl: article.sourceUrl,
      category: article.category,
      tags: article.tags,
      image: article.image,
      difficulty: article.difficulty,
      featured: article.featured,
    });
  });

  // Add posts as feed items
  posts.forEach((post) => {
    feedItems.push({
      id: `post-${post.id}`,
      type: "article",
      contentType: post.type,
      title: post.title,
      content: post.content,
      author: post.author,
      publishedDate: post.publishedDate,
      source: post.source,
      sourceUrl: post.sourceUrl,
      videoUrl: post.videoUrl,
      category: post.category,
      tags: post.tags,
      image: post.image,
    });
  });

  // Sort by published date (newest first)
  return feedItems.sort((a, b) => {
    if (a.publishedDate && b.publishedDate) {
      return (
        new Date(b.publishedDate).getTime() -
        new Date(a.publishedDate).getTime()
      );
    }
    if (a.publishedDate) return -1;
    if (b.publishedDate) return 1;
    return 0;
  });
};

// Helper to format time ago
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function CommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const THEME = theme.palettes.tab;
  const styles = useMemo(() => createStyles(THEME), [THEME]);
  const { userProfile } = useStorage();

  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [reactions, setReactions] = useState<Record<string, ReactionType>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(
    null,
  );

  // Comment panel state
  const [comments, setComments] = useState<Comment[]>([]);
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState<any>(null);
  const [moderatingComment, setModeratingComment] = useState(false);
  const [lastCommentTime, setLastCommentTime] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [loadingComments, setLoadingComments] = useState(false);

  // Saved collection panel state
  const [showSavedPanel, setShowSavedPanel] = useState(false);

  // More menu state
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);
  const [hiddenItems, setHiddenItems] = useState<string[]>([]);
  const [reportedItems, setReportedItems] = useState<string[]>([]);

  // Undo hide snackbar state
  const [showUndoSnackbar, setShowUndoSnackbar] = useState(false);
  const [lastHiddenItem, setLastHiddenItem] = useState<string | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingItemId, setReportingItemId] = useState<string | null>(null);

  // Generate feed items
  const allFeedItems = useMemo(() => generateFeedItems(), []);

  // Get saved items
  const savedItems = useMemo(() => {
    return allFeedItems.filter((item) => bookmarkedIds.includes(item.id));
  }, [allFeedItems, bookmarkedIds]);

  // Filter feed items based on search and hidden items
  const filteredItems = useMemo(() => {
    let items = allFeedItems;

    // Filter out hidden items
    items = items.filter((item) => !hiddenItems.includes(item.id));

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.title?.toLowerCase().includes(query) ||
          item.content?.toLowerCase().includes(query) ||
          item.tags?.some((tag: string) => tag.toLowerCase().includes(query)),
      );
    }

    return items;
  }, [allFeedItems, searchQuery, hiddenItems]);

  // Load bookmarks on mount
  useEffect(() => {
    loadBookmarks();
    loadLastCommentTime();
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    if (lastCommentTime > 0) {
      const updateCooldown = () => {
        const now = Date.now();
        const elapsed = now - lastCommentTime;
        const cooldownMs = 5 * 60 * 1000; // 5 minutes
        const remaining = Math.max(0, cooldownMs - elapsed);
        setCooldownRemaining(remaining);

        if (remaining > 0) {
          setTimeout(updateCooldown, 1000);
        }
      };
      updateCooldown();
    }
  }, [lastCommentTime]);

  const loadLastCommentTime = async () => {
    try {
      const saved = await AsyncStorage.getItem("last_comment_time");
      if (saved) {
        setLastCommentTime(parseInt(saved, 10));
      }
    } catch (error) {
      console.error("Error loading last comment time:", error);
    }
  };

  const loadBookmarks = async () => {
    try {
      const saved = await AsyncStorage.getItem(BOOKMARKS_KEY);
      if (saved) {
        setBookmarkedIds(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading bookmarks:", error);
    }
  };

  const handleAddComment = useCallback(
    async (postId: string, text: string) => {
      // Check if online
      const online = await isOnline();
      if (!online) {
        Alert.alert("Offline", "You must be online to post comments.", [
          { text: "OK" },
        ]);
        return;
      }

      // Check if user profile exists
      if (!userProfile) {
        Alert.alert("Error", "User profile not found. Please restart the app.");
        return;
      }

      // Check cooldown
      const now = Date.now();
      const cooldownMs = 5 * 60 * 1000; // 5 minutes
      const timeSinceLastComment = now - lastCommentTime;

      if (lastCommentTime > 0 && timeSinceLastComment < cooldownMs) {
        const remainingSeconds = Math.ceil(
          (cooldownMs - timeSinceLastComment) / 1000,
        );
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;

        Alert.alert(
          "Comment Cooldown",
          `Please wait ${minutes}m ${seconds}s before commenting again.`,
          [{ text: "OK" }],
        );
        return;
      }

      setModeratingComment(true);

      try {
        // Get post context for moderation
        const post = allFeedItems.find((item) => item.id === postId);
        const postContext = post
          ? `${post.title || "Post"}: ${post.content?.substring(0, 200) || ""}`
          : "Nuclear science discussion";

        console.log("[Community] Starting comment moderation...");
        console.log("[Community] Comment text:", text);
        console.log("[Community] Post context:", postContext);

        // Moderate the comment with AI
        const moderationResult = await moderateComment(text, postContext);

        console.log("[Community] Moderation result:", moderationResult);

        // Post comment to Supabase
        const postedComment = await postComment(
          postId,
          userProfile.user_id,
          userProfile.username || "Anonymous",
          userProfile.avatar_url || null,
          text,
          moderationResult,
        );

        if (postedComment) {
          // If comment is incorrect, post AI correction reply
          if (
            moderationResult.status === "incorrect" &&
            moderationResult.correction
          ) {
            console.log("[Community] Posting AI correction reply to Supabase");
            await postAIReply(postId, moderationResult.correction);
          }

          // Reload all comments from Supabase to get the latest state including AI replies
          const updatedComments = await fetchComments(postId);
          setComments(updatedComments);
        }

        // Update last comment time and save it
        setLastCommentTime(now);
        await AsyncStorage.setItem("last_comment_time", now.toString());

        // Show feedback based on moderation
        if (moderationResult.status === "hidden") {
          Alert.alert(
            "Comment Hidden",
            `Your comment was hidden: ${moderationResult.reason}`,
            [{ text: "OK" }],
          );
        } else if (moderationResult.status === "incorrect") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        console.error("Error saving comment:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to post comment. Please try again.";
        Alert.alert("Error", errorMessage);
      } finally {
        setModeratingComment(false);
      }
    },
    [allFeedItems, lastCommentTime, userProfile],
  );

  const openCommentPanel = useCallback(async (item: any) => {
    setActiveCommentPost(item);
    setShowCommentPanel(true);
    setLoadingComments(true);

    try {
      // Load comments from Supabase only when opening panel
      const fetchedComments = await fetchComments(item.id);
      setComments(fetchedComments);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  const handleShare = useCallback(async (item: any) => {
    try {
      const message = item.sourceUrl
        ? `${item.title}\n\nRead more: ${item.sourceUrl}`
        : `${item.title}\n\n${item.content?.substring(0, 200)}...`;

      await Share.share({
        message,
        title: item.title,
        url: item.sourceUrl,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error sharing:", error);
    }
  }, []);

  const handleReaction = useCallback(
    (itemId: string, reactionType: ReactionType) => {
      setReactions((prev) => ({
        ...prev,
        [itemId]: prev[itemId] === reactionType ? null : reactionType,
      }));
      setShowReactionPicker(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [],
  );

  const toggleReactionPicker = useCallback((itemId: string) => {
    setShowReactionPicker((prev) => (prev === itemId ? null : itemId));
  }, []);

  const toggleMoreMenu = useCallback((itemId: string) => {
    setShowMoreMenu((prev) => (prev === itemId ? null : itemId));
  }, []);

  const handleHidePost = useCallback((itemId: string) => {
    // Clear any existing undo timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    setHiddenItems((prev) => [...prev, itemId]);
    setShowMoreMenu(null);
    setLastHiddenItem(itemId);
    setShowUndoSnackbar(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Auto-hide snackbar after 5 seconds
    undoTimeoutRef.current = setTimeout(() => {
      setShowUndoSnackbar(false);
      setLastHiddenItem(null);
    }, 5000);
  }, []);

  const handleUndoHide = useCallback(() => {
    if (lastHiddenItem) {
      setHiddenItems((prev) => prev.filter((id) => id !== lastHiddenItem));
      setShowUndoSnackbar(false);
      setLastHiddenItem(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    }
  }, [lastHiddenItem]);

  const openReportModal = useCallback((itemId: string) => {
    setReportingItemId(itemId);
    setShowMoreMenu(null);
    setShowReportModal(true);
  }, []);

  const handleReportPost = useCallback((itemId: string, reason: string) => {
    setReportedItems((prev) => [...prev, itemId]);
    setShowReportModal(false);
    setReportingItemId(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Post Reported",
      `Thank you for reporting this post as "${reason}". Our team will review it within 24 hours.`,
      [{ text: "OK" }],
    );
  }, []);

  const handleCopyLink = useCallback((item: any) => {
    // Copy post link to clipboard (using the source URL if available)
    const link = item.sourceUrl || `atomiq://post/${item.id}`;
    // Note: In a real app, you'd use Clipboard.setStringAsync from expo-clipboard
    setShowMoreMenu(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Link Copied",
      "The post link has been copied to your clipboard.",
    );
  }, []);

  const toggleBookmark = async (itemId: string) => {
    try {
      let newBookmarks: string[];
      if (bookmarkedIds.includes(itemId)) {
        newBookmarks = bookmarkedIds.filter((id) => id !== itemId);
      } else {
        newBookmarks = [...bookmarkedIds, itemId];
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setBookmarkedIds(newBookmarks);
      await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(newBookmarks));
    } catch (error) {
      console.error("Error saving bookmark:", error);
    }
  };

  const handleArticlePress = async (item: any) => {
    // If it's an article with sourceUrl, open external link
    if (item.type === "article" && item.sourceUrl) {
      const opened = await openExternalUrl(item.sourceUrl);
      if (!opened) {
        Alert.alert("Error", "Could not open source link");
      }
    }
    // Otherwise, navigate to article detail screen
    else if (item.type === "article") {
      router.push(`/article-detail?id=${item.id}`);
    }
    // Posts are not clickable (they're short and self-contained)
  };

  // Get comment count for a post
  const getCommentCount = useCallback(
    (postId: string) => {
      return comments.filter((c) => c.postId === postId).length;
    },
    [comments],
  );

  const renderFeedItem = ({ item, index }: { item: any; index: number }) => {
    const isBookmarked = bookmarkedIds.includes(item.id);
    const currentReaction = reactions[item.id];
    const showPicker = showReactionPicker === item.id;
    const showMenu = showMoreMenu === item.id;
    const isReported = reportedItems.includes(item.id);
    const commentCount = getCommentCount(item.id);
    const timeAgo = item.publishedDate ? formatTimeAgo(item.publishedDate) : "";

    // Get current reaction config
    const reactionConfig = currentReaction
      ? REACTIONS.find((r) => r.type === currentReaction)
      : null;

    // Get category label
    const getCategoryLabel = () => {
      if (item.type === "article") return "Article";
      if (item.type === "post") return "Did You Know?";
      return "Post";
    };

    return (
      <Animated.View
        entering={FadeInDown.delay(50 + (index % 10) * 50).springify()}
        style={[styles.postCard, { backgroundColor: THEME.card }]}
      >
        {/* Post Header - Author Info */}
        <View style={styles.postHeader}>
          <View style={styles.authorAvatar}>
            {item.author?.avatar ? (
              <Image
                source={getImageSource(item.author.avatar)}
                style={styles.avatarImage}
              />
            ) : (
              <Icon name="Profile" size={24} color="#FFF" variant="Bold" />
            )}
          </View>
          <View style={styles.authorInfo}>
            <View style={styles.authorNameRow}>
              <Text style={[styles.authorName, { color: THEME.text }]}>
                {item.author?.name || "AtomIQ"}
              </Text>
              {item.source && (
                <>
                  <Text style={styles.dotSeparator}>·</Text>
                  <Text style={styles.sourceLabel}>{item.source}</Text>
                </>
              )}
            </View>
            <View style={styles.postMeta}>
              <Text style={styles.timeAgo}>{timeAgo}</Text>
              <Text style={styles.dotSeparator}>·</Text>
              <Text style={styles.categoryLabel}>{getCategoryLabel()}</Text>
              {item.readTime && (
                <>
                  <Text style={styles.dotSeparator}>·</Text>
                  <Text style={styles.readTimeLabel}>
                    {item.readTime} min read
                  </Text>
                </>
              )}
            </View>
          </View>
          <View style={styles.moreButtonContainer}>
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => toggleMoreMenu(item.id)}
            >
              <Icon name="More" size={20} color="#999" />
            </TouchableOpacity>

            {/* More Menu Dropdown */}
            {showMenu && (
              <Animated.View
                entering={FadeIn.duration(150)}
                exiting={FadeOut.duration(100)}
                style={[
                  styles.moreMenuDropdown,
                  { backgroundColor: THEME.card },
                ]}
              >
                <TouchableOpacity
                  style={styles.moreMenuItem}
                  onPress={() => toggleBookmark(item.id)}
                >
                  <Icon
                    name={isBookmarked ? "ArchiveMinus" : "ArchiveAdd"}
                    size={20}
                    color={THEME.text}
                  />
                  <Text style={[styles.moreMenuText, { color: THEME.text }]}>
                    {isBookmarked ? "Unsave post" : "Save post"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.moreMenuItem}
                  onPress={() => handleCopyLink(item)}
                >
                  <Icon name="Link" size={20} color={THEME.text} />
                  <Text style={[styles.moreMenuText, { color: THEME.text }]}>
                    Copy link
                  </Text>
                </TouchableOpacity>

                <View style={styles.moreMenuDivider} />

                <TouchableOpacity
                  style={styles.moreMenuItem}
                  onPress={() => handleHidePost(item.id)}
                >
                  <Icon name="EyeSlash" size={20} color={THEME.text} />
                  <Text style={[styles.moreMenuText, { color: THEME.text }]}>
                    Hide post
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.moreMenuItem, styles.moreMenuItemDanger]}
                  onPress={() => openReportModal(item.id)}
                  disabled={isReported}
                >
                  <Icon
                    name="Flag"
                    size={20}
                    color={isReported ? "#999" : "#E53935"}
                  />
                  <Text
                    style={[
                      styles.moreMenuText,
                      isReported
                        ? styles.moreMenuTextDisabled
                        : styles.moreMenuTextDanger,
                    ]}
                  >
                    {isReported ? "Already reported" : "Report post"}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>

        {/* Dismiss overlay when menu is open */}
        {showMenu && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowMoreMenu(null)}
          />
        )}

        {/* Post Content */}
        <View>
          {/* Title */}
          {item.title && (
            <Text style={[styles.postTitle, { color: THEME.text }]}>
              {item.title}
            </Text>
          )}

          {/* Content/Excerpt with See More/Less - Using ExpandableText Component */}
          <ExpandableText
            text={item.content || ""}
            maxLength={150}
            style={styles.postContent}
            theme={THEME}
            styles={styles}
          />

          {/* Image */}
          {item.image && (
            <TouchableOpacity
              activeOpacity={item.type === "article" ? 0.7 : 1}
              onPress={() =>
                item.type === "article" && handleArticlePress(item)
              }
            >
              <Image
                source={getImageSource(item.image)}
                style={styles.postImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {/* Read more link for articles */}
          {item.type === "article" && (
            <TouchableOpacity onPress={() => handleArticlePress(item)}>
              <Text style={styles.readMoreLink}>
                {item.sourceUrl
                  ? "Read more on source website →"
                  : "Read full article →"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Engagement Stats */}
        <View style={styles.engagementStats}>
          {currentReaction && reactionConfig && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={styles.reactionIndicator}
            >
              <Text style={styles.reactionEmoji}>{reactionConfig.emoji}</Text>
              <Text
                style={[styles.reactionLabel, { color: reactionConfig.color }]}
              >
                You reacted with {reactionConfig.label}
              </Text>
            </Animated.View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {/* Reaction Button with Picker */}
          <ReactionButton
            itemId={item.id}
            currentReaction={currentReaction}
            onReaction={handleReaction}
            showPicker={showPicker}
            onTogglePicker={toggleReactionPicker}
            theme={THEME}
            styles={styles}
          />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openCommentPanel(item)}
          >
            <Icon
              name="Message"
              size={20}
              color={THEME.text}
              variant="Linear"
            />
            <Text style={[styles.actionText, { color: THEME.text }]}>
              Comment
            </Text>
            {comments.filter((c) => c.postId === item.id).length > 0 && (
              <View style={styles.commentBadge}>
                <Text style={styles.commentBadgeText}>
                  {comments.filter((c) => c.postId === item.id).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShare(item)}
          >
            <Icon name="Send" size={20} color={THEME.text} variant="Linear" />
            <Text style={[styles.actionText, { color: THEME.text }]}>
              Share
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleBookmark(item.id)}
          >
            <Icon
              name={isBookmarked ? "Archive" : "ArchiveAdd"}
              size={20}
              color={isBookmarked ? "#6A82FB" : THEME.text}
              variant={isBookmarked ? "Bold" : "Linear"}
            />
            <Text
              style={[
                styles.actionText,
                { color: isBookmarked ? "#6A82FB" : THEME.text },
              ]}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Community Feed</Text>
            <Text style={styles.headerSubtitle}>
              Discover news, articles, and updates
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setShowSavedPanel(true)}
            >
              <Icon
                name="Archive"
                size={20}
                color={THEME.text}
                variant="Bold"
              />
              {bookmarkedIds.length > 0 && (
                <View style={styles.savedBadge}>
                  <Text style={styles.savedBadgeText}>
                    {bookmarkedIds.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Icon
                name={showSearch ? "CloseCircle" : "SearchNormal"}
                size={20}
                color={THEME.text}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          style={styles.searchContainer}
        >
          <Icon name="SearchNormal" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Icon name="CloseCircle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Feed */}
      <FlatList
        data={filteredItems}
        renderItem={renderFeedItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.feedSeparator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Image
              source={require("@/assets/images/mascot/blink.png")}
              style={styles.emptyMascot}
              resizeMode="contain"
            />
            <Text style={styles.emptyText}>No posts found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        }
        ListFooterComponent={
          filteredItems.length > 0 ? (
            <View style={styles.feedFooter}>
              <View style={styles.footerContent}>
                <Icon name="Document" size={32} color={THEME.textMuted} />
                <Text style={[styles.footerTitle, { color: THEME.text }]}>
                  You're all caught up!
                </Text>
                <Text
                  style={[styles.footerSubtext, { color: THEME.textMuted }]}
                >
                  More content coming soon. Stay tuned for the latest updates on
                  nuclear science and technology.
                </Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Comment Panel Modal */}
      <CommentPanel
        visible={showCommentPanel}
        onClose={() => {
          setShowCommentPanel(false);
          setActiveCommentPost(null);
          setComments([]); // Clear comments when closing
        }}
        postId={activeCommentPost?.id || ""}
        postTitle={activeCommentPost?.title || "Post"}
        comments={comments}
        onAddComment={handleAddComment}
        moderating={moderatingComment}
        theme={THEME}
        styles={styles}
        cooldownRemaining={cooldownRemaining}
        loadingComments={loadingComments}
      />

      {/* Saved Panel Modal */}
      <SavedCollectionPanel
        visible={showSavedPanel}
        onClose={() => setShowSavedPanel(false)}
        savedItems={savedItems}
        onRemoveItem={toggleBookmark}
        onItemPress={(item: any) => {
          setShowSavedPanel(false);
          if (item.type === "article") {
            handleArticlePress(item);
          }
        }}
        theme={THEME}
        styles={styles}
      />

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setReportingItemId(null);
        }}
        onSubmit={handleReportPost}
        itemId={reportingItemId}
        theme={THEME}
        styles={styles}
      />

      {/* Undo Hide Snackbar */}
      {showUndoSnackbar && (
        <Animated.View
          entering={FadeInUp.duration(250)}
          exiting={FadeOut.duration(150)}
          style={[styles.undoSnackbar, { bottom: insets.bottom + 16 }]}
        >
          <View style={styles.undoSnackbarContent}>
            <Icon name="EyeSlash" size={20} color="#FFFFFF" />
            <Text style={styles.undoSnackbarText}>Post hidden</Text>
          </View>
          <TouchableOpacity style={styles.undoButton} onPress={handleUndoHide}>
            <Text style={styles.undoButtonText}>UNDO</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}
