/**
 * A pattern over a paint (pattern-art.ts): a wallpaper of flat pictures and interspersed dots, repeated across
 * whatever it fills. Like the teachers' profile covers (`NpcCover.tsx`), it draws in two solid tones derived from
 * the paint (`coverTones` in `npc-cover-art.ts`): a lighter tint for the main glyphs and the paint's darker shade
 * for the accent glyphs and the dots between them. Renders nothing for `none` or an id it does not know. Decorative.
 */

import { memo, useId, useMemo, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, G, Path, Pattern, Rect } from "react-native-svg";

import { coverTones } from "@/components/npc/npc-cover-art";

import { backgroundColors, DEFAULT_AVATAR, type BackgroundId, type PatternId } from "./avatar-core";
import { BASE_TILE, PATTERN_GLYPHS, TILE, patternDef, tileDots, tilePlacements, type PatternGlyphId } from "./pattern-art";

/** Full-strength solid tones, matching the teacher cover photos. */
export const PATTERN_OPACITY = 1;

const Glyph = memo(function Glyph({ id, color }: { id: PatternGlyphId; color: string }) {
  return (
    <G>
      {PATTERN_GLYPHS[id].map((s, i) => {
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

export const PatternLayer = memo(function PatternLayer({
  pattern,
  background = DEFAULT_AVATAR.background,
  tile = 96,
}: {
  pattern: PatternId;
  background?: BackgroundId;
  tile?: number;
}) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const def = pattern === "none" ? undefined : patternDef(pattern);
  const tones = useMemo(() => coverTones(backgroundColors(background)), [background]);
  // One tile's dots and pictures, built once per pattern + paint: the Svg repeats it (a `Pattern` fill)
  const tileShapes = useMemo(
    () =>
      def ? (
        <>
          {tileDots(def.layout).map((d, i) => (
            <Circle key={`d${i}`} cx={d.x} cy={d.y} r={d.r} fill={tones.shade} />
          ))}
          {tilePlacements(def).map((t, j) => (
            <G key={j} transform={`translate(${t.x} ${t.y}) rotate(${t.rotate}) scale(${t.size / 24}) translate(-12 -12)`}>
              <Glyph id={t.glyph} color={t.tone === "light" ? tones.light : tones.shade} />
            </G>
          ))}
        </>
      ) : null,
    [def, tones.light, tones.shade],
  );
  if (!def) return null;
  const k = BASE_TILE / tile; // tile units per dp (96 dp is the 1:1 cover scale)
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
      onLayout={(e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        setBox((b) => (Math.abs(b.w - width) < 0.5 && Math.abs(b.h - height) < 0.5 ? b : { w: width, h: height }));
      }}
    >
      {box.w > 0 && box.h > 0 ? (
        <Svg width={box.w} height={box.h} viewBox={`0 0 ${box.w * k} ${box.h * k}`}>
          <Defs>
            <Pattern id={uid} patternUnits="userSpaceOnUse" x={0} y={0} width={TILE} height={TILE}>
              {tileShapes}
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width={box.w * k} height={box.h * k} fill={`url(#${uid})`} />
        </Svg>
      ) : null}
    </View>
  );
});
