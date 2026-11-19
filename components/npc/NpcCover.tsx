/**
 * A teacher's profile cover (npc-cover-art.ts): a wallpaper of small flat pictures about what they teach,
 * on their outfit colour. Decorative: the name and title under it say who it is. It fills the box it is
 * given and rounds its own corners.
 */

import { memo, useMemo, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

import { COVER_H, COVER_W, GLYPHS, coverLayout, coverTones, coverViewBox, glyphsFor, type GlyphId } from "./npc-cover-art";

const Glyph = memo(function Glyph({ id, color }: { id: GlyphId; color: string }) {
  return (
    <G>
      {GLYPHS[id].map((s, i) => {
        switch (s.t) {
          case "p":
            return <Path key={i} d={s.d} fill={color} />;
          case "c":
            return <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={color} />;
          case "r":
            return <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="none" stroke={color} strokeWidth={s.w} />;
          default:
            return <Path key={i} d={s.d} fill="none" stroke={color} strokeWidth={s.w} strokeLinecap="round" strokeLinejoin="round" />;
        }
      })}
    </G>
  );
});

export interface NpcCoverProps {
  /** The teacher: picks the pictures. Without one, a small default set. */
  npcId?: string | null;
  /** The teacher's outfit colour and its shade. */
  outfit: { color: string; shade: string };
  height: number;
  radius?: number;
}

export const NpcCover = memo(function NpcCover({ npcId, outfit, height, radius = 24 }: NpcCoverProps) {
  const [width, setWidth] = useState<number | null>(null);
  const tones = useMemo(() => coverTones(outfit), [outfit]);
  const layout = useMemo(() => coverLayout(glyphsFor(npcId)), [npcId]);
  const vb = coverViewBox(width ? width / height : COVER_W / COVER_H);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  return (
    <View style={{ height, borderRadius: radius, overflow: "hidden" }} onLayout={onLayout} accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid slice">
        <Rect x={0} y={0} width={COVER_W} height={COVER_H} fill={tones.base} />
        {layout.dots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={tones.shade} />
        ))}
        {layout.glyphs.map((g, i) => (
          <G key={i} transform={`translate(${g.x} ${g.y}) scale(${g.size / 24}) rotate(${g.rotate} 12 12)`}>
            <Glyph id={g.glyph} color={g.tone === "light" ? tones.light : tones.shade} />
          </G>
        ))}
      </Svg>
    </View>
  );
});
