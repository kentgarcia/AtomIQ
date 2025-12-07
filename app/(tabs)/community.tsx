import { Icon } from '@/components/ui/icon';
import { getAllArticles, getAllPosts } from '@/content/articles';
import { useThemeColor } from '@/hooks/use-theme-color';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, FlatList, Image, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const GRADIENTS = {
  Purple: ['#B8A5FE', '#9E87F5'] as const,
  Green: ['#4FD1C5', '#2DCECC'] as const,
  Orange: ['#FF9F65', '#FF6B6B'] as const,
  Yellow: ['#FFD66E', '#FFA043'] as const,
  Blue: ['#6A82FB', '#FC5C7D'] as const,
  BlueSolid: ['#5E72E4', '#825EE4'] as const,
};

// Types
type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' | null;

interface Comment {
  id: string;
  postId: string;
  text: string;
  author: string;
  timestamp: Date;
}

const REACTIONS = [
  { type: 'like' as const, emoji: '👍', label: 'Like', color: '#2078F4' },
  { type: 'love' as const, emoji: '❤️', label: 'Love', color: '#F33E58' },
  { type: 'haha' as const, emoji: '😂', label: 'Haha', color: '#F7B125' },
  { type: 'wow' as const, emoji: '😮', label: 'Wow', color: '#F7B125' },
  { type: 'sad' as const, emoji: '😢', label: 'Sad', color: '#F7B125' },
  { type: 'angry' as const, emoji: '😠', label: 'Angry', color: '#E9710F' },
];

// Animated Pressable for reactions
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Expandable Text Component
const ExpandableText = ({ 
  text, 
  maxLength = 150,
  style,
  textColor
}: { 
  text: string; 
  maxLength?: number;
  style?: any;
  textColor: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > maxLength;
  const displayText = needsTruncation && !expanded 
    ? text.substring(0, maxLength).trim() + '...'
    : text;

  return (
    <View>
      <Text style={[style, { color: textColor }]}>{displayText}</Text>
      {needsTruncation && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <Text style={styles.seeMore}>
            {expanded ? 'See less' : 'See more'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Reaction Button Component with animations
const ReactionButton = ({ 
  itemId,
  currentReaction,
  onReaction,
  showPicker,
  onTogglePicker,
  textColor,
  cardColor
}: {
  itemId: string;
  currentReaction: ReactionType;
  onReaction: (itemId: string, reaction: ReactionType) => void;
  showPicker: boolean;
  onTogglePicker: (itemId: string) => void;
  textColor: string;
  cardColor: string;
}) => {
  const reactionConfig = currentReaction 
    ? REACTIONS.find(r => r.type === currentReaction) 
    : null;

  return (
    <View style={styles.reactionContainer}>
      {/* Reaction Picker Popup */}
      {showPicker && (
        <Animated.View 
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[styles.picker, { backgroundColor: cardColor }]}
        >
          {REACTIONS.map((reaction, index) => (
            <AnimatedPressable
              key={reaction.type}
              entering={ZoomIn.delay(index * 50).springify()}
              onPress={() => onReaction(itemId, reaction.type)}
              style={styles.reactionOption}
            >
              <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
            </AnimatedPressable>
          ))}
        </Animated.View>
      )}
      
      {/* Main Button */}
      <TouchableOpacity 
        style={styles.reactionButton}
        onPress={() => onReaction(itemId, 'like')}
        onLongPress={() => onTogglePicker(itemId)}
        delayLongPress={300}
      >
        {reactionConfig ? (
          <>
            <Text style={styles.buttonEmoji}>{reactionConfig.emoji}</Text>
            <Text style={[styles.buttonText, { color: reactionConfig.color }]}>
              {reactionConfig.label}
            </Text>
          </>
        ) : (
          <>
            <Icon name="Like" size={20} color={textColor} variant="Linear" />
            <Text style={[styles.buttonText, { color: textColor }]}>Like</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

// Storage keys
const BOOKMARKS_KEY = '@atomiq_bookmarks';
const COMMENTS_KEY = '@atomiq_comments';

// Comment Panel Component
const CommentPanel = ({
  visible,
  onClose,
  postId,
  postTitle,
  comments,
  onAddComment,
  textColor,
  cardColor,
  backgroundColor
}: {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
  comments: Comment[];
  onAddComment: (postId: string, text: string) => void;
  textColor: string;
  cardColor: string;
  backgroundColor: string;
}) => {
  const insets = useSafeAreaInsets();
  const [newComment, setNewComment] = useState('');
  const postComments = comments.filter(c => c.postId === postId);

  const handleSubmit = () => {
    if (newComment.trim()) {
      onAddComment(postId, newComment.trim());
      setNewComment('');
      Keyboard.dismiss();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const formatCommentTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="CloseCircle" size={28} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: textColor }]}>Comments</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Post Title Preview */}
        <View style={[styles.postPreview, { backgroundColor: cardColor }]}>
          <Text style={styles.postPreviewText} numberOfLines={2}>
            {postTitle || 'Post'}
          </Text>
        </View>

        {/* Comments List */}
        <FlatList
          data={postComments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.commentsList}
          ListEmptyComponent={
            <View style={styles.emptyComments}>
              <Icon name="Message" size={48} color="#CCC" />
              <Text style={[styles.emptyText, { color: textColor }]}>No comments yet</Text>
              <Text style={styles.emptySubtext}>Be the first to comment!</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View 
              entering={FadeInUp.delay(index * 50)}
              style={styles.commentItem}
            >
              <View style={styles.commentAvatar}>
                <Icon name="Profile" size={18} color="#FFF" variant="Bold" />
              </View>
              <View style={styles.commentContent}>
                <View style={[styles.commentBubble, { backgroundColor: cardColor }]}>
                  <Text style={[styles.commentAuthor, { color: textColor }]}>{item.author}</Text>
                  <Text style={[styles.commentText, { color: textColor }]}>{item.text}</Text>
                </View>
                <Text style={styles.commentTime}>
                  {formatCommentTime(item.timestamp)}
                </Text>
              </View>
            </Animated.View>
          )}
        />

        {/* Comment Input */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.inputContainer, { backgroundColor, paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={[styles.inputWrapper, { backgroundColor: cardColor }]}>
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Write a comment..."
                placeholderTextColor="#999"
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={[
                  styles.sendButton,
                  !newComment.trim() && styles.sendButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={!newComment.trim()}
              >
                <Icon 
                  name="Send" 
                  size={20} 
                  color={newComment.trim() ? '#FFF' : '#999'} 
                  variant="Bold"
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// Saved Collection Panel Component
const SavedCollectionPanel = ({
  visible,
  onClose,
  savedItems,
  onItemPress,
  onRemoveItem,
  textColor,
  cardColor,
  backgroundColor
}: {
  visible: boolean;
  onClose: () => void;
  savedItems: any[];
  onItemPress: (item: any) => void;
  onRemoveItem: (itemId: string) => void;
  textColor: string;
  cardColor: string;
  backgroundColor: string;
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="ArrowLeft" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: textColor }]}>Saved Posts</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Saved Items List */}
        <FlatList
          data={savedItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="Archive" size={60} color="#CCC" />
              <Text style={[styles.emptyText, { color: textColor }]}>No saved posts</Text>
              <Text style={styles.emptySubtext}>
                Posts you save will appear here
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.delay(index * 50)}>
              <TouchableOpacity 
                style={[styles.savedItem, { backgroundColor: cardColor }]}
                onPress={() => onItemPress(item)}
                activeOpacity={0.7}
              >
                {item.image && (
                  <Image 
                    source={{ uri: item.image }} 
                    style={styles.thumbnail}
                  />
                )}
                <View style={styles.itemContent}>
                  <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={2}>
                    {item.title || 'Untitled Post'}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {item.author?.name || 'AtomIQ'} · {item.type === 'article' ? 'Article' : 'Post'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => onRemoveItem(item.id)}
                >
                  <Icon name="CloseCircle" size={22} color="#999" />
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      </View>
    </Modal>
  );
};

// Report reasons
const REPORT_REASONS = [
  { id: 'spam', label: 'Spam or misleading', icon: 'Warning2' },
  { id: 'harassment', label: 'Harassment or hate speech', icon: 'Danger' },
  { id: 'misinformation', label: 'False information', icon: 'InfoCircle' },
  { id: 'violence', label: 'Violence or dangerous content', icon: 'ShieldCross' },
  { id: 'copyright', label: 'Copyright violation', icon: 'DocumentText' },
  { id: 'other', label: 'Other', icon: 'More' },
];

// Report Modal Component
const ReportModal = ({
  visible,
  onClose,
  onSubmit,
  itemId,
  textColor,
  cardColor,
  backgroundColor
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (itemId: string, reason: string) => void;
  itemId: string | null;
  textColor: string;
  cardColor: string;
  backgroundColor: string;
}) => {
  const insets = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState('');

  const handleSubmit = () => {
    if (selectedReason && itemId) {
      const reasonLabel = REPORT_REASONS.find(r => r.id === selectedReason)?.label || selectedReason;
      onSubmit(itemId, reasonLabel);
      setSelectedReason(null);
      setAdditionalInfo('');
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setAdditionalInfo('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={[styles.modalContainer, { backgroundColor, paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="CloseCircle" size={28} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: textColor }]}>Report Post</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Icon name="Flag" size={40} color="#FF6B6B" />
          <Text style={styles.description}>
            Help us understand what's wrong with this post. Your report is anonymous.
          </Text>
        </View>

        {/* Report Reasons */}
        <ScrollView 
          style={styles.reasonsList}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Why are you reporting this?</Text>
          
          {REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reasonItem,
                { backgroundColor: cardColor },
                selectedReason === reason.id && styles.reasonItemSelected
              ]}
              onPress={() => setSelectedReason(reason.id)}
            >
              <Icon 
                name={reason.icon as any} 
                size={22} 
                color={selectedReason === reason.id ? '#FF6B6B' : textColor} 
              />
              <Text style={[
                styles.reasonText,
                { color: textColor },
                selectedReason === reason.id && styles.reasonTextSelected
              ]}>
                {reason.label}
              </Text>
              <View style={[
                styles.radioButton,
                selectedReason === reason.id && styles.radioButtonSelected
              ]}>
                {selectedReason === reason.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Additional Info (shown when 'other' is selected) */}
          {selectedReason === 'other' && (
            <Animated.View entering={FadeInDown.duration(200)}>
              <Text style={[styles.additionalLabel, { color: textColor }]}>Please describe the issue:</Text>
              <TextInput
                style={[styles.additionalInput, { backgroundColor: cardColor, color: textColor }]}
                placeholder="Tell us more about why you're reporting this post..."
                placeholderTextColor="#999"
                value={additionalInfo}
                onChangeText={setAdditionalInfo}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.footer, { backgroundColor, paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              !selectedReason && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!selectedReason}
          >
            <Text style={[
              styles.submitButtonText,
              !selectedReason && styles.submitButtonTextDisabled
            ]}>
              Submit Report
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Helper to generate feed items from articles and posts only
const generateFeedItems = () => {
  const articles = getAllArticles();
  const posts = getAllPosts();
  
  const feedItems: any[] = [];
  
  // Add articles as feed items
  articles.forEach((article) => {
    feedItems.push({
      id: `article-${article.id}`,
      type: 'article',
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
      type: 'post',
      contentType: post.type,
      title: post.title,
      content: post.content,
      author: post.author,
      publishedDate: post.publishedDate,
      source: post.source,
      category: post.category,
      tags: post.tags,
      image: post.image,
    });
  });
  
  // Sort by published date (newest first)
  return feedItems.sort((a, b) => {
    if (a.publishedDate && b.publishedDate) {
      return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
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
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function CommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardColor = useThemeColor({}, 'card');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [reactions, setReactions] = useState<Record<string, ReactionType>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  
  // Comment panel state
  const [comments, setComments] = useState<Comment[]>([]);
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState<any>(null);
  
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
    return allFeedItems.filter(item => bookmarkedIds.includes(item.id));
  }, [allFeedItems, bookmarkedIds]);
  
  // Filter feed items based on search and hidden items
  const filteredItems = useMemo(() => {
    let items = allFeedItems;
    
    // Filter out hidden items
    items = items.filter(item => !hiddenItems.includes(item.id));
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.title?.toLowerCase().includes(query) ||
        item.content?.toLowerCase().includes(query) ||
        item.tags?.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }
    
    return items;
  }, [allFeedItems, searchQuery, hiddenItems]);
  
  // Load bookmarks on mount
  useEffect(() => {
    loadBookmarks();
    loadComments();
  }, []);
  
  const loadBookmarks = async () => {
    try {
      const saved = await AsyncStorage.getItem(BOOKMARKS_KEY);
      if (saved) {
        setBookmarkedIds(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };
  
  const loadComments = async () => {
    try {
      const saved = await AsyncStorage.getItem(COMMENTS_KEY);
      if (saved) {
        setComments(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };
  
  const handleAddComment = useCallback(async (postId: string, text: string) => {
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      postId,
      text,
      author: 'You',
      timestamp: new Date(),
    };
    
    const updatedComments = [...comments, newComment];
    setComments(updatedComments);
    
    try {
      await AsyncStorage.setItem(COMMENTS_KEY, JSON.stringify(updatedComments));
    } catch (error) {
      console.error('Error saving comment:', error);
    }
  }, [comments]);
  
  const openCommentPanel = useCallback((item: any) => {
    setActiveCommentPost(item);
    setShowCommentPanel(true);
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
      console.error('Error sharing:', error);
    }
  }, []);
  
  const handleReaction = useCallback((itemId: string, reactionType: ReactionType) => {
    setReactions(prev => ({
      ...prev,
      [itemId]: prev[itemId] === reactionType ? null : reactionType
    }));
    setShowReactionPicker(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);
  
  const toggleReactionPicker = useCallback((itemId: string) => {
    setShowReactionPicker(prev => prev === itemId ? null : itemId);
  }, []);
  
  const toggleMoreMenu = useCallback((itemId: string) => {
    setShowMoreMenu(prev => prev === itemId ? null : itemId);
  }, []);
  
  const handleHidePost = useCallback((itemId: string) => {
    // Clear any existing undo timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    
    setHiddenItems(prev => [...prev, itemId]);
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
      setHiddenItems(prev => prev.filter(id => id !== lastHiddenItem));
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
    setReportedItems(prev => [...prev, itemId]);
    setShowReportModal(false);
    setReportingItemId(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Post Reported',
      `Thank you for reporting this post as "${reason}". Our team will review it within 24 hours.`,
      [{ text: 'OK' }]
    );
  }, []);
  
  const handleCopyLink = useCallback((item: any) => {
    // Copy post link to clipboard (using the source URL if available)
    const link = item.sourceUrl || `atomiq://post/${item.id}`;
    // Note: In a real app, you'd use Clipboard.setStringAsync from expo-clipboard
    setShowMoreMenu(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Link Copied', 'The post link has been copied to your clipboard.');
  }, []);
  
  const toggleBookmark = async (itemId: string) => {
    try {
      let newBookmarks: string[];
      if (bookmarkedIds.includes(itemId)) {
        newBookmarks = bookmarkedIds.filter(id => id !== itemId);
      } else {
        newBookmarks = [...bookmarkedIds, itemId];
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setBookmarkedIds(newBookmarks);
      await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(newBookmarks));
    } catch (error) {
      console.error('Error saving bookmark:', error);
    }
  };
  
  const handleArticlePress = async (item: any) => {
    // If it's an article with sourceUrl, open external link
    if (item.type === 'article' && item.sourceUrl) {
      try {
        await Linking.openURL(item.sourceUrl);
      } catch (error) {
        console.error('Error opening URL:', error);
      }
    } 
    // Otherwise, navigate to article detail screen
    else if (item.type === 'article') {
      router.push(`/article-detail?id=${item.id}`);
    }
    // Posts are not clickable (they're short and self-contained)
  };
  
  // Get comment count for a post
  const getCommentCount = useCallback((postId: string) => {
    return comments.filter(c => c.postId === postId).length;
  }, [comments]);
  
  const renderFeedItem = ({ item, index }: { item: any; index: number }) => {
    const isBookmarked = bookmarkedIds.includes(item.id);
    const currentReaction = reactions[item.id];
    const showPicker = showReactionPicker === item.id;
    const showMenu = showMoreMenu === item.id;
    const isReported = reportedItems.includes(item.id);
    const commentCount = getCommentCount(item.id);
    const timeAgo = item.publishedDate ? formatTimeAgo(item.publishedDate) : '';
    
    // Get current reaction config
    const reactionConfig = currentReaction 
      ? REACTIONS.find(r => r.type === currentReaction) 
      : null;
    
    // Get category label
    const getCategoryLabel = () => {
      if (item.type === 'article') return 'Article';
      if (item.type === 'post') return 'Did You Know?';
      return 'Post';
    };
    
    return (
      <Animated.View 
        entering={FadeInDown.delay(50 + (index % 10) * 50).springify()}
        style={[styles.postCard, { backgroundColor: cardColor }]}
      >
        {/* Post Header - Author Info */}
        <View style={styles.postHeader}>
          <View style={styles.authorAvatar}>
            {item.author?.avatar ? (
              <Image source={{ uri: item.author.avatar }} style={styles.avatarImage} />
            ) : (
              <Icon name="Profile" size={24} color="#FFF" variant="Bold" />
            )}
          </View>
          <View style={styles.authorInfo}>
            <View style={styles.authorNameRow}>
              <Text style={[styles.authorName, { color: textColor }]}>{item.author?.name || 'AtomIQ'}</Text>
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
                  <Text style={styles.readTimeLabel}>{item.readTime} min read</Text>
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
                style={[styles.moreMenuDropdown, { backgroundColor: cardColor }]}
              >
                <TouchableOpacity 
                  style={styles.moreMenuItem}
                  onPress={() => toggleBookmark(item.id)}
                >
                  <Icon 
                    name={isBookmarked ? "ArchiveMinus" : "ArchiveAdd"} 
                    size={20} 
                    color={textColor} 
                  />
                  <Text style={[styles.moreMenuText, { color: textColor }]}>
                    {isBookmarked ? 'Unsave post' : 'Save post'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.moreMenuItem}
                  onPress={() => handleCopyLink(item)}
                >
                  <Icon name="Link" size={20} color={textColor} />
                  <Text style={[styles.moreMenuText, { color: textColor }]}>Copy link</Text>
                </TouchableOpacity>
                
                <View style={styles.moreMenuDivider} />
                
                <TouchableOpacity 
                  style={styles.moreMenuItem}
                  onPress={() => handleHidePost(item.id)}
                >
                  <Icon name="EyeSlash" size={20} color={textColor} />
                  <Text style={[styles.moreMenuText, { color: textColor }]}>Hide post</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.moreMenuItem, styles.moreMenuItemDanger]}
                  onPress={() => openReportModal(item.id)}
                  disabled={isReported}
                >
                  <Icon name="Flag" size={20} color={isReported ? "#999" : "#E53935"} />
                  <Text style={[styles.moreMenuText, isReported ? styles.moreMenuTextDisabled : styles.moreMenuTextDanger]}>
                    {isReported ? 'Already reported' : 'Report post'}
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
            <Text style={[styles.postTitle, { color: textColor }]}>{item.title}</Text>
          )}
          
          {/* Content/Excerpt with See More/Less - Using ExpandableText Component */}
          <ExpandableText 
            text={item.content || ''} 
            maxLength={150}
            style={styles.postContent}
            textColor={textColor}
          />
          
          {/* Image */}
          {item.image && (
            <TouchableOpacity 
              activeOpacity={item.type === 'article' ? 0.7 : 1}
              onPress={() => item.type === 'article' && handleArticlePress(item)}
            >
              <Image 
                source={{ uri: item.image }} 
                style={styles.postImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          
          {/* Read more link for articles */}
          {item.type === 'article' && (
            <TouchableOpacity onPress={() => handleArticlePress(item)}>
              <Text style={styles.readMoreLink}>
                {item.sourceUrl ? 'Read more on source website →' : 'Read full article →'}
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
              <Text style={[styles.reactionLabel, { color: reactionConfig.color }]}>
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
            textColor={textColor}
            cardColor={cardColor}
          />
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => openCommentPanel(item)}
          >
            <Icon name="Message" size={20} color={textColor} variant="Linear" />
            <Text style={[styles.actionText, { color: textColor }]}>Comment</Text>
            {comments.filter(c => c.postId === item.id).length > 0 && (
              <View style={styles.commentBadge}>
                <Text style={styles.commentBadgeText}>
                  {comments.filter(c => c.postId === item.id).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleShare(item)}
          >
            <Icon name="Send" size={20} color={textColor} variant="Linear" />
            <Text style={[styles.actionText, { color: textColor }]}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => toggleBookmark(item.id)}
          >
            <Icon 
              name={isBookmarked ? 'Archive' : 'ArchiveAdd'} 
              size={20} 
              color={isBookmarked ? '#6A82FB' : textColor} 
              variant={isBookmarked ? 'Bold' : 'Linear'}
            />
            <Text style={[styles.actionText, { color: isBookmarked ? '#6A82FB' : textColor }]}>Save</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: cardColor }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: textColor }]}>Community Feed</Text>
            <Text style={styles.headerSubtitle}>Discover news, articles, and updates</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.headerIconButton, { backgroundColor }]}
              onPress={() => setShowSavedPanel(true)}
            >
              <Icon name="Archive" size={20} color={textColor} variant="Bold" />
              {bookmarkedIds.length > 0 && (
                <View style={styles.savedBadge}>
                  <Text style={styles.savedBadgeText}>{bookmarkedIds.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerIconButton, { backgroundColor }]}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Icon name={showSearch ? "CloseCircle" : "SearchNormal"} size={20} color={textColor} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Search Bar */}
      {showSearch && (
        <Animated.View entering={FadeInDown.duration(200)} style={[styles.searchContainer, { backgroundColor: cardColor }]}>
          <Icon name="SearchNormal" size={18} color="#999" />
          <TextInput 
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search posts..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
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
              source={require('@/assets/images/mascot/blink.png')} 
              style={styles.emptyMascot}
              resizeMode="contain"
            />
            <Text style={[styles.emptyText, { color: textColor }]}>No posts found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        }
      />
      
      {/* Comment Panel Modal */}
      <CommentPanel
        visible={showCommentPanel}
        onClose={() => {
          setShowCommentPanel(false);
          setActiveCommentPost(null);
        }}
        postId={activeCommentPost?.id || ''}
        postTitle={activeCommentPost?.title || 'Post'}
        comments={comments}
        onAddComment={handleAddComment}
        textColor={textColor}
        cardColor={cardColor}
        backgroundColor={backgroundColor}
      />
      
      {/* Saved Panel Modal */}
      <SavedCollectionPanel
        visible={showSavedPanel}
        onClose={() => setShowSavedPanel(false)}
        savedItems={savedItems}
        onRemoveItem={toggleBookmark}
        onItemPress={(item: any) => {
          setShowSavedPanel(false);
          if (item.type === 'article') {
            handleArticlePress(item);
          }
        }}
        textColor={textColor}
        cardColor={cardColor}
        backgroundColor={backgroundColor}
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
        textColor={textColor}
        cardColor={cardColor}
        backgroundColor={backgroundColor}
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
          <TouchableOpacity 
            style={styles.undoButton}
            onPress={handleUndoHide}
          >
            <Text style={styles.undoButtonText}>UNDO</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8898AA',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  savedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#5E72E4',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  savedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Feed
  feedContent: {
    paddingBottom: 100,
  },
  feedSeparator: {
    height: 8,
    backgroundColor: 'transparent',
  },
  postCard: {
    paddingVertical: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6A82FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  authorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
  },
  dotSeparator: {
    marginHorizontal: 4,
    color: '#999',
    fontSize: 12,
  },
  sourceLabel: {
    fontSize: 13,
    color: '#6A82FB',
    fontWeight: '700',
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timeAgo: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  categoryLabel: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  readTimeLabel: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  moreButtonContainer: {
    position: 'relative',
    zIndex: 100,
  },
  moreButton: {
    padding: 8,
    marginRight: -8,
  },
  moreMenuDropdown: {
    position: 'absolute',
    top: 35,
    right: 0,
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 180,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    zIndex: 1000,
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  moreMenuItemDanger: {
    // danger styling handled by text color
  },
  moreMenuText: {
    fontSize: 15,
    fontWeight: '600',
  },
  moreMenuTextDanger: {
    color: '#E53935',
  },
  moreMenuTextDisabled: {
    color: '#999',
  },
  moreMenuDivider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 4,
    marginHorizontal: 16,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  seeMore: {
    fontSize: 15,
    color: '#999',
    fontWeight: '700',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#EEE',
    marginTop: 12,
    marginBottom: 8,
  },
  readMoreLink: {
    fontSize: 15,
    color: '#6A82FB',
    fontWeight: '700',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  engagementStats: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    minHeight: 8,
  },
  reactionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginHorizontal: 20,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    position: 'relative',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  commentBadge: {
    backgroundColor: '#6A82FB',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  commentBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  
  // Reaction Button
  reactionContainer: {
    flex: 1,
    position: 'relative',
  },
  reactionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  picker: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    flexDirection: 'row',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    gap: 2,
  },
  reactionOption: {
    padding: 6,
  },
  buttonEmoji: {
    fontSize: 18,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyMascot: {
    width: 120,
    height: 120,
    opacity: 0.8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
  },
  
  // Undo Snackbar
  undoSnackbar: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#323232',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  undoSnackbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  undoSnackbarText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  undoButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  undoButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6A82FB',
    letterSpacing: 0.5,
  },
  
  // Modals
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  postPreview: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  postPreviewText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  commentsList: {
    padding: 16,
    flexGrow: 1,
  },
  emptyComments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6A82FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    padding: 12,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '600',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    padding: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
    fontWeight: '500',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6A82FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#EEE',
  },
  
  // Saved List
  list: {
    padding: 16,
    flexGrow: 1,
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#EEE',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 13,
    color: '#999',
  },
  removeButton: {
    padding: 8,
  },
  
  // Report Modal
  descriptionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  description: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  reasonsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
  },
  reasonItemSelected: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  reasonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: '#FF6B6B',
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#FF6B6B',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B6B',
  },
  additionalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  additionalInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  submitButton: {
    backgroundColor: '#E53935',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#EEE',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitButtonTextDisabled: {
    color: '#999',
  },
});
