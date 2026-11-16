/**
 * Arrange-style interactions: order, match and sort. All are tap-driven (no drag
 * required), so they work with screen readers, switch access and small screens.
 */

import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { seededShuffle, shuffleNotSame } from "@/content/curriculum/evaluate";
import type { MatchItemData, OrderItemData, SortItemData } from "@/content/curriculum/types";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

import { ObjectArt } from "@/components/lesson/visual/ObjectArt";
import { isArtId } from "@/components/lesson/visual/object-art";
import { duoShade } from "@/components/lesson/visual/duo-palette";
import { FigureView, OptionRow, PromptHeader, useCardStyles, type InteractionProps } from "./shared";

/** Pair colours, in order: the first pair is blue, the second green and so on. */
const PAIR_TONES = ["info", "success", "accent", "danger", "primary", "warning"] as const;

const useStyles = createStyles((theme) => ({
  columns: { flexDirection: "row", gap: spacing.md },
  column: { flex: 1, gap: spacing.sm },
  columnHead: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.6, textTransform: "uppercase", textAlign: "center", color: theme.colors.textMuted },
  columnHeadOn: { color: theme.colors.primaryLight },
  step: { ...fontFaces.bold, fontSize: fontSizes.xl, textAlign: "center", color: theme.colors.textSecondary },
  slot: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  slotText: { ...fontFaces.medium, fontSize: fontSizes.lg, color: theme.colors.textMuted },
  correctLine: { ...fontFaces.semibold, fontSize: fontSizes.lg, color: theme.colors.textSecondary },
  sortGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  sortCell: { flexBasis: "45%", flexGrow: 1 },
  sortCardHead: { alignItems: "center", gap: spacing.xs },
  bucketStack: { gap: spacing.xs, marginTop: spacing.xs },
  sortHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
}));

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------

export function OrderItem({ data, seed, locked, onChange, ownerId }: InteractionProps<OrderItemData, { type: "order"; orderedIds: string[] }> & { ownerId: string }) {
  const { theme } = useTheme();
  const card = useCardStyles(theme);
  const styles = useStyles(theme);
  const pool = useMemo(() => shuffleNotSame(data.items, seed), [data.items, seed]);
  const [placed, setPlaced] = useState<string[]>([]);
  const label = (id: string) => data.items.find((i) => i.id === id)?.label ?? id;
  const artOf = (id: string) => data.items.find((i) => i.id === id)?.art;

  useEffect(() => {
    onChange(placed.length === data.items.length ? { type: "order", orderedIds: placed } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed]);

  const remaining = pool.filter((i) => !placed.includes(i.id));
  const correctAt = (index: number) => data.items[index]?.id === placed[index];

  return (
    <View style={card.stack}>
      <PromptHeader ownerId={ownerId} text={data.prompt} hint="Tap the items in order. Tap a placed item to take it back." />
      {data.figure ? <FigureView figure={data.figure} /> : null}
      <View style={card.stack}>
        {data.items.map((_, index) => {
          const id = placed[index];
          return id ? (
            <OptionRow
              key={`slot-${index}`}
              badge={String(index + 1)}
              label={label(id)}
              art={artOf(id)}
              state={locked ? (correctAt(index) ? "correct" : "wrong") : "selected"}
              disabled={locked}
              accessibilityHint="Removes this item"
              onPress={() => setPlaced((p) => p.filter((x) => x !== id))}
            />
          ) : (
            <View key={`slot-${index}`} style={styles.slot} accessible accessibilityLabel={`Position ${index + 1}, empty`}>
              <Text style={styles.slotText}>{index + 1}</Text>
            </View>
          );
        })}
      </View>
      {!locked && remaining.length > 0 ? (
        <View style={card.stack}>
          <Text style={card.sectionLabel}>Items</Text>
          {remaining.map((i) => (
            <OptionRow key={i.id} label={i.label} art={i.art} onPress={() => setPlaced((p) => [...p, i.id])} accessibilityHint="Adds to the next position" />
          ))}
        </View>
      ) : null}
      {locked && placed.some((_, i) => !correctAt(i)) ? (
        <Text style={styles.correctLine}>Correct order: {data.items.map((i) => i.label).join(", ")}</Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Match
// ---------------------------------------------------------------------------

export function MatchItem({ data, seed, locked, result, onChange, ownerId }: InteractionProps<MatchItemData, { type: "match"; matches: Record<string, string> }> & { ownerId: string }) {
  const { theme } = useTheme();
  const card = useCardStyles(theme);
  const styles = useStyles(theme);
  const rights = useMemo(() => seededShuffle(data.pairs, seed), [data.pairs, seed]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    onChange(Object.keys(matches).length === data.pairs.length ? { type: "match", matches } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  const pairedRight = (rightId: string) => Object.entries(matches).find(([, r]) => r === rightId)?.[0];
  const wrong = new Set(result?.wrongIds ?? []);
  const matched = Object.keys(matches).length;

  const pressLeft = (leftId: string) => {
    if (locked) return;
    if (matches[leftId]) {
      setMatches((m) => {
        const { [leftId]: _removed, ...rest } = m;
        return rest;
      });
      setSelected(null);
    } else setSelected(leftId === selected ? null : leftId);
  };
  const pressRight = (rightId: string) => {
    if (locked) return;
    const owner = pairedRight(rightId);
    if (owner) {
      setMatches((m) => {
        const { [owner]: _removed, ...rest } = m;
        return rest;
      });
      return;
    }
    if (selected) {
      setMatches((m) => ({ ...m, [selected]: rightId }));
      setSelected(null);
    }
  };

  // Every left card has its own colour and number; a right card that is matched to it wears the same.
  const markOf = (leftId: string, outlined: boolean) => {
    const index = data.pairs.findIndex((p) => p.id === leftId);
    return { color: duoShade(PAIR_TONES[index % PAIR_TONES.length], theme.mode).face, label: String(index + 1), outlined };
  };
  const stepText = locked ? null : selected ? "Now tap its match on the right" : matched < data.pairs.length ? "Tap a card on the left to start" : "All matched. Check your answer";
  const rightActive = !locked && !!selected;

  return (
    <View style={card.stack}>
      <PromptHeader ownerId={ownerId} text={data.prompt} hint="Match each card on the left with one on the right." />
      {data.figure ? <FigureView figure={data.figure} /> : null}
      <View style={styles.columns}>
        <View style={styles.column}>
          <Text style={[styles.columnHead, !locked && !selected && matched < data.pairs.length && styles.columnHeadOn]}>1 · Pick one</Text>
          {data.pairs.map((p) => (
            <OptionRow
              key={p.id}
              label={p.left}
              mark={markOf(p.id, !!matches[p.id] || selected === p.id)}
              state={locked ? (wrong.has(p.id) ? "wrong" : "correct") : selected === p.id ? "selected" : "idle"}
              disabled={locked}
              accessibilityHint={matches[p.id] ? "Undo this match" : "Pick, then tap its match"}
              onPress={() => pressLeft(p.id)}
            />
          ))}
        </View>
        <View style={styles.column}>
          <Text style={[styles.columnHead, rightActive && styles.columnHeadOn]}>2 · Match it</Text>
          {rights.map((p) => {
            const owner = pairedRight(p.id);
            return (
              <OptionRow
                key={p.id}
                label={p.right}
                mark={owner ? markOf(owner, true) : undefined}
                state={locked ? (owner && wrong.has(owner) ? "wrong" : "correct") : owner ? "idle" : rightActive ? "idle" : "dim"}
                disabled={locked || (!owner && !selected)}
                accessibilityHint={owner ? "Undo this match" : "Match with the card you picked"}
                onPress={() => pressRight(p.id)}
              />
            );
          })}
        </View>
      </View>
      {stepText ? <Text style={styles.step}>{stepText}</Text> : null}
      {locked && wrong.size > 0 ? (
        <Text style={styles.correctLine}>
          {data.pairs.filter((p) => wrong.has(p.id)).map((p) => `${p.left}: ${p.right}`).join("  ·  ")}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

export function SortItem({ data, seed, locked, result, onChange, ownerId }: InteractionProps<SortItemData, { type: "sort"; placements: Record<string, string> }> & { ownerId: string }) {
  const { theme } = useTheme();
  const card = useCardStyles(theme);
  const styles = useStyles(theme);
  const items = useMemo(() => seededShuffle(data.items, seed), [data.items, seed]);
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const wrong = new Set(result?.wrongIds ?? []);
  const pictured = data.items.length > 0 && data.items.every((i) => isArtId(i.art));

  useEffect(() => {
    onChange(Object.keys(placements).length === data.items.length ? { type: "sort", placements } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placements]);

  return (
    <View style={card.stack}>
      <PromptHeader ownerId={ownerId} text={data.prompt} hint="Choose a group for each one." />
      {data.figure ? <FigureView figure={data.figure} /> : null}
      <View style={pictured ? styles.sortGrid : card.stack}>
        {items.map((item) => {
          const chosen = placements[item.id];
          const bad = locked && wrong.has(item.id);
          const tone = locked ? (bad ? "error" : "success") : chosen ? "primary" : "neutral";
          const pick = (bucketId: string) => (locked ? undefined : setPlacements((p) => ({ ...p, [item.id]: bucketId })));
          return (
            <View key={item.id} style={pictured ? styles.sortCell : undefined}>
              <Card tone={tone} gap={spacing.sm} faceStyle={pictured ? { flex: 1 } : undefined} style={pictured ? { flex: 1 } : undefined}>
                {pictured ? (
                  // Two columns: the picture over its label, the groups stacked underneath.
                  <View style={styles.sortCardHead}>
                    {isArtId(item.art) ? <ObjectArt id={item.art} size={64} /> : null}
                    <Text style={[card.optionLabel, { textAlign: "center" }]}>{item.label}</Text>
                  </View>
                ) : (
                  <View style={styles.sortHead}>
                    {isArtId(item.art) ? <ObjectArt id={item.art} size={52} /> : null}
                    <Text style={[card.optionLabel, { flex: 1 }]}>{item.label}</Text>
                  </View>
                )}
                <View style={pictured ? styles.bucketStack : styles.chipRow}>
                  {data.buckets.map((b) => (
                    <Button
                      key={b.id}
                      label={b.label}
                      size="compact"
                      fullWidth={pictured}
                      wrap={pictured}
                      variant={chosen === b.id ? "primary" : "secondary"}
                      onPress={() => pick(b.id)}
                    />
                  ))}
                </View>
                {bad ? <Text style={card.optionNote}>Belongs in: {data.buckets.find((b) => b.id === item.bucket)?.label}</Text> : null}
              </Card>
            </View>
          );
        })}
      </View>
    </View>
  );
}
