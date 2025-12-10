import { Icon } from '@/components/ui/icon';
import { useStorage } from '@/services/StorageContext';
import { setOnboardingCompleted } from '@/services/storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Orange theme matching the app
const LightDUO_THEME = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E5E5E5',
  text: '#3C3C3C',
  textMuted: '#777777',
  primary: '#EA580C', // Orange
  primaryDark: '#C2410C',
  secondary: '#FF4B4B', // Red
  secondaryDark: '#D32F2F',
  accent: '#FB923C', // Light Orange
  accentDark: '#EA580C',
  warning: '#FFC107', // Gold
  warningDark: '#FFA000',
};

const DarkDUO_THEME = {
  bg: '#172B4D',
  card: '#213356',
  border: '#2D3A56',
  text: '#F6F9FC',
  textMuted: '#8898AA',
  primary: '#EA580C',
  primaryDark: '#C2410C',
  secondary: '#FF4B4B',
  secondaryDark: '#D32F2F',
  accent: '#FB923C',
  accentDark: '#EA580C',
  warning: '#FFC107',
  warningDark: '#FFA000',
};

// Feature Showcase Data
const FEATURE_SHOWCASE = [
  {
    id: 'mythbuster',
    title: 'MythBuster',
    subtitle: 'Swipe to Learn',
    description: 'Swipe through myths and facts in this addictive game. Build streaks, earn XP, and master nuclear science one swipe at a time.',
    icon: 'Danger',
    gradient: ['#EA580C', '#FB923C'],
    mascot: require('@/assets/images/mascot/experiment.png'),
    highlights: ['Swipe left for MYTH', 'Swipe right for TRUTH', 'Build streaks', 'Earn XP'],
  },
  {
    id: 'explorer',
    title: 'AtomIQ Explorer',
    subtitle: 'Journey Through Knowledge',
    description: 'Embark on guided learning journeys, explore the encyclopedia, and navigate quiz mazes. Your Encarta-style knowledge adventure awaits.',
    icon: 'SearchNormal',
    gradient: ['#9B59B6', '#8E44AD'],
    mascot: require('@/assets/images/mascot/explain.png'),
    highlights: ['Guided Journeys', 'Searchable Encyclopedia', 'AtomMaze Quizzes', 'Interactive Learning'],
  },
  {
    id: 'community',
    title: 'Community Feed',
    subtitle: 'Scroll to Discover',
    description: 'Endless scrollable feed of myths and facts. Learn while you scroll, bookmark favorites, and discover new insights every day.',
    icon: 'Document',
    gradient: ['#1CB0F6', '#64B5F6'],
    mascot: require('@/assets/images/mascot/happy.png'),
    highlights: ['Endless Feed', 'Bookmark Posts', 'Search & Filter', 'Daily Discoveries'],
  },
  {
    id: 'ai-chat',
    title: 'AI Assistant',
    subtitle: 'Your Learning Companion',
    description: 'Chat with your AI tutor anytime. Get instant answers, explanations, and personalized guidance on your nuclear science journey.',
    icon: 'Message',
    gradient: ['#FF4B4B', '#FF6B6B'],
    mascot: require('@/assets/images/mascot/thinking.png'),
    highlights: ['Instant Answers', 'Personalized Help', '24/7 Available', 'Smart Explanations'],
  },
];

type OnboardingStep = 'splash' | 'features' | 'profile';

export default function Onboarding() {
  const router = useRouter();
  const { updateUserProfile } = useStorage();
  const colorScheme = useColorScheme();
  const DUO_THEME = colorScheme === 'dark' ? DarkDUO_THEME : LightDUO_THEME;
  const [step, setStep] = useState<OnboardingStep>('splash');
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const [username, setUsername] = useState('');
  
  const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

  // Rotating Atom Animation
  const atomRotation = useSharedValue(0);
  const featureScale = useSharedValue(1);
  const featureOpacity = useSharedValue(1);
  const mascotScale = useSharedValue(1);

  useEffect(() => {
    atomRotation.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1
    );
    // Gentle bounce animation for mascot
    mascotScale.value = withRepeat(
      withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const atomStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${atomRotation.value}deg` }],
    };
  });

  const featureAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: featureScale.value }],
      opacity: featureOpacity.value,
    };
  });

  const mascotAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: mascotScale.value }],
    };
  });

  // Feature progress
  const progressPercent =
    ((currentFeatureIndex + 1) / FEATURE_SHOWCASE.length) * 100;

  // Button Component with 3D Effect
  const Button = ({ onPress, style, children, disabled, variant = 'primary', color = DUO_THEME.primary, darkColor = DUO_THEME.primaryDark }: any) => {
    const scale = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }],
      };
    });

    const handlePressIn = () => {
      scale.value = withSpring(0.96);
    };

    const handlePressOut = () => {
      scale.value = withSpring(1);
    };

    return (
      <AnimatedTouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.buttonWrapper, style]}
        activeOpacity={1}
        disabled={disabled}
      >
        <View style={[styles.buttonShadow, { backgroundColor: darkColor }]} />
        <View style={[styles.buttonFront, { backgroundColor: color }]}>
          {children}
        </View>
      </AnimatedTouchableOpacity>
    );
  };

  const [inputFocused, setInputFocused] = useState(false);

  const handleGetStarted = () => {
    setStep('features');
  };

  const handleNextFeature = () => {
    if (currentFeatureIndex < FEATURE_SHOWCASE.length - 1) {
      // Animate out
      featureOpacity.value = withTiming(0, { duration: 200 });
      featureScale.value = withTiming(0.9, { duration: 200 });
      
      setTimeout(() => {
        setCurrentFeatureIndex(currentFeatureIndex + 1);
        // Animate in
        featureOpacity.value = withTiming(1, { duration: 300 });
        featureScale.value = withSpring(1, { damping: 15 });
      }, 200);
    } else {
      setStep('profile');
    }
  };

  const handleSkipFeatures = () => {
    setStep('profile');
  };

  const handleProfileNext = async () => {
    if (username.trim()) {
      await handleFinish();
    }
  };

  const handleFinish = async () => {
    try {
      // Generate unique user ID for Supabase sync
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Update user profile with onboarding data
      await updateUserProfile({
        user_id: userId,
        username: username.trim() || 'Scientist',
      });
      
      // Mark onboarding as completed
      await setOnboardingCompleted(true);
      
      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Still navigate even if there's an error
      router.replace('/(tabs)');
    }
  };

  // Splash Screen
  if (step === 'splash') {
    return (
      <View style={styles.container}>
        <View style={styles.splashContent}>
          <Animated.View style={[styles.atomContainer, atomStyle]}>
            <View style={styles.atomOrbit1} />
            <View style={styles.atomOrbit2} />
            <View style={styles.atomOrbit3} />
            <View style={styles.atomCore}>
              <Icon name="Atom" size={64} color="#FFF" variant="Bold" />
            </View>
          </Animated.View>
          
          <Animated.View 
            entering={FadeInDown.delay(300).springify()}
            style={styles.titleContainer}
          >
            <Text style={styles.splashTitle}>ATOM<Text style={{color: DUO_THEME.primary}}>IQ</Text></Text>
            <Text style={styles.splashSubtitle}>Master the Atomic World</Text>
          </Animated.View>

          <Animated.View 
            entering={FadeIn.delay(800)}
            style={styles.bottomContainer}
          >
            <Button onPress={handleGetStarted} style={styles.getStartedButton}>
              <Text style={styles.buttonText}>INITIALIZE SEQUENCE</Text>
            </Button>
          </Animated.View>
        </View>
      </View>
    );
  }

  // Feature Showcase
  if (step === 'features') {
    const currentFeature = FEATURE_SHOWCASE[currentFeatureIndex];
    
    return (
      <View style={styles.container}>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%` },
            ]}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <View style={styles.badge}>
              <Icon name="Flash" size={16} color={DUO_THEME.accent} variant="Bold" />
              <Text style={styles.badgeText}>FEATURE TOUR</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.featureCard, featureAnimatedStyle]} key={currentFeatureIndex}>
            <Animated.View entering={FadeInDown.delay(200)} style={styles.featureMascotContainer}>
              <Animated.View style={[styles.featureMascotWrapper, mascotAnimatedStyle]}>
                <Image 
                  source={currentFeature.mascot}
                  style={styles.featureMascotImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300)} style={styles.featureContent}>
              <Text style={styles.featureTitle}>{currentFeature.title}</Text>
              <Text style={styles.featureSubtitle}>{currentFeature.subtitle}</Text>
              <Text style={styles.featureDescription}>{currentFeature.description}</Text>

              <View style={styles.featureHighlights}>
                {currentFeature.highlights.map((highlight, index) => (
                  <Animated.View 
                    key={index}
                    entering={FadeInDown.delay(400 + index * 100)}
                    style={styles.highlightItem}
                  >
                    <View style={[styles.highlightDot, { backgroundColor: currentFeature.gradient[0] }]} />
                    <Text style={styles.highlightText}>{highlight}</Text>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(600)} style={styles.featureActions}>
              <Button 
                onPress={handleNextFeature} 
                color={currentFeature.gradient[0]}
                darkColor={currentFeature.gradient[1]}
              >
                <Text style={styles.buttonText}>
                  {currentFeatureIndex < FEATURE_SHOWCASE.length - 1 ? 'NEXT FEATURE' : 'GET STARTED'}
                </Text>
              </Button>
              
              {currentFeatureIndex < FEATURE_SHOWCASE.length - 1 && (
                <TouchableOpacity onPress={handleSkipFeatures} style={styles.skipButton}>
                  <Text style={styles.skipButtonText}>Skip Tour</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          </Animated.View>

          {/* Feature Indicators */}
          <Animated.View entering={FadeInDown.delay(500)} style={styles.featureIndicators}>
            {FEATURE_SHOWCASE.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentFeatureIndex && styles.indicatorActive,
                  { backgroundColor: index === currentFeatureIndex ? currentFeature.gradient[0] : DUO_THEME.border }
                ]}
              />
            ))}
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // Profile
  if (step === 'profile') {
    return (
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Animated.View entering={FadeInDown.delay(200)} style={styles.centerContent}>
              <View style={styles.iconCircle}>
                <Icon name="User" size={48} color={DUO_THEME.accent} variant="Bold" />
              </View>
              <Text style={styles.titleLarge}>Identify Yourself</Text>
              <Text style={styles.subtitle}>Enter your clearance designation.</Text>
              
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, inputFocused && styles.inputFocused]}
                  placeholder="CODENAME"
                  placeholderTextColor={DUO_THEME.textMuted}
                  value={username}
                  onChangeText={setUsername}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  autoCapitalize="none"
                />
              </View>

              <Button 
                onPress={handleProfileNext} 
                disabled={!username.trim()}
                style={!username.trim() && { opacity: 0.5 }}
                color={DUO_THEME.primary}
                darkColor={DUO_THEME.primaryDark}
              >
                <Text style={styles.buttonText}>START JOURNEY</Text>
              </Button>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }


  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DUO_THEME.bg,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  // Splash
  splashContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atomContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  atomOrbit1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#E5E5E5',
    transform: [{ rotateX: '60deg' }, { rotateY: '60deg' }],
  },
  atomOrbit2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#E5E5E5',
    transform: [{ rotateX: '120deg' }, { rotateY: '120deg' }],
  },
  atomOrbit3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#E5E5E5',
  },
  atomCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DUO_THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
    shadowColor: DUO_THEME.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 64,
  },
  splashTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: DUO_THEME.text,
    letterSpacing: 2,
  },
  splashSubtitle: {
    fontSize: 16,
    color: DUO_THEME.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
    fontWeight: '700',
  },
  bottomContainer: {
    width: '100%',
    paddingHorizontal: 32,
  },
  // Buttons
  buttonWrapper: {
    height: 56,
    width: '100%',
  },
  buttonFront: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  buttonShadow: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    height: 56,
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  // Feature Showcase
  progressBarContainer: {
    height: 16,
    backgroundColor: '#E5E5E5',
    width: '100%',
    paddingTop: 0,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: DUO_THEME.primary,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: DUO_THEME.border,
    gap: 8,
  },
  badgeText: {
    color: DUO_THEME.accent,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  featureCard: {
    alignItems: 'center',
    marginBottom: 32,
  },
  featureMascotContainer: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  featureMascotWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureMascotImage: {
    width: 200,
    height: 200,
  },
  featureContent: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  featureTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: DUO_THEME.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  featureSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: DUO_THEME.textMuted,
    marginBottom: 16,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 16,
    color: DUO_THEME.text,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
    fontWeight: '500',
  },
  featureHighlights: {
    width: '100%',
    gap: 12,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  highlightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  highlightText: {
    fontSize: 15,
    fontWeight: '600',
    color: DUO_THEME.text,
    flex: 1,
  },
  featureActions: {
    width: '100%',
    marginTop: 8,
  },
  skipButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: DUO_THEME.textMuted,
  },
  featureIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicatorActive: {
    width: 24,
  },
  // Profile & Category
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 600,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 4,
    borderColor: '#E0F2FE',
  },
  titleLarge: {
    fontSize: 32,
    fontWeight: '800',
    color: DUO_THEME.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: DUO_THEME.textMuted,
    marginBottom: 48,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 32,
  },
  input: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: DUO_THEME.border,
    borderRadius: 16,
    padding: 20,
    fontSize: 18,
    color: DUO_THEME.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputFocused: {
    borderColor: DUO_THEME.accent,
    backgroundColor: '#FFFFFF',
  },
  getStartedButton: {
    // Handled by Button component style
  },
});
