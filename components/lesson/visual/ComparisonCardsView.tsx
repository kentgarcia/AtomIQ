import { memo, useMemo } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { FadeInDown } from "react-native-reanimated";

import { barFraction } from "@/content/visual-blocks";
import type { ComparisonCardsBlock } from "@/content/types";
import { createStyles, useTheme } from "@/theme";

import { toneColor } from "./colors";
import type { VisualLayout } from "./useVisualLayout";

const GAP = 10;

const makeStyles = createStyles((theme) => ({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  card: {
    backgroundColor: theme.colors.surfaceSoft,
    borderColor: theme.colors.borderStrong,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  label: {
    color: theme.colors.text,
    ...theme.fontFaces.bold,
    fontSize: 15,
    lineHeight: 21,
  },
  value: {
    color: theme.colors.text,
    ...theme.fontFaces.heavy,
    fontSize: 18,
    lineHeight: 24,
  },
  detail: {
    color: theme.colors.textSecondary,
    ...theme.fontFaces.book,
    fontSize: 13,
    lineHeight: 18,
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.text,
    borderWidth: 1,
    overflow: "hidden",
  },
  note: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textSecondary,
    ...theme.fontFaces.medium,
    fontSize: 12,
    lineHeight: 17,
  },
}));

/** Side-by-side cards; optional proportional bars on a log or linear scale. */
export const ComparisonCardsView = memo(function ComparisonCardsView({
  block,
  layout,
  reducedMotion,
}: {
  block: ComparisonCardsBlock;
  layout: VisualLayout;
  reducedMotion: boolean;
}) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const cols = Math.max(1, layout.columns);
  const cardWidth =
    cols === 1 || layout.blockWidth <= 0
      ? undefined
      : Math.floor((layout.blockWidth - GAP * (cols - 1)) / cols);
  const scale = block.scale ?? "none";
  const numerics = block.items.map((it) => it.numeric ?? 0);

  return (
    <View>
      <View style={s.grid}>
        {block.items.map((item, i) => (
          <Animated.View
            key={`${item.label}-${i}`}
            entering={reducedMotion ? undefined : FadeInDown.duration(220).delay(i * 60)}
            style={[s.card, cardWidth ? { width: cardWidth } : { width: "100%" }]}
          >
            <Text style={s.label}>{item.label}</Text>
            <Text style={s.value}>{item.value}</Text>
            {scale !== "none" && item.numeric ? (
              <View style={s.track}>
                <View
                  style={{
                    height: "100%",
                    width: `${Math.round(barFraction(item.numeric, numerics, scale) * 100)}%`,
                    backgroundColor: toneColor(theme, item.tone ?? "primary"),
                  }}
                />
              </View>
            ) : null}
            {item.detail ? <Text style={s.detail}>{item.detail}</Text> : null}
          </Animated.View>
        ))}
      </View>
      {block.scaleNote ? <Text style={s.note}>{block.scaleNote}</Text> : null}
    </View>
  );
});
