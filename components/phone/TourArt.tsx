/** One of Shrodi's tour pictures (tour-art.ts) drawn in its 200 x 120 frame at any width. */

import { memo } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { TOUR_ART_HEIGHT, TOUR_ART_WIDTH, tourArt } from "./tour-art";

function TourArtBase({ id, width }: { id: string; width: number }) {
  const shapes = tourArt(id);
  if (!shapes) return null;
  return (
    <Svg width={width} height={(width * TOUR_ART_HEIGHT) / TOUR_ART_WIDTH} viewBox={`0 0 ${TOUR_ART_WIDTH} ${TOUR_ART_HEIGHT}`} pointerEvents="none">
      {shapes.map((s, i) => {
        if (s.t === "rect") return <Rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} fill={s.fill} fillOpacity={s.opacity} />;
        if (s.t === "circle") return <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} fillOpacity={s.opacity} />;
        if (s.t === "path") return <Path key={i} d={s.d} fill={s.fill} fillOpacity={s.opacity} />;
        return <Path key={i} d={s.d} fill="none" stroke={s.stroke} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </Svg>
  );
}

export const TourArt = memo(TourArtBase);
