/**
 * A blog piece's cover: a full flat scene (blog-art.ts) when the piece has one, never a photo. An id with
 * no scene shows its lesson object picture on a soft tinted plate, and an id that is not in the object art
 * either falls back to a book, so a card never has a hole.
 */

import { memo } from "react";
import { View } from "react-native";

import { BlogArt } from "@/components/feed/BlogArt";
import { isBlogSceneId } from "@/components/feed/blog-art";
import { ObjectArt } from "@/components/lesson/visual/ObjectArt";
import { isArtId } from "@/components/lesson/visual/object-art";
import { Icon } from "@/components/ui/icon";
import { createStyles, useTheme, withAlpha } from "@/theme";

const useStyles = createStyles((theme) => ({
  plate: { alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(theme.colors.primary, 0.12) },
}));

/** `width` is the box's width when it is fixed (a card's square cover); the reader's cover fills its row. */
export const BlogCover = memo(function BlogCover({ cover, height = 140, width, art = 104 }: { cover: string; height?: number; width?: number; art?: number }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  if (isBlogSceneId(cover)) return <BlogArt id={cover} width={width} height={height} />;
  return (
    <View style={[styles.plate, { height }]} accessible={false} importantForAccessibility="no-hide-descendants">
      {isArtId(cover) ? <ObjectArt id={cover} size={art} /> : <Icon name="Book1" size={art * 0.6} color={theme.colors.primary} variant="Bold" />}
    </View>
  );
});
