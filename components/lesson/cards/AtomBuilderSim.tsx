/**
 * Atom builder: add and remove protons, neutrons and electrons and watch the atom's
 * element, isotope name, charge and stability update. A goal (see AtomBuilderData)
 * tells the card when it is complete.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import Svg, { Circle, G } from "react-native-svg";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { atomGoalMet, builderRows, describeAtom, goalChecklist, shellFilling, type ParticleKind } from "@/content/curriculum/elements";
import type { AtomBuilderData } from "@/content/curriculum/types";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme, withAlpha } from "@/theme";

import { duoShade, lipFor } from "../visual/duo-palette";
import { TermText, useCardStyles } from "./shared";
import { playSfx } from "@/services/sfx";

const GOLDEN = 2.39996;
const STAGE = 260;

const useStyles = createStyles((theme) => ({
  goalHead: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
  goalBlock: { gap: spacing.sm },
  stageWrap: { alignItems: "center" },
  tile: { position: "absolute", left: 0, top: 0, width: 58, paddingVertical: 6, borderRadius: 14, borderWidth: 2, borderBottomWidth: 4, alignItems: "center", backgroundColor: theme.colors.card, borderColor: theme.colors.borderStrong },
  tileNumber: { fontSize: 12, ...fontFaces.heavy, color: theme.colors.textMuted },
  tileSymbol: { fontSize: 26, lineHeight: 30, ...fontFaces.black, color: theme.colors.text },
  badge: { position: "absolute", right: 0, top: 0, minWidth: 44, height: 44, borderRadius: 22, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", borderWidth: 2, borderBottomWidth: 4 },
  badgeText: { fontSize: 18, ...fontFaces.black, color: theme.colors.text },
  badgeLabel: { fontSize: 9, ...fontFaces.heavy, letterSpacing: 0.5, textTransform: "uppercase", color: theme.colors.textMuted, marginTop: -2 },
  counter: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  goalRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: theme.colors.surfaceStrong },
  chipMet: { backgroundColor: theme.colors.successSurface },
  chipText: { ...fontFaces.bold, fontSize: fontSizes.xl, color: theme.colors.text },
  readout: { ...fontFaces.heavy, fontSize: fontSizes["6xl"], color: theme.colors.text, textAlign: "center" },
  facts: { ...fontFaces.semibold, fontSize: fontSizes.xl, color: theme.colors.textSecondary, textAlign: "center" },
  pill: { alignSelf: "center", paddingVertical: spacing.xs, paddingHorizontal: spacing.lg, borderRadius: radius.full, backgroundColor: theme.colors.surfaceStrong },
  pillStable: { backgroundColor: theme.colors.successSurface },
  pillUnstable: { backgroundColor: theme.colors.warningSurface },
  pillText: { ...fontFaces.heavy, fontSize: fontSizes["2xl"], color: theme.colors.text },
  swatch: { width: 32, height: 32, borderRadius: radius.full },
  counterText: { flex: 1, gap: 1 },
  counterLabel: { ...fontFaces.heavy, fontSize: fontSizes["2xl"], color: theme.colors.text },
  counterGoal: { ...fontFaces.semibold, fontSize: fontSizes.lg, color: theme.colors.textMuted },
  count: { ...fontFaces.black, minWidth: 44, textAlign: "center", fontSize: fontSizes["8xl"], color: theme.colors.text },
  countMet: { color: theme.colors.success },
  fixed: { ...fontFaces.semibold, fontSize: fontSizes.lg, color: theme.colors.textMuted, textAlign: "center" },
  done: { ...fontFaces.heavy, fontSize: fontSizes["3xl"], color: theme.colors.success, textAlign: "center" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  tip: { ...fontFaces.medium, flex: 1, fontSize: fontSizes.xl, lineHeight: 22, color: theme.colors.textSecondary },
  reset: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  resetText: { ...fontFaces.bold, fontSize: fontSizes.lg, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted },
}));

type Counts = { protons: number; neutrons: number; electrons: number };
type Kind = ParticleKind;

const NAMES: Record<Kind, { plural: string; singular: string }> = {
  protons: { plural: "Protons", singular: "proton" },
  neutrons: { plural: "Neutrons", singular: "neutron" },
  electrons: { plural: "Electrons", singular: "electron" },
};

export function AtomBuilderSim({ data, onComplete }: { data: AtomBuilderData; onComplete: () => void }) {
  const { theme } = useTheme();
  const card = useCardStyles(theme);
  const styles = useStyles(theme);
  const c = theme.colors;
  const maxProtons = data.maxProtons ?? 10;
  const maxNeutrons = data.maxNeutrons ?? 12;
  const initial: Counts = {
    protons: data.start?.protons ?? 0,
    neutrons: data.start?.neutrons ?? 0,
    electrons: data.start?.electrons ?? 0,
  };
  const [counts, setCounts] = useState<Counts>(initial);
  const completed = useRef(false);

  const description = useMemo(() => describeAtom(counts.protons, counts.neutrons, counts.electrons), [counts]);
  const met = atomGoalMet(data.goal, counts);
  const checklist = useMemo(() => goalChecklist(data.goal, counts), [data.goal, counts]);
  const rows = builderRows(data.goal, data.lock);

  useEffect(() => {
    if (met && !completed.current) {
      completed.current = true;
      onComplete();
    }
  }, [met, onComplete]);

  const limit = (kind: Kind) => (kind === "protons" ? maxProtons : kind === "neutrons" ? maxNeutrons : maxProtons + 2);
  const change = (kind: Kind, delta: number) => {
    if (Math.min(limit(kind), Math.max(0, counts[kind] + delta)) !== counts[kind]) void playSfx(delta > 0 ? "ui.select" : "ui.unequip");
    setCounts((prev) => ({ ...prev, [kind]: Math.min(limit(kind), Math.max(0, prev[kind] + delta)) }));
  };
  const changed = counts.protons !== initial.protons || counts.neutrons !== initial.neutrons || counts.electrons !== initial.electrons;

  const showStability = data.mode === "isotope" || data.mode === "stability";
  const title =
    description.element && description.protons > 0
      ? showStability || data.mode === "build"
        ? `${description.isotopeName}`
        : `${description.element.name} (${description.element.symbol})`
      : "Add a proton to begin";

  const swatch = {
    protons: duoShade("danger", theme.mode),
    neutrons: duoShade("neutral", theme.mode),
    electrons: duoShade("info", theme.mode),
  };
  // What cannot be changed on this card, said once instead of as a dead counter.
  const fixed = (["protons", "neutrons", "electrons"] as const).filter((k) => !rows.includes(k) && data.lock?.[k] && counts[k] > 0);
  const factBits = [rows.includes("neutrons") || data.lock?.neutrons ? `Mass number ${description.massNumber}` : null, rows.includes("electrons") ? `charge ${description.charge > 0 ? `+${description.charge}` : description.charge}` : null].filter(Boolean);

  const chargeText = description.charge > 0 ? `+${description.charge}` : `${description.charge}`;
  const chargeTone = description.charge === 0 ? c.success : c.warning;
  const summary = `${title}. ${counts.protons} protons, ${counts.neutrons} neutrons, ${counts.electrons} electrons. Mass number ${description.massNumber}.`;

  return (
    <View style={card.stack}>
      <Text style={card.sectionLabel}>Build it</Text>
      <TermText text={data.task} style={card.prompt} />

      {/* The goal as a checklist: each line ticks as it becomes true. */}
      <View style={styles.goalBlock}>
        <Text style={styles.goalHead}>Your goal</Text>
        <View style={styles.goalRow} accessibilityLiveRegion="polite">
          {checklist.map((part) => (
            <View key={part.key} style={[styles.chip, part.met && styles.chipMet]} accessible accessibilityLabel={`${part.label}, ${part.met ? "done" : "not yet"}`}>
              <Icon name={part.met ? "TickCircle" : "Record"} size={20} color={part.met ? c.success : c.textMuted} />
              <Text style={styles.chipText}>{part.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* The atom sits straight on the page, with its element tile and charge like the Build an Atom lab. */}
      <View style={styles.stageWrap} accessible accessibilityRole="image" accessibilityLabel={summary}>
        <View style={{ width: STAGE, height: STAGE }}>
          <AtomDrawing counts={counts} size={STAGE} />
          <View pointerEvents="none" style={styles.tile}>
            <Text style={styles.tileNumber}>{counts.protons || ""}</Text>
            <Text style={styles.tileSymbol}>{description.element?.symbol ?? "?"}</Text>
          </View>
          <View pointerEvents="none" style={[styles.badge, { backgroundColor: withAlpha(chargeTone, 0.16), borderColor: chargeTone }]}>
            <Text style={styles.badgeText}>{chargeText}</Text>
            <Text style={styles.badgeLabel}>charge</Text>
          </View>
        </View>
      </View>
      <View accessibilityLiveRegion="polite" style={{ gap: spacing.xs }}>
        <Text style={styles.readout}>{title}</Text>
        {factBits.length ? <Text style={styles.facts}>{factBits.join(" · ")}</Text> : null}
        {showStability && description.stable !== undefined ? (
          <View style={[styles.pill, description.stable ? styles.pillStable : styles.pillUnstable]}>
            <Text style={styles.pillText}>{description.stable ? "Stable" : "Unstable"}</Text>
          </View>
        ) : null}
      </View>

      <View>
      {rows.map((kind, i) => {
        const locked = !!data.lock?.[kind];
        const atMin = counts[kind] <= 0 || locked;
        const atMax = counts[kind] >= limit(kind) || locked;
        const target = data.goal[kind];
        const here = target !== undefined && counts[kind] === target;
        return (
          <View key={kind} style={[styles.counter, i > 0 && { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border }]}>
            <View style={[styles.swatch, { backgroundColor: swatch[kind].face, borderBottomWidth: 4, borderBottomColor: swatch[kind].lip }]} />
            <View style={styles.counterText}>
              <Text style={styles.counterLabel}>{NAMES[kind].plural}</Text>
              {target !== undefined ? <Text style={styles.counterGoal}>Goal: {target}</Text> : null}
            </View>
            <Button label="-" accessibilityLabel={`Remove a ${NAMES[kind].singular}`} variant="secondary" fullWidth={false} disabled={atMin} style={{ minWidth: 60 }} onPress={() => change(kind, -1)} />
            <Text style={[styles.count, here && styles.countMet]} accessibilityLabel={`${counts[kind]} ${NAMES[kind].plural.toLowerCase()}`}>
              {counts[kind]}
            </Text>
            <Button label="+" accessibilityLabel={`Add a ${NAMES[kind].singular}`} variant="secondary" fullWidth={false} disabled={atMax} style={{ minWidth: 60 }} onPress={() => change(kind, 1)} />
          </View>
        );
      })}
      </View>
      {fixed.length ? <Text style={styles.fixed}>These stay the same: {fixed.map((k) => `${counts[k]} ${counts[k] === 1 ? NAMES[k].singular : NAMES[k].plural.toLowerCase()}`).join(" · ")}</Text> : null}

      {met ? (
        <Text style={styles.done}>You built it!</Text>
      ) : data.hint ? (
        <View style={styles.tipRow}>
          <Icon name="Lamp" size={22} color={c.warning} />
          <Text style={styles.tip}>{data.hint}</Text>
        </View>
      ) : null}
      {changed && !met ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Start over" onPress={() => setCounts(initial)} style={styles.reset} hitSlop={8}>
          <Text style={styles.resetText}>Start over</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** The atom drawn on a 100-unit square: a packed nucleus and electrons on shells. */
function AtomDrawing({ counts, size }: { counts: Counts; size: number }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const nucleus = useMemo(() => {
    const total = counts.protons + counts.neutrons;
    const list: { x: number; y: number; proton: boolean }[] = [];
    for (let i = 0; i < total; i++) {
      // Spread protons evenly through the sequence so both kinds show in the packing.
      const proton = Math.floor(((i + 1) * counts.protons) / total) > Math.floor((i * counts.protons) / total);
      const r = 5.1 * Math.sqrt(i);
      const a = i * GOLDEN;
      list.push({ x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a), proton });
    }
    return list;
  }, [counts.protons, counts.neutrons]);

  const shells = shellFilling(counts.electrons);
  const radii = [31, 38, 44, 48];

  const proton = duoShade("danger", theme.mode);
  const neutron = duoShade("neutral", theme.mode);
  const electron = duoShade("info", theme.mode);
  // Every particle is a token: a lip circle drawn a little lower, then the face (see duo-palette).
  // Protons are flat: no lip under them.
  const token = (key: string, x: number, y: number, r: number, paint: { face: string; lip: string }, flat = false) => (
    <G key={key}>
      {flat ? null : <Circle cx={x} cy={y + lipFor(r)} r={r} fill={paint.lip} />}
      <Circle cx={x} cy={y} r={r} fill={paint.face} />
    </G>
  );

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {shells.map((_, i) => (
        <Circle key={`ring-${i}`} cx={50} cy={50} r={radii[i]} fill="none" stroke={c.borderStrong} strokeWidth={0.8} strokeDasharray="1.5 1.5" />
      ))}
      {shells.flatMap((count, shell) =>
        Array.from({ length: count }, (_, k) => {
          const a = (k / count) * Math.PI * 2 + shell * 0.7;
          return token(`e-${shell}-${k}`, 50 + radii[shell] * Math.cos(a), 50 + radii[shell] * Math.sin(a), 2.5, electron);
        }),
      )}
      {nucleus.map((p, i) => token(`n-${i}`, p.x, p.y, 4.2, p.proton ? proton : neutron, p.proton))}
    </Svg>
  );
}
