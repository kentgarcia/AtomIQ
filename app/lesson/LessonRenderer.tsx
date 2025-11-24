/**
 * Dynamic Lesson Renderer
 * Renders lesson steps based on content from the content system
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  runOnJS,
  interpolate,
  FadeInDown
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Icon } from '@/components/ui/icon';
import { LinearGradient } from 'expo-linear-gradient';
import { Lesson, LessonStep } from '@/content/types';

const { width, height } = Dimensions.get('window');

const THEME = {
  bg: '#F7F7F7',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#9CA3AF',
  primary: '#FF6B00',
  primaryDark: '#E65100',
  primaryLight: '#FF9E40',
  success: '#2ECC71',
  error: '#EF4444',
  gold: '#FFC107',
  border: '#E5E7EB',
};

// ============================================
// STEP RENDERERS
// ============================================

// 1. Briefing
export const BriefingRenderer = ({ data, onComplete }: { data: any; onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.fullScreenCenter}>
      <Animated.View entering={FadeInDown.springify()} style={styles.mascotLarge}>
        <Image 
          source={require('@/assets/images/mascot/explain.png')} 
          style={styles.mascotImage}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={styles.briefingTitle}>Topic: {data.topic}</Text>
      <Text style={styles.briefingSubtitle}>Mission: {data.mission}</Text>
      <View style={styles.loadingBar}>
        <Animated.View 
          entering={FadeInDown.delay(500).springify()}
          style={styles.loadingFill} 
        />
      </View>
    </View>
  );
};

// 2. Myth Buster
export const MythBusterRenderer = ({ data, onComplete }: { data: any; onComplete: () => void }) => {
  const translateX = useSharedValue(0);
  const cardRotate = useSharedValue(0);
  const [showFeedback, setShowFeedback] = useState<null | 'correct' | 'incorrect'>(null);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (showFeedback) return;
      translateX.value = event.translationX;
      cardRotate.value = interpolate(event.translationX, [-width, width], [-15, 15]);
    })
    .onEnd((event) => {
      if (showFeedback) return;
      if (Math.abs(event.translationX) > 100) {
        const isLeft = event.translationX < 0;
        translateX.value = withSpring(isLeft ? -width * 1.5 : width * 1.5);
        runOnJS(setShowFeedback)(isLeft ? 'correct' : 'incorrect');
      } else {
        translateX.value = withSpring(0);
        cardRotate.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${cardRotate.value}deg` }
    ]
  }));

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>MYTH BUSTER</Text>
      <Text style={styles.stepSubHeader}>Swipe LEFT for Myth, RIGHT for Fact</Text>

      <View style={styles.cardContainer}>
        {showFeedback ? (
          <Animated.View entering={FadeInDown} style={[styles.feedbackCard, showFeedback === 'correct' ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
            <Icon 
              name={showFeedback === 'correct' ? 'TickCircle' : 'CloseCircle'} 
              size={64} 
              color="#FFF" 
              variant="Bold" 
            />
            <Text style={styles.feedbackTitle}>
              {showFeedback === 'correct' ? 'Correct!' : 'Oops!'}
            </Text>
            <Text style={styles.feedbackText}>{data.explanation}</Text>
            <View style={styles.realityBox}>
              <Text style={styles.realityLabel}>REALITY:</Text>
              <Text style={styles.realityText}>{data.reality}</Text>
            </View>
            <TouchableOpacity style={styles.continueBtn} onPress={onComplete}>
              <Text style={styles.continueBtnText}>CONTINUE</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <GestureDetector gesture={pan}>
            <Animated.View style={[styles.swipeCard, cardStyle]}>
              <View style={styles.mythBadge}>
                <Icon name="Danger" size={24} color="#FFF" />
                <Text style={styles.mythBadgeText}>MYTH?</Text>
              </View>
              <Text style={styles.mythText}>"{data.myth}"</Text>
              {data.image && (
                <Image source={{ uri: data.image }} style={styles.mythImage} />
              )}
              <View style={styles.swipeInstructions}>
                <View style={styles.swipeLeft}>
                  <Icon name="ArrowLeft2" size={20} color={THEME.error} />
                  <Text style={{color: THEME.error, fontWeight:'700'}}>MYTH</Text>
                </View>
                <View style={styles.swipeRight}>
                  <Text style={{color: THEME.success, fontWeight:'700'}}>FACT</Text>
                  <Icon name="ArrowRight2" size={20} color={THEME.success} />
                </View>
              </View>
            </Animated.View>
          </GestureDetector>
        )}
      </View>
    </View>
  );
};

// 3. Micro Learn
export const MicroLearnRenderer = ({ data, onComplete }: { data: any; onComplete: () => void }) => {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>THE CONCEPT</Text>
      <Animated.View entering={FadeInDown.delay(200)} style={styles.conceptCard}>
        {data.image && (
          <Image source={{ uri: data.image }} style={styles.conceptImage} />
        )}
        <Text style={styles.conceptTitle}>{data.title}</Text>
        <Text style={styles.conceptText}>{data.content}</Text>
        
        {data.keyPoints && data.keyPoints.length > 0 && (
          <View style={styles.keyPointsContainer}>
            <Text style={styles.keyPointsTitle}>Key Points:</Text>
            {data.keyPoints.map((point: string, index: number) => (
              <View key={index} style={styles.keyPoint}>
                <Icon name="TickCircle" size={16} color={THEME.primary} variant="Bold" />
                <Text style={styles.keyPointText}>{point}</Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>

      <TouchableOpacity style={styles.mainBtn} onPress={onComplete}>
        <Text style={styles.mainBtnText}>GOT IT!</Text>
      </TouchableOpacity>
    </View>
  );
};

// 4. Lab
export const LabRenderer = ({ data, onComplete }: { data: any; onComplete: () => void }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleCheck = () => {
    setShowResult(true);
  };

  const isCorrect = selectedOption === data.correctAnswer;

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>{data.title}</Text>
      <Text style={styles.stepSubHeader}>{data.description}</Text>

      <View style={styles.labCard}>
        <Text style={styles.taskText}>{data.task}</Text>

        <View style={styles.optionsRow}>
          {data.options.map((option: any) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionBtn,
                selectedOption === option.id && styles.optionBtnActive
              ]}
              onPress={() => !showResult && setSelectedOption(option.id)}
            >
              {option.icon && (
                <Icon name={option.icon} size={24} color={selectedOption === option.id ? THEME.primary : THEME.textMuted} />
              )}
              <Text style={styles.optionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {showResult && (
          <Animated.View entering={FadeInDown} style={[styles.resultBox, isCorrect ? styles.resultCorrect : styles.resultIncorrect]}>
            <Icon 
              name={isCorrect ? 'TickCircle' : 'CloseCircle'} 
              size={32} 
              color={isCorrect ? THEME.success : THEME.error} 
              variant="Bold" 
            />
            <Text style={styles.resultText}>{data.explanation}</Text>
          </Animated.View>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.mainBtn, !selectedOption && styles.mainBtnDisabled]} 
        onPress={showResult ? onComplete : handleCheck}
        disabled={!selectedOption}
      >
        <Text style={styles.mainBtnText}>
          {showResult ? 'CONTINUE' : 'CHECK ANSWER'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// 5. Assessment
export const AssessmentRenderer = ({ data, onComplete }: { data: any; onComplete: () => void }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleCheck = () => {
    if (selected !== null && !confirmed) {
      setConfirmed(true);
    } else if (confirmed && selected === data.correctIndex) {
      onComplete();
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>ASSESSMENT</Text>
      
      <View style={styles.quizCard}>
        <Text style={styles.questionText}>{data.question}</Text>
        
        {data.image && (
          <Image source={{ uri: data.image }} style={styles.quizImage} />
        )}
        
        <View style={styles.quizOptions}>
          {data.options.map((opt: string, index: number) => {
            let btnStyle = styles.quizOption;
            if (confirmed) {
              if (index === data.correctIndex) btnStyle = styles.quizOptionCorrect;
              else if (index === selected) btnStyle = styles.quizOptionWrong;
            } else if (selected === index) {
              btnStyle = styles.quizOptionSelected;
            }

            return (
              <TouchableOpacity 
                key={opt} 
                style={btnStyle}
                onPress={() => !confirmed && setSelected(index)}
                activeOpacity={0.8}
              >
                <Text style={[styles.quizOptionText, (confirmed || selected === index) && { fontWeight: '700' }]}>
                  {opt}
                </Text>
                {confirmed && index === data.correctIndex && (
                  <Icon name="TickCircle" size={20} color={THEME.success} variant="Bold" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {confirmed && (
          <Animated.View entering={FadeInDown} style={styles.explanationBox}>
            <Text style={styles.explanationText}>{data.explanation}</Text>
          </Animated.View>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.mainBtn, selected === null && styles.mainBtnDisabled]} 
        onPress={handleCheck}
        disabled={selected === null}
      >
        <Text style={styles.mainBtnText}>
          {confirmed ? (selected === data.correctIndex ? 'CONTINUE' : 'TRY AGAIN') : 'CHECK ANSWER'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// 6. Debrief
export const DebriefRenderer = ({ data, levelId, onComplete }: { data: any; levelId: string; onComplete: () => void }) => {
  return (
    <View style={styles.fullScreenCenter}>
      <Animated.View entering={FadeInDown.springify()} style={styles.mascotLarge}>
        <Image 
          source={require('@/assets/images/mascot/happy.png')} 
          style={styles.mascotImageSuccess}
          resizeMode="contain"
        />
      </Animated.View>
      
      <Text style={styles.successTitle}>{data.title}</Text>
      <Text style={styles.successText}>{data.message}</Text>

      <View style={styles.rewardRow}>
        <View style={styles.rewardPill}>
          <Icon name="Flash" size={24} color={THEME.gold} variant="Bold" />
          <Text style={styles.rewardText}>+{data.rewards.xp} XP</Text>
        </View>
        <View style={styles.rewardPill}>
          <Icon name="Star1" size={24} color={THEME.gold} variant="Bold" />
          <Text style={styles.rewardText}>{data.rewards.stars} Stars</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.mainBtn} onPress={onComplete}>
        <Text style={styles.mainBtnText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  fullScreenCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  stepContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  stepHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.primary,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 8,
  },
  stepSubHeader: {
    fontSize: 13,
    color: THEME.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  mascotLarge: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotImage: {
    width: 200,
    height: 200,
  },
  mascotImageSuccess: {
    width: 220,
    height: 220,
  },
  briefingTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  briefingSubtitle: {
    fontSize: 18,
    color: THEME.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },
  loadingBar: {
    width: 200,
    height: 4,
    backgroundColor: THEME.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingFill: {
    width: '100%',
    height: '100%',
    backgroundColor: THEME.primary,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeCard: {
    width: width - 48,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 6,
  },
  mythBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    gap: 8,
  },
  mythBadgeText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
  },
  mythText: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  mythImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginBottom: 24,
  },
  swipeInstructions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  swipeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swipeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackCard: {
    width: width - 48,
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
  },
  feedbackCorrect: {
    backgroundColor: THEME.success,
  },
  feedbackIncorrect: {
    backgroundColor: THEME.error,
  },
  feedbackTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 16,
  },
  feedbackText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 16,
  },
  realityBox: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 24,
  },
  realityLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
  },
  realityText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  continueBtn: {
    backgroundColor: '#FFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
  },
  conceptCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  conceptImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  conceptTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 12,
  },
  conceptText: {
    fontSize: 16,
    color: THEME.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  keyPointsContainer: {
    marginTop: 16,
  },
  keyPointsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.primary,
    marginBottom: 12,
  },
  keyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    color: THEME.text,
    lineHeight: 20,
  },
  labCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  taskText: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 12,
    marginBottom: 24,
  },
  optionBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    gap: 8,
  },
  optionBtnActive: {
    borderColor: THEME.primary,
    backgroundColor: '#FFF5EB',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
    textAlign: 'center',
  },
  resultBox: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultCorrect: {
    backgroundColor: '#E8F5E9',
  },
  resultIncorrect: {
    backgroundColor: '#FEE2E2',
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    color: THEME.text,
  },
  quizCard: {
    marginBottom: 24,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 24,
    lineHeight: 28,
  },
  quizImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 24,
  },
  quizOptions: {
    gap: 12,
  },
  quizOption: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quizOptionSelected: {
    borderColor: THEME.primary,
    backgroundColor: '#FFF5EB',
  },
  quizOptionCorrect: {
    borderColor: THEME.success,
    backgroundColor: '#E8F5E9',
  },
  quizOptionWrong: {
    borderColor: THEME.error,
    backgroundColor: '#FEE2E2',
  },
  quizOptionText: {
    fontSize: 16,
    color: THEME.text,
  },
  explanationBox: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: THEME.primary,
  },
  explanationText: {
    fontSize: 14,
    color: THEME.text,
    lineHeight: 20,
  },
  mainBtn: {
    backgroundColor: THEME.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: THEME.primaryDark,
  },
  mainBtnDisabled: {
    opacity: 0.5,
  },
  mainBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: THEME.primary,
    marginBottom: 12,
  },
  successText: {
    fontSize: 18,
    color: THEME.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 48,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    gap: 8,
  },
  rewardText: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
  },
});

export default {
  BriefingRenderer,
  MythBusterRenderer,
  MicroLearnRenderer,
  LabRenderer,
  AssessmentRenderer,
  DebriefRenderer,
};

