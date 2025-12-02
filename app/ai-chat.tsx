import { Icon } from '@/components/ui/icon';
import { Background } from '@/components/ui/background';
import { MarkdownText } from '@/components/markdown-text';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, Dimensions, Image, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing 
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendMessageToGemini, convertMessagesToGeminiFormat } from '@/services/gemini';
import {
  createConversation, saveConversation, loadConversation, getAllConversations,
  deleteConversation, renameConversation, pinConversation,
  saveNote, getCurrentConversationId, setCurrentConversationId,
  type ChatMessage, type ChatConversation
} from '@/services/chat-history';

// Orange Theme matching the app
const CHAT_THEME = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  text: '#2D3436',
  textMuted: '#636E72',
  primary: '#EA580C',
  primaryDark: '#C2410C',
  primaryLight: '#F97316',
  userBubble: '#EA580C', // Orange for user messages
  botBubble: '#FFFFFF',
  border: '#E5E7EB',
  green: '#2ECC71',
  accent: '#1CB0F6',
};

const INITIAL_SUGGESTIONS = [
  "Is X-Ray safe?",
  "How do reactors work?",
  "Define Half-life",
  "What is Fusion?",
  "Radiation vs. Radioactivity"
];

const INITIAL_MESSAGES = [
  { 
    id: 1, 
    role: 'bot', 
    text: "Greetings, Scientist. I am Schrödi. Accessing the database...",
    citations: [],
    followUpSuggestions: []
  },
  { 
    id: 2, 
    role: 'bot', 
    text: "I am ready. Ask me anything about nuclear physics, safety protocols, or historical events. I'll provide accurate information with reliable sources.",
    citations: ['UNSCEAR', 'IAEA'],
    followUpSuggestions: INITIAL_SUGGESTIONS.slice(0, 4)
  }
];

interface Message {
  id: number;
  role: 'user' | 'bot';
  text: string;
  citations: string[];
  followUpSuggestions?: string[];
}

export default function AiChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);
  const [error, setError] = useState<string | null>(null);

  // Thinking Animation (Spinning Atom / Dot)
  const spin = useSharedValue(0);
  useEffect(() => {
    if (isThinking) {
      spin.value = withRepeat(
        withTiming(360, { duration: 1500, easing: Easing.linear }),
        -1
      );
    } else {
      spin.value = 0;
    }
  }, [isThinking]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));


  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!inputText.trim() || isThinking) return;

    const userMessage = inputText.trim();
    const userMsg: Message = { 
      id: Date.now(), 
      role: 'user', 
      text: userMessage,
      citations: [],
      followUpSuggestions: []
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);
    setError(null);

    try {
      // Convert messages to Gemini format (excluding the current user message)
      const conversationHistory = convertMessagesToGeminiFormat(
        messages.filter(m => m.id !== userMsg.id)
      );

      // Call Gemini API
      const response = await sendMessageToGemini(userMessage, conversationHistory);

      const botMsg: Message = {
        id: Date.now() + 1,
        role: 'bot',
        text: response.text,
        citations: response.citations,
        followUpSuggestions: response.followUpSuggestions
      };

      setMessages(prev => [...prev, botMsg]);
      
      // Update suggestions with follow-ups from the response
      if (response.followUpSuggestions && response.followUpSuggestions.length > 0) {
        setSuggestions(response.followUpSuggestions);
      }

    } catch (err) {
      console.error('Error calling Gemini:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response from AI';
      setError(errorMessage);
      
      const errorMsg: Message = {
        id: Date.now() + 1,
        role: 'bot',
        text: `I apologize, but I encountered an error: ${errorMessage}. Please check your internet connection and try again.`,
        citations: [],
        followUpSuggestions: []
      };
      
      setMessages(prev => [...prev, errorMsg]);
      
      // Show alert for API key errors
      if (errorMessage.includes('API key')) {
        Alert.alert(
          'Configuration Required',
          'Please add your Gemini API key to the .env file:\n\nEXPO_PUBLIC_GEMINI_API_KEY=your_api_key_here',
          [{ text: 'OK' }]
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


  return (
    <View style={styles.container}>
      {/* Enhanced Header with Gradient */}
      <LinearGradient
        colors={[CHAT_THEME.primary, CHAT_THEME.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
           <Icon name="ArrowLeft2" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerAvatarWrapper}>
            <Image 
              source={require('@/assets/images/mascot/explain.png')} 
              style={styles.headerAvatarImage}
              resizeMode="contain"
            />
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Schrödi</Text>
            <Text style={styles.headerSubtitle}>AI Assistant • Online</Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={() => {
            setMessages(INITIAL_MESSAGES);
            setSuggestions(INITIAL_SUGGESTIONS);
            setError(null);
          }} 
          style={styles.clearButton}
        >
          <Icon name="Refresh" size={20} color="#FFF" variant="Bold" />
        </TouchableOpacity>
      </LinearGradient>

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
              msg.role === 'user' ? styles.userMessageWrapper : styles.botMessageWrapper
            ]}
          >
            {msg.role === 'bot' && (
              <View style={styles.botAvatar}>
                <Image 
                  source={require('@/assets/images/mascot/explain.png')} 
                  style={styles.botAvatarImage}
                  resizeMode="contain"
                />
              </View>
            )}
            
            <View style={[
              styles.bubble,
              msg.role === 'user' ? styles.userBubble : styles.botBubble
            ]}>
              {msg.role === 'bot' ? (
                <MarkdownText 
                  text={msg.text}
                  textColor={CHAT_THEME.text}
                  style={styles.messageText}
                />
              ) : (
                <Text style={[
                  styles.messageText,
                  styles.userMessageText
                ]}>
                  {msg.text}
                </Text>
              )}
              
              {/* Citations */}
              {msg.role === 'bot' && msg.citations && msg.citations.length > 0 && (
                <View style={styles.citationsContainer}>
                  <Text style={styles.citationsTitle}>Sources:</Text>
                  {msg.citations.map((cite, i) => (
                    <View key={i} style={styles.citationBadge}>
                      <Icon name="Link" size={10} color={CHAT_THEME.primary} />
                      <Text style={styles.citationText}>{cite}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Follow-up Suggestions */}
              {msg.role === 'bot' && msg.followUpSuggestions && msg.followUpSuggestions.length > 0 && (
                <View style={styles.followUpContainer}>
                  <Text style={styles.followUpTitle}>You might also ask:</Text>
                  <View style={styles.followUpChips}>
                    {msg.followUpSuggestions.map((followUp, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.followUpChip}
                        onPress={() => handleFollowUpPress(followUp)}
                        activeOpacity={0.7}
                      >
                        <Icon name="MessageQuestion" size={12} color={CHAT_THEME.primary} />
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
                  source={require('@/assets/images/mascot/thinking.png')} 
                  style={styles.botAvatarImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.thinkingBubble}>
                <Text style={styles.thinkingText}>Analyzing your question...</Text>
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                <Icon name="MessageQuestion" size={12} color={CHAT_THEME.primary} />
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 12 }]}>
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
                (!inputText.trim() || isThinking) && styles.sendButtonDisabled
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isThinking}
            >
              {inputText.trim() ? (
                <LinearGradient
                  colors={[CHAT_THEME.primary, CHAT_THEME.primaryLight]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatarWrapper: {
    position: 'relative',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: CHAT_THEME.green,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  clearButton: {
    padding: 8,
  },
  chatContent: {
    padding: 20,
  },
  messageWrapper: {
    marginBottom: 20,
    maxWidth: '85%',
  },
  userMessageWrapper: {
    alignSelf: 'flex-end',
  },
  botMessageWrapper: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  botAvatar: {
    width: 40,
    height: 40,
    marginBottom: 4,
  },
  botAvatarImage: {
    width: '100%',
    height: '100%',
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
    backgroundColor: CHAT_THEME.botBubble,
    borderColor: CHAT_THEME.border,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: CHAT_THEME.userBubble,
    borderColor: CHAT_THEME.userBubble,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  botMessageText: {
    color: CHAT_THEME.text,
  },
  userMessageText: {
    color: '#FFF',
    fontWeight: '600',
  },
  citationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: CHAT_THEME.border,
  },
  citationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: CHAT_THEME.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CHAT_THEME.primary + '30',
  },
  citationsTitle: {
    fontSize: 11,
    color: CHAT_THEME.textMuted,
    fontWeight: '700',
    marginBottom: 6,
  },
  citationText: {
    fontSize: 10,
    color: CHAT_THEME.primary,
    fontWeight: '700',
  },
  followUpContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: CHAT_THEME.border,
  },
  followUpTitle: {
    fontSize: 11,
    color: CHAT_THEME.textMuted,
    fontWeight: '700',
    marginBottom: 8,
  },
  followUpChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  followUpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: CHAT_THEME.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CHAT_THEME.primary + '30',
  },
  followUpText: {
    fontSize: 11,
    color: CHAT_THEME.primary,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  thinkingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CHAT_THEME.border,
    gap: 8,
  },
  thinkingSpinner: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingText: {
    fontSize: 13,
    color: CHAT_THEME.textMuted,
    fontStyle: 'italic',
  },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: CHAT_THEME.border,
  },
  suggestionsContainer: {
    paddingVertical: 12,
  },
  suggestionsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CHAT_THEME.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: CHAT_THEME.border,
  },
  suggestionText: {
    fontSize: 13,
    color: CHAT_THEME.text,
    fontWeight: '700',
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  inputFieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: CHAT_THEME.border,
  },
  inputField: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: CHAT_THEME.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: CHAT_THEME.border,
  },
});

