/**
 * Radioactive Decay Lab. A sample of 100 dots (each some atoms) sits above the decay curve. Learners
 * predict how much is left after two half-lives, watch the sample decay (dots flash and throw a
 * spark, the curve fills, a Geiger click for each), say what they found, then drag time until a
 * sample of 800 has about 200 left. One clock, `h` in half-lives, drives the dots, the graph and the
 * readout whether it is played or dragged. Rules and the sample's fate are in `decay-core.ts`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { HeaderButton, ScreenHeader, useHeaderBorder } from "@/components/layout";
import { duoShade } from "@/components/lesson/visual/duo-palette";
import { ScrollCue } from "@/components/lesson/ScrollCue";
import { moreBelow, scrollTarget, type ScrollMetrics } from "@/components/lesson/scroll-cue-core";
import { StatTile } from "@/components/lesson/StatTile";
import { STAT_FX, shineStart, statStart } from "@/components/lesson/stat-reveal-core";
import { settle } from "@/components/motion/settle";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SfxOnMount } from "@/components/ui/sfx-on-mount";
import { Text } from "@/components/ui/text";
import { recordActivity } from "@/services/activity-log";
import { impactLight, notifyError, notifySuccess } from "@/services/haptics";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";

import { LabSlider } from "./LabSlider";
import {
  CHALLENGE,
  DISCOVERIES,
  DOTS,
  ISOTOPES,
  MAX_H,
  PREDICT,
  WATCH_MS,
  atomFrame,
  curvePath,
  decayCues,
  formatCount,
  formatTime,
  graphX,
  graphY,
  inChallengeRange,
  percentLeft,
  planDecay,
  remainingAtoms,
  type DecayAtom,
  type Isotope,
} from "./decay-core";

type Step = "predict" | "watch" | "learn" | "challenge" | "done";
const STEP_NO: Record<Step, number> = { predict: 1, watch: 2, learn: 3, challenge: 4, done: 4 };
const STEP_NAME: Record<Step, string> = { predict: "Predict", watch: "Watch", learn: "Discover", challenge: "Challenge", done: "Done" };

/** The dot grid's size; the page scrolls when the rest does not fit. */
const GRID_SIZE = 220;
const GRAPH_H = 102;
const PAD = 16;

const useStyles = createStyles((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.mapBackground },
  body: { paddingTop: 4, gap: 12 },
  footer: { paddingTop: 10, backgroundColor: theme.colors.mapBackground, gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sampleRow: { flexDirection: "row", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5 },
  chipDot: { width: 14, height: 14, borderRadius: 7 },
  chipText: { fontSize: 14, ...fontFaces.bold, flexShrink: 1 },
  halfLife: { fontSize: 14, ...fontFaces.semibold, color: theme.colors.textMuted, paddingHorizontal: 4 },
  readout: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 4 },
  readoutBig: { fontSize: 32, lineHeight: 36, ...fontFaces.black, color: theme.colors.text, fontVariant: ["tabular-nums"] },
  readoutLabel: { fontSize: 12, ...fontFaces.heavy, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
  readoutRight: { alignItems: "flex-end" },
  readoutTime: { fontSize: 16, ...fontFaces.heavy, color: theme.colors.text },
  dotNote: { fontSize: 12, ...fontFaces.semibold, color: theme.colors.textMuted, textAlign: "center" },
  axis: { fontSize: 11, ...fontFaces.semibold, color: theme.colors.textMuted, position: "absolute", width: 40, textAlign: "center" },
  mark: { fontSize: 11, ...fontFaces.heavy, color: theme.colors.textSecondary, position: "absolute", width: 40, textAlign: "center" },
  title: { fontSize: 18, ...fontFaces.heavy, color: theme.colors.text },
  text: { fontSize: 15, lineHeight: 21, ...fontFaces.medium, color: theme.colors.textSecondary },
  caption: { fontSize: 17, lineHeight: 24, ...fontFaces.heavy, color: theme.colors.text },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  rowCopy: { flex: 1, fontSize: 15, ...fontFaces.semibold, color: theme.colors.text },
  rowValue: { fontSize: 17, ...fontFaces.black, fontVariant: ["tabular-nums"], color: theme.colors.text },
  verdict: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4 },
  verdictMark: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  verdictCopy: { flex: 1, gap: 2 },
  verdictTitle: { fontSize: 18, ...fontFaces.heavy, color: theme.colors.text },
  verdictText: { fontSize: 14, lineHeight: 20, ...fontFaces.medium, color: theme.colors.textMuted },
  tiles: { flexDirection: "row", justifyContent: "center", gap: 8 },
  concept: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 15 },
  conceptText: { fontSize: 13, ...fontFaces.heavy, color: theme.colors.text },
  sliderValue: { fontSize: 16, ...fontFaces.heavy, color: theme.colors.text, textAlign: "center" },
}));

// ------------------------------------------------------------------
// The sample
// ------------------------------------------------------------------

function Cell({ i, a, h, cell, paint, ghost }: { i: number; a: DecayAtom; h: SharedValue<number>; cell: number; paint: { face: string; lip: string }; ghost: string }) {
  const d = cell * 0.78;
  const lip = Math.max(2, d * 0.14);
  const left = (i % 10) * cell + (cell - d) / 2;
  const top = Math.floor(i / 10) * cell + (cell - d) / 2;
  const token = useAnimatedStyle(() => {
    const f = atomFrame(a, h.get());
    return { opacity: f.opacity, transform: [{ scale: f.scale }] };
  });
  const spark = useAnimatedStyle(() => {
    const f = atomFrame(a, h.get());
    return { opacity: f.sparkOpacity, transform: [{ translateX: Math.cos(a.angle) * f.sparkP * cell * 1.1 }, { translateY: Math.sin(a.angle) * f.sparkP * cell * 1.1 }, { scale: 1 - 0.5 * f.sparkP }] };
  });
  return (
    <>
      {/* The empty place a decayed dot leaves behind */}
      <View pointerEvents="none" style={{ position: "absolute", left, top, width: d, height: d, borderRadius: d / 2, borderWidth: 1.5, borderStyle: "dashed", borderColor: ghost }} />
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left, top, width: d, height: d, borderRadius: d / 2, backgroundColor: paint.face, borderBottomWidth: lip, borderBottomColor: paint.lip }, token]} />
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: left + d / 2 - 3, top: top + d / 2 - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: paint.face, opacity: 0 }, spark]} />
    </>
  );
}

function Graph({ width, h, plan, iso, paint }: { width: number; h: SharedValue<number>; plan: DecayAtom[]; iso: Isotope; paint: { face: string; lip: string } }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const curve = useMemo(() => curvePath(width, GRAPH_H, PAD), [width]);
  const area = `${curve} L ${(width - PAD).toFixed(1)} ${(GRAPH_H - PAD).toFixed(1)} L ${PAD} ${(GRAPH_H - PAD).toFixed(1)} Z`;
  const fillStyle = useAnimatedStyle(() => ({ width: graphX(h.get(), width, PAD) }));
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ translateX: graphX(h.get(), width, PAD) - 8 }, { translateY: graphY(h.get(), GRAPH_H, PAD) - 8 }] }));
  void plan;
  void iso;
  return (
    <View style={{ width, height: GRAPH_H + 22 }}>
      <Svg width={width} height={GRAPH_H} style={{ position: "absolute", left: 0, top: 0 }}>
        <Line x1={PAD} y1={GRAPH_H - PAD} x2={width - PAD} y2={GRAPH_H - PAD} stroke={c.border} strokeWidth={2} strokeLinecap="round" />
        <Path d={curve} stroke={c.border} strokeWidth={3} fill="none" strokeLinecap="round" />
        {[1, 2, 3, 4].map((n) => (
          <Circle key={n} cx={graphX(n, width, PAD)} cy={graphY(n, GRAPH_H, PAD)} r={4} fill={c.borderStrong} />
        ))}
      </Svg>
      {/* The part of the curve already run, filled under and drawn in the isotope's colour */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, height: GRAPH_H, overflow: "hidden" }, fillStyle]}>
        <Svg width={width} height={GRAPH_H}>
          <Path d={area} fill={withAlpha(paint.face, 0.2)} />
          <Path d={curve} stroke={paint.face} strokeWidth={3.5} fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: paint.face, borderWidth: 3, borderColor: c.card }, dotStyle]} />
      {[1, 2, 3, 4].map((n) => (
        <Text key={`m${n}`} style={[styles.mark, { left: graphX(n, width, PAD) - 20, top: graphY(n, GRAPH_H, PAD) - 22 }]}>
          {percentLeft(n)}%
        </Text>
      ))}
      {[0, 1, 2, 3, 4].map((n) => (
        <Text key={`a${n}`} style={[styles.axis, { left: graphX(n, width, PAD) - 20, top: GRAPH_H + 2 }]}>
          {n === 4 ? "4 half-lives" : n}
        </Text>
      ))}
    </View>
  );
}

// ------------------------------------------------------------------
// The lab
// ------------------------------------------------------------------

export function DecayLab({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { scrolled, onScroll: onHeaderScroll, scrollEventThrottle } = useHeaderBorder();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const [iso, setIso] = useState<Isotope>(ISOTOPES[0]!);
  const [step, setStep] = useState<Step>("predict");
  const [prediction, setPrediction] = useState<number | null>(null);
  const [discovery, setDiscovery] = useState<number | null>(null);
  const [scrub, setScrub] = useState(0);
  const [restH, setRestH] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [caption, setCaption] = useState("");
  const [tryHint, setTryHint] = useState(false);
  const [shownRem, setShownRem] = useState<number>(PREDICT.initial);
  const [shownH, setShownH] = useState(0);
  const [stageWidth, setStageWidth] = useState(300);

  const plan = useMemo(() => planDecay(), []);
  const h = useSharedValue(0);
  const paint = duoShade(iso.tone === "primary" ? "primary" : iso.tone, theme.mode);
  const initial = step === "challenge" || step === "done" ? CHALLENGE.initial : PREDICT.initial;
  const grid = Math.min(GRID_SIZE, stageWidth);
  const cell = grid / 10;

  // "More below"
  const scroller = useRef<ScrollViewInstance>(null);
  const metrics = useRef<ScrollMetrics>({ contentHeight: 0, viewHeight: 0, offsetY: 0 });
  const [cue, setCue] = useState(false);
  const updateCue = useCallback(() => {
    const next = moreBelow(metrics.current);
    setCue((was) => (was === next ? was : next));
  }, []);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    onHeaderScroll(e);
    metrics.current.offsetY = e.nativeEvent.contentOffset.y;
    updateCue();
  };

  // While it plays the numbers follow the clock (to the nearest 5 atoms and 0.1 half-life, so the page is not redrawn every frame)
  useAnimatedReaction(
    () => Math.round(remainingAtoms(initial, h.get()) / 5) * 5,
    (v, prev) => {
      if (v !== prev) runOnJS(setShownRem)(v);
    },
    [initial],
  );
  useAnimatedReaction(
    () => Math.round(h.get() * 10) / 10,
    (v, prev) => {
      if (v !== prev) runOnJS(setShownH)(v);
    },
  );

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const silence = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => silence, [silence]);

  const glide = useCallback(
    (to: number, ms: number) => {
      cancelAnimation(h);
      h.set(withTiming(to, { duration: reduced ? 0 : ms, easing: Easing.out(Easing.cubic) }));
    },
    [h, reduced],
  );

  const reset = useCallback(
    (next?: Isotope) => {
      silence();
      cancelAnimation(h);
      h.set(0);
      if (next) setIso(next);
      setStep("predict");
      setPrediction(null);
      setDiscovery(null);
      setScrub(0);
      setRestH(0);
      setPlaying(false);
      setCaption("");
      setTryHint(false);
    },
    [h, silence],
  );

  const onWatchDone = useCallback(() => {
    silence();
    setPlaying(false);
    setStep("learn");
    setRestH(2);
    glide(2, 700);
  }, [glide, silence]);

  const startWatch = () => {
    if (prediction === null) return;
    impactLight();
    silence();
    setStep("watch");
    setPlaying(true);
    setCaption(`Watching: one half-life is ${formatTime(1, iso)}.`);
    cancelAnimation(h);
    if (reduced) {
      h.set(MAX_H);
      onWatchDone();
      return;
    }
    h.set(0);
    timers.current = decayCues(plan).map((q) =>
      setTimeout(() => {
        if (q.kind === "click") void playSfx("lab.geiger");
        else {
          const n = q.n ?? 1;
          void playSfx("reward.pop", { rate: 0.8 + n * 0.15 });
          setCaption(`After ${n} half-life${n > 1 ? "s" : ""}, ${percentLeft(n)}% is left.`);
        }
      }, q.at),
    );
    void playSfx("lesson.whoosh");
    h.set(
      withTiming(MAX_H, { duration: WATCH_MS, easing: Easing.linear }, (done) => {
        if (done) runOnJS(onWatchDone)();
      }),
    );
  };

  const skipWatch = () => {
    void playSfx("ui.cancel");
    cancelAnimation(h);
    h.set(MAX_H);
    onWatchDone();
  };

  const chooseDiscovery = (i: number) => {
    setDiscovery(i);
    void playSfx(DISCOVERIES[i]!.right ? "lesson.answer-correct" : "lesson.answer-wrong");
  };

  const toChallenge = () => {
    void playSfx("lesson.whoosh");
    setStep("challenge");
    setScrub(0);
    setRestH(0);
    setTryHint(false);
    glide(0, 500);
  };

  const onScrub = (v: number) => {
    setScrub(v);
    setRestH(v);
    setTryHint(false);
    void playSfx("ui.tick", { rate: 0.8 + (v / MAX_H) * 0.8 });
    glide(v, 140);
  };

  const leftNow = remainingAtoms(CHALLENGE.initial, scrub);
  const checkChallenge = () => {
    if (inChallengeRange(leftNow)) {
      setStep("done");
      notifySuccess();
      void playSfx("reward.requirements-met");
      recordActivity("lab_session", { id: "half-life" });
    } else {
      setTryHint(true);
      notifyError();
      void playSfx("lesson.answer-wrong");
    }
  };

  const another = () => {
    void playSfx("ui.select");
    const next = ISOTOPES[(ISOTOPES.findIndex((x) => x.key === iso.key) + 1) % ISOTOPES.length]!;
    reset(next);
  };

  const showH = playing ? shownH : restH;
  const showRem = playing ? shownRem : Math.round(remainingAtoms(initial, restH));
  const match = prediction === PREDICT.answer;
  const observed = Math.round(remainingAtoms(PREDICT.initial, 2));
  const tiles = [
    { key: "h", label: "Half-lives", value: (scrub).toFixed(1), tone: c.info, icon: "Timer1" },
    { key: "n", label: "Left", value: formatCount(leftNow), countTo: Math.round(leftNow), tone: c.gold, icon: "Chart" },
    { key: "p", label: "Percent", value: `${percentLeft(scrub)}%`, countTo: percentLeft(scrub), tone: c.success, icon: "Percentage" },
  ];

  const footer =
    step === "predict" ? (
      <Button label="Start decay" disabled={prediction === null} onPress={startWatch} renderIcon={(color) => <Icon name="Play" size={20} color={color} variant="Bold" />} />
    ) : step === "watch" ? (
      <Button label="Skip to the end" variant="secondary" onPress={skipWatch} />
    ) : step === "learn" ? (
      <Button label="Next: challenge" disabled={discovery === null || !DISCOVERIES[discovery]!.right} onPress={toChallenge} renderIcon={(color) => <Icon name="ArrowRight2" size={20} color={color} variant="Bold" />} />
    ) : step === "challenge" ? (
      <Button label="Check" onPress={checkChallenge} renderIcon={(color) => <Icon name="TickCircle" size={20} color={color} variant="Bold" />} />
    ) : (
      <Button label="Explore decay" onPress={() => { void playSfx("ui.select"); onBack(); }} />
    );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Radioactive Decay"
        subtitle={`Step ${STEP_NO[step]} of 4 · ${STEP_NAME[step]}`}
        onBack={onBack}
        scrolled={scrolled}
        right={<HeaderButton icon="Refresh" label="Start over" onPress={() => { void playSfx("ui.cancel"); reset(); }} />}
      />
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scroller}
          onContentSizeChange={(_, ch) => {
            metrics.current.contentHeight = ch;
            updateCue();
          }}
          onLayout={(e) => {
            metrics.current.viewHeight = e.nativeEvent.layout.height;
            updateCue();
          }}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.body, { paddingHorizontal: gutter + 4, width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingBottom: 24 }]}
        >
          <Animated.View entering={settle()} style={{ gap: 6 }}>
            <View style={styles.sampleRow}>
              {ISOTOPES.map((s) => {
                const active = s.key === iso.key;
                const tone = duoShade(s.tone, theme.mode);
                const locked = step !== "predict" && step !== "done";
                return (
                  <Pressable
                    key={s.key}
                    disabled={locked}
                    onPress={() => {
                      impactLight();
                      if (!active) {
                        void playSfx("ui.select");
                        reset(s);
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: locked }}
                    style={({ pressed }) => [styles.chip, { flex: 1, justifyContent: "center", paddingHorizontal: 6, borderColor: active ? tone.face : c.border, backgroundColor: active ? withAlpha(tone.face, 0.14) : c.surface, opacity: locked && !active ? 0.5 : 1 }, pressed && { opacity: 0.7 }]}
                  >
                    <View style={[styles.chipDot, { backgroundColor: tone.face }]} />
                    <Text style={[styles.chipText, { color: active ? c.text : c.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.halfLife}>Half-life: {iso.halfLife.toLocaleString("en-US")} {iso.unit}</Text>
          </Animated.View>

          <Animated.View entering={settle(60)} onLayout={(e) => setStageWidth(Math.round(e.nativeEvent.layout.width))} style={{ gap: 8 }}>
            <View style={styles.readout} accessibilityLiveRegion="polite">
              <View>
                <Text style={styles.readoutBig}>{formatCount(showRem)}</Text>
                <Text style={styles.readoutLabel}>atoms left</Text>
              </View>
              <View style={styles.readoutRight}>
                <Text style={styles.readoutTime}>{formatTime(showH, iso)}</Text>
                <Text style={styles.readoutLabel}>{showH.toFixed(1)} half-lives</Text>
              </View>
            </View>
            <View style={{ alignItems: "center" }}>
              <View style={{ width: grid, height: grid }} accessible accessibilityRole="image" accessibilityLabel={`${formatCount(showRem)} of ${formatCount(initial)} atoms left`}>
                {plan.map((a, i) => (
                  <Cell key={i} i={i} a={a} h={h} cell={cell} paint={paint} ghost={c.border} />
                ))}
              </View>
            </View>
            <Text style={styles.dotNote}>Each dot is {formatCount(initial / DOTS)} atoms</Text>
            <Graph width={stageWidth} h={h} plan={plan} iso={iso} paint={paint} />
          </Animated.View>

          {step === "predict" ? (
            <Animated.View key="predict" entering={settle()} style={{ gap: 10 }}>
              <Text style={styles.title}>Predict</Text>
              <Text style={styles.text}>The sample starts with {formatCount(PREDICT.initial)} atoms. How many are left after two half-lives?</Text>
              <View style={styles.chips}>
                {PREDICT.options.map((v) => {
                  const active = prediction === v;
                  return (
                    <Pressable
                      key={v}
                      onPress={() => {
                        impactLight();
                        void playSfx("ui.select");
                        setPrediction(v);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={({ pressed }) => [styles.chip, { flex: 1, justifyContent: "center", borderColor: active ? c.primary : c.border, backgroundColor: active ? withAlpha(c.primary, 0.14) : c.surface }, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={[styles.chipText, { color: active ? c.text : c.textSecondary }]}>{v}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          ) : null}

          {step === "watch" ? (
            <Animated.View key="watch" entering={settle()} style={{ minHeight: 48, justifyContent: "center" }}>
              <Animated.Text key={caption} entering={settle()} style={styles.caption} accessibilityLiveRegion="polite">
                {caption}
              </Animated.Text>
            </Animated.View>
          ) : null}

          {step === "learn" ? (
            <Animated.View key="learn" entering={settle()} style={{ gap: 10 }}>
              <View>
                <View style={styles.row}>
                  <Text style={styles.rowCopy}>Your prediction</Text>
                  <Text style={styles.rowValue}>{prediction}</Text>
                </View>
                <View style={[styles.row, { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border }]}>
                  <Text style={styles.rowCopy}>Observed after two half-lives</Text>
                  <Text style={[styles.rowValue, { color: c.success }]}>{observed}</Text>
                  <Icon name={match ? "TickCircle" : "InfoCircle"} size={22} color={match ? c.success : c.warning} variant="Bold" />
                </View>
              </View>
              <Text style={styles.title}>What did you discover?</Text>
              <View style={{ gap: 6 }}>
                {DISCOVERIES.map((d, i) => {
                  const picked = discovery === i;
                  const tone = picked ? (d.right ? c.success : c.error) : c.border;
                  return (
                    <Pressable
                      key={d.text}
                      onPress={() => {
                        impactLight();
                        chooseDiscovery(i);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: picked }}
                      style={({ pressed }) => [styles.chip, { justifyContent: "space-between", borderColor: tone, backgroundColor: picked ? withAlpha(tone, 0.12) : c.surface }, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={[styles.chipText, { color: c.text }]}>{d.text}</Text>
                      {picked ? <Icon name={d.right ? "TickCircle" : "CloseCircle"} size={20} color={tone} variant="Bold" /> : null}
                    </Pressable>
                  );
                })}
              </View>
              {discovery !== null ? (
                <Text style={[styles.text, { color: DISCOVERIES[discovery]!.right ? c.success : c.error }]}>
                  {DISCOVERIES[discovery]!.right ? "Right! Each half-life halves what is left." : "Not quite. Half of what is left decays each half-life, so it never all goes at once."}
                </Text>
              ) : null}
            </Animated.View>
          ) : null}

          {step === "challenge" ? (
            <Animated.View key="challenge" entering={settle()} style={{ gap: 6 }}>
              <Text style={styles.title}>Challenge</Text>
              <Text style={styles.text}>
                A new sample has <Text style={{ ...fontFaces.black, color: c.text }}>800 atoms</Text>. Drag the time until about <Text style={{ ...fontFaces.black, color: c.text }}>200</Text> are left, then check.
              </Text>
              <LabSlider value={scrub} min={0} max={MAX_H} step={0.125} tone={paint.face} label="Time" valueText={`${scrub.toFixed(1)} half-lives`} onChange={onScrub} />
              <Text style={styles.sliderValue}>{scrub.toFixed(1)} half-lives · {formatTime(scrub, iso)}</Text>
              {tryHint ? (
                <Animated.View entering={settle()} style={styles.verdict}>
                  <View style={[styles.verdictMark, { backgroundColor: withAlpha(c.warning, 0.18) }]}>
                    <Icon name="InfoCircle" size={24} color={c.warning} variant="Bold" />
                  </View>
                  <View style={styles.verdictCopy}>
                    <Text style={styles.verdictTitle}>{formatCount(leftNow)} left</Text>
                    <Text style={styles.verdictText}>Not about 200 yet. 800 to 400 to 200: how many half-lives is that?</Text>
                  </View>
                </Animated.View>
              ) : null}
            </Animated.View>
          ) : null}

          {step === "done" ? (
            <Animated.View key="done" entering={settle()} style={{ gap: 14 }}>
              <View style={styles.verdict}>
                <View style={[styles.verdictMark, { backgroundColor: withAlpha(c.success, 0.16) }]}>
                  <Icon name="TickCircle" size={24} color={c.success} variant="Bold" />
                </View>
                <View style={styles.verdictCopy}>
                  <Text style={styles.verdictTitle}>Experiment complete!</Text>
                  <Text style={styles.verdictText}>A sample does not vanish at once. It shrinks by half, again and again.</Text>
                </View>
              </View>
              <View style={styles.tiles}>
                {tiles.map((t, n) => (
                  <View key={t.key} style={{ flex: 1, maxWidth: 112 }}>
                    <StatTile
                      tone={t.tone}
                      label={t.label}
                      value={t.value}
                      countTo={t.key === "h" ? undefined : t.countTo}
                      format={t.key === "h" ? undefined : t.key === "p" ? (v) => `${v}%` : String}
                      icon={<Icon name={t.icon} size={26} color={t.tone} variant="Bold" />}
                      accessibilityLabel={`${t.label} ${t.value}`}
                      revealAt={statStart(n)}
                      shineAt={shineStart(n, tiles.length)}
                    />
                    {!reduced ? <SfxOnMount cue="ui.select" volume={0.5} delay={statStart(n) + STAT_FX.gatherEnd} /> : null}
                  </View>
                ))}
              </View>
              <View style={[styles.concept, { backgroundColor: withAlpha(c.success, 0.14) }]}>
                <Icon name="Timer1" size={16} color={c.success} variant="Bold" />
                <Text style={styles.conceptText}>Half-life</Text>
              </View>
              <View>
                <Text style={[styles.title, { marginBottom: 2 }]}>Which sample decays fastest?</Text>
                {ISOTOPES.map((s, i) => (
                  <View key={s.key} style={[styles.row, i > 0 && { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border }]}>
                    <View style={[styles.chipDot, { backgroundColor: duoShade(s.tone, theme.mode).face }]} />
                    <Text style={styles.rowCopy}>{s.label}</Text>
                    <Text style={styles.rowValue}>{s.halfLife.toLocaleString("en-US")} {s.unit}</Text>
                  </View>
                ))}
                <Text style={[styles.text, { marginTop: 4 }]}>The shorter the half-life, the faster it decays: Technetium-99m is gone in hours, Carbon-14 takes thousands of years.</Text>
              </View>
              <Button label="Try another isotope" variant="secondary" onPress={another} />
            </Animated.View>
          ) : null}
        </ScrollView>
        <ScrollCue visible={cue} onPress={() => scroller.current?.scrollTo({ y: scrollTarget(metrics.current), animated: !reduced })} />
      </View>

      <View style={[styles.footer, { paddingHorizontal: gutter + 4, paddingBottom: insets.bottom + 12, width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }]}>{footer}</View>
    </View>
  );
}
