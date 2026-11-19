/**
 * Draws a blog illustration (blog-art.ts) with react-native-svg. It fills the box it is given: the whole
 * scene in a wide box, and a window around the scene's focus in a narrow one (a square card cover).
 * Decorative: the caption or the title beside it always says what it is.
 */

import { memo, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

import { ArtShapes } from "@/components/lesson/visual/ObjectArt";
import { BLOG_SCENES, SCENE_H, SCENE_W, viewBoxFor, type BlogSceneId, type BlogShape } from "./blog-art";

function ShapeView({ s }: { s: BlogShape }) {
  switch (s.t) {
    case "rect":
      return <Rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} fill={s.fill} fillOpacity={s.opacity} />;
    case "circle":
      return <Circle cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} fillOpacity={s.opacity} />;
    case "path":
      return <Path d={s.d} fill={s.fill} fillOpacity={s.opacity} />;
    case "line":
      return <Path d={s.d} fill="none" stroke={s.stroke} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" />;
    default:
      // A lesson object picture placed in the scene: its own 100 x 100 frame, moved, scaled and turned
      return (
        <G transform={`translate(${s.x} ${s.y}) scale(${s.size / 100})${s.rotate ? ` rotate(${s.rotate} 50 50)` : ""}`}>
          <ArtShapes id={s.id} />
        </G>
      );
  }
}

const SceneShapes = memo(function SceneShapes({ id }: { id: BlogSceneId }) {
  return (
    <G>
      {BLOG_SCENES[id].shapes.map((s, i) => (
        <ShapeView key={i} s={s} />
      ))}
    </G>
  );
});

export interface BlogArtProps {
  id: BlogSceneId;
  /** Fixed size, when the caller knows it (a card cover). Without it the art measures its box and fills it. */
  width?: number;
  /** A number of dp, or "fill" to take the height of a parent that sets it (for example by aspect ratio). */
  height: number | "fill";
}

export const BlogArt = memo(function BlogArt({ id, width, height }: BlogArtProps) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const w = width ?? box?.w;
  const h = height === "fill" ? box?.h : height;
  const vb = viewBoxFor(w && h ? w / h : SCENE_W / SCENE_H, BLOG_SCENES[id].focusX);
  const measure = width === undefined || height === "fill";
  const onLayout = measure ? (e: LayoutChangeEvent) => setBox({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) }) : undefined;
  return (
    <View style={{ width: width ?? "100%", height: height === "fill" ? "100%" : height }} onLayout={onLayout} accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid slice">
        <SceneShapes id={id} />
      </Svg>
    </View>
  );
});
