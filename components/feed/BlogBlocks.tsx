/**
 * The body of a blog piece (docs/features/NPC_FEED_SPEC.md §4.3, §6): a small fixed set of blocks, each a
 * hardcoded component like the lesson cards. `p` paragraph, `h` heading, `quote` (set large, with the
 * author's head), `fact` ("Did you know?" callout), `figure` (a full scene, or a lesson object picture, and a caption),
 * `list`, and `next` (the closing teaser with a button that opens a lesson or the unit).
 * One calm column; it reads at large text sizes because nothing has a fixed height.
 */

import { useRouter } from "expo-router";
import { memo } from "react";
import { View } from "react-native";

import { BlogArt } from "@/components/feed/BlogArt";
import { isBlogSceneId } from "@/components/feed/blog-art";
import { NpcHead } from "@/components/feed/NpcHead";
import { nextTarget } from "@/components/feed/feed-ui-core";
import { openFeedTarget } from "@/components/feed/navigate";
import { ObjectArt } from "@/components/lesson/visual/ObjectArt";
import { isArtId } from "@/components/lesson/visual/object-art";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { Npc } from "@/content/npcs";
import type { BlogBlock } from "@/content/types";
import { impactLight } from "@/services/haptics";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    column: { gap: 18 },
    p: { fontSize: 18, lineHeight: 29, ...fontFaces.book, color: c.text },
    h: { fontSize: 24, lineHeight: 30, marginTop: 10, ...fontFaces.heavy, color: c.text },
    /* The author's line is said in a soft bubble, like a feed post */
    quote: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 24, backgroundColor: withAlpha(c.primary, 0.12) },
    quoteText: { flex: 1, fontSize: 21, lineHeight: 29, ...fontFaces.heavy, color: c.text },
    factTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
    factLabel: { fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", ...fontFaces.heavy, color: c.info },
    factText: { fontSize: 16, lineHeight: 24, ...fontFaces.medium, color: c.text },
    figure: { alignItems: "center", gap: 8 },
    figurePlate: { width: "100%", alignItems: "center", justifyContent: "center", paddingVertical: 20, borderRadius: 20, backgroundColor: withAlpha(c.primary, 0.12) },
    /* The scene is drawn 5:3, so the whole of it shows at any width */
    figureScene: { width: "100%", aspectRatio: 5 / 3, borderRadius: 20, overflow: "hidden" },
    caption: { fontSize: 14, lineHeight: 20, textAlign: "center", ...fontFaces.medium, color: c.textMuted },
    list: { gap: 10 },
    item: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    bullet: { width: 8, height: 8, borderRadius: 4, marginTop: 10, backgroundColor: c.primary },
    itemText: { flex: 1, fontSize: 18, lineHeight: 28, ...fontFaces.book, color: c.text },
    next: { gap: 12 },
    nextText: { fontSize: 17, lineHeight: 25, ...fontFaces.bold, color: c.text },
  };
});

export interface BlogBlocksProps {
  blocks: readonly BlogBlock[];
  /** The author: speaks the quotes. */
  author: Npc | null;
}

export const BlogBlocks = memo(function BlogBlocks({ blocks, author }: BlogBlocksProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useStyles(theme);

  return (
    <View style={styles.column}>
      {blocks.map((block, i) => {
        switch (block.t) {
          case "p":
            return (
              <Text key={i} style={styles.p}>
                {block.text}
              </Text>
            );
          case "h":
            return (
              <Text key={i} style={styles.h} accessibilityRole="header">
                {block.text}
              </Text>
            );
          case "quote":
            return (
              <View key={i} style={styles.quote} accessible accessibilityLabel={`${author?.name ?? "The author"} says: ${block.text}`}>
                <NpcHead npc={author} size={48} />
                <Text style={styles.quoteText}>{block.text}</Text>
              </View>
            );
          case "fact":
            return (
              <Card key={i} tone="info" gap={8}>
                <View style={styles.factTitle}>
                  <Icon name="InfoCircle" size={18} color={theme.colors.info} variant="Bold" />
                  <Text style={styles.factLabel} accessibilityRole="header">
                    Did you know?
                  </Text>
                </View>
                <Text style={styles.factText}>{block.text}</Text>
              </Card>
            );
          case "figure":
            return (
              <View key={i} style={styles.figure} accessible accessibilityRole="image" accessibilityLabel={block.caption}>
                {isBlogSceneId(block.ref) ? (
                  <View style={styles.figureScene}>
                    <BlogArt id={block.ref} height="fill" />
                  </View>
                ) : isArtId(block.ref) ? (
                  <View style={styles.figurePlate}>
                    <ObjectArt id={block.ref} size={150} />
                  </View>
                ) : null}
                <Text style={styles.caption}>{block.caption}</Text>
              </View>
            );
          case "list":
            return (
              <View key={i} style={styles.list} accessibilityRole="list">
                {block.items.map((item, j) => (
                  <View key={j} style={styles.item}>
                    <View style={styles.bullet} accessible={false} />
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            );
          case "next": {
            const target = nextTarget(block);
            return (
              <View key={i} style={styles.next}>
                {target ? (
                  <Button
                    label={block.label}
                    onPress={() => {
                      impactLight();
                      openFeedTarget(router, target);
                    }}
                  />
                ) : (
                  <Text style={styles.nextText}>{block.label}</Text>
                )}
              </View>
            );
          }
          default:
            return null;
        }
      })}
    </View>
  );
});
