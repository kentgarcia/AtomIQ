/**
 * The page every onboarding step sits on: the plain theme background, the progress bar on top when
 * the step has one, a scrolling body (content starts top-left, or is centred for the hero steps)
 * and a pinned footer for the step's main button. The column is the lesson's own (`LESSON_FRAME`),
 * so a tablet gets a readable width. The body scrolls under the footer on a small phone or when
 * the keyboard is up; nothing is ever hidden behind the button.
 */

import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FooterRow } from "@/components/lesson/FooterRow";
import { LESSON_FRAME } from "@/components/lesson/LessonFrame";
import { Button } from "@/components/ui/button";
import { OnboardingBar } from "@/components/onboarding/OnboardingBar";
import { spacing } from "@/theme";

export function StepLayout({
  progress,
  onBack,
  center = false,
  children,
  footer,
  bleedFooter = false,
}: {
  /** The bar's fill; leave out for a step without a bar (hello, plan, welcome). */
  progress?: number;
  onBack?: (() => void) | null;
  /** Centre the body in the room it has (the hero steps). */
  center?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  /** Draw the footer edge to edge with no padding of its own (the lesson's feedback sheet brings its own). */
  bleedFooter?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <View style={[LESSON_FRAME, { paddingTop: insets.top + spacing.xs }]}>{progress === undefined ? null : <OnboardingBar progress={progress} onBack={onBack} />}</View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[LESSON_FRAME, { flexGrow: 1, paddingTop: spacing.md, paddingBottom: spacing.xl, justifyContent: center ? "center" : "flex-start" }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer ? bleedFooter ? footer : <View style={[LESSON_FRAME, { paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.sm }]}>{footer}</View> : null}
    </View>
  );
}

/** The main button of a step: pinned in the footer, the same large button as a lesson's Continue. */
export function ContinueFooter({ label = "Continue", disabled, onPress, onBack }: { label?: string; disabled?: boolean; onPress: () => void; onBack?: (() => void) | null }) {
  return (
    <FooterRow onBack={onBack}>
      <Button label={label} size="large" disabled={disabled} onPress={onPress} />
    </FooterRow>
  );
}
