/**
 * The flat world under the Nuclear Map's pins (docs/PHONE_SPEC.md §5.8): ocean and rounded land from `world-art.ts` in the lesson object
 * style (flat colour, the land's far side one step darker, no outlines). One Svg whose viewBox is the part of the world the view shows, so
 * it stays sharp at every zoom; it only redraws when a gesture ends. Fixed hues from the object art (theme exception EX-13).
 */

import React, { memo } from "react";
import Svg, { G, Path, Rect } from "react-native-svg";

import { CRUMB, GLASS, LEAF } from "../lesson/visual/object-art.ts";
import { scaleOf, type MapView } from "./map-core.ts";
import { WORLD_MAP } from "./world-art.ts";

export const OCEAN = GLASS[1];
export const LAND = LEAF[1];
export const LAND_SHADE = LEAF[2];
export const LAND_LIGHT = CRUMB[0];

function WorldLayerBase({ view, width, height }: { view: MapView; width: number; height: number }) {
  const s = scaleOf(view.k, width);
  const vw = width / s;
  const vh = height / s;
  const x0 = view.cx - vw / 2;
  const y0 = view.cy - vh / 2;
  const lip = 2.2 / s; // the land's darker side, a couple of dp, whatever the zoom
  return (
    <Svg width={width} height={height} viewBox={`${x0} ${y0} ${vw} ${vh}`} pointerEvents="none">
      <Rect x={x0 - 1} y={y0 - 1} width={vw + 2} height={vh + 2} fill={OCEAN} />
      <G x={lip * 0.6} y={lip}>
        {WORLD_MAP.land.map((d, i) => (
          <Path key={i} d={d} fill={LAND_SHADE} />
        ))}
      </G>
      {WORLD_MAP.land.map((d, i) => (
        <Path key={i} d={d} fill={LAND} />
      ))}
    </Svg>
  );
}

export const WorldLayer = memo(WorldLayerBase);
