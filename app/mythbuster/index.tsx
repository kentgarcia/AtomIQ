import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, SafeAreaView, ScrollView, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  runOnJS,
  interpolate,
  FadeInDown,
  FadeInUp,
  FadeOutUp,
  ZoomIn,
  BounceIn,
  SlideInRight,
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
  primary: '#EA580C',
  primaryDark: '#C2410C',
  primaryLight: '#FB923C',
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
  colorSecondary: string;
  rounds: number;
  timeLimit?: number;
  xpMultiplier: number;
  difficulty: number; // 1-3 stars
  tagline: string;
  mascotMood: 'happy' | 'excited' | 'determined';
}

const GAME_MODES: ModeConfig[] = [
  {
    id: 'quick',
    title: 'Quick Play',
    description: '5 myths at your own pace',
    icon: 'Flash',
    color: '#FF9500',
    colorSecondary: '#FFB84D',
    rounds: 5,
    xpMultiplier: 1,
    difficulty: 1,
    tagline: 'Perfect for beginners!',
    mascotMood: 'happy',
  },
  {
    id: 'challenge',
    title: 'Challenge',
    description: '10 myths with time pressure',
    icon: 'Timer',
    color: '#FF3B5C',
    colorSecondary: '#FF6B88',
    rounds: 10,
    timeLimit: 10,
    xpMultiplier: 1.5,
    difficulty: 2,
    tagline: 'Race against the clock!',
    mascotMood: 'excited',
  },
  {
    id: 'endless',
    title: 'Endless',
    description: 'Survive as long as you can',
    icon: 'Unlimited',
    color: '#8B5CF6',
    colorSecondary: '#A78BFA',
    rounds: 999,
    xpMultiplier: 2,
    difficulty: 3,
    tagline: 'For true MythBusters!',
    mascotMood: 'determined',
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
  const [reviewTab, setReviewTab] = useState<'all' | 'wrong'>('all');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

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
    setReviewTab('all');
    setExpandedCard(null);
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
        <LinearGradient
          colors={['#FFF5EB', '#FFE4CC', '#FFDAB3']}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={{ flex: 1 }}>
            {/* Floating Decorations */}
            <View style={styles.decorationsContainer}>
              {[...Array(8)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.floatingDecor,
                    {
                      left: `${10 + (i * 12) % 80}%`,
                      top: `${5 + (i * 7) % 15}%`,
                      transform: [{ rotate: `${i * 45}deg` }],
                    },
                  ]}
                >
                  <View style={[styles.triangle, { borderBottomColor: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA'][i] }]} />
                </View>
              ))}
            </View>

            {/* Banner/Bunting */}
            <View style={styles.buntingContainer}>
              {['#FF6B6B', '#FFE66D', '#4ECDC4', '#FF6B6B', '#FFE66D', '#4ECDC4', '#FF6B6B'].map((color, i) => (
                <View key={i} style={[styles.buntingFlag, { backgroundColor: color, transform: [{ rotate: `${i % 2 === 0 ? -10 : 10}deg` }] }]} />
              ))}
            </View>

            {/* Header */}
            <View style={styles.modeHeader}>
              <TouchableOpacity 
                onPress={() => router.back()}
                style={styles.backButtonCircle}
              >
                <Icon name="ArrowLeft2" size={20} color={THEME.text} />
              </TouchableOpacity>
              <View style={styles.headerBadge}>
                <Icon name="Danger" size={18} color="#FFF" variant="Bold" />
                <Text style={styles.headerBadgeText}>MythBuster</Text>
              </View>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView 
              style={styles.modeScrollView}
              contentContainerStyle={styles.modeContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Mode Cards */}
              <View style={styles.modesGridNew}>
                {GAME_MODES.map((mode, index) => (
                  <Pressable
                    key={mode.id}
                      onPress={() => startMode(mode)}
                      style={({ pressed }) => [
                        styles.modeCardNew,
                        pressed && styles.modeCardPressed,
                      ]}
                    >
                      {/* 3D Card Bottom Layer (Shadow/Depth) */}
                      <View style={[styles.card3DBottom, { backgroundColor: mode.color + 'AA' }]} />
                      
                      {/* 3D Card Middle Layer */}
                      <View style={[styles.card3DMiddle, { backgroundColor: mode.color }]} />
                      
                      {/* Card Background Gradient - Top Layer */}
                      <LinearGradient
                        colors={[mode.colorSecondary, mode.color]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0.3, y: 1 }}
                        style={styles.modeCardGradientNew}
                      >
                        {/* Shine Effect */}
                        <View style={styles.cardShine} />
                        
                        {/* Decorative Circles */}
                        <View style={[styles.cardCircle, styles.cardCircle1]} />
                        <View style={[styles.cardCircle, styles.cardCircle2]} />
                        
                        {/* Icon Badge */}
                        <View style={styles.modeIconBadge}>
                          <View style={styles.modeIconInner}>
                            <Icon name={mode.icon as any} size={28} color={mode.color} variant="Bold" />
                          </View>
                          {/* Icon Badge Shine */}
                          <View style={styles.iconBadgeShine} />
                        </View>

                        {/* Content */}
                        <View style={styles.modeCardContent}>
                          <Text style={styles.modeCardTitleNew}>{mode.title}</Text>
                          <Text style={styles.modeCardDescNew}>{mode.description}</Text>
                          
                          {/* Tagline Banner */}
                          <View style={styles.taglineBanner}>
                            <Text style={styles.taglineText}>{mode.tagline}</Text>
                          </View>
                        </View>

                        {/* Stats Row */}
                        <View style={styles.modeStatsRow}>
                          {/* Difficulty Stars */}
                          <View style={styles.difficultyStars}>
                            {[1, 2, 3].map((star) => (
                              <Icon 
                                key={star}
                                name="Star1" 
                                size={14} 
                                color={star <= mode.difficulty ? '#FFD700' : 'rgba(255,255,255,0.3)'} 
                                variant="Bold" 
                              />
                            ))}
                          </View>

                          {/* XP Multiplier */}
                          <View style={styles.xpBadge}>
                            <Icon name="Flash" size={12} color="#FFD700" variant="Bold" />
                            <Text style={styles.xpBadgeText}>{mode.xpMultiplier}x</Text>
                          </View>

                          {/* Rounds */}
                          <View style={styles.roundsBadge}>
                            <Icon name="Layer" size={12} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.roundsBadgeText}>
                              {mode.rounds === 999 ? '∞' : mode.rounds}
                            </Text>
                          </View>
                        </View>

                        {/* Play Arrow */}
                        <View style={styles.playArrowCircle}>
                          <Icon name="Play" size={20} color={mode.color} variant="Bold" />
                        </View>
                      </LinearGradient>
                    </Pressable>
                ))}
              </View>

              {/* Info Card */}
              <View style={styles.infoCard}>
                <View style={styles.infoIconWrap}>
                  <Icon name="InfoCircle" size={20} color={THEME.primary} />
                </View>
                <Text style={styles.infoText}>
                  Swipe left for <Text style={{ color: THEME.error, fontWeight: '800' }}>MYTH</Text> and right for <Text style={{ color: THEME.success, fontWeight: '800' }}>TRUTH</Text>!
                </Text>
              </View>

              <View style={{ height: 60 }} />
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </GestureHandlerRootView>
    );
  }

  if (gameState === 'intro') {
    // Mode-specific instructions
    const getModeInstruction = () => {
      switch (selectedMode.id) {
        case 'quick':
          return 'Take your time and learn at your own pace';
        case 'challenge':
          return `You have ${selectedMode.timeLimit} seconds per statement!`;
        case 'endless':
          return 'You have 3 lives — how far can you go?';
        default:
          return 'Swipe to judge each statement';
      }
    };

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LinearGradient
          colors={[selectedMode.colorSecondary, selectedMode.color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.fullScreen}
        >
          <SafeAreaView style={styles.fullScreen}>
            {/* Header */}
            <View style={styles.introHeader}>
              <TouchableOpacity 
                onPress={() => setGameState('mode-select')} 
                style={styles.introBackBtn}
              >
                <Icon name="ArrowLeft2" size={20} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.introModePillLight}>
                <Icon name={selectedMode.icon as any} size={14} color="#FFF" variant="Bold" />
                <Text style={styles.introModePillText}>{selectedMode.title}</Text>
              </View>
              <View style={{ width: 44 }} />
            </View>

            <View style={styles.introContent}>
              {/* Single white card with all instructions */}
              <View style={styles.introWhiteCard}>
                <Text style={styles.introCardTitle}>How to Play</Text>

                {/* Swipe instructions */}
                <View style={styles.introSwipeRow}>
                  <View style={[styles.introSwipeItem, { backgroundColor: THEME.error + '10' }]}>
                    <Icon name="ArrowLeft" size={20} color={THEME.error} variant="Bold" />
                    <Text style={[styles.introSwipeLabel, { color: THEME.error }]}>MYTH</Text>
                  </View>
                  <View style={[styles.introSwipeItem, { backgroundColor: THEME.success + '10' }]}>
                    <Text style={[styles.introSwipeLabel, { color: THEME.success }]}>TRUTH</Text>
                    <Icon name="ArrowRight" size={20} color={THEME.success} variant="Bold" />
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.introCardDivider} />

                {/* Mode info */}
                <View style={styles.introModeInfo}>
                  <Icon 
                    name={selectedMode.id === 'endless' ? 'Heart' : selectedMode.icon as any} 
                    size={18} 
                    color={selectedMode.color} 
                    variant="Bold" 
                  />
                  <Text style={styles.introModeInfoText}>{getModeInstruction()}</Text>
                </View>

                {/* Stats row */}
                <View style={styles.introStatsRow}>
                  <View style={styles.introStatItem}>
                    <Icon name="Layer" size={16} color={THEME.textMuted} />
                    <Text style={styles.introStatText}>
                      {selectedMode.rounds === 999 ? '∞' : selectedMode.rounds} rounds
                    </Text>
                  </View>
                  <View style={styles.introStatItem}>
                    <Icon name="Flash" size={16} color={THEME.gold} variant="Bold" />
                    <Text style={styles.introStatText}>{selectedMode.xpMultiplier}x XP</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Bottom Start Button */}
            <View style={styles.introBottom}>
              <TouchableOpacity
                onPress={() => setGameState('playing')}
                activeOpacity={0.9}
                style={styles.introStartBtnWhite}
              >
                <Text style={[styles.introStartTextColored, { color: selectedMode.color }]}>Start Game</Text>
                <Icon name="ArrowRight2" size={20} color={selectedMode.color} variant="Bold" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </GestureHandlerRootView>
    );
  }

  if (gameState === 'results') {
    const correctAnswers = answers.filter(a => a).length;
    const accuracy = Math.round((correctAnswers / myths.length) * 100);
    const wrongAnswers = myths.length - correctAnswers;
    
    // Get performance message based on accuracy
    const getPerformanceMessage = () => {
      if (accuracy >= 90) return { text: "Outstanding!", emoji: "🏆" };
      if (accuracy >= 70) return { text: "Great Job!", emoji: "⭐" };
      if (accuracy >= 50) return { text: "Good Effort!", emoji: "👍" };
      return { text: "Keep Learning!", emoji: "📚" };
    };
    const performance = getPerformanceMessage();
    
    const filteredMyths = reviewTab === 'wrong' 
      ? myths.map((m, i) => ({ ...m, originalIndex: i })).filter((_, i) => !answers[i])
      : myths.map((m, i) => ({ ...m, originalIndex: i }));

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LinearGradient
          colors={['#FFF9E6', '#FFF5D6', '#FFFBF0']}
          style={styles.fullScreen}
        >
          <SafeAreaView style={styles.fullScreen}>
            {/* Header */}
            <View style={styles.resultsHeader}>
              <TouchableOpacity 
                onPress={() => router.back()}
                style={styles.resultsBackBtn}
              >
                <Icon name="ArrowLeft2" size={20} color={THEME.text} />
              </TouchableOpacity>
              <View style={styles.resultsHeaderBadge}>
                <Icon name="Danger" size={16} color="#FFF" variant="Bold" />
                <Text style={styles.resultsHeaderBadgeText}>MythBuster</Text>
              </View>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView 
              style={{ flex: 1 }}
              contentContainerStyle={styles.resultsContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Score Card with Mascot */}
              <View style={styles.resultsScoreCard}>
                <Image 
                  source={accuracy >= 50 
                    ? require('@/assets/images/mascot/happy.png')
                    : require('@/assets/images/mascot/fix.png')
                  } 
                  style={styles.resultsScoreMascot}
                  resizeMode="contain"
                />
                <Text style={styles.resultsScoreEmoji}>{performance.emoji}</Text>
                <Text style={styles.resultsScoreTitle}>{performance.text}</Text>
                <View style={styles.resultsXPBadge}>
                  <Icon name="Flash" size={18} color={THEME.gold} variant="Bold" />
                  <Text style={styles.resultsXPText}>{score} XP</Text>
                </View>
              </View>

              {/* Stats Row */}
              <View style={styles.resultsStatsRow}>
                <View style={styles.resultsStatCard}>
                  <View style={[styles.resultsStatIcon, { backgroundColor: THEME.success + '20' }]}>
                    <Icon name="TickCircle" size={20} color={THEME.success} variant="Bold" />
                  </View>
                  <Text style={styles.resultsStatValue}>{correctAnswers}</Text>
                  <Text style={styles.resultsStatLabel}>Correct</Text>
                </View>
                <View style={styles.resultsStatCard}>
                  <View style={[styles.resultsStatIcon, { backgroundColor: THEME.error + '20' }]}>
                    <Icon name="CloseCircle" size={20} color={THEME.error} variant="Bold" />
                  </View>
                  <Text style={styles.resultsStatValue}>{wrongAnswers}</Text>
                  <Text style={styles.resultsStatLabel}>Wrong</Text>
                </View>
                <View style={styles.resultsStatCard}>
                  <View style={[styles.resultsStatIcon, { backgroundColor: selectedMode.color + '20' }]}>
                    <Icon name="Chart" size={20} color={selectedMode.color} variant="Bold" />
                  </View>
                  <Text style={styles.resultsStatValue}>{accuracy}%</Text>
                  <Text style={styles.resultsStatLabel}>Accuracy</Text>
                </View>
              </View>

              {/* Review Section */}
              <View style={styles.resultsReviewSection}>
                <View style={styles.resultsReviewHeader}>
                  <Text style={styles.resultsReviewTitle}>Review Answers</Text>
                  <Text style={styles.resultsReviewSubtitle}>Tap cards to see explanations</Text>
                </View>
                
                {/* Tab Buttons */}
                <View style={styles.resultsTabRow}>
                  <TouchableOpacity 
                    style={[styles.resultsTab, reviewTab === 'all' && [styles.resultsTabActive, { backgroundColor: selectedMode.color }]]}
                    onPress={() => setReviewTab('all')}
                  >
                    <Text style={[styles.resultsTabText, reviewTab === 'all' && styles.resultsTabTextActive]}>
                      All ({myths.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.resultsTab, reviewTab === 'wrong' && [styles.resultsTabActive, { backgroundColor: THEME.error }]]}
                    onPress={() => setReviewTab('wrong')}
                  >
                    <Text style={[styles.resultsTabText, reviewTab === 'wrong' && styles.resultsTabTextActive]}>
                      Missed ({wrongAnswers})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Review Cards */}
                {filteredMyths.length === 0 ? (
                  <View style={styles.resultsEmptyState}>
                    <View style={styles.resultsEmptyIcon}>
                      <Icon name="TickCircle" size={40} color={THEME.success} variant="Bold" />
                    </View>
                    <Text style={styles.resultsEmptyTitle}>Perfect Score!</Text>
                    <Text style={styles.resultsEmptyText}>You got all answers correct!</Text>
                  </View>
                ) : (
                  <View style={styles.resultsCardList}>
                    {filteredMyths.map((myth) => {
                      const isCorrect = answers[myth.originalIndex];
                      const isExpanded = expandedCard === myth.originalIndex;
                      
                      return (
                        <TouchableOpacity 
                          key={myth.originalIndex}
                          style={styles.resultsReviewCard}
                          onPress={() => setExpandedCard(isExpanded ? null : myth.originalIndex)}
                          activeOpacity={0.7}
                        >
                          {/* Colored side indicator */}
                          <View style={[
                            styles.resultsCardIndicator,
                            { backgroundColor: isCorrect ? THEME.success : THEME.error }
                          ]} />
                          
                          <View style={styles.resultsCardInner}>
                            {/* Card Header */}
                            <View style={styles.resultsCardHeader}>
                              <View style={[
                                styles.resultsCardNumber,
                                { backgroundColor: isCorrect ? THEME.success : THEME.error }
                              ]}>
                                <Text style={styles.resultsCardNumberText}>{myth.originalIndex + 1}</Text>
                              </View>
                              <View style={[
                                styles.resultsCardBadge,
                                { backgroundColor: myth.isTrue ? THEME.success + '15' : THEME.error + '15' }
                              ]}>
                                <Text style={[
                                  styles.resultsCardBadgeText,
                                  { color: myth.isTrue ? THEME.success : THEME.error }
                                ]}>
                                  {myth.isTrue ? 'TRUTH' : 'MYTH'}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }} />
                              <Icon 
                                name={isCorrect ? "TickCircle" : "CloseCircle"} 
                                size={22} 
                                color={isCorrect ? THEME.success : THEME.error} 
                                variant="Bold" 
                              />
                            </View>
                            
                            {/* Statement */}
                            <Text 
                              style={styles.resultsCardStatement}
                              numberOfLines={isExpanded ? undefined : 2}
                            >
                              {myth.statement}
                            </Text>
                            
                            {/* Expanded Content */}
                            {isExpanded && (
                              <View style={styles.resultsCardExpanded}>
                                <View style={styles.resultsCardDivider} />
                                <View style={styles.resultsCardExplanation}>
                                  <Icon name="Lamp" size={16} color={selectedMode.color} variant="Bold" />
                                  <Text style={styles.resultsCardExplanationText}>
                                    {myth.explanation}
                                  </Text>
                                </View>
                              </View>
                            )}
                            
                            {/* Expand hint */}
                            <View style={styles.resultsCardFooter}>
                              <Icon 
                                name={isExpanded ? "ArrowUp2" : "ArrowDown2"} 
                                size={16} 
                                color={THEME.textMuted} 
                              />
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.resultsActions}>
                <TouchableOpacity
                  style={[styles.resultsPlayAgainBtn, { backgroundColor: selectedMode.color }]}
                  onPress={resetGame}
                  activeOpacity={0.8}
                >
                  <Icon name="Refresh" size={20} color="#FFF" variant="Bold" />
                  <Text style={styles.resultsPlayAgainText}>Play Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resultsHomeBtn}
                  onPress={() => router.back()}
                  activeOpacity={0.8}
                >
                  <Icon name="Home2" size={20} color={THEME.text} />
                  <Text style={styles.resultsHomeText}>Back to Home</Text>
                </TouchableOpacity>
              </View>
              
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
  // Intro Screen with colored background
  introHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  introBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introModePillLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  introModePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  introContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  // Single white card
  introWhiteCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  introCardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  introSwipeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  introSwipeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  introSwipeLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  introCardDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginBottom: 16,
  },
  introModeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  introModeInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    flex: 1,
  },
  introStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  introStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  introStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  introBottom: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  introStartBtnWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFF',
    paddingVertical: 18,
    borderRadius: 28,
  },
  introStartTextColored: {
    fontSize: 17,
    fontWeight: '800',
  },
  // Legacy styles
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
  // New Results Screen Styles
  resultsScreen: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultsBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resultsHeaderBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  resultsHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
  },
  resultsContent: {
    padding: 20,
  },
  // Score Card
  resultsScoreCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  resultsScoreMascot: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  resultsScoreEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  resultsScoreTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.text,
    marginBottom: 12,
  },
  resultsXPBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.gold + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  resultsXPText: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
  },
  // Legacy hero styles
  resultsHeroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
  },
  resultsHeroGradient: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  resultsHeroMascot: {
    width: 100,
    height: 100,
    marginBottom: 8,
  },
  resultsHeroEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  resultsHeroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
  },
  resultsHeroScore: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  resultsStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  resultsStatCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  resultsStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsStatValue: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.text,
  },
  resultsStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  resultsReviewSection: {
    marginBottom: 24,
  },
  resultsReviewHeader: {
    marginBottom: 12,
  },
  resultsReviewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 4,
  },
  resultsReviewSubtitle: {
    fontSize: 13,
    color: THEME.textMuted,
  },
  resultsTabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  resultsTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  resultsTabActive: {
    backgroundColor: THEME.primary,
  },
  resultsTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textMuted,
  },
  resultsTabTextActive: {
    color: '#FFF',
  },
  resultsEmptyState: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  resultsEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  resultsEmptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.success,
  },
  resultsEmptyText: {
    fontSize: 14,
    color: THEME.textMuted,
  },
  resultsCardList: {
    gap: 12,
  },
  resultsReviewCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  resultsCardIndicator: {
    width: 5,
  },
  resultsCardInner: {
    flex: 1,
    padding: 14,
  },
  resultsReviewCardCorrect: {
    borderLeftWidth: 4,
    borderLeftColor: THEME.success,
  },
  resultsReviewCardWrong: {
    borderLeftWidth: 4,
    borderLeftColor: THEME.error,
  },
  resultsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  resultsCardNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsCardNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
  resultsCardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resultsCardBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  resultsCardStatement: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    lineHeight: 20,
  },
  resultsCardExpanded: {
    marginTop: 12,
  },
  resultsCardDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginBottom: 12,
  },
  resultsCardExplanation: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: THEME.bg,
    padding: 12,
    borderRadius: 12,
  },
  resultsCardExplanationText: {
    flex: 1,
    fontSize: 13,
    color: THEME.text,
    lineHeight: 19,
  },
  resultsCardFooter: {
    alignItems: 'center',
    marginTop: 10,
  },
  resultsCardHint: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  resultsPlayAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.primary,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.15)',
  },
  resultsPlayAgainText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  resultsHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  resultsHomeText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
  },
  // Legacy Results Styles
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
    paddingTop: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  modeHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
  },
  backButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  headerBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  modeScrollView: {
    flex: 1,
  },
  modeContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  // Decorations
  decorationsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    overflow: 'hidden',
    zIndex: 0,
  },
  floatingDecor: {
    position: 'absolute',
  },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  buntingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: -8,
    paddingHorizontal: 20,
  },
  buntingFlag: {
    width: 20,
    height: 28,
    borderRadius: 2,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  // Title Section
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
    marginTop: 8,
  },
  titleMascot: {
    width: 90,
    height: 90,
  },
  titleBubble: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 18,
    // 3D effect
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    borderTopColor: 'rgba(255,255,255,1)',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 5,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modeTitleNew: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.text,
    marginBottom: 4,
  },
  modeSubtitleNew: {
    fontSize: 14,
    color: THEME.textMuted,
    fontWeight: '600',
  },
  // New Mode Cards - 3D Style
  modesGridNew: {
    gap: 22,
  },
  modeCardNew: {
    borderRadius: 24,
    position: 'relative',
    height: 160,
  },
  modeCardPressed: {
    transform: [{ scale: 0.97 }, { translateY: 2 }],
  },
  // 3D Layers
  card3DBottom: {
    position: 'absolute',
    top: 8,
    left: 4,
    right: -4,
    bottom: -8,
    borderRadius: 24,
    opacity: 0.4,
  },
  card3DMiddle: {
    position: 'absolute',
    top: 4,
    left: 2,
    right: -2,
    bottom: -4,
    borderRadius: 24,
    opacity: 0.6,
  },
  modeCardGradientNew: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    padding: 20,
    paddingRight: 60,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: 'rgba(255,255,255,0.5)',
    borderLeftColor: 'rgba(255,255,255,0.4)',
  },
  // Shine Effect
  cardShine: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 100,
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.15)',
    transform: [{ rotate: '45deg' }],
  },
  cardCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  cardCircle1: {
    width: 140,
    height: 140,
    top: -40,
    right: -40,
  },
  cardCircle2: {
    width: 100,
    height: 100,
    bottom: -30,
    left: -30,
  },
  modeIconBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    // 3D effect for badge
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    borderTopColor: 'rgba(255,255,255,0.6)',
  },
  modeIconInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    // Inner shadow effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  iconBadgeShine: {
    position: 'absolute',
    top: 4,
    left: 8,
    width: 16,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
    transform: [{ rotate: '-20deg' }],
  },
  modeCardContent: {
    marginLeft: 60,
    flex: 1,
  },
  modeCardTitleNew: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
  },
  modeCardDescNew: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginBottom: 8,
  },
  taglineBanner: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  taglineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  modeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    marginLeft: 64,
  },
  difficultyStars: {
    flexDirection: 'row',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,215,0,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  xpBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  roundsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  roundsBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
  playArrowCircle: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    // 3D effect
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    borderBottomColor: 'rgba(0,0,0,0.1)',
    borderRightColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: THEME.textMuted,
    fontWeight: '500',
    lineHeight: 18,
  },
  // Legacy styles kept for compatibility
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

