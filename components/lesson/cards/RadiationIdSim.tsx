/**
 * Radiation id: read a clue, pick alpha, beta or gamma, then watch it leave the nucleus
 * (docs/features/UNIT_2_RADIOACTIVITY_SPEC.md §8). A wrong guess is allowed and re-tried.
 *
 * The emission is a short ease-out move (a few hundred milliseconds) of a plain view, not an
 * animated SVG transform. With reduced motion it simply appears at its final position.
 */

import { useEffect, useRef, useState } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import Svg, { Polyline } from "react-native-svg";

import { EASE_OUT } from "@/components/motion/motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { RADIATION_KINDS, caseAt, createRadiationId, goalMet, guess, next } from "@/content/curriculum/radiation-id-core";
import type { RadiationIdData, RadiationKind } from "@/content/curriculum/types";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme } from "@/theme";

import { duoShade } from "../visual/duo-palette";
import { NucleusArt } from "./NucleusArt";
import { TermText, useCardStyles } from "./shared";

const MOVE_MS = 450;

const NAMES: Record<RadiationKind, string> = { alpha: "Alpha", beta: "Beta", gamma: "Gamma" };
const SAYS: Record<RadiationKind, string> = {
  alpha: "Alpha: a chunk of 2 protons and 2 neutrons.",
  beta: "Beta: a fast electron.",
  gamma: "Gamma: high-energy electromagnetic radiation, not a particle.",
};

const useStyles = createStyles((theme) => ({
  goalHead: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
  goalRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: theme.colors.surfaceStrong },
  chipMet: { backgroundColor: theme.colors.successSurface },
  chipText: { ...fontFaces.bold, fontSize: fontSizes.xl, color: theme.colors.text },
  clue: { ...fontFaces.bold, fontSize: fontSizes["3xl"], lineHeight: 28, color: theme.colors.text, textAlign: "center" },
  stage: { height: 110, justifyContent: "center" },
  nucleus: { position: "absolute", left: 4, top: 14 },
  flyer: { position: "absolute", left: 96, top: 0, bottom: 0, justifyContent: "center" },
  says: { ...fontFaces.bold, fontSize: fontSizes["2xl"], lineHeight: 26, textAlign: "center", color: theme.colors.text },
  saysRight: { color: theme.colors.success },
  saysWrong: { color: theme.colors.warning },
  choices: { gap: spacing.sm },
  done: { ...fontFaces.heavy, fontSize: fontSizes["3xl"], color: theme.colors.success, textAlign: "center" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  tip: { ...fontFaces.medium, flex: 1, fontSize: fontSizes.xl, lineHeight: 22, color: theme.colors.textSecondary },
  reset: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  resetText: { ...fontFaces.bold, fontSize: fontSizes.lg, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
}));

export function RadiationIdSim({ data, onComplete }: { data: RadiationIdData; onComplete: () => void }) {
  const { theme } = useTheme();
  const card = useCardStyles(theme);
  const styles = useStyles(theme);
  const c = theme.colors;
  const [state, setState] = useState(createRadiationId);
  const completed = useRef(false);

  const current = caseAt(data.cases, state);
  const solved = state.solved.includes(current.id);
  const met = goalMet(data.cases, state);
  const isLast = data.cases.every((k) => k.id === current.id || state.solved.includes(k.id));

  useEffect(() => {
    if (met && !completed.current) {
      completed.current = true;
      onComplete();
    }
  }, [met, onComplete]);

  const wrongNow = state.last && !state.last.correct && state.last.caseId === current.id ? state.last.guess : null;
  const line = solved ? `Yes, ${SAYS[current.answer]}` : wrongNow ? `Not ${NAMES[wrongNow].toLowerCase()}. Try again` : "";

  return (
    <View style={card.stack}>
      <Text style={card.sectionLabel}>Name the radiation</Text>
      <TermText text={data.task} style={card.prompt} />

      <Card tone="soft" padding={spacing.md} gap={spacing.sm}>
        <Text style={styles.goalHead}>Your goal</Text>
        <View style={styles.goalRow} accessibilityLiveRegion="polite">
          {data.cases.map((k, i) => {
            const ok = state.solved.includes(k.id);
            return (
              <View key={k.id} style={[styles.chip, ok && styles.chipMet]} accessible accessibilityLabel={`Change ${i + 1}, ${ok ? "done" : "not yet"}`}>
                <Icon name={ok ? "TickCircle" : "Record"} size={20} color={ok ? c.success : c.textMuted} />
                <Text style={styles.chipText}>Change {i + 1}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Card tone="soft" padding={spacing.md} gap={spacing.sm}>
        <Text style={styles.clue} accessibilityLiveRegion="polite">{current.clue}</Text>
        <Emission key={current.id} kind={current.answer} play={solved} />
      </Card>

      <View accessibilityLiveRegion="polite">
        <Text style={[styles.says, solved && styles.saysRight, wrongNow && styles.saysWrong]}>{line || " "}</Text>
      </View>

      {solved ? (
        met ? (
          <Text style={styles.done}>All three found!</Text>
        ) : (
          <Button label={isLast ? "Next" : "Next change"} onPress={() => setState((s) => next(data.cases, s))} />
        )
      ) : (
        <View style={styles.choices}>
          {RADIATION_KINDS.map((k) => (
            <Button key={k} label={NAMES[k]} variant="secondary" accessibilityLabel={`Pick ${NAMES[k]}`} onPress={() => setState((s) => guess(data.cases, s, k))} />
          ))}
        </View>
      )}

      {!met && !solved && data.hint ? (
        <View style={styles.tipRow}>
          <Icon name="Lamp" size={22} color={c.warning} />
          <Text style={styles.tip}>{data.hint}</Text>
        </View>
      ) : null}
      {state.solved.length > 0 || state.index > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Start over" onPress={() => { completed.current = false; setState(createRadiationId()); }} style={styles.reset} hitSlop={8}>
          <Text style={styles.resetText}>Start over</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** The nucleus and the thing that leaves it. Plays once when `play` turns true. */
function Emission({ kind, play }: { kind: RadiationKind; play: boolean }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const travel = useSharedValue(0);
  const fade = useSharedValue(0);
  const reach = Math.max(0, width - 96 - 40);

  useEffect(() => {
    if (!play) {
      travel.value = 0;
      fade.value = 0;
      return;
    }
    fade.value = 1;
    travel.value = reduced ? reach : withTiming(reach, { duration: MOVE_MS, easing: EASE_OUT });
  }, [play, reach, reduced, travel, fade]);

  const flyerStyle = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateX: travel.value }] }));
  const danger = duoShade("danger", theme.mode);
  const neutral = duoShade("neutral", theme.mode);
  const info = duoShade("info", theme.mode);
  const warn = duoShade("warning", theme.mode);

  return (
    <View style={styles.stage} onLayout={(e: LayoutChangeEvent) => setWidth(Math.floor(e.nativeEvent.layout.width))} accessible accessibilityRole="image" accessibilityLabel={play ? `${NAMES[kind]} leaves the nucleus.` : "A nucleus that is about to change."}>
      <View style={styles.nucleus}>
        <NucleusArt protons={5} neutrons={6} size={82} ring="warning" />
      </View>
      <Animated.View style={[styles.flyer, flyerStyle]}>
        {kind === "alpha" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", width: 40, gap: 2 }}>
            {[danger, neutral, neutral, danger].map((p, i) => (
              <View key={i} style={{ width: 18, height: 18, borderRadius: radius.full, backgroundColor: p.face }} />
            ))}
          </View>
        ) : kind === "beta" ? (
          <View style={{ width: 12, height: 12, borderRadius: radius.full, backgroundColor: info.face }} />
        ) : (
          <Svg width={44} height={24} viewBox="0 0 44 24">
            <Polyline points="0,12 5,4 11,20 16,4 22,20 27,4 33,20 38,4 44,12" fill="none" stroke={warn.face} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
          </Svg>
        )}
      </Animated.View>
    </View>
  );
}
