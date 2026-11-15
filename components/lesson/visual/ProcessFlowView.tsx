import { memo, useMemo } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Polygon } from "react-native-svg";

import type { ProcessFlowBlock } from "@/content/types";
import { createStyles, useTheme } from "@/theme";

import type { VisualLayout } from "./useVisualLayout";

const makeStyles = createStyles((theme) => ({
  flow: { gap: theme.spacing.xs },
  flowRow: { flexDirection: "row", alignItems: "stretch", gap: theme.spacing.xs },
  step: {
    backgroundColor: theme.colors.surfaceSoft,
    borderColor: theme.colors.borderStrong,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  stepFlex: { flex: 1 },
  head: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.inverseSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: theme.colors.inverseText,
    ...theme.fontFaces.bold,
    fontSize: 13,
  },
  label: {
    flex: 1,
    color: theme.colors.text,
    ...theme.fontFaces.bold,
    fontSize: 15,
    lineHeight: 21,
  },
  value: {
    color: theme.colors.text,
    ...theme.fontFaces.heavy,
    fontSize: 24,
    lineHeight: 30,
  },
  detail: {
    color: theme.colors.textSecondary,
    ...theme.fontFaces.book,
    fontSize: 14,
    lineHeight: 20,
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.text,
    borderWidth: 1,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: theme.colors.primary },
  arrowCol: { alignItems: "center", justifyContent: "center", paddingVertical: 2 },
}));

function Arrow({ down, color }: { down: boolean; color: string }) {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 22 22"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Polygon
        points={down ? "3,6 19,6 11,17" : "6,3 17,11 6,19"}
        fill={color}
      />
    </Svg>
  );
}

/** Ordered steps with arrows; horizontal on wide layouts, vertical otherwise. */
export const ProcessFlowView = memo(function ProcessFlowView({
  block,
  layout,
  reducedMotion,
}: {
  block: ProcessFlowBlock;
  layout: VisualLayout;
  reducedMotion: boolean;
}) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const horizontal =
    layout.sideBySide && block.steps.length <= 4 && layout.blockWidth >= 520;
  const arrowColor = theme.colors.text;

  const renderStep = (step: ProcessFlowBlock["steps"][number], i: number) => (
    <Animated.View
      key={`step-${i}`}
      entering={reducedMotion ? undefined : FadeInDown.duration(220).delay(i * 70)}
      style={[s.step, horizontal && s.stepFlex]}
    >
      <View style={s.head}>
        <View style={s.badge}>
          <Text style={s.badgeText}>{i + 1}</Text>
        </View>
        <Text style={s.label}>{step.label}</Text>
      </View>
      {step.value ? <Text style={s.value}>{step.value}</Text> : null}
      {typeof step.meter === "number" ? (
        <View style={s.track}>
          <View style={[s.fill, { width: `${Math.round(step.meter * 100)}%` }]} />
        </View>
      ) : null}
      {step.detail ? <Text style={s.detail}>{step.detail}</Text> : null}
    </Animated.View>
  );

  const nodes: React.ReactNode[] = [];
  block.steps.forEach((step, i) => {
    nodes.push(renderStep(step, i));
    if (i < block.steps.length - 1) {
      nodes.push(
        <View key={`arrow-${i}`} style={s.arrowCol}>
          <Arrow down={!horizontal} color={arrowColor} />
        </View>,
      );
    }
  });

  return <View style={horizontal ? s.flowRow : s.flow}>{nodes}</View>;
});
