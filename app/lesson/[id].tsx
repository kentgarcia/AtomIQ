import { Icon } from '@/components/ui/icon';
import { getLessonById } from '@/content/lessons';
import { useStorage } from '@/services/StorageContext';
import { getLevelProgress, logDailyActivity, unlockNextLevel, updateLevelProgress } from '@/services/database';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
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
const LightTHEME = {
  bg: '#F7F7F7',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#9CA3AF',
  primary: '#EA580C',
  primaryDark: '#C2410C',
  primaryLight: '#FB923C',
  success: '#2ECC71',
  error: '#EF4444',
  gold: '#FFC107',
  border: '#E5E7EB',
};

const DarkTHEME = {
  bg: '#172B4D',
  card: '#213356',
  text: '#F6F9FC',
  textMuted: '#8898AA',
  primary: '#EA580C',
  primaryDark: '#C2410C',
  primaryLight: '#FB923C',
  success: '#2ECC71',
  error: '#EF4444',
  gold: '#FFC107',
  border: '#2D3A56',
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

// 2. MythBuster View (Creative Flashcard with Read Aloud)
const MythBusterView = ({ data, onComplete }: { data: any; onComplete: () => void }) => {
  const translateX = useSharedValue(0);
  const cardRotate = useSharedValue(0);
  const [showFeedback, setShowFeedback] = useState<null | 'correct' | 'incorrect'>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [leftIndicator, setLeftIndicator] = useState(0);
  const [rightIndicator, setRightIndicator] = useState(0);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const speakMyth = async () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(data.myth, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
  };

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (showFeedback) return;
      translateX.value = event.translationX;
      cardRotate.value = interpolate(event.translationX, [-width, width], [-5, 5]); // Very subtle rotation
      
      runOnJS(setLeftIndicator)(Math.max(0, Math.min(1, -event.translationX / 100)));
      runOnJS(setRightIndicator)(Math.max(0, Math.min(1, event.translationX / 100)));
    })
    .onEnd((event) => {
      if (showFeedback) return;
      runOnJS(setLeftIndicator)(0);
      runOnJS(setRightIndicator)(0);
      
      if (Math.abs(event.translationX) > 120) {
        const isLeft = event.translationX < 0;
        translateX.value = withTiming(isLeft ? -width * 1.5 : width * 1.5, { duration: 200 });
        runOnJS(Speech.stop)();
        runOnJS(setIsSpeaking)(false);
        runOnJS(setShowFeedback)(isLeft ? 'correct' : 'incorrect');
      } else {
        translateX.value = withSpring(0, { damping: 20 });
        cardRotate.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${cardRotate.value}deg` },
    ]
  }));

  return (
    <View style={styles.stepContainer}>
      {/* Full Height Swipe Indicators */}
      <View style={mythStyles.fullHeightIndicators}>
        <Animated.View style={[mythStyles.indicatorLeftFull, { opacity: leftIndicator }]}>
          <LinearGradient
            colors={['rgba(239,68,68,0.5)', 'rgba(239,68,68,0.2)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={mythStyles.indicatorContent}>
            <Icon name="Forbidden2" size={48} color={THEME.error} />
            <Text style={mythStyles.indicatorTextLeft}>MYTH</Text>
          </View>
        </Animated.View>
        
        <Animated.View style={[mythStyles.indicatorRightFull, { opacity: rightIndicator }]}>
          <LinearGradient
            colors={['transparent', 'rgba(46,204,113,0.2)', 'rgba(46,204,113,0.5)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={mythStyles.indicatorContent}>
            <Icon name="TickCircle" size={48} color={THEME.success} variant="Bold" />
            <Text style={mythStyles.indicatorTextRight}>FACT</Text>
          </View>
        </Animated.View>
      </View>

      <Text style={styles.stepHeader}>MYTH BUSTER</Text>
      <Text style={styles.stepSubHeader}>Swipe LEFT for Myth, RIGHT for Fact</Text>

      <View style={styles.cardContainer}>
        {showFeedback ? (
          <Animated.View entering={FadeInDown.duration(300)} style={[mythStyles.resultCard, showFeedback === 'correct' ? mythStyles.resultCorrect : mythStyles.resultIncorrect]}>
            {/* Speaker Button - Top Right */}
            <TouchableOpacity 
              style={mythStyles.speakerBtn}
              onPress={() => Speech.speak(`${data.explanation}. The reality is: ${data.reality}`, { language: 'en', rate: 0.9 })}
            >
              <Icon name="VolumeHigh" size={22} color={showFeedback === 'correct' ? THEME.success : THEME.error} />
            </TouchableOpacity>

            {/* Result Icon */}
            <View style={[mythStyles.resultIconCircle, { backgroundColor: showFeedback === 'correct' ? THEME.success : THEME.error }]}>
              <Icon 
                name={showFeedback === 'correct' ? 'TickCircle' : 'CloseCircle'} 
                size={36} 
                color="#FFF" 
                variant="Bold" 
              />
            </View>
            
            <Text style={mythStyles.resultTitle}>
              {showFeedback === 'correct' ? 'Correct!' : 'Oops!'}
            </Text>

            {/* Explanation */}
            <Text style={mythStyles.resultExplanation}>{data.explanation}</Text>

            {/* Reality Box */}
            <View style={mythStyles.realityBox}>
              <Text style={mythStyles.realityLabel}>THE REALITY</Text>
              <Text style={mythStyles.realityText}>{data.reality}</Text>
            </View>

            {/* Continue Button */}
            <TouchableOpacity 
              style={[mythStyles.resultContinueBtn, { backgroundColor: showFeedback === 'correct' ? THEME.success : THEME.error, borderBottomColor: showFeedback === 'correct' ? '#1F9D55' : '#C53030' }]} 
              onPress={onComplete}
            >
              <Text style={mythStyles.resultContinueBtnText}>CONTINUE</Text>
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
              
              {/* Read Aloud Button */}
              <TouchableOpacity 
                style={[mythStyles.speakBtn, isSpeaking && mythStyles.speakBtnActive]} 
                onPress={speakMyth}
              >
                <Icon 
                  name={isSpeaking ? "VolumeSlash" : "VolumeHigh"} 
                  size={24} 
                  color={isSpeaking ? "#FFF" : THEME.primary} 
                />
                <Text style={[mythStyles.speakBtnText, isSpeaking && { color: '#FFF' }]}>
                  {isSpeaking ? 'Stop' : 'Read Aloud'}
                </Text>
              </TouchableOpacity>

              <View style={styles.swipeInstructions}>
                <View style={styles.swipeLeft}><Icon name="ArrowLeft2" size={24} color={THEME.error} variant="Bold" /><Text style={{color: THEME.error, fontWeight:'800', fontSize: 14}}>MYTH</Text></View>
                <View style={styles.swipeRight}><Text style={{color: THEME.success, fontWeight:'800', fontSize: 14}}>FACT</Text><Icon name="ArrowRight2" size={24} color={THEME.success} variant="Bold" /></View>
              </View>
            </Animated.View>
          </GestureDetector>
        )}
      </View>
    </View>
  );
};

// 3. MicroLearn View - Duolingo Style
const MicroLearnView = ({ data, onComplete }: { data: any; onComplete: () => void }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Simplified slides: intro, main content, all key points together, summary
  const slides = [
    { type: 'intro', title: data.title },
    { type: 'content', content: data.content },
    ...(data.keyPoints && data.keyPoints.length > 0 ? [{ type: 'keypoints', points: data.keyPoints }] : []),
    { type: 'summary', title: data.title, content: data.content },
  ];
  
  const isLastSlide = currentSlide === slides.length - 1;
  const isFirstSlide = currentSlide === 0;
  const currentContent = slides[currentSlide];
  
  const speakContent = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      let text = '';
      if (currentContent.type === 'intro') text = data.title;
      else if (currentContent.type === 'content') text = currentContent.content;
      else if (currentContent.type === 'keypoints') text = currentContent.points.join('. ');
      else if (currentContent.type === 'summary') text = `Summary: ${data.title}. ${data.content}`;
      
      setIsSpeaking(true);
      Speech.speak(text, { 
        language: 'en', 
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
  };

  const handleNext = () => {
    Speech.stop();
    setIsSpeaking(false);
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handleBack = () => {
    Speech.stop();
    setIsSpeaking(false);
    if (!isFirstSlide) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  return (
    <View style={styles.stepContainer}>
      {/* Progress Dots */}
      <View style={learnStyles.progressDots}>
        {slides.map((_, i) => (
          <View 
            key={i} 
            style={[
              learnStyles.dot, 
              i === currentSlide && learnStyles.dotActive,
              i < currentSlide && learnStyles.dotCompleted
            ]} 
          />
        ))}
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        {/* Content Card */}
        <Animated.View 
          key={currentSlide}
          entering={FadeInDown.duration(300)} 
          style={learnStyles.slideCard}
        >
          {/* Speaker Button */}
          <TouchableOpacity 
            style={learnStyles.speakerBtn}
            onPress={speakContent}
          >
            <Icon 
              name={isSpeaking ? "VolumeSlash" : "VolumeHigh"} 
              size={22} 
              color={isSpeaking ? '#FFF' : THEME.primary} 
            />
          </TouchableOpacity>

          {currentContent.type === 'intro' && (
            <>
              <View style={learnStyles.badgeRow}>
                <View style={learnStyles.learnBadge}>
                  <Icon name="Book" size={18} color="#FFF" variant="Bold" />
                  <Text style={learnStyles.badgeText}>LEARN</Text>
                </View>
              </View>
              <Image 
                source={require('@/assets/images/mascot/idea.png')} 
                style={learnStyles.mascotImg}
                resizeMode="contain"
              />
              <Text style={learnStyles.titleText}>{data.title}</Text>
              <Text style={learnStyles.subtitleText}>Let's learn something new!</Text>
            </>
          )}

          {currentContent.type === 'content' && (
            <>
              <Image 
                source={require('@/assets/images/mascot/explain.png')} 
                style={learnStyles.mascotSmall}
                resizeMode="contain"
              />
              <Text style={learnStyles.contentText}>{currentContent.content}</Text>
            </>
          )}

          {currentContent.type === 'keypoints' && (
            <ScrollView 
              style={{ width: '100%' }} 
              contentContainerStyle={{ paddingVertical: 8 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={learnStyles.keypointsHeader}>
                <Icon name="TickCircle" size={24} color={THEME.success} variant="Bold" />
                <Text style={learnStyles.keypointsTitle}>KEY POINTS</Text>
              </View>
              {currentContent.points.map((point: string, i: number) => (
                <View key={i} style={learnStyles.keypointItem}>
                  <View style={learnStyles.keypointBullet}>
                    <Text style={learnStyles.keypointNumber}>{i + 1}</Text>
                  </View>
                  <Text style={learnStyles.keypointItemText}>{point}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {currentContent.type === 'summary' && (
            <>
              <View style={learnStyles.summaryBadge}>
                <Icon name="DocumentText" size={20} color="#FFF" variant="Bold" />
              </View>
              <Text style={learnStyles.summaryLabel}>SUMMARY</Text>
              <Text style={learnStyles.summaryTitle}>{data.title}</Text>
              <View style={learnStyles.summaryDivider} />
              <Text style={learnStyles.summaryText}>{data.content}</Text>
              <Image 
                source={require('@/assets/images/mascot/happy.png')} 
                style={learnStyles.summaryMascot}
                resizeMode="contain"
              />
            </>
          )}
        </Animated.View>
      </View>

      {/* Navigation Buttons */}
      <View style={learnStyles.navRow}>
        {!isFirstSlide && (
          <TouchableOpacity style={learnStyles.backBtn} onPress={handleBack}>
            <Icon name="ArrowLeft2" size={20} color={THEME.text} variant="Bold" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[learnStyles.continueBtn, isLastSlide && { backgroundColor: THEME.success, borderColor: '#1F9D55' }]} 
          onPress={handleNext}
        >
          <Text style={learnStyles.continueBtnText}>{isLastSlide ? 'GOT IT!' : 'CONTINUE'}</Text>
          <Icon name="ArrowRight2" size={20} color="#FFF" variant="Bold" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// 4. Lab View (Mini Sim) - Duolingo Style
const LabView = ({ data, onComplete, onBack }: { data: any; onComplete: () => void; onBack?: () => void }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSelect = (optionId: string) => {
    if (showFeedback) return;
    setSelectedOption(optionId);
  };

  const handleCheck = () => {
    if (!selectedOption) return;
    setShowFeedback(true);
    // Auto-scroll to feedback after a short delay
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const isCorrect = selectedOption === data.correctAnswer;

  const speakTask = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(data.task, { 
        language: 'en', 
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
  };

  return (
    <View style={styles.stepContainer}>
      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
      {/* Header Card */}
      <Animated.View entering={FadeInDown.duration(300)} style={labStyles.headerCard}>
        <View style={labStyles.badgeRow}>
          <View style={labStyles.labBadge}>
            <Icon name="Microscope" size={18} color="#FFF" variant="Bold" />
            <Text style={labStyles.badgeText}>LAB</Text>
          </View>
          <TouchableOpacity style={labStyles.speakerBtn} onPress={speakTask}>
            <Icon name={isSpeaking ? "VolumeSlash" : "VolumeHigh"} size={20} color={isSpeaking ? '#FFF' : '#8B5CF6'} />
          </TouchableOpacity>
        </View>
        
        <Image 
          source={require('@/assets/images/mascot/experiment.png')} 
          style={labStyles.mascot}
          resizeMode="contain"
        />
        
        <Text style={labStyles.taskText}>{data.task}</Text>
      </Animated.View>

      {/* Options Grid */}
      <View style={labStyles.optionsGrid}>
        {data.options.map((option: any, index: number) => {
          const isSelected = selectedOption === option.id;
          const showCorrectMark = showFeedback && option.id === data.correctAnswer;
          const showWrongMark = showFeedback && isSelected && !isCorrect;

          return (
            <Animated.View 
              key={option.id} 
              entering={FadeInDown.delay(100 + index * 80)} 
              style={labStyles.optionWrapper}
            >
              <TouchableOpacity 
                style={[
                  labStyles.optionCard,
                  isSelected && !showFeedback && labStyles.optionSelected,
                  showCorrectMark && labStyles.optionCorrect,
                  showWrongMark && labStyles.optionWrong,
                ]}
                onPress={() => handleSelect(option.id)}
                disabled={showFeedback}
                activeOpacity={0.8}
              >
                <View style={[
                  labStyles.optionIconCircle,
                  isSelected && !showFeedback && { backgroundColor: THEME.primary + '20' },
                  showCorrectMark && { backgroundColor: THEME.success + '20' },
                  showWrongMark && { backgroundColor: THEME.error + '20' },
                ]}>
                  <Icon 
                    name={option.icon as any} 
                    size={28} 
                    color={showCorrectMark ? THEME.success : showWrongMark ? THEME.error : isSelected ? THEME.primary : THEME.textMuted} 
                    variant="Bold" 
                  />
                </View>
                <Text style={[
                  labStyles.optionLabel,
                  isSelected && !showFeedback && { color: THEME.primary, fontWeight: '700' },
                  showCorrectMark && { color: THEME.success, fontWeight: '700' },
                  showWrongMark && { color: THEME.error, fontWeight: '700' },
                ]}>
                  {option.label}
                </Text>
                
                {/* Selection/Result indicator */}
                {(isSelected || showCorrectMark) && (
                  <View style={[
                    labStyles.checkCircle,
                    showCorrectMark && { backgroundColor: THEME.success, borderColor: THEME.success },
                    showWrongMark && { backgroundColor: THEME.error, borderColor: THEME.error },
                    isSelected && !showFeedback && { backgroundColor: THEME.primary, borderColor: THEME.primary },
                  ]}>
                    <Icon 
                      name={showWrongMark ? "CloseCircle" : "TickCircle"} 
                      size={16} 
                      color="#FFF" 
                      variant="Bold"
                    />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Feedback Card */}
      {showFeedback && (
        <Animated.View 
          entering={FadeInDown.duration(300)} 
          style={[labStyles.feedbackCard, isCorrect ? labStyles.feedbackCorrect : labStyles.feedbackWrong]}
        >
          <View style={labStyles.feedbackHeader}>
            <Icon 
              name={isCorrect ? "TickCircle" : "CloseCircle"} 
              size={24} 
              color={isCorrect ? THEME.success : THEME.error} 
              variant="Bold"
            />
            <Text style={[labStyles.feedbackTitle, { color: isCorrect ? THEME.success : THEME.error }]}>
              {isCorrect ? "Excellent!" : "Not quite!"}
            </Text>
          </View>
          <Text style={labStyles.feedbackText}>{data.explanation}</Text>
        </Animated.View>
      )}
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={labStyles.navRow}>
        {onBack && !showFeedback && (
          <TouchableOpacity style={labStyles.backBtn} onPress={onBack}>
            <Icon name="ArrowLeft2" size={20} color={THEME.text} variant="Bold" />
          </TouchableOpacity>
        )}
        
        {!showFeedback ? (
          <TouchableOpacity 
            style={[labStyles.checkBtn, !selectedOption && labStyles.checkBtnDisabled, !onBack && { flex: 1 }]} 
            onPress={handleCheck}
            disabled={!selectedOption}
          >
            <Text style={labStyles.checkBtnText}>CHECK</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[labStyles.continueBtn, isCorrect && { backgroundColor: THEME.success, borderColor: '#1F9D55' }]} 
            onPress={onComplete}
          >
            <Text style={labStyles.continueBtnText}>CONTINUE</Text>
            <Icon name="ArrowRight2" size={20} color="#FFF" variant="Bold" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// 5. Assessment (Quiz) - Duolingo Style
const AssessmentView = ({ data, onComplete }: { data: any; onComplete: () => void }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const correctIndex = data.correctIndex;
  const isCorrect = selected === correctIndex;

  const speakQuestion = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(data.question, { 
        language: 'en', 
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
  };

  const handleCheck = () => {
    if (selected === null) return;
    setConfirmed(true);
    // Auto-scroll to feedback after a short delay
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <View style={styles.stepContainer}>
      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Question Card */}
        <Animated.View entering={FadeInDown.duration(300)} style={quizStyles.questionCard}>
          <View style={quizStyles.questionHeader}>
            <View style={quizStyles.quizBadge}>
              <Icon name="Cup" size={18} color="#FFF" variant="Bold" />
              <Text style={quizStyles.badgeText}>QUIZ</Text>
            </View>
            <TouchableOpacity style={quizStyles.speakerBtn} onPress={speakQuestion}>
              <Icon name={isSpeaking ? "VolumeSlash" : "VolumeHigh"} size={20} color={isSpeaking ? '#FFF' : THEME.gold} />
            </TouchableOpacity>
          </View>
          
          <Text style={quizStyles.questionText}>{data.question}</Text>
        </Animated.View>

        {/* Options */}
        <View style={quizStyles.optionsContainer}>
          {data.options.map((opt: string, index: number) => {
            const isSelected = selected === index;
            const showCorrectMark = confirmed && index === correctIndex;
            const showWrongMark = confirmed && isSelected && !isCorrect;
            const optionLetter = String.fromCharCode(65 + index);

            return (
              <Animated.View key={opt} entering={FadeInDown.delay(100 + index * 80)}>
                <TouchableOpacity 
                  style={[
                    quizStyles.optionCard,
                    isSelected && !confirmed && quizStyles.optionSelected,
                    showCorrectMark && quizStyles.optionCorrect,
                    showWrongMark && quizStyles.optionWrong,
                  ]}
                  onPress={() => !confirmed && setSelected(index)}
                  activeOpacity={0.8}
                  disabled={confirmed}
                >
                  <View style={[
                    quizStyles.optionLetter,
                    isSelected && !confirmed && quizStyles.optionLetterSelected,
                    showCorrectMark && quizStyles.optionLetterCorrect,
                    showWrongMark && quizStyles.optionLetterWrong,
                  ]}>
                    <Text style={[
                      quizStyles.optionLetterText,
                      (isSelected || showCorrectMark || showWrongMark) && { color: '#FFF' }
                    ]}>{optionLetter}</Text>
                  </View>
                  
                  <Text style={[
                    quizStyles.optionText,
                    isSelected && !confirmed && { color: THEME.primary, fontWeight: '700' },
                    showCorrectMark && { color: THEME.success, fontWeight: '700' },
                    showWrongMark && { color: THEME.error, fontWeight: '700' },
                  ]}>{opt}</Text>

                  {showCorrectMark && (
                    <Icon name="TickCircle" size={24} color={THEME.success} variant="Bold" />
                  )}
                  {showWrongMark && (
                    <Icon name="CloseCircle" size={24} color={THEME.error} variant="Bold" />
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Feedback */}
        {confirmed && (
          <Animated.View 
            entering={FadeInDown.duration(300)} 
            style={[quizStyles.feedbackCard, isCorrect ? quizStyles.feedbackCorrect : quizStyles.feedbackWrong]}
          >
            <View style={quizStyles.feedbackHeader}>
              <Icon 
                name={isCorrect ? "TickCircle" : "CloseCircle"} 
                size={24} 
                color={isCorrect ? THEME.success : THEME.error} 
                variant="Bold"
              />
              <Text style={[quizStyles.feedbackTitle, { color: isCorrect ? THEME.success : THEME.error }]}>
                {isCorrect ? "Correct!" : "Not quite!"}
              </Text>
            </View>
            <Text style={quizStyles.feedbackText}>{data.explanation}</Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View style={{ paddingTop: 16 }}>
        {!confirmed ? (
          <TouchableOpacity 
            style={[quizStyles.checkBtn, selected === null && quizStyles.checkBtnDisabled]} 
            onPress={handleCheck}
            disabled={selected === null}
          >
            <Text style={quizStyles.checkBtnText}>CHECK</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[quizStyles.continueBtn, isCorrect && { backgroundColor: THEME.success, borderColor: '#1F9D55' }]} 
            onPress={onComplete}
          >
            <Text style={quizStyles.continueBtnText}>CONTINUE</Text>
            <Icon name="ArrowRight2" size={20} color="#FFF" variant="Bold" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// 6. Debrief (Success)
const DebriefView = ({ data, levelId, isReplay = false }: { data: any; levelId: string; isReplay?: boolean }) => {
  const router = useRouter();
  const { addXP, updateUserProfile, userProfile } = useStorage();
  const [saved, setSaved] = useState(false);
  const [rewardsAwarded, setRewardsAwarded] = useState(false);
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
        const existingProgress = await getLevelProgress(levelId) as { status?: string; completed_at?: string } | null;
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
        
        // Unlock next lesson/unit when completing for the first time
        if (!isAlreadyCompleted) {
          await unlockNextLevel(levelId);
        }
        
        // Only award rewards if this is the first completion (not a replay)
        if (!isAlreadyCompleted && !isReplay) {
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
          
          setRewardsAwarded(true);
          console.log('Lesson completed for the first time! Rewards awarded.');
        } else {
          console.log('Lesson replay. No rewards awarded.');
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

  // Different titles/messages for replay vs first completion
  const title = isReplay ? 'Practice Complete!' : (data.title || 'Mission Complete!');
  const message = isReplay 
    ? 'Great review! You\'ve already mastered this lesson.'
    : (data.message || 'Great job! You\'ve completed this lesson.');

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
        <Text style={styles.successTitle}>{title}</Text>
        <Text style={styles.successText}>{message}</Text>
      </Animated.View>

      {/* Show rewards only if not a replay */}
      {rewardsAwarded ? (
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
      ) : (
        <Animated.View entering={FadeInDown.delay(400)} style={styles.rewardRow}>
          <View style={[styles.rewardPill, { opacity: 0.6 }]}>
            <View style={[styles.rewardIconWrapper, { backgroundColor: THEME.textMuted }]}>
              <Icon name="TickCircle" size={20} color="#FFF" variant="Bold" />
            </View>
            <View>
              <Text style={styles.rewardLabel}>Already Earned</Text>
              <Text style={[styles.rewardText, { color: THEME.textMuted }]}>{xpReward} XP</Text>
            </View>
          </View>
        </Animated.View>
      )}

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
  const [isReplay, setIsReplay] = useState(false);
  const router = useRouter();
  const levelId = typeof id === 'string' ? id : 'radiation-shielding';
  
  // Load lesson from content system
  const lesson = getLessonById(levelId);

  // Check if this is a replay and only mark in_progress for new lessons
  useEffect(() => {
    const checkAndMarkProgress = async () => {
      try {
        const existingProgress = await getLevelProgress(levelId) as { status?: string } | null;
        const isAlreadyCompleted = existingProgress?.status === 'completed';
        
        setIsReplay(isAlreadyCompleted);
        
        // Only mark as in_progress if not already completed
        if (!isAlreadyCompleted) {
          await updateLevelProgress(levelId, {
            status: 'in_progress'
          });
        }
      } catch (error) {
        console.error('Error checking/marking level progress:', error);
      }
    };
    
    checkAndMarkProgress();
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
        return <BriefingView key={step} data={currentStep.data} onComplete={nextStep} />;
      case 'myth_buster':
        return <MythBusterView key={step} data={currentStep.data} onComplete={nextStep} />;
      case 'micro_learn':
        return <MicroLearnView key={step} data={currentStep.data} onComplete={nextStep} />;
      case 'lab':
        return <LabView key={step} data={currentStep.data} onComplete={nextStep} onBack={step > 0 ? () => setStep(s => s - 1) : undefined} />;
      case 'assessment':
        return <AssessmentView key={step} data={currentStep.data} onComplete={nextStep} />;
      case 'debrief':
        return <DebriefView key={step} data={currentStep.data} levelId={levelId} isReplay={isReplay} />;
      default:
        return <BriefingView key={step} data={currentStep.data} onComplete={nextStep} />;
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

// Myth Buster specific styles
const mythStyles = StyleSheet.create({
  fullHeightIndicators: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    pointerEvents: 'none',
    zIndex: 10,
  },
  indicatorLeftFull: {
    width: 120,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorRightFull: {
    width: 120,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorContent: {
    alignItems: 'center',
    gap: 8,
  },
  indicatorTextLeft: {
    color: THEME.error,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
  indicatorTextRight: {
    color: THEME.success,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
  speakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: THEME.primary,
  },
  speakBtnActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primaryDark,
  },
  speakBtnText: {
    color: THEME.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  // Enhanced Result Card Styles
  resultCard: {
    width: width - 40,
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  resultCorrect: {
    borderWidth: 2,
    borderColor: THEME.success,
    borderBottomWidth: 6,
  },
  resultIncorrect: {
    borderWidth: 2,
    borderColor: THEME.error,
    borderBottomWidth: 6,
  },
  speakerBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  resultIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 12,
  },
  resultExplanation: {
    fontSize: 15,
    color: THEME.text,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  realityBox: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  realityLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.gold,
    letterSpacing: 1,
    marginBottom: 6,
  },
  realityText: {
    fontSize: 15,
    color: THEME.text,
    lineHeight: 22,
  },
  resultContinueBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
  },
  resultContinueBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

// Duolingo-style Learn Styles
const learnStyles = StyleSheet.create({
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    backgroundColor: THEME.primary,
    width: 24,
  },
  dotCompleted: {
    backgroundColor: THEME.success,
  },
  slideCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 6,
    minHeight: 340,
    maxHeight: 420,
    justifyContent: 'center',
  },
  speakerBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badgeRow: {
    marginBottom: 16,
  },
  learnBadge: {
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
  badgeText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  mascotImg: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  mascotSmall: {
    width: 70,
    height: 70,
    marginBottom: 16,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 15,
    color: THEME.textMuted,
    textAlign: 'center',
  },
  contentText: {
    fontSize: 17,
    color: THEME.text,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
  },
  // Key Points - all in one slide
  keypointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    alignSelf: 'center',
  },
  keypointsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.success,
    letterSpacing: 1,
  },
  keypointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  keypointBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypointNumber: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  keypointItemText: {
    flex: 1,
    fontSize: 15,
    color: THEME.text,
    lineHeight: 22,
    fontWeight: '500',
  },
  // Summary slide
  summaryBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.gold,
    letterSpacing: 1,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  summaryDivider: {
    width: 60,
    height: 3,
    backgroundColor: THEME.border,
    borderRadius: 2,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: THEME.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  summaryMascot: {
    width: 60,
    height: 60,
    marginTop: 16,
  },
  // Navigation
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  backBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: THEME.primary,
    borderBottomWidth: 4,
    borderColor: THEME.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

// Duolingo-style Lab Styles
const labStyles = StyleSheet.create({
  headerCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 5,
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  labBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 2,
    borderColor: '#7C3AED',
  },
  badgeText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  speakerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascot: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  taskText: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    textAlign: 'center',
    lineHeight: 26,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionWrapper: {
    width: '48%',
  },
  optionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    minHeight: 100,
    position: 'relative',
  },
  optionSelected: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primary + '08',
  },
  optionCorrect: {
    borderColor: THEME.success,
    backgroundColor: THEME.success + '10',
  },
  optionWrong: {
    borderColor: THEME.error,
    backgroundColor: THEME.error + '10',
  },
  optionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    textAlign: 'center',
  },
  checkCircle: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    borderWidth: 2,
    borderColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  feedbackCorrect: {
    backgroundColor: THEME.success + '15',
  },
  feedbackWrong: {
    backgroundColor: THEME.error + '15',
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  feedbackText: {
    fontSize: 15,
    color: THEME.text,
    lineHeight: 22,
  },
  checkBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    borderBottomWidth: 4,
    borderColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnDisabled: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
  },
  checkBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  continueBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: THEME.primary,
    borderBottomWidth: 4,
    borderColor: THEME.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
  },
  backBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Duolingo-style Quiz Styles
const quizStyles = StyleSheet.create({
  questionCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 5,
    marginBottom: 20,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quizBadge: {
    backgroundColor: THEME.gold,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 2,
    borderColor: '#D97706',
  },
  badgeText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  speakerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    lineHeight: 28,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    gap: 14,
  },
  optionSelected: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primary + '08',
  },
  optionCorrect: {
    borderColor: THEME.success,
    backgroundColor: THEME.success + '10',
  },
  optionWrong: {
    borderColor: THEME.error,
    backgroundColor: THEME.error + '10',
  },
  optionLetter: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  optionLetterSelected: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  optionLetterCorrect: {
    backgroundColor: THEME.success,
    borderColor: THEME.success,
  },
  optionLetterWrong: {
    backgroundColor: THEME.error,
    borderColor: THEME.error,
  },
  optionLetterText: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.textMuted,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: THEME.text,
    fontWeight: '500',
  },
  feedbackCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  feedbackCorrect: {
    backgroundColor: THEME.success + '15',
  },
  feedbackWrong: {
    backgroundColor: THEME.error + '15',
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  feedbackText: {
    fontSize: 15,
    color: THEME.text,
    lineHeight: 22,
  },
  checkBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: THEME.gold,
    borderBottomWidth: 4,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnDisabled: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
  },
  checkBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  continueBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: THEME.primary,
    borderBottomWidth: 4,
    borderColor: THEME.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});