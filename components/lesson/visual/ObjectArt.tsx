/**
 * Draws a lesson object picture (object-art.ts) with react-native-svg. `ObjectArt` is a picture on its
 * own; `ArtShapes` draws the same shapes inside an existing <Svg> (the scene figures place pictures
 * among their lines and labels). Decorative: the words beside a picture always say what it is.
 */

import { memo } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

import { OBJECT_ART, type ArtId, type ArtShape } from "./object-art";

function ShapeView({ s }: { s: ArtShape }) {
  switch (s.t) {
    case "rect":
      return <Rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} fill={s.fill} fillOpacity={s.opacity} />;
    case "circle":
      return <Circle cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} fillOpacity={s.opacity} />;
    case "path":
      return <Path d={s.d} fill={s.fill} fillOpacity={s.opacity} />;
    default:
      return <Path d={s.d} fill="none" stroke={s.stroke} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" />;
  }
}

/** The shapes of one picture, in its own 100 x 100 frame. Place it with a transform. */
export const ArtShapes = memo(function ArtShapes({ id }: { id: ArtId }) {
  return (
    <G>
      {OBJECT_ART[id].map((s, i) => (
        <ShapeView key={i} s={s} />
      ))}
    </G>
  );
});

/** One picture, `size` dp square. */
export const ObjectArt = memo(function ObjectArt({ id, size }: { id: ArtId; size: number }) {
  return (
    <View style={{ width: size, height: size }} accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <ArtShapes id={id} />
      </Svg>
    </View>
  );
});
