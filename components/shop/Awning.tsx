/**
 * The shop's roof: a red and white striped awning across the top of the screen with a scalloped edge
 * (geometry in `awning-core.ts`). The straight part is as tall as the safe-area inset plus a band, so
 * it covers the status bar. Fixed colours from the shared palette, like the avatar: the same in light
 * and dark mode. Decorative: hidden from screen readers.
 */

import { memo, useMemo } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { OFFICIAL as O } from "@/components/npc/npc-palette";

import { awningHeight, awningStripes, stripeCount } from "./awning-core";

/** Stripe colours and the one-step-darker shade each shows as under the scallops. */
const STRIPES = [
  { face: O.cardinal, shade: O.fireAnt },
  { face: O.snow, shade: O.swan },
] as const;

/** The band under the safe-area inset, and the thickness shown under the scallops. */
export const AWNING_BAND = 12;
export const AWNING_LIP = 4;

export const Awning = memo(function Awning({ width, topInset }: { width: number; topInset: number }) {
  const body = topInset + AWNING_BAND;
  const count = useMemo(() => stripeCount(width), [width]);
  const height = awningHeight(body, AWNING_LIP);
  const faces = useMemo(() => awningStripes(width, count, body), [width, count, body]);
  const lips = useMemo(() => awningStripes(width, count, body, AWNING_LIP), [width, count, body]);

  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={{ position: "absolute", top: 0, left: 0, width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {lips.map((s) => (
          <Path key={`l${s.index}`} d={s.d} fill={STRIPES[s.index % 2].shade} />
        ))}
        {faces.map((s) => (
          <Path key={`f${s.index}`} d={s.d} fill={STRIPES[s.index % 2].face} />
        ))}
      </Svg>
    </View>
  );
});
