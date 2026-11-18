/**
 * AchievementBadge — the picture for one level of an achievement. A level that is not earned yet
 * is dimmed.
 */

import React from "react";
import { Image } from "react-native";

import { badgeImage } from "@/components/achievements/badge-images";
import type { AchievementTrack } from "@/services/achievements-core";

export const AchievementBadge = ({
  track,
  level,
  size,
  earned = true,
}: {
  track: AchievementTrack;
  /** 1-based badge level to draw. */
  level: number;
  size: number;
  earned?: boolean;
}) => (
  <Image
    source={badgeImage(track, level)}
    style={{ width: size, height: size, opacity: earned ? 1 : 0.35 }}
    resizeMode="contain"
    accessibilityIgnoresInvertColors
    accessible={false}
  />
);
