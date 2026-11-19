/**
 * The four question steps (why, level, how, goal) as ONE place. The progress bar on top and the Continue button at the bottom
 * are mounted once and stay put: the bar glides to its next fill and the button only goes off and on. Only the page between
 * them changes: the old one fades and drifts off in 150 ms while the new one builds itself in a cascade (the title, Shrodi,
 * his bubble, the options one by one: `cascade-fx.ts`), each piece drifting in from the side the learner is going to. The
 * direction is a shared value (`direction`, set by `app/onboarding.tsx` before the step changes), because an exiting view
 * reads its animation from its last render, before anyone knows where it is going; 0 is the first page, which arrives
 * attached to the hello page. Sound: a whoosh on Continue, the tab sound on Back, and a cue for each beat of the cascade.
 */

import { ScrollView, View } from "react-native";
import Animated, { type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LESSON_FRAME } from "@/components/lesson/LessonFrame";
import { ChoicePage } from "@/components/onboarding/ChoiceStep";
import { HowPage } from "@/components/onboarding/HowStep";
import { OnboardingBar } from "@/components/onboarding/OnboardingBar";
import { pageOut } from "@/components/motion/cascade-fx";
import { ContinueFooter } from "@/components/onboarding/StepLayout";
import { stepProgress, type Answers, type OnboardingStep } from "@/services/onboarding-core";
import { playSfx } from "@/services/sfx";
import { spacing } from "@/theme";

export type QuestionFlowStep = "why" | "level" | "how" | "goal";
export const FLOW_STEPS: readonly OnboardingStep[] = ["why", "level", "how", "goal"];

export function QuestionFlow({
  step,
  answers,
  direction,
  onPick,
  onContinue,
  onBack,
}: {
  step: QuestionFlowStep;
  answers: Answers;
  /** 1 going on, -1 going back, 0 no motion. Set before `step` changes. */
  direction: SharedValue<number>;
  onPick: (step: "why" | "level" | "goal", id: string | number) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const picked = step === "why" ? answers.reason : step === "level" ? answers.level : step === "goal" ? answers.goalMinutes : true;

  return (
    <View style={{ flex: 1 }}>
      <View style={[LESSON_FRAME, { paddingTop: insets.top + spacing.xs }]}>
        <OnboardingBar
          progress={stepProgress(step)}
          onBack={() => {
            void playSfx("ui.tab");
            onBack();
          }}
        />
      </View>
      {/* The pages are laid over each other in the room between bar and button, so one leaving never pushes the one arriving */}
      <View style={{ flex: 1, overflow: "hidden" }}>
        <Animated.View key={step} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} exiting={pageOut(direction)}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={[LESSON_FRAME, { flexGrow: 1, paddingTop: spacing.md, paddingBottom: spacing.xl }]} showsVerticalScrollIndicator={false}>
            {step === "how" ? (
              <HowPage reason={answers.reason} direction={direction} />
            ) : (
              <ChoicePage step={step} picked={picked as string | number | null} direction={direction} onPick={(id) => onPick(step, id)} />
            )}
          </ScrollView>
        </Animated.View>
      </View>
      <View style={[LESSON_FRAME, { paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.sm }]}>
        <ContinueFooter
          disabled={picked === null}
          onPress={() => {
            void playSfx("lesson.whoosh");
            onContinue();
          }}
        />
      </View>
    </View>
  );
}
