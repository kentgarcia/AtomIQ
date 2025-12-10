import { Icon } from '@/components/ui/icon';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const LightTHEME = {
  bg: '#F8F9FE',
  card: '#FFFFFF',
  text: '#32325D',
  textMuted: '#8898AA',
  primary: '#5E72E4',
  border: '#E9ECEF',
};

const DarkTHEME = {
  bg: '#172B4D',
  card: '#213356',
  text: '#F6F9FC',
  textMuted: '#8898AA',
  primary: '#5E72E4',
  border: '#2D3A56',
};

const GRADIENTS = {
  Purple: ['#B8A5FE', '#9E87F5'] as const,
  Green: ['#4FD1C5', '#2DCECC'] as const,
  Orange: ['#FF9F65', '#FF6B6B'] as const,
  Yellow: ['#FFD66E', '#FFA043'] as const,
  Blue: ['#6A82FB', '#FC5C7D'] as const,
  BlueSolid: ['#5E72E4', '#825EE4'] as const,
};

export default function ChatLandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const THEME = colorScheme === 'dark' ? DarkTHEME : LightTHEME;

  const features = [
    {
      icon: 'Book1',
      title: 'Explain Concepts',
      description: 'Break down complex topics into simple terms',
      color: '#9E87F5'
    },
    {
      icon: 'SearchNormal',
      title: 'Fact Check',
      description: 'Verify myths and misconceptions instantly',
      color: '#4FD1C5'
    },
    {
      icon: 'Teacher',
      title: 'Study Partner',
      description: 'Quiz you on what you\'ve learned so far',
      color: '#FF9F65'
    }
  ];

  const suggestions = [
    "How does a nuclear reactor work?",
    "Is radiation always dangerous?",
    "What is half-life?",
    "Explain fusion vs fission"
  ];

  const styles = useMemo(() => createStyles(THEME), [THEME]);

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom, paddingTop: insets.top + 20 }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Animated.View 
            entering={FadeInDown.delay(100).springify()}
            style={styles.mascotContainer}
          >
            <Image 
              source={require('@/assets/images/mascot/explain.png')} 
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </Animated.View>
          
          <Animated.Text 
            entering={FadeInDown.delay(200).springify()}
            style={styles.heroDescription}
          >
            Hi! I'm Schrödi. I can explain complex nuclear concepts, debunk myths, and help you learn faster.
          </Animated.Text>
        </View>

        {/* Features */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View 
              key={index} 
              style={styles.featureCard}
            >
              <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
                <Icon name={feature.icon as any} size={24} color={feature.color} variant="Bold" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </Animated.View>



        {/* Start Button */}
        <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.startButton}
            activeOpacity={0.9}
            onPress={() => router.push('../ai-chat' as any)}
          >
            <LinearGradient
              colors={GRADIENTS.Purple}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.startButtonGradient}
            >
              <Icon name="Message" size={24} color="#FFF" variant="Bold" />
              <Text style={styles.startButtonText}>Start Conversation</Text>
              <Icon name="ArrowRight" size={24} color="#FFF" variant="Bold" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const createStyles = (theme: typeof LightTHEME) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    paddingBottom: 40,
  },
  // Header
  headerContainer: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    zIndex: 100,
    marginBottom: 16,
  },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  headerContent: {
    zIndex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 0,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4FD1C5',
    shadowColor: '#4FD1C5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
    marginTop: 16,
  },
  mascotContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  mascotGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#9E87F5',
    opacity: 0.2,
    transform: [{ scale: 1.2 }],
  },
  mascotImage: {
    width: 160,
    height: 160,
  },
  heroDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    opacity: 0.8,
    color: theme.text,
  },

  // Features
  featuresContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    backgroundColor: theme.card,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: theme.text,
  },
  featureDescription: {
    fontSize: 13,
    color: theme.textMuted,
    lineHeight: 18,
  },

  // Suggestions
  suggestionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Action
  actionContainer: {
    paddingHorizontal: 20,
  },
  startButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#9E87F5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
