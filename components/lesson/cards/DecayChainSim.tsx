/**
 * Decay chain: tap the unstable nucleus and it changes into the next one, until a stable
 * nucleus ends the chain (docs/features/UNIT_2_RADIOACTIVITY_SPEC.md §8). Generic labels only.
 * The nucleus is itself the button; there is also a text control, so it is tap-only with a text
 * equivalent. Static drawing: nothing animates.
 */

import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { FINISHED, createChain, currentNode, goalMet, step } from "@/content/curriculum/decay-chain-core";
import type { DecayChainData } from "@/content/curriculum/types";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme } from "@/theme";

import { NucleusArt } from "./NucleusArt";
import { TermText, useCardStyles } from "./shared";
import { playSfx } from "@/services/sfx";

const useStyles = createStyles((theme) => ({
  goalHead: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
  chip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: theme.colors.surfaceStrong },
  chipMet: { backgroundColor: theme.colors.successSurface },
  chipText: { ...fontFaces.bold, fontSize: fontSizes.xl, color: theme.colors.text },
  name: { ...fontFaces.heavy, fontSize: fontSizes["6xl"], color: theme.colors.text, textAlign: "center" },
  pill: { alignSelf: "center", paddingVertical: spacing.xs, paddingHorizontal: spacing.lg, borderRadius: radius.full, backgroundColor: theme.colors.surfaceStrong },
  pillStable: { backgroundColor: theme.colors.successSurface },
  pillUnstable: { backgroundColor: theme.colors.warningSurface },
  pillText: { ...fontFaces.heavy, fontSize: fontSizes["2xl"], color: theme.colors.text },
  message: { ...fontFaces.bold, fontSize: fontSizes["3xl"], lineHeight: 28, color: theme.colors.text, textAlign: "center", minHeight: 30 },
  messageDone: { color: theme.colors.success },
  steps: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
  step: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: theme.colors.surfaceStrong, borderWidth: 2, borderColor: "transparent" },
  stepSeen: { backgroundColor: theme.colors.primarySurface, borderColor: theme.colors.primaryBorder },
  stepNow: { borderColor: theme.colors.primary },
  stepText: { ...fontFaces.semibold, fontSize: fontSizes.lg, color: theme.colors.textSecondary },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  tip: { ...fontFaces.medium, flex: 1, fontSize: fontSizes.xl, lineHeight: 22, color: theme.colors.textSecondary },
  reset: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  resetText: { ...fontFaces.bold, fontSize: fontSizes.lg, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
}));

export function DecayChainSim({ data, onComplete }: { data: DecayChainData; onComplete: () => void }) {
  const { theme } = useTheme();
  const card = useCardStyles(theme);
  const styles = useStyles(theme);
  const c = theme.colors;
  const [state, setState] = useState(createChain);
  const completed = useRef(false);

  const here = currentNode(data.nodes, state);
  const met = goalMet(data.nodes, state, data.goal);
  const stable = here.state === "stable";
  const goalNode = data.nodes.find((n) => n.id === data.goal.reach);

  useEffect(() => {
    if (met && !completed.current) {
      completed.current = true;
      onComplete();
    }
  }, [met, onComplete]);

  // The nucleus shrinks a little with every decay.
  const total = Math.max(8, 20 - 2 * state.index);
  const protons = Math.round(total * 0.45);
  const summary = `${here.label}. ${stable ? "Stable." : "Unstable. Tap to make it change."}`;
  const tap = () => {
    // A little pop for each decay, a step higher than the last (docs/features/SFX_SPEC.md §6.3).
    void playSfx("reward.pop", { index: state.index, volume: 0.8 });
    setState((s) => step(data.nodes, s));
  };
  const reset = () => {
    completed.current = false;
    setState(createChain());
  };

  return (
    <View style={card.stack}>
      <Text style={card.sectionLabel}>Follow the chain</Text>
      <TermText text={data.task} style={card.prompt} />

      <Card tone="soft" padding={spacing.md} gap={spacing.sm}>
        <Text style={styles.goalHead}>Your goal</Text>
        <View style={[styles.chip, met && styles.chipMet]} accessible accessibilityLabel={`Reach ${goalNode?.label ?? "the end"}, ${met ? "done" : "not yet"}`} accessibilityLiveRegion="polite">
          <Icon name={met ? "TickCircle" : "Record"} size={20} color={met ? c.success : c.textMuted} />
          <Text style={styles.chipText}>Reach {goalNode?.label ?? "the end"}</Text>
        </View>
      </Card>

      <Pressable accessibilityRole="button" accessibilityLabel={summary} accessibilityState={{ disabled: stable }} disabled={stable} onPress={tap}>
        <Card tone={stable ? "success" : "soft"} padding={spacing.md} gap={spacing.sm} faceStyle={{ alignItems: "center" }}>
          <NucleusArt protons={protons} neutrons={total - protons} size={190} ring={stable ? "success" : "warning"} />
          <Text style={styles.name}>{here.label}</Text>
          <View style={[styles.pill, stable ? styles.pillStable : styles.pillUnstable]}>
            <Text style={styles.pillText}>{stable ? "Stable" : "Unstable"}</Text>
          </View>
        </Card>
      </Pressable>

      <View accessibilityLiveRegion="polite">
        <Text style={[styles.message, state.message === FINISHED && styles.messageDone]}>{state.message || (stable ? "" : "Tap the nucleus.")}</Text>
      </View>

      <View style={styles.steps} accessible={false}>
        {data.nodes.map((n, i) => (
          <View key={n.id} style={[styles.step, i <= state.index && styles.stepSeen, i === state.index && styles.stepNow]}>
            <Text style={styles.stepText}>{n.label}</Text>
          </View>
        ))}
      </View>

      {!stable ? <Button label="Let it change" accessibilityLabel={`Let ${here.label} change`} onPress={tap} /> : null}

      {met ? null : data.hint ? (
        <View style={styles.tipRow}>
          <Icon name="Lamp" size={22} color={c.warning} />
          <Text style={styles.tip}>{data.hint}</Text>
        </View>
      ) : null}
      {state.index > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Start the chain again" onPress={reset} style={styles.reset} hitSlop={8}>
          <Text style={styles.resetText}>Start over</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
