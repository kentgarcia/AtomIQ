/**
 * The four reaction glyphs, drawn with registry icons (no emoji font). Each has its own shape and a
 * name, so no reaction relies on colour alone; the colour only helps.
 */

import { Icon } from "@/components/ui/icon";
import type { Reaction } from "@/content/types";
import { useTheme } from "@/theme";

export const REACTION_ICONS: Record<Reaction, string> = {
  like: "Like1",
  love: "Heart",
  clap: "MagicStar",
  wow: "Flash",
};

export function useReactionColors(): Record<Reaction, string> {
  const c = useTheme().theme.colors;
  return { like: c.info, love: c.error, clap: c.warning, wow: c.primary };
}

export function ReactionGlyph({ reaction, size = 18, color, filled = true }: { reaction: Reaction; size?: number; color?: string; filled?: boolean }) {
  const colors = useReactionColors();
  return <Icon name={REACTION_ICONS[reaction]} size={size} color={color ?? colors[reaction]} variant={filled ? "Bold" : "Linear"} />;
}
