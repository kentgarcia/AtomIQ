/**
 * A video call with the teacher: a rounded tinted tile that fills the room it is given, the teacher big
 * at its bottom (head and chest, idling) and their speech bubble right above the head, its tail
 * pointing down at them. The teacher is sized to what is left under the bubble, so the head always sits
 * close to it, on a tall phone or a short one. `children` is what is said. Decorative figure; the words
 * are real text.
 */

import { useState, type ReactNode } from "react";
import { View, type LayoutChangeEvent } from "react-native";

import { TeacherAvatar, type Teller } from "@/components/lesson/Conversation";
import { BubbleTail } from "@/components/npc/SpeechBubble";
import { Card } from "@/components/ui/card";
import { createStyles, radius, spacing, useTheme } from "@/theme";

const MIN_AVATAR = 220;
const MAX_AVATAR = 460;
/** The teacher's width over their height (the head form's drawing). */
const WIDTH_PER_HEIGHT = 200 / 252;

const useStyles = createStyles((theme) => ({
  tile: {
    flexGrow: 1,
    borderRadius: radius.xl,
    overflow: "hidden",
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: theme.colors.primarySurface,
  },
  bubble: { alignSelf: "stretch", paddingHorizontal: spacing.md },
}));

/** How big the teacher can be in a tile of this size under a bubble of this height. */
export function stageAvatarSize(tileWidth: number, tileHeight: number, bubbleHeight: number): number {
  if (!tileHeight) return 260;
  const room = tileHeight - bubbleHeight - spacing.md;
  const byWidth = tileWidth ? tileWidth / WIDTH_PER_HEIGHT : MAX_AVATAR;
  return Math.round(Math.max(MIN_AVATAR, Math.min(MAX_AVATAR, byWidth, room)));
}

export function TeacherStage({ teller, children, minHeight = 460, fill = true }: { teller: Teller | null; children: ReactNode; minHeight?: number; fill?: boolean }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const [tile, setTile] = useState({ w: 0, h: 0 });
  const [bubbleH, setBubbleH] = useState(0);
  const onTile = (e: LayoutChangeEvent) => setTile({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  return (
    <View style={[styles.tile, { minHeight }, fill ? null : { flexGrow: 0 }]} onLayout={onTile}>
      <View style={styles.bubble} onLayout={(e: LayoutChangeEvent) => setBubbleH(e.nativeEvent.layout.height)}>
        <Card padding={spacing.lg} gap={spacing.sm}>
          {children}
        </Card>
        <BubbleTail />
      </View>
      <TeacherAvatar size={stageAvatarSize(tile.w, tile.h, bubbleH)} teller={teller} />
    </View>
  );
}
