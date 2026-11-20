/** A reaction or a sticker (chat-art.ts) drawn in its 100 x 100 frame at any size. */

import { memo } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { chatArt } from "./chat-art";

function ChatArtBase({ id, size }: { id: string; size: number }) {
  const shapes = chatArt(id);
  if (!shapes) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" pointerEvents="none">
      {shapes.map((s, i) => {
        if (s.t === "rect") return <Rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} fill={s.fill} fillOpacity={s.opacity} />;
        if (s.t === "circle") return <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} fillOpacity={s.opacity} />;
        if (s.t === "path") return <Path key={i} d={s.d} fill={s.fill} fillOpacity={s.opacity} />;
        return <Path key={i} d={s.d} fill="none" stroke={s.stroke} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </Svg>
  );
}

export const ChatArt = memo(ChatArtBase);
