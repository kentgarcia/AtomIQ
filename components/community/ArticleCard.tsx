/**
 * ArticleCard — one article/post card in the Discovery Hub grid.
 *
 * Memoised on (item, bookmarked, handlers) so typing in search, scrolling or
 * bookmarking another card does not re-render it. Images are card-sized
 * thumbnails decoded and cached by expo-image.
 */

import { Image } from "expo-image";
import React, { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { getContentThumbnail } from "@/components/community/image-source";
import { createStyles } from "@/components/community/styles";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/theme";

type Props = {
  item: any;
  bookmarked: boolean;
  onOpen: (item: any) => void;
  onToggleBookmark: (id: string) => void;
};

function ArticleCardBase({ item, bookmarked, onOpen, onToggleBookmark }: Props) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const imageSource = getContentThumbnail(item.image);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.galleryCard}
      onPress={() => onOpen(item)}
    >
      <View style={styles.galleryImageWrap}>
        {imageSource ? (
          <Image
            source={imageSource}
            style={styles.galleryImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={item.id}
            transition={120}
          />
        ) : (
          <View style={styles.galleryImagePlaceholder}>
            <Icon name="Atom" size={32} color={theme.colors.textMuted} />
          </View>
        )}
        <TouchableOpacity
          style={[styles.saveButton, bookmarked && styles.saveButtonActive]}
          onPress={() => onToggleBookmark(item.id)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={bookmarked ? "Remove from saved" : "Save story"}
        >
          <Icon
            name={bookmarked ? "Archive" : "ArchiveAdd"}
            size={16}
            color={bookmarked ? "#FFFFFF" : theme.colors.textMuted}
            variant="Bold"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.galleryBody}>
        <Text style={styles.galleryCategory}>
          {(item.category || "News").toUpperCase()}
        </Text>
        <Text style={styles.galleryTitle}>{item.title}</Text>
        <View style={styles.galleryMeta}>
          {item.author?.name && (
            <Text style={styles.galleryMetaText} numberOfLines={1}>
              {item.author.name}
            </Text>
          )}
          {item.readTime && (
            <View style={styles.galleryMetaItem}>
              <Icon name="Clock" size={12} color={theme.colors.textMuted} />
              <Text style={styles.galleryMetaText}>{item.readTime}m</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const ArticleCard = memo(ArticleCardBase);
