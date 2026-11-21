/**
 * Plays an ordered list of cards: teaching, items and simulations. Runs lessons,
 * practice nodes, checkpoints and the daily review; only the card list differs.
 * State lives in the pure run machine (services/lesson-core.ts).
 *
 * Answers are graded as soon as they are given (content/curriculum/check-mode.ts): a single tap at once;
 * a match, order or sort the moment its last piece is placed, where a wrong attempt shakes and resets
 * for another try in place while the run keeps the card for the mistakes replay. Only a typed number or
 * a slider keeps a Check button, and a prediction its "Lock in my guess".
 *
 * Teaching cards are told as a lecture (lecture-core.ts, LecturePage.tsx): one growing page where each card
 * is a few steps, the teacher's bubbles and the figure, revealed by Continue (hidden for the first moment of
 * each step). The next teaching card, and an activity authored as `connected`, is added below on the same
 * page. Every page starts at the top-left and scrolls down as it fills.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Platform, ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { FadeIn, FadeInDown, useSharedValue, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { SideTail } from "@/components/npc/SpeechBubble";
import { EASE_OUT } from "@/components/motion/motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { useFillStyle } from "@/components/ui/progress-fill";
import { PressableIconButton, useBottomInset } from "@/components/layout";
import { ProgressSparkle } from "@/components/lesson/ProgressSparkle";
import { CascadeProvider } from "@/components/motion/cascade-context";
import { CardBadge, type BadgeTone } from "@/components/lesson/CardBadge";
import { TeacherAvatar, TeacherProvider, TeacherSays, type Teller } from "@/components/lesson/Conversation";
import { FeedbackDock } from "@/components/lesson/FeedbackDock";
import { ScrollCue } from "@/components/lesson/ScrollCue";
import { moreBelow, scrollTarget, type ScrollMetrics } from "@/components/lesson/scroll-cue-core";
import { LeaveLessonDialog } from "@/components/lesson/LessonDialogs";
import { FOOTER_BUTTON_HEIGHT, FooterRow } from "@/components/lesson/FooterRow";
import { TextButton } from "@/components/lesson/TextButton";
import { canSaveProgress, isResumable, type RunState } from "@/services/lesson-progress-core";
import { LESSON_FRAME, LessonFrame } from "@/components/lesson/LessonFrame";
import { checkModeOf } from "@/content/curriculum/check-mode";
import { evaluateItem } from "@/content/curriculum/evaluate";
import { formatEstimate } from "@/content/curriculum/estimate";
import type { AtomBuilderData, DecayChainData, DecayWaitData, ItemResponse, ItemResult, PredictItemData, RadiationIdData, ResolvedCard, ScaleZoomData } from "@/content/curriculum/types";
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
import { playSfx } from "@/services/sfx";
import { SfxOnMount } from "@/components/ui/sfx-on-mount";
import type { MasterySurface } from "@/services/mastery-core";
import { createStyles, fontFaces, fontSizes, radius, spacing, useResponsiveLayout, useTheme, withAlpha } from "@/theme";

import { AtomBuilderSim } from "./cards/AtomBuilderSim";
import { DecayChainSim } from "./cards/DecayChainSim";
import { DecayWaitSim } from "./cards/DecayWaitSim";
import { ItemCard } from "./cards/ItemCard";
import type { Rejection } from "./cards/shared";
import { RadiationIdSim } from "./cards/RadiationIdSim";
import { ScaleZoomSim } from "./cards/ScaleZoomSim";
import { continueDelay, lectureSteps, pageStart, type FlowCard } from "./lecture-core";
import { LecturePage, stepCountOf, type LectureBlockInfo, type TeachGuess } from "./LecturePage";
import { useReadyAfter } from "./use-ready-after";

/** `lectureStep` after stepping back: every step of the card is showing, already read. */
const ALL_STEPS = 999;

const useStyles = createStyles((theme) => ({
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingBottom: spacing.sm },
  barWrap: { flex: 1, height: 16 },
  bar: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: radius.full, backgroundColor: theme.colors.border, overflow: "hidden" },
  barFill: { width: "100%", height: "100%", borderRadius: radius.full, backgroundColor: theme.colors.primary },
  // Sparkles sit outside the clipped bar, on a box that grows with the fill.
  sparkAnchor: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 },
  barDone: { backgroundColor: theme.colors.success },
  // A thin lighter strip along the top of the fill (flat, no gradient): a little shine.
  barShine: { position: "absolute", top: 3, left: spacing.sm, right: spacing.sm, height: 4, borderRadius: radius.full, backgroundColor: withAlpha(theme.colors.onPrimary, 0.3) },
  scroll: { flexGrow: 1, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  cardWrap: { flexGrow: 1 },
  footer: {
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  correct: { flex: 1, justifyContent: "center" },
  pageBody: { flexGrow: 1, gap: spacing["2xl"] },
  correctRow: { flexDirection: "row", alignItems: "center", gap: spacing.xl },
  correctBubble: { flex: 1 },
  correctText: { ...fontFaces.semibold, fontSize: fontSizes["4xl"], lineHeight: 32, color: theme.colors.text },
  offerFill: { flex: 1, paddingVertical: spacing.sm, justifyContent: "center" },
  offerPage: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.xl },
  offerHead: { flexDirection: "row", alignItems: "center", justifyContent: "center", alignSelf: "center", gap: spacing.sm },
  offerTile: { width: 32, height: 32, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(theme.colors.gold, 0.18) },
  offerHeadText: { ...fontFaces.heavy, fontSize: fontSizes.xl, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.text },
  offerTitle: { ...fontFaces.heavy, fontSize: fontSizes["4xl"], lineHeight: 32, color: theme.colors.text },
  offerBody: { ...fontFaces.medium, fontSize: fontSizes.xl, lineHeight: 24, color: theme.colors.textSecondary },
  offerNote: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderStyle: "dashed", borderColor: theme.colors.border },
  offerNoteText: { ...fontFaces.medium, flexShrink: 1, textAlign: "center", fontSize: fontSizes.lg, lineHeight: 22, color: theme.colors.textMuted },
}));

/** What kind of run this is. A lesson and a checkpoint show no chip; the others tell the learner where they are. */
export type RunKind = "lesson" | "practice" | "checkpoint" | "testout" | "review";
const RUN_CHIPS: Partial<Record<RunKind, { icon: string; label: string; tone: BadgeTone }>> = {
  practice: { icon: "Repeat", label: "Practice", tone: "primary" },
  testout: { icon: "Flash", label: "Test out", tone: "info" },
  review: { icon: "Refresh", label: "Review", tone: "info" },
};

const REPLAY_CHIP = { icon: "Refresh", label: "Missed ones", tone: "gold" as BadgeTone };

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
  /** A saved run to carry on from, instead of starting at the first card. */
  resume?: RunState | null;
  /**
   * Called with the run each time it moves (a card passed, an answer checked), so the screen can save it.
   * Only lessons save; leave it out for practice, checkpoints, test-outs and the daily review.
   */
  onProgress?: (state: RunState) => void;
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

export function LessonRun({ cards, surface, onExit, onFinish, label, kind = "lesson", teacher = null, resume = null, onProgress }: LessonRunProps) {
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
  const saves = Boolean(onProgress) && canSaveProgress(kind);
  const [run, setRun] = useState(() => resume?.run ?? createRun(runCards));
  const [response, setResponse] = useState<ItemResponse | null>(null);
  const [result, setResult] = useState<ItemResult | null>(null);
  // A wrong attempt at a match, order or sort: the item shows it, resets, and the learner tries again.
  const [rejection, setRejection] = useState<Rejection | null>(null);
  const rejections = useRef(0);
  // True once the current card has its result, so a late or doubled response cannot grade it twice.
  const settled = useRef(false);
  const [simDone, setSimDone] = useState(false);
  // The "let's correct the ones you missed" screen shows once, when the mistakes replay begins.
  const [replayIntroDone, setReplayIntroDone] = useState(resume?.replayIntroDone ?? false);
  const [guesses, setGuesses] = useState<Record<string, TeachGuess>>(resume?.guesses ?? {});
  const answers = useRef<RecordedAnswer[]>(resume ? [...resume.answers] : []);
  const finished = useRef(false);
  const startedAt = useRef(0);
  // Stamped once on mount (an effect, not render, so render stays pure).
  useEffect(() => {
    startedAt.current = Date.now() - (resume?.elapsedMs ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the starting point is read once, on mount
  }, []);
  // Changes on every card change so interactions remount fresh (and shuffle anew on replay).
  const [instance, setInstance] = useState(0);
  // Which way the next card arrives from (1 on, -1 stepped back): the cards build themselves like the onboarding's pages (`components/motion/cascade-fx.ts`)
  const direction = useSharedValue(1);
  // The lecture: how many steps of the current teaching card are showing (ALL_STEPS: every one, after stepping back),
  // and the first card of the current stretch of pages (a "go deeper" offer starts a new page).
  const [lectureStep, setLectureStep] = useState(1);
  const [pageFloor, setPageFloor] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);
  const shownPage = useRef("");
  // "More below": the page runs past the screen and the learner is not at its end (a fade and a down arrow)
  const metrics = useRef<ScrollMetrics>({ contentHeight: 0, viewHeight: 0, offsetY: 0 });
  const [cue, setCue] = useState(false);
  const updateCue = useCallback(() => {
    const next = moreBelow(metrics.current);
    setCue((was) => (was === next ? was : next));
  }, []);

  const runCard = currentCard(run);
  const card = runCard ? cardById.get(runCard.id) : undefined;
  const locked = result !== null;

  // The page this card sits on: teaching cards and a connected activity share one growing page.
  const flow: FlowCard[] = useMemo(
    () => run.queue.map((q) => ({ id: q.id, kind: cardById.get(q.id)?.kind ?? "item", connected: cardById.get(q.id)?.data?.connected === true })),
    [run.queue, cardById],
  );
  const start = runCard ? pageStart(flow, run.index, pageFloor, run.phase === "replay") : 0;
  const onLecture = !!card && (card.kind === "teach" || start < run.index);
  const pageId = onLecture ? `lecture:${run.queue[start]?.id}` : card ? `${card.id}-${instance}` : "";
  const stepTotal = card?.kind === "teach" ? stepCountOf(card) : 0;
  const stepNow = Math.min(lectureStep, stepTotal);
  const stepData = card?.kind === "teach" ? card.data : undefined;
  const currentStep = stepData ? lectureSteps(String((stepData as { body?: string }).body ?? ""), Boolean((stepData as { figure?: unknown }).figure), (stepData as { figureAt?: number }).figureAt)[stepNow - 1] : undefined;
  // Continue appears a moment after each step does (at once with reduced motion, and for a card already read).
  const continueIn = card?.kind !== "teach" || reduced || lectureStep >= ALL_STEPS ? 0 : continueDelay(currentStep);
  const continueReady = useReadyAfter(`${card?.id}:${stepNow}:${instance}`, continueIn);
  const mode = card?.item ? checkModeOf(card.item.type, card.item.data as Record<string, unknown>) : null;

  // Finish once the machine is done.
  useEffect(() => {
    if (run.phase === "done" && !finished.current) {
      finished.current = true;
      onFinish({ summary: summarize(run), answers: answers.current, durationMs: Date.now() - startedAt.current });
    }
  }, [run, onFinish]);

  // Save the run each time it moves, so leaving (or the app being closed) loses nothing.
  useEffect(() => {
    if (!saves || !onProgress || run.phase === "done" || !isResumable(run)) return;
    onProgress({ run, answers: [...answers.current], guesses, replayIntroDone, elapsedMs: Date.now() - startedAt.current });
  }, [saves, onProgress, run, guesses, replayIntroDone]);

  // Confirm before leaving (a modal); Android back asks too.
  const [leaving, setLeaving] = useState(false);
  const confirmExit = useCallback(() => setLeaving(true), []);
  const stay = useCallback(() => setLeaving(false), []);
  const leaveDialog = (
    <LeaveLessonDialog
      visible={leaving}
      saves={saves}
      noun={kind === "lesson" ? "lesson" : kind === "review" ? "review" : kind === "practice" ? "practice" : "test"}
      onStay={stay}
      onLeave={() => {
        setLeaving(false);
        onExit();
      }}
    />
  );
  const stepBack = useCallback(() => {
    direction.set(-1);
    settled.current = false;
    setLectureStep(ALL_STEPS);
    setInstance((i) => i + 1);
    setResponse(null);
    setResult(null);
    setRejection(null);
    setSimDone(false);
    setRun((r) => goBack(r));
  }, [direction]);
  const backable = canGoBack(run);
  // The top-left control is always a close button; stepping back is the Back button beside the main button.
  // The Android back key steps back when there is a previous step, and asks to leave on the first one.
  const onHeaderPress = backable ? stepBack : confirmExit;
  const onBack = backable ? stepBack : null;
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onHeaderPress();
      return true;
    });
    return () => sub.remove();
  }, [onHeaderPress]);

  const next = useCallback(() => {
    direction.set(1);
    settled.current = false;
    setLectureStep(1);
    setInstance((i) => i + 1);
    setResponse(null);
    setResult(null);
    setRejection(null);
    setSimDone(false);
    setRun((r) => advance(r));
  }, [direction]);

  // Continue on a lecture: the next step of this card, or (when it has no more) the next card.
  // A bubble still typing is finished by the same tap: it is no longer the newest step.
  const continueLecture = useCallback(() => {
    if (stepNow < stepTotal) setLectureStep(stepNow + 1);
    else next();
  }, [stepNow, stepTotal, next]);

  // Grade a response. A wrong build-up (match, order, sort) is not final: the card records the miss,
  // the item shakes and resets, and the learner tries again; everything else settles the card.
  const commit = useCallback(
    (given: ItemResponse) => {
      if (!card?.item || settled.current) return;
      const item = card.item;
      const evaluated = evaluateItem(item.type, item.data, given);
      const record = () => {
        if (!isRevisit(run, card.id)) answers.current.push({ itemId: item.id, objectiveId: item.objectiveId, surface, correct: evaluated.correct });
      };
      if (!evaluated.correct && checkModeOf(item.type, item.data as Record<string, unknown>) === "retry") {
        notifyError();
        void playSfx("lesson.answer-wrong");
        setRun((r) => submitAnswer(r, card.id, false));
        record();
        rejections.current += 1;
        setRejection({ token: rejections.current, wrongIds: evaluated.wrongIds ?? [] });
        return;
      }
      settled.current = true;
      setResult(evaluated);
      if (evaluated.correct) {
        notifySuccess();
        void playSfx("lesson.answer-correct");
      } else {
        notifyError();
        void playSfx("lesson.answer-wrong");
      }
      setRun((r) => submitAnswer(r, card.id, evaluated.correct));
      record();
    },
    [card, surface, run],
  );
  // A wrong pair in a match: it is shown by the card itself; the run only notes the miss, so the card
  // comes back in the mistakes replay until it is done with no wrong pair.
  const onMiss = useCallback(() => {
    if (!card?.item || settled.current) return;
    const item = card.item;
    notifyError();
    void playSfx("lesson.answer-wrong", { volume: 0.75 });
    setRun((r) => submitAnswer(r, card.id, false));
    if (!isRevisit(run, card.id)) answers.current.push({ itemId: item.id, objectiveId: item.objectiveId, surface, correct: false });
  }, [card, surface, run]);
  const check = useCallback(() => {
    if (response) commit(response);
  }, [commit, response]);

  const lockInGuess = useCallback(() => {
    if (!card?.item || !response) return;
    setGuesses((g) => ({ ...g, [card.id]: { text: guessText(card.item, response) } }));
    setRun((r) => advance(submitAnswer(r, card.id, true)));
    setInstance((i) => i + 1);
    setResponse(null);
    setSimDone(false);
  }, [card, response]);

  // A finished answer is graded at once, unless the card needs the learner to say they are done.
  const onResponse = useCallback(
    (r: ItemResponse | null) => {
      setResponse(r);
      if (r && (mode === "instant" || mode === "retry")) commit(r);
    },
    [mode, commit],
  );
  const onSimComplete = useCallback(() => setSimDone(true), []);

  // A card is seen hundreds of times: a short ease-out, no travel beyond a nudge.
  const enter = reduced ? undefined : FadeInDown.duration(200).easing(EASE_OUT);
  // Pages that build themselves (an item, a lecture) have no entrance of their own for the whole page; the rest keep the plain one
  const cascades = onLecture || !!card?.item;
  // A little more side room than the app default, so cards breathe without leaving dead margins.
  const frame = { ...LESSON_FRAME, paddingHorizontal: spacing.lg };

  // Deeper offer
  if (run.offer) {
    const offerCount = run.offer.length;
    const offerTitle = (() => {
      const t = cardById.get(run.offer[0]!.id)?.data?.title;
      return typeof t === "string" && t.trim() ? t.trim() : null;
    })();
    return (
      <LessonFrame>
        {leaveDialog}
        <Header progress={progressOf(run)} onPress={confirmExit} styles={styles} frame={frame} topInset={layout.insets.top} kind={kind} />
        <View style={[frame, styles.offerFill]}>
          <Animated.View entering={reduced ? undefined : FadeIn.duration(200)} style={styles.offerFill}>
            <SfxOnMount cue="lesson.bubble" />
            {/* Like every lesson page: a title top-left, then the teacher asking in a bubble beside them. */}
            <View style={styles.offerPage}>
              <View style={styles.offerHead}>
                <View style={styles.offerTile}>
                  <Icon name="Star1" size={20} color={theme.colors.gold} variant="Bold" />
                </View>
                <Text accessibilityRole="header" style={styles.offerHeadText}>Bonus {offerCount === 1 ? "card" : "cards"}</Text>
              </View>
              <View style={{ alignSelf: "stretch" }}>
              <TeacherSays teller={teacher} avatarSize={96}>
                <Text style={styles.offerTitle}>Want to go deeper?</Text>
                <Text style={styles.offerBody}>
                  {offerTitle ? `Up next: \u201c${offerTitle}\u201d. It is just for the curious.` : "There is something extra here for the curious."}
                </Text>
              </TeacherSays>
              </View>
              <View style={styles.offerNote}>
                <Icon name="Lamp" size={20} color={theme.colors.warning} variant="Bold" />
                <Text style={styles.offerNoteText}>
                  {offerCount === 1 ? "One short bonus card." : `${offerCount} short bonus cards.`} Skip it any time and the lesson goes on.
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>
        <View style={[styles.footer, frame, { paddingBottom: bottomInset + spacing.sm }]}>
          <TextButton label="Skip" onPress={() => { setInstance((i) => i + 1); setLectureStep(1); setPageFloor(run.index + 1); setRun((r) => skipDeeper(r)); }} />
          <FooterRow onBack={onBack}>
            <Button label="Show me" onPress={() => { setInstance((i) => i + 1); setLectureStep(1); setPageFloor(run.index + 1); setRun((r) => acceptDeeper(r)); }} />
          </FooterRow>
        </View>
      </LessonFrame>
    );
  }

  // Mistakes replay: tell the learner what is about to happen before the cards come back.
  if (run.phase === "replay" && !replayIntroDone) {
    const line = "Let\u2019s correct the exercises you missed!";
    return (
      <LessonFrame>
        {leaveDialog}
        <Header progress={progressOf(run)} onPress={confirmExit} styles={styles} frame={frame} topInset={layout.insets.top} kind={kind} />
        <View style={[frame, styles.correct]}>
          <Animated.View entering={reduced ? undefined : FadeIn.duration(200)} style={styles.correctRow}>
            <SfxOnMount cue="lesson.bubble" />
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
  const lectureBlocks: LectureBlockInfo[] = [];
  if (onLecture) {
    for (let i = start; i <= run.index; i++) {
      const c = cardById.get(run.queue[i].id);
      if (!c || c.kind !== "teach") continue;
      const current = i === run.index;
      const guess = c.type === "reveal" ? guesses[String((c.data as { predictCardId?: string }).predictCardId)] : undefined;
      lectureBlocks.push({ card: c, shown: current ? lectureStep : ALL_STEPS, animateLast: current && lectureStep < ALL_STEPS, guess });
    }
  }
  const body = (() => {
    if (card.kind === "sim") {
      // A fresh key per card and per visit, so a simulation always starts clean (and the random ones re-seed).
      const key = `${card.id}-${instance}`;
      switch (card.type) {
        case "atom-builder":
          return <AtomBuilderSim key={key} data={card.data as unknown as AtomBuilderData} onComplete={onSimComplete} />;
        case "decay-wait":
          return <DecayWaitSim key={key} data={card.data as unknown as DecayWaitData} onComplete={onSimComplete} />;
        case "decay-chain":
          return <DecayChainSim key={key} data={card.data as unknown as DecayChainData} onComplete={onSimComplete} />;
        case "radiation-id":
          return <RadiationIdSim key={key} data={card.data as unknown as RadiationIdData} onComplete={onSimComplete} />;
        default:
          return <ScaleZoomSim key={key} data={card.data as unknown as ScaleZoomData} onComplete={onSimComplete} />;
      }
    }
    if (card.item) {
      return <ItemCard key={`${card.id}-${instance}`} item={card.item} instanceId={`${card.id}-${instance}`} locked={locked} result={result} rejection={rejection} onMiss={onMiss} onChange={onResponse} />;
    }
    return null;
  })();
  // A joined activity sits below the lecture with room between them (it never touches the bubble above)
  const pageBody = onLecture ? (
    <View style={styles.pageBody}>
      <LecturePage blocks={lectureBlocks} />
      {card.kind === "teach" ? null : body}
    </View>
  ) : (
    body
  );

  // A new page starts at the top; a growing page follows its newest step.
  const onContentSize = (_w: number, h: number) => {
    const fresh = shownPage.current !== pageId;
    metrics.current.contentHeight = h;
    if (fresh) metrics.current.offsetY = 0;
    updateCue();
    shownPage.current = pageId;
    if (fresh) scroller.current?.scrollTo({ y: 0, animated: false });
    else if (onLecture) scroller.current?.scrollToEnd({ animated: !reduced });
  };

  // The feedback sheet takes the footer's room, so the page above it gets shorter and may now be covered at
  // its bottom: scroll down so nothing the learner needs is hidden behind it.
  const onViewportChange = (e: LayoutChangeEvent) => {
    metrics.current.viewHeight = e.nativeEvent.layout.height;
    updateCue();
    if (result) scroller.current?.scrollToEnd({ animated: !reduced });
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    metrics.current.offsetY = e.nativeEvent.contentOffset.y;
    updateCue();
  };
  const scrollOn = () => scroller.current?.scrollTo({ y: scrollTarget(metrics.current), animated: !reduced });

  return (
    <TeacherProvider teacher={teacher}>
    <CascadeProvider value={reduced ? null : direction}>
    <LessonFrame>
      {leaveDialog}
      <Header progress={progressOf(run)} onPress={confirmExit} styles={styles} frame={frame} topInset={layout.insets.top} kind={kind} replay={run.phase === "replay"} label={label} />
      <View style={{ flex: 1 }}>
        <ScrollView ref={scroller} onContentSizeChange={onContentSize} onLayout={onViewportChange} onScroll={onScroll} scrollEventThrottle={32} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Every page starts at the top-left and grows downwards. */}
          <Animated.View key={pageId} entering={cascades ? undefined : enter} style={[frame, styles.cardWrap]}>
            {pageBody}
          </Animated.View>
        </ScrollView>
        <ScrollCue visible={cue && !result} onPress={scrollOn} />
      </View>
      {result && card.item ? (
        // After checking, the feedback sheet takes the footer's place, Continue included.
        <FeedbackDock
          result={result}
          explanation={String((card.item.data as { explanation?: string }).explanation ?? "")}
          seed={card.id}
          onContinue={next}
          onBack={onBack}
          paddingHorizontal={frame.paddingHorizontal}
          paddingBottom={bottomInset + spacing.sm}
        />
      ) : (
      <View style={[styles.footer, frame, { paddingBottom: bottomInset + spacing.sm }]}>
        {card.kind === "teach" ? (
          // Absent for the first moment of each step, Back with it; the room is kept so nothing jumps, and they rise in together
          <View style={{ minHeight: FOOTER_BUTTON_HEIGHT, justifyContent: "flex-end" }}>
            {continueReady ? <FooterRow onBack={onBack}><Button label="Continue" onPress={continueLecture} /></FooterRow> : null}
          </View>
        ) : card.kind === "sim" ? (
          <>
            {/* Plain grey text above Continue, for those who want to move on. */}
            {!simDone ? <TextButton label="Skip this one" onPress={next} /> : null}
            <FooterRow onBack={onBack}><Button label="Continue" disabled={!simDone} onPress={next} /></FooterRow>
          </>
        ) : isPredict ? (
          <FooterRow onBack={onBack}><Button label="Lock in my guess" pressSfx="lesson.lock-in" disabled={!response} onPress={lockInGuess} /></FooterRow>
        ) : mode === "manual" ? (
          <FooterRow onBack={onBack}><Button label="Check" disabled={!response} onPress={check} /></FooterRow>
        ) : (
          // Graded as soon as it is answered: no main button, so no Back either (the Android back key still steps back).
          null
        )}
      </View>
      )}
    </LessonFrame>
    </CascadeProvider>
    </TeacherProvider>
  );
}

function Header({ progress, onPress, styles, frame, topInset, kind, replay, label }: { progress: number; onPress: () => void; styles: ReturnType<typeof useStyles>; frame: object; topInset: number; kind: RunKind; replay?: boolean; label?: string }) {
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
  const fillStyle = useFillStyle(fill);
  // Replaying the mistakes names itself; otherwise the kind of run does (a lesson shows nothing)
  const chip = replay ? REPLAY_CHIP : (RUN_CHIPS[kind] ?? null);
  return (
    <View style={[styles.top, frame, { paddingTop: topInset + spacing.xs }]}>
      <PressableIconButton accessibilityLabel="Leave lesson" onPress={onPress}>
        <Icon name="Close" size={26} color={theme.colors.textSecondary} />
      </PressableIconButton>
      <View style={styles.barWrap} accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
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
      {chip ? <CardBadge plain icon={chip.icon} label={chip.label} tone={chip.tone} /> : null}
    </View>
  );
}
