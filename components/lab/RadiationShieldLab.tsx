/**
 * Radiation Shield Lab. A picture of the experiment on top (a source, a shield slab and a detector
 * with a dial) and the controls under it. Pressing Run sends 24 particles down the beam: the ones
 * the shield stops flare and fade inside it, the ones that get through reach the detector, and the
 * needle and digits climb as they land. The rules and the timeline are in `shield-core.ts`; the
 * colours of the picture in `shield-art.ts`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
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
import { ScrollCue } from "@/components/lesson/ScrollCue";
import { moreBelow, scrollTarget, type ScrollMetrics } from "@/components/lesson/scroll-cue-core";
import { settle } from "@/components/motion/settle";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { recordActivity } from "@/services/activity-log";
import { impactLight, notifySuccess } from "@/services/haptics";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";

import { MATERIAL_ART, RADIATION_ART } from "./shield-art";
import {
  GAUGE_MAX,
  MATERIALS,
  RADIATIONS,
  THICKNESS,
  THRESHOLD,
  arcPath,
  beamCues,
  detectorPulse,
  needleAngle,
  needleReadingAt,
  particleFrame,
  planBeam,
  readingAt,
  shieldSpan,
  shieldWidth,
  sourceGlow,
  type BeamParticle,
  type Material,
  type Radiation,
} from "./shield-core";

const STAGE_H = 184;
const BEAM_Y = 80;
const SOURCE_W = 56;
const DETECTOR_W = 92;
const SHIELD_H = 124;
const SHIELD_MAX_W = 96;
const LANE = 30;

const useStyles = createStyles((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.mapBackground },
  body: { paddingTop: 4, gap: 14 },
  footer: { paddingTop: 10, backgroundColor: theme.colors.mapBackground },
  goal: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  goalText: { flex: 1, fontSize: 14, lineHeight: 20, ...fontFaces.semibold, color: theme.colors.textSecondary },
  stage: { height: STAGE_H, width: "100%" },
  stageLabel: { position: "absolute", bottom: 0, fontSize: 12, ...fontFaces.heavy, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted, textAlign: "center" },
  detector: {
    position: "absolute",
    top: BEAM_Y - 62,
    height: 124,
    width: DETECTOR_W,
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    paddingTop: 10,
    gap: 2,
  },
  detectorValue: { fontSize: 26, lineHeight: 30, ...fontFaces.black, color: theme.colors.text, fontVariant: ["tabular-nums"] },
  detectorUnit: { fontSize: 11, ...fontFaces.heavy, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
  section: { gap: 8 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  sectionTitle: { fontSize: 17, ...fontFaces.heavy, color: theme.colors.text },
  sectionValue: { fontSize: 16, ...fontFaces.black, color: theme.colors.textSecondary, fontVariant: ["tabular-nums"] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingLeft: 6, paddingRight: 12, borderRadius: 12, borderWidth: 1.5 },
  chipMark: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  chipMarkText: { fontSize: 15, lineHeight: 20, ...fontFaces.black, color: theme.colors.onPrimary },
  chipText: { fontSize: 14, ...fontFaces.bold },
  fact: { fontSize: 13, lineHeight: 18, ...fontFaces.medium, color: theme.colors.textMuted, paddingHorizontal: 4 },
  track: { height: 16, borderRadius: 8, backgroundColor: theme.colors.border, justifyContent: "center" },
  trackFill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 8 },
  thumb: { position: "absolute", top: -6, width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderBottomWidth: 4, borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.card },
  verdict: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4 },
  verdictMark: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  verdictCopy: { flex: 1, gap: 2 },
  verdictTitle: { fontSize: 18, ...fontFaces.heavy, color: theme.colors.text },
  verdictText: { fontSize: 14, lineHeight: 20, ...fontFaces.medium, color: theme.colors.textMuted },
  concept: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 15, marginLeft: 4 },
  conceptText: { fontSize: 13, ...fontFaces.heavy },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  rowCopy: { flex: 1, fontSize: 15, ...fontFaces.semibold, color: theme.colors.text },
  rowValue: { fontSize: 17, ...fontFaces.black, fontVariant: ["tabular-nums"] },
}));

// ------------------------------------------------------------------
// The picture
// ------------------------------------------------------------------

/** One particle: a helium nucleus, an electron or a wave, in its colour. */
function ParticleShape({ rad }: { rad: Radiation }) {
  const art = RADIATION_ART[rad];
  if (rad === "alpha") {
    return (
      <Svg width={22} height={22} viewBox="0 0 22 22">
        <Circle cx={11} cy={11} r={10} fill={art.face} />
        <Circle cx={8} cy={9} r={3} fill={art.light} />
        <Circle cx={14} cy={9} r={3} fill={art.light} />
        <Circle cx={8} cy={14.5} r={3} fill={art.light} />
        <Circle cx={14} cy={14.5} r={3} fill={art.light} />
      </Svg>
    );
  }
  if (rad === "beta") {
    return (
      <Svg width={12} height={12} viewBox="0 0 12 12">
        <Circle cx={6} cy={6} r={5.5} fill={art.face} />
        <Circle cx={4.5} cy={4.5} r={1.6} fill={art.light} />
      </Svg>
    );
  }
  return (
    <Svg width={32} height={14} viewBox="0 0 32 14">
      <Path d="M2 7 Q6 0 10 7 T18 7 T26 7 T30 7" stroke={art.face} strokeWidth={3.5} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

const PARTICLE_BOX: Record<Radiation, { w: number; h: number }> = { alpha: { w: 22, h: 22 }, beta: { w: 12, h: 12 }, gamma: { w: 32, h: 14 } };

function Particle({
  p,
  rad,
  clock,
  travelMs,
  a,
  b,
  trackStart,
  trackLen,
}: {
  p: BeamParticle;
  rad: Radiation;
  clock: SharedValue<number>;
  travelMs: number;
  a: number;
  b: number;
  trackStart: number;
  trackLen: number;
}) {
  const box = PARTICLE_BOX[rad];
  const anim = useAnimatedStyle(() => {
    const f = particleFrame(p, clock.get(), travelMs, a, b);
    return { opacity: f.opacity, transform: [{ translateX: trackStart + f.f * trackLen - box.w / 2 }, { scale: f.scale }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: BEAM_Y + p.lane * LANE - box.h / 2, opacity: 0 }, anim]}>
      <ParticleShape rad={rad} />
    </Animated.View>
  );
}

/** The marks that say what a shield is made of: fibres, a shine, grains, rivets. */
function ShieldMarks({ mat, width }: { mat: Material; width: number }) {
  const m = MATERIAL_ART[mat];
  if (mat === "paper") {
    return (
      <>
        {[0.2, 0.4, 0.6, 0.8].map((y) => (
          <View key={y} style={{ position: "absolute", left: 2, right: 2, top: `${y * 100}%`, height: 2, borderRadius: 1, backgroundColor: m.mark }} />
        ))}
      </>
    );
  }
  if (mat === "concrete") {
    const dots = [[0.3, 0.12], [0.7, 0.2], [0.4, 0.34], [0.75, 0.46], [0.28, 0.58], [0.6, 0.7], [0.35, 0.84], [0.72, 0.9]];
    return (
      <>
        {dots.map(([x, y], i) => (
          <View key={i} style={{ position: "absolute", left: `${x! * 100 - 8}%`, top: `${y! * 100}%`, width: 7, height: 7, borderRadius: 3.5, backgroundColor: m.mark }} />
        ))}
      </>
    );
  }
  // A pale bar of shine down the left edge (plastic, aluminum, lead); lead also gets bolts
  return (
    <>
      <View style={{ position: "absolute", left: Math.min(6, width * 0.2), top: 12, bottom: 12, width: Math.max(3, Math.min(6, width * 0.14)), borderRadius: 3, backgroundColor: m.mark }} />
      {mat === "lead" && width > 36 ? (
        <>
          <View style={{ position: "absolute", right: 7, top: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: m.mark }} />
          <View style={{ position: "absolute", right: 7, bottom: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: m.mark }} />
        </>
      ) : null}
    </>
  );
}

/** The detector's dial: green under the goal, then yellow and red. */
const DIAL_W = 70;
const DIAL_H = 40;
const DIAL_R = 30;

function Dial({ clock, plan }: { clock: SharedValue<number>; plan: ReturnType<typeof planBeam> }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const needle = useAnimatedStyle(() => ({ transform: [{ rotate: `${needleAngle(needleReadingAt(plan, clock.get()))}deg` }] }));
  const cx = DIAL_W / 2;
  const cy = DIAL_H - 4;
  const goal = THRESHOLD / GAUGE_MAX;
  return (
    <View style={{ width: DIAL_W, height: DIAL_H }}>
      <Svg width={DIAL_W} height={DIAL_H}>
        <Path d={arcPath(cx, cy, DIAL_R, 0, goal)} stroke={c.success} strokeWidth={7} fill="none" />
        <Path d={arcPath(cx, cy, DIAL_R, goal, 0.6)} stroke={c.warning} strokeWidth={7} fill="none" />
        <Path d={arcPath(cx, cy, DIAL_R, 0.6, 1)} stroke={c.error} strokeWidth={7} fill="none" />
      </Svg>
      {/* The needle: a stick in the top half of a square that turns about its middle, which is the dial's pivot */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: cx - 2, top: cy - DIAL_R - 2, width: 4, height: (DIAL_R + 2) * 2, alignItems: "center" }, needle]}>
        <View style={{ width: 4, height: DIAL_R + 2, borderRadius: 2, backgroundColor: c.text }} />
      </Animated.View>
      <View style={{ position: "absolute", left: cx - 5, top: cy - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: c.text }} />
    </View>
  );
}

function Stage({
  rad,
  mat,
  thickness,
  plan,
  clock,
  reading,
  width,
  onLayout,
}: {
  rad: Radiation;
  mat: Material;
  thickness: number;
  plan: ReturnType<typeof planBeam>;
  clock: SharedValue<number>;
  reading: number | null;
  width: number;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const art = RADIATION_ART[rad];
  const shade = MATERIAL_ART[mat];

  const trackStart = SOURCE_W - 4;
  const trackEnd = width - DETECTOR_W + 4;
  const trackLen = Math.max(1, trackEnd - trackStart);
  const sw = shieldWidth(thickness, SHIELD_MAX_W);
  const center = trackStart + trackLen / 2;
  const { a, b } = shieldSpan(trackLen, thickness, SHIELD_MAX_W);

  // The slab grows and shrinks to the chosen thickness
  const slab = useSharedValue(sw);
  useEffect(() => {
    slab.set(withTiming(sw, { duration: 220, easing: Easing.out(Easing.cubic) }));
  }, [sw, slab]);
  const slabStyle = useAnimatedStyle(() => ({ width: slab.get(), left: center - slab.get() / 2 }));

  const glow = useAnimatedStyle(() => ({ transform: [{ scale: sourceGlow(clock.get()) }] }));
  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.06 * detectorPulse(plan, clock.get()) }] }));

  const done = reading !== null && reading < THRESHOLD;
  const shownReading = reading === null ? "—" : String(reading);
  const material = MATERIALS.find((m) => m.key === mat)!.label;

  return (
    <View style={styles.stage} onLayout={onLayout}>
      {/* The beam's path, a dashed guide from source to detector */}
      <Svg width={width} height={STAGE_H} style={{ position: "absolute", left: 0, top: 0 }}>
        <Line x1={trackStart} y1={BEAM_Y} x2={trackEnd} y2={BEAM_Y} stroke={c.border} strokeWidth={2} strokeDasharray="2 8" strokeLinecap="round" />
      </Svg>

      {/* Source: a dark housing with a glowing core in the colour of the radiation */}
      <View style={{ position: "absolute", left: 0, top: BEAM_Y - 42, width: SOURCE_W, height: 84, borderRadius: 16, backgroundColor: c.inverseSurface, borderBottomWidth: 5, borderBottomColor: c.borderStrong, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={[{ width: 30, height: 30, borderRadius: 15, backgroundColor: art.face, borderBottomWidth: 4, borderBottomColor: art.lip, alignItems: "center", justifyContent: "center" }, glow]}>
          <Text style={{ fontSize: 17, lineHeight: 22, ...fontFaces.black, color: c.onPrimary }}>{RADIATIONS.find((r) => r.key === rad)!.symbol}</Text>
        </Animated.View>
      </View>
      <Text style={[styles.stageLabel, { left: 0, width: SOURCE_W }]}>Source</Text>

      {/* Shield */}
      <Animated.View style={[{ position: "absolute", top: BEAM_Y - SHIELD_H / 2, height: SHIELD_H, borderRadius: 12, backgroundColor: shade.face, borderBottomWidth: 6, borderBottomColor: shade.lip, overflow: "hidden" }, slabStyle]}>
        <ShieldMarks mat={mat} width={sw} />
      </Animated.View>
      <Text style={[styles.stageLabel, { left: center - 60, width: 120 }]} numberOfLines={1}>
        {material} · {thickness} mm
      </Text>

      {/* Particles run over the shield's front, so a stopped one is seen stopping inside it */}
      {plan.particles.map((p, i) => (
        <Particle key={i} p={p} rad={rad} clock={clock} travelMs={plan.travelMs} a={a} b={b} trackStart={trackStart} trackLen={trackLen} />
      ))}

      {/* Detector */}
      <Animated.View style={[styles.detector, { left: width - DETECTOR_W, borderColor: done ? c.success : c.borderStrong }, pulse]}>
        <Dial clock={clock} plan={plan} />
        <Text style={[styles.detectorValue, done && { color: c.success }]}>{shownReading}</Text>
        <Text style={styles.detectorUnit}>units</Text>
      </Animated.View>
      <Text style={[styles.stageLabel, { left: width - DETECTOR_W, width: DETECTOR_W }]}>Detector</Text>
    </View>
  );
}

// ------------------------------------------------------------------
// Controls
// ------------------------------------------------------------------

function Chip({ label, active, tone, mark, onPress, disabled }: { label: string; active: boolean; tone: string; mark: React.ReactNode; onPress: () => void; disabled?: boolean }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return (
    <Pressable
      onPress={() => {
        impactLight();
        if (!active) void playSfx("ui.select");
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: active ? tone : theme.colors.border, backgroundColor: active ? withAlpha(tone, 0.14) : theme.colors.surface },
        pressed && { opacity: 0.7 },
      ]}
    >
      {mark}
      <Text style={[styles.chipText, { color: active ? theme.colors.text : theme.colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function ThicknessSlider({ value, tone, onChange, disabled }: { value: number; tone: string; onChange: (v: number) => void; disabled?: boolean }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const [width, setWidth] = useState(0);
  const span = THICKNESS.max - THICKNESS.min;
  const pct = (value - THICKNESS.min) / span;
  const set = useCallback(
    (x: number) => {
      if (width <= 0 || disabled) return;
      const v = Math.round(THICKNESS.min + Math.min(1, Math.max(0, x / width)) * span);
      // A tick for every step, rising in pitch with the thickness
      if (v !== value) {
        void playSfx("ui.tick", { rate: 0.8 + ((v - THICKNESS.min) / span) * 0.8 });
      }
      onChange(v);
    },
    [width, span, value, onChange, disabled],
  );
  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => runOnJS(set)(e.x))
    .onUpdate((e) => runOnJS(set)(e.x));
  return (
    <View>
      <GestureDetector gesture={gesture}>
        <View
          style={{ height: 36, justifyContent: "center", paddingHorizontal: 14 }}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Thickness"
          accessibilityValue={{ min: THICKNESS.min, max: THICKNESS.max, now: value, text: `${value} millimetres` }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) => onChange(Math.min(THICKNESS.max, Math.max(THICKNESS.min, value + (e.nativeEvent.actionName === "increment" ? 1 : -1))))}
        >
          <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
            <View style={[styles.trackFill, { width: `${pct * 100}%`, backgroundColor: tone }]} />
            <View style={[styles.thumb, { left: pct * Math.max(0, width - 28) }]} />
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

// ------------------------------------------------------------------
// The lab
// ------------------------------------------------------------------

interface Entry {
  rad: Radiation;
  mat: Material;
  thickness: number;
  reading: number;
}

export function RadiationShieldLab({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { scrolled, onScroll: onHeaderScroll, scrollEventThrottle } = useHeaderBorder();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const [rad, setRad] = useState<Radiation>("gamma");
  const [mat, setMat] = useState<Material>("paper");
  const [thickness, setThickness] = useState(5);
  const [running, setRunning] = useState(false);
  const [reading, setReading] = useState<number | null>(null);
  const [history, setHistory] = useState<Entry[]>([]);
  const [challengeDone, setChallengeDone] = useState(false);
  const [stageWidth, setStageWidth] = useState(320);

  const plan = useMemo(() => planBeam(rad, mat, thickness), [rad, mat, thickness]);
  const clock = useSharedValue(0);

  // "More below": the page is taller than the screen, so a cue says so until the learner reaches the end
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

  // The digits are text: follow the clock on the JS thread, once per new whole number
  useAnimatedReaction(
    () => readingAt(plan, clock.get()),
    (v, prev) => {
      if (v !== prev && clock.get() > 0) runOnJS(setReading)(v);
    },
    [plan],
  );

  // The sounds of a run are scheduled on its own timeline (`beamCues`) and cancelled with it
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const silence = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => silence, [silence]);

  // Changing anything puts the lab back to rest (the old run was for the old set-up)
  const rest = useCallback(() => {
    silence();
    cancelAnimation(clock);
    clock.set(0);
    setRunning(false);
    setReading(null);
  }, [clock, silence]);
  const change = useCallback(
    <T,>(set: (v: T) => void) =>
      (v: T) => {
        rest();
        setChallengeDone(false);
        set(v);
      },
    [rest],
  );

  const finish = useCallback(
    (entry: Entry) => {
      setRunning(false);
      setReading(entry.reading);
      setHistory((h) => [entry, ...h].slice(0, 6));
      if (entry.reading < THRESHOLD) {
        setChallengeDone(true);
        notifySuccess();
        void playSfx("reward.requirements-met");
        recordActivity("lab_session", { id: "radiation-shielding" });
      } else {
        setChallengeDone(false);
        void playSfx("lesson.answer-wrong");
      }
    },
    [],
  );

  const run = () => {
    if (running) return;
    impactLight();
    const entry: Entry = { rad, mat, thickness, reading: plan.reading };
    setChallengeDone(false);
    setRunning(true);
    setReading(0);
    cancelAnimation(clock);
    if (reduced) {
      clock.set(plan.total);
      finish(entry);
      return;
    }
    clock.set(0);
    // The source fires, each particle ticks as it leaves, the shield thuds where one stops and the
    // detector clicks like a Geiger counter for each one that gets through
    const trackLen = Math.max(1, stageWidth - DETECTOR_W + 4 - (SOURCE_W - 4));
    const { a, b } = shieldSpan(trackLen, thickness, SHIELD_MAX_W);
    const emitRate = rad === "alpha" ? 0.7 : rad === "beta" ? 1.1 : 1.5;
    silence();
    timers.current = beamCues(plan, a, b)
      .filter((q) => q.kind !== "done")
      .map((q) =>
        setTimeout(() => {
          if (q.kind === "launch") void playSfx("lesson.whoosh");
          else if (q.kind === "emit") void playSfx("ui.tick", { volume: 0.5, rate: emitRate });
          else if (q.kind === "hit") void playSfx("game.hit", { volume: 0.45, rate: 0.85 });
          else void playSfx("lab.geiger");
        }, q.at),
      );
    clock.set(
      withTiming(plan.total, { duration: plan.total, easing: Easing.linear }, (done) => {
        if (done) runOnJS(finish)(entry);
      }),
    );
  };

  const again = () => {
    void playSfx("ui.cancel");
    rest();
    setChallengeDone(false);
    setHistory([]);
  };

  useEffect(() => () => cancelAnimation(clock), [clock]);

  const radInfo = RADIATIONS.find((r) => r.key === rad)!;
  const matTone = MATERIAL_ART[mat].face;
  const lastTry = history[0];
  const failed = !running && reading !== null && reading >= THRESHOLD && lastTry !== undefined;

  return (
    <GestureHandlerRootView style={styles.screen}>
      <ScreenHeader title="Radiation Shield" onBack={onBack} scrolled={scrolled} right={<HeaderButton icon="Refresh" label="Start over" onPress={again} />} />
      <View style={{ flex: 1 }}>
      <ScrollView
        ref={scroller}
        onContentSizeChange={(_, h) => {
          metrics.current.contentHeight = h;
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
        <Animated.View entering={settle()} style={styles.goal}>
          <Icon name="Shield" size={20} color={c.success} variant="Bold" />
          <Text style={styles.goalText}>
            Get the detector under <Text style={{ ...fontFaces.black, color: c.text }}>{THRESHOLD} units</Text>
          </Text>
        </Animated.View>

        <Animated.View entering={settle(60)}>
          <Stage rad={rad} mat={mat} thickness={thickness} plan={plan} clock={clock} reading={reading} width={stageWidth} onLayout={(e) => setStageWidth(Math.round(e.nativeEvent.layout.width))} />
        </Animated.View>

        {challengeDone ? (
          <Animated.View entering={settle()} style={{ gap: 12 }}>
            <View style={styles.verdict}>
              <View style={[styles.verdictMark, { backgroundColor: withAlpha(c.success, 0.16) }]}>
                <Icon name="TickCircle" size={24} color={c.success} variant="Bold" />
              </View>
              <View style={styles.verdictCopy}>
                <Text style={styles.verdictTitle}>Shielded!</Text>
                <Text style={styles.verdictText}>The detector dropped to {lastTry?.reading} units. Different materials stop radiation by different amounts.</Text>
              </View>
            </View>
            <View style={[styles.concept, { backgroundColor: withAlpha(c.success, 0.14) }]}>
              <Icon name="Lamp" size={16} color={c.success} variant="Bold" />
              <Text style={[styles.conceptText, { color: c.text }]}>Denser and thicker shields attenuate more</Text>
            </View>
            <Button label="Learn more" onPress={() => { void playSfx("ui.select"); onBack(); }} />
            <Button label="Try another set-up" variant="secondary" onPress={again} />
          </Animated.View>
        ) : failed ? (
          <Animated.View entering={settle()} style={styles.verdict}>
            <View style={[styles.verdictMark, { backgroundColor: withAlpha(c.warning, 0.18) }]}>
              <Icon name="Warning2" size={24} color={c.warning} variant="Bold" />
            </View>
            <View style={styles.verdictCopy}>
              <Text style={styles.verdictTitle}>Still {lastTry?.reading} units</Text>
              <Text style={styles.verdictText}>Too much got through. Try a denser material or make the shield thicker.</Text>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={settle(120)} style={styles.section}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 4 }]}>Radiation</Text>
          <View style={styles.chips}>
            {RADIATIONS.map((r) => (
              <Chip
                key={r.key}
                label={r.label}
                tone={RADIATION_ART[r.key].face}
                active={rad === r.key}
                disabled={running}
                onPress={() => change<Radiation>(setRad)(r.key)}
                mark={
                  <View style={[styles.chipMark, { backgroundColor: RADIATION_ART[r.key].face }]}>
                    <Text style={styles.chipMarkText}>{r.symbol}</Text>
                  </View>
                }
              />
            ))}
          </View>
          <Text style={styles.fact}>{radInfo.fact}</Text>
        </Animated.View>

        <Animated.View entering={settle(180)} style={styles.section}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 4 }]}>Shield</Text>
          <View style={styles.chips}>
            {MATERIALS.map((m) => (
              <Chip
                key={m.key}
                label={m.label}
                tone={MATERIAL_ART[m.key].face}
                active={mat === m.key}
                disabled={running}
                onPress={() => change<Material>(setMat)(m.key)}
                mark={<View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: MATERIAL_ART[m.key].face, borderBottomWidth: 4, borderBottomColor: MATERIAL_ART[m.key].lip }} />}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={settle(240)} style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Thickness</Text>
            <Text style={styles.sectionValue}>{thickness} mm</Text>
          </View>
          <ThicknessSlider value={thickness} tone={matTone} onChange={change<number>(setThickness)} disabled={running} />
        </Animated.View>


        {history.length > 0 ? (
          <Animated.View entering={settle()}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: 4, marginBottom: 2 }]}>History</Text>
            {history.map((h, i) => (
              <View key={`${history.length - i}`} style={[styles.row, i > 0 && { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border }]}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: RADIATION_ART[h.rad].face }} />
                <Text style={styles.rowCopy}>
                  {RADIATIONS.find((x) => x.key === h.rad)!.label} · {MATERIALS.find((x) => x.key === h.mat)!.label} · {h.thickness} mm
                </Text>
                <Text style={[styles.rowValue, { color: h.reading < THRESHOLD ? c.success : c.text }]}>{h.reading}</Text>
              </View>
            ))}
          </Animated.View>
        ) : null}
      </ScrollView>
      <ScrollCue visible={cue} onPress={() => scroller.current?.scrollTo({ y: scrollTarget(metrics.current), animated: !reduced })} />
      </View>

      {/* Run stays in reach however far the page is scrolled */}
      <View style={[styles.footer, { paddingHorizontal: gutter + 4, paddingBottom: insets.bottom + 12, width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }]}>
        <Button
          label={running ? "Running…" : "Run experiment"}
          disabled={running}
          onPress={run}
          renderIcon={(color) => <Icon name="Play" size={20} color={color} variant="Bold" />}
        />
      </View>
    </GestureHandlerRootView>
  );
}

