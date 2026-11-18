/**
 * A blog piece's cover: one lesson object picture (never a photo) on a soft tinted plate. An id that
 * is not in the object art falls back to a book, so a card never has a hole.
 */

import { memo } from "react";
import { View } from "react-native";

import { ObjectArt } from "@/components/lesson/visual/ObjectArt";
import { isArtId } from "@/components/lesson/visual/object-art";
import { Icon } from "@/components/ui/icon";
import { createStyles, useTheme, withAlpha } from "@/theme";

const useStyles = createStyles((theme) => ({
  plate: { alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(theme.colors.primary, 0.12) },
}));

export const BlogCover = memo(function BlogCover({ cover, height = 140, art = 104 }: { cover: string; height?: number; art?: number }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return (
    <View style={[styles.plate, { height }]} accessible={false} importantForAccessibility="no-hide-descendants">
      {isArtId(cover) ? <ObjectArt id={cover} size={art} /> : <Icon name="Book1" size={art * 0.6} color={theme.colors.primary} variant="Bold" />}
    </View>
  );
});
