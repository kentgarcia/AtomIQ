/**
 * Badge pictures, one per level, for each achievement track. Metro needs literal require()
 * paths, so they are listed here. Folders under `assets/images/badge/`.
 */

/* eslint-disable @typescript-eslint/no-require-imports -- Metro bundles images by literal path */

import type { ImageSourcePropType } from "react-native";

import type { AchievementTrack } from "@/services/achievements-core";

const BADGES: Record<AchievementTrack["badgeDir"], readonly ImageSourcePropType[]> = {
  "lessons-learned": [
    require("@/assets/images/badge/lessons-learned/1.png"),
    require("@/assets/images/badge/lessons-learned/2.png"),
    require("@/assets/images/badge/lessons-learned/3.png"),
    require("@/assets/images/badge/lessons-learned/4.png"),
    require("@/assets/images/badge/lessons-learned/5.png"),
    require("@/assets/images/badge/lessons-learned/6.png"),
    require("@/assets/images/badge/lessons-learned/7.png"),
    require("@/assets/images/badge/lessons-learned/8.png"),
    require("@/assets/images/badge/lessons-learned/9.png"),
    require("@/assets/images/badge/lessons-learned/10.png"),
    require("@/assets/images/badge/lessons-learned/11.png"),
    require("@/assets/images/badge/lessons-learned/12.png"),
  ],
  "myth-buster": [
    require("@/assets/images/badge/myth-buster/1.png"),
    require("@/assets/images/badge/myth-buster/2.png"),
    require("@/assets/images/badge/myth-buster/3.png"),
    require("@/assets/images/badge/myth-buster/4.png"),
    require("@/assets/images/badge/myth-buster/5.png"),
    require("@/assets/images/badge/myth-buster/6.png"),
    require("@/assets/images/badge/myth-buster/7.png"),
    require("@/assets/images/badge/myth-buster/8.png"),
    require("@/assets/images/badge/myth-buster/9.png"),
    require("@/assets/images/badge/myth-buster/10.png"),
    require("@/assets/images/badge/myth-buster/11.png"),
    require("@/assets/images/badge/myth-buster/12.png"),
  ],
  "streak": [
    require("@/assets/images/badge/streak/1.png"),
    require("@/assets/images/badge/streak/2.png"),
    require("@/assets/images/badge/streak/3.png"),
    require("@/assets/images/badge/streak/4.png"),
    require("@/assets/images/badge/streak/5.png"),
    require("@/assets/images/badge/streak/6.png"),
    require("@/assets/images/badge/streak/7.png"),
    require("@/assets/images/badge/streak/8.png"),
    require("@/assets/images/badge/streak/9.png"),
    require("@/assets/images/badge/streak/10.png"),
    require("@/assets/images/badge/streak/11.png"),
    require("@/assets/images/badge/streak/12.png"),
  ],
  "xp": [
    require("@/assets/images/badge/xp/1.png"),
    require("@/assets/images/badge/xp/2.png"),
    require("@/assets/images/badge/xp/3.png"),
    require("@/assets/images/badge/xp/4.png"),
    require("@/assets/images/badge/xp/5.png"),
    require("@/assets/images/badge/xp/6.png"),
    require("@/assets/images/badge/xp/7.png"),
    require("@/assets/images/badge/xp/8.png"),
    require("@/assets/images/badge/xp/9.png"),
    require("@/assets/images/badge/xp/10.png"),
    require("@/assets/images/badge/xp/11.png"),
    require("@/assets/images/badge/xp/12.png"),
  ],
  "quests-claimed": [
    require("@/assets/images/badge/quests-claimed/1.png"),
    require("@/assets/images/badge/quests-claimed/2.png"),
    require("@/assets/images/badge/quests-claimed/3.png"),
    require("@/assets/images/badge/quests-claimed/4.png"),
    require("@/assets/images/badge/quests-claimed/5.png"),
    require("@/assets/images/badge/quests-claimed/6.png"),
    require("@/assets/images/badge/quests-claimed/7.png"),
    require("@/assets/images/badge/quests-claimed/8.png"),
    require("@/assets/images/badge/quests-claimed/9.png"),
    require("@/assets/images/badge/quests-claimed/10.png"),
    require("@/assets/images/badge/quests-claimed/11.png"),
    require("@/assets/images/badge/quests-claimed/12.png"),
  ],
  "level-reached": [
    require("@/assets/images/badge/level-reached/1.png"),
    require("@/assets/images/badge/level-reached/2.png"),
    require("@/assets/images/badge/level-reached/3.png"),
    require("@/assets/images/badge/level-reached/4.png"),
    require("@/assets/images/badge/level-reached/5.png"),
    require("@/assets/images/badge/level-reached/6.png"),
    require("@/assets/images/badge/level-reached/7.png"),
    require("@/assets/images/badge/level-reached/8.png"),
    require("@/assets/images/badge/level-reached/9.png"),
    require("@/assets/images/badge/level-reached/10.png"),
    require("@/assets/images/badge/level-reached/11.png"),
    require("@/assets/images/badge/level-reached/12.png"),
  ],
  "cosmetics-owned": [
    require("@/assets/images/badge/cosmetics-owned/1.png"),
    require("@/assets/images/badge/cosmetics-owned/2.png"),
    require("@/assets/images/badge/cosmetics-owned/3.png"),
    require("@/assets/images/badge/cosmetics-owned/4.png"),
    require("@/assets/images/badge/cosmetics-owned/5.png"),
    require("@/assets/images/badge/cosmetics-owned/6.png"),
    require("@/assets/images/badge/cosmetics-owned/7.png"),
    require("@/assets/images/badge/cosmetics-owned/8.png"),
    require("@/assets/images/badge/cosmetics-owned/9.png"),
    require("@/assets/images/badge/cosmetics-owned/10.png"),
    require("@/assets/images/badge/cosmetics-owned/11.png"),
    require("@/assets/images/badge/cosmetics-owned/12.png"),
  ],
  "diamonds-spent": [
    require("@/assets/images/badge/diamonds-spent/1.png"),
    require("@/assets/images/badge/diamonds-spent/2.png"),
    require("@/assets/images/badge/diamonds-spent/3.png"),
    require("@/assets/images/badge/diamonds-spent/4.png"),
    require("@/assets/images/badge/diamonds-spent/5.png"),
    require("@/assets/images/badge/diamonds-spent/6.png"),
    require("@/assets/images/badge/diamonds-spent/7.png"),
    require("@/assets/images/badge/diamonds-spent/8.png"),
    require("@/assets/images/badge/diamonds-spent/9.png"),
    require("@/assets/images/badge/diamonds-spent/10.png"),
    require("@/assets/images/badge/diamonds-spent/11.png"),
    require("@/assets/images/badge/diamonds-spent/12.png"),
  ],
};

/** The picture for a level (1-based); levels past the last picture use the last one. */
export const badgeImage = (track: AchievementTrack, level: number): ImageSourcePropType => {
  const list = BADGES[track.badgeDir];
  return list[Math.min(Math.max(1, Math.floor(level)), list.length) - 1];
};
