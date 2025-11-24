import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, SafeAreaView, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  FadeInDown,
  FadeOutUp
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Icon } from '@/components/ui/icon';
import { LinearGradient } from 'expo-linear-gradient';
import { useStorage } from '@/services/StorageContext';
import { logDailyActivity } from '@/services/database';
import { getAllMyths } from '@/content/myths';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.3;

// Theme
const THEME = {
  bg: '#F7F7F7',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#9CA3AF',
  primary: '#FF6B00',
  primaryDark: '#E65100',
  primaryLight: '#FF9E40',
  success: '#2ECC71',
  error: '#E74C3C',
  gold: '#FFC107',
  border: '#E5E7EB',
};

type GameState = 'mode-select' | 'intro' | 'playing' | 'results';
type GameMode = 'quick' | 'challenge' | 'endless';

interface ModeConfig {
  id: GameMode;
  title: string;
  description: string;
  icon: string;
  color: string;
  rounds: number;
  timeLimit?: number;
  xpMultiplier: number;
}

const GAME_MODES: ModeConfig[] = [
  {
    id: 'quick',
    title: 'Quick Play',
    description: '5 myths, casual pace',
    icon: 'Flash',
    color: '#FF6B00',
    rounds: 5,
    xpMultiplier: 1,
  },
  {
    id: 'challenge',
    title: 'Challenge Mode',
    description: '10 myths, timed rounds',
    icon: 'Timer',
    color: '#E74C3C',
    rounds: 10,
    timeLimit: 10,
    xpMultiplier: 1.5,
  },
  {
    id: 'endless',
    title: 'Endless Mode',
    description: 'Keep going until you fail',
    icon: 'Infinite',
    color: '#9B59B6',
    rounds: 999,
    xpMultiplier: 2,
  },
];

export default function MythBusterScreen() {
  const router = useRouter();
  const { addXP } = useStorage();
  
  const [gameState, setGameState] = useState<GameState>('mode-select');
  const [selectedMode, setSelectedMode] = useState<ModeConfig>(GAME_MODES[0]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [myths, setMyths] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [lives, setLives] = useState(3); // For endless mode

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  const currentMyth = myths[currentIndex];

  const startMode = (mode: ModeConfig) => {
    setSelectedMode(mode);
    const allMyths = getAllMyths();
    
    // Transform myths into game statements (mix of myths and truths)
    const gameStatements = allMyths.flatMap(myth => [
      // The myth statement (false)
      {
        id: `${myth.id}-myth`,
        statement: myth.mythStatement,
        isTrue: false,
        category: myth.category,
        difficulty: myth.difficulty,
        explanation: myth.reality,
      },
      // The reality statement (true)
      {
        id: `${myth.id}-truth`,
        statement: myth.reality,
        isTrue: true,
        category: myth.category,
        difficulty: myth.difficulty,
        explanation: myth.explanation,
      }
    ]);
    
    // Shuffle and select
    const shuffled = gameStatements.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(mode.rounds, shuffled.length));
    
    setMyths(selected);
    setGameState('intro');
    if (mode.timeLimit) {
      setTimeLeft(mode.timeLimit);
    }
  };

  const handleSwipe = (direction: 'truth' | 'myth') => {
    if (!currentMyth) return;
    
    const isCorrect = 
      (direction === 'myth' && !currentMyth.isTrue) || 
      (direction === 'truth' && currentMyth.isTrue);

    const baseXP = 10;
    const streakBonus = streak * 2;
    const modeMultiplier = selectedMode.xpMultiplier;
    const earnedXP = Math.round((baseXP + streakBonus) * modeMultiplier);

    if (isCorrect) {
      setScore(s => s + earnedXP);
      setStreak(s => s + 1);
    } else {
      setStreak(0);
      // Endless mode: lose a life
      if (selectedMode.id === 'endless') {
        const newLives = lives - 1;
        setLives(newLives);
        if (newLives <= 0) {
          setTimeout(() => {
            finishGame();
          }, 300);
          return;
        }
      }
    }

    setAnswers(prev => [...prev, isCorrect]);

    // Move to next card or finish
    if (currentIndex < myths.length - 1) {
      setTimeout(() => {
        setCurrentIndex(i => i + 1);
        translateX.value = 0;
        translateY.value = 0;
        rotate.value = 0;
        opacity.value = 1;
        // Reset timer for challenge mode
        if (selectedMode.timeLimit) {
          setTimeLeft(selectedMode.timeLimit);
        }
      }, 300);
    } else {
      setTimeout(() => {
        finishGame();
      }, 300);
    }
  };

  const finishGame = () => {
    setGameState('results');
    const xpEarned = score;
    addXP(xpEarned);
    logDailyActivity(new Date().toISOString().split('T')[0], { 
      xp_earned: xpEarned, 
      myths_busted: answers.filter(a => a).length 
    });
  };

  const resetGame = () => {
    setGameState('mode-select');
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setAnswers([]);
    setMyths([]);
    setTimeLeft(null);
    setLives(3);
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotate.value = interpolate(
        event.translationX,
        [-width / 2, 0, width / 2],
        [-15, 0, 15]
      );
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? 'truth' : 'myth';
        
        // Animate out
        translateX.value = withSpring(event.translationX > 0 ? width : -width, {
          velocity: event.velocityX,
        });
        opacity.value = withTiming(0, { duration: 200 });
        
        runOnJS(handleSwipe)(direction);
      } else {
        // Spring back
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const mythLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0]
    ),
  }));

  const truthLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1]
    ),
  }));

  if (gameState === 'mode-select') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: '#FFF' }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modeHeader}>
              <TouchableOpacity onPress={() => router.back()}>
                <Icon name="ArrowLeft2" size={24} color={THEME.text} />
              </TouchableOpacity>
              <Text style={styles.modeHeaderTitle}>Choose Mode</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView 
              style={styles.modeScrollView}
              contentContainerStyle={styles.modeContainer}
              showsVerticalScrollIndicator={false}
            >
              <Animated.Text 
                entering={FadeInDown.delay(100).springify()}
                style={styles.modeTitle}
              >
                Select Your Challenge
              </Animated.Text>
              <Animated.Text 
                entering={FadeInDown.delay(200).springify()}
                style={styles.modeSubtitle}
              >
                Pick a game mode that fits your style
              </Animated.Text>

              <View style={styles.modesGrid}>
                {GAME_MODES.map((mode, index) => (
                  <Animated.View
                    key={mode.id}
                    entering={FadeInDown.delay(300 + index * 100).springify()}
                  >
                    <TouchableOpacity
                      style={styles.modeCard}
                      activeOpacity={0.8}
                      onPress={() => startMode(mode)}
                    >
                      <LinearGradient
                        colors={[mode.color, mode.color + 'CC']}
                        style={styles.modeCardGradient}
                      >
                        <View style={styles.modeIconCircle}>
                          <Icon name={mode.icon as any} size={32} color="#FFF" variant="Bold" />
                        </View>
                        <Text style={styles.modeCardTitle}>{mode.title}</Text>
                        <Text style={styles.modeCardDesc}>{mode.description}</Text>
                        
                        <View style={styles.modeStats}>
                          <View style={styles.modeStatItem}>
                            <Icon name="Layer" size={14} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.modeStatText}>
                              {mode.rounds === 999 ? '∞' : mode.rounds} rounds
                            </Text>
                          </View>
                          <View style={styles.modeStatItem}>
                            <Icon name="Flash" size={14} color="#FFD700" variant="Bold" />
                            <Text style={styles.modeStatText}>
                              {mode.xpMultiplier}x XP
                            </Text>
                          </View>
                        </View>

                        <View style={styles.modePlayButton}>
                          <Text style={styles.modePlayText}>PLAY</Text>
                          <Icon name="ArrowRight2" size={16} color={mode.color} />
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        </View>
      </GestureHandlerRootView>
    );
  }

  if (gameState === 'intro') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LinearGradient
          colors={[selectedMode.color, selectedMode.color + 'CC']}
          style={styles.fullScreen}
        >
          <SafeAreaView style={styles.fullScreen}>
            <TouchableOpacity 
              onPress={() => setGameState('mode-select')} 
              style={styles.closeBtn}
            >
              <Icon name="ArrowLeft2" size={24} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.introContainer}>
              <Animated.View 
                entering={FadeInDown.delay(100).springify()}
                style={styles.introIcon}
              >
                <Icon name="Danger" size={80} color="#FFF" variant="Bold" />
              </Animated.View>

              <Animated.Text 
                entering={FadeInDown.delay(200).springify()}
                style={styles.introTitle}
              >
                MythBuster Mode
              </Animated.Text>

              <Animated.Text 
                entering={FadeInDown.delay(300).springify()}
                style={styles.introSubtitle}
              >
                Swipe to separate facts from fiction!
              </Animated.Text>

              <Animated.View 
                entering={FadeInDown.delay(400).springify()}
                style={styles.instructionsCard}
              >
                <View style={styles.instructionRow}>
                  <View style={[styles.swipeDemo, { backgroundColor: THEME.error }]}>
                    <Icon name="ArrowLeft" size={24} color="#FFF" variant="Bold" />
                  </View>
                  <Text style={styles.instructionText}>Swipe left for MYTH</Text>
                </View>

                <View style={styles.instructionRow}>
                  <View style={[styles.swipeDemo, { backgroundColor: THEME.success }]}>
                    <Icon name="ArrowRight" size={24} color="#FFF" variant="Bold" />
                  </View>
                  <Text style={styles.instructionText}>Swipe right for TRUTH</Text>
                </View>

                <View style={styles.bonusInfo}>
                  <Icon name="Flash" size={16} color={THEME.gold} variant="Bold" />
                  <Text style={styles.bonusText}>
                    Build streaks for bonus XP!
                  </Text>
                </View>
              </Animated.View>

              <Animated.View 
                entering={FadeInDown.delay(500).springify()}
                style={{ width: '100%' }}
              >
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={() => setGameState('playing')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.startButtonText}>START GAME</Text>
                  <Icon name="Play" size={20} color={THEME.primary} variant="Bold" />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </GestureHandlerRootView>
    );
  }

  if (gameState === 'results') {
    const correctAnswers = answers.filter(a => a).length;
    const accuracy = Math.round((correctAnswers / myths.length) * 100);
    const maxStreak = Math.max(...answers.reduce((acc, curr, idx) => {
      if (curr) {
        acc[acc.length - 1] = (acc[acc.length - 1] || 0) + 1;
      } else {
        acc.push(0);
      }
      return acc;
    }, [0]));

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LinearGradient
          colors={[THEME.success, '#27AE60']}
          style={styles.fullScreen}
        >
          <SafeAreaView style={styles.fullScreen}>
            <ScrollView 
              style={{ flex: 1 }}
              contentContainerStyle={styles.resultsContainer}
              showsVerticalScrollIndicator={false}
            >
              <Animated.Text 
                entering={FadeInDown.delay(100).springify()}
                style={styles.resultsTitle}
              >
                Mission Complete!
              </Animated.Text>

              <Animated.View 
                entering={FadeInDown.delay(200).springify()}
                style={styles.scoreCard}
              >
                <Animated.View 
                  entering={FadeInDown.delay(300).springify()}
                  style={styles.mascotInCard}
                >
                  <Image 
                    source={require('@/assets/images/mascot/happy.png')} 
                    style={styles.resultsMascot}
                    resizeMode="contain"
                  />
                </Animated.View>
                
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Score</Text>
                  <Text style={styles.scoreValue}>{score} XP</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Icon name="TickCircle" size={24} color={THEME.success} variant="Bold" />
                    <Text style={styles.statValue}>{correctAnswers}/{myths.length}</Text>
                    <Text style={styles.statLabel}>Correct</Text>
                  </View>

                  <View style={styles.statBox}>
                    <Icon name="Percentage" size={24} color={THEME.primary} variant="Bold" />
                    <Text style={styles.statValue}>{accuracy}%</Text>
                    <Text style={styles.statLabel}>Accuracy</Text>
                  </View>

                  <View style={styles.statBox}>
                    <Icon name="Flash" size={24} color={THEME.gold} variant="Bold" />
                    <Text style={styles.statValue}>{maxStreak}</Text>
                    <Text style={styles.statLabel}>Best Streak</Text>
                  </View>
                </View>
              </Animated.View>

              {/* Review Section */}
              <Animated.View 
                entering={FadeInDown.delay(400).springify()}
                style={styles.reviewSection}
              >
                <Text style={styles.reviewTitle}>Review Your Answers</Text>
                <Text style={styles.reviewSubtitle}>See how you did on each statement</Text>
                
                {myths.map((myth, index) => {
                  const isCorrect = answers[index];
                  return (
                    <View key={index} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <View style={[
                          styles.reviewNumber,
                          { backgroundColor: isCorrect ? THEME.success : THEME.error }
                        ]}>
                          <Text style={styles.reviewNumberText}>{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.reviewBadgeRow}>
                            <View style={[
                              styles.reviewBadge,
                              { backgroundColor: myth.isTrue ? THEME.success + '20' : THEME.error + '20' }
                            ]}>
                              <Text style={[
                                styles.reviewBadgeText,
                                { color: myth.isTrue ? THEME.success : THEME.error }
                              ]}>
                                {myth.isTrue ? 'TRUE' : 'MYTH'}
                              </Text>
                            </View>
                            {isCorrect ? (
                              <Image 
                                source={require('@/assets/images/mascot/happy.png')} 
                                style={styles.reviewMascot}
                                resizeMode="contain"
                              />
                            ) : (
                              <Image 
                                source={require('@/assets/images/mascot/fix.png')} 
                                style={styles.reviewMascot}
                                resizeMode="contain"
                              />
                            )}
                          </View>
                        </View>
                      </View>
                      
                      <Text style={styles.reviewStatement}>{myth.statement}</Text>
                      
                      {!isCorrect && (
                        <View style={styles.reviewExplanation}>
                          <Icon name="InfoCircle" size={16} color={THEME.textMuted} />
                          <Text style={styles.reviewExplanationText}>
                            {myth.explanation}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </Animated.View>

              <Animated.View 
                entering={FadeInDown.delay(500).springify()}
                style={styles.resultsActions}
              >
                <TouchableOpacity
                  style={styles.playAgainButton}
                  onPress={resetGame}
                  activeOpacity={0.8}
                >
                  <Icon name="Refresh" size={20} color={THEME.primary} variant="Bold" />
                  <Text style={styles.playAgainText}>PLAY AGAIN</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.homeButton}
                  onPress={() => router.back()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.homeButtonText}>BACK TO HOME</Text>
                </TouchableOpacity>
              </Animated.View>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </GestureHandlerRootView>
    );
  }

  // Playing state
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: selectedMode.color + '10' }}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.gameHeader}>
            <TouchableOpacity onPress={() => router.back()}>
              <Icon name="Close" size={24} color={THEME.textMuted} />
            </TouchableOpacity>

            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {currentIndex + 1} / {myths.length}
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${((currentIndex + 1) / myths.length) * 100}%`,
                      backgroundColor: selectedMode.color
                    }
                  ]} 
                />
              </View>
            </View>

            <View style={styles.scoreContainer}>
              <Icon name="Flash" size={16} color={THEME.gold} variant="Bold" />
              <Text style={styles.scoreText}>{score}</Text>
            </View>
          </View>

          {/* Streak Indicator */}
          {streak > 1 && (
            <Animated.View 
              entering={FadeInDown.springify()}
              style={[styles.streakBanner, { backgroundColor: selectedMode.color + '20' }]}
            >
              <Icon name="Fire" size={20} color={selectedMode.color} variant="Bold" />
              <Text style={[styles.streakText, { color: selectedMode.color }]}>{streak}x STREAK!</Text>
              <Text style={styles.streakBonus}>+{streak * 2} XP Bonus</Text>
            </Animated.View>
          )}

          {/* Card Stack */}
          <View style={styles.cardContainer}>
            {/* Swipe Labels */}
            <Animated.View style={[styles.swipeLabel, styles.mythLabel, mythLabelStyle]}>
              <Icon name="CloseCircle" size={48} color={THEME.error} variant="Bold" />
              <Text style={[styles.swipeLabelText, { color: THEME.error }]}>MYTH</Text>
            </Animated.View>

            <Animated.View style={[styles.swipeLabel, styles.truthLabel, truthLabelStyle]}>
              <Icon name="TickCircle" size={48} color={THEME.success} variant="Bold" />
              <Text style={[styles.swipeLabelText, { color: THEME.success }]}>TRUTH</Text>
            </Animated.View>

            {/* Next card preview (if exists) */}
            {currentIndex < myths.length - 1 && (
              <View style={[styles.card, styles.cardBehind]}>
                <View style={styles.cardContent}>
                  <Text style={styles.cardStatement}>Next statement...</Text>
                </View>
              </View>
            )}

            {/* Current card */}
            {currentMyth && (
              <GestureDetector gesture={gesture}>
                <Animated.View style={[styles.card, animatedStyle]}>
                  <LinearGradient
                    colors={['#FFFFFF', '#F9FAFB']}
                    style={styles.cardGradient}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.difficultyBadge}>
                        <Text style={styles.difficultyText}>
                          {currentMyth.difficulty.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardContent}>
                      <Text style={styles.cardStatement}>{currentMyth.statement}</Text>
                    </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.swipeHint}>
                      <Icon name="ArrowLeft" size={16} color={THEME.textMuted} />
                      <Text style={styles.hintText}>Swipe to answer</Text>
                      <Icon name="ArrowRight" size={16} color={THEME.textMuted} />
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>
            </GestureDetector>
            )}
          </View>

          {/* Action Buttons */}
          {currentMyth && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.mythButton]}
                onPress={() => {
                  translateX.value = withSpring(-width);
                  opacity.value = withTiming(0, { duration: 200 });
                  handleSwipe('myth');
                }}
                activeOpacity={0.8}
              >
                <Icon name="CloseCircle" size={32} color="#FFF" variant="Bold" />
                <Text style={styles.actionButtonText}>MYTH</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.truthButton]}
                onPress={() => {
                  translateX.value = withSpring(width);
                  opacity.value = withTiming(0, { duration: 200 });
                  handleSwipe('truth');
                }}
                activeOpacity={0.8}
              >
                <Icon name="TickCircle" size={32} color="#FFF" variant="Bold" />
                <Text style={styles.actionButtonText}>TRUTH</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Intro Screen
  introContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  introIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  introSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 40,
    textAlign: 'center',
  },
  instructionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    marginBottom: 32,
    gap: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  swipeDemo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    flex: 1,
  },
  bonusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.gold + '20',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  bonusText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    flex: 1,
  },
  startButton: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.primary,
  },

  // Game Screen
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 16,
  },
  progressContainer: {
    flex: 1,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textMuted,
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.gold + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.text,
  },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.primary,
  },
  streakBonus: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  card: {
    width: width - 40,
    height: height * 0.55,
    position: 'absolute',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 6,
  },
  cardBehind: {
    transform: [{ scale: 0.95 }],
    opacity: 0.5,
  },
  cardGradient: {
    flex: 1,
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 24,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
  },
  difficultyBadge: {
    backgroundColor: THEME.textMuted + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.textMuted,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cardStatement: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.text,
    lineHeight: 34,
    textAlign: 'center',
  },
  cardFooter: {
    alignItems: 'center',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hintText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  swipeLabel: {
    position: 'absolute',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  mythLabel: {
    left: 40,
    top: height * 0.25,
  },
  truthLabel: {
    right: 40,
    top: height * 0.25,
  },
  swipeLabelText: {
    fontSize: 24,
    fontWeight: '900',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  mythButton: {
    backgroundColor: THEME.error,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  truthButton: {
    backgroundColor: THEME.success,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },

  // Results Screen
  resultsContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  resultsIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  resultsMascot: {
    width: 150,
    height: 150,
  },
  reviewMascot: {
    width: 24,
    height: 24,
  },
  resultsTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 32,
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
    alignItems: 'center',
  },
  mascotInCard: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '900',
    color: THEME.primary,
  },
  divider: {
    height: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.bg,
    padding: 16,
    borderRadius: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  resultsActions: {
    width: '100%',
    gap: 12,
  },
  playAgainButton: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
  },
  playAgainText: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.primary,
  },
  homeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },

  // Mode Selection Screen
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  modeHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
  },
  modeScrollView: {
    flex: 1,
  },
  modeContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modeTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.text,
    marginBottom: 8,
  },
  modeSubtitle: {
    fontSize: 16,
    color: THEME.textMuted,
    marginBottom: 32,
  },
  modesGrid: {
    gap: 16,
  },
  modeCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
  },
  modeCardGradient: {
    padding: 24,
    gap: 12,
  },
  modeIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modeCardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
  },
  modeCardDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  modeStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  modeStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  modePlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderRadius: 16,
  },
  modePlayText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.text,
  },

  // Review Section
  reviewSection: {
    width: '100%',
    marginTop: 32,
    gap: 16,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
  },
  reviewSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 8,
  },
  reviewCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  reviewNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  reviewBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reviewBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  reviewStatement: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
    lineHeight: 22,
  },
  reviewExplanation: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: THEME.bg,
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  reviewExplanationText: {
    flex: 1,
    fontSize: 13,
    color: THEME.textMuted,
    lineHeight: 18,
  },
});

