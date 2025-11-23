import { Icon } from '@/components/ui/icon';
import { useStorage } from '@/services/StorageContext';
import { setOnboardingCompleted } from '@/services/storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Orange theme matching the app
const DUO_THEME = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E5E5E5',
  text: '#3C3C3C',
  textMuted: '#777777',
  primary: '#FF6B00', // Orange
  primaryDark: '#E65100',
  secondary: '#FF4B4B', // Red
  secondaryDark: '#D32F2F',
  accent: '#FF9E40', // Light Orange
  accentDark: '#FF6B00',
  warning: '#FFC107', // Gold
  warningDark: '#FFA000',
};

// Baseline Assessment Questions
const ASSESSMENT_QUESTIONS = [
  {
    id: 1,
    question: 'What is the primary fuel used in most nuclear power plants?',
    options: ['Coal', 'Uranium', 'Natural Gas', 'Solar Energy'],
    correctAnswer: 1,
    explanation: 'Uranium-235 is the primary fuel used in nuclear reactors. When its atoms split (fission), they release enormous amounts of energy in the form of heat.',
  },
  {
    id: 2,
    question: 'How much of the world\'s electricity comes from nuclear power?',
    options: ['Less than 5%', 'About 10%', 'About 25%', 'More than 50%'],
    correctAnswer: 1,
    explanation: 'Nuclear power provides about 10% of the world\'s electricity. Countries like France get over 70% of their electricity from nuclear power.',
  },
  {
    id: 3,
    question: 'Nuclear power plants produce what type of emissions during operation?',
    options: ['High carbon emissions', 'Low carbon emissions', 'Zero carbon emissions', 'Only water vapor'],
    correctAnswer: 2,
    explanation: 'Nuclear power plants produce zero carbon emissions during operation! The only "emission" is water vapor from the cooling towers.',
  },
];

// User Categories
const USER_CATEGORIES = [
  { id: 'student', label: 'Student', icon: 'Book', description: 'Learning nuclear science in school', color: '#CE82FF' },
  { id: 'general', label: 'General Learner', icon: 'Lamp', description: 'Curious about nuclear energy', color: '#FF9600' },
  { id: 'professional', label: 'Professional', icon: 'Profile', description: 'Working in related fields', color: '#1CB0F6' },
  { id: 'enthusiast', label: 'Enthusiast', icon: 'Flash', description: 'Passionate about nuclear science', color: '#FF4B4B' },
];

type OnboardingStep = 'splash' | 'assessment' | 'profile' | 'category';

export default function Onboarding() {
  const router = useRouter();
  const { updateUserProfile } = useStorage();
  const [step, setStep] = useState<OnboardingStep>('splash');
  const [assessmentAnswers, setAssessmentAnswers] = useState<number[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [username, setUsername] = useState('');
  
  const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

  // Rotating Atom Animation
  const atomRotation = useSharedValue(0);

  useEffect(() => {
    atomRotation.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1
    );
  }, []);

  const atomStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${atomRotation.value}deg` }],
    };
  });

  // Assessment progress
  const progressPercent =
    ((currentQuestionIndex + 1) / ASSESSMENT_QUESTIONS.length) * 100;

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

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleGetStarted = () => {
    setStep('assessment');
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showFeedback) return;
    
    setSelectedAnswer(answerIndex);
    const newAnswers = [...assessmentAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setAssessmentAnswers(newAnswers);
    setShowFeedback(true);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < ASSESSMENT_QUESTIONS.length - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setShowFeedback(false);
        setSelectedAnswer(null);
        setIsTransitioning(false);
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 300);
    } else {
      setStep('profile');
    }
  };

  const handleProfileNext = () => {
    if (username.trim()) {
      setStep('category');
    }
  };

  const handleCategorySelect = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    setTimeout(async () => {
      await handleFinish();
    }, 500);
  };

  const handleFinish = async () => {
    try {
      // Update user profile with onboarding data
      await updateUserProfile({
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

  // Assessment
  if (step === 'assessment') {
    const currentQuestion = ASSESSMENT_QUESTIONS[currentQuestionIndex];
    const isCorrect =
      selectedAnswer !== null &&
      selectedAnswer === currentQuestion.correctAnswer;
    const correctAnswerIndex = currentQuestion.correctAnswer;

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
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <View style={styles.badge}>
              <Icon name="Verify" size={16} color={DUO_THEME.accent} variant="Bold" />
              <Text style={styles.badgeText}>GEIGER CHECK</Text>
            </View>
          </Animated.View>

          {!isTransitioning && (
            <Animated.View 
              entering={FadeIn.duration(400)}
              exiting={SlideOutLeft.duration(200)}
              key={currentQuestionIndex}
            >
              <View style={styles.questionCard}>
                <Text style={styles.questionText}>{currentQuestion.question}</Text>
              </View>

              <View style={styles.optionsContainer}>
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrectAnswer = index === correctAnswerIndex;

                  let btnColor = '#FFFFFF'; // Default white bg
                  let btnBorder = DUO_THEME.border;
                  let textColor = DUO_THEME.text;
                  let shadowColor = DUO_THEME.border; // darker grey for shadow

                  if (showFeedback) {
                    if (isCorrectAnswer) {
                      btnColor = DUO_THEME.primary; // Green
                      btnBorder = DUO_THEME.primaryDark;
                      shadowColor = DUO_THEME.primaryDark;
                      textColor = '#FFF';
                    } else if (isSelected && !isCorrectAnswer) {
                      btnColor = DUO_THEME.secondary; // Red
                      btnBorder = DUO_THEME.secondaryDark;
                      shadowColor = DUO_THEME.secondaryDark;
                      textColor = '#FFF';
                    }
                  } else if (isSelected) {
                    btnColor = '#E5F4FF'; // Light blue
                    btnBorder = DUO_THEME.accent;
                    shadowColor = DUO_THEME.accentDark;
                    textColor = DUO_THEME.accent;
                  }

                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.9}
                      onPress={() => handleAnswerSelect(index)}
                      disabled={showFeedback}
                      style={styles.optionWrapper}
                    >
                      <View style={[styles.optionShadow, { backgroundColor: shadowColor }]} />
                      <View style={[styles.optionFront, { backgroundColor: btnColor, borderColor: btnBorder }]}>
                        <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {showFeedback && (
                <Animated.View entering={FadeInDown.springify()} style={styles.feedbackContainer}>
                  <View style={[styles.feedbackCard, isCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
                    <Text style={[styles.feedbackTitle, { color: isCorrect ? DUO_THEME.primaryDark : DUO_THEME.secondaryDark }]}>
                      {isCorrect ? 'Excellent! ⚛️' : 'Correction Needed 🔭'}
                    </Text>
                    <Text style={styles.feedbackText}>{currentQuestion.explanation}</Text>
                  </View>
                  
                  <Button 
                    onPress={handleNextQuestion} 
                    color={isCorrect ? DUO_THEME.primary : DUO_THEME.secondary}
                    darkColor={isCorrect ? DUO_THEME.primaryDark : DUO_THEME.secondaryDark}
                  >
                    <Text style={styles.buttonText}>
                      {currentQuestionIndex < ASSESSMENT_QUESTIONS.length - 1 ? 'NEXT PHASE' : 'COMPLETE'}
                    </Text>
                  </Button>
                </Animated.View>
              )}
            </Animated.View>
          )}
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
                color={DUO_THEME.accent}
                darkColor={DUO_THEME.accentDark}
              >
                <Text style={styles.buttonText}>ACCESS TERMINAL</Text>
              </Button>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Category
  if (step === 'category') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInDown.delay(200)}>
            <Text style={styles.titleLarge}>Specialization</Text>
            <Text style={[styles.subtitle, { marginBottom: 32 }]}>Select your operating role.</Text>

            <View style={styles.grid}>
              {USER_CATEGORIES.map((category, index) => {
                const isSelected = selectedCategory === category.id;
                return (
                  <Animated.View 
                    key={category.id} 
                    entering={FadeInDown.delay(300 + index * 100)}
                    style={{ width: '100%', marginBottom: 16 }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => handleCategorySelect(category.id)}
                      style={styles.optionWrapper}
                    >
                      <View style={[styles.optionShadow, { backgroundColor: isSelected ? DUO_THEME.primaryDark : DUO_THEME.border }]} />
                      <View style={[
                        styles.categoryCard, 
                        { 
                          backgroundColor: isSelected ? '#E5F4FF' : '#FFFFFF',
                          borderColor: isSelected ? DUO_THEME.accent : DUO_THEME.border 
                        }
                      ]}>
                        <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                          <Icon 
                            name={category.icon as any} 
                            size={24} 
                            color={category.color} 
                            variant="Bold"
                          />
                        </View>
                        <View style={styles.categoryContent}>
                          <Text style={styles.categoryTitle}>{category.label}</Text>
                          <Text style={styles.categoryDesc}>{category.description}</Text>
                        </View>
                        {isSelected && (
                          <Icon name="TickCircle" size={24} color={DUO_THEME.primary} variant="Bold" />
                        )}
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>
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
  // Assessment
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
  questionCard: {
    marginBottom: 32,
  },
  questionText: {
    color: DUO_THEME.text,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 34,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 16,
  },
  optionWrapper: {
    height: 64,
    width: '100%',
  },
  optionFront: {
    height: 64,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: DUO_THEME.border,
    backgroundColor: '#FFFFFF',
  },
  optionShadow: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    height: 64,
    borderRadius: 16,
    backgroundColor: DUO_THEME.border,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: DUO_THEME.text,
  },
  feedbackContainer: {
    marginTop: 32,
  },
  feedbackCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: DUO_THEME.border,
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
  },
  feedbackCorrect: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  feedbackWrong: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  feedbackText: {
    color: DUO_THEME.textMuted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
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
  grid: {
    width: '100%',
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    height: 80,
    width: '100%',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DUO_THEME.text,
    marginBottom: 2,
  },
  categoryDesc: {
    fontSize: 12,
    color: DUO_THEME.textMuted,
    fontWeight: '500',
  },
  getStartedButton: {
    // Handled by Button component style
  },
});
