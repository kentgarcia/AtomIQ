/**
 * The SFX lab (development only): every moment docs/features/SFX_EXPANSION_SPEC.md proposes a sound for, with
 * the candidate sounds to tap and listen to. The first candidate of an undecided moment is the
 * recommended pick (a star); a green tick marks what the owner chose (`LAB_DECISIONS`, with the pitch
 * they liked already applied); the grey "Today" button plays what the app does there now.
 *
 * Gates are bypassed on purpose: the Sound Effects switch, the route policy and the throttle do not
 * apply, so a sound always plays when tapped. Volume and pitch below apply to everything.
 *
 * Opened from the button beside Dev admin on Home (route `/dev-sfx`). Loaded only inside `__DEV__`.
 * TO REMOVE: delete `components/dev/sfx-lab*`, `SfxLab*.tsx`, `assets/sfx/audition/`, `app/dev-sfx.tsx`,
 * and the lines marked `dev-sfx` in `app/(tabs)/index.tsx` and `app/_layout.tsx`.
 */

import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LAB_AREAS, LAB_DECISIONS, LAB_MOMENTS, variantLength, type LabArea, type LabMoment, type LabStep, type LabVariant } from "@/components/dev/sfx-lab-data";
import { playSteps, type PlayHandle, type PlayStep } from "@/components/dev/sfx-lab-player";
import { LAB_SOURCES } from "@/components/dev/sfx-lab-sources";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { CUES, SFX_FILES } from "@/services/sfx-core";
import { sfxAssetFor } from "@/services/sfx";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";

const VOLUMES = [0.5, 0.75, 1] as const;
const PITCHES = [0.8, 1, 1.2, 1.5] as const;
const LETTERS = "ABCDEFGH";

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.background },
    panel: { gap: 10, paddingBottom: 10, paddingTop: 4, borderBottomWidth: 2, borderBottomColor: c.border },
    chips: { flexDirection: "row", gap: 8, alignItems: "center" },
    label: { fontSize: 13, lineHeight: 18, ...fontFaces.heavy, color: c.textMuted },
    chip: { paddingHorizontal: 12, height: 34, borderRadius: 17, borderWidth: 2, borderColor: c.border, backgroundColor: c.card, alignItems: "center", justifyContent: "center" },
    chipOn: { borderColor: c.primaryBorder, backgroundColor: c.primarySurface },
    chipText: { fontSize: 13, lineHeight: 18, ...fontFaces.heavy, color: c.textMuted },
    chipTextOn: { color: c.text },
    stop: { flexDirection: "row", gap: 4, paddingHorizontal: 12, height: 34, borderRadius: 17, alignItems: "center", backgroundColor: c.surfaceSoft },
    title: { fontSize: 17, lineHeight: 22, ...fontFaces.heavy, color: c.text },
    meta: { fontSize: 12, lineHeight: 17, ...fontFaces.medium, color: c.textMuted },
    where: { fontSize: 13, lineHeight: 18, ...fontFaces.medium, color: c.textSecondary },
    note: { fontSize: 13, lineHeight: 18, ...fontFaces.medium, color: c.textMuted, fontStyle: "italic" },
    variant: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingHorizontal: 10, borderRadius: 14, borderWidth: 2, borderColor: c.border, backgroundColor: c.surface },
    variantOn: { borderColor: c.primaryBorder, backgroundColor: c.primarySurface },
    letter: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSoft },
    letterOn: { backgroundColor: c.primary },
    letterText: { fontSize: 13, lineHeight: 18, ...fontFaces.heavy, color: c.text },
    variantText: { flex: 1, fontSize: 14, lineHeight: 19, ...fontFaces.heavy, color: c.text },
    ms: { fontSize: 12, lineHeight: 17, ...fontFaces.medium, color: c.textMuted },
    foot: { fontSize: 13, lineHeight: 18, ...fontFaces.medium, color: c.textMuted, textAlign: "center", paddingVertical: 12 },
  };
});

type Styles = ReturnType<typeof makeStyles>;

/** The file length of one step, ms. */
const lengthOf = (step: LabStep): number => (step.file ? (LAB_SOURCES[step.file]?.ms ?? 0) : step.cue ? SFX_FILES[CUES[step.cue].file] : 0);

const seconds = (ms: number): string => `${(ms / 1000).toFixed(ms < 1000 ? 2 : 1)} s`;

function Chip({ label, on, onPress, styles }: { label: string; on: boolean; onPress: () => void; styles: Styles }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

interface VariantButtonProps {
  letter: string;
  text: string;
  ms: number;
  mark: "star" | "chosen" | null;
  playing: boolean;
  onPress: () => void;
  styles: Styles;
  textColor: string;
  onColor: string;
  accent: string;
  chosen: string;
}

function VariantButton({ letter, text, ms, mark, playing, onPress, styles, textColor, onColor, accent, chosen }: VariantButtonProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${playing ? "Stop" : "Play"} ${letter}: ${text}`} style={({ pressed }) => [styles.variant, playing && styles.variantOn, pressed && { opacity: 0.85 }]}>
      <View style={[styles.letter, playing && styles.letterOn]}>
        <Icon name={playing ? "Pause" : "Play"} size={14} color={playing ? onColor : textColor} variant="Bold" />
      </View>
      <Text style={styles.variantText} numberOfLines={2}>
        {letter.length === 1 ? `${letter}  ` : ""}
        {text}
      </Text>
      {mark ? <Icon name={mark === "chosen" ? "TickCircle" : "Star1"} size={16} color={mark === "chosen" ? chosen : accent} variant="Bold" /> : null}
      <Text style={styles.ms}>{seconds(ms)}</Text>
    </Pressable>
  );
}

export function SfxLab() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsiveLayout();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();

  const [area, setArea] = useState<LabArea | "All">("All");
  const [volume, setVolume] = useState<number>(1);
  const [pitch, setPitch] = useState<number>(1);
  const [playing, setPlaying] = useState<string | null>(null);
  const handle = useRef<PlayHandle | null>(null);

  const stop = useCallback(() => {
    handle.current?.stop();
    handle.current = null;
    setPlaying(null);
  }, []);

  useEffect(() => stop, [stop]);

  const resolve = useCallback(
    (moment: LabMoment, steps: readonly LabStep[]): PlayStep[] =>
      steps.flatMap((step): PlayStep[] => {
        const at = step.at ?? 0;
        if (step.file) {
          const found = LAB_SOURCES[step.file];
          if (!found) return [];
          return [{ source: found.source, ms: found.ms, at, stopAfter: step.stopAfter, volume: moment.volume * (step.volume ?? 1) * volume, rate: (step.rate ?? 1) * pitch }];
        }
        if (step.cue) {
          const asset = sfxAssetFor(step.cue);
          return [{ source: asset.source, ms: SFX_FILES[CUES[step.cue].file], at, stopAfter: step.stopAfter, volume: asset.volume * (step.volume ?? 1) * volume, rate: (step.rate ?? asset.rate) * pitch }];
        }
        return [];
      }),
    [volume, pitch],
  );

  const toggle = useCallback(
    (key: string, moment: LabMoment, steps: readonly LabStep[]) => {
      if (playing === key) return stop();
      handle.current?.stop();
      setPlaying(key);
      const mine = playSteps(resolve(moment, steps), () => setPlaying((now) => (now === key ? null : now)));
      handle.current = mine;
    },
    [playing, resolve, stop],
  );

  const moments = useMemo(() => LAB_MOMENTS.filter((m) => area === "All" || m.area === area), [area]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of LAB_MOMENTS) map.set(m.area, (map.get(m.area) ?? 0) + 1);
    return map;
  }, []);

  const renderMoment = (moment: LabMoment) => {
    const todayStep: LabVariant | null = moment.today ? { steps: [{ cue: moment.today }] } : null;
    const decision = LAB_DECISIONS[moment.id];
    const chosenIndex = decision && typeof decision.pick === "number" ? decision.pick : null;
    const chosenRate = decision && typeof decision.pick === "number" ? (decision.rate ?? 1) : 1;
    const verdict = !decision
      ? "Undecided"
      : decision.pick === "today"
        ? "Chosen: keep today"
        : decision.pick === "none"
          ? "Chosen: silent"
          : decision.pick === "open"
            ? "Still open"
            : `Chosen: ${LETTERS[decision.pick]}${chosenRate !== 1 ? ` at ${chosenRate}x` : ""}`;
    return (
      <Card key={moment.id} gap={10}>
        <View style={{ gap: 3 }}>
          <Text style={styles.title}>{moment.title}</Text>
          <Text style={styles.meta}>
            {moment.id} · {moment.category} · volume {moment.volume} · {moment.today ? `before wiring: ${moment.today}` : "was silent"}
          </Text>
          <Text style={[styles.meta, { color: decision ? (decision.pick === "open" ? c.warning : c.success) : c.textMuted }]}>
            {verdict}
            {decision?.note ? `. ${decision.note}` : ""}
          </Text>
          <Text style={styles.where}>{moment.where}</Text>
          {moment.note ? <Text style={styles.note}>{moment.note}</Text> : null}
        </View>
        <View style={{ gap: 8 }}>
          {todayStep && moment.today ? (
            <VariantButton
              letter="Today"
              text={`${moment.today}${!decision && moment.keepToday ? "  (recommended: keep)" : ""}`}
              ms={variantLength(todayStep, lengthOf)}
              mark={decision?.pick === "today" ? "chosen" : !decision && moment.keepToday ? "star" : null}
              playing={playing === `${moment.id}:today`}
              onPress={() => toggle(`${moment.id}:today`, moment, todayStep.steps)}
              styles={styles}
              textColor={c.textMuted}
              onColor={c.onPrimary}
              accent={c.warning}
              chosen={c.success}
            />
          ) : null}
          {moment.variants.map((variant, i) => {
            const key = `${moment.id}:${i}`;
            const isChosen = chosenIndex === i;
            const rate = isChosen ? chosenRate : 1;
            const steps = rate === 1 ? variant.steps : variant.steps.map((st) => ({ ...st, rate: (st.rate ?? 1) * rate }));
            const text = `${variant.label ?? variant.steps.map((st) => st.file ?? st.cue).join(" + ")}${rate !== 1 ? `  (at ${rate}x)` : ""}`;
            return (
              <VariantButton
                key={key}
                letter={LETTERS[i] ?? String(i + 1)}
                text={text}
                ms={variantLength(variant, lengthOf)}
                mark={isChosen ? "chosen" : !decision && i === 0 && !moment.keepToday ? "star" : null}
                playing={playing === key}
                onPress={() => toggle(key, moment, steps)}
                styles={styles}
                textColor={c.text}
                onColor={c.onPrimary}
                accent={c.warning}
                chosen={c.success}
              />
            );
          })}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="SFX lab"
        subtitle={`${LAB_MOMENTS.length} moments, gates off`}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        backLabel="Back"
        scrolled={scrolled}
      />
      <View style={[styles.panel, { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: 20 }]}>
        <View style={styles.chips}>
          <Text style={styles.label}>Volume</Text>
          {VOLUMES.map((v) => (
            <Chip key={v} label={`${Math.round(v * 100)}%`} on={volume === v} onPress={() => setVolume(v)} styles={styles} />
          ))}
          <View style={{ flex: 1 }} />
          <Pressable onPress={stop} accessibilityRole="button" accessibilityLabel="Stop the sound" style={styles.stop}>
            <Icon name="Pause" size={14} color={c.text} variant="Bold" />
            <Text style={styles.chipText}>Stop</Text>
          </Pressable>
        </View>
        <View style={styles.chips}>
          <Text style={styles.label}>Pitch</Text>
          {PITCHES.map((p) => (
            <Chip key={p} label={`${p}x`} on={pitch === p} onPress={() => setPitch(p)} styles={styles} />
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label={`All ${LAB_MOMENTS.length}`} on={area === "All"} onPress={() => setArea("All")} styles={styles} />
          {LAB_AREAS.map((a) => (
            <Chip key={a} label={`${a} ${counts.get(a) ?? 0}`} on={area === a} onPress={() => setArea(a)} styles={styles} />
          ))}
        </ScrollView>
      </View>
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 32, gap: 14 }}
      >
        {moments.map(renderMoment)}
        <Text style={styles.foot}>
          Tick = chosen, star = recommended where nothing is chosen yet. &quot;Today&quot; and &quot;before wiring&quot; are what played before the chosen sounds went into the app. The files come from the uploaded library, converted and levelled the way the bundled sounds are. Nothing here is wired into the app yet.
        </Text>
      </ScrollView>
    </View>
  );
}
