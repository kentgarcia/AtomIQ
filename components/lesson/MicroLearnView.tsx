import { useMemo, useState } from "react";
import {
    Image,
    ScrollView,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ReadAloudButton } from "@/components/ui/read-aloud-button";

import { type Palette } from "@/theme";
import { Icon } from "@/components/ui/icon";
import { getStepVisuals, getVisualSpeechText } from "@/content/visual-blocks";
import { useResponsiveLayout } from "@/theme/layout";

import { createLearnStyles, createStyles } from "./styles";
import { VisualBlockList } from "./visual";

export const MicroLearnView = ({
  data,
  onComplete,
  theme,
}: {
  data: any;
  onComplete: () => void;
  theme: Palette;
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, width), [theme, width]);
  const learnStyles = useMemo(() => createLearnStyles(theme), [theme]);

  const responsive = useResponsiveLayout();
  const visuals = getStepVisuals(data);
  // Visual blocks scroll inside the card; leave room for dots, nav row and padding.
  const visualsMaxHeight = Math.max(
    260,
    responsive.height - responsive.insets.top - responsive.insets.bottom - 330,
  );

  // Simplified slides: intro, main content, visual blocks (when authored), all key points together, summary
  const slides = [
    { type: "intro", title: data.title },
    { type: "content", content: data.content },
    ...(visuals.length > 0 ? [{ type: "visuals", visuals }] : []),
    ...(data.keyPoints && data.keyPoints.length > 0
      ? [{ type: "keypoints", points: data.keyPoints }]
      : []),
    { type: "summary", title: data.title, content: data.content },
  ];

  const isLastSlide = currentSlide === slides.length - 1;
  const isFirstSlide = currentSlide === 0;
  const currentContent = slides[currentSlide];

  // What Read Aloud reads depends on the slide. Changing slide changes the
  // control's owner id, which stops the previous narration automatically.
  const getSlideSpeech = (): string => {
    if (currentContent.type === "intro") return data.title;
    if (currentContent.type === "content") return currentContent.content;
    if (currentContent.type === "keypoints")
      return currentContent.points.join(". ");
    if (currentContent.type === "visuals")
      return getVisualSpeechText(visuals);
    return `Summary: ${data.title}. ${data.content}`;
  };
  const readAloudOwner = `lesson-learn:${data.title}:${currentSlide}`;

  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstSlide) {
      setCurrentSlide((prev) => prev - 1);
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
              i < currentSlide && learnStyles.dotCompleted,
            ]}
          />
        ))}
      </View>

      <View style={{ flex: 1, justifyContent: "center" }}>
        {/* Content Card */}
        <Animated.View
          key={currentSlide}
          entering={FadeInDown.duration(300)}
          style={learnStyles.slideCard}
        >
          {/* Speaker Button */}
          <ReadAloudButton
            ownerId={readAloudOwner}
            subject="lesson content"
            accent={theme.primary}
            text={getSlideSpeech}
            style={learnStyles.speakerBtn}
          />

          {currentContent.type === "intro" && (
            <>
              <View style={learnStyles.badgeRow}>
                <View style={learnStyles.learnBadge}>
                  <Icon name="Book" size={18} color="#FFF" variant="Bold" />
                  <Text style={learnStyles.badgeText}>LEARN</Text>
                </View>
              </View>
              <Image
                source={require("@/assets/images/mascot/idea.png")}
                style={learnStyles.mascotImg}
                resizeMode="contain"
              />
              <Text style={learnStyles.titleText}>{data.title}</Text>
              <Text style={learnStyles.subtitleText}>
                Let&apos;s learn something new!
              </Text>
            </>
          )}

          {currentContent.type === "content" && (
            <>
              <Image
                source={require("@/assets/images/mascot/explain.png")}
                style={learnStyles.mascotSmall}
                resizeMode="contain"
              />
              <Text style={learnStyles.contentText}>
                {currentContent.content}
              </Text>
            </>
          )}

          {currentContent.type === "visuals" && (
            <View style={{ width: "100%" }}>
              <View style={learnStyles.keypointsHeader}>
                <Icon name="Eye" size={24} color={theme.primary} variant="Bold" />
                <Text style={learnStyles.keypointsTitle}>SEE IT</Text>
              </View>
              <ScrollView
                style={{ maxHeight: visualsMaxHeight }}
                contentContainerStyle={{ paddingBottom: 8 }}
                showsVerticalScrollIndicator
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                <VisualBlockList visuals={visuals} />
              </ScrollView>
            </View>
          )}

          {currentContent.type === "keypoints" && (
            <ScrollView
              style={{ width: "100%" }}
              contentContainerStyle={{ paddingVertical: 8 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={learnStyles.keypointsHeader}>
                <Icon
                  name="TickCircle"
                  size={24}
                  color={theme.success}
                  variant="Bold"
                />
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

          {currentContent.type === "summary" && (
            <>
              <View style={learnStyles.summaryBadge}>
                <Icon
                  name="DocumentText"
                  size={20}
                  color="#FFF"
                  variant="Bold"
                />
              </View>
              <Text style={learnStyles.summaryLabel}>SUMMARY</Text>
              <Text style={learnStyles.summaryTitle}>{data.title}</Text>
              <View style={learnStyles.summaryDivider} />
              <Text style={learnStyles.summaryText}>{data.content}</Text>
              <Image
                source={require("@/assets/images/mascot/happy.png")}
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
          <TouchableOpacity
            style={learnStyles.backBtn}
            onPress={handleBack}
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

        <TouchableOpacity
          style={[
            learnStyles.continueBtn,
            isLastSlide && {
              backgroundColor: theme.success,
              borderColor: "#1F9D55",
            },
          ]}
          onPress={handleNext}
        >
          <Text style={learnStyles.continueBtnText}>
            {isLastSlide ? "GOT IT!" : "CONTINUE"}
          </Text>
          <Icon name="ArrowRight2" size={20} color="#FFF" variant="Bold" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
