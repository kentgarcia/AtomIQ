import { useMemo, useRef, useState } from "react";
import {
    ScrollView,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Speech from "expo-speech";

import {type Palette, fontFamilies} from "@/theme";
import { Icon } from "@/components/ui/icon";

import { createQuizStyles, createStyles } from "./styles";

export const AssessmentView = ({
  data,
  onComplete,
  theme,
}: {
  data: any;
  onComplete: () => void;
  theme: Palette;
}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, width), [theme, width]);
  const quizStyles = useMemo(() => createQuizStyles(theme), [theme]);
  const correctIndex = data.correctIndex;
  const isCorrect = selected === correctIndex;

  const speakQuestion = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(data.question, {
        language: "en",
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
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={quizStyles.questionCard}
        >
          <View style={quizStyles.questionHeader}>
            <View style={quizStyles.quizBadge}>
              <Icon name="Cup" size={18} color="#FFF" variant="Bold" />
              <Text style={quizStyles.badgeText}>QUIZ</Text>
            </View>
            <TouchableOpacity
              style={quizStyles.speakerBtn}
              onPress={speakQuestion}
            >
              <Icon
                name={isSpeaking ? "VolumeSlash" : "VolumeHigh"}
                size={20}
                color={isSpeaking ? "#FFF" : theme.gold}
              />
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
              <Animated.View
                key={opt}
                entering={FadeInDown.delay(100 + index * 80)}
              >
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
                  <View
                    style={[
                      quizStyles.optionLetter,
                      isSelected &&
                        !confirmed &&
                        quizStyles.optionLetterSelected,
                      showCorrectMark && quizStyles.optionLetterCorrect,
                      showWrongMark && quizStyles.optionLetterWrong,
                    ]}
                  >
                    <Text
                      style={[
                        quizStyles.optionLetterText,
                        (isSelected || showCorrectMark || showWrongMark) && {
                          color: "#FFF",
                        },
                      ]}
                    >
                      {optionLetter}
                    </Text>
                  </View>

                  <Text
                    style={[
                      quizStyles.optionText,
                      isSelected &&
                        !confirmed && {
                          color: theme.primary,
                          fontFamily: fontFamilies.bold,
                        },
                      showCorrectMark && {
                        color: theme.success,
                        fontFamily: fontFamilies.bold,
                      },
                      showWrongMark && {
                        color: theme.error,
                        fontFamily: fontFamilies.bold,
                      },
                    ]}
                  >
                    {opt}
                  </Text>

                  {showCorrectMark && (
                    <Icon
                      name="TickCircle"
                      size={24}
                      color={theme.success}
                      variant="Bold"
                    />
                  )}
                  {showWrongMark && (
                    <Icon
                      name="CloseCircle"
                      size={24}
                      color={theme.error}
                      variant="Bold"
                    />
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
            style={[
              quizStyles.feedbackCard,
              isCorrect ? quizStyles.feedbackCorrect : quizStyles.feedbackWrong,
            ]}
          >
            <View style={quizStyles.feedbackHeader}>
              <Icon
                name={isCorrect ? "TickCircle" : "CloseCircle"}
                size={24}
                color={isCorrect ? theme.success : theme.error}
                variant="Bold"
              />
              <Text
                style={[
                  quizStyles.feedbackTitle,
                  { color: isCorrect ? theme.success : theme.error },
                ]}
              >
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
            style={[
              quizStyles.checkBtn,
              selected === null && quizStyles.checkBtnDisabled,
            ]}
            onPress={handleCheck}
            disabled={selected === null}
          >
            <Text style={quizStyles.checkBtnText}>CHECK</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              quizStyles.continueBtn,
              isCorrect && {
                backgroundColor: theme.success,
                borderColor: "#1F9D55",
              },
            ]}
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