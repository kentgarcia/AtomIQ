import { Component, memo, useMemo, useState, type ReactNode } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import { Text } from "@/components/ui/text";
import { useReducedMotion } from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import type { VisualBlock, VisualSource } from "@/content/types";
import {
  fallbackTextParts,
  validateVisualBlock,
} from "@/content/visual-blocks";
import { createStyles, useTheme } from "@/theme";
import { layout as layoutTokens } from "@/theme/layout";

import { ComparisonCardsView } from "./ComparisonCardsView";
import { ProcessFlowView } from "./ProcessFlowView";
import { RealLifeExampleView } from "./RealLifeExampleView";
import { CalloutLegend, KeyLegend, SceneSvg } from "./SceneFigure";
import { useVisualLayout } from "./useVisualLayout";

const makeStyles = createStyles((theme) => ({
  card: {
    alignSelf: "stretch",
    width: "100%",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    ...theme.fontFaces.heavy,
    fontSize: 18,
    lineHeight: 24,
  },
  objective: {
    color: theme.colors.textSecondary,
    ...theme.fontFaces.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  objectiveLead: { ...theme.fontFaces.heavy, color: theme.colors.text },
  figure: { gap: theme.spacing.md },
  figureRow: { flexDirection: "row", gap: theme.spacing.lg, alignItems: "flex-start" },
  figureCol: { flex: 3 },
  legendCol: { flex: 2, gap: theme.spacing.md },
  explanation: {
    color: theme.colors.text,
    ...theme.fontFaces.book,
    fontSize: 15,
    lineHeight: 22,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    minHeight: layoutTokens.minTouchTarget,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceSoft,
  },
  toggleText: {
    flex: 1,
    color: theme.colors.text,
    ...theme.fontFaces.bold,
    fontSize: 14,
  },
  plain: {
    color: theme.colors.text,
    ...theme.fontFaces.book,
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: theme.spacing.xs,
  },
  caption: {
    color: theme.colors.textSecondary,
    ...theme.fontFaces.medium,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: "italic",
  },
  credit: {
    color: theme.colors.textSecondary,
    ...theme.fontFaces.book,
    fontSize: 12,
    lineHeight: 17,
  },
  creditLead: { ...theme.fontFaces.bold, color: theme.colors.text },
  fallbackNote: {
    color: theme.colors.textSecondary,
    ...theme.fontFaces.medium,
    fontSize: 12,
  },
}));

function sourceLine(source: VisualSource | undefined): string | null {
  if (!source) return null;
  if (source.type === "original") return `Original AtomIQ illustration. ${source.note}`;
  const year = source.year ? ` (${source.year})` : "";
  const note = source.note ? ` ${source.note}` : "";
  const verify = source.verify ? " Typical values; check the publisher for current figures." : "";
  return `${source.publisher}, ${source.title}${year}.${note}${verify}`;
}

/** Graceful degradation: whatever teaching text survives, never a crash. */
function FallbackBlock({ block }: { block: unknown }) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const parts = fallbackTextParts(block);
  if (!parts.title && !parts.explanation && !parts.plainText) return null;
  return (
    <View style={s.card}>
      {parts.title ? <Text style={s.title}>{parts.title}</Text> : null}
      {parts.explanation ? <Text style={s.explanation}>{parts.explanation}</Text> : null}
      {parts.plainText ? <Text style={s.plain}>{parts.plainText}</Text> : null}
    </View>
  );
}

class VisualErrorBoundary extends Component<
  { block: unknown; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    if (__DEV__) console.warn("[visual-block] render failed", error);
  }
  render() {
    return this.state.failed ? <FallbackBlock block={this.props.block} /> : this.props.children;
  }
}

function BlockBody({ block }: { block: VisualBlock }) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();
  const [measured, setMeasured] = useState<number | undefined>(undefined);
  const [showText, setShowText] = useState(false);
  const layout = useVisualLayout(block.responsive, measured);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    setMeasured((prev) => (prev === w ? prev : w));
  };

  const innerWidth = Math.max(0, (measured ?? layout.blockWidth) - 24); // card padding
  const credit = sourceLine(block.source);
  const isScene =
    block.kind === "diagram" || block.kind === "model" || block.kind === "annotated_illustration";

  let figure: ReactNode = null;
  if (isScene) {
    const sideBySide = layout.sideBySide;
    const figureWidth = sideBySide ? Math.floor(innerWidth * 0.58) : innerWidth;
    const figureNode = (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={block.altText}
      >
        <SceneSvg
          scene={block.scene}
          callouts={block.callouts}
          width={figureWidth}
          hideText={layout.stacked}
        />
      </View>
    );
    const legend = (
      <>
        {block.key && block.key.length > 0 ? <KeyLegend items={block.key} /> : null}
        <CalloutLegend callouts={block.callouts} />
      </>
    );
    figure = sideBySide ? (
      <View style={s.figureRow}>
        <View style={[s.figureCol, { flex: 0, width: figureWidth }]}>{figureNode}</View>
        <View style={s.legendCol}>{legend}</View>
      </View>
    ) : (
      <View style={s.figure}>
        {figureNode}
        {legend}
      </View>
    );
  } else if (block.kind === "process_flow") {
    figure = (
      <View accessible accessibilityRole="image" accessibilityLabel={block.altText}>
        <ProcessFlowView block={block} layout={{ ...layout, blockWidth: innerWidth }} reducedMotion={reducedMotion} />
      </View>
    );
  } else if (block.kind === "comparison_cards") {
    figure = (
      <View accessible accessibilityRole="image" accessibilityLabel={block.altText}>
        <ComparisonCardsView block={block} layout={{ ...layout, blockWidth: innerWidth }} reducedMotion={reducedMotion} />
      </View>
    );
  } else if (block.kind === "real_life_example") {
    figure = (
      <View style={s.figure}>
        {block.scene ? (
          <View accessible accessibilityRole="image" accessibilityLabel={block.altText}>
            <SceneSvg scene={block.scene} width={innerWidth} hideText={layout.stacked} />
          </View>
        ) : null}
        <RealLifeExampleView block={block} />
      </View>
    );
  }

  return (
    <View style={s.card} onLayout={onLayout}>
      <Text style={s.title} accessibilityRole="header">
        {block.title}
      </Text>
      <Text style={s.objective}>
        <Text style={s.objectiveLead}>You will learn: </Text>
        {block.learningObjective}
      </Text>
      {figure}
      <Text style={s.explanation}>{block.explanation}</Text>
      <Pressable
        onPress={() => setShowText((v) => !v)}
        style={s.toggle}
        accessibilityRole="button"
        accessibilityLabel="Text version of this figure"
        accessibilityState={{ expanded: showText }}
      >
        <Text style={s.toggleText}>Text version</Text>
        <Icon
          name={showText ? "ArrowUp2" : "ArrowDown2"}
          size={18}
          color={theme.colors.text}
        />
      </Pressable>
      {showText ? <Text style={s.plain}>{block.plainText}</Text> : null}
      {block.caption ? <Text style={s.caption}>{block.caption}</Text> : null}
      {credit || block.credit ? (
        <View>
          {credit ? (
            <Text style={s.credit}>
              <Text style={s.creditLead}>Source: </Text>
              {credit}
            </Text>
          ) : null}
          {block.credit ? (
            <Text style={s.credit}>
              <Text style={s.creditLead}>Credit: </Text>
              {block.credit}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Renders one visual lesson block. Malformed blocks degrade to their
 * explanation and plain text; render errors are contained by a boundary.
 */
export const VisualBlockView = memo(function VisualBlockView({ block }: { block: unknown }) {
  const validation = useMemo(() => validateVisualBlock(block), [block]);
  if (!validation.ok) {
    if (__DEV__) console.warn("[visual-block] invalid block:", validation.errors.join("; "));
    return <FallbackBlock block={block} />;
  }
  return (
    <VisualErrorBoundary block={block}>
      <BlockBody block={block as VisualBlock} />
    </VisualErrorBoundary>
  );
});
