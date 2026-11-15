import { memo, useMemo } from "react";
import { Text, View } from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Polygon,
  Rect,
  Text as SvgText,
} from "react-native-svg";

import type {
  SceneShape,
  VisualCallout,
  VisualKeyItem,
  VisualScene,
} from "@/content/types";
import { createStyles, useTheme, type Theme } from "@/theme";

import { toneColor, toneSoft } from "./colors";

const SCENE_WIDTH = 100;

interface SceneSvgProps {
  scene: VisualScene;
  callouts?: VisualCallout[];
  /** Rendered width in dp; height follows the scene aspect ratio. */
  width: number;
  /** Hide non-essential in-figure text (tight width / large OS font). */
  hideText?: boolean;
}

function fillFor(theme: Theme, shape: Extract<SceneShape, { t: "rect" | "circle" }>): string {
  const fill = shape.fill ?? "solid";
  if (fill === "none") return "none";
  if (fill === "soft") return toneSoft(theme, shape.tone);
  return toneColor(theme, shape.tone);
}

function arrowHead(x1: number, y1: number, x2: number, y2: number, size: number): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const a1 = angle + Math.PI - 0.45;
  const a2 = angle + Math.PI + 0.45;
  const p1 = `${x2 + size * Math.cos(a1)},${y2 + size * Math.sin(a1)}`;
  const p2 = `${x2 + size * Math.cos(a2)},${y2 + size * Math.sin(a2)}`;
  return `${x2},${y2} ${p1} ${p2}`;
}

function SceneShapeView({
  shape,
  theme,
  hideText,
}: {
  shape: SceneShape;
  theme: Theme;
  hideText?: boolean;
}) {
  const outline = theme.colors.text;
  switch (shape.t) {
    case "rect":
      return (
        <Rect
          x={shape.x}
          y={shape.y}
          width={shape.w}
          height={shape.h}
          rx={shape.rx ?? 0.8}
          fill={fillFor(theme, shape)}
          stroke={outline}
          strokeWidth={0.5}
        />
      );
    case "circle":
      return (
        <Circle
          cx={shape.x}
          cy={shape.y}
          r={shape.r}
          fill={fillFor(theme, shape)}
          stroke={outline}
          strokeWidth={0.5}
        />
      );
    case "line": {
      const w = shape.width ?? 1;
      const dash = shape.dash ? "2 1.6" : undefined;
      const hue = shape.tone ? toneColor(theme, shape.tone) : outline;
      return (
        <G>
          {/* Outline under-stroke keeps the line visible on any surface. */}
          {shape.tone ? (
            <Line
              x1={shape.x1}
              y1={shape.y1}
              x2={shape.x2}
              y2={shape.y2}
              stroke={outline}
              strokeWidth={w + 0.9}
              strokeDasharray={dash}
              strokeLinecap="round"
            />
          ) : null}
          <Line
            x1={shape.x1}
            y1={shape.y1}
            x2={shape.x2}
            y2={shape.y2}
            stroke={hue}
            strokeWidth={w}
            strokeDasharray={dash}
            strokeLinecap="round"
          />
          {shape.arrow ? (
            <Polygon
              points={arrowHead(shape.x1, shape.y1, shape.x2, shape.y2, 2.6 + w)}
              fill={hue}
              stroke={outline}
              strokeWidth={0.4}
            />
          ) : null}
        </G>
      );
    }
    case "text":
      if (hideText && !shape.keep) return null;
      return (
        <SvgText
          x={shape.x}
          y={shape.y}
          fontSize={shape.size ?? 5}
          fontFamily={theme.fontFaces.semibold.fontFamily}
          fontWeight={theme.fontFaces.semibold.fontWeight}
          fill={theme.colors.text}
          textAnchor={shape.anchor ?? "middle"}
        >
          {shape.text}
        </SvgText>
      );
    default:
      return null;
  }
}

/** The SVG figure. Pure drawing: all meaning is repeated in the legend and plain text. */
export const SceneSvg = memo(function SceneSvg({
  scene,
  callouts,
  width,
  hideText,
}: SceneSvgProps) {
  const { theme } = useTheme();
  const height = (width * scene.height) / SCENE_WIDTH;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${SCENE_WIDTH} ${scene.height}`}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Rect
        x={0.3}
        y={0.3}
        width={SCENE_WIDTH - 0.6}
        height={scene.height - 0.6}
        rx={2.5}
        fill={theme.colors.surfaceSoft}
        stroke={theme.colors.border}
        strokeWidth={0.6}
      />
      {scene.shapes.map((shape, i) => (
        <SceneShapeView key={i} shape={shape} theme={theme} hideText={hideText} />
      ))}
      {(callouts ?? []).map((c) => (
        <G key={`c-${c.id}`}>
          <Circle
            cx={c.x}
            cy={c.y}
            r={3.4}
            fill={theme.colors.inverseSurface}
            stroke={theme.colors.surfaceSoft}
            strokeWidth={0.7}
          />
          <SvgText
            x={c.x}
            y={c.y + 1.45}
            fontSize={4}
            fontFamily={theme.fontFaces.bold.fontFamily}
            fontWeight={theme.fontFaces.bold.fontWeight}
            fill={theme.colors.inverseText}
            textAnchor="middle"
          >
            {c.id}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
});

const makeLegendStyles = createStyles((theme) => ({
  list: { gap: theme.spacing.sm },
  row: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.inverseSurface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  markerText: {
    color: theme.colors.inverseText,
    ...theme.fontFaces.bold,
    fontSize: 13,
  },
  textCol: { flex: 1, flexShrink: 1 },
  label: {
    color: theme.colors.text,
    ...theme.fontFaces.bold,
    fontSize: 15,
    lineHeight: 21,
  },
  detail: {
    color: theme.colors.textSecondary,
    ...theme.fontFaces.book,
    fontSize: 14,
    lineHeight: 20,
  },
  keyWrap: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md },
  keyItem: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  keyLabel: {
    color: theme.colors.text,
    ...theme.fontFaces.medium,
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1,
  },
}));

/** Numbered legend: the stacked-list fallback for the figure's callouts. */
export function CalloutLegend({ callouts }: { callouts: VisualCallout[] }) {
  const { theme } = useTheme();
  const s = useMemo(() => makeLegendStyles(theme), [theme]);
  return (
    <View style={s.list}>
      {callouts.map((c) => (
        <View key={c.id} style={s.row}>
          <View style={s.marker} accessible={false}>
            <Text style={s.markerText}>{c.id}</Text>
          </View>
          <View style={s.textCol}>
            <Text style={s.label}>{c.label}</Text>
            <Text style={s.detail}>{c.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Swatch({ item, theme }: { item: VisualKeyItem; theme: Theme }) {
  const hue = toneColor(theme, item.tone);
  const outline = theme.colors.text;
  const shape = item.swatch ?? "circle";
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" accessible={false} importantForAccessibility="no-hide-descendants">
      {shape === "line" ? (
        <G>
          <Line x1={2} y1={10} x2={18} y2={10} stroke={outline} strokeWidth={5} strokeLinecap="round" />
          <Line x1={2} y1={10} x2={18} y2={10} stroke={hue} strokeWidth={3.4} strokeLinecap="round" />
        </G>
      ) : shape === "square" ? (
        <Rect x={3} y={3} width={14} height={14} rx={2} fill={hue} stroke={outline} strokeWidth={1.4} />
      ) : (
        <Circle cx={10} cy={10} r={7} fill={hue} stroke={outline} strokeWidth={1.4} />
      )}
    </Svg>
  );
}

/** Colour key: every hue is paired with a shape swatch and a text label. */
export function KeyLegend({ items }: { items: VisualKeyItem[] }) {
  const { theme } = useTheme();
  const s = useMemo(() => makeLegendStyles(theme), [theme]);
  return (
    <View style={s.keyWrap}>
      {items.map((k) => (
        <View key={k.label} style={s.keyItem}>
          <Swatch item={k} theme={theme} />
          <Text style={s.keyLabel}>{k.label}</Text>
        </View>
      ))}
    </View>
  );
}
