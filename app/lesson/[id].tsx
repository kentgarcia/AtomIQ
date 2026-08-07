import { Icon } from "@/components/ui/icon";
import { getLessonById } from "@/content/lessons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { getLevelProgress, updateLevelProgress } from "@/services/database";
import { useTheme, type Palette } from "@/theme";

import { AssessmentView } from "@/components/lesson/AssessmentView";
import { BriefingView } from "@/components/lesson/BriefingView";
import { DebriefView } from "@/components/lesson/DebriefView";
import { LabView } from "@/components/lesson/LabView";
import { MicroLearnView } from "@/components/lesson/MicroLearnView";
import { MythBusterView } from "@/components/lesson/MythBusterView";
import { createStyles } from "@/components/lesson/styles";

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const [step, setStep] = useState(0);
  const [isReplay, setIsReplay] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const THEME = theme.palettes.lesson;
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(THEME, width), [THEME, width]);
  const levelId = typeof id === "string" ? id : "radiation-shielding";

  // Load lesson from content system
  const lesson = getLessonById(levelId);

  // Check if this is a replay and only mark in_progress for new lessons
  useEffect(() => {
    const checkAndMarkProgress = async () => {
      try {
        const existingProgress = (await getLevelProgress(levelId)) as {
          status?: string;
        } | null;
        const isAlreadyCompleted = existingProgress?.status === "completed";

        setIsReplay(isAlreadyCompleted);

        // Only mark as in_progress if not already completed
        if (!isAlreadyCompleted) {
          await updateLevelProgress(levelId, {
            status: "in_progress",
          });
        }
      } catch (error) {
        console.error("Error checking/marking level progress:", error);
      }
    };

    checkAndMarkProgress();
  }, [levelId]);

  // If lesson not found, show error
  if (!lesson) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: THEME.bg,
        }}
      >
        <Icon name="Danger" size={64} color={THEME.error} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: THEME.text,
            marginTop: 16,
          }}
        >
          Lesson not found
        </Text>
        <TouchableOpacity
          style={{
            marginTop: 24,
            backgroundColor: THEME.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
          }}
          onPress={() => router.back()}
        >
          <Text style={{ color: "#FFF", fontWeight: "700" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Simple step manager
  const nextStep = () => setStep((s) => s + 1);

  // Get current step from lesson
  const currentStep = lesson.steps[step];

  if (!currentStep) {
    // All steps completed, go back
    router.back();
    return null;
  }

  const renderStep = () => {
    switch (currentStep.type) {
      case "briefing":
        return (
          <BriefingView
            key={step}
            data={currentStep.data}
            onComplete={nextStep}
            theme={THEME}
          />
        );
      case "myth_buster":
        return (
          <MythBusterView
            key={step}
            data={currentStep.data}
            onComplete={nextStep}
            theme={THEME}
          />
        );
      case "micro_learn":
        return (
          <MicroLearnView
            key={step}
            data={currentStep.data}
            onComplete={nextStep}
            theme={THEME}
          />
        );
      case "lab":
        return (
          <LabView
            key={step}
            data={currentStep.data}
            onComplete={nextStep}
            onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
            theme={THEME}
          />
        );
      case "assessment":
        return (
          <AssessmentView
            key={step}
            data={currentStep.data}
            onComplete={nextStep}
            theme={THEME}
          />
        );
      case "debrief":
        return (
          <DebriefView
            key={step}
            data={currentStep.data}
            levelId={levelId}
            isReplay={isReplay}
            theme={THEME}
          />
        );
      default:
        return (
          <BriefingView
            key={step}
            data={currentStep.data}
            onComplete={nextStep}
            theme={THEME}
          />
        );
    }
  };

  const totalSteps = lesson.steps.length;
  const isFirstStep = step === 0;
  const isLastStep = step === totalSteps - 1;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: THEME.bg }}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Progress Header - Show for all steps except first (briefing) and last (debrief) */}
          {!isFirstStep && !isLastStep && (
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{ padding: 8 }}
              >
                <Icon name="Close" size={24} color={THEME.textMuted} />
              </TouchableOpacity>
              <View style={styles.progressBarBg}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    { width: `${((step + 1) / totalSteps) * 100}%` },
                  ]}
                />
              </View>
            </View>
          )}

          <View style={{ flex: 1 }}>{renderStep()}</View>
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}