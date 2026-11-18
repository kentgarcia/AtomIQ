/**
 * A nucleus drawn as a packed cluster of protons and neutrons (flat tokens with a lip, the lesson
 * palette). Static: nothing here animates, so it is safe with reduced motion and on Android.
 * Used by the unit 2 simulations.
 */

import { useMemo } from "react";
import Svg, { Circle, G } from "react-native-svg";

import { useTheme } from "@/theme";

import { duoShade, lipFor } from "../visual/duo-palette";

const GOLDEN = 2.39996;

export interface NucleusArtProps {
  protons: number;
  neutrons: number;
  size: number;
  /** A ring around the nucleus: it is unstable. */
  ring?: "warning" | "success" | "danger" | "neutral";
}

export function NucleusArt({ protons, neutrons, size, ring }: NucleusArtProps) {
  const { theme } = useTheme();
  const total = protons + neutrons;
  const spots = useMemo(() => {
    const list: { x: number; y: number; proton: boolean }[] = [];
    for (let i = 0; i < total; i++) {
      const proton = Math.floor(((i + 1) * protons) / total) > Math.floor((i * protons) / total);
      const r = 8.2 * Math.sqrt(i);
      list.push({ x: 50 + r * Math.cos(i * GOLDEN), y: 50 + r * Math.sin(i * GOLDEN), proton });
    }
    return list;
  }, [protons, total]);

  const proton = duoShade("danger", theme.mode);
  const neutron = duoShade("neutral", theme.mode);
  const ringPaint = ring ? duoShade(ring, theme.mode) : null;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {ringPaint ? <Circle cx={50} cy={50} r={47} fill="none" stroke={ringPaint.face} strokeWidth={2.4} strokeDasharray="4 3" /> : null}
      {spots.map((p, i) => {
        const paint = p.proton ? proton : neutron;
        const r = 7;
        return (
          <G key={i}>
            <Circle cx={p.x} cy={p.y + lipFor(r)} r={r} fill={paint.lip} />
            <Circle cx={p.x} cy={p.y} r={r} fill={paint.face} />
          </G>
        );
      })}
    </Svg>
  );
}
