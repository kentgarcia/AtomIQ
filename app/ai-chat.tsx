import {fontFamilies} from "@/theme";
import { MarkdownText } from "@/components/markdown-text";
import { Icon } from "@/components/ui/icon";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    ChatConversation,
    ChatMessage,
    createConversation,
    deleteConversation,
    getAllConversations,
    getCurrentConversationId,
    initChatHistoryDB,
    loadConversation,
    saveConversation,
    setCurrentConversationId,
} from "@/services/chat-history";
import {
    convertMessagesToGeminiFormat,
    sendMessageToGemini,
} from "@/services/gemini";
import { openExternalUrl } from "@/services/open-url";
import { useStorage } from "@/services/StorageContext";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    Easing,
    FadeInUp,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Purple Theme matching the app design
const LightCHAT_THEME = {
  bg: "#F4F5F7",
  card: "#FFFFFF",
  text: "#2D3436",
  textMuted: "#636E72",
  primary: "#9E87F5",
  primaryDark: "#7C3AED",
  primaryLight: "#B8A5FE",
  userBubble: "#9E87F5",
  botBubble: "#FFFFFF",
  border: "#E5E7EB",
  green: "#2ECC71",
  accent: "#1CB0F6",
};

const DarkCHAT_THEME = {
  bg: "#172B4D",
  card: "#213356",
  text: "#F6F9FC",
  textMuted: "#8898AA",
  primary: "#9E87F5",
  primaryDark: "#7C3AED",
  primaryLight: "#B8A5FE",
  userBubble: "#9E87F5",
  botBubble: "#213356",
  border: "#2D3A56",
  green: "#2ECC71",
  accent: "#1CB0F6",
};

const INITIAL_SUGGESTIONS = [
  "Is X-Ray safe?",
  "How do reactors work?",
  "Define Half-life",
  "What is Fusion?",
  "Radiation vs. Radioactivity",
];

const OFFLINE_CHAT_ERROR_MESSAGE =
  "Schrodi is offline right now. Reconnect to the internet and try again.";
const OFFLINE_CHAT_ALERT_MESSAGE =
  "No internet connection right now. Connect online, then send your question again.";

const REFERENCE_URLS: Record<string, string> = {
  IAEA: "https://www.iaea.org/",
  UNSCEAR: "https://www.unscear.org/",
  NRC: "https://www.nrc.gov/",
  WHO: "https://www.who.int/",
  ICRP: "https://www.icrp.org/",
  NEA: "https://www.oecd-nea.org/",
  ANS: "https://www.ans.org/",
  EPA: "https://www.epa.gov/radiation",
  DOE: "https://www.energy.gov/",
};

const resolveReferenceUrl = (reference: string): string => {
  const directUrlMatch = reference.match(/https?:\/\/[^\s)\]]+/i);
  if (directUrlMatch) {
    return directUrlMatch[0];
  }

  const normalizedReference = reference.toUpperCase();
  for (const [key, url] of Object.entries(REFERENCE_URLS)) {
    if (normalizedReference.includes(key)) {
      return url;
    }
  }

  return `https://www.google.com/search?q=${encodeURIComponent(reference)}`;
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    role: "bot" as const,
    text: "Greetings, Scientist. I am Schrödi. Accessing the database...",
    citations: [],
    followUpSuggestions: [],
  },
  {
    id: 2,
    role: "bot" as const,
    text: "I am ready. Ask me anything about nuclear physics, safety protocols, or historical events. I'll provide accurate information with reliable sources.",
    citations: ["UNSCEAR", "IAEA"],
    followUpSuggestions: INITIAL_SUGGESTIONS.slice(0, 4),
  },
];

interface Message {
  id: number;
  role: "user" | "bot";
  text: string;
  citations: string[];
  followUpSuggestions?: string[];
}

const createSeedMessages = (): Message[] =>
  INITIAL_MESSAGES.map((message, index) => ({
    ...message,
    id: Date.now() + index,
  }));

const getConversationSuggestions = (messageHistory: Message[]): string[] => {
  const latestBotSuggestions = [...messageHistory]
    .reverse()
    .find(
      (message) =>
        message.role === "bot" &&
        message.followUpSuggestions &&
        message.followUpSuggestions.length > 0,
    );

  return latestBotSuggestions?.followUpSuggestions || INITIAL_SUGGESTIONS;
};

const normalizeLoadedMessages = (messageHistory: ChatMessage[]): Message[] =>
  messageHistory.map((message, index) => ({
    id: typeof message.id === "number" ? message.id : Date.now() + index,
    role: message.role,
    text: message.text,
    citations: message.citations || [],
    followUpSuggestions: message.followUpSuggestions || [],
  }));

export default function AiChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isOnline } = useStorage();
  const colorScheme = useColorScheme();
  const CHAT_THEME = colorScheme === "dark" ? DarkCHAT_THEME : LightCHAT_THEME;
  const styles = React.useMemo(() => createStyles(CHAT_THEME), [CHAT_THEME]);
  const scrollViewRef = useRef<ScrollView>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutosaveRef = useRef(false);
  const [messages, setMessages] = useState<Message[]>(() =>
    createSeedMessages(),
  );
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSwitchingConversation, setIsSwitchingConversation] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);

  const isConversationBusy =
    isBootstrapping ||
    isSwitchingConversation ||
    isCreatingConversation ||
    isDeletingConversation;

  const applyConversationState = useCallback(
    (nextMessages: Message[], conversationId: string) => {
      skipAutosaveRef.current = true;
      setMessages(nextMessages);
      setSuggestions(getConversationSuggestions(nextMessages));
      setError(null);
      setInputText("");
      setActiveConversationId(conversationId);
    },
    [],
  );

  const refreshConversationList = useCallback(async () => {
    const nextConversations = await getAllConversations();
    setConversations(nextConversations);
    return nextConversations;
  }, []);

  const hydrateConversation = useCallback(
    async (conversationId: string): Promise<boolean> => {
      const loadedConversation = await loadConversation(conversationId);

      if (!loadedConversation) {
        return false;
      }

      let nextMessages = normalizeLoadedMessages(loadedConversation.messages);
      if (!nextMessages.length) {
        nextMessages = createSeedMessages();
        await saveConversation(
          conversationId,
          nextMessages,
          loadedConversation.title,
        );
      }

      applyConversationState(nextMessages, conversationId);
      await setCurrentConversationId(conversationId);

      return true;
    },
    [applyConversationState],
  );

  const createAndSwitchConversation = useCallback(async (): Promise<
    string | null
  > => {
    setIsCreatingConversation(true);

    try {
      const conversationId = await createConversation("New Conversation");
      const seededMessages = createSeedMessages();

      await saveConversation(conversationId, seededMessages);
      applyConversationState(seededMessages, conversationId);
      await setCurrentConversationId(conversationId);
      await refreshConversationList();

      return conversationId;
    } catch (creationError) {
      console.error("Error creating conversation:", creationError);
      setError("Failed to create a new conversation.");
      return null;
    } finally {
      setIsCreatingConversation(false);
    }
  }, [applyConversationState, refreshConversationList]);

  const switchConversation = useCallback(
    async (conversationId: string) => {
      if (
        !conversationId ||
        conversationId === activeConversationId ||
        isConversationBusy
      ) {
        return;
      }

      setIsSwitchingConversation(true);
      try {
        const didLoadConversation = await hydrateConversation(conversationId);
        if (!didLoadConversation) {
          const refreshedConversations = await refreshConversationList();
          if (refreshedConversations.length > 0) {
            await hydrateConversation(refreshedConversations[0].id);
          } else {
            await createAndSwitchConversation();
          }
        }
      } catch (switchError) {
        console.error("Error switching conversation:", switchError);
        setError("Failed to switch conversation.");
      } finally {
        setIsSwitchingConversation(false);
      }
    },
    [
      activeConversationId,
      createAndSwitchConversation,
      hydrateConversation,
      isConversationBusy,
      refreshConversationList,
    ],
  );

  const requestSwitchConversation = useCallback(
    (conversationId: string) => {
      if (
        !conversationId ||
        conversationId === activeConversationId ||
        isConversationBusy
      ) {
        return;
      }

      if (inputText.trim().length > 0) {
        Alert.alert(
          "Discard draft?",
          "Switching chats will discard your unsent message.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Switch Chat",
              onPress: () => {
                void switchConversation(conversationId);
              },
            },
          ],
        );
        return;
      }

      void switchConversation(conversationId);
    },
    [activeConversationId, inputText, isConversationBusy, switchConversation],
  );

  const requestNewConversation = useCallback(() => {
    if (isConversationBusy) {
      return;
    }

    if (inputText.trim().length > 0) {
      Alert.alert(
        "Discard draft?",
        "Starting a new chat will discard your unsent message.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "New Chat",
            onPress: () => {
              void createAndSwitchConversation();
            },
          },
        ],
      );
      return;
    }

    void createAndSwitchConversation();
  }, [createAndSwitchConversation, inputText, isConversationBusy]);

  const deleteConversationById = useCallback(
    async (conversationId: string) => {
      if (!conversationId || isConversationBusy) {
        return;
      }

      setIsDeletingConversation(true);
      try {
        await deleteConversation(conversationId);
        const refreshedConversations = await refreshConversationList();

        if (conversationId === activeConversationId) {
          if (refreshedConversations.length > 0) {
            await hydrateConversation(refreshedConversations[0].id);
          } else {
            await createAndSwitchConversation();
          }
        }
      } catch (deletionError) {
        console.error("Error deleting conversation:", deletionError);
        setError("Failed to delete conversation.");
      } finally {
        setIsDeletingConversation(false);
      }
    },
    [
      activeConversationId,
      createAndSwitchConversation,
      hydrateConversation,
      isConversationBusy,
      refreshConversationList,
    ],
  );

  const requestDeleteConversation = useCallback(
    (conversationId?: string) => {
      const targetConversationId = conversationId || activeConversationId;
      if (!targetConversationId || isConversationBusy) {
        return;
      }

      const targetConversation = conversations.find(
        (conversation) => conversation.id === targetConversationId,
      );

      Alert.alert(
        "Delete chat?",
        `Delete "${targetConversation?.title || "this chat"}"? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              void deleteConversationById(targetConversationId);
            },
          },
        ],
      );
    },
    [
      activeConversationId,
      conversations,
      deleteConversationById,
      isConversationBusy,
    ],
  );

  const bootstrapConversations = useCallback(async () => {
    setIsBootstrapping(true);

    try {
      await initChatHistoryDB();
      let availableConversations = await refreshConversationList();
      let preferredConversationId = await getCurrentConversationId();

      if (!availableConversations.length) {
        await createAndSwitchConversation();
        return;
      }

      if (
        !preferredConversationId ||
        !availableConversations.some(
          (conversation) => conversation.id === preferredConversationId,
        )
      ) {
        preferredConversationId = availableConversations[0].id;
      }

      if (preferredConversationId) {
        const didLoadPreferredConversation = await hydrateConversation(
          preferredConversationId,
        );

        if (!didLoadPreferredConversation) {
          availableConversations = await refreshConversationList();
          if (availableConversations.length > 0) {
            await hydrateConversation(availableConversations[0].id);
          } else {
            await createAndSwitchConversation();
          }
        }
      }
    } catch (bootstrapError) {
      console.error("Error bootstrapping conversations:", bootstrapError);
      setError("Failed to load conversation history.");
    } finally {
      setIsBootstrapping(false);
    }
  }, [
    createAndSwitchConversation,
    hydrateConversation,
    refreshConversationList,
  ]);

  const persistConversationNow = useCallback(
    async (nextMessages: Message[]) => {
      if (!activeConversationId) {
        return;
      }

      try {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }

        await saveConversation(activeConversationId, nextMessages);
        await refreshConversationList();
      } catch (persistError) {
        console.error("Error persisting conversation:", persistError);
      }
    },
    [activeConversationId, refreshConversationList],
  );

  // Thinking Animation (Spinning Atom / Dot)
  const spin = useSharedValue(0);
  useEffect(() => {
    if (isThinking) {
      spin.value = withRepeat(
        withTiming(360, { duration: 1500, easing: Easing.linear }),
        -1,
      );
    } else {
      spin.value = 0;
    }
  }, [isThinking]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  useEffect(() => {
    void bootstrapConversations();
  }, [bootstrapConversations]);

  useEffect(() => {
    if (!activeConversationId || isBootstrapping) {
      return;
    }

    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveConversation(activeConversationId, messages);
        await refreshConversationList();
      } catch (autosaveError) {
        console.error("Error autosaving conversation:", autosaveError);
      }
    }, 1200);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [
    activeConversationId,
    isBootstrapping,
    messages,
    refreshConversationList,
  ]);

  const handleSend = async () => {
    if (
      !inputText.trim() ||
      isThinking ||
      !activeConversationId ||
      isConversationBusy
    )
      return;

    if (!isOnline) {
      setError(OFFLINE_CHAT_ERROR_MESSAGE);
      Alert.alert("You're Offline", OFFLINE_CHAT_ALERT_MESSAGE);
      return;
    }

    const existingMessages = messages;
    const userMessage = inputText.trim();
    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      text: userMessage,
      citations: [],
      followUpSuggestions: [],
    };

    const messagesWithUser = [...existingMessages, userMsg];

    setMessages(messagesWithUser);
    setInputText("");
    setIsThinking(true);
    setError(null);

    try {
      const conversationHistory =
        convertMessagesToGeminiFormat(existingMessages);

      // Call Gemini API
      const response = await sendMessageToGemini(
        userMessage,
        conversationHistory,
      );

      const botMsg: Message = {
        id: Date.now() + 1,
        role: "bot",
        text: response.text,
        citations: response.citations,
        followUpSuggestions: response.followUpSuggestions,
      };

      const messagesWithBot = [...messagesWithUser, botMsg];

      setMessages(messagesWithBot);
      await persistConversationNow(messagesWithBot);

      // Update suggestions with follow-ups from the response
      if (
        response.followUpSuggestions &&
        response.followUpSuggestions.length > 0
      ) {
        setSuggestions(response.followUpSuggestions);
      }
    } catch (err) {
      console.error("Error calling Gemini:", err);
      const rawErrorMessage =
        err instanceof Error ? err.message : "Failed to get response from AI";
      const isOfflineError =
        !isOnline ||
        /network request failed|failed to fetch|offline|internet connection|timeout|timed out/i.test(
          rawErrorMessage,
        );
      const errorMessage = isOfflineError
        ? OFFLINE_CHAT_ERROR_MESSAGE
        : rawErrorMessage;
      setError(errorMessage);

      const botErrorText = isOfflineError
        ? "I am offline at the moment. Reconnect to the internet and I will be ready to help."
        : `I apologize, but I encountered an error: ${errorMessage}. Please try again.`;

      const errorMsg: Message = {
        id: Date.now() + 1,
        role: "bot",
        text: botErrorText,
        citations: [],
        followUpSuggestions: [],
      };

      const messagesWithError = [...messagesWithUser, errorMsg];

      setMessages(messagesWithError);
      await persistConversationNow(messagesWithError);

      // Show alert for API key errors
      if (errorMessage.includes("API key")) {
        Alert.alert(
          "Configuration Required",
          "Please add Gemini keys in Supabase table public.gemini_api_keys and make sure the gemini-chat Edge Function is deployed.",
          [{ text: "OK" }],
        );
      }
    } finally {
      setIsThinking(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setInputText(suggestion);
    // Optionally auto-send
    // handleSend();
  };

  const handleFollowUpPress = (followUp: string) => {
    setInputText(followUp);
    // Auto-scroll to input
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  const handleReferencePress = useCallback(async (reference: string) => {
    const opened = await openExternalUrl(resolveReferenceUrl(reference));
    if (!opened) {
      Alert.alert(
        "Unable to Open Reference",
        "This reference could not be opened right now. Please try again.",
      );
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Header - Home Style */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="ArrowLeft2" size={24} color={CHAT_THEME.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerAvatarWrapper}>
            <Image
              source={require("@/assets/images/mascot/explain.png")}
              style={styles.headerAvatarImage}
              resizeMode="contain"
            />
            <View style={[styles.onlineDot, !isOnline && styles.offlineDot]} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Schrödi</Text>
            <Text style={styles.headerSubtitle}>
              {isOnline ? "AI Assistant - Online" : "AI Assistant - Offline"}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={requestNewConversation}
            style={styles.actionButton}
            disabled={isConversationBusy}
          >
            <Icon name="Add" size={18} color={CHAT_THEME.text} variant="Bold" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => requestDeleteConversation()}
            style={styles.actionButton}
            disabled={isConversationBusy || !activeConversationId}
          >
            <Icon
              name="Trash"
              size={18}
              color={CHAT_THEME.text}
              variant="Bold"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.conversationStrip}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.conversationScroll}
          keyboardShouldPersistTaps="handled"
        >
          {conversations.map((conversation) => {
            const isActive = conversation.id === activeConversationId;
            return (
              <TouchableOpacity
                key={conversation.id}
                style={[
                  styles.conversationChip,
                  isActive && styles.conversationChipActive,
                ]}
                onPress={() => requestSwitchConversation(conversation.id)}
                onLongPress={() => requestDeleteConversation(conversation.id)}
                activeOpacity={0.8}
                disabled={isConversationBusy}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.conversationChipText,
                    isActive && styles.conversationChipTextActive,
                  ]}
                >
                  {conversation.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Chat Body */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.chatContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, index) => (
          <Animated.View
            key={msg.id}
            entering={FadeInUp.delay(index * 100).springify()}
            style={[
              styles.messageWrapper,
              msg.role === "user"
                ? styles.userMessageWrapper
                : styles.botMessageWrapper,
            ]}
          >
            {msg.role === "bot" && (
              <View style={styles.botAvatar}>
                <Image
                  source={require("@/assets/images/mascot/explain.png")}
                  style={styles.botAvatarImage}
                  resizeMode="contain"
                />
              </View>
            )}

            <View
              style={[
                styles.bubble,
                msg.role === "user" ? styles.userBubble : styles.botBubble,
              ]}
            >
              {msg.role === "bot" ? (
                <MarkdownText
                  text={msg.text}
                  textColor={CHAT_THEME.text}
                  style={styles.messageText}
                />
              ) : (
                <Text style={[styles.messageText, styles.userMessageText]}>
                  {msg.text}
                </Text>
              )}

              {/* Citations */}
              {msg.role === "bot" &&
                msg.citations &&
                msg.citations.length > 0 && (
                  <View style={styles.citationsContainer}>
                    <Text style={styles.citationsTitle}>References:</Text>
                    {msg.citations.map((cite, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.citationBadge}
                        onPress={() => {
                          void handleReferencePress(cite);
                        }}
                        activeOpacity={0.75}
                      >
                        <Icon
                          name="Link"
                          size={10}
                          color={CHAT_THEME.primary}
                        />
                        <Text style={styles.citationText}>{cite}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

              {/* Follow-up Suggestions */}
              {msg.role === "bot" &&
                msg.followUpSuggestions &&
                msg.followUpSuggestions.length > 0 && (
                  <View style={styles.followUpContainer}>
                    <Text style={styles.followUpTitle}>
                      You might also ask:
                    </Text>
                    <View style={styles.followUpChips}>
                      {msg.followUpSuggestions.map((followUp, i) => (
                        <TouchableOpacity
                          key={i}
                          style={styles.followUpChip}
                          onPress={() => handleFollowUpPress(followUp)}
                          activeOpacity={0.7}
                        >
                          <Icon
                            name="MessageQuestion"
                            size={12}
                            color={CHAT_THEME.primary}
                          />
                          <Text style={styles.followUpText}>{followUp}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
            </View>
          </Animated.View>
        ))}

        {/* Enhanced Thinking State */}
        {isThinking && (
          <Animated.View entering={FadeInUp} style={styles.thinkingWrapper}>
            <View style={styles.botAvatar}>
              <Image
                source={require("@/assets/images/mascot/thinking.png")}
                style={styles.botAvatarImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.thinkingBubble}>
              <Text style={styles.thinkingText}>
                Analyzing your question...
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Icon name="InfoCircle" size={16} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        style={styles.inputWrapper}
      >
        {/* Suggestion Chips */}
        {suggestions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
            style={styles.suggestionsContainer}
          >
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionChip}
                onPress={() => handleSuggestionPress(s)}
                activeOpacity={0.7}
              >
                <Icon
                  name="MessageQuestion"
                  size={12}
                  color={CHAT_THEME.primary}
                />
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View
          style={[styles.inputContainer, { paddingBottom: insets.bottom + 12 }]}
        >
          <View style={styles.inputFieldWrapper}>
            <TextInput
              style={styles.inputField}
              placeholder="Ask a question about physics..."
              placeholderTextColor={CHAT_THEME.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() ||
                  isThinking ||
                  isConversationBusy ||
                  !activeConversationId) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={
                !inputText.trim() ||
                isThinking ||
                isConversationBusy ||
                !activeConversationId
              }
            >
              {inputText.trim() ? (
                <LinearGradient
                  colors={
                    [CHAT_THEME.primary, CHAT_THEME.primaryLight] as const
                  }
                  style={styles.sendButtonGradient}
                >
                  <Icon name="Send2" size={20} color="#FFF" variant="Bold" />
                </LinearGradient>
              ) : (
                <Icon name="Send2" size={20} color="#9CA3AF" variant="Bold" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (theme: typeof LightCHAT_THEME) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 16,
      zIndex: 10,
      backgroundColor: theme.bg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      padding: 8,
      marginRight: 12,
    },
    headerTitleContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerAvatarWrapper: {
      position: "relative",
    },
    headerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
    },
    onlineDot: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.green,
      borderWidth: 2,
      borderColor: theme.bg,
    },
    offlineDot: {
      backgroundColor: "#F97316",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: theme.text,
    },
    headerSubtitle: {
      fontSize: 11,
      color: theme.textMuted,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    actionButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
    },
    conversationStrip: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.bg,
      paddingVertical: 10,
    },
    conversationScroll: {
      paddingHorizontal: 20,
      gap: 8,
    },
    conversationChip: {
      maxWidth: 200,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    conversationChipActive: {
      backgroundColor: theme.primary + "20",
      borderColor: theme.primary,
    },
    conversationChipText: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
    },
    conversationChipTextActive: {
      color: theme.primary,
    },
    chatContent: {
      padding: 20,
    },
    messageWrapper: {
      marginBottom: 20,
      maxWidth: "85%",
    },
    userMessageWrapper: {
      alignSelf: "flex-end",
    },
    botMessageWrapper: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
    },
    botAvatar: {
      width: 40,
      height: 40,
      marginBottom: 4,
    },
    botAvatarImage: {
      width: "100%",
      height: "100%",
    },
    headerAvatarImage: {
      width: 40,
      height: 40,
    },
    bubble: {
      padding: 16,
      borderRadius: 20,
      borderWidth: 2,
    },
    botBubble: {
      backgroundColor: theme.botBubble,
      borderColor: theme.border,
      borderBottomLeftRadius: 4,
    },
    userBubble: {
      backgroundColor: theme.userBubble,
      borderColor: theme.userBubble,
      borderBottomRightRadius: 4,
    },
    messageText: {
      fontSize: 15,
      fontFamily: fontFamilies.regular,
      lineHeight: 22,
    },
    botMessageText: {
      color: theme.text,
    },
    userMessageText: {
      color: "#FFF",
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
    },
    citationsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    citationBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme.primary + "15",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.primary + "30",
    },
    citationsTitle: {
      fontSize: 11,
      color: theme.textMuted,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      marginBottom: 6,
    },
    citationText: {
      fontSize: 10,
      color: theme.primary,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
    },
    followUpContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    followUpTitle: {
      fontSize: 11,
      color: theme.textMuted,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      marginBottom: 8,
    },
    followUpChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    followUpChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme.primary + "10",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.primary + "30",
    },
    followUpText: {
      fontSize: 11,
      color: theme.primary,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
    },
    errorContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#FEE2E2",
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#FECACA",
      marginBottom: 16,
    },
    errorText: {
      flex: 1,
      fontSize: 12,
      color: "#DC2626",
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
    },
    thinkingWrapper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 20,
    },
    thinkingBubble: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      padding: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 8,
    },
    thinkingSpinner: {
      width: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    thinkingText: {
      fontSize: 13,
      fontFamily: fontFamilies.regular,
      color: theme.textMuted,
      fontStyle: "italic",
    },
    inputWrapper: {
      backgroundColor: theme.bg,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    suggestionsContainer: {
      paddingVertical: 12,
    },
    suggestionsScroll: {
      paddingHorizontal: 20,
      gap: 8,
    },
    suggestionChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.card,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: theme.border,
    },
    suggestionText: {
      fontSize: 13,
      color: theme.text,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
    },
    inputContainer: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    inputFieldWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      borderRadius: 28,
      paddingHorizontal: 6,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: theme.border,
    },
    inputField: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontSize: 16,
      fontFamily: fontFamilies.regular,
      color: theme.text,
      maxHeight: 100,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    sendButtonGradient: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    sendButtonDisabled: {
      backgroundColor: theme.border,
    },
  });
