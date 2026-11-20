/**
 * The picture on an app icon (app-icon-art.ts): a flat drawing in the lesson object style, filling the tile. A colour of `$face`
 * or `$lip` in the art is the tile's own colour, so details cut out of the white picture show the tile through them.
 */

import { memo } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { appIconArt } from "./app-icon-art";

export const hasGlyph = (id: string): boolean => appIconArt(id) !== null;

function AppGlyphBase({ id, size, face, lip }: { id: string; size: number; face: string; lip: string }) {
  const shapes = appIconArt(id);
  if (!shapes) return null;
  const color = (v: string) => (v === "$face" ? face : v === "$lip" ? lip : v);
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" pointerEvents="none">
      {shapes.map((s, i) => {
        if (s.t === "rect") return <Rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} fill={color(s.fill)} fillOpacity={s.opacity} />;
        if (s.t === "circle") return <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={color(s.fill)} fillOpacity={s.opacity} />;
        if (s.t === "path") return <Path key={i} d={s.d} fill={color(s.fill)} fillOpacity={s.opacity} />;
        return <Path key={i} d={s.d} fill="none" stroke={color(s.stroke)} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </Svg>
  );
}

export const AppGlyph = memo(AppGlyphBase);
