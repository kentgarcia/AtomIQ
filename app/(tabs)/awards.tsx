/**
 * Games — "Pick a Game" springy picker (replaces the Awards page).
 */

import { useRenderTimer } from "@/components/dev/render-timer";
import { PickAGame } from "@/components/games/PickAGame";
import React from "react";

export default function GamesScreen() {
  useRenderTimer("/awards");
    return <PickAGame />;
}
