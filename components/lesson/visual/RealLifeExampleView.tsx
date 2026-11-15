import { memo, useMemo } from "react";
import { Text, View } from "react-native";

import type { RealLifeExampleBlock, VisualTone } from "@/content/types";
import { createStyles, useTheme } from "@/theme";

import { toneColor } from "./colors";

const makeStyles = createStyles((theme) => ({
  wrap: { gap: theme.spacing.md },
  headline: {
    color: theme.colors.text,
    ...theme.fontFaces.heavy,
    fontSize: 18,
    lineHeight: 25,
  },
  section: {
    flexDirection: "row",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  bar: { width: 5, borderRadius: 3, alignSelf: "stretch" },
  col: { flex: 1, flexShrink: 1, gap: 2 },
  label: {
    color: theme.colors.text,
    ...theme.fontFaces.heavy,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  body: {
    color: theme.colors.text,
    ...theme.fontFaces.book,
    fontSize: 15,
    lineHeight: 22,
  },
  facts: { gap: theme.spacing.xs },
  factRow: { flexDirection: "row", gap: theme.spacing.sm },
  factDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    backgroundColor: theme.colors.text,
  },
  fact: {
    flex: 1,
    color: theme.colors.textSecondary,
    ...theme.fontFaces.book,
    fontSize: 14,
    lineHeight: 20,
  },
}));

/** Headline + what you see / the science / why it matters. Text-first, so it is read as normal text. */
export const RealLifeExampleView = memo(function RealLifeExampleView({
  block,
}: {
  block: RealLifeExampleBlock;
}) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const sections: { label: string; body: string; tone: VisualTone }[] = [
    { label: "What you see", body: block.whatYouSee, tone: "info" },
    { label: "The science", body: block.theScience, tone: "primary" },
    { label: "Why it matters", body: block.whyItMatters, tone: "success" },
  ];
  return (
    <View style={s.wrap}>
      <Text style={s.headline} accessibilityRole="header">
        {block.headline}
      </Text>
      {sections.map((sec) => (
        <View key={sec.label} style={s.section}>
          <View style={[s.bar, { backgroundColor: toneColor(theme, sec.tone) }]} />
          <View style={s.col}>
            <Text style={s.label}>{sec.label}</Text>
            <Text style={s.body}>{sec.body}</Text>
          </View>
        </View>
      ))}
      {block.facts && block.facts.length > 0 ? (
        <View style={s.facts}>
          {block.facts.map((f, i) => (
            <View key={i} style={s.factRow}>
              <View style={s.factDot} />
              <Text style={s.fact}>{f}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
});
