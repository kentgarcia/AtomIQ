import { useMemo, useRef, useState } from "react";
import {
    Image,
    ScrollView,
    type ScrollViewInstance,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { readAloud } from "@/services/media";
import { buildFeedbackSpeech, buildQuestionSpeech } from "@/services/media-core";
import { playAnswerSfx } from "@/services/game-sfx";
import { ReadAloudButton } from "@/components/ui/read-aloud-button";

import {type Palette, fontFaces} from "@/theme";
import { Icon } from "@/components/ui/icon";

import { createLabStyles, createStyles } from "./styles";

export const LabView = ({
  data,
  onComplete,
  onBack,
  theme,
  source,
}: {
  data: any;
  onComplete: () => void;
  onBack?: () => void;
  theme: Palette;
  /** Optional lesson/step identity included in icon diagnostics. */
  source?: string;
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, width), [theme, width]);
  const labStyles = useMemo(() => createLabStyles(theme), [theme]);

  const handleSelect = (optionId: string) => {
    if (showFeedback) return;
    setSelectedOption(optionId);
  };

  const readAloudOwner = `lab:${data.title ?? ""}:${data.task ?? ""}`;

  const handleCheck = () => {
    if (!selectedOption) return;
    readAloud.stop("answered", readAloudOwner);
    void playAnswerSfx(selectedOption === data.correctAnswer);
    setShowFeedback(true);
    // Auto-scroll to feedback after a short delay
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const isCorrect = selectedOption === data.correctAnswer;

  return (
    <View style={styles.stepContainer}>
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={labStyles.headerCard}
        >
          <View style={labStyles.badgeRow}>
            <View style={labStyles.labBadge}>
              <Icon name="Microscope" size={18} color="#FFF" variant="Bold" />
              <Text style={labStyles.badgeText}>LAB</Text>
            </View>
            <ReadAloudButton
              ownerId={readAloudOwner}
              subject={showFeedback ? "explanation" : "lab task"}
              accent="#8B5CF6"
              text={() =>
                showFeedback
                  ? buildFeedbackSpeech(isCorrect, data.explanation)
                  : buildQuestionSpeech(
                      data.task,
                      (data.options ?? []).map((o: any) => o.label ?? String(o.id)),
                    )
              }
            />
          </View>

          <Image
            source={require("@/assets/images/mascot/experiment.png")}
            style={labStyles.mascot}
            resizeMode="contain"
          />

          <Text style={labStyles.taskText}>{data.task}</Text>
        </Animated.View>

        {/* Options Grid */}
        <View style={labStyles.optionsGrid}>
          {data.options.map((option: any, index: number) => {
            const isSelected = selectedOption === option.id;
            const showCorrectMark =
              showFeedback && option.id === data.correctAnswer;
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
                  <View
                    style={[
                      labStyles.optionIconCircle,
                      isSelected &&
                        !showFeedback && {
                          backgroundColor: theme.primary + "20",
                        },
                      showCorrectMark && {
                        backgroundColor: theme.success + "20",
                      },
                      showWrongMark && { backgroundColor: theme.error + "20" },
                    ]}
                  >
                    <Icon
                      name={option.icon}
                      source={
                        source
                          ? `${source} option:${option.id}`
                          : `lab-option:${option.id}`
                      }
                      size={28}
                      color={
                        showCorrectMark
                          ? theme.success
                          : showWrongMark
                            ? theme.error
                            : isSelected
                              ? theme.primary
                              : theme.textMuted
                      }
                      variant="Bold"
                    />
                  </View>
                  <Text
                    style={[
                      labStyles.optionLabel,
                      isSelected &&
                        !showFeedback && {
                          color: theme.primary,
                          ...fontFaces.bold,
                        },
                      showCorrectMark && {
                        color: theme.success,
                        ...fontFaces.bold,
                      },
                      showWrongMark && {
                        color: theme.error,
                        ...fontFaces.bold,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>

                  {/* Selection/Result indicator */}
                  {(isSelected || showCorrectMark) && (
                    <View
                      style={[
                        labStyles.checkCircle,
                        showCorrectMark && {
                          backgroundColor: theme.success,
                          borderColor: theme.success,
                        },
                        showWrongMark && {
                          backgroundColor: theme.error,
                          borderColor: theme.error,
                        },
                        isSelected &&
                          !showFeedback && {
                            backgroundColor: theme.primary,
                            borderColor: theme.primary,
                          },
                      ]}
                    >
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
            style={[
              labStyles.feedbackCard,
              isCorrect ? labStyles.feedbackCorrect : labStyles.feedbackWrong,
            ]}
          >
            <View style={labStyles.feedbackHeader}>
              <Icon
                name={isCorrect ? "TickCircle" : "CloseCircle"}
                size={24}
                color={isCorrect ? theme.success : theme.error}
                variant="Bold"
              />
              <Text
                style={[
                  labStyles.feedbackTitle,
                  { color: isCorrect ? theme.success : theme.error },
                ]}
              >
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
          <TouchableOpacity
            style={labStyles.backBtn}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon
              name="ArrowLeft2"
              size={20}
              color={theme.text}
              variant="Bold"
            />
          </TouchableOpacity>
        )}

        {!showFeedback ? (
          <TouchableOpacity
            style={[
              labStyles.checkBtn,
              !selectedOption && labStyles.checkBtnDisabled,
              !onBack && { flex: 1 },
            ]}
            onPress={handleCheck}
            disabled={!selectedOption}
          >
            <Text style={labStyles.checkBtnText}>CHECK</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              labStyles.continueBtn,
              isCorrect && {
                backgroundColor: theme.success,
                borderColor: "#1F9D55",
              },
            ]}
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
