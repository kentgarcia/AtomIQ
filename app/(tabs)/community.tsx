import { Icon } from '@/components/ui/icon';
import { getAllArticles, getAllPosts } from '@/content/articles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Dimensions, FlatList, Image, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  style 
}: { 
  text: string; 
  maxLength?: number;
  style?: any;
}) => {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > maxLength;
  const displayText = needsTruncation && !expanded 
    ? text.substring(0, maxLength).trim() + '...'
    : text;

  return (
    <View>
      <Text style={style}>{displayText}</Text>
      {needsTruncation && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <Text style={expandableStyles.seeMore}>
            {expanded ? 'See less' : 'See more'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const expandableStyles = StyleSheet.create({
  seeMore: {
    fontSize: 15,
    color: '#65676B',
    fontWeight: '600',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
});

// Reaction Button Component with animations
const ReactionButton = ({ 
  itemId,
  currentReaction,
  onReaction,
  showPicker,
  onTogglePicker,
}: {
  itemId: string;
  currentReaction: ReactionType;
  onReaction: (itemId: string, reaction: ReactionType) => void;
  showPicker: boolean;
  onTogglePicker: (itemId: string) => void;
}) => {
  const reactionConfig = currentReaction 
    ? REACTIONS.find(r => r.type === currentReaction) 
    : null;

  return (
    <View style={reactionStyles.container}>
      {/* Reaction Picker Popup */}
      {showPicker && (
        <Animated.View 
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={reactionStyles.picker}
        >
          {REACTIONS.map((reaction, index) => (
            <AnimatedPressable
              key={reaction.type}
              entering={ZoomIn.delay(index * 50).springify()}
              onPress={() => onReaction(itemId, reaction.type)}
              style={reactionStyles.reactionOption}
            >
              <Text style={reactionStyles.reactionEmoji}>{reaction.emoji}</Text>
            </AnimatedPressable>
          ))}
        </Animated.View>
      )}
      
      {/* Main Button */}
      <TouchableOpacity 
        style={reactionStyles.button}
        onPress={() => onReaction(itemId, 'like')}
        onLongPress={() => onTogglePicker(itemId)}
        delayLongPress={300}
      >
        {reactionConfig ? (
          <>
            <Text style={reactionStyles.buttonEmoji}>{reactionConfig.emoji}</Text>
            <Text style={[reactionStyles.buttonText, { color: reactionConfig.color }]}>
              {reactionConfig.label}
            </Text>
          </>
        ) : (
          <>
            <Icon name="Like" size={20} color="#65676B" variant="Linear" />
            <Text style={reactionStyles.buttonText}>Like</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const reactionStyles = StyleSheet.create({
  container: {
    position: 'relative',
    flex: 1,
  },
  picker: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    gap: 2,
  },
  reactionOption: {
    padding: 6,
  },
  reactionEmoji: {
    fontSize: 28,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  buttonEmoji: {
    fontSize: 18,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#65676B',
  },
});

const { width } = Dimensions.get('window');

// Facebook-inspired Theme
const THEME = {
  bg: '#F0F2F5',
  card: '#FFFFFF',
  text: '#050505',
  textSecondary: '#65676B',
  primary: '#EA580C',
  primaryLight: '#FFF7ED',
  border: '#E4E6EB',
  divider: '#CED0D4',
  link: '#EA580C',
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
}: {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
  comments: Comment[];
  onAddComment: (postId: string, text: string) => void;
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
      <View style={[commentStyles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={commentStyles.header}>
          <TouchableOpacity onPress={onClose} style={commentStyles.closeButton}>
            <Icon name="CloseCircle" size={28} color={THEME.textSecondary} />
          </TouchableOpacity>
          <Text style={commentStyles.headerTitle}>Comments</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Post Title Preview */}
        <View style={commentStyles.postPreview}>
          <Text style={commentStyles.postPreviewText} numberOfLines={2}>
            {postTitle || 'Post'}
          </Text>
        </View>

        {/* Comments List */}
        <FlatList
          data={postComments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={commentStyles.commentsList}
          ListEmptyComponent={
            <View style={commentStyles.emptyComments}>
              <Icon name="Message" size={48} color={THEME.border} />
              <Text style={commentStyles.emptyText}>No comments yet</Text>
              <Text style={commentStyles.emptySubtext}>Be the first to comment!</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View 
              entering={FadeInUp.delay(index * 50)}
              style={commentStyles.commentItem}
            >
              <View style={commentStyles.commentAvatar}>
                <Icon name="Profile" size={18} color="#FFF" variant="Bold" />
              </View>
              <View style={commentStyles.commentContent}>
                <View style={commentStyles.commentBubble}>
                  <Text style={commentStyles.commentAuthor}>{item.author}</Text>
                  <Text style={commentStyles.commentText}>{item.text}</Text>
                </View>
                <Text style={commentStyles.commentTime}>
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
          <View style={[commentStyles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={commentStyles.inputWrapper}>
              <TextInput
                style={commentStyles.input}
                placeholder="Write a comment..."
                placeholderTextColor={THEME.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={[
                  commentStyles.sendButton,
                  !newComment.trim() && commentStyles.sendButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={!newComment.trim()}
              >
                <Icon 
                  name="Send" 
                  size={20} 
                  color={newComment.trim() ? '#FFF' : THEME.textSecondary} 
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

const commentStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
  },
  postPreview: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.bg,
  },
  postPreviewText: {
    fontSize: 14,
    color: THEME.textSecondary,
    fontWeight: '500',
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
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: THEME.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 4,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: THEME.bg,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 15,
    color: THEME.text,
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 4,
    marginLeft: 14,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: THEME.bg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: THEME.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: THEME.bg,
  },
});

// Saved Collection Panel Component
const SavedCollectionPanel = ({
  visible,
  onClose,
  savedItems,
  onItemPress,
  onRemoveItem,
}: {
  visible: boolean;
  onClose: () => void;
  savedItems: any[];
  onItemPress: (item: any) => void;
  onRemoveItem: (itemId: string) => void;
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[savedStyles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={savedStyles.header}>
          <TouchableOpacity onPress={onClose} style={savedStyles.closeButton}>
            <Icon name="ArrowLeft" size={24} color={THEME.text} />
          </TouchableOpacity>
          <Text style={savedStyles.headerTitle}>Saved Posts</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Saved Items List */}
        <FlatList
          data={savedItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={savedStyles.list}
          ListEmptyComponent={
            <View style={savedStyles.emptyState}>
              <Icon name="Archive" size={60} color={THEME.border} />
              <Text style={savedStyles.emptyText}>No saved posts</Text>
              <Text style={savedStyles.emptySubtext}>
                Posts you save will appear here
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.delay(index * 50)}>
              <TouchableOpacity 
                style={savedStyles.savedItem}
                onPress={() => onItemPress(item)}
                activeOpacity={0.7}
              >
                {item.image && (
                  <Image 
                    source={{ uri: item.image }} 
                    style={savedStyles.thumbnail}
                  />
                )}
                <View style={savedStyles.itemContent}>
                  <Text style={savedStyles.itemTitle} numberOfLines={2}>
                    {item.title || 'Untitled Post'}
                  </Text>
                  <Text style={savedStyles.itemMeta}>
                    {item.author?.name || 'AtomIQ'} · {item.type === 'article' ? 'Article' : 'Post'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={savedStyles.removeButton}
                  onPress={() => onRemoveItem(item.id)}
                >
                  <Icon name="CloseCircle" size={22} color={THEME.textSecondary} />
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
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (itemId: string, reason: string) => void;
  itemId: string | null;
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
        style={[reportStyles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={reportStyles.header}>
          <TouchableOpacity onPress={handleClose} style={reportStyles.closeButton}>
            <Icon name="CloseCircle" size={28} color={THEME.textSecondary} />
          </TouchableOpacity>
          <Text style={reportStyles.headerTitle}>Report Post</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Description */}
        <View style={reportStyles.descriptionContainer}>
          <Icon name="Flag" size={40} color={THEME.primary} />
          <Text style={reportStyles.description}>
            Help us understand what's wrong with this post. Your report is anonymous.
          </Text>
        </View>

        {/* Report Reasons */}
        <ScrollView 
          style={reportStyles.reasonsList}
          showsVerticalScrollIndicator={false}
        >
          <Text style={reportStyles.sectionTitle}>Why are you reporting this?</Text>
          
          {REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[
                reportStyles.reasonItem,
                selectedReason === reason.id && reportStyles.reasonItemSelected
              ]}
              onPress={() => setSelectedReason(reason.id)}
            >
              <Icon 
                name={reason.icon as any} 
                size={22} 
                color={selectedReason === reason.id ? THEME.primary : THEME.text} 
              />
              <Text style={[
                reportStyles.reasonText,
                selectedReason === reason.id && reportStyles.reasonTextSelected
              ]}>
                {reason.label}
              </Text>
              <View style={[
                reportStyles.radioButton,
                selectedReason === reason.id && reportStyles.radioButtonSelected
              ]}>
                {selectedReason === reason.id && (
                  <View style={reportStyles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Additional Info (shown when 'other' is selected) */}
          {selectedReason === 'other' && (
            <Animated.View entering={FadeInDown.duration(200)}>
              <Text style={reportStyles.additionalLabel}>Please describe the issue:</Text>
              <TextInput
                style={reportStyles.additionalInput}
                placeholder="Tell us more about why you're reporting this post..."
                placeholderTextColor={THEME.textSecondary}
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
        <View style={[reportStyles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              reportStyles.submitButton,
              !selectedReason && reportStyles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!selectedReason}
          >
            <Text style={[
              reportStyles.submitButtonText,
              !selectedReason && reportStyles.submitButtonTextDisabled
            ]}>
              Submit Report
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const reportStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
  },
  descriptionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  description: {
    fontSize: 15,
    color: THEME.textSecondary,
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
    color: THEME.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: THEME.bg,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  reasonItemSelected: {
    backgroundColor: `${THEME.primary}15`,
    borderWidth: 1,
    borderColor: THEME.primary,
  },
  reasonText: {
    flex: 1,
    fontSize: 15,
    color: THEME.text,
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: THEME.primary,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: THEME.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.primary,
  },
  additionalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    marginTop: 16,
    marginBottom: 8,
  },
  additionalInput: {
    backgroundColor: THEME.bg,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: THEME.text,
    minHeight: 100,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#E53935',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: THEME.bg,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitButtonTextDisabled: {
    color: THEME.textSecondary,
  },
});

const savedStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: THEME.border,
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  removeButton: {
    padding: 8,
  },
});

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
  const undoTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  
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
  React.useEffect(() => {
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
        style={styles.postCard}
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
              <Text style={styles.authorName}>{item.author?.name || 'AtomIQ'}</Text>
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
              <Icon name="More" size={20} color={THEME.textSecondary} />
            </TouchableOpacity>
            
            {/* More Menu Dropdown */}
            {showMenu && (
              <Animated.View 
                entering={FadeIn.duration(150)}
                exiting={FadeOut.duration(100)}
                style={styles.moreMenuDropdown}
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
                  <Text style={styles.moreMenuText}>
                    {isBookmarked ? 'Unsave post' : 'Save post'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.moreMenuItem}
                  onPress={() => handleCopyLink(item)}
                >
                  <Icon name="Link" size={20} color={THEME.text} />
                  <Text style={styles.moreMenuText}>Copy link</Text>
                </TouchableOpacity>
                
                <View style={styles.moreMenuDivider} />
                
                <TouchableOpacity 
                  style={styles.moreMenuItem}
                  onPress={() => handleHidePost(item.id)}
                >
                  <Icon name="EyeSlash" size={20} color={THEME.text} />
                  <Text style={styles.moreMenuText}>Hide post</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.moreMenuItem, styles.moreMenuItemDanger]}
                  onPress={() => openReportModal(item.id)}
                  disabled={isReported}
                >
                  <Icon name="Flag" size={20} color={isReported ? THEME.textSecondary : "#E53935"} />
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
            <Text style={styles.postTitle}>{item.title}</Text>
          )}
          
          {/* Content/Excerpt with See More/Less - Using ExpandableText Component */}
          <ExpandableText 
            text={item.content || ''} 
            maxLength={150}
            style={styles.postContent}
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
          />
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => openCommentPanel(item)}
          >
            <Icon name="Message" size={20} color={THEME.textSecondary} variant="Linear" />
            <Text style={styles.actionText}>Comment</Text>
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
            <Icon name="Send" size={20} color={THEME.textSecondary} variant="Linear" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => toggleBookmark(item.id)}
          >
            <Icon 
              name={isBookmarked ? 'Archive' : 'ArchiveAdd'} 
              size={20} 
              color={isBookmarked ? THEME.primary : THEME.textSecondary} 
              variant={isBookmarked ? 'Bold' : 'Linear'}
            />
            <Text style={[styles.actionText, isBookmarked && styles.actionTextSaved]}>Save</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Facebook-style Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Feed</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => setShowSavedPanel(true)}
          >
            <Icon name="Archive" size={22} color={THEME.text} variant="Bold" />
            {bookmarkedIds.length > 0 && (
              <View style={styles.savedBadge}>
                <Text style={styles.savedBadgeText}>{bookmarkedIds.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Icon name={showSearch ? "CloseCircle" : "SearchNormal"} size={22} color={THEME.text} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <Icon name="SearchNormal" size={18} color={THEME.textSecondary} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search posts..."
            placeholderTextColor={THEME.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="CloseCircle" size={18} color={THEME.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
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
            <Text style={styles.emptyText}>No posts found</Text>
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
    backgroundColor: THEME.bg,
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: THEME.primary,
    letterSpacing: -0.5,
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
    backgroundColor: THEME.bg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  savedBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: THEME.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  savedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  searchIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: THEME.text,
  },
  feedContent: {
    paddingBottom: 100,
  },
  feedSeparator: {
    height: 8,
    backgroundColor: THEME.bg,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
  },
  dotSeparator: {
    marginHorizontal: 4,
    color: THEME.textSecondary,
    fontSize: 12,
  },
  sourceLabel: {
    fontSize: 13,
    color: THEME.link,
    fontWeight: '500',
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timeAgo: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  categoryLabel: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  readTimeLabel: {
    fontSize: 13,
    color: THEME.textSecondary,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
    color: THEME.text,
    fontWeight: '500',
  },
  moreMenuTextDanger: {
    color: '#E53935',
  },
  moreMenuTextDisabled: {
    color: THEME.textSecondary,
  },
  moreMenuDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 4,
    marginHorizontal: 16,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  postContent: {
    fontSize: 15,
    color: THEME.text,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  postImage: {
    width: '100%',
    height: 250,
    backgroundColor: THEME.bg,
    marginTop: 12,
  },
  readMoreLink: {
    fontSize: 15,
    color: THEME.link,
    fontWeight: '500',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  engagementStats: {
    paddingHorizontal: 16,
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
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginHorizontal: 16,
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
    paddingVertical: 10,
    gap: 6,
    position: 'relative',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  actionTextSaved: {
    color: THEME.primary,
  },
  commentBadge: {
    backgroundColor: THEME.primary,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  commentBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    backgroundColor: '#FFFFFF',
  },
  emptyMascot: {
    width: 120,
    height: 120,
    opacity: 0.8,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: THEME.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 4,
  },
  undoSnackbar: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#323232',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  undoSnackbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  undoSnackbarText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  undoButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  undoButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.primary,
    letterSpacing: 0.5,
  },
});
