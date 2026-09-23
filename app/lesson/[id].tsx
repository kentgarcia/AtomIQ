import { Icon } from "@/components/ui/icon";
import { getLessonById } from "@/content/lessons";
import { UNITS } from "@/content/units";
import type { Lesson } from "@/content/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { getLevelProgress, updateLevelProgress } from "@/services/database";
import {useTheme, fontFamilies} from "@/theme";

import { AssessmentView } from "@/components/lesson/AssessmentView";
import { BriefingView } from "@/components/lesson/BriefingView";
import { DebriefView } from "@/components/lesson/DebriefView";
import { LabView } from "@/components/lesson/LabView";
import { LessonPreview } from "@/components/lesson/LessonPreview";
import { MicroLearnView } from "@/components/lesson/MicroLearnView";
import { MythBusterView } from "@/components/lesson/MythBusterView";
import { createStyles } from "@/components/lesson/styles";

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const [step, setStep] = useState(0);
  const [isReplay, setIsReplay] = useState(false);
  const [started, setStarted] = useState(false);
  const [topBarHeight, setTopBarHeight] = useState(0);
  const router = useRouter();
  const { theme } = useTheme();
  const THEME = theme.palettes.lesson;
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(THEME, width), [THEME, width]);
  const levelId = typeof id === "string" ? id : "radiation-shielding";

  // Unit context is available synchronously for the preview screen
  const unit = useMemo(
    () => UNITS.find((u) => u.lessonIds.includes(levelId)),
    [levelId],
  );

  // Load lesson from the on-device content database (async — SQLite read).
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getLessonById(levelId)
      .then((loaded) => {
        if (!cancelled) setLesson(loaded);
      })
      .catch((error) => {
        console.error("Error loading lesson:", error);
        if (!cancelled) setLesson(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [levelId]);

  // Check if this is a replay so the preview can show the review status
  useEffect(() => {
    const checkProgress = async () => {
      try {
        const existingProgress = (await getLevelProgress(levelId)) as {
          status?: string;
        } | null;
        setIsReplay(existingProgress?.status === "completed");
      } catch (error) {
        console.error("Error checking level progress:", error);
      }
    };

    checkProgress();
  }, [levelId]);

  // Mark in_progress only when the learner actually starts (not on preview)
  const handleProceed = useCallback(async () => {
    if (!isReplay) {
      try {
        await updateLevelProgress(levelId, {
          status: "in_progress",
        });
      } catch (error) {
        console.error("Error marking level progress:", error);
      }
    }
    // The preview screen covers the briefing — jump to the first content step
    const firstContentStep =
      lesson?.steps.findIndex((s) => s.type !== "briefing") ?? 0;
    setStep(firstContentStep > 0 ? firstContentStep : 0);
    setStarted(true);
  }, [isReplay, levelId, lesson]);

  // If lesson not found, show error
  if (!isLoading && !lesson) {
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
            fontFamily: fontFamilies.bold,
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
        </TouchableOpacity>
      </View>
    );
  }

  // Simple step manager
  const nextStep = () => setStep((s) => s + 1);

  // Get current step from lesson (undefined while still loading)
  const currentStep = lesson?.steps[step];

  // All steps completed — only once the lesson is actually running
  if (started && lesson && !currentStep) {
    router.back();
    return null;
  }

  const renderStep = () => {
    if (!currentStep) return null;
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
            topBarHeight={topBarHeight}
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

  const totalSteps = lesson?.steps.length ?? 0;
  const isFirstStep = step === 0;
  const isLastStep = step === totalSteps - 1;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: THEME.bg }}>
        {/* Lesson content — mounts when the preview proceeds */}
        {started && (
          <View style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }}>
              {/* Progress Header - hidden on first and last steps */}
              {!isFirstStep && !isLastStep && (
                <View
                  style={styles.topBar}
                  onLayout={(e) => setTopBarHeight(e.nativeEvent.layout.height)}
                >
                  <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ padding: 8 }}
                  >
                    <Icon name="Close" size={24} color={THEME.textMuted} />
                  </TouchableOpacity>
                  <View style={styles.progressBarBg}>
                    <View
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
        )}

        {/* Preview overlay — replaced instantly when the lesson starts */}
        {!started && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
            <LinearGradient
              colors={
                theme.mode === "dark" ? [THEME.bg, THEME.bg] : ["#FFF3E0", "#FFFFFF"]
              }
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <SafeAreaView style={{ flex: 1 }}>
              <LessonPreview
                lesson={lesson}
                loading={isLoading}
                isReplay={isReplay}
                unitTitle={unit?.title ?? "Lesson"}
                unitSubtitle={unit?.subtitle ?? "AtomIQ Lesson"}
                fallbackDescription={unit?.description ?? ""}
                onClose={() => router.back()}
                onProceed={handleProceed}
              />
            </SafeAreaView>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}