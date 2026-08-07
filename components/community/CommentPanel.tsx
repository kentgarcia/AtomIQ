import AsyncStorage from "@react-native-async-storage/async-storage";
import { Icon } from "@/components/ui/icon";
import type { TabLight as LightTHEME } from "@/theme";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Comment } from "./types";

const COMMENT_GUIDELINES_SEEN_KEY = "@atomiq_comment_guidelines_seen";

// Comment Panel Component
export const CommentPanel = ({
  visible,
  onClose,
  postId,
  postTitle,
  comments,
  onAddComment,
  moderating,
  theme,
  styles,
  cooldownRemaining,
  loadingComments,
}: {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
  comments: Comment[];
  onAddComment: (postId: string, text: string) => void;
  moderating: boolean;
  theme: typeof LightTHEME;
  styles: any;
  cooldownRemaining: number;
  loadingComments: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const [newComment, setNewComment] = useState("");
  const [showGuidelines, setShowGuidelines] = useState(false);
  const postComments = comments.filter((c) => c.postId === postId);

  // Check if user has seen guidelines
  useEffect(() => {
    const checkGuidelines = async () => {
      if (visible) {
        try {
          const seen = await AsyncStorage.getItem(COMMENT_GUIDELINES_SEEN_KEY);
          if (!seen) {
            setShowGuidelines(true);
          }
        } catch (error) {
          console.error("Error checking guidelines:", error);
        }
      }
    };
    checkGuidelines();
  }, [visible]);

  const handleGuidelinesConfirm = async () => {
    try {
      await AsyncStorage.setItem(COMMENT_GUIDELINES_SEEN_KEY, "true");
      setShowGuidelines(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error saving guidelines:", error);
      setShowGuidelines(false);
    }
  };

  const handleSubmit = () => {
    if (newComment.trim() && !moderating) {
      onAddComment(postId, newComment.trim());
      setNewComment("");
      Keyboard.dismiss();
    }
  };

  const formatCommentTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor(
      (now.getTime() - new Date(date).getTime()) / 1000,
    );
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalContainer,
          { backgroundColor: theme.bg, paddingTop: insets.top },
        ]}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="CloseCircle" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            Comments
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Post Title Preview */}
        <View style={[styles.postPreview, { backgroundColor: theme.card }]}>
          <Text style={styles.postPreviewText} numberOfLines={2}>
            {postTitle || "Post"}
          </Text>
        </View>

        {/* Comment Guidelines Modal */}
        <Modal
          visible={showGuidelines}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGuidelines(false)}
        >
          <View style={styles.guidelinesOverlay}>
            <Animated.View
              entering={ZoomIn.springify()}
              style={[styles.guidelinesModal, { backgroundColor: theme.card }]}
            >
              <View style={styles.guidelinesHeader}>
                <Icon name="InfoCircle" size={48} color="#5E72E4" />
                <Text style={[styles.guidelinesTitle, { color: theme.text }]}>
                  Community Guidelines
                </Text>
              </View>

              <ScrollView
                style={styles.guidelinesContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.guidelineItem}>
                  <Text style={styles.guidelineEmoji}>✅</Text>
                  <Text style={[styles.guidelineText, { color: theme.text }]}>
                    <Text style={styles.guidelineBold}>Be respectful</Text> -
                    Treat others with kindness and respect
                  </Text>
                </View>

                <View style={styles.guidelineItem}>
                  <Text style={styles.guidelineEmoji}>🧠</Text>
                  <Text style={[styles.guidelineText, { color: theme.text }]}>
                    <Text style={styles.guidelineBold}>Stay on topic</Text> -
                    Keep discussions relevant to nuclear science
                  </Text>
                </View>

                <View style={styles.guidelineItem}>
                  <Text style={styles.guidelineEmoji}>🔬</Text>
                  <Text style={[styles.guidelineText, { color: theme.text }]}>
                    <Text style={styles.guidelineBold}>Share knowledge</Text> -
                    Contribute meaningful insights and ask questions
                  </Text>
                </View>

                <View style={styles.guidelineItem}>
                  <Text style={styles.guidelineEmoji}>🚫</Text>
                  <Text style={[styles.guidelineText, { color: theme.text }]}>
                    <Text style={styles.guidelineBold}>
                      No spam or harassment
                    </Text>{" "}
                    - Keep the community safe and welcoming
                  </Text>
                </View>

                <View style={styles.guidelineItem}>
                  <Text style={styles.guidelineEmoji}>📚</Text>
                  <Text style={[styles.guidelineText, { color: theme.text }]}>
                    <Text style={styles.guidelineBold}>Cite sources</Text> -
                    Back up claims with credible references when possible
                  </Text>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={styles.guidelinesButton}
                onPress={handleGuidelinesConfirm}
              >
                <Text style={styles.guidelinesButtonText}>I Understand</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        {/* Comments List */}
        <FlatList
          data={postComments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.commentsList}
          ListEmptyComponent={
            loadingComments ? (
              <View style={styles.emptyComments}>
                <Image
                  source={require("@/assets/images/mascot/thinking.png")}
                  style={styles.loadingMascot}
                />
                <Text style={[styles.emptyText, { color: theme.text }]}>
                  Loading comments...
                </Text>
              </View>
            ) : (
              <View style={styles.emptyComments}>
                <Icon name="Message" size={48} color="#CCC" />
                <Text style={[styles.emptyText, { color: theme.text }]}>
                  No comments yet
                </Text>
                <Text style={styles.emptySubtext}>
                  Be the first to comment!
                </Text>
              </View>
            )
          }
          renderItem={({ item, index }) => {
            const isHidden = item.moderation?.status === "hidden";
            const isIncorrect = item.moderation?.status === "incorrect";
            const isAI = item.isAIReply;

            return (
              <Animated.View
                entering={FadeInUp.delay(index * 50)}
                style={styles.commentItem}
              >
                {isAI ? (
                  <View style={styles.commentAvatarImage}>
                    <Image
                      source={require("@/assets/images/mascot/explain.png")}
                      style={styles.mascotAvatar}
                    />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.commentAvatar,
                      { backgroundColor: theme.primary },
                    ]}
                  >
                    <Icon
                      name="Profile"
                      size={18}
                      color="#FFF"
                      variant="Bold"
                    />
                  </View>
                )}
                <View style={styles.commentContent}>
                  {isHidden ? (
                    <View
                      style={[
                        styles.commentBubble,
                        {
                          backgroundColor: theme.card,
                          borderWidth: 1,
                          borderColor: "#FF9F65",
                        },
                      ]}
                    >
                      <View style={styles.hiddenCommentHeader}>
                        <Icon name="EyeSlash" size={16} color="#FF9F65" />
                        <Text
                          style={[
                            styles.hiddenCommentTitle,
                            { color: "#FF9F65" },
                          ]}
                        >
                          Comment Hidden
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.hiddenCommentReason,
                          { color: theme.textMuted },
                        ]}
                      >
                        {item.moderation?.reason ||
                          "This comment was hidden by the moderator"}
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.commentBubble,
                        {
                          backgroundColor: isAI
                            ? "rgba(94, 114, 228, 0.1)"
                            : theme.card,
                        },
                      ]}
                    >
                      <View style={styles.commentHeaderRow}>
                        <Text
                          style={[
                            styles.commentAuthor,
                            { color: isAI ? "#5E72E4" : theme.text },
                          ]}
                        >
                          {isAI ? "Schrödi" : item.author}
                        </Text>
                        {isIncorrect && !isAI && (
                          <View style={styles.factCheckBadge}>
                            <Icon name="InfoCircle" size={12} color="#FF9F65" />
                            <Text style={styles.factCheckText}>
                              Fact-checked
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.commentText, { color: theme.text }]}>
                        {item.text}
                      </Text>
                      {isAI && (
                        <View style={styles.aiNotice}>
                          <Text style={styles.aiNoticeText}>
                            AI-generated correction
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  <Text style={styles.commentTime}>
                    {formatCommentTime(item.timestamp)}
                  </Text>
                </View>
              </Animated.View>
            );
          }}
        />

        {/* Comment Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.bg,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            {moderating && (
              <View style={styles.moderatingIndicator}>
                <Image
                  source={require("@/assets/images/mascot/thinking.png")}
                  style={styles.moderatingMascot}
                />
                <Text style={styles.moderatingText}>
                  Schrödi is reviewing your comment...
                </Text>
              </View>
            )}
            {cooldownRemaining > 0 && (
              <View style={styles.cooldownIndicator}>
                <Icon name="Clock" size={16} color="#FF9F65" />
                <Text style={styles.cooldownText}>
                  Cooldown: {Math.floor(cooldownRemaining / 60000)}m{" "}
                  {Math.floor((cooldownRemaining % 60000) / 1000)}s
                </Text>
              </View>
            )}
            <View
              style={[styles.inputWrapper, { backgroundColor: theme.card }]}
            >
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Write a comment..."
                placeholderTextColor="#999"
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
                editable={!moderating && cooldownRemaining === 0}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!newComment.trim() || moderating || cooldownRemaining > 0) &&
                    styles.sendButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={
                  !newComment.trim() || moderating || cooldownRemaining > 0
                }
              >
                <Icon
                  name="Send"
                  size={20}
                  color={
                    newComment.trim() && !moderating && cooldownRemaining === 0
                      ? "#FFF"
                      : "#999"
                  }
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