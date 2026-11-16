/**
 * Plays an ordered list of cards: teaching, items and simulations. Runs lessons,
 * practice nodes, checkpoints and the daily review; only the card list differs.
 * State lives in the pure run machine (services/lesson-core.ts).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, BackHandler, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { SideTail } from "@/components/npc/SpeechBubble";
import { EASE_OUT } from "@/components/motion/motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PressableIconButton, useBottomInset } from "@/components/layout";
import { ProgressSparkle } from "@/components/lesson/ProgressSparkle";
import { CardBadge, type BadgeTone } from "@/components/lesson/CardBadge";
import { TeacherAvatar, TeacherProvider, type Teller } from "@/components/lesson/Conversation";
import { FeedbackDock } from "@/components/lesson/FeedbackDock";
import { TeacherStage } from "@/components/lesson/TeacherStage";
import { LESSON_FRAME, LessonFrame } from "@/components/lesson/LessonFrame";
import { evaluateItem } from "@/content/curriculum/evaluate";
import { formatEstimate } from "@/content/curriculum/estimate";
import type { AtomBuilderData, ItemResponse, ItemResult, PredictItemData, ResolvedCard, ScaleZoomData } from "@/content/curriculum/types";
import {
  acceptDeeper,
  advance,
  createRun,
  currentCard,
  canGoBack,
  goBack,
  isRevisit,
  progressOf,
  skipDeeper,
  submitAnswer,
  summarize,
  type RunCard,
  type RunSummary,
} from "@/services/lesson-core";
import type { RecordedAnswer } from "@/services/curriculum-progress";
import { notifyError, notifySuccess } from "@/services/haptics";
import type { MasterySurface } from "@/services/mastery-core";
import { createStyles, fontFaces, fontSizes, radius, spacing, useResponsiveLayout, useTheme, withAlpha } from "@/theme";

import { AtomBuilderSim } from "./cards/AtomBuilderSim";
import { ItemCard } from "./cards/ItemCard";
import { ScaleZoomSim } from "./cards/ScaleZoomSim";
import { TeachCard, type TeachGuess } from "./cards/TeachCard";

const useStyles = createStyles((theme) => ({
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingBottom: spacing.sm },
  barWrap: { flex: 1, height: 16 },
  bar: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: radius.full, backgroundColor: theme.colors.border, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: radius.full, backgroundColor: theme.colors.primary },
  // Sparkles sit outside the clipped bar, on a box that grows with the fill.
  sparkAnchor: { position: "absolute", top: 0, bottom: 0, left: 0 },
  barDone: { backgroundColor: theme.colors.success },
  // A thin lighter strip along the top of the fill (flat, no gradient): a little shine.
  barShine: { position: "absolute", top: 3, left: spacing.sm, right: spacing.sm, height: 4, borderRadius: radius.full, backgroundColor: withAlpha(theme.colors.onPrimary, 0.3) },
  banner: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: theme.colors.warningSurface,
    marginBottom: spacing.sm,
  },
  bannerText: { ...fontFaces.bold, fontSize: fontSizes.md, color: theme.colors.text },
  scroll: { flexGrow: 1, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  cardWrap: { flexGrow: 1 },
  footer: {
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  correct: { flex: 1, justifyContent: "center" },
  correctRow: { flexDirection: "row", alignItems: "center", gap: spacing.xl },
  correctBubble: { flex: 1 },
  correctText: { ...fontFaces.semibold, fontSize: fontSizes["4xl"], lineHeight: 32, color: theme.colors.text },
  offerFill: { flex: 1, paddingVertical: spacing.sm },
  offerBadge: { alignItems: "center" },
  offerTitle: { ...fontFaces.heavy, fontSize: fontSizes["7xl"], lineHeight: 38, textAlign: "center", color: theme.colors.text },
  offerBody: { ...fontFaces.medium, fontSize: fontSizes["2xl"], lineHeight: 26, textAlign: "center", color: theme.colors.textSecondary },
  skip: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  skipText: { ...fontFaces.bold, fontSize: fontSizes.xl, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
}));

/** What kind of run this is. A lesson and a checkpoint show no chip; the others tell the learner where they are. */
export type RunKind = "lesson" | "practice" | "checkpoint" | "testout" | "review";
const RUN_CHIPS: Partial<Record<RunKind, { icon: string; label: string; tone: BadgeTone }>> = {
  practice: { icon: "Repeat", label: "Practice", tone: "primary" },
  testout: { icon: "Flash", label: "Test out", tone: "info" },
  review: { icon: "Refresh", label: "Review", tone: "info" },
};

export interface LessonRunResult {
  summary: RunSummary;
  /** Every scored submission, in order, for mastery. */
  answers: RecordedAnswer[];
  /** How long the run took, from the first card to the last (ms). */
  durationMs: number;
}

export interface LessonRunProps {
  cards: ResolvedCard[];
  surface: MasterySurface;
  /** Confirm before leaving (true while the run is in progress). */
  onExit: () => void;
  onFinish: (result: LessonRunResult) => void;
  /** Shown above the card, e.g. the session title. */
  label?: string;
  /** What kind of run this is, for the chip in the top bar (default: a lesson, no chip). */
  kind?: RunKind;
  /** The teacher who asks the questions and tells the cards. Without one, cards use their plain layout. */
  teacher?: Teller | null;
}

/** Objective a card exercises, for the run summary. */
function objectiveOf(card: ResolvedCard): string | undefined {
  if (card.item) return card.item.objectiveId;
  const objectives = (card.data as Partial<AtomBuilderData>).objectives;
  return Array.isArray(objectives) ? objectives[0] : undefined;
}

function guessText(item: ResolvedCard["item"], response: ItemResponse): string {
  if (!item || response.type !== "predict") return "";
  const data = item.data as unknown as PredictItemData;
  if (data.input === "estimate") return formatEstimate(Number(response.value), data.unit);
  return data.options?.find((o) => o.id === response.value)?.label ?? String(response.value);
}

export function LessonRun({ cards, surface, onExit, onFinish, label, kind = "lesson", teacher = null }: LessonRunProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const layout = useResponsiveLayout();
  const reduced = useReducedMotion();
  const bottomInset = useBottomInset();

  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const runCards: RunCard[] = useMemo(
    () =>
      cards.map((c) => ({
        id: c.id,
        kind: c.kind,
        tier: c.tier,
        scored: c.scored && c.item?.type !== "predict",
        objectiveId: objectiveOf(c),
      })),
    [cards],
  );
  const [run, setRun] = useState(() => createRun(runCards));
  const [response, setResponse] = useState<ItemResponse | null>(null);
  const [result, setResult] = useState<ItemResult | null>(null);
  const [simDone, setSimDone] = useState(false);
  // The "let's correct the ones you missed" screen shows once, when the mistakes replay begins.
  const [replayIntroDone, setReplayIntroDone] = useState(false);
  const [guesses, setGuesses] = useState<Record<string, TeachGuess>>({});
  const answers = useRef<RecordedAnswer[]>([]);
  const finished = useRef(false);
  const startedAt = useRef(0);
  // Stamped once on mount (an effect, not render, so render stays pure).
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  // Changes on every card change so interactions remount fresh (and shuffle anew on replay).
  const [instance, setInstance] = useState(0);

  const runCard = currentCard(run);
  const card = runCard ? cardById.get(runCard.id) : undefined;
  const locked = result !== null;

  // Finish once the machine is done.
  useEffect(() => {
    if (run.phase === "done" && !finished.current) {
      finished.current = true;
      onFinish({ summary: summarize(run), answers: answers.current, durationMs: Date.now() - startedAt.current });
    }
  }, [run, onFinish]);

  // Confirm before leaving; Android back asks too.
  const confirmExit = useCallback(() => {
    Alert.alert("Leave this lesson?", "Your progress here will be lost.", [
      { text: "Stay", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: onExit },
    ]);
  }, [onExit]);
  const stepBack = useCallback(() => {
    setInstance((i) => i + 1);
    setResponse(null);
    setResult(null);
    setSimDone(false);
    setRun((r) => goBack(r));
  }, []);
  const backable = canGoBack(run);
  // The top-left control steps back when there is a previous step, and asks to leave on the first one.
  const onHeaderPress = backable ? stepBack : confirmExit;
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onHeaderPress();
      return true;
    });
    return () => sub.remove();
  }, [onHeaderPress]);

  const next = useCallback(() => {
    setInstance((i) => i + 1);
    setResponse(null);
    setResult(null);
    setSimDone(false);
    setRun((r) => advance(r));
  }, []);

  const check = useCallback(() => {
    if (!card?.item || !response) return;
    const evaluated = evaluateItem(card.item.type, card.item.data, response);
    setResult(evaluated);
    if (evaluated.correct) notifySuccess();
    else notifyError();
    setRun((r) => submitAnswer(r, card.id, evaluated.correct));
    if (!isRevisit(run, card.id)) answers.current.push({ itemId: card.item.id, objectiveId: card.item.objectiveId, surface, correct: evaluated.correct });
  }, [card, response, surface, run]);

  const lockInGuess = useCallback(() => {
    if (!card?.item || !response) return;
    setGuesses((g) => ({ ...g, [card.id]: { text: guessText(card.item, response) } }));
    setRun((r) => advance(submitAnswer(r, card.id, true)));
    setInstance((i) => i + 1);
    setResponse(null);
    setSimDone(false);
  }, [card, response]);

  const onResponse = useCallback((r: ItemResponse | null) => setResponse(r), []);
  const onSimComplete = useCallback(() => setSimDone(true), []);

  // A card is seen hundreds of times: a short ease-out, no travel beyond a nudge.
  const enter = reduced ? undefined : FadeInDown.duration(200).easing(EASE_OUT);
  // A little more side room than the app default, so cards breathe without leaving dead margins.
  const frame = { ...LESSON_FRAME, paddingHorizontal: spacing.lg };

  // Deeper offer
  if (run.offer) {
    return (
      <LessonFrame>
        <Header progress={progressOf(run)} onPress={onHeaderPress} canGoBack={backable} styles={styles} frame={frame} topInset={layout.insets.top} kind={kind} />
        <View style={[frame, styles.offerFill]}>
          <Animated.View entering={reduced ? undefined : FadeIn.duration(200)} style={styles.offerFill}>
            {/* The teacher fills the page and asks, in a bubble right above their head. */}
            <TeacherStage teller={teacher} minHeight={380}>
              <View style={styles.offerBadge}>
                <CardBadge icon="Star1" label="Bonus card" tone="gold" />
              </View>
              <Text accessibilityRole="header" style={styles.offerTitle}>Want to go deeper?</Text>
              <Text style={styles.offerBody}>There is a bonus card here for the curious. It is optional.</Text>
            </TeacherStage>
          </Animated.View>
        </View>
        <View style={[styles.footer, frame, { paddingBottom: bottomInset + spacing.sm }]}>
          <Button label="Show me" onPress={() => { setInstance((i) => i + 1); setRun((r) => acceptDeeper(r)); }} />
          <Button label="Skip" variant="secondary" onPress={() => { setInstance((i) => i + 1); setRun((r) => skipDeeper(r)); }} />
        </View>
      </LessonFrame>
    );
  }

  // Mistakes replay: tell the learner what is about to happen before the cards come back.
  if (run.phase === "replay" && !replayIntroDone) {
    const line = "Let\u2019s correct the exercises you missed!";
    return (
      <LessonFrame>
        <Header progress={progressOf(run)} onPress={onHeaderPress} canGoBack={backable} styles={styles} frame={frame} topInset={layout.insets.top} kind={kind} />
        <View style={[frame, styles.correct]}>
          <Animated.View entering={reduced ? undefined : FadeIn.duration(200)} style={styles.correctRow}>
            <View style={styles.correctBubble}>
              <Card padding={spacing.lg} gap={spacing.sm}>
                <Text accessibilityRole="header" style={styles.correctText}>{line}</Text>
              </Card>
              <SideTail />
            </View>
            <TeacherAvatar size={150} teller={teacher} />
          </Animated.View>
        </View>
        <View style={[styles.footer, frame, { paddingBottom: bottomInset + spacing.sm }]}>
          <Button label="Continue" onPress={() => { setInstance((i) => i + 1); setReplayIntroDone(true); }} />
        </View>
      </LessonFrame>
    );
  }

  if (!card || !runCard) return <LessonFrame><View /></LessonFrame>;

  const isPredict = card.item?.type === "predict";
  const body = (() => {
    if (card.kind === "teach") {
      const guess = card.type === "reveal" ? guesses[String((card.data as { predictCardId?: string }).predictCardId)] : undefined;
      return <TeachCard type={card.type as "explain" | "story" | "reveal"} data={card.data as never} cardId={`${card.lessonId}:${card.id}`} guess={guess} />;
    }
    if (card.kind === "sim") {
      return card.type === "atom-builder" ? (
        <AtomBuilderSim key={`${card.id}-${instance}`} data={card.data as unknown as AtomBuilderData} onComplete={onSimComplete} />
      ) : (
        <ScaleZoomSim key={`${card.id}-${instance}`} data={card.data as unknown as ScaleZoomData} onComplete={onSimComplete} />
      );
    }
    if (card.item) {
      return <ItemCard key={`${card.id}-${instance}`} item={card.item} instanceId={`${card.id}-${instance}`} locked={locked} result={result} onChange={onResponse} />;
    }
    return null;
  })();

  return (
    <TeacherProvider teacher={teacher}>
    <LessonFrame>
      <Header progress={progressOf(run)} onPress={onHeaderPress} canGoBack={backable} styles={styles} frame={frame} topInset={layout.insets.top} kind={kind} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* A teaching card has room to spare, so it sits in the middle of it; questions start at the top. */}
        <Animated.View key={`${card.id}-${instance}`} entering={enter} style={[frame, styles.cardWrap, card.kind === "teach" ? { justifyContent: "center" } : null]}>
          {run.phase === "replay" ? (
            <View style={styles.banner}>
              <TeacherAvatar size={44} teller={teacher} />
              <Text style={styles.bannerText}>Let&apos;s try the ones you missed again</Text>
            </View>
          ) : label ? (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>{label}</Text>
            </View>
          ) : null}
          {body}
        </Animated.View>
      </ScrollView>
      {result && card.item ? (
        // After checking, the feedback sheet takes the footer's place, Continue included.
        <FeedbackDock
          result={result}
          explanation={String((card.item.data as { explanation?: string }).explanation ?? "")}
          seed={card.id}
          onContinue={next}
          paddingHorizontal={frame.paddingHorizontal}
          paddingBottom={bottomInset + spacing.sm}
        />
      ) : (
      <View style={[styles.footer, frame, { paddingBottom: bottomInset + spacing.sm }]}>
        {card.kind === "teach" ? (
          <Button label="Continue" onPress={next} />
        ) : card.kind === "sim" ? (
          <>
            {/* Not a button: plain grey text above Continue, for those who want to move on. */}
            {!simDone ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Skip this one" onPress={next} style={styles.skip} hitSlop={8}>
                <Text style={styles.skipText}>Skip this one</Text>
              </Pressable>
            ) : null}
            <Button label="Continue" disabled={!simDone} onPress={next} />
          </>
        ) : isPredict ? (
          <Button label="Lock in my guess" disabled={!response} onPress={lockInGuess} />
        ) : (
          <Button label="Check" disabled={!response} onPress={check} />
        )}
      </View>
      )}
    </LessonFrame>
    </TeacherProvider>
  );
}

function Header({ progress, onPress, canGoBack: backable, styles, frame, topInset, kind }: { progress: number; onPress: () => void; canGoBack: boolean; styles: ReturnType<typeof useStyles>; frame: object; topInset: number; kind: RunKind }) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  // The bar glides to the new value (a state change, so it is shown); interrupted moves continue from where they are.
  const fill = useSharedValue(Math.max(0.04, progress));
  // 0 to 1 each time the bar grows: drives the sparkles at its end.
  const pop = useSharedValue(0);
  const last = useRef(progress);
  useEffect(() => {
    const target = Math.max(0.04, progress);
    const grew = progress > last.current;
    last.current = progress;
    if (reduced) {
      fill.value = target;
      return;
    }
    fill.value = withTiming(target, { duration: 450, easing: EASE_OUT });
    if (grew) {
      pop.value = 0;
      pop.value = withTiming(1, { duration: 700, easing: EASE_OUT });
    }
  }, [progress, reduced, fill, pop]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const chip = RUN_CHIPS[kind] ?? null;
  return (
    <View style={[styles.top, frame, { paddingTop: topInset + spacing.xs }]}>
      <PressableIconButton accessibilityLabel={backable ? "Previous step" : "Leave lesson"} onPress={onPress}>
        <Icon name={backable ? "ArrowLeft2" : "Close"} size={26} color={theme.colors.textSecondary} />
      </PressableIconButton>
      <View style={styles.barWrap} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
        <View style={styles.bar}>
          {/* Orange while you work; green only once the run is complete. */}
          <Animated.View style={[styles.barFill, progress >= 1 && styles.barDone, fillStyle]}>
            <View style={styles.barShine} />
          </Animated.View>
        </View>
        <Animated.View pointerEvents="none" style={[styles.sparkAnchor, fillStyle]}>
          <ProgressSparkle pop={pop} />
        </Animated.View>
      </View>
      {chip ? <CardBadge compact icon={chip.icon} label={chip.label} tone={chip.tone} /> : null}
    </View>
  );
}
