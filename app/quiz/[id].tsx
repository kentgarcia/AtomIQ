import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Icon } from '@/components/ui/icon';
import { LinearGradient } from 'expo-linear-gradient';
import { useStorage } from '@/services/StorageContext';
import { logDailyActivity } from '@/services/database';
import { getQuizById } from '@/content/quizzes';

const THEME = {
  bg: '#F7F7F7',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#9CA3AF',
  primary: '#FF6B00',
  primaryDark: '#E65100',
  success: '#2ECC71',
  error: '#EF4444',
  gold: '#FFC107',
  border: '#E5E7EB',
};

export default function QuizScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { addXP } = useStorage();
  
  const [quiz, setQuiz] = useState(() => getQuizById(id as string));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);

  if (!quiz) {
    return (
      <View style={styles.fullScreenCenter}>
        <Text style={styles.errorText}>Quiz not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleAnswerSelect = (index: number) => {
    if (showExplanation) return; // Prevent changing answer after submission
    setSelectedAnswer(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    setAnswers([...answers, isCorrect]);
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      // Quiz complete
      const correctCount = answers.filter(a => a).length + (selectedAnswer === currentQuestion.correctAnswer ? 1 : 0);
      const score = Math.round((correctCount / totalQuestions) * 100);
      const passed = score >= quiz.passingScore;
      
      if (passed) {
        addXP(quiz.xpReward);
        logDailyActivity(new Date().toISOString().split('T')[0], {
          xp_earned: quiz.xpReward,
          quizzes_completed: 1
        });
      }
      
      setQuizComplete(true);
    }
  };

  if (quizComplete) {
    const correctCount = answers.filter(a => a).length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= quiz.passingScore;

    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg }}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.resultsContainer}>
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.resultsIcon}>
              <Icon name={passed ? "Cup" : "InfoCircle"} size={80} color={passed ? THEME.gold : THEME.primary} variant="Bold" />
            </Animated.View>

            <Text style={styles.resultsTitle}>{passed ? "Quiz Passed!" : "Keep Learning!"}</Text>
            <Text style={styles.resultsSubtitle}>
              You scored {score}% ({correctCount}/{totalQuestions} correct)
            </Text>

            <View style={styles.resultsCard}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Score</Text>
                <Text style={[styles.resultValue, { color: passed ? THEME.success : THEME.error }]}>
                  {score}%
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Passing Score</Text>
                <Text style={styles.resultValue}>{quiz.passingScore}%</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>XP Earned</Text>
                <Text style={[styles.resultValue, { color: THEME.gold }]}>
                  {passed ? `+${quiz.xpReward}` : "0"} XP
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => router.back()}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="Close" size={24} color={THEME.textMuted} />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {currentQuestionIndex + 1} / {totalQuestions}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Question Card */}
          <Animated.View entering={FadeInDown.springify()} style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <View style={styles.pointsBadge}>
                <Icon name="Flash" size={16} color={THEME.gold} variant="Bold" />
                <Text style={styles.pointsText}>{currentQuestion.points} pts</Text>
              </View>
            </View>

            <Text style={styles.questionText}>{currentQuestion.question}</Text>

            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === currentQuestion.correctAnswer;
                const showCorrect = showExplanation && isCorrect;
                const showWrong = showExplanation && isSelected && !isCorrect;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionButton,
                      isSelected && !showExplanation && styles.optionSelected,
                      showCorrect && styles.optionCorrect,
                      showWrong && styles.optionWrong,
                    ]}
                    onPress={() => handleAnswerSelect(index)}
                    disabled={showExplanation}
                  >
                    <Text style={[
                      styles.optionText,
                      (isSelected || showCorrect || showWrong) && styles.optionTextSelected
                    ]}>
                      {option}
                    </Text>
                    {showCorrect && <Icon name="TickCircle" size={24} color="#FFF" variant="Bold" />}
                    {showWrong && <Icon name="CloseCircle" size={24} color="#FFF" variant="Bold" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {showExplanation && (
              <Animated.View entering={FadeInDown.springify()} style={styles.explanationCard}>
                <View style={styles.explanationHeader}>
                  <Icon name="InfoCircle" size={20} color={THEME.primary} />
                  <Text style={styles.explanationTitle}>Explanation</Text>
                </View>
                <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
              </Animated.View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          {!showExplanation ? (
            <TouchableOpacity
              style={[styles.actionButton, selectedAnswer === null && styles.actionButtonDisabled]}
              onPress={handleSubmitAnswer}
              disabled={selectedAnswer === null}
            >
              <Text style={styles.actionButtonText}>Check Answer</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleNext}
            >
              <Text style={styles.actionButtonText}>
                {currentQuestionIndex < totalQuestions - 1 ? "Next Question" : "Finish Quiz"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.bg,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  header: {
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
    backgroundColor: THEME.primary,
    borderRadius: 3,
  },
  content: {
    padding: 20,
  },
  questionCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.gold + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.gold,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 24,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.bg,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  optionSelected: {
    backgroundColor: THEME.primary + '20',
    borderColor: THEME.primary,
  },
  optionCorrect: {
    backgroundColor: THEME.success,
    borderColor: THEME.success,
  },
  optionWrong: {
    backgroundColor: THEME.error,
    borderColor: THEME.error,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    flex: 1,
  },
  optionTextSelected: {
    color: '#FFF',
  },
  explanationCard: {
    marginTop: 20,
    padding: 16,
    backgroundColor: THEME.primary + '10',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.primary + '30',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.primary,
  },
  explanationText: {
    fontSize: 14,
    color: THEME.text,
    lineHeight: 20,
  },
  actionContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  actionButton: {
    backgroundColor: THEME.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  actionButtonDisabled: {
    backgroundColor: THEME.border,
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  resultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  resultsIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: THEME.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.text,
    marginBottom: 8,
  },
  resultsSubtitle: {
    fontSize: 16,
    color: THEME.textMuted,
    marginBottom: 32,
  },
  resultsCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    marginBottom: 32,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  resultValue: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
  },
  continueButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

