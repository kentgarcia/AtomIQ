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
import { speakSafely, stopSpeech } from "@/services/speech";

import { type Palette } from "@/theme";
import { Icon } from "@/components/ui/icon";

import { createLearnStyles, createStyles } from "./styles";

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, width), [theme, width]);
  const learnStyles = useMemo(() => createLearnStyles(theme), [theme]);

  // Simplified slides: intro, main content, all key points together, summary
  const slides = [
    { type: "intro", title: data.title },
    { type: "content", content: data.content },
    ...(data.keyPoints && data.keyPoints.length > 0
      ? [{ type: "keypoints", points: data.keyPoints }]
      : []),
    { type: "summary", title: data.title, content: data.content },
  ];

  const isLastSlide = currentSlide === slides.length - 1;
  const isFirstSlide = currentSlide === 0;
  const currentContent = slides[currentSlide];

  const speakContent = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
    } else {
      let text = "";
      if (currentContent.type === "intro") text = data.title;
      else if (currentContent.type === "content") text = currentContent.content;
      else if (currentContent.type === "keypoints")
        text = currentContent.points.join(". ");
      else if (currentContent.type === "summary")
        text = `Summary: ${data.title}. ${data.content}`;

      setIsSpeaking(true);
      speakSafely(text, {
        language: "en",
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
  };

  const handleNext = () => {
    stopSpeech();
    setIsSpeaking(false);
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    stopSpeech();
    setIsSpeaking(false);
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
          <TouchableOpacity
            style={learnStyles.speakerBtn}
            onPress={speakContent}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isSpeaking ? "Stop reading content" : "Read content aloud"}
          >
            <Icon
              name={isSpeaking ? "VolumeSlash" : "VolumeHigh"}
              size={22}
              color={isSpeaking ? "#FFF" : theme.primary}
            />
          </TouchableOpacity>

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
