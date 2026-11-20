/**
 * The pointing hand of a `tap` beat (docs/features/TUTORIAL_SPEC.md §4.1): a flat, chunky hand with one finger out, one clean outline
 * round the whole hand and the app's colours (the theme's, so dark mode follows). It is always upright and comes from below, with
 * the fingertip on the control (`HAND_TIP`); the shapes are in `hand-art.ts`.
 */

import { memo } from "react";
import Svg, { G, Line, Rect } from "react-native-svg";

import { CREASES, HAND_SHAPES, HAND_VIEWBOX, OUTLINE, type HandRect } from "@/components/tutorial/hand-art";
import { useTheme } from "@/theme";

export { HAND_TIP } from "@/components/tutorial/hand-art";
export const HAND_SIZE = { w: HAND_VIEWBOX.w, h: HAND_VIEWBOX.h } as const;

const shape = (s: HandRect, grow: number, fill: string, key: string) => (
  <G key={key} rotation={s.turn ?? 0} originX={s.x + s.w / 2} originY={s.y + s.h / 2}>
    <Rect x={s.x - grow} y={s.y - grow} width={s.w + grow * 2} height={s.h + grow * 2} rx={s.r + grow} fill={fill} />
  </G>
);

export const PointingHand = memo(function PointingHand() {
  const { theme } = useTheme();
  const fill = theme.colors.surface;
  const ink = theme.colors.text;
  return (
    <Svg width={HAND_SIZE.w} height={HAND_SIZE.h} viewBox={`0 0 ${HAND_VIEWBOX.w} ${HAND_VIEWBOX.h}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* the outline: every shape grown, in the ink colour */}
      {HAND_SHAPES.map((s, i) => shape(s, OUTLINE, ink, `o${i}`))}
      {/* the hand: every shape in the fill, on top */}
      {HAND_SHAPES.map((s, i) => shape(s, 0, fill, `f${i}`))}
      {CREASES.map((l, i) => (
        <Line key={`c${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={ink} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
      ))}
    </Svg>
  );
});
