import { Icon } from '@/components/ui/icon';
import { getMazeById } from '@/content/explorer';
import { useStorage } from '@/services/StorageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeOut,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Bright Mustard Theme
const THEME = {
  bg: '#FFFDE7',
  bgLight: '#FFF9C4',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#6B7280',
  primary: '#FFB300', // Bright Mustard
  primaryDark: '#FFA000',
  secondary: '#FFD54F',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#FF8F00',
  gold: '#FFCA28',
  playerColor: '#FFB300',
  monsterColor: '#EF4444',
  border: '#FFE082',
};

const RETRO_THEME = {
  white: '#FFFFFF',
  light: '#C4CFA1', // Classic GB Green-ish tint for "white"
  mid: '#8B956D',   // Mid tone
  dark: '#4D533C',  // Dark tone
  black: '#1F1F1F', // Black
};

// Monster sprites for fallback
const MONSTER_SPRITES = {
  boss: '👹',
  slime: '👾',
  ghost: '👻',
  dragon: '🐉',
  robot: '🤖',
};

const PlayerSvg = () => (
  <Svg width="80" height="80" viewBox="0 0 100 100">
    <Circle cx="50" cy="30" r="20" fill={RETRO_THEME.black} />
    <Rect x="40" y="50" width="20" height="30" fill={RETRO_THEME.black} />
    <Path d="M40 50 L20 70" stroke={RETRO_THEME.black} strokeWidth="5" strokeLinecap="square" />
    <Path d="M60 50 L80 70" stroke={RETRO_THEME.black} strokeWidth="5" strokeLinecap="square" />
    <Path d="M45 80 L45 100" stroke={RETRO_THEME.black} strokeWidth="5" strokeLinecap="square" />
    <Path d="M55 80 L55 100" stroke={RETRO_THEME.black} strokeWidth="5" strokeLinecap="square" />
  </Svg>
);

const EnemySvg = ({ color, isBoss }: { color: string; isBoss?: boolean }) => (
  <Svg width={isBoss ? "120" : "80"} height={isBoss ? "120" : "80"} viewBox="0 0 100 100">
    <Rect x="20" y="20" width="60" height="60" fill={RETRO_THEME.dark} rx="0" />
    <Rect x="30" y="35" width="10" height="10" fill={RETRO_THEME.white} />
    <Rect x="60" y="35" width="10" height="10" fill={RETRO_THEME.white} />
    <Path d="M35 65 L65 65" stroke={RETRO_THEME.white} strokeWidth="3" fill="none" />
    {isBoss && <Path d="M20 20 L30 5 L40 20 L50 5 L60 20 L70 5 L80 20" fill={RETRO_THEME.dark} stroke={RETRO_THEME.black} strokeWidth="2" />}
  </Svg>
);

const GameBoyFrame = ({ children, title, score, onBack }: { 
  children: React.ReactNode;
  title?: string;
  score?: number;
  onBack?: () => void;
}) => (
  <View style={styles.gbContainer}>
    <View style={styles.gbBezel}>
      <View style={styles.gbScreen}>
        {/* In-screen header */}
        {title && (
          <View style={styles.gbScreenHeader}>
            <TouchableOpacity onPress={onBack} style={styles.gbBackBtn}>
              <Icon name="ArrowLeft2" size={16} color={RETRO_THEME.dark} />
            </TouchableOpacity>
            <Text style={styles.gbScreenTitle}>{title}</Text>
            {score !== undefined && (
              <View style={styles.gbScoreBadge}>
                <Text style={styles.gbScoreText}>{score}</Text>
              </View>
            )}
          </View>
        )}
        {children}
      </View>
      
      <View style={styles.gbFooter}>
        <Text style={styles.gbLogo}>ATOM<Text style={styles.gbLogoItalic}>IQ</Text> BATTLE</Text>
      </View>
    </View>
  </View>
);

interface GameState {
  phase: 'intro' | 'battle' | 'victory' | 'defeat' | 'boss_intro' | 'boss' | 'complete';
  currentRoomIndex: number;
  currentQuestionIndex: number;
  playerHp: number;
  playerMaxHp: number;
  monsterHp: number;
  monsterMaxHp: number;
  score: number;
  defeatedMonsters: number;
}

export default function AtomMazeBattleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addXP } = useStorage();

  const maze = useMemo(() => {
    if (!id) return null;
    return getMazeById(id);
  }, [id]);

  // Game state
  const [gameState, setGameState] = useState<GameState>({
    phase: 'intro',
    currentRoomIndex: 0,
    currentQuestionIndex: 0,
    playerHp: 100,
    playerMaxHp: 100,
    monsterHp: 100,
    monsterMaxHp: 100,
    score: 0,
    defeatedMonsters: 0,
  });

  // UI state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [scrambleInput, setScrambleInput] = useState<string[]>([]);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [revealedPositions, setRevealedPositions] = useState<number[]>([]);
  const [hintTimer, setHintTimer] = useState(60);

  // Animation values
  const playerShake = useSharedValue(0);
  const monsterShake = useSharedValue(0);
  const playerScale = useSharedValue(1);
  const monsterScale = useSharedValue(1);
  const playerX = useSharedValue(0);
  const monsterOpacity = useSharedValue(1);

  // Initialize game
  useEffect(() => {
    if (maze) {
      const playerMaxHp = maze.playerMaxHp || 100;
      const firstRoom = maze.rooms[0];
      const monsterMaxHp = firstRoom?.monster?.maxHp || 50;

      setGameState({
        phase: 'intro',
        currentRoomIndex: 0,
        currentQuestionIndex: 0,
        playerHp: playerMaxHp,
        playerMaxHp: playerMaxHp,
        monsterHp: monsterMaxHp,
        monsterMaxHp: monsterMaxHp,
        score: 0,
        defeatedMonsters: 0,
      });
      
      // Reset animations
      playerX.value = 0;
      monsterOpacity.value = 1;
    }
  }, [maze]);

  // Get current room and question
  const currentRoom = maze?.rooms[gameState.currentRoomIndex];
  const isBossBattle = gameState.phase === 'boss';
  const currentMonster = isBossBattle ? maze?.boss : currentRoom?.monster;
  
  // For boss battles, collect all scramble questions from all rooms
  const bossQuestions = useMemo(() => {
    if (!maze) return [] as { type: 'scramble'; question: string; answer: string; hint?: string }[];
    const scrambles: { type: 'scramble'; question: string; answer: string; hint?: string }[] = [];
    maze.rooms.forEach(room => {
      room.questions.forEach(q => {
        if (q.type === 'scramble') {
          scrambles.push(q as { type: 'scramble'; question: string; answer: string; hint?: string });
        }
      });
    });
    return scrambles;
  }, [maze]);
  
  const currentQuestions = isBossBattle ? bossQuestions : (currentRoom?.questions || []);
  const currentQuestion = currentQuestions[gameState.currentQuestionIndex];

  // Initialize scramble letters when question changes
  useEffect(() => {
    if (currentQuestion?.type === 'scramble') {
      const answer = currentQuestion.answer.toUpperCase();
      const shuffled = answer.split('').sort(() => Math.random() - 0.5);
      setAvailableLetters(shuffled);
      setScrambleInput([]);
      setRevealedPositions([]);
      setHintTimer(60);
    }
  }, [currentQuestion, gameState.currentQuestionIndex, gameState.currentRoomIndex]);

  // Hint timer countdown - reveals a letter every 60 seconds
  useEffect(() => {
    if (currentQuestion?.type === 'scramble' && (gameState.phase === 'battle' || gameState.phase === 'boss')) {
      const timer = setInterval(() => {
        setHintTimer((prev) => {
          if (prev <= 1) {
            // Reveal a random unrevealed position
            const answer = currentQuestion.answer.toUpperCase();
            const unrevealedPositions = answer.split('').map((_, i) => i)
              .filter(i => !revealedPositions.includes(i) && !scrambleInput[i]);
            
            if (unrevealedPositions.length > 0) {
              const randomPos = unrevealedPositions[Math.floor(Math.random() * unrevealedPositions.length)];
              const letterToReveal = answer[randomPos];
              
              // Remove the letter from available letters
              const letterIndex = availableLetters.indexOf(letterToReveal);
              if (letterIndex !== -1) {
                setAvailableLetters(prev => {
                  const newLetters = [...prev];
                  newLetters.splice(letterIndex, 1);
                  return newLetters;
                });
              }
              
              setRevealedPositions(prev => [...prev, randomPos]);
            }
            return 60; // Reset timer for next hint
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentQuestion, gameState.phase, revealedPositions, scrambleInput, availableLetters]);

  // Shake animation for damage
  const triggerPlayerShake = useCallback(() => {
    playerShake.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    if (Platform.OS !== 'web') {
      Vibration.vibrate(100);
    }
  }, []);

  const triggerMonsterShake = useCallback(() => {
    monsterShake.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, []);

  const triggerAttackAnimation = useCallback((isPlayer: boolean) => {
    if (isPlayer) {
      playerScale.value = withSequence(
        withTiming(1.2, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
    } else {
      monsterScale.value = withSequence(
        withTiming(1.2, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
    }
  }, []);

  // Animated styles
  const playerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: playerShake.value + playerX.value },
      { scale: playerScale.value },
    ],
  }));

  const monsterAnimatedStyle = useAnimatedStyle(() => ({
    opacity: monsterOpacity.value,
    transform: [
      { translateX: monsterShake.value },
      { scale: monsterScale.value },
    ],
  }));

  // Handle quiz answer selection
  const handleQuizAnswer = (index: number) => {
    if (isAnswering || showResult) return;
    setSelectedAnswer(index);
  };

  // Handle scramble letter selection - place in next available non-revealed slot
  const handleLetterSelect = (letter: string, index: number) => {
    if (isAnswering || showResult || !currentQuestion) return;
    
    // Find the next empty slot that isn't revealed
    const answerLength = currentQuestion.type === 'scramble' ? currentQuestion.answer.length : 0;
    let targetSlot = -1;
    
    for (let i = 0; i < answerLength; i++) {
      if (!revealedPositions.includes(i) && !scrambleInput[i]) {
        targetSlot = i;
        break;
      }
    }
    
    if (targetSlot === -1) return; // No available slot
    
    const newAvailable = [...availableLetters];
    newAvailable.splice(index, 1);
    setAvailableLetters(newAvailable);
    
    // Place letter at the target slot
    const newInput = [...scrambleInput];
    newInput[targetSlot] = letter;
    setScrambleInput(newInput);
  };

  // Handle removing letter from input (keep position, just clear it)
  const handleLetterRemove = (index: number) => {
    if (isAnswering || showResult) return;
    if (revealedPositions.includes(index)) return; // Can't remove revealed letters
    
    const letter = scrambleInput[index];
    if (!letter) return;
    
    const newInput = [...scrambleInput];
    delete newInput[index]; // Remove but keep position
    setScrambleInput(newInput);
    setAvailableLetters([...availableLetters, letter]);
  };

  // Shuffle available letters
  const handleShuffle = () => {
    if (isAnswering || showResult) return;
    const shuffled = [...availableLetters].sort(() => Math.random() - 0.5);
    setAvailableLetters(shuffled);
  };

  // Submit answer
  const handleSubmit = () => {
    if (isAnswering || !currentQuestion) return;

    setIsAnswering(true);
    let isCorrect = false;

    if (currentQuestion.type === 'quiz') {
      isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    } else if (currentQuestion.type === 'scramble') {
      // Build the full answer including revealed letters
      const correctAnswer = currentQuestion.answer.toUpperCase();
      const fullAnswer = correctAnswer.split('').map((letter, i) => {
        if (revealedPositions.includes(i)) return letter;
        return scrambleInput[i] || '';
      }).join('');
      isCorrect = fullAnswer === correctAnswer;
    }

    setShowResult(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      // Player attacks monster
      triggerAttackAnimation(true);
      setTimeout(() => triggerMonsterShake(), 150);

      if (isBossBattle) {
        // Boss battle: deal damage per correct answer
        const damagePerHit = Math.ceil((maze?.boss?.maxHp || 100) / bossQuestions.length);
        const newBossHp = Math.max(0, gameState.monsterHp - damagePerHit);

        setGameState((prev) => ({
          ...prev,
          monsterHp: newBossHp,
          score: prev.score + 15,
        }));

        // Check if boss is defeated
        if (newBossHp <= 0) {
          setTimeout(() => {
            handleMonsterDefeated();
          }, 1500);
        } else {
          // Move to next boss question
          setTimeout(() => {
            setShowResult(null);
            setSelectedAnswer(null);
            setScrambleInput([]);
            setIsAnswering(false);
            setGameState((prev) => ({
              ...prev,
              currentQuestionIndex: prev.currentQuestionIndex + 1,
            }));
          }, 1500);
        }
      } else {
        // Regular room: correct answer defeats the monster instantly!
        setGameState((prev) => ({
          ...prev,
          monsterHp: 0,
          score: prev.score + 10,
        }));

        // Monster defeated - proceed to next room after delay
        setTimeout(() => {
          handleMonsterDefeated();
        }, 1500);
      }
    } else {
      // Monster attacks player - wrong answer deals damage but stays on same question
      triggerAttackAnimation(false);
      setTimeout(() => triggerPlayerShake(), 150);

      const damage = currentMonster?.attackPower || 20;
      const newPlayerHp = Math.max(0, gameState.playerHp - damage);

      setGameState((prev) => ({
        ...prev,
        playerHp: newPlayerHp,
      }));

      // Check for game over
      if (newPlayerHp <= 0) {
        setTimeout(() => {
          setGameState((prev) => ({ ...prev, phase: 'defeat' }));
        }, 1500);
        return;
      }

      // Reset for retry - stay on same question, but keep revealed letters
      setTimeout(() => {
        setShowResult(null);
        setSelectedAnswer(null);
        if (currentQuestion?.type === 'scramble') {
          const answer = currentQuestion.answer.toUpperCase();
          // Get letters that are NOT revealed
          const nonRevealedLetters = answer.split('').filter((_, i) => !revealedPositions.includes(i));
          const shuffled = nonRevealedLetters.sort(() => Math.random() - 0.5);
          setAvailableLetters(shuffled);
          // Clear only non-revealed input positions
          setScrambleInput([]);
        }
        setIsAnswering(false);
      }, 1500);
    }
  };

  // Handle moving to next question (for boss battles with multiple questions)
  const handleNextBossQuestion = () => {
    setShowResult(null);
    setSelectedAnswer(null);
    setScrambleInput([]);
    setIsAnswering(false);

    const nextQuestionIndex = gameState.currentQuestionIndex + 1;
    if (nextQuestionIndex < bossQuestions.length) {
      setGameState((prev) => ({
        ...prev,
        currentQuestionIndex: nextQuestionIndex,
      }));
    }
  };

  // Handle next room transition
  const handleNextRoomTransition = () => {
    // Check if there are more rooms
    const nextRoomIndex = gameState.currentRoomIndex + 1;
    if (nextRoomIndex < (maze?.rooms.length || 0)) {
      // Reset positions off-screen left
      playerX.value = -width;
      monsterOpacity.value = 1;
      
      // Update state for next room
      const nextRoom = maze?.rooms[nextRoomIndex];
      const nextMonsterHp = nextRoom?.monster?.maxHp || 50;

      setGameState((prev) => ({
        ...prev,
        phase: 'battle',
        currentRoomIndex: nextRoomIndex,
        currentQuestionIndex: 0,
        monsterHp: nextMonsterHp,
        monsterMaxHp: nextMonsterHp,
      }));
      
      // Walk in to center
      playerX.value = withTiming(0, { duration: 1000 });
    } else {
      // All rooms cleared, face the boss!
      setGameState((prev) => ({ ...prev, phase: 'boss_intro' }));
      playerX.value = 0;
      monsterOpacity.value = 1;
    }
  };

  // Handle monster defeated
  const handleMonsterDefeated = () => {
    setShowResult(null);
    setSelectedAnswer(null);
    setScrambleInput([]);
    setIsAnswering(false);

    setGameState((prev) => ({
      ...prev,
      defeatedMonsters: prev.defeatedMonsters + 1,
    }));

    // Check if this was the boss
    if (isBossBattle) {
      setGameState((prev) => ({ ...prev, phase: 'complete' }));
      // Award XP
      if (maze) {
        addXP(maze.xpReward);
      }
      return;
    }

    // Animate monster death and player walk
    monsterOpacity.value = withTiming(0, { duration: 500 });
    
    // Walk to next room
    setTimeout(() => {
        playerX.value = withTiming(width, { duration: 1500 }, (finished) => {
            if (finished) {
                runOnJS(handleNextRoomTransition)();
            }
        });
    }, 500);
  };

  // Proceed to next room (legacy/fallback)
  const handleNextRoom = () => {
    handleNextRoomTransition();
  };

  // Start boss battle
  const handleStartBossBattle = () => {
    const bossHp = maze?.boss?.maxHp || 100;
    setGameState((prev) => ({
      ...prev,
      phase: 'boss',
      currentQuestionIndex: 0,
      monsterHp: bossHp,
      monsterMaxHp: bossHp,
    }));
  };

  // Start the game
  const handleStartGame = () => {
    setGameState((prev) => ({ ...prev, phase: 'battle' }));
  };

  // Exit game
  const handleExit = () => {
    router.back();
  };

  if (!maze) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Maze not found</Text>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <Text style={styles.exitButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render intro screen
  if (gameState.phase === 'intro') {
    return (
      <LinearGradient colors={['#FFFDE7', '#FFF9C4', '#FFEE58'] as const} style={styles.container}>
        <View style={styles.introHeader}>
          <TouchableOpacity onPress={handleExit} style={styles.introBackBtn}>
            <Icon name="ArrowLeft2" size={20} color={THEME.text} />
          </TouchableOpacity>
          <View style={styles.introBadge}>
            <Icon name="Game" size={18} color="#FFF" variant="Bold" />
            <Text style={styles.introBadgeText}>AtomMaze</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.introContainer}>
          {/* Title Card */}
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>{maze.title}</Text>
            <Text style={styles.introSubtitle}>{maze.theme}</Text>
            <Text style={styles.introDescription}>{maze.description}</Text>
          </View>

          {/* Stats Row */}
          <View style={styles.introStatsRow}>
            <View style={styles.introStatCard}>
              <Text style={styles.introStatEmoji}>👾</Text>
              <Text style={styles.introStatValue}>{maze.rooms.length}</Text>
              <Text style={styles.introStatLabel}>Monsters</Text>
            </View>
            <View style={styles.introStatCard}>
              <Text style={styles.introStatEmoji}>👹</Text>
              <Text style={styles.introStatValue}>1</Text>
              <Text style={styles.introStatLabel}>Boss</Text>
            </View>
            <View style={styles.introStatCard}>
              <Text style={styles.introStatEmoji}>⚡</Text>
              <Text style={styles.introStatValue}>{maze.xpReward}</Text>
              <Text style={styles.introStatLabel}>XP</Text>
            </View>
          </View>

          {/* How to Play */}
          <View style={styles.introHowToPlay}>
            <Text style={styles.introHowToPlayTitle}>How to Play</Text>
            <View style={styles.introSwipeRow}>
              <View style={styles.introSwipeItem}>
                <Text style={{ fontSize: 24 }}>❓</Text>
                <Text style={styles.introSwipeLabel}>Answer Quiz</Text>
              </View>
              <View style={styles.introSwipeItem}>
                <Text style={{ fontSize: 24 }}>🔤</Text>
                <Text style={styles.introSwipeLabel}>Unscramble</Text>
              </View>
            </View>
          </View>

          {/* Start Button */}
          <TouchableOpacity style={styles.startButton} onPress={handleStartGame} activeOpacity={0.9}>
            <View style={styles.startButton3DBottom} />
            <LinearGradient
              colors={['#FFB300', '#FFA000'] as const}
              style={styles.startButtonGradient}
            >
              <Icon name="Play" size={28} color="#FFF" variant="Bold" />
              <Text style={styles.startButtonText}>START BATTLE</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    );
  }

  // Render defeat screen
  if (gameState.phase === 'defeat') {
    return (
      <LinearGradient colors={['#FFFDE7', '#FFF9C4', '#FEE2E2'] as const} style={styles.container}>
        <Animated.View entering={FadeIn} style={styles.resultContainer}>
          <View style={styles.resultCard}>
            <Text style={styles.defeatEmoji}>💀</Text>
            <Text style={styles.defeatTitle}>DEFEATED!</Text>
            <Text style={styles.defeatSubtitle}>Your HP reached zero...</Text>

            <View style={styles.resultStatsCard}>
              <View style={styles.resultStatRow}>
                <Text style={styles.resultStatLabel}>Monsters Defeated</Text>
                <Text style={styles.resultStatValue}>{gameState.defeatedMonsters}</Text>
              </View>
              <View style={styles.resultStatRow}>
                <Text style={styles.resultStatLabel}>Final Score</Text>
                <Text style={styles.resultStatValue}>{gameState.score}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.retryButton} onPress={handleExit} activeOpacity={0.9}>
            <View style={styles.retryButton3D} />
            <View style={styles.retryButtonInner}>
              <Icon name="Refresh" size={22} color="#FFF" variant="Bold" />
              <Text style={styles.retryButtonText}>TRY AGAIN</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    );
  }

  // Render victory screen (between rooms)
  if (gameState.phase === 'victory') {
    return (
      <LinearGradient colors={['#FFFDE7', '#FFF9C4', '#DCFCE7'] as const} style={styles.container}>
        <Animated.View entering={FadeIn} style={styles.resultContainer}>
          <View style={styles.resultCard}>
            <Text style={styles.victoryEmoji}>⚔️</Text>
            <Text style={styles.victoryTitle}>MONSTER DEFEATED!</Text>
            <Text style={styles.victorySubtitle}>{currentMonster?.defeatMessage || 'Well done!'}</Text>

            <View style={styles.resultStatsCard}>
              <View style={styles.resultStatRow}>
                <Text style={styles.resultStatLabel}>Progress</Text>
                <Text style={styles.resultStatValue}>Room {gameState.currentRoomIndex + 1}/{maze.rooms.length}</Text>
              </View>
              <View style={styles.resultStatRow}>
                <Text style={styles.resultStatLabel}>HP Remaining</Text>
                <Text style={[styles.resultStatValue, { color: THEME.success }]}>
                  {gameState.playerHp}/{gameState.playerMaxHp}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.nextButton} onPress={handleNextRoom} activeOpacity={0.9}>
            <View style={styles.nextButton3D} />
            <View style={styles.nextButtonInner}>
              <Text style={styles.nextButtonText}>NEXT ROOM</Text>
              <Icon name="ArrowRight2" size={22} color="#FFF" variant="Bold" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    );
  }

  // Render boss intro screen
  if (gameState.phase === 'boss_intro') {
    return (
      <LinearGradient colors={['#FFFDE7', '#FFF9C4', '#FFE4E6'] as const} style={styles.container}>
        <Animated.View entering={FadeIn} style={styles.resultContainer}>
          <View style={styles.resultCard}>
            <Text style={styles.bossIntroEmoji}>
              {maze.boss?.sprite || MONSTER_SPRITES.boss}
            </Text>
            <Text style={styles.bossIntroTitle}>BOSS BATTLE!</Text>
            <Text style={styles.bossIntroName}>{maze.boss?.name || 'Final Boss'}</Text>
            <Text style={styles.bossIntroSubtitle}>
              All rooms cleared! Now face the final challenge!
            </Text>

            <View style={styles.bossStatsRow}>
              <View style={styles.bossStatCard}>
                <Icon name="Heart" size={24} color={THEME.error} variant="Bold" />
                <Text style={styles.bossStatValue}>{maze.boss?.maxHp || 100}</Text>
                <Text style={styles.bossStatLabel}>HP</Text>
              </View>
              <View style={styles.bossStatCard}>
                <Icon name="Danger" size={24} color={THEME.warning} variant="Bold" />
                <Text style={styles.bossStatValue}>{maze.boss?.attackPower || 30}</Text>
                <Text style={styles.bossStatLabel}>ATK</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.bossButton} onPress={handleStartBossBattle} activeOpacity={0.9}>
            <View style={styles.bossButton3D} />
            <View style={styles.bossButtonInner}>
              <Icon name="Sword" size={24} color="#FFF" variant="Bold" />
              <Text style={styles.bossButtonText}>FIGHT BOSS!</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    );
  }

  // Render completion screen
  if (gameState.phase === 'complete') {
    return (
      <LinearGradient colors={['#FFFDE7', '#FFF9C4', '#FEF9C3'] as const} style={styles.container}>
        <Animated.View entering={FadeIn} style={styles.resultContainer}>
          <View style={styles.resultCard}>
            <Text style={styles.completeEmoji}>🏆</Text>
            <Text style={styles.completeTitle}>VICTORY!</Text>
            <Text style={styles.completeSubtitle}>You defeated the boss!</Text>

            <View style={styles.rewardCard}>
              <Icon name="Flash" size={36} color={THEME.gold} variant="Bold" />
              <Text style={styles.rewardText}>+{maze.xpReward} XP</Text>
            </View>

            <View style={styles.resultStatsCard}>
              <View style={styles.resultStatRow}>
                <Text style={styles.resultStatLabel}>Monsters Defeated</Text>
                <Text style={styles.resultStatValue}>{gameState.defeatedMonsters}</Text>
              </View>
              <View style={styles.resultStatRow}>
                <Text style={styles.resultStatLabel}>Final Score</Text>
                <Text style={styles.resultStatValue}>{gameState.score}</Text>
              </View>
              <View style={styles.resultStatRow}>
                <Text style={styles.resultStatLabel}>HP Remaining</Text>
                <Text style={[styles.resultStatValue, { color: THEME.success }]}>
                  {gameState.playerHp}/{gameState.playerMaxHp}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.completeButton} onPress={handleExit} activeOpacity={0.9}>
            <View style={styles.completeButton3D} />
            <View style={styles.completeButtonInner}>
              <Icon name="Gift" size={24} color="#FFF" variant="Bold" />
              <Text style={styles.completeButtonText}>CLAIM REWARD</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    );
  }

  // Main battle screen
  return (
    <LinearGradient colors={['#FFFDE7', '#FFF9C4'] as const} style={styles.container}>
      {/* Battle Arena */}
      <GameBoyFrame 
        title={isBossBattle ? '⚔️ BOSS' : `Room ${gameState.currentRoomIndex + 1}/${maze.rooms.length}`}
        score={gameState.score}
        onBack={handleExit}
      >
        <View style={styles.battleArena}>
          {/* Floor Line */}
          <View style={styles.floorLine} />
          
          {/* Player Side (Left) */}
          <Animated.View style={[styles.fighterContainer, playerAnimatedStyle, { zIndex: 10 }]}>
            <View style={styles.hpBarContainer}>
              <Text style={styles.fighterName}>You</Text>
              <View style={styles.hpBarBg}>
                <View
                  style={[
                    styles.hpBarFill,
                    {
                      width: `${(gameState.playerHp / gameState.playerMaxHp) * 100}%`,
                      backgroundColor:
                        gameState.playerHp > gameState.playerMaxHp * 0.5
                          ? THEME.success
                          : gameState.playerHp > gameState.playerMaxHp * 0.25
                          ? THEME.warning
                          : THEME.error,
                    },
                  ]}
                />
              </View>
              <Text style={styles.hpText}>
                {gameState.playerHp}/{gameState.playerMaxHp} HP
              </Text>
            </View>
            <View style={styles.svgContainer}>
              <PlayerSvg />
            </View>
          </Animated.View>

          {/* Monster Side (Right) */}
          <Animated.View style={[styles.fighterContainer, monsterAnimatedStyle]}>
            <View style={styles.hpBarContainer}>
              <Text style={styles.fighterName}>
                {isBossBattle ? '👹 ' : ''}
                {currentMonster?.name || 'Monster'}
              </Text>
              <View style={styles.hpBarBg}>
                <View
                  style={[
                    styles.hpBarFill,
                    {
                      width: `${(gameState.monsterHp / gameState.monsterMaxHp) * 100}%`,
                      backgroundColor: THEME.monsterColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.hpText}>
                {gameState.monsterHp}/{gameState.monsterMaxHp} HP
              </Text>
            </View>
            <View style={styles.svgContainer}>
              <EnemySvg 
                color={currentMonster?.color || THEME.monsterColor} 
                isBoss={isBossBattle}
              />
            </View>
          </Animated.View>
        </View>
      </GameBoyFrame>

      {/* Question Area */}
      <ScrollView 
        style={styles.questionArea} 
        contentContainerStyle={styles.questionAreaContent}
        showsVerticalScrollIndicator={false}
      >
        {currentQuestion && (
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
            {currentQuestion.type === 'scramble' && currentQuestion.hint && (
              <Text style={styles.hintText}>💡 {currentQuestion.hint}</Text>
            )}
          </View>
        )}

        {/* Answer Area */}
        {currentQuestion?.type === 'quiz' && (
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === currentQuestion.correctAnswer;
              const showCorrectness = showResult !== null;
              const isWrongAnswer = showCorrectness && isSelected && !isCorrect;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    // Only show correct styling when player got it right
                    showCorrectness && isCorrect && isSelected && styles.optionCorrect,
                    // Show wrong styling only for the selected wrong answer
                    isWrongAnswer && styles.optionWrong,
                    !showCorrectness && isSelected && styles.optionSelected,
                  ]}
                  onPress={() => handleQuizAnswer(index)}
                  disabled={showResult !== null}
                >
                  <View style={styles.optionBadge}>
                    <Text style={styles.optionBadgeText}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      // Only show correct text styling when player got it right
                      showCorrectness && isCorrect && isSelected && styles.optionTextCorrect,
                      isWrongAnswer && styles.optionTextWrong,
                    ]}
                    numberOfLines={2}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {currentQuestion?.type === 'scramble' && (
          <View style={styles.scrambleContainer}>
            {/* Answer slots */}
            <View style={[
              styles.scrambleAnswer,
              currentQuestion.answer.length <= 10 && styles.scrambleAnswerSingleLine
            ]}>
              {currentQuestion.answer.toUpperCase().split('').map((letter, index) => {
                const isRevealed = revealedPositions.includes(index);
                const userLetter = scrambleInput[index];
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.scrambleSlot,
                      (userLetter || isRevealed) && styles.scrambleSlotFilled,
                      isRevealed && styles.scrambleSlotRevealed,
                      showResult === 'correct' && styles.scrambleSlotCorrect,
                      showResult === 'wrong' && styles.scrambleSlotWrong,
                    ]}
                    onPress={() => userLetter && !isRevealed && handleLetterRemove(index)}
                    disabled={isRevealed}
                  >
                    <Text style={[
                      styles.scrambleSlotText,
                      isRevealed && styles.scrambleSlotTextRevealed
                    ]}>
                      {isRevealed ? letter : (userLetter || '')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Available letters */}
            <View style={styles.scrambleLetters}>
              {availableLetters.map((letter, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.scrambleLetter}
                  onPress={() => handleLetterSelect(letter, index)}
                  disabled={showResult !== null}
                >
                  <Text style={styles.scrambleLetterText}>{letter}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Shuffle button and hint timer */}
            <View style={styles.scrambleActions}>
              <TouchableOpacity 
                style={styles.shuffleButton} 
                onPress={handleShuffle}
                disabled={showResult !== null || availableLetters.length === 0}
              >
                <Icon name="Shuffle" size={18} color="#FFF" variant="Bold" />
                <Text style={styles.shuffleButtonText}>Shuffle</Text>
              </TouchableOpacity>
              
              <View style={styles.hintTimerBadge}>
                <Icon name="Lamp" size={14} color="#F59E0B" />
                <Text style={styles.hintTimerText}>Letter in {hintTimer}s</Text>
              </View>
              
              {revealedPositions.length > 0 && (
                <View style={styles.revealedBadge}>
                  <Text style={styles.revealedBadgeText}>{revealedPositions.length} revealed</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Result feedback */}
        {showResult && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={[
              styles.resultFeedback,
              showResult === 'correct' ? styles.resultCorrect : styles.resultWrong,
            ]}
          >
            <Text style={styles.resultFeedbackText}>
              {showResult === 'correct' 
                ? (isBossBattle ? '✓ CORRECT! Boss takes damage!' : '✓ CORRECT! Monster defeated!') 
                : '✗ WRONG! Try again!'}
            </Text>
          </Animated.View>
        )}

        {/* Submit button */}
        {!showResult && (
          <TouchableOpacity
            style={[
              styles.submitButton,
              (currentQuestion?.type === 'quiz' && selectedAnswer === null) && styles.submitButtonDisabled,
              (currentQuestion?.type === 'scramble' && (() => {
                // Check if all non-revealed positions are filled
                const answerLen = currentQuestion.answer.length;
                for (let i = 0; i < answerLen; i++) {
                  if (!revealedPositions.includes(i) && !scrambleInput[i]) return true;
                }
                return false;
              })()) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={
              (currentQuestion?.type === 'quiz' && selectedAnswer === null) ||
              (currentQuestion?.type === 'scramble' && (() => {
                const answerLen = currentQuestion?.answer.length || 0;
                for (let i = 0; i < answerLen; i++) {
                  if (!revealedPositions.includes(i) && !scrambleInput[i]) return true;
                }
                return false;
              })())
            }
          >
            <View style={styles.submitButtonGradient}>
              <Icon name="Sword" size={22} color="#FFF" variant="Bold" />
              <Text style={styles.submitButtonText}>ATTACK!</Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorText: {
    color: THEME.text,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  exitButton: {
    alignSelf: 'center',
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: THEME.primary,
    borderRadius: 8,
  },
  exitButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },

  // Battle Arena
  battleArena: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flex: 1,
    position: 'relative',
  },
  gbContainer: {
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginHorizontal: 16,
    marginTop: 50,
    marginBottom: 12,
  },
  gbBezel: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 8,
  },
  gbScreen: {
    backgroundColor: '#C4CFA1',
    borderRadius: 4,
    overflow: 'hidden',
    height: 200,
    borderWidth: 4,
    borderColor: '#4D533C',
  },
  gbScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#8B956D',
    borderBottomWidth: 2,
    borderBottomColor: '#4D533C',
  },
  gbBackBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C4CFA1',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4D533C',
  },
  gbScreenTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#1F1F1F',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textTransform: 'uppercase',
  },
  gbScoreBadge: {
    backgroundColor: '#4D533C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  gbScoreText: {
    color: '#C4CFA1',
    fontWeight: '800',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  gbFooter: {
    alignItems: 'center',
    marginTop: 12,
  },
  gbLogo: {
    color: '#CCC',
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  gbLogoItalic: {
    fontWeight: '400',
    fontSize: 14,
  },
  floorLine: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#4D533C',
    zIndex: 0,
  },
  fighterContainer: {
    alignItems: 'center',
    gap: 8,
    width: 100,
  },
  hpBarContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  fighterName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1F1F1F',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textTransform: 'uppercase',
  },
  hpBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#8B956D',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    overflow: 'hidden',
  },
  hpBarFill: {
    height: '100%',
    borderRadius: 0,
    backgroundColor: '#1F1F1F',
  },
  hpText: {
    fontSize: 8,
    color: '#1F1F1F',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  svgContainer: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Question Area
  questionArea: {
    flex: 1,
  },
  questionAreaContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 3,
  },
  questionText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
    lineHeight: 22,
  },
  hintText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Quiz Options
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 2,
    borderBottomWidth: 3,
    borderColor: '#E5E7EB',
  },
  optionSelected: {
    borderColor: '#FFB300',
    backgroundColor: '#FFF8E1',
  },
  optionCorrect: {
    borderColor: '#22C55E',
    backgroundColor: '#DCFCE7',
  },
  optionWrong: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  optionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFB300',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  optionTextCorrect: {
    color: '#166534',
    fontWeight: '700',
  },
  optionTextWrong: {
    color: '#991B1B',
    fontWeight: '700',
  },

  // Scramble
  scrambleContainer: {
    alignItems: 'center',
    gap: 14,
  },
  scrambleAnswer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  scrambleAnswerSingleLine: {
    flexWrap: 'nowrap',
  },
  scrambleSlot: {
    width: 40,
    height: 48,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFE082',
    borderStyle: 'dashed',
  },
  scrambleSlotFilled: {
    backgroundColor: '#FFFFFF',
    borderStyle: 'solid',
    borderColor: '#FFB300',
    borderBottomWidth: 3,
  },
  scrambleSlotRevealed: {
    backgroundColor: '#DCFCE7',
    borderStyle: 'solid',
    borderColor: '#22C55E',
    borderBottomWidth: 3,
  },
  scrambleSlotCorrect: {
    borderColor: '#22C55E',
    backgroundColor: '#DCFCE7',
  },
  scrambleSlotWrong: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  scrambleSlotText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  scrambleSlotTextRevealed: {
    color: '#166534',
  },
  scrambleLetters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    maxWidth: width - 40,
  },
  scrambleLetter: {
    width: 40,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderBottomWidth: 3,
    borderColor: '#E5E7EB',
  },
  scrambleLetterText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  scrambleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6B7280',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#4B5563',
  },
  shuffleButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  hintTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  hintTimerText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '600',
  },
  revealedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  revealedBadgeText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '600',
  },

  // Result Feedback
  resultFeedback: {
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  resultCorrect: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22C55E',
  },
  resultWrong: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  resultFeedbackText: {
    color: '#1F2937',
    fontWeight: '700',
    fontSize: 14,
  },

  // Submit Button
  submitButton: {
    marginTop: 14,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'stretch',
    backgroundColor: '#FFB300',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderBottomWidth: 4,
    borderBottomColor: '#FFA000',
  },
  submitButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#9CA3AF',
    borderBottomColor: '#6B7280',
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },

  // Intro Screen
  introHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  introBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
  },
  introBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFB300',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderBottomWidth: 4,
    borderBottomColor: '#FFA000',
  },
  introBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  introContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1F2937',
    marginBottom: 4,
  },
  introSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  introDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  introStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  introStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
  },
  introStatEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  introStatValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1F2937',
  },
  introStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  introHowToPlay: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
  },
  introHowToPlayTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  introSwipeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  introSwipeItem: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8E1',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFE082',
  },
  introSwipeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  startButton: {
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  startButton3DBottom: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#FFA000',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
    gap: 12,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
  },
  backButton: {
    padding: 12,
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },

  // Result Screens
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    maxWidth: 340,
  },
  resultStatsCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    borderWidth: 2,
    borderColor: '#FFE082',
  },
  resultStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  resultStatLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  resultStatValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '800',
  },
  defeatEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  defeatTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: THEME.error,
    marginBottom: 8,
  },
  defeatSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  victoryEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  victoryTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.success,
    marginBottom: 8,
  },
  victorySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  bossIntroEmoji: {
    fontSize: 100,
    marginBottom: 16,
  },
  bossIntroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: THEME.warning,
    marginBottom: 8,
  },
  bossIntroName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  bossIntroSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  bossStatsRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  bossStatCard: {
    flex: 1,
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFE082',
    borderBottomWidth: 4,
  },
  bossStatValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1F2937',
    marginTop: 8,
  },
  bossStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  completeEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  completeTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: THEME.gold,
    marginBottom: 8,
  },
  completeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#FACC15',
  },
  rewardText: {
    fontSize: 32,
    fontWeight: '900',
    color: THEME.gold,
  },
  retryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  retryButton3D: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#B91C1C',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  retryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: THEME.error,
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 16,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  nextButton3D: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#047857',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  nextButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: THEME.success,
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 16,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
  bossButton: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  bossButton3D: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#d97706',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  bossButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: THEME.warning,
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 16,
  },
  bossButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
  completeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  completeButton3D: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#B45309',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  completeButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: THEME.gold,
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 16,
  },
  completeButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
});

