/**
 * Draws one Atom Scanner scene (scan-scenes.ts) as a single Svg, bleed included, and moves it under a fixed
 * reticle with a transform driven by the pan shared values (no React render while the learner drags).
 */

import { memo, useMemo } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

import { OBJECT_ART, type ArtId } from "../lesson/visual/object-art";
import type { ScanScene, ScanShape } from "./scan-scenes";
import { VIGNETTES } from "./scan-vignettes";
import { BLEED, VIEW_UNITS_WIDE, WORLD } from "./scanner-core";

export function Shape({ s }: { s: ScanShape }) {
  switch (s.t) {
    case "band":
      return (
        <Rect
          x={0}
          y={s.y}
          width={WORLD.w}
          height={s.h}
          fill={s.fill}
          fillOpacity={s.opacity}
        />
      );
    case "rect":
      return (
        <Rect
          x={s.x}
          y={s.y}
          width={s.w}
          height={s.h}
          rx={s.r}
          fill={s.fill}
          fillOpacity={s.opacity}
        />
      );
    case "circle":
      return (
        <Circle
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill={s.fill}
          fillOpacity={s.opacity}
        />
      );
    case "path":
      return <Path d={s.d} fill={s.fill} fillOpacity={s.opacity} />;
    case "line":
      return (
        <Path
          d={s.d}
          fill="none"
          stroke={s.stroke}
          strokeWidth={s.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "group":
      return (
        <G transform={`translate(${s.x} ${s.y}) scale(${s.size / 100})`}>
          {s.shapes.map((a, i) => (
            <Shape key={i} s={a} />
          ))}
        </G>
      );
    default:
      return (
        <G transform={`translate(${s.x} ${s.y}) scale(${s.size / 100})`}>
          {OBJECT_ART[s.id].map((a, i) => (
            <Shape key={i} s={a} />
          ))}
        </G>
      );
  }
}

/** A thing's little scene on its own, for the thumbnails under the viewfinder. */
export const VignetteArt = memo(function VignetteArt({
  object,
  size,
}: {
  object: ArtId;
  size: number;
}) {
  const shapes = VIGNETTES[object];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {shapes ? (
        shapes.map((s, i) => <Shape key={i} s={s} />)
      ) : (
        <Shape s={{ t: "art", id: object, x: 0, y: 0, size: 100 }} />
      )}
    </Svg>
  );
});

/** The scene itself: only its own 320 x 200 units are drawn as vectors. */
const SceneArt = memo(function SceneArt({
  scene,
  width,
  height,
}: {
  scene: ScanScene;
  width: number;
  height: number;
}) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}>
      {scene.backdrop.map((s, i) => (
        <Shape key={i} s={s} />
      ))}
    </Svg>
  );
});

/** The bleed: the same bands as plain Views, so the view can look past the scene's edge without drawing more vectors. */
const Bleed = memo(function Bleed({
  scene,
  k,
}: {
  scene: ScanScene;
  k: number;
}) {
  return (
    <>
      {scene.backdrop.map((s, i) =>
        s.t === "band" ? (
          <View
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: (BLEED + s.y) * k,
              height: s.h * k,
              backgroundColor: s.fill,
              opacity: s.opacity ?? 1,
            }}
          />
        ) : null,
      )}
    </>
  );
});

export function ScannerScene({
  scene,
  viewW,
  viewH,
  panX,
  panY,
}: {
  scene: ScanScene;
  viewW: number;
  viewH: number;
  panX: SharedValue<number>;
  panY: SharedValue<number>;
}) {
  const k = viewW / VIEW_UNITS_WIDE;
  const width = (WORLD.w + BLEED * 2) * k;
  const height = (WORLD.h + BLEED * 2) * k;
  const layout = useMemo(
    () => ({ position: "absolute" as const, left: 0, top: 0, width, height }),
    [width, height],
  );
  const art = useMemo(
    () => ({ position: "absolute" as const, left: BLEED * k, top: BLEED * k }),
    [k],
  );
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: viewW / 2 - (panX.value + BLEED) * k },
      { translateY: viewH / 2 - (panY.value + BLEED) * k },
    ],
  }));
  return (
    <View
      style={{ width: viewW, height: viewH, overflow: "hidden" }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[layout, style]}>
        <Bleed scene={scene} k={k} />
        <View style={art}>
          <SceneArt scene={scene} width={WORLD.w * k} height={WORLD.h * k} />
        </View>
      </Animated.View>
    </View>
  );
}
