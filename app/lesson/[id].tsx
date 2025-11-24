import { Icon } from '@/components/ui/icon';
import { getLessonById } from '@/content/lessons';
import { useStorage } from '@/services/StorageContext';
import { getLevelProgress, logDailyActivity, updateLevelProgress } from '@/services/database';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

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
  error: '#EF4444',
  gold: '#FFC107',
  border: '#E5E7EB',
};

// --- Components for Each Step ---

// 1. Briefing View
const BriefingView = ({ data, onComplete }: { data: any; onComplete: () => void }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.1, { duration: 1000 }), -1, true);
    const timer = setTimeout(onComplete, 3000); // Auto advance after 3s
    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.fullScreenCenter}>
      <Animated.View entering={FadeInDown.springify()} style={[styles.mascotLarge, animatedStyle]}>
        <Image 
          source={require('@/assets/images/mascot/explain.png')} 
          style={styles.mascotImage}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={styles.briefingTitle}>Topic: {data.topic}</Text>
      <Text style={styles.briefingSubtitle}>{data.mission}</Text>
      <View style={styles.loadingBar}>
        <Animated.View 
          style={[
            styles.loadingFill, 
            { width: withTiming('100%', { duration: 3000 }) }
          ]} 
        />
      </View>
    </View>
  );
};

// 2. MythBuster View (Swipe)
const MythBusterView = ({ data, onComplete }: { data: any; onComplete: () => void }) => {
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
        // Swiped
        const isLeft = event.translationX < 0;
        translateX.value = withSpring(isLeft ? -width * 1.5 : width * 1.5);
        
        // Logic: Myth is "False", so swiping Left (False) is Correct
        if (isLeft) {
           runOnJS(setShowFeedback)('correct');
        } else {
           runOnJS(setShowFeedback)('incorrect');
        }
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

  const leftOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-100, 0], [1, 0])
  }));

  const rightOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, 100], [0, 1])
  }));

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>MYTH BUSTER</Text>
      <Text style={styles.stepSubHeader}>Swipe LEFT for Myth, RIGHT for Fact</Text>

      <View style={styles.cardContainer}>
        {showFeedback ? (
          <Animated.View entering={FadeInDown} style={[styles.feedbackCard, showFeedback === 'correct' ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
            <View style={{marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.2)', padding: 16, borderRadius: 50}}>
              <Icon 
                name={showFeedback === 'correct' ? 'TickCircle' : 'CloseCircle'} 
                size={48} 
                color="#FFF" 
                variant="Bold" 
              />
            </View>
            <Text style={styles.feedbackTitle}>
              {showFeedback === 'correct' ? 'Correct!' : 'Oops!'}
            </Text>
            <Text style={styles.feedbackText}>
              {data.explanation}
            </Text>
            <View style={{backgroundColor: 'rgba(255,255,255,0.15)', padding: 16, borderRadius: 16, width: '100%', marginTop: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'}}>
              <Text style={{fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.8)', marginBottom: 8, letterSpacing: 1}}>REALITY</Text>
              <Text style={{fontSize: 16, color: '#FFF', fontWeight: '600', lineHeight: 24}}>{data.reality}</Text>
            </View>
            <TouchableOpacity style={styles.continueBtn} onPress={onComplete}>
              <Text style={[styles.continueBtnText, { color: showFeedback === 'correct' ? THEME.success : THEME.error }]}>CONTINUE</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <GestureDetector gesture={pan}>
            <Animated.View style={[styles.swipeCard, cardStyle]}>
              {/* Overlay Indications */}
              <Animated.View style={[styles.overlayIndicator, { right: 20, backgroundColor: THEME.success }, rightOpacity]}>
                <Text style={styles.overlayText}>TRUE</Text>
              </Animated.View>
              <Animated.View style={[styles.overlayIndicator, { left: 20, backgroundColor: THEME.error }, leftOpacity]}>
                <Text style={styles.overlayText}>FALSE</Text>
              </Animated.View>

              <View style={styles.mythBadge}>
                <Icon name="Danger" size={24} color="#FFF" />
                <Text style={styles.mythBadgeText}>MYTH?</Text>
              </View>
              <Text style={styles.mythText}>"{data.myth}"</Text>
              <View style={styles.swipeInstructions}>
                <View style={styles.swipeLeft}><Icon name="ArrowLeft2" size={24} color={THEME.error} variant="Bold" /><Text style={{color: THEME.error, fontWeight:'800', fontSize: 14}}>FALSE</Text></View>
                <View style={styles.swipeRight}><Text style={{color: THEME.success, fontWeight:'800', fontSize: 14}}>TRUE</Text><Icon name="ArrowRight2" size={24} color={THEME.success} variant="Bold" /></View>
              </View>
            </Animated.View>
          </GestureDetector>
        )}
      </View>
    </View>
  );
};

// 3. MicroLearn View
const MicroLearnView = ({ data, onComplete }: { data: any; onComplete: () => void }) => {
  return (
    <View style={styles.stepContainer}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100)} style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={styles.conceptBadge}>
            <Icon name="Book" size={20} color="#FFF" variant="Bold" />
            <Text style={styles.conceptBadgeText}>LEARN</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.conceptCard}>
          <Animated.View entering={FadeInDown.delay(300)} style={styles.conceptImageContainer}>
            <Image 
              source={require('@/assets/images/mascot/idea.png')} 
              style={styles.conceptMascot}
              resizeMode="contain"
            />
          </Animated.View>
          
          <Text style={styles.conceptTitle}>{data.title}</Text>
          <Text style={styles.conceptText}>{data.content}</Text>
          
          {data.keyPoints && data.keyPoints.length > 0 && (
            <View style={styles.keyPointsWrapper}>
              {data.keyPoints.map((point: string, index: number) => (
                <Animated.View 
                  key={index} 
                  entering={FadeInDown.delay(400 + index * 100)}
                  style={styles.keyPointRow}
                >
                  <View style={styles.keyPointDot}>
                    <Icon name="TickCircle" size={18} color={THEME.primary} variant="Bold" />
                  </View>
                  <Text style={styles.keyPointText}>{point}</Text>
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(600)} style={{ width: '100%', paddingTop: 16 }}>
        <TouchableOpacity style={styles.mainBtn} onPress={onComplete}>
          <Text style={styles.mainBtnText}>GOT IT</Text>
          <Icon name="ArrowRight2" size={20} color="#FFF" variant="Bold" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// 4. Lab View (Mini Sim)
const LabView = ({ data, onComplete }: { data: any; onComplete: () => void }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleSelect = (optionId: string) => {
    setSelectedOption(optionId);
    setShowFeedback(true);
  };

  const isCorrect = selectedOption === data.correctAnswer;

  return (
    <View style={styles.stepContainer}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100)} style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={[styles.conceptBadge, { backgroundColor: '#8B5CF6' }]}>
            <Icon name="Microscope" size={20} color="#FFF" variant="Bold" />
            <Text style={styles.conceptBadgeText}>LAB</Text>
          </View>
        </Animated.View>

        <Text style={styles.stepSubHeader}>{data.title}</Text>
        
        <Animated.View entering={FadeInDown.delay(200)} style={styles.labCard}>
          <View style={styles.labIconWrapper}>
            <Image 
              source={require('@/assets/images/mascot/experiment.png')} 
              style={styles.labMascot}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.conceptText}>{data.description}</Text>
          <View style={styles.taskBox}>
            <Text style={styles.taskLabel}>YOUR TASK</Text>
            <Text style={styles.taskText}>{data.task}</Text>
          </View>
        </Animated.View>

        {/* Options */}
        <View style={styles.optionsRow}>
        {data.options.map((option: any, index: number) => {
          const isSelected = selectedOption === option.id;
          const showCorrect = showFeedback && option.id === data.correctAnswer;
          const showWrong = showFeedback && isSelected && !isCorrect;

          let buttonStyle: any = styles.optionBtn;
          
          if (isSelected && !showFeedback) {
            buttonStyle = [styles.optionBtn, styles.optionBtnActive];
          } else if (showCorrect) {
            buttonStyle = [styles.optionBtn, { borderColor: THEME.success, backgroundColor: THEME.success + '20' }];
          } else if (showWrong) {
            buttonStyle = [styles.optionBtn, { borderColor: THEME.error, backgroundColor: THEME.error + '20' }];
          }

          return (
            <Animated.View key={option.id} entering={FadeInDown.delay(300 + index * 100)} style={{ flex: 1 }}>
              <TouchableOpacity 
                style={buttonStyle}
                onPress={() => !showFeedback && handleSelect(option.id)}
                disabled={showFeedback}
              >
                <Icon name={option.icon as any} size={32} color={showCorrect ? THEME.success : showWrong ? THEME.error : THEME.primary} variant="Bold" />
                <Text style={[styles.optionText, { textAlign: 'center', marginTop: 8, fontSize: 13 }]}>{option.label}</Text>
                {showCorrect && <View style={styles.correctBadge}><Icon name="TickCircle" size={18} color={THEME.success} variant="Bold" /></View>}
                {showWrong && <View style={styles.wrongBadge}><Icon name="CloseCircle" size={18} color={THEME.error} variant="Bold" /></View>}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

        {showFeedback && (
          <Animated.View entering={FadeInDown} style={[styles.feedbackBox, { backgroundColor: isCorrect ? THEME.success + '15' : THEME.error + '15', borderColor: isCorrect ? THEME.success : THEME.error }]}>
            <View style={styles.feedbackHeader}>
              {isCorrect ? (
                <Image 
                  source={require('@/assets/images/mascot/happy.png')} 
                  style={styles.feedbackMascot}
                  resizeMode="contain"
                />
              ) : (
                <Image 
                  source={require('@/assets/images/mascot/fix.png')} 
                  style={styles.feedbackMascot}
                  resizeMode="contain"
                />
              )}
              <Text style={[styles.feedbackHeaderText, { color: isCorrect ? THEME.success : THEME.error }]}>
                {isCorrect ? "Perfect!" : "Not quite!"}
              </Text>
            </View>
            <Text style={styles.conceptText}>{data.explanation}</Text>
          </Animated.View>
        )}
      </ScrollView>

      {showFeedback && (
        <Animated.View entering={FadeInDown.delay(200)} style={{ width: '100%', paddingTop: 16 }}>
          <TouchableOpacity 
            style={[styles.mainBtn, isCorrect ? { backgroundColor: THEME.success, borderColor: '#25A25A' } : {}]} 
            onPress={onComplete}
          >
            <Text style={styles.mainBtnText}>CONTINUE</Text>
            <Icon name="ArrowRight2" size={20} color="#FFF" variant="Bold" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

// 5. Assessment (Quiz)
const AssessmentView = ({ data, onComplete }: { data: any; onComplete: () => void }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const correctIndex = data.correctIndex;

  const handleCheck = () => {
    if (selected === null) return;
    if (!confirmed) {
      setConfirmed(true);
    } else {
      // User clicked continue after seeing feedback
      onComplete();
    }
  };

  return (
    <View style={styles.stepContainer}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100)} style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={[styles.conceptBadge, { backgroundColor: THEME.gold }]}>
            <Icon name="DocumentText" size={20} color="#FFF" variant="Bold" />
            <Text style={styles.conceptBadgeText}>QUIZ</Text>
          </View>
        </Animated.View>
        
        <Animated.View entering={FadeInDown.delay(200)} style={styles.quizCard}>
        <View style={styles.questionIconWrapper}>
          <Icon name="MessageQuestion" size={28} color={THEME.primary} variant="Bold" />
        </View>
        <Text style={styles.questionText}>{data.question}</Text>
        
        <View style={styles.quizOptions}>
          {data.options.map((opt: string, index: number) => {
            const btnStyle = [styles.quizOption];
            
            if (confirmed) {
              if (index === correctIndex) {
                btnStyle.push(styles.quizOptionCorrect);
              } else if (index === selected) {
                btnStyle.push(styles.quizOptionWrong);
              }
            } else if (selected === index) {
              btnStyle.push(styles.quizOptionSelected);
            }

            const optionLetter = String.fromCharCode(65 + index); // A, B, C, D

            return (
              <Animated.View key={opt} entering={FadeInDown.delay(300 + index * 100)}>
                <TouchableOpacity 
                  style={btnStyle}
                  onPress={() => !confirmed && setSelected(index)}
                  activeOpacity={0.8}
                  disabled={confirmed}
                >
                  <View style={styles.quizOptionContent}>
                    <View style={[
                      styles.optionLetter,
                      selected === index && !confirmed && { backgroundColor: THEME.primary },
                      confirmed && index === correctIndex && { backgroundColor: THEME.success },
                      confirmed && index === selected && index !== correctIndex && { backgroundColor: THEME.error }
                    ]}>
                      <Text style={[
                        styles.optionLetterText,
                        (selected === index || (confirmed && index === correctIndex)) && { color: '#FFF' }
                      ]}>{optionLetter}</Text>
                    </View>
                    <Text style={[styles.quizOptionText, (confirmed || selected === index) && { fontWeight: '700' }]}>{opt}</Text>
                  </View>
                  {confirmed && index === correctIndex && <Icon name="TickCircle" size={24} color={THEME.success} variant="Bold" />}
                  {confirmed && index === selected && index !== correctIndex && <Icon name="CloseCircle" size={24} color={THEME.error} variant="Bold" />}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>

        {confirmed && (
          <Animated.View entering={FadeInDown} style={[styles.feedbackBox, { backgroundColor: selected === correctIndex ? THEME.success + '15' : THEME.error + '15', borderColor: selected === correctIndex ? THEME.success : THEME.error }]}>
            <View style={styles.feedbackHeader}>
              {selected === correctIndex ? (
                <Image 
                  source={require('@/assets/images/mascot/happy.png')} 
                  style={styles.feedbackMascot}
                  resizeMode="contain"
                />
              ) : (
                <Image 
                  source={require('@/assets/images/mascot/fix.png')} 
                  style={styles.feedbackMascot}
                  resizeMode="contain"
                />
              )}
              <Text style={[styles.feedbackHeaderText, { color: selected === correctIndex ? THEME.success : THEME.error }]}>
                {selected === correctIndex ? "Excellent!" : "Explanation"}
              </Text>
            </View>
            <Text style={styles.conceptText}>{data.explanation}</Text>
          </Animated.View>
        )}
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(confirmed ? 0 : 400)} style={{ width: '100%', paddingTop: 16 }}>
        <TouchableOpacity 
          style={[
            styles.mainBtn, 
            selected === null && styles.mainBtnDisabled,
            confirmed && selected === correctIndex && { backgroundColor: THEME.success, borderColor: '#25A25A' }
          ]} 
          onPress={handleCheck}
          disabled={selected === null}
        >
          {!confirmed && <Icon name="TickSquare" size={20} color="#FFF" variant="Bold" />}
          {confirmed && <Icon name="ArrowRight2" size={20} color="#FFF" variant="Bold" />}
          <Text style={styles.mainBtnText}>
            {confirmed ? 'CONTINUE' : 'CHECK ANSWER'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// 6. Debrief (Success)
const DebriefView = ({ data, levelId }: { data: any; levelId: string }) => {
  const router = useRouter();
  const { addXP, updateUserProfile, userProfile } = useStorage();
  const [saved, setSaved] = useState(false);
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Celebration animation
    scale.value = withSpring(1, { damping: 8 });
    rotation.value = withRepeat(withTiming(360, { duration: 2000 }), -1, false);

    // Save progress when reaching this screen
    const saveProgress = async () => {
      if (saved) return;
      
      try {
        // Check if lesson is already completed
        const existingProgress = await getLevelProgress(levelId);
        const isAlreadyCompleted = existingProgress?.status === 'completed';
        
        const xpEarned = data.rewards?.xp || 50;
        const stars = data.rewards?.stars || 3;
        
        // Update level progress (always update to mark as completed)
        await updateLevelProgress(levelId, {
          status: 'completed',
          xp_earned: xpEarned,
          stars: stars,
          completed_at: existingProgress?.completed_at || new Date().toISOString()
        });
        
        // Only award rewards if this is the first completion
        if (!isAlreadyCompleted) {
          // Add XP to user
          await addXP(xpEarned);
          
          // Increment lessons completed
          if (userProfile) {
            await updateUserProfile({
              lessons_completed: userProfile.lessons_completed + 1
            });
          }
          
          // Log daily activity
          const today = new Date().toISOString().split('T')[0];
          await logDailyActivity(today, {
            xp_earned: xpEarned,
            lessons_completed: 1,
            time_spent_minutes: 5
          });
          
          console.log('Lesson completed for the first time! Rewards awarded.');
        } else {
          console.log('Lesson already completed. No rewards awarded.');
        }
        
        setSaved(true);
      } catch (error) {
        console.error('Error saving lesson progress:', error);
      }
    };
    
    saveProgress();
  }, [saved, levelId, addXP, updateUserProfile, userProfile]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const xpReward = data.rewards?.xp || 50;
  const starsReward = data.rewards?.stars || 3;

  return (
    <View style={styles.fullScreenCenter}>
      {/* Decorative rotating rings */}
      <Animated.View style={[styles.decorativeRing, rotationStyle]} />
      
      <Animated.View entering={FadeInDown.springify()} style={[styles.mascotLarge, animatedStyle]}>
        <Image 
          source={require('@/assets/images/mascot/happy.png')} 
          style={styles.mascotImageSuccess}
          resizeMode="contain"
        />
      </Animated.View>
      
      <Animated.View entering={FadeInDown.delay(200)}>
        <Text style={styles.successTitle}>{data.title || 'Mission Complete!'}</Text>
        <Text style={styles.successText}>{data.message || 'Great job! You\'ve completed this lesson.'}</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400)} style={styles.rewardRow}>
        <View style={styles.rewardPill}>
          <LinearGradient
            colors={[THEME.primary, THEME.primaryLight]}
            style={styles.rewardIconWrapper}
          >
            <Icon name="Flash" size={20} color="#FFF" variant="Bold" />
          </LinearGradient>
          <View>
            <Text style={styles.rewardLabel}>XP Earned</Text>
            <Text style={styles.rewardText}>+{xpReward}</Text>
          </View>
        </View>
        <View style={styles.rewardPill}>
          <LinearGradient
            colors={[THEME.gold, '#FFA000']}
            style={styles.rewardIconWrapper}
          >
            <Icon name="Star1" size={20} color="#FFF" variant="Bold" />
          </LinearGradient>
          <View>
            <Text style={styles.rewardLabel}>Stars</Text>
            <Text style={styles.rewardText}>{starsReward}</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(600)} style={{ width: '100%' }}>
        <TouchableOpacity style={[styles.mainBtn, { backgroundColor: THEME.success, borderColor: '#25A25A' }]} onPress={() => router.back()}>
          <Text style={styles.mainBtnText}>CONTINUE</Text>
          <Icon name="ArrowRight2" size={20} color="#FFF" variant="Bold" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const [step, setStep] = useState(0);
  const router = useRouter();
  const levelId = typeof id === 'string' ? id : 'radiation-shielding';
  
  // Load lesson from content system
  const lesson = getLessonById(levelId);

  // Mark level as in progress when starting
  useEffect(() => {
    const markInProgress = async () => {
      try {
        await updateLevelProgress(levelId, {
          status: 'in_progress'
        });
      } catch (error) {
        console.error('Error marking level in progress:', error);
      }
    };
    
    markInProgress();
  }, [levelId]);

  // If lesson not found, show error
  if (!lesson) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
        <Icon name="Danger" size={64} color={THEME.error} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: THEME.text, marginTop: 16 }}>
          Lesson not found
        </Text>
        <TouchableOpacity 
          style={{ marginTop: 24, backgroundColor: THEME.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#FFF', fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Simple step manager
  const nextStep = () => setStep(s => s + 1);

  // Get current step from lesson
  const currentStep = lesson.steps[step];
  
  if (!currentStep) {
    // All steps completed, go back
    router.back();
    return null;
  }

  const renderStep = () => {
    switch(currentStep.type) {
      case 'briefing':
        return <BriefingView data={currentStep.data} onComplete={nextStep} />;
      case 'myth_buster':
        return <MythBusterView data={currentStep.data} onComplete={nextStep} />;
      case 'micro_learn':
        return <MicroLearnView data={currentStep.data} onComplete={nextStep} />;
      case 'lab':
        return <LabView data={currentStep.data} onComplete={nextStep} />;
      case 'assessment':
        return <AssessmentView data={currentStep.data} onComplete={nextStep} />;
      case 'debrief':
        return <DebriefView data={currentStep.data} levelId={levelId} />;
      default:
        return <BriefingView data={currentStep.data} onComplete={nextStep} />;
    }
  };

  const totalSteps = lesson.steps.length;
  const isFirstStep = step === 0;
  const isLastStep = step === totalSteps - 1;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#FFF' }}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Progress Header - Show for all steps except first (briefing) and last (debrief) */}
          {!isFirstStep && !isLastStep && (
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                <Icon name="Close" size={24} color={THEME.textMuted} />
              </TouchableOpacity>
              <View style={styles.progressBarBg}>
                <Animated.View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${((step + 1) / totalSteps) * 100}%` }
                  ]} 
                />
              </View>
            </View>
          )}
          
          <View style={{ flex: 1 }}>
            {renderStep()}
          </View>
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  // Layout
  stepContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  fullScreenCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 50,
  },
  progressBarBg: {
    flex: 1,
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    marginLeft: 16,
    marginRight: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.primary,
    borderRadius: 6,
  },

  // Briefing
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
    fontSize: 24,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  briefingSubtitle: {
    fontSize: 18,
    color: THEME.textMuted,
    marginBottom: 48,
    textAlign: 'center',
  },
  loadingBar: {
    width: '80%',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  loadingFill: {
    height: '100%',
    backgroundColor: THEME.primary,
  },

  // Headers
  stepHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.textMuted,
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
    textAlign: 'center',
  },
  stepSubHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 32,
  },

  // Buttons
  mainBtn: {
    backgroundColor: THEME.primary,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderColor: THEME.primaryDark,
    width: '100%',
    marginTop: 'auto',
    flexDirection: 'row',
    gap: 8,
  },
  mainBtnDisabled: {
    backgroundColor: THEME.textMuted,
    borderColor: '#6B7280',
  },
  mainBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },

  // MythBuster
  cardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 400,
  },
  swipeCard: {
    width: width - 48,
    height: 350,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  mythBadge: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mythBadgeText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
  },
  mythText: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 40,
  },
  swipeInstructions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  swipeLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swipeRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  feedbackCard: {
    width: width - 48,
    height: 350,
    backgroundColor: THEME.primary,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackCorrect: { backgroundColor: THEME.success },
  feedbackIncorrect: { backgroundColor: THEME.error },
  feedbackTitle: { fontSize: 28, fontWeight: '800', color: '#FFF', marginBottom: 12 },
  feedbackText: { fontSize: 18, color: '#FFF', textAlign: 'center', lineHeight: 26 },
  continueBtn: { 
    backgroundColor: '#FFF', 
    paddingHorizontal: 32, 
    paddingVertical: 14, 
    borderRadius: 16,
    borderBottomWidth: 4,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  continueBtnText: { fontWeight: '800', fontSize: 16 },
  overlayIndicator: {
    position: 'absolute',
    top: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  overlayText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 2,
  },

  // MicroLearn
  conceptBadge: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 3,
    borderColor: THEME.primaryDark,
  },
  conceptBadgeText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  conceptCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    marginBottom: 24,
  },
  conceptImageContainer: {
    height: 150,
    marginBottom: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conceptMascot: {
    width: 120,
    height: 120,
  },
  labMascot: {
    width: 56,
    height: 56,
  },
  conceptTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: THEME.text, 
    marginBottom: 12,
    lineHeight: 30,
  },
  conceptText: { 
    fontSize: 16, 
    color: THEME.text, 
    lineHeight: 26,
    marginBottom: 8,
  },
  keyPointsWrapper: {
    marginTop: 20,
    gap: 12,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  keyPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  keyPointDot: {
    marginTop: 2,
  },
  keyPointText: {
    flex: 1,
    fontSize: 15,
    color: THEME.text,
    lineHeight: 22,
    fontWeight: '500',
  },

  // Lab
  labCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    marginBottom: 24,
  },
  labIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6' + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  taskBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  taskLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 1,
    marginBottom: 6,
  },
  taskText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    lineHeight: 22,
  },
  optionsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    gap: 12, 
    marginBottom: 24 
  },
  optionBtn: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    minHeight: 100,
  },
  optionBtnActive: { 
    borderColor: THEME.primary, 
    backgroundColor: THEME.primary + '10',
    transform: [{ scale: 1.05 }],
  },
  optionText: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: THEME.text 
  },
  correctBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: THEME.success,
    borderRadius: 12,
    padding: 4,
  },
  wrongBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: THEME.error,
    borderRadius: 12,
    padding: 4,
  },
  feedbackBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 24,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  feedbackMascot: {
    width: 40,
    height: 40,
  },
  feedbackHeaderText: {
    fontSize: 18,
    fontWeight: '800',
  },

  // Quiz
  quizCard: { 
    marginBottom: 24,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  questionIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  questionText: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: THEME.text, 
    marginBottom: 24, 
    lineHeight: 30 
  },
  quizOptions: { gap: 12 },
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
  quizOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.text,
  },
  quizOptionSelected: { 
    borderColor: THEME.primary, 
    backgroundColor: THEME.primary + '08',
    transform: [{ scale: 1.02 }],
  },
  quizOptionCorrect: { 
    borderColor: THEME.success, 
    backgroundColor: THEME.success + '15' 
  },
  quizOptionWrong: { 
    borderColor: THEME.error, 
    backgroundColor: THEME.error + '15' 
  },
  quizOptionText: { 
    fontSize: 16, 
    color: THEME.text,
    flex: 1,
    lineHeight: 22,
  },

  // Debrief
  decorativeRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: THEME.gold + '30',
    borderStyle: 'dashed',
  },
  successTitle: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: THEME.text, 
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: { 
    fontSize: 18, 
    color: THEME.textMuted, 
    textAlign: 'center', 
    marginBottom: 40,
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  rewardRow: { 
    flexDirection: 'row', 
    gap: 16, 
    marginBottom: 48,
    width: '100%',
    justifyContent: 'center',
  },
  rewardPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderRadius: 20,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    gap: 12,
    minWidth: 140,
  },
  rewardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rewardText: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: THEME.text 
  },
});

