import { Icon } from '@/components/ui/icon';
import { getMazeById } from '@/content/explorer';
import { useStorage } from '@/services/StorageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useMemo, useEffect } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const THEME = {
  bg: '#F7F7F7',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#9CA3AF',
  primary: '#FF6B00',
  primaryDark: '#E65100',
  success: '#2ECC71',
  error: '#E74C3C',
  gold: '#FFC107',
  border: '#E5E7EB',
};

export default function AtomMazeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { updateUserProfile } = useStorage();
  
  const maze = useMemo(() => {
    if (!id) return null;
    return getMazeById(id);
  }, [id]);

  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [completedRooms, setCompletedRooms] = useState<string[]>([]);
  const [answeredRooms, setAnsweredRooms] = useState<string[]>([]); // Track all answered rooms
  const [roomResults, setRoomResults] = useState<Record<string, 'correct' | 'wrong'>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (maze && maze.rooms.length > 0) {
      setCurrentRoomId(maze.rooms[0].id);
      if (maze.timeLimit) {
        setTimeRemaining(maze.timeLimit);
      }
    }
  }, [maze]);

  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining]);

  if (!maze || !currentRoomId) {
    return (
      <View style={styles.container}>
        <Text>Maze not found</Text>
      </View>
    );
  }

  const currentRoom = maze.rooms.find(r => r.id === currentRoomId);
  if (!currentRoom) return null;

  const handleAnswerSelect = (answerIndex: number) => {
    if (showExplanation) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    
    const isCorrect = selectedAnswer === currentRoom.question.correctAnswer;
    
    // Track room result for ALL answers (both correct and wrong)
    setRoomResults(prev => ({
      ...prev,
      [currentRoomId]: isCorrect ? 'correct' : 'wrong'
    }));
    
    // Track that this room was answered
    setAnsweredRooms(prev => {
      if (!prev.includes(currentRoomId)) {
        return [...prev, currentRoomId];
      }
      return prev;
    });
    
    if (isCorrect) {
      setScore(score + currentRoom.question.points);
      setCompletedRooms([...completedRooms, currentRoomId]);
    } else {
      // Lose a life on wrong answer
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        setGameOver(true);
      }
    }
    
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (gameOver) {
      // Game over - return to selection
      router.back();
      return;
    }
    
    if (currentRoom.nextRoomId) {
      setCurrentRoomId(currentRoom.nextRoomId);
      setSelectedAnswer(null);
      setShowExplanation(false);
      // Don't reset roomResults - keep track of all answers
    } else {
      // Maze completed - award XP and redirect to selection screen
      const finalScore = selectedAnswer === currentRoom.question.correctAnswer 
        ? score + currentRoom.question.points 
        : score;
      
      // Award XP
      updateUserProfile(prev => ({
        ...prev,
        total_xp: (prev.total_xp || 0) + maze.xpReward,
      }));

      // Redirect to selection screen
      router.replace('/atom-maze');
    }
  };

  const isCompleted = useLocalSearchParams<{ completed?: string }>().completed === 'true';
  const finalScore = useLocalSearchParams<{ score?: string }>().score 
    ? parseInt(useLocalSearchParams<{ score?: string }>().score || '0') 
    : null;

  if (isCompleted && finalScore !== null) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="ArrowLeft2" size={24} color={THEME.text} variant="Bold" />
          </TouchableOpacity>
        </View>
        <View style={styles.completedContainer}>
          <Animated.View entering={FadeInDown.delay(100)} style={styles.completedCard}>
            <LinearGradient
              colors={[THEME.success, '#27AE60']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.completedGradient}
            >
              <Icon name="TickCircle" size={64} color="#FFF" variant="Bold" />
              <Text style={styles.completedTitle}>Maze Completed!</Text>
              <Text style={styles.completedScore}>Final Score: {finalScore} points</Text>
              <Text style={styles.completedXP}>+{maze.xpReward} XP Earned</Text>
              <TouchableOpacity
                style={styles.completedButton}
                onPress={() => router.back()}
              >
                <Text style={styles.completedButtonText}>Return to Explorer</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </View>
    );
  }

  const isCorrect = selectedAnswer !== null && selectedAnswer === currentRoom.question.correctAnswer;
  const roomIndex = maze.rooms.findIndex(r => r.id === currentRoomId) + 1;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="ArrowLeft2" size={24} color={THEME.text} variant="Bold" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{maze.title}</Text>
          <Text style={styles.headerSubtitle}>Room {roomIndex} of {maze.rooms.length}</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Lives */}
          <View style={styles.livesContainer}>
            {[1, 2, 3].map((life) => (
              <Icon
                key={life}
                name="Heart"
                size={18}
                color={life <= lives ? THEME.error : THEME.border}
                variant="Bold"
              />
            ))}
          </View>
          {timeRemaining !== null && (
            <View style={styles.timer}>
              <Icon name="Timer" size={16} color={THEME.primary} />
              <Text style={styles.timerText}>
                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.contentContainer}>
        {/* Visual Maze Map - Improved */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPath}>
            {maze.rooms.map((room, index) => {
              const roomIndex = maze.rooms.findIndex(r => r.id === room.id);
              const isCurrent = room.id === currentRoomId;
              const isAnswered = answeredRooms.includes(room.id);
              
              // Check if room is accessible - either it's the first room, or a previous room that leads to it was answered
              let isAccessible = roomIndex === 0;
              if (!isAccessible) {
                // Find all rooms that lead to this room (check nextRoomId and alternativePathId)
                const roomsLeadingHere = maze.rooms.filter(r => 
                  r.nextRoomId === room.id || r.alternativePathId === room.id
                );
                // Room is accessible if any room leading to it has been answered
                isAccessible = roomsLeadingHere.some(r => answeredRooms.includes(r.id));
              }
              
              const roomResult = roomResults[room.id]; // 'correct' | 'wrong' | undefined
              
              return (
                <React.Fragment key={room.id}>
                  {/* Room Node */}
                  <View style={styles.mapNodeWrapper}>
                    <View style={[
                      styles.mapNode,
                      isCurrent && !isAnswered && styles.mapNodeCurrent,
                      roomResult === 'correct' && styles.mapNodeCorrect,
                      roomResult === 'wrong' && styles.mapNodeWrong,
                      !isAccessible && styles.mapNodeLocked,
                    ]}>
                      {roomResult === 'correct' ? (
                        <Icon name="TickCircle" size={16} color="#FFF" variant="Bold" />
                      ) : roomResult === 'wrong' ? (
                        <Icon name="CloseCircle" size={16} color="#FFF" variant="Bold" />
                      ) : isCurrent ? (
                        <View style={styles.currentNodePulse}>
                          <Icon name="Location" size={18} color="#FFF" variant="Bold" />
                        </View>
                      ) : !isAccessible ? (
                        <Icon name="Lock" size={14} color="#9CA3AF" />
                      ) : (
                        <Text style={styles.mapNodeNumber}>{index + 1}</Text>
                      )}
                    </View>
                    {isCurrent && !isAnswered && (
                      <Text style={styles.mapNodeLabel}>Current</Text>
                    )}
                    {roomResult === 'correct' && (
                      <Text style={styles.mapNodeResultLabel}>✓</Text>
                    )}
                    {roomResult === 'wrong' && (
                      <Text style={styles.mapNodeResultLabelWrong}>✗</Text>
                    )}
                  </View>
                  
                  {/* Connection Path */}
                  {index < maze.rooms.length - 1 && (
                    <View style={styles.mapPathLine}>
                      <View style={[
                        styles.mapPathFill,
                        isAnswered && roomResult === 'correct' && styles.mapPathFillCompleted,
                        isAnswered && roomResult === 'wrong' && styles.mapPathFillWrong,
                      ]} />
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Question - Compact */}
        <View style={styles.questionCard}>
          <View style={styles.questionHeader}>
            <Text style={styles.questionText} numberOfLines={2}>{currentRoom.question.question}</Text>
            <View style={styles.pointsBadge}>
              <Icon name="Flash" size={14} color={THEME.gold} variant="Bold" />
              <Text style={styles.pointsText}>{currentRoom.question.points}</Text>
            </View>
          </View>
        </View>

        {/* Answers - Compact */}
        <View style={styles.answersContainer}>
          {currentRoom.question.options.map((option, index) => {
            const isCorrect = index === currentRoom.question.correctAnswer;
            const isSelected = selectedAnswer === index;
            const isWrong = isSelected && !isCorrect && showExplanation;
            const showAsCorrect = showExplanation && isCorrect;
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.answerOption,
                  isSelected && !showExplanation && styles.answerOptionSelected,
                  showAsCorrect && styles.answerOptionCorrect,
                  isWrong && styles.answerOptionWrong,
                ]}
                activeOpacity={0.8}
                onPress={() => handleAnswerSelect(index)}
                disabled={showExplanation || gameOver}
              >
                <View style={[
                  styles.answerBadge,
                  isSelected && !showExplanation && styles.answerBadgeSelected,
                  showAsCorrect && styles.answerBadgeCorrect,
                  isWrong && styles.answerBadgeWrong,
                ]}>
                  {showAsCorrect ? (
                    <Icon name="TickCircle" size={16} color="#FFF" variant="Bold" />
                  ) : isWrong ? (
                    <Icon name="CloseCircle" size={16} color="#FFF" variant="Bold" />
                  ) : (
                    <Text style={[
                      styles.answerBadgeText,
                      isSelected && styles.answerBadgeTextSelected,
                    ]}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  )}
                </View>
                <Text style={[
                  styles.answerText,
                  isSelected && !showExplanation && styles.answerTextSelected,
                  showAsCorrect && styles.answerTextCorrect,
                  isWrong && styles.answerTextWrong,
                ]} numberOfLines={1}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Game Over Overlay */}
        {gameOver && (
          <View style={styles.gameOverOverlay}>
            <View style={styles.gameOverCard}>
              <Icon name="CloseCircle" size={48} color={THEME.error} variant="Bold" />
              <Text style={styles.gameOverTitle}>Game Over</Text>
              <Text style={styles.gameOverText}>You ran out of lives!</Text>
              <Text style={styles.gameOverScore}>Final Score: {score} points</Text>
              <TouchableOpacity style={styles.gameOverButton} onPress={() => router.back()}>
                <Text style={styles.gameOverButtonText}>Return</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Button - Fixed at bottom */}
        <View style={styles.actionContainer}>
          {!showExplanation ? (
            <TouchableOpacity
              style={[styles.actionButton, (selectedAnswer === null || gameOver) && styles.actionButtonDisabled]}
              onPress={handleSubmitAnswer}
              disabled={selectedAnswer === null || gameOver}
            >
              <Text style={styles.actionButtonText}>Submit Answer</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleNext}
            >
              <Text style={styles.actionButtonText}>
                {gameOver ? 'Return' : currentRoom.nextRoomId ? 'Next Room' : 'Complete Maze'}
              </Text>
              {!gameOver && <Icon name="ArrowRight2" size={20} color="#FFF" variant="Bold" />}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: THEME.bg,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  livesContainer: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  mapContainer: {
    marginBottom: 12,
  },
  mapPath: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  mapNodeWrapper: {
    alignItems: 'center',
    minWidth: 50,
  },
  mapNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.bg,
    borderWidth: 2,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapNodeCurrent: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primaryDark,
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  currentNodePulse: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapNodeCompleted: {
    backgroundColor: THEME.success,
    borderColor: THEME.success,
  },
  mapNodeCorrect: {
    backgroundColor: THEME.success,
    borderColor: THEME.success,
    borderWidth: 3,
  },
  mapNodeWrong: {
    backgroundColor: THEME.error,
    borderColor: THEME.error,
    borderWidth: 3,
  },
  mapNodeLocked: {
    backgroundColor: '#F3F4F6',
    borderColor: THEME.border,
    opacity: 0.5,
  },
  mapNodeNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.text,
  },
  mapNodeLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: THEME.primary,
    marginTop: 2,
  },
  mapNodeResultLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.success,
    marginTop: 2,
  },
  mapNodeResultLabelWrong: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.error,
    marginTop: 2,
  },
  mapPathLine: {
    flex: 1,
    height: 3,
    backgroundColor: THEME.border,
    marginHorizontal: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  mapPathFill: {
    height: '100%',
    backgroundColor: THEME.border,
  },
  mapPathFillCompleted: {
    backgroundColor: THEME.success,
  },
  mapPathFillWrong: {
    backgroundColor: THEME.error,
  },
  questionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: THEME.text,
    lineHeight: 20,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: THEME.bg,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.text,
  },
  answersContainer: {
    flex: 1,
    gap: 8,
    marginBottom: 12,
  },
  answerOption: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
  },
  answerOptionSelected: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primary + '08',
    borderWidth: 3,
  },
  answerOptionCorrect: {
    backgroundColor: THEME.success + '15',
    borderColor: THEME.success,
    borderWidth: 3,
  },
  answerOptionWrong: {
    backgroundColor: THEME.error + '15',
    borderColor: THEME.error,
    borderWidth: 3,
  },
  answerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.bg,
    borderWidth: 2,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerBadgeSelected: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primaryDark,
  },
  answerBadgeCorrect: {
    backgroundColor: THEME.success,
    borderColor: THEME.success,
  },
  answerBadgeWrong: {
    backgroundColor: THEME.error,
    borderColor: THEME.error,
  },
  answerBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
  },
  answerBadgeTextSelected: {
    color: '#FFF',
  },
  answerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
    lineHeight: 18,
  },
  answerTextSelected: {
    color: THEME.primary,
    fontWeight: '700',
  },
  answerTextCorrect: {
    color: THEME.success,
    fontWeight: '700',
  },
  answerTextWrong: {
    color: THEME.error,
    fontWeight: '700',
  },
  answerCheckmark: {
    marginLeft: 'auto',
  },
  explanationCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 15,
    color: THEME.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  scoreDisplay: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.primary,
  },
  actionContainer: {
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.primary,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: THEME.primaryDark,
    borderBottomWidth: 4,
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  gameOverCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 20,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  gameOverTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.error,
    marginTop: 12,
    marginBottom: 8,
  },
  gameOverText: {
    fontSize: 16,
    color: THEME.text,
    marginBottom: 4,
  },
  gameOverScore: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.primary,
    marginBottom: 20,
  },
  gameOverButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.primaryDark,
    borderBottomWidth: 4,
  },
  gameOverButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  completedCard: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  completedGradient: {
    padding: 40,
    alignItems: 'center',
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  completedScore: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  completedXP: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 24,
  },
  completedButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderBottomWidth: 4,
  },
  completedButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.success,
  },
});

