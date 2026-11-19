/**
 * A pattern over a paint (pattern-art.ts): a wallpaper of small flat pictures, repeated across whatever it
 * fills. The pictures are drawn white at half strength, so they are a lighter tone of the paint and the rest
 * of the paint is untouched: a light pattern, which never darkens the paint. It shows best on mid-tone paints;
 * on the palest it is faint. It fills its parent, measures it, and draws one tile (`tile` dp square) and lets the
 * Svg repeat it, with the half strength applied to the whole layer (not to each shape) so nothing darkens where two shapes meet. Renders
 * nothing for `none` or an id it does not know. Decorative.
 */

import { memo, useId, useMemo, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, G, Path, Pattern, Rect } from "react-native-svg";

import { OFFICIAL } from "@/components/npc/npc-palette";

import type { PatternId } from "./avatar-core";
import { PATTERN_GLYPHS, TILE, patternDef, tilePlacements, type PatternGlyphId } from "./pattern-art";

/** How strongly the pictures show over the paint (0 to 1). */
export const PATTERN_OPACITY = 0.5;

const Glyph = memo(function Glyph({ id }: { id: PatternGlyphId }) {
  const white = OFFICIAL.snow;
  return (
    <G>
      {PATTERN_GLYPHS[id].map((s, i) => {
        switch (s.t) {
          case "p":
            return <Path key={i} d={s.d} fill={white} />;
          case "c":
            return <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={white} />;
          case "r":
            return <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="none" stroke={white} strokeWidth={s.w} />;
          default:
            return <Path key={i} d={s.d} fill="none" stroke={white} strokeWidth={s.w} strokeLinecap="round" strokeLinejoin="round" />;
        }
      })}
    </G>
  );
});

export const PatternLayer = memo(function PatternLayer({ pattern, tile = 96 }: { pattern: PatternId; tile?: number }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const def = pattern === "none" ? undefined : patternDef(pattern);
  // One tile's pictures, built once per pattern: the Svg repeats it (a `Pattern` fill), so a layer is a few dozen
  // shapes however big the area is, not a few dozen per tile
  const tileShapes = useMemo(
    () =>
      def
        ? tilePlacements(def).map((t, j) => (
            <G key={j} transform={`translate(${t.x} ${t.y}) rotate(${t.rotate}) scale(${t.size / 24}) translate(-12 -12)`}>
              <Glyph id={t.glyph} />
            </G>
          ))
        : null,
    [def],
  );
  if (!def) return null;
  const k = TILE / tile; // tile units per dp
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { overflow: "hidden", opacity: PATTERN_OPACITY }]}
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
