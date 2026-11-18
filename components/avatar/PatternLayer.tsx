/**
 * A pattern over a paint: the tile repeated across whatever it fills. The tiles are masks (solid shapes
 * on a transparent background, see scripts/bake-pattern-masks.mjs). They are tinted white and drawn at
 * half strength, so the shapes are a lighter tone of the paint and the rest of the paint is untouched:
 * a light pattern, which never darkens the paint. It shows best on mid-tone paints; on the palest it is faint. It fills its parent, measures it, and lays out whole tiles: React Native has no
 * dependable tiling across platforms, and a grid of the same small image is cheap. Renders nothing for
 * `none`. Decorative.
 */

import { memo, useState } from "react";
import { Image, StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { OFFICIAL } from "@/components/npc/npc-palette";

import type { PatternId } from "./avatar-core";
import { PATTERN_SOURCES } from "./avatar-patterns";

/** How strongly the tile shows over the paint (0 to 1). */
export const PATTERN_OPACITY = 0.5;

export const PatternLayer = memo(function PatternLayer({ pattern, tile = 96 }: { pattern: PatternId; tile?: number }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  if (pattern === "none") return null;
  const source = PATTERN_SOURCES[pattern];
  const cols = box.w > 0 ? Math.ceil(box.w / tile) : 0;
  const rows = box.h > 0 ? Math.ceil(box.h / tile) : 0;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { overflow: "hidden", opacity: PATTERN_OPACITY }]}
      onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {Array.from({ length: rows * cols }, (_, i) => (
        <Image key={i} source={source} style={{ position: "absolute", left: (i % cols) * tile, top: Math.floor(i / cols) * tile, width: tile, height: tile, tintColor: OFFICIAL.snow }} />
      ))}
    </View>
  );
});
