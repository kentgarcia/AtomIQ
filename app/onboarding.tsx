/**
 * Onboarding: nine short steps in the order the best first-run flows use (plan and sources:
 * docs/ONBOARDING_SPEC.md). One promise (hello), three questions with Shrodi answering back (why,
 * level, goal) around a pitch written from the answers (how), a short "building your path" moment
 * (plan), two real questions from lesson 1 before any form (taste), then the name and the Terms
 * (profile) and a welcome on a peak. This file is only the step machine, Android back and the
 * finish; every screen is in `components/onboarding/` and every rule in `services/onboarding-core.ts`.
 *
 * Nothing is saved until the learner has given a name and ticked the Terms: the answers wait in
 * state, and `handleFinish` writes the profile, the XP for the taste, the answers and the
 * completed flag, in that order, then shows the welcome.
 */

import { serializeAvatar, STARTER_AVATARS, type StarterId } from "@/components/avatar/avatar-core";
import { LessonFrame } from "@/components/lesson/LessonFrame";
import { skipSettle } from "@/components/motion/settle";
import { EASE_OUT } from "@/theme/motion";
import { HelloStep } from "@/components/onboarding/HelloStep";
import { FLOW_STEPS, QuestionFlow } from "@/components/onboarding/QuestionFlow";
import { PlanStep } from "@/components/onboarding/PlanStep";
import { ProfileStep } from "@/components/onboarding/ProfileStep";
import { TasteStep } from "@/components/onboarding/TasteStep";
import { WelcomeStep } from "@/components/onboarding/WelcomeStep";
import {
  EMPTY_ANSWERS,
  nextStep,
  previousStep,
  serializeAnswers,
  TASTE_XP,
  type Answers,
  type GoalMinutes,
  type Level,
  type OnboardingStep,
  type Reason,
} from "@/services/onboarding-core";
import { setOnboardingAnswers } from "@/services/storage";
import { playSfx } from "@/services/sfx";
import { useStorage } from "@/services/StorageContext";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { BackHandler, Platform, View } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

export default function Onboarding() {
  const router = useRouter();
  const { updateUserProfile, userProfile, addXP, setOnboardingDone } = useStorage();

  const [step, setStep] = useState<OnboardingStep>("hello");
  // Which way the question pages slide (1 on, -1 back, 0 none: the first page arrives attached to hello). Set before the step changes.
  const direction = useSharedValue(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  // Which of the two starting avatars the learner picked on the profile step
  const [starter, setStarter] = useState<StarterId>("classic");
  // The two questions were answered (earns the XP) or were left / could not load (never offered again)
  const [tasteDone, setTasteDone] = useState(false);
  const [tasteSkipped, setTasteSkipped] = useState(false);
  const [busy, setBusy] = useState(false);
  // Hello and the first question are one tall strip, two screens high. Get started scrolls it up by one screen, so the
  // next page rides in attached to the bottom of the first and stops exactly where it normally sits. Later steps stay
  // in the same strip, already scrolled (the bottom screen), so nothing is remounted when the slide ends.
  const [frameHeight, setFrameHeight] = useState(0);
  const [helloLeaving, setHelloLeaving] = useState(false);
  const reducedMotion = useReducedMotion();
  const strip = useSharedValue(0);
  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateY: strip.get() }] }));
  useEffect(() => {
    if (!helloLeaving) strip.set(step === "hello" ? 0 : -frameHeight);
  }, [step, frameHeight, helloLeaving, strip]);
  const slideAway = () => {
    if (helloLeaving || frameHeight === 0) return;
    setHelloLeaving(true);
    skipSettle(true);
    forward();
    const done = () => {
      skipSettle(false);
      setHelloLeaving(false);
    };
    if (reducedMotion) {
      strip.set(-frameHeight);
      done();
      return;
    }
    strip.set(withTiming(-frameHeight, { duration: 300, easing: EASE_OUT }, (finished) => {
      if (finished) runOnJS(done)();
    }));
  };

  const stepOverTaste = tasteDone || tasteSkipped;

  const forward = useCallback(() => {
    const to = nextStep(step, { skipTaste: stepOverTaste });
    direction.set(step === "hello" ? 0 : 1);
    if (to) setStep(to);
  }, [step, stepOverTaste, direction]);

  const back = useCallback(() => {
    const to = previousStep(step);
    if (!to) return;
    direction.set(-1);
    // The taste is a one-time thing: back from the profile goes over it
    setStep(to === "taste" && stepOverTaste ? "goal" : to);
  }, [step, stepOverTaste, direction]);

  // Android back walks onboarding backwards instead of leaving the flow and losing the answers
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === "welcome") {
        router.replace("/(tabs)");
        return true;
      }
      if (step === "hello") return false;
      if (step === "plan") return true; // a three-second transition, nothing to go back to
      back();
      return true;
    });
    return () => subscription.remove();
  }, [step, router, back]);

  const handleFinish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const trimmed = name.trim();
      const userId = userProfile?.user_id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const design = STARTER_AVATARS.find((a) => a.id === starter) ?? STARTER_AVATARS[0];
      await updateUserProfile({ user_id: userId, username: trimmed, display_name: trimmed, avatar_url: serializeAvatar(design.config) });
      // The learner starts with the XP they just earned
      if (tasteDone) await addXP(TASTE_XP);
      await setOnboardingAnswers(serializeAnswers(answers));
      await setOnboardingDone(true);
      setStep("welcome");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      router.replace("/(tabs)");
    } finally {
      setBusy(false);
    }
  };

  const body = (() => {
    switch (step) {
      case "hello":
        return null; // drawn in the strip below
      case "why":
      case "level":
      case "how":
      case "goal":
        return (
          <QuestionFlow
            step={step}
            answers={answers}
            direction={direction}
            onPick={(which, id) => setAnswers((a) => (which === "why" ? { ...a, reason: id as Reason } : which === "level" ? { ...a, level: id as Level } : { ...a, goalMinutes: id as GoalMinutes }))}
            onContinue={forward}
            onBack={back}
          />
        );
      case "plan":
        return <PlanStep answers={answers} onDone={forward} />;
      case "taste":
        return (
          <TasteStep
            onBack={back}
            onDone={() => {
              setTasteDone(true);
              setStep("profile");
            }}
            onSkip={() => {
              setTasteSkipped(true);
              setStep("profile");
            }}
          />
        );
      case "profile":
        return (
          <ProfileStep
            name={name}
            onName={setName}
            agreed={agreed}
            onAgreed={setAgreed}
            starter={starter}
            onStarter={setStarter}
            busy={busy}
            onContinue={() => void handleFinish()}
            onBack={back}
            onOpenTerms={() => router.push("/terms-of-service")}
            onOpenPrivacy={() => router.push("/privacy-policy")}
          />
        );
      case "welcome":
        return <WelcomeStep name={name.trim()} answers={answers} onGo={() => { setTimeout(() => void playSfx("transition.wipe"), 250); router.replace("/(tabs)"); }} />;
    }
  })();

  // Keyed by step so every screen mounts fresh: its entrance plays and nothing carries over from the last one
  const H = frameHeight;
  return (
    <LessonFrame>
      <View style={{ flex: 1, overflow: "hidden" }} onLayout={(e) => setFrameHeight(Math.round(e.nativeEvent.layout.height))}>
        {H > 0 ? (
          <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, height: H * 2 }, stripStyle]}>
            {step === "hello" || helloLeaving ? (
              <View pointerEvents={helloLeaving ? "none" : "auto"} style={{ position: "absolute", left: 0, right: 0, top: 0, height: H }}>
                <HelloStep onStart={slideAway} />
              </View>
            ) : null}
            {step === "hello" ? null : (
              <View style={{ position: "absolute", left: 0, right: 0, top: H, height: H }}>
                <React.Fragment key={FLOW_STEPS.includes(step) ? "questions" : step}>{body}</React.Fragment>
              </View>
            )}
          </Animated.View>
        ) : null}
      </View>
    </LessonFrame>
  );
}
