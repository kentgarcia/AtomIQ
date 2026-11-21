/**
 * Arrange-style interactions: order, match and sort. All are tap-driven (no drag
 * required), so they work with screen readers, switch access and small screens.
 *
 * They are graded the moment the last piece is placed (there is no Check button). A wrong attempt
 * is shown for a moment (what was wrong shakes red, the rest shows green), then the item resets
 * so the learner can try again in place (`rejection` + `useRejectFlash`); the run keeps the card
 * for the mistakes replay.
 */

import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

import { Card } from "@/components/ui/card";
import { seededShuffle, shuffleNotSame } from "@/content/curriculum/evaluate";
import type { MatchItemData, OrderItemData, SortItemData } from "@/content/curriculum/types";
import { Icon } from "@/components/ui/icon";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";
import { playSfx } from "@/services/sfx";

import { ObjectArt } from "@/components/lesson/visual/ObjectArt";
import { isArtId } from "@/components/lesson/visual/object-art";
import { duoShade } from "@/components/lesson/visual/duo-palette";
import { Shake } from "@/components/lesson/Shake";
import { FigureView, OptionButton, OptionRow, OptionsArea, PromptHeader, RetryNote, useCardStyles, useRejectFlash, type InteractionProps } from "./shared";

/** How long a wrong pair stays red and shaking before both cards go back to normal, ms. */
const MISS_MS = 700;

/** Pair colours, in order: the first pair is blue, the second green and so on. */
const PAIR_TONES = ["info", "success", "accent", "danger", "primary", "warning"] as const;

const useStyles = createStyles((theme) => ({
  columns: { flexDirection: "row", gap: spacing.md },
  column: { flex: 1, gap: spacing.sm },
  columnHead: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.6, textTransform: "uppercase", textAlign: "center", color: theme.colors.textMuted },
  columnHeadOn: { color: theme.colors.primaryLight },
  step: { ...fontFaces.bold, fontSize: fontSizes.xl, textAlign: "left", color: theme.colors.textSecondary },
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
  sortNote: { ...fontFaces.medium, fontSize: fontSizes.lg, lineHeight: 20, color: theme.colors.textSecondary },
  sortGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  sortCell: { flexBasis: "45%", flexGrow: 1 },
  sortCardHead: { alignItems: "center", gap: spacing.xs },
  bucketRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  legend: { gap: spacing.sm },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  legendTile: { width: 36, height: 36, borderRadius: radius.md, borderWidth: controls.border, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: "center", justifyContent: "center" },
  legendLabel: { ...fontFaces.semibold, flex: 1, fontSize: fontSizes.xl, lineHeight: 22, color: theme.colors.text },
  sortHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
}));

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------

/**
 * A sound for every press that builds an answer piece by piece (docs/features/SFX_SPEC.md §6.3), so changing
 * your mind sounds as often as choosing: `lesson.drop` for a piece put down or moved (`lesson.pair-ok`
 * for a right pair locking, `lesson.pick` for a match card picked up), `ui.unequip` for one taken back.
 * The press that completes the set plays nothing here: it is graded at once and the result cue plays
 * instead.
 */
const placedSfx = (completes: boolean, cue: "lesson.drop" | "lesson.pair-ok" = "lesson.drop") => {
  if (!completes) void playSfx(cue);
};

export function OrderItem({ data, seed, locked, onChange, ownerId, rejection }: InteractionProps<OrderItemData, { type: "order"; orderedIds: string[] }> & { ownerId: string }) {
  const { theme } = useTheme();
  const card = useCardStyles(theme);
  const styles = useStyles(theme);
  const pool = useMemo(() => shuffleNotSame(data.items, seed), [data.items, seed]);
  const [placed, setPlaced] = useState<string[]>([]);
  const flash = useRejectFlash(rejection, () => setPlaced([]));
  const frozen = locked || flash !== null;
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
      <PromptHeader ownerId={ownerId} text={data.prompt} hint="Tap in order" />
      {data.figure ? <FigureView figure={data.figure} /> : null}
      <OptionsArea>
      <View style={card.list}>
        {data.items.map((_, index) => {
          const id = placed[index];
          return id ? (
            <OptionRow
              key={`slot-${index}`}
              badge={String(index + 1)}
              label={label(id)}
              art={artOf(id)}
              state={frozen ? (correctAt(index) ? "correct" : "wrong") : "selected"}
              disabled={frozen}
              accessibilityHint="Removes this item"
              onPress={() => {
                void playSfx("ui.unequip");
                setPlaced((p) => p.filter((x) => x !== id));
              }}
            />
          ) : (
            <View key={`slot-${index}`} style={styles.slot} accessible accessibilityLabel={`Position ${index + 1}, empty`}>
              <Text style={styles.slotText}>{index + 1}</Text>
            </View>
          );
        })}
      </View>
      {!locked && remaining.length > 0 ? (
        <View style={card.list}>
          <Text style={card.sectionLabel}>Items</Text>
          {remaining.map((i) => (
            <OptionRow key={i.id} label={i.label} art={i.art} onPress={() => {
              placedSfx(placed.length + 1 >= data.items.length);
              setPlaced((p) => [...p, i.id]);
            }} accessibilityHint="Adds to the next position" />
          ))}
        </View>
      ) : null}
      {flash ? <RetryNote /> : null}
      {locked && placed.some((_, i) => !correctAt(i)) ? (
        <Text style={styles.correctLine}>Correct order: {data.items.map((i) => i.label).join(", ")}</Text>
      ) : null}
      </OptionsArea>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Match
// ---------------------------------------------------------------------------

export function MatchItem({ data, seed, locked, onChange, ownerId, onMiss }: InteractionProps<MatchItemData, { type: "match"; matches: Record<string, string> }> & { ownerId: string }) {
  const { theme } = useTheme();
  const card = useCardStyles(theme);
  const styles = useStyles(theme);
  const rights = useMemo(() => seededShuffle(data.pairs, seed), [data.pairs, seed]);
  // `matches` holds only right pairs: each one is checked the moment it is made.
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  // A wrong pair, shown shaking and red for a moment, then both cards go back to normal
  const [miss, setMiss] = useState<{ left: string; right: string } | null>(null);
  useEffect(() => {
    if (!miss) return;
    const timer = setTimeout(() => setMiss(null), MISS_MS);
    return () => clearTimeout(timer);
  }, [miss]);
  const frozen = locked || miss !== null;

  useEffect(() => {
    onChange(Object.keys(matches).length === data.pairs.length ? { type: "match", matches } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  const matched = Object.keys(matches).length;

  const pressLeft = (leftId: string) => {
    if (frozen || matches[leftId]) return;
    void playSfx("lesson.pick");
    setSelected(leftId === selected ? null : leftId);
  };
  const pressRight = (rightId: string) => {
    if (frozen || !selected || Object.values(matches).includes(rightId)) return;
    // A pair's two cards share its id, so a right match is the same id
    if (selected === rightId) {
      placedSfx(Object.keys(matches).length + 1 >= data.pairs.length, "lesson.pair-ok");
      setMatches((m) => ({ ...m, [selected]: rightId }));
    } else {
      setMiss({ left: selected, right: rightId });
      onMiss?.();
    }
    setSelected(null);
  };

  // Every left card has its own colour and number; a right card that is matched to it wears the same.
  const markOf = (leftId: string) => {
    const index = data.pairs.findIndex((p) => p.id === leftId);
    return { color: duoShade(PAIR_TONES[index % PAIR_TONES.length], theme.mode).face, label: String(index + 1) };
  };
  const stepText = frozen ? null : selected ? "Tap its match" : "Tap a card to start";
  const rightActive = !frozen && !!selected;

  return (
    <View style={card.stack}>
      <PromptHeader ownerId={ownerId} text={data.prompt} hint="Match the pairs" />
      {data.figure ? <FigureView figure={data.figure} /> : null}
      <OptionsArea>
        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={[styles.columnHead, !frozen && !selected && matched < data.pairs.length && styles.columnHeadOn]}>1 · Pick one</Text>
            {data.pairs.map((p) => (
              <OptionRow
                key={p.id}
                label={p.left}
                mark={markOf(p.id)}
                state={matches[p.id] ? "correct" : miss?.left === p.id ? "wrong" : selected === p.id ? "selected" : "idle"}
                disabled={frozen || !!matches[p.id]}
                accessibilityHint="Pick, then tap its match"
                onPress={() => pressLeft(p.id)}
              />
            ))}
          </View>
          <View style={styles.column}>
            <Text style={[styles.columnHead, rightActive && styles.columnHeadOn]}>2 · Match it</Text>
            {rights.map((p) => {
              const owner = Object.entries(matches).find(([, r]) => r === p.id)?.[0];
              return (
                <OptionRow
                  key={p.id}
                  label={p.right}
                  mark={owner ? markOf(owner) : undefined}
                  state={owner ? "correct" : miss?.right === p.id ? "wrong" : rightActive ? "idle" : "dim"}
                  disabled={frozen || !!owner || !selected}
                  accessibilityHint="Match with the card you picked"
                  onPress={() => pressRight(p.id)}
                />
              );
            })}
          </View>
        </View>
        {stepText ? <Text style={styles.step}>{stepText}</Text> : null}
      </OptionsArea>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

/** Icons for groups that carry none (content authored before group icons), by position. */
const FALLBACK_BUCKET_ICONS = ["Record", "Category", "Star1"] as const;

/**
 * Sort is checked item by item, like a match: the moment an item is put in a group it is graded. A right one locks green (the card and the
 * group button it was put in); a wrong one shakes red for a moment and goes back to waiting, and `onMiss` tells the run, so the card comes
 * back in the mistakes replay. When the last item is placed (every placement is right by then) the card is complete.
 */
export function SortItem({ data, seed, locked, onChange, ownerId, onMiss }: InteractionProps<SortItemData, { type: "sort"; placements: Record<string, string> }> & { ownerId: string }) {
  const { theme } = useTheme();
  const card = useCardStyles(theme);
  const styles = useStyles(theme);
  const items = useMemo(() => seededShuffle(data.items, seed), [data.items, seed]);
  // `placements` holds only right placements: each one is checked the moment it is made
  const [placements, setPlacements] = useState<Record<string, string>>({});
  // A wrong placement, shown red and shaking for a moment, then the item goes back to normal
  const [miss, setMiss] = useState<{ itemId: string; bucketId: string } | null>(null);
  useEffect(() => {
    if (!miss) return;
    const timer = setTimeout(() => setMiss(null), MISS_MS);
    return () => clearTimeout(timer);
  }, [miss]);
  const frozen = locked || miss !== null;
  const pictured = data.items.length > 0 && data.items.every((i) => isArtId(i.art));
  const buckets = data.buckets.map((b, i) => ({ ...b, icon: b.icon ?? FALLBACK_BUCKET_ICONS[i % FALLBACK_BUCKET_ICONS.length] }));

  useEffect(() => {
    onChange(Object.keys(placements).length === data.items.length ? { type: "sort", placements } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placements]);

  return (
    <View style={card.stack}>
      <PromptHeader ownerId={ownerId} text={data.prompt} hint="Sort into groups" />
      {data.figure ? <FigureView figure={data.figure} /> : null}
      <OptionsArea>
        {/* The legend: which icon is which group. The buttons below carry only the icons. */}
        <View style={styles.legend} accessibilityRole="summary">
          {buckets.map((b) => (
            <View key={b.id} style={styles.legendItem}>
              <View style={styles.legendTile}>
                <Icon name={b.icon} size={20} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.legendLabel}>{b.label}</Text>
            </View>
          ))}
        </View>
        <View style={pictured ? styles.sortGrid : card.list}>
          {items.map((item) => {
            const chosen = placements[item.id];
            const placed = chosen !== undefined;
            const missed = miss?.itemId === item.id ? miss.bucketId : null;
            const tone = placed ? "success" : missed ? "error" : "neutral";
            const pick = (bucketId: string) => {
              if (frozen || placed) return;
              if (bucketId === item.bucket) {
                // The press that completes the set plays nothing here: it is graded at once and the result cue plays instead
                placedSfx(Object.keys(placements).length + 1 >= data.items.length, "lesson.pair-ok");
                setPlacements((p) => ({ ...p, [item.id]: bucketId }));
              } else {
                setMiss({ itemId: item.id, bucketId });
                onMiss?.();
              }
            };
            return (
              <View key={item.id} style={pictured ? styles.sortCell : undefined}>
                <Shake active={missed !== null} style={pictured ? { flex: 1 } : undefined}>
                  <Card tone={tone} gap={spacing.sm} faceStyle={pictured ? { flex: 1 } : undefined} style={pictured ? { flex: 1 } : undefined}>
                    {pictured ? (
                      // Two columns: the picture over its label, the group buttons underneath.
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
                    <View style={styles.bucketRow}>
                      {buckets.map((b) => (
                        <OptionButton
                          key={b.id}
                          label={b.label}
                          icon={b.icon}
                          iconOnly
                          state={placed ? (chosen === b.id ? "correct" : "dim") : missed === b.id ? "wrong" : "idle"}
                          disabled={frozen || placed}
                          onPress={() => pick(b.id)}
                        />
                      ))}
                    </View>
                  </Card>
                </Shake>
              </View>
            );
          })}
        </View>
      </OptionsArea>
    </View>
  );
}
