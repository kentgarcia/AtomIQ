/**
 * One photo drawn from its composition (photo-core.ts): the flat scene (photo-scenes.ts), the learner's avatar standing in it and, beside them,
 * Shrodi or a teacher, in a frame. Used live in the viewfinder, small in the gallery and large in the viewer. Figures are drawn waist-up
 * from the bottom edge, and the scene's foreground (a hedge, a wall, a bench, a stage lip) is drawn over them so they stand behind it
 * and never look cropped.
 */

import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg from "react-native-svg";

import { avatarSpec, normalizeAvatar } from "@/components/avatar/avatar-core";
import { useCast } from "@/components/feed/use-cast";
import { Shrodi, type ShrodiProps } from "@/components/mascot/Shrodi";
import { Npc } from "@/components/npc/Npc";
import type { PoseId } from "@/components/npc/npc-art";
import { Shape } from "@/components/scanner/ScannerScene";

import { SHRODI_ID, type PhotoConfig, type PhotoPose } from "./photo-core";
import {
  PHOTO_FRAME,
  PHOTO_FRAME_STYLE,
  PHOTO_SCENE_BY_ID,
} from "./photo-scenes";

/** The mascot's mood for each pose. */
const SHRODI_MOOD: Record<PhotoPose, NonNullable<ShrodiProps["mood"]>> = {
  idle: "idle",
  greet: "wave",
  cheer: "cheer",
  proud: "happy",
  think: "think",
};

/** The figure `hero` form is 350 x 380 drawing units. */
const HERO_ASPECT = 350 / 380;

/** How tall a photo of `width` is, frame included. */
export function photoHeight(
  config: Pick<PhotoConfig, "frame">,
  width: number,
): number {
  const f = PHOTO_FRAME_STYLE[config.frame];
  const inner = width * (1 - (f ? f.side * 2 : 0));
  return (
    inner * (PHOTO_FRAME.h / PHOTO_FRAME.w) +
    (f ? width * (f.side + f.bottom) : 0)
  );
}

export const PhotoView = memo(function PhotoView({
  config,
  width,
  live = false,
}: {
  config: PhotoConfig;
  width: number;
  live?: boolean;
}) {
  const cast = useCast();
  const f = PHOTO_FRAME_STYLE[config.frame];
  const pad = f ? width * f.side : 0;
  const inner = width - pad * 2;
  const innerH = inner * (PHOTO_FRAME.h / PHOTO_FRAME.w);
  const scene = PHOTO_SCENE_BY_ID[config.scene];
  const spec = useMemo(
    () => avatarSpec(normalizeAvatar(config.avatar)),
    [config.avatar],
  );

  const companionNpc =
    config.companion && config.companion !== SHRODI_ID
      ? cast.get(config.companion)
      : undefined;
  const hasCompanion = config.companion === SHRODI_ID || !!companionNpc;
  // Alone the learner fills the middle; with someone beside them each takes half
  const figureH = hasCompanion ? innerH * 0.52 : innerH * 0.72;
  const figureW = figureH * HERO_ASPECT;

  return (
    <View
      style={{
        width,
        height: photoHeight(config, width),
        backgroundColor: f?.color,
        paddingHorizontal: pad,
        paddingTop: pad,
      }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View style={{ width: inner, height: innerH, overflow: "hidden" }}>
        <Svg
          width={inner}
          height={innerH}
          viewBox={`0 0 ${PHOTO_FRAME.w} ${PHOTO_FRAME.h}`}
          style={StyleSheet.absoluteFill}
        >
          {scene.shapes.map((s, i) => (
            <Shape key={i} s={s} />
          ))}
        </Svg>
        <Npc
          spec={spec}
          form="hero"
          pose={config.pose as PoseId}
          size={figureH}
          live={live}
          style={{
            position: "absolute",
            bottom: 0,
            left: hasCompanion ? inner * 0.02 : (inner - figureW) / 2,
          }}
        />
        {companionNpc ? (
          <Npc
            spec={companionNpc.spec}
            form="hero"
            pose={config.companionPose as PoseId}
            size={figureH}
            live={live}
            style={{ position: "absolute", bottom: 0, right: inner * 0.02 }}
          />
        ) : null}
        {config.companion === SHRODI_ID ? (
          <View
            style={{ position: "absolute", bottom: 0, right: inner * 0.04 }}
          >
            <Shrodi
              mood={SHRODI_MOOD[config.companionPose]}
              size={figureH * 0.9}
              live={live}
            />
          </View>
        ) : null}
        <Svg
          width={inner}
          height={innerH}
          viewBox={`0 0 ${PHOTO_FRAME.w} ${PHOTO_FRAME.h}`}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {scene.front.map((s, i) => (
            <Shape key={i} s={s} />
          ))}
        </Svg>
      </View>
    </View>
  );
});
