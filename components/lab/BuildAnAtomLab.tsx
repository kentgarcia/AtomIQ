/**
 * Build an Atom lab. A challenge names an atom (an element, an isotope or an ion); the learner adds
 * protons, neutrons and electrons and watches it come together: a nucleus of flat tokens that pop in
 * and never move once placed, shells of electrons that turn slowly, a live element tile and charge.
 * Check tells them if it is right (the picture shakes if not, with a nudge that does not give the
 * number away); a right build pops a burst and reveals the atom's numbers like the lesson finish.
 * Rules and drawing maths are in `atom-core.ts`; the particle colours are the lesson palette.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useIdleStill, useReducedMotion } from "@/components/motion/use-reduced-motion";

import { HeaderButton, ScreenHeader, useHeaderBorder } from "@/components/layout";
import { duoShade } from "@/components/lesson/visual/duo-palette";
import { ScrollCue } from "@/components/lesson/ScrollCue";
import { moreBelow, scrollTarget, type ScrollMetrics } from "@/components/lesson/scroll-cue-core";
import { Shake } from "@/components/lesson/Shake";
import { StatTile } from "@/components/lesson/StatTile";
import { STAT_FX, shineStart, statStart } from "@/components/lesson/stat-reveal-core";
import { BURST } from "@/components/motion/burst-core";
import { Burst } from "@/components/motion/Burst";
import { settle } from "@/components/motion/settle";
import { useDelayedClock } from "@/components/motion/use-delayed-clock";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SfxOnMount } from "@/components/ui/sfx-on-mount";
import { Text } from "@/components/ui/text";
import { recordActivity } from "@/services/activity-log";
import { impactLight, notifyError, notifySuccess } from "@/services/haptics";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";

import {
  ATOM_CHALLENGES,
  LEVEL_NAME,
  LIMITS,
  POP_MS,
  SHELL_RADII,
  TOKEN_R,
  addParticle,
  checkAtom,
  demoPlan,
  countSlots,
  electronPosition,
  electronShells,
  nucleusFit,
  popScale,
  readout,
  removeParticle,
  shellAngle,
  slotPosition,
  type Kind,
  type NuclearKind,
  type Slots,
} from "./atom-core";

const STAGE_MAX = 300;
const ELECTRON_R = 2.7;

const KIND_NAME: Record<Kind, { plural: string; singular: string; tone: "danger" | "neutral" | "info" }> = {
  protons: { plural: "Protons", singular: "proton", tone: "danger" },
  neutrons: { plural: "Neutrons", singular: "neutron", tone: "neutral" },
  electrons: { plural: "Electrons", singular: "electron", tone: "info" },
};
const POP_RATE: Record<Kind, number> = { protons: 0.9, neutrons: 1.1, electrons: 1.5 };

const useStyles = createStyles((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.mapBackground },
  body: { paddingTop: 4, gap: 16 },
  footer: { paddingTop: 10, backgroundColor: theme.colors.mapBackground },
  target: { gap: 6, paddingHorizontal: 4 },
  levelChip: { alignSelf: "flex-start", height: 26, paddingHorizontal: 12, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  levelText: { fontSize: 12, ...fontFaces.heavy, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.text },
  targetName: { fontSize: 32, lineHeight: 40, ...fontFaces.black, color: theme.colors.text },
  targetSub: { fontSize: 14, lineHeight: 20, ...fontFaces.medium, color: theme.colors.textMuted },
  showMe: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36 },
  showMeText: { fontSize: 14, ...fontFaces.heavy },
  caption: { fontSize: 18, lineHeight: 24, ...fontFaces.heavy, color: theme.colors.text, textAlign: "center" },
  stageWrap: { alignItems: "center" },
  tile: { position: "absolute", left: 0, top: 0, width: 58, paddingVertical: 6, borderRadius: 14, borderWidth: 2, borderBottomWidth: 4, alignItems: "center", backgroundColor: theme.colors.card, borderColor: theme.colors.borderStrong },
  tileNumber: { fontSize: 12, ...fontFaces.heavy, color: theme.colors.textMuted },
  tileSymbol: { fontSize: 26, lineHeight: 30, ...fontFaces.black, color: theme.colors.text },
  badge: { position: "absolute", right: 0, top: 0, minWidth: 44, height: 44, borderRadius: 22, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", borderWidth: 2, borderBottomWidth: 4 },
  badgeText: { fontSize: 18, ...fontFaces.black, color: theme.colors.text },
  badgeLabel: { fontSize: 9, ...fontFaces.heavy, letterSpacing: 0.5, textTransform: "uppercase", color: theme.colors.textMuted, marginTop: -2 },
  readout: { alignItems: "center", gap: 4 },
  readoutName: { fontSize: 24, lineHeight: 30, ...fontFaces.black, color: theme.colors.text, textAlign: "center" },
  readoutFacts: { fontSize: 15, ...fontFaces.semibold, color: theme.colors.textSecondary, textAlign: "center" },
  pill: { height: 28, paddingHorizontal: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 2 },
  pillText: { fontSize: 13, ...fontFaces.heavy, color: theme.colors.text },
  verdict: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4 },
  verdictMark: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  verdictCopy: { flex: 1, gap: 2 },
  verdictTitle: { fontSize: 18, ...fontFaces.heavy, color: theme.colors.text },
  verdictText: { fontSize: 14, lineHeight: 20, ...fontFaces.medium, color: theme.colors.textMuted },
  counter: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderBottomWidth: 4 },
  counterLabel: { flex: 1, fontSize: 18, ...fontFaces.heavy, color: theme.colors.text },
  count: { minWidth: 40, textAlign: "center", fontSize: 26, ...fontFaces.black, color: theme.colors.text, fontVariant: ["tabular-nums"] },
  tiles: { flexDirection: "row", justifyContent: "center", gap: 8 },
  concept: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 15 },
  conceptText: { fontSize: 13, ...fontFaces.heavy, color: theme.colors.text },
  note: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  noteText: { flex: 1, fontSize: 14, lineHeight: 20, ...fontFaces.medium, color: theme.colors.textSecondary },
}));

// ------------------------------------------------------------------
// The picture
// ------------------------------------------------------------------

/** One flat token (a face over a lip) at (x, y) of the 100-unit square, popping in when it first appears. */
function Token({ x, y, r, paint, size, still }: { x: number; y: number; r: number; paint: { face: string; lip: string }; size: number; still?: boolean }) {
  const reduced = useReducedMotion();
  const clock = useSharedValue(reduced || still ? POP_MS : 0);
  useEffect(() => {
    if (reduced || still) return;
    clock.set(withTiming(POP_MS, { duration: POP_MS, easing: Easing.linear }));
    return () => cancelAnimation(clock);
  }, [reduced, still, clock]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: popScale(clock.get()) }] }));
  const px = (r * size) / 100;
  const lip = Math.max(2, px * 0.28);
  return (
    <Animated.View
      pointerEvents="none"
      exiting={FadeOut.duration(120)}
      style={[
        { position: "absolute", left: (x * size) / 100 - px, top: (y * size) / 100 - px, width: px * 2, height: px * 2 + lip, borderRadius: px, backgroundColor: paint.face, borderBottomWidth: lip, borderBottomColor: paint.lip },
        anim,
      ]}
    />
  );
}

function Shell({ shell, count, clock, size, paint }: { shell: number; count: number; clock: SharedValue<number>; size: number; paint: { face: string; lip: string } }) {
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${shellAngle(shell, clock.get())}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: size, height: size }, spin]}>
      {Array.from({ length: count }, (_, k) => {
        const p = electronPosition(shell, k, count);
        return <Token key={`${shell}-${k}-${count}`} x={p.x} y={p.y} r={ELECTRON_R} paint={paint} size={size} />;
      })}
    </Animated.View>
  );
}

function AtomStage({
  slots,
  electrons,
  size,
  burst,
}: {
  slots: Slots;
  electrons: number;
  size: number;
  burst: ReactNode;
}) {
  const { theme } = useTheme();
  const proton = duoShade("danger", theme.mode);
  const neutron = duoShade("neutral", theme.mode);
  const electron = duoShade("info", theme.mode);
  const reduced = useIdleStill();

  // The shells turn on one slow clock
  const spinClock = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    spinClock.set(withRepeat(withTiming(1_000_000, { duration: 1_000_000, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(spinClock);
  }, [reduced, spinClock]);

  // The whole nucleus shrinks as one piece to stay clear of the first shell
  const fit = useSharedValue(nucleusFit(slots.length));
  useEffect(() => {
    fit.set(withTiming(nucleusFit(slots.length), { duration: 240, easing: Easing.out(Easing.cubic) }));
  }, [slots.length, fit]);
  const nucleusStyle = useAnimatedStyle(() => ({ transform: [{ scale: fit.get() }] }));

  const shells = electronShells(electrons);
  return (
    <View style={{ width: size, height: size }}>
      {SHELL_RADII.map((r, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: ((50 - r) * size) / 100,
            top: ((50 - r) * size) / 100,
            width: (r * 2 * size) / 100,
            height: (r * 2 * size) / 100,
            borderRadius: (r * size) / 100,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: theme.colors.borderStrong,
            opacity: i < shells.length ? 1 : i === 0 ? 0.6 : 0,
          }}
        />
      ))}
      {shells.map((count, shell) => (
        <Shell key={shell} shell={shell} count={count} clock={spinClock} size={size} paint={electron} />
      ))}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: size, height: size }, nucleusStyle]}>
        {slots.map((kind, i) => {
          if (kind === null) return null;
          const p = slotPosition(i);
          return <Token key={i} x={p.x} y={p.y} r={TOKEN_R} paint={kind === "protons" ? proton : neutron} size={size} />;
        })}
      </Animated.View>
      <View pointerEvents="none" style={{ position: "absolute", left: size / 2, top: size / 2, width: 0, height: 0 }}>
        {burst}
      </View>
    </View>
  );
}

// ------------------------------------------------------------------
// The lab
// ------------------------------------------------------------------

export function BuildAnAtomLab({ onBack, onPeriodicTable }: { onBack: () => void; onPeriodicTable?: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { scrolled, onScroll: onHeaderScroll, scrollEventThrottle } = useHeaderBorder();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [slots, setSlots] = useState<Slots>([]);
  const [electrons, setElectrons] = useState(0);
  const [result, setResult] = useState<"idle" | "correct" | "wrong">("idle");
  const [hint, setHint] = useState<string | null>(null);
  const [stageWidth, setStageWidth] = useState(300);

  // The coached build of an element challenge: it plays on the stage in place of the learner's atom, then clears
  const [demo, setDemo] = useState<{ slots: Slots; electrons: number; caption: string } | null>(null);
  const demoTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stopDemo = useCallback(() => {
    demoTimers.current.forEach(clearTimeout);
    demoTimers.current = [];
    setDemo(null);
  }, []);
  useEffect(() => () => demoTimers.current.forEach(clearTimeout), []);

  const target = ATOM_CHALLENGES[index]!;
  const shownSlots = demo ? demo.slots : slots;
  const shownElectrons = demo ? demo.electrons : electrons;
  const protons = countSlots(shownSlots, "protons");
  const neutrons = countSlots(shownSlots, "neutrons");
  const counts = { protons, neutrons, electrons: shownElectrons };
  const info = readout(counts);
  const canDemo = target.level === 1 && result !== "correct";
  const size = Math.min(STAGE_MAX, stageWidth);
  const levelTone = target.level === 1 ? c.success : target.level === 2 ? c.info : c.warning;

  // "More below": a cue until the learner reaches the end of a tall page
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

  // The burst of a right build
  const burstClock = useDelayedClock(BURST.total, 0, result === "correct", index);

  const add = (kind: Kind) => {
    if (result === "correct" || demo) return;
    const have = kind === "protons" ? protons : kind === "neutrons" ? neutrons : electrons;
    if (have >= LIMITS[kind]) {
      void playSfx("ui.invalid");
      return;
    }
    impactLight();
    void playSfx("reward.pop", { rate: POP_RATE[kind] });
    setResult("idle");
    if (kind === "electrons") setElectrons((e) => e + 1);
    else setSlots((s) => addParticle(s, kind as NuclearKind));
  };
  const remove = (kind: Kind) => {
    if (result === "correct" || demo) return;
    const have = kind === "protons" ? protons : kind === "neutrons" ? neutrons : electrons;
    if (have <= 0) return;
    impactLight();
    void playSfx("ui.unequip");
    setResult("idle");
    if (kind === "electrons") setElectrons((e) => e - 1);
    else setSlots((s) => removeParticle(s, kind as NuclearKind));
  };

  const clear = () => {
    stopDemo();
    setSlots([]);
    setElectrons(0);
    setResult("idle");
    setHint(null);
  };
  const load = (i: number) => {
    setIndex(i);
    clear();
  };

  const playDemo = useCallback(
    (i: number) => {
      const plan = demoPlan(ATOM_CHALLENGES[i]!);
      demoTimers.current.forEach(clearTimeout);
      setSlots([]);
      setElectrons(0);
      setResult("idle");
      setHint(null);
      setDemo({ slots: [], electrons: 0, caption: "" });
      const at = (ms: number, fn: () => void) => demoTimers.current.push(setTimeout(fn, ms));
      for (const cap of plan.captions) at(cap.at, () => setDemo((d) => (d ? { ...d, caption: cap.text } : d)));
      for (const step of plan.steps) {
        at(step.at, () => {
          void playSfx("reward.pop", { rate: POP_RATE[step.kind] });
          setDemo((d) => (d ? (step.kind === "electrons" ? { ...d, electrons: d.electrons + 1 } : { ...d, slots: addParticle(d.slots, step.kind as NuclearKind) }) : d));
        });
      }
      at(plan.built, () => void playSfx("reward.sparkle"));
      at(plan.end, () => {
        demoTimers.current = [];
        setDemo(null);
      });
    },
    [],
  );

  // The first challenge opens with the coached build, so the learner sees what the controls do
  useEffect(() => {
    const id = setTimeout(() => playDemo(0), 700);
    return () => clearTimeout(id);
  }, [playDemo]);

  const check = () => {
    if (demo) return;
    const verdict = checkAtom(target, counts);
    if (verdict.ok) {
      setResult("correct");
      setHint(null);
      notifySuccess();
      void playSfx("reward.requirements-met");
      recordActivity("lab_session", { id: `build-an-atom:${index}` });
    } else {
      setResult("wrong");
      setHint(verdict.hint ?? null);
      notifyError();
      void playSfx("lesson.answer-wrong");
    }
  };

  const next = () => {
    void playSfx("lesson.whoosh");
    load((index + 1) % ATOM_CHALLENGES.length);
  };

  const rows: Kind[] = ["protons", "neutrons", "electrons"];
  const correct = result === "correct";
  const chargeTone = info.charge === "0" ? c.success : c.warning;
  const tiles = useMemo(
    () => [
      { key: "z", label: "Atomic #", value: `${protons}`, countTo: protons, tone: c.info, icon: "Hashtag" },
      { key: "a", label: "Mass #", value: `${protons + neutrons}`, countTo: protons + neutrons, tone: c.gold, icon: "Weight" },
      { key: "q", label: "Charge", value: info.charge, countTo: undefined as number | undefined, tone: chargeTone, icon: "Flash" },
    ],
    [protons, neutrons, info.charge, chargeTone, c.info, c.gold],
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Build an Atom"
        subtitle={`Challenge ${index + 1} of ${ATOM_CHALLENGES.length}`}
        onBack={onBack}
        scrolled={scrolled}
        right={<HeaderButton icon="Refresh" label="Start over" onPress={() => { void playSfx("ui.cancel"); clear(); }} />}
      />
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
          <Animated.View key={`target-${index}`} entering={settle()} style={styles.target}>
            <View style={[styles.levelChip, { backgroundColor: withAlpha(levelTone, 0.18) }]}>
              <Text style={styles.levelText}>{LEVEL_NAME[target.level]}</Text>
            </View>
            <Text style={styles.targetName}>{target.label}</Text>
            <Text style={styles.targetSub}>{correct ? "You built it!" : demo ? "Watch how it is built." : "Add particles to build it, then check."}</Text>
            {canDemo && !demo ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Show me how to build it" hitSlop={8} onPress={() => { impactLight(); playDemo(index); }} style={({ pressed }) => [styles.showMe, pressed && { opacity: 0.6 }]}>
                <Icon name="Play" size={16} color={c.link} variant="Bold" />
                <Text style={[styles.showMeText, { color: c.link }]}>Show me how</Text>
              </Pressable>
            ) : null}
          </Animated.View>

          <Animated.View entering={settle(60)} style={styles.stageWrap} onLayout={(e: LayoutChangeEvent) => setStageWidth(Math.round(e.nativeEvent.layout.width))}>
            <Shake active={result === "wrong"} style={{ width: size, height: size }}>
              <AtomStage
                slots={shownSlots}
                electrons={shownElectrons}
                size={size}
                burst={<Burst clock={burstClock} at={0} diameter={size * 0.5} color={c.success} reach={size * 0.45} />}
              />
              <View pointerEvents="none" style={styles.tile}>
                <Text style={styles.tileNumber}>{protons || ""}</Text>
                <Text style={styles.tileSymbol}>{info.symbol}</Text>
              </View>
              <View pointerEvents="none" style={[styles.badge, { backgroundColor: withAlpha(chargeTone, 0.16), borderColor: chargeTone }]}>
                <Text style={styles.badgeText}>{info.charge}</Text>
                <Text style={styles.badgeLabel}>charge</Text>
              </View>
            </Shake>
          </Animated.View>

          <View style={styles.readout} accessibilityLiveRegion="polite">
            <Text style={styles.readoutName}>{info.isotope ?? (protons > 0 ? info.name : "Add a proton to begin")}</Text>
            {protons > 0 ? <Text style={styles.readoutFacts}>Mass number {info.massNumber} · Charge {info.charge}</Text> : null}
            {target.level === 2 && info.stable !== undefined ? (
              <View style={[styles.pill, { backgroundColor: withAlpha(info.stable ? c.success : c.warning, 0.18) }]}>
                <Text style={styles.pillText}>{info.stable ? "Stable" : "Unstable"}</Text>
              </View>
            ) : null}
          </View>

          {result === "wrong" && hint ? (
            <Animated.View entering={settle()} style={styles.verdict}>
              <View style={[styles.verdictMark, { backgroundColor: withAlpha(c.warning, 0.18) }]}>
                <Icon name="InfoCircle" size={24} color={c.warning} variant="Bold" />
              </View>
              <View style={styles.verdictCopy}>
                <Text style={styles.verdictTitle}>Almost!</Text>
                <Text style={styles.verdictText}>{hint}</Text>
              </View>
            </Animated.View>
          ) : null}

          {demo ? (
            <View style={{ gap: 12, alignItems: "center", minHeight: 120, justifyContent: "center" }}>
              <Animated.Text key={demo.caption} entering={settle()} style={styles.caption} accessibilityLiveRegion="polite">
                {demo.caption || " "}
              </Animated.Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Skip the demo" hitSlop={8} onPress={() => { void playSfx("ui.cancel"); stopDemo(); }} style={({ pressed }) => [styles.showMe, pressed && { opacity: 0.6 }]}>
                <Text style={[styles.showMeText, { color: c.textMuted }]}>Skip</Text>
              </Pressable>
            </View>
          ) : !correct ? (
            <Animated.View entering={settle(120)}>
              {rows.map((kind, i) => {
                const have = kind === "protons" ? protons : kind === "neutrons" ? neutrons : electrons;
                const paint = duoShade(KIND_NAME[kind].tone, theme.mode);
                return (
                  <View key={kind} style={[styles.counter, i > 0 && { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border }]}>
                    <View style={[styles.swatch, { backgroundColor: paint.face, borderBottomColor: paint.lip }]} />
                    <Text style={styles.counterLabel}>{KIND_NAME[kind].plural}</Text>
                    <Button label="−" accessibilityLabel={`Remove a ${KIND_NAME[kind].singular}`} variant="secondary" fullWidth={false} disabled={have <= 0} style={{ minWidth: 56 }} onPress={() => remove(kind)} />
                    <Text style={styles.count} accessibilityLabel={`${have} ${KIND_NAME[kind].plural.toLowerCase()}`}>
                      {have}
                    </Text>
                    <Button label="+" accessibilityLabel={`Add a ${KIND_NAME[kind].singular}`} variant="secondary" fullWidth={false} disabled={have >= LIMITS[kind]} style={{ minWidth: 56 }} onPress={() => add(kind)} />
                  </View>
                );
              })}
            </Animated.View>
          ) : (
            <View style={{ gap: 16 }}>
              {/* The numbers arrive one at a time like the lesson finish screen's */}
              <View style={styles.tiles}>
                {tiles.map((t, n) => (
                  <View key={t.key} style={{ flex: 1, maxWidth: 112 }}>
                    <StatTile
                      tone={t.tone}
                      label={t.label}
                      value={t.value}
                      countTo={t.countTo}
                      format={t.countTo === undefined ? undefined : String}
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
                <Icon name="Atom" size={16} color={c.success} variant="Bold" />
                <Text style={styles.conceptText}>Atomic structure</Text>
              </View>
              <Text style={[styles.readoutFacts, { paddingHorizontal: 4 }]}>
                {protons} protons make it {info.name}. {protons} + {neutrons} nucleons give mass number {protons + neutrons}.
              </Text>
              {target.label === "Carbon-14" ? (
                <View style={styles.note}>
                  <Icon name="Lamp" size={18} color={c.warning} variant="Bold" />
                  <Text style={styles.noteText}>Carbon-14 is a radioactive isotope: a natural bridge to radioactive decay.</Text>
                </View>
              ) : null}
              {onPeriodicTable ? (
                <Button
                  label="Open the periodic table"
                  variant="secondary"
                  onPress={() => {
                    void playSfx("ui.select");
                    onPeriodicTable();
                  }}
                  renderIcon={(color) => <Icon name="Category" size={20} color={color} variant="Bold" />}
                />
              ) : null}
            </View>
          )}
        </ScrollView>
        <ScrollCue visible={cue} onPress={() => scroller.current?.scrollTo({ y: scrollTarget(metrics.current), animated: !reduced })} />
      </View>

      <View style={[styles.footer, { paddingHorizontal: gutter + 4, paddingBottom: insets.bottom + 12, width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }]}>
        {correct ? (
          <Button label="Next challenge" onPress={next} renderIcon={(color) => <Icon name="ArrowRight2" size={20} color={color} variant="Bold" />} />
        ) : (
          <Button label="Check atom" onPress={check} disabled={!!demo || slots.length + electrons === 0} renderIcon={(color) => <Icon name="TickCircle" size={20} color={color} variant="Bold" />} />
        )}
      </View>
    </View>
  );
}
