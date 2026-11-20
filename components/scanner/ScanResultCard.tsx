/**
 * The result of a scan: the name, one line, the elements as chips (each opens the periodic table), a fun fact, the
 * sources' names, and the actions ("See in AtomDex" when the target has an entry, "Add to Field Notes").
 * Composition says which elements are there, never how much.
 */

import { memo, useMemo } from "react";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useRouter } from "expo-router";

import { AddToNotesButton } from "@/components/phone/AddToNotesButton";
import { useCategoryColors } from "@/components/periodic-table/use-category-colors";
import { useOneShotClock } from "@/components/motion/motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { elementRoute } from "@/services/periodic-table";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, useTheme } from "@/theme";
import {
  SCAN,
  chipFrame,
  chipLabel,
  type ResultChip,
  type ScanResult,
} from "./scanner-core";

const CHIP_CLOCK_START = SCAN.chipsFrom * SCAN.ms;

const Chip = memo(function Chip({
  chip,
  index,
  count,
  clock,
  reduced,
  onPress,
}: {
  chip: ResultChip;
  index: number;
  count: number;
  clock: ReturnType<typeof useOneShotClock>;
  reduced: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const colors = useCategoryColors()[chip.category];
  const style = useAnimatedStyle(() => {
    const f = chipFrame(index, count, clock.value + CHIP_CLOCK_START, reduced);
    return {
      opacity: f.opacity,
      transform: [
        { translateY: (1 - f.fly) * 14 },
        { scale: 0.85 + 0.15 * f.fly },
      ],
    };
  });
  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel={chipLabel(chip)}
        style={({ pressed }) => [
          styles.chip,
          { backgroundColor: colors.fill, borderColor: colors.accent },
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.symbol, { color: colors.text }]}>
          {chip.symbol}
        </Text>
        <View style={styles.chipText}>
          <Text style={[styles.chipName, { color: colors.text }]}>
            {chip.name}
          </Text>
          {chip.note ? (
            <Text
              style={[styles.chipNote, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {chip.note}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
});

export function ScanResultCard({
  result,
  isNew,
  reduced,
}: {
  result: ScanResult;
  isNew: boolean;
  reduced: boolean;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const c = theme.colors;
  const router = useRouter();
  const clock = useOneShotClock(SCAN.ms - CHIP_CLOCK_START, true, reduced);

  return (
    <Card tone="neutral" padding={16} gap={14}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.name} accessibilityRole="header">
            {result.name}
          </Text>
          <Text style={styles.blurb}>{result.blurb}</Text>
        </View>
        {isNew ? (
          <View
            style={[
              styles.newTag,
              {
                backgroundColor: c.primarySurface,
                borderColor: c.primaryBorder,
              },
            ]}
          >
            <Text style={[styles.newText, { color: c.primaryDark }]}>
              New scan
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Made of</Text>
        <View style={styles.chips}>
          {result.chips.map((chip, i) => (
            <Chip
              key={chip.symbol}
              chip={chip}
              index={i}
              count={result.chips.length}
              clock={clock}
              reduced={reduced}
              onPress={() => {
                void playSfx("ui.select");
                router.push(elementRoute(chip.symbol));
              }}
            />
          ))}
        </View>
        <Text style={styles.hint}>
          Main elements first. Tap one to open it in the periodic table.
        </Text>
      </View>

      <View style={[styles.fact, { backgroundColor: c.surfaceSoft }]}>
        <Icon name="Lamp" size={20} color={c.warning} variant="Bold" />
        <Text style={styles.factText}>{result.funFact}</Text>
      </View>

      <View style={styles.actions}>
        {result.entryId ? (
          <Button
            label="See in AtomDex"
            variant="secondary"
            size="compact"
            fullWidth={false}
            onPress={() =>
              router.push(
                `/explorer/encyclopedia-entry?id=${encodeURIComponent(result.entryId as string)}`,
              )
            }
            renderIcon={(color) => (
              <Icon name="Book" size={16} color={color} variant="Bold" />
            )}
          />
        ) : null}
        <AddToNotesButton
          type="scan"
          sourceId={result.id}
          title={result.name}
          snippet={result.funFact}
        />
      </View>

      {result.sources.length ? (
        <Text style={styles.sources}>Sources: {result.sources.join("; ")}</Text>
      ) : null}
    </Card>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    head: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    headText: { flex: 1, gap: 2 },
    name: { fontSize: 22, lineHeight: 28, ...fontFaces.black, color: c.text },
    blurb: {
      fontSize: 15,
      lineHeight: 21,
      ...fontFaces.semibold,
      color: c.textSecondary,
    },
    newTag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 2,
    },
    newText: { fontSize: 12, lineHeight: 16, ...fontFaces.heavy },
    block: { gap: 8 },
    label: {
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      ...fontFaces.heavy,
      color: c.textMuted,
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minHeight: 48,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 2,
    },
    pressed: { opacity: 0.65 },
    symbol: {
      fontSize: 20,
      lineHeight: 26,
      minWidth: 28,
      textAlign: "center",
      ...fontFaces.black,
    },
    chipText: { maxWidth: 170 },
    chipName: { fontSize: 14, lineHeight: 18, ...fontFaces.heavy },
    chipNote: { fontSize: 12, lineHeight: 16, ...fontFaces.medium },
    hint: {
      fontSize: 12,
      lineHeight: 17,
      ...fontFaces.medium,
      color: c.textMuted,
    },
    fact: {
      flexDirection: "row",
      gap: 10,
      padding: 12,
      borderRadius: 14,
      alignItems: "flex-start",
    },
    factText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
      ...fontFaces.semibold,
      color: c.text,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-start",
      gap: 10,
    },
    sources: {
      fontSize: 12,
      lineHeight: 17,
      ...fontFaces.medium,
      color: c.textMuted,
    },
  };
});
