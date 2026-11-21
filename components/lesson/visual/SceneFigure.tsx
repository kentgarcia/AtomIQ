import { useIsFocused } from "expo-router";
import { memo, useMemo } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { useAnimatedProps, type SharedValue } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import Svg, {
  Circle,
  G,
  Line,
  Polygon,
  Rect,
  Text as SvgText,
} from "react-native-svg";

import type {
  SceneMotion,
  SceneShape,
  VisualCallout,
  VisualKeyItem,
  VisualScene,
} from "@/content/types";
import { SCENE_LOOP_MS, SCENE_MOTION_LIMITS } from "@/content/visual-blocks";
import { useLoopClock, wave, loop } from "@/components/motion/motion";
import { createStyles, useTheme, withAlpha, type Theme } from "@/theme";

import { duoShade, lipFor } from "./duo-palette";
import { ArtShapes } from "./ObjectArt";
import { isArtId } from "./object-art";

const SCENE_WIDTH = 100;

const ACircle = Animated.createAnimatedComponent(Circle);
const ARect = Animated.createAnimatedComponent(Rect);

type Moving = { motion?: SceneMotion };
const motionOf = (shape: SceneShape): SceneMotion | undefined => ("motion" in shape ? (shape as Moving).motion : undefined);

interface SceneSvgProps {
  scene: VisualScene;
  callouts?: VisualCallout[];
  /** Rendered width in dp; height follows the scene aspect ratio. */
  width: number;
  /** Hide non-essential in-figure text (tight width / large OS font). */
  hideText?: boolean;
  /** Play the shapes' idle motion (default). Always still with reduced motion. */
  animate?: boolean;
  /** Draw the rounded plate behind the figure (default). Off when a card already frames it. */
  plate?: boolean;
}

type Solid = Extract<SceneShape, { t: "rect" | "circle" }>;

/**
 * Duolingo-style paint for a rect or circle: a bright face over a darker lip that drops below it,
 * so each shape reads as a chunky token. Soft shapes are a tint with a face-coloured edge, and
 * outlines (`fill: "none"`) are a plain ring; neither has a lip.
 */
function paintFor(theme: Theme, shape: Solid) {
  const { face, lip } = duoShade(shape.tone, theme.mode);
  const kind = shape.fill ?? "solid";
  const size = shape.t === "circle" ? shape.r : Math.min(shape.w, shape.h) / 2;
  if (kind === "none") return { kind, fill: "none", stroke: face, strokeWidth: 0.8, lip: lip, drop: 0 };
  if (kind === "soft") return { kind, fill: withAlpha(face, theme.mode === "dark" ? 0.28 : 0.2), stroke: face, strokeWidth: 0.6, lip, drop: 0 };
  return { kind, fill: face, stroke: "none", strokeWidth: 0, lip, drop: lipFor(size) };
}

function arrowHead(x1: number, y1: number, x2: number, y2: number, size: number): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const a1 = angle + Math.PI - 0.45;
  const a2 = angle + Math.PI + 0.45;
  const p1 = `${x2 + size * Math.cos(a1)},${y2 + size * Math.sin(a1)}`;
  const p2 = `${x2 + size * Math.cos(a2)},${y2 + size * Math.sin(a2)}`;
  return `${x2},${y2} ${p1} ${p2}`;
}

/**
 * Offset of a pulse or float from frame 0: zero at clock 0, so a frozen figure
 * (reduced motion, off screen) is exactly the authored drawing.
 */
function swing(t: number, period: number, phase: number): number {
  "worklet";
  return wave(t, period, phase) - wave(0, period, phase);
}

function MovingCircle({
  shape,
  motion,
  clock,
  fill,
  stroke,
  strokeWidth,
  drop,
}: {
  shape: Extract<SceneShape, { t: "circle" }>;
  motion: SceneMotion;
  clock: SharedValue<number>;
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** Scene units to shift down: the lip layer is the same circle, lower. */
  drop: number;
}) {
  const props = useAnimatedProps(() => {
    const t = clock.value;
    if (motion.kind === "orbit") {
      const dx = shape.x - motion.cx;
      const dy = shape.y - motion.cy;
      const a = Math.atan2(dy, dx) + 2 * Math.PI * loop(t, motion.period);
      const r = Math.hypot(dx, dy);
      return { cx: motion.cx + r * Math.cos(a), cy: motion.cy + r * Math.sin(a) + drop, r: shape.r };
    }
    if (motion.kind === "pulse") {
      const amount = motion.amount ?? SCENE_MOTION_LIMITS.pulseDefault;
      return { cx: shape.x, cy: shape.y + drop, r: shape.r * (1 + amount * swing(t, motion.period, motion.phase ?? 0)) };
    }
    const dy = motion.dy ?? SCENE_MOTION_LIMITS.floatDefault;
    return { cx: shape.x, cy: shape.y + drop + dy * swing(t, motion.period, motion.phase ?? 0), r: shape.r };
  });
  return <ACircle animatedProps={props} cx={shape.x} cy={shape.y + drop} r={shape.r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

function MovingRect({
  shape,
  motion,
  clock,
  fill,
  stroke,
  strokeWidth,
  drop,
}: {
  shape: Extract<SceneShape, { t: "rect" }>;
  motion: SceneMotion;
  clock: SharedValue<number>;
  fill: string;
  stroke: string;
  strokeWidth: number;
  drop: number;
}) {
  const props = useAnimatedProps(() => {
    const t = clock.value;
    if (motion.kind === "pulse") {
      const k = (motion.amount ?? SCENE_MOTION_LIMITS.pulseDefault) * swing(t, motion.period, motion.phase ?? 0);
      const w = shape.w * (1 + k);
      const h = shape.h * (1 + k);
      return { x: shape.x + (shape.w - w) / 2, y: shape.y + (shape.h - h) / 2 + drop, width: w, height: h };
    }
    if (motion.kind === "float") {
      const dy = (motion.dy ?? SCENE_MOTION_LIMITS.floatDefault) * swing(t, motion.period, motion.phase ?? 0);
      return { x: shape.x, y: shape.y + drop + dy, width: shape.w, height: shape.h };
    }
    return { x: shape.x, y: shape.y + drop, width: shape.w, height: shape.h };
  });
  return <ARect animatedProps={props} x={shape.x} y={shape.y + drop} width={shape.w} height={shape.h} rx={shape.rx ?? 1.2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

function SceneShapeView({
  shape,
  theme,
  hideText,
  clock,
}: {
  shape: SceneShape;
  theme: Theme;
  hideText?: boolean;
  clock?: SharedValue<number>;
}) {
  const outline = theme.colors.text;
  const motion = motionOf(shape);
  if (shape.t === "rect" || shape.t === "circle") {
    const paint = paintFor(theme, shape);
    const live = !!(clock && motion);
    // The lip first (same shape, lower, darker), then the face on top.
    const layers: { fill: string; drop: number; stroke: string }[] = [];
    if (paint.drop > 0) layers.push({ fill: paint.lip, drop: paint.drop, stroke: "none" });
    layers.push({ fill: paint.fill, drop: 0, stroke: paint.stroke });
    return (
      <G>
        {layers.map((l, i) => {
          if (shape.t === "circle") {
            return live ? (
              <MovingCircle key={i} shape={shape} motion={motion!} clock={clock!} fill={l.fill} stroke={l.stroke} strokeWidth={paint.strokeWidth} drop={l.drop} />
            ) : (
              <Circle key={i} cx={shape.x} cy={shape.y + l.drop} r={shape.r} fill={l.fill} stroke={l.stroke} strokeWidth={paint.strokeWidth} />
            );
          }
          return live && motion!.kind !== "orbit" ? (
            <MovingRect key={i} shape={shape} motion={motion!} clock={clock!} fill={l.fill} stroke={l.stroke} strokeWidth={paint.strokeWidth} drop={l.drop} />
          ) : (
            <Rect key={i} x={shape.x} y={shape.y + l.drop} width={shape.w} height={shape.h} rx={shape.rx ?? 1.2} fill={l.fill} stroke={l.stroke} strokeWidth={paint.strokeWidth} />
          );
        })}
      </G>
    );
  }
  switch (shape.t) {
    case "line": {
      const w = shape.width ?? 1;
      const dash = shape.dash ? "2 1.6" : undefined;
      // Toned lines use the tone's rim colour (same hue, reads on any surface); untoned lines are ink.
      const hue = shape.tone ? duoShade(shape.tone, theme.mode).lip : outline;
      return (
        <G>
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
              stroke={hue}
              strokeWidth={0.4}
              strokeLinejoin="round"
            />
          ) : null}
        </G>
      );
    }
    case "art":
      // A picture from the object art, centred on (x, y).
      return isArtId(shape.id) ? (
        <G transform={`translate(${shape.x - shape.size / 2} ${shape.y - shape.size / 2}) scale(${shape.size / 100})`}>
          <ArtShapes id={shape.id} />
        </G>
      ) : null;
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
  animate = true,
  plate = true,
}: SceneSvgProps) {
  const { theme } = useTheme();
  const height = (width * scene.height) / SCENE_WIDTH;
  // One clock per figure. Frozen at 0 (the authored drawing) with reduced motion,
  // when the screen is not in front, or when no shape has motion.
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const hasMotion = useMemo(() => scene.shapes.some((sh) => !!motionOf(sh)), [scene]);
  const live = animate && hasMotion && focused && !reduced;
  const clock = useLoopClock(SCENE_LOOP_MS, live);
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${SCENE_WIDTH} ${scene.height}`}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {plate ? (
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
      ) : null}
      {scene.shapes.map((shape, i) => (
        <SceneShapeView key={i} shape={shape} theme={theme} hideText={hideText} clock={hasMotion ? clock : undefined} />
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
  const { face: hue, lip: rim } = duoShade(item.tone, theme.mode);
  const shape = item.swatch ?? "circle";
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" accessible={false} importantForAccessibility="no-hide-descendants">
      {shape === "line" ? (
        <Line x1={3} y1={10} x2={17} y2={10} stroke={rim} strokeWidth={4} strokeLinecap="round" />
      ) : shape === "square" ? (
        <Rect x={3} y={3} width={14} height={14} rx={3} fill={hue} stroke={rim} strokeWidth={1.2} />
      ) : (
        <Circle cx={10} cy={10} r={7} fill={hue} stroke={rim} strokeWidth={1.2} />
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
