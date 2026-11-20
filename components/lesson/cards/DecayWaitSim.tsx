/**
 * Decay wait: a grid of unstable nuclei and a Wait button (docs/features/UNIT_2_RADIOACTIVITY_SPEC.md §8).
 * Single mode is genuinely random; half-life mode is guided random. The count is always shown as
 * text as well as in the grid, and the card is complete after the goal number of presses.
 * Tap-only, static drawing (no animated SVG), so reduced motion needs nothing special.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import { Text } from "@/components/ui/text";
import Svg, { Circle, G } from "react-native-svg";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { countText, createDecayWait, goalMet, press, pressText, remaining } from "@/content/curriculum/decay-wait-core";
import type { DecayWaitData } from "@/content/curriculum/types";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme } from "@/theme";

import { duoShade, lipFor } from "../visual/duo-palette";
import { TermText, useCardStyles } from "./shared";

const useStyles = createStyles((theme) => ({
  goalHead: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
  goalRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: theme.colors.surfaceStrong },
  chipMet: { backgroundColor: theme.colors.successSurface },
  chipText: { ...fontFaces.bold, fontSize: fontSizes.xl, color: theme.colors.text },
  count: { ...fontFaces.heavy, fontSize: fontSizes["5xl"], lineHeight: 36, color: theme.colors.text, textAlign: "center" },
  said: { ...fontFaces.semibold, fontSize: fontSizes.xl, lineHeight: 22, color: theme.colors.textSecondary, textAlign: "center" },
  key: { flexDirection: "row", justifyContent: "center", gap: spacing.lg },
  keyItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  keyText: { ...fontFaces.medium, fontSize: fontSizes.lg, color: theme.colors.textSecondary },
  done: { ...fontFaces.heavy, fontSize: fontSizes["3xl"], color: theme.colors.success, textAlign: "center" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  tip: { ...fontFaces.medium, flex: 1, fontSize: fontSizes.xl, lineHeight: 22, color: theme.colors.textSecondary },
  reset: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  resetText: { ...fontFaces.bold, fontSize: fontSizes.lg, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
}));

/** A fresh seed per card entry (not the card id), so a replay differs. */
const freshSeed = () => Math.floor(Math.random() * 2 ** 31);

export function DecayWaitSim({ data, onComplete }: { data: DecayWaitData; onComplete: () => void }) {
  const { theme } = useTheme();
  const card = useCardStyles(theme);
  const styles = useStyles(theme);
  const c = theme.colors;
  const [state, setState] = useState(() => createDecayWait({ mode: data.mode, count: data.count, seed: freshSeed() }));
  const [width, setWidth] = useState(0);
  const completed = useRef(false);

  const met = goalMet(state, data.goal);
  const left = remaining(state);
  useEffect(() => {
    if (met && !completed.current) {
      completed.current = true;
      onComplete();
    }
  }, [met, onComplete]);

  const cols = data.count <= 20 ? 5 : 10;
  const rows = Math.ceil(data.count / cols);
  const cell = width > 0 ? Math.min(width / cols, data.count <= 20 ? 52 : 34) : 0;
  const gridW = cell * cols;
  const gridH = cell * rows;
  const unstable = duoShade("warning", theme.mode);
  const changed = duoShade("neutral", theme.mode);
  const fresh = useMemo(() => new Set(state.lastChanged), [state.lastChanged]);

  const label = data.mode === "half-life" ? "Wait one half-life" : "Wait...";
  const summary = `${countText(state)}.`;
  const reset = () => {
    completed.current = false;
    setState(createDecayWait({ mode: data.mode, count: data.count, seed: freshSeed() }));
  };

  return (
    <View style={card.stack}>
      <Text style={card.sectionLabel}>{data.mode === "half-life" ? "Watch a group" : "Watch and wait"}</Text>
      <TermText text={data.task} style={card.prompt} />

      <Card tone="soft" padding={spacing.md} gap={spacing.sm}>
        <Text style={styles.goalHead}>Your goal</Text>
        <View style={styles.goalRow} accessibilityLiveRegion="polite">
          <View style={[styles.chip, met && styles.chipMet]} accessible accessibilityLabel={`${data.goal.presses} presses, ${state.presses} done${met ? ", complete" : ""}`}>
            <Icon name={met ? "TickCircle" : "Record"} size={20} color={met ? c.success : c.textMuted} />
            <Text style={styles.chipText}>Press Wait {data.goal.presses} times ({Math.min(state.presses, data.goal.presses)}/{data.goal.presses})</Text>
          </View>
        </View>
      </Card>

      <View accessible accessibilityRole="image" accessibilityLabel={summary} onLayout={(e: LayoutChangeEvent) => setWidth(Math.floor(e.nativeEvent.layout.width))}>
        <Card tone="soft" padding={spacing.sm} faceStyle={{ alignItems: "center" }}>
          {width > 0 ? (
            <Svg width={gridW} height={gridH} viewBox={`0 0 ${gridW} ${gridH}`}>
              {state.alive.map((alive, i) => {
                const cx = (i % cols) * cell + cell / 2;
                const cy = Math.floor(i / cols) * cell + cell / 2;
                const r = cell * 0.36;
                const paint = alive ? unstable : changed;
                const lip = lipFor(r / 2.2);
                return (
                  <G key={i}>
                    <Circle cx={cx} cy={cy + lip} r={r} fill={paint.lip} />
                    <Circle cx={cx} cy={cy} r={r} fill={paint.face} fillOpacity={alive ? 1 : 0.45} stroke={fresh.has(i) ? duoShade("danger", theme.mode).face : "none"} strokeWidth={fresh.has(i) ? 2 : 0} />
                  </G>
                );
              })}
            </Svg>
          ) : (
            <View style={{ height: 120 }} />
          )}
        </Card>
      </View>

      <View style={styles.key} accessible={false}>
        <View style={styles.keyItem}>
          <View style={{ width: 14, height: 14, borderRadius: radius.full, backgroundColor: unstable.face }} />
          <Text style={styles.keyText}>Not changed yet</Text>
        </View>
        <View style={styles.keyItem}>
          <View style={{ width: 14, height: 14, borderRadius: radius.full, backgroundColor: changed.face, opacity: 0.45 }} />
          <Text style={styles.keyText}>Changed</Text>
        </View>
      </View>

      <View accessibilityLiveRegion="polite" style={{ gap: spacing.xs }}>
        <Text style={styles.count}>{countText(state)}</Text>
        <Text style={styles.said}>{pressText(state)}</Text>
      </View>

      <Button label={label} accessibilityLabel={`${label}. ${left} nuclei have not changed yet.`} disabled={left === 0} onPress={() => setState((s) => press(s))} />

      {met ? (
        <Text style={styles.done}>You watched it!</Text>
      ) : data.hint ? (
        <View style={styles.tipRow}>
          <Icon name="Lamp" size={22} color={c.warning} />
          <Text style={styles.tip}>{data.hint}</Text>
        </View>
      ) : null}
      {state.presses > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Start over with a new group" onPress={reset} style={styles.reset} hitSlop={8}>
          <Text style={styles.resetText}>Start over</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
