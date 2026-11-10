import { MarkdownText } from "@/components/markdown-text";
import { getContentImage } from "@/components/community/image-source";
import { Icon } from "@/components/ui/icon";
import { getArticleById, getPostById } from "@/content/articles";
import {useTheme, type Palette, fontFamilies, useResponsiveLayout} from "@/theme";
import { openExternalUrl } from "@/services/open-url";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type ReaderContent = {
  title: string;
  content: string;
  category: string;
  subtitle?: string;
  readTime?: number;
  difficulty?: string;
  author: { name: string; avatar?: any; title?: string };
  publishedDate: string;
  image?: any;
  source?: string;
  sourceUrl?: string;
  tags?: string[];
};

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const THEME = theme.palettes.article;
  const { width } = useWindowDimensions();
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const imageWidth = Math.min(width, contentMaxWidth);
  const styles = React.useMemo(() => createStyles(THEME, imageWidth), [THEME, imageWidth]);
  const articleId = typeof id === "string" ? id.replace("article-", "") : "";

  // Articles and posts live in the content database — resolve asynchronously.
  const [article, setArticle] = useState<ReaderContent | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    setLoaded(false);
    setArticle(null);
    Promise.all([getArticleById(articleId), getPostById(articleId)]).then(
      ([foundArticle, foundPost]) => {
        if (!alive) return;
        setArticle((foundArticle || foundPost) as ReaderContent | null);
        setLoaded(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [articleId]);

  if (!article) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: THEME.bg }]}>
        <View style={styles.errorContainer}>
          <Icon name="Danger" size={64} color={THEME.primary} />
          <Text style={styles.errorText}>
            {loaded ? "Article not found" : "Loading…"}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleOpenSource = async () => {
    if (!article.sourceUrl) return;
    const opened = await openExternalUrl(article.sourceUrl);
    if (!opened) {
      Alert.alert(
        "Unable to open link",
        "No browser is available right now. Please try again in a moment.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: gutter,
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="ArrowLeft" size={24} color={THEME.text} />
        </TouchableOpacity>
        {article.sourceUrl && (
          <TouchableOpacity
            style={styles.externalLinkButton}
            onPress={handleOpenSource}
            hitSlop={4}
            accessibilityRole="link"
            accessibilityLabel="Open article source"
          >
            <Icon name="Link" size={20} color={THEME.primary} />
            <Text style={styles.externalLinkText}>Open Source</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        {article.image && (
          <Animated.View entering={FadeInDown.delay(100)}>
            <Image
              source={getContentImage(article.image)}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </Animated.View>
        )}

        {/* Article Header */}
        <Animated.View
          entering={FadeInDown.delay(200)}
          style={styles.articleHeader}
        >
          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {article.category.toUpperCase()}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{article.title}</Text>

          {/* Subtitle */}
          {article.subtitle && (
            <Text style={styles.subtitle}>{article.subtitle}</Text>
          )}

          {/* Author Info */}
          <View style={styles.authorSection}>
            <View style={styles.authorAvatar}>
              {article.author.avatar ? (
                <Image
                  source={getContentImage(article.author.avatar)}
                  style={styles.avatarImage}
                />
              ) : (
                <Icon name="Profile" size={24} color={THEME.primary} />
              )}
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{article.author.name}</Text>
              {article.author.title && (
                <Text style={styles.authorTitle}>{article.author.title}</Text>
              )}
            </View>
            <View style={styles.metaInfo}>
              {article.readTime && (
                <View style={styles.metaItem}>
                  <Icon name="Clock" size={14} color={THEME.textMuted} />
                  <Text style={styles.metaText}>
                    {article.readTime} min read
                  </Text>
                </View>
              )}
              {article.difficulty && (
                <View style={styles.metaItem}>
                  <Icon name="InfoCircle" size={14} color={THEME.textMuted} />
                  <Text style={styles.metaText}>{article.difficulty}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Published Date */}
          <Text style={styles.publishedDate}>
            Published{" "}
            {new Date(article.publishedDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </Animated.View>

        {/* Article Content */}
        <Animated.View
          entering={FadeInDown.delay(300)}
          style={styles.contentContainer}
        >
          <MarkdownText text={article.content} textColor={THEME.text} />
        </Animated.View>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(400)}
            style={styles.tagsSection}
          >
            <Text style={styles.tagsTitle}>Tags</Text>
            <View style={styles.tagsRow}>
              {article.tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Source */}
        {article.source && (
          <Animated.View
            entering={FadeInDown.delay(500)}
            style={styles.sourceSection}
          >
            <View style={styles.sourceHeader}>
              <Icon name="Link" size={16} color={THEME.primary} />
              <Text style={styles.sourceTitle}>Source</Text>
            </View>
            <Text style={styles.sourceText}>{article.source}</Text>
            {article.sourceUrl && (
              <TouchableOpacity
                style={styles.sourceLinkButton}
                onPress={handleOpenSource}
              >
                <Text style={styles.sourceLinkText}>Visit Source Website</Text>
                <Icon name="ArrowRight" size={16} color={THEME.primary} />
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Palette, width: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    errorText: {
      fontSize: 18,
      fontFamily: fontFamilies.bold,
      color: theme.text,
      marginTop: 16,
      marginBottom: 24,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      padding: 8,
    },
    backButtonText: {
      fontSize: 16,
      fontFamily: fontFamilies.bold,
      color: theme.primary,
    },
    externalLinkButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.bg,
      borderRadius: 8,
    },
    externalLinkText: {
      fontSize: 13,
      fontFamily: fontFamilies.bold,
      color: theme.primary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    heroImage: {
      width: width,
      height: 250,
      backgroundColor: theme.bg,
    },
    articleHeader: {
      padding: 20,
    },
    categoryBadge: {
      alignSelf: "flex-start",
      backgroundColor: theme.primary + "15",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginBottom: 12,
    },
    categoryText: {
      fontSize: 11,
      fontFamily: fontFamilies.heavy,
      color: theme.primary,
      letterSpacing: 0.5,
    },
    title: {
      fontSize: 28,
      fontFamily: fontFamilies.heavy,
      color: theme.text,
      lineHeight: 36,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 18,
      fontFamily: fontFamilies.semibold,
      color: theme.textMuted,
      lineHeight: 26,
      marginBottom: 20,
    },
    authorSection: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    authorAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.bg,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    authorInfo: {
      flex: 1,
    },
    authorName: {
      fontSize: 16,
      fontFamily: fontFamilies.bold,
      color: theme.text,
      marginBottom: 2,
    },
    authorTitle: {
      fontSize: 13,
      fontFamily: fontFamilies.regular,
      color: theme.textMuted,
    },
    metaInfo: {
      gap: 8,
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      color: theme.textMuted,
      fontFamily: fontFamilies.semibold,
    },
    publishedDate: {
      fontSize: 13,
      color: theme.textMuted,
      fontFamily: fontFamilies.semibold,
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    tagsSection: {
      paddingHorizontal: 20,
      paddingTop: 24,
    },
    tagsTitle: {
      fontSize: 14,
      fontFamily: fontFamilies.heavy,
      color: theme.text,
      marginBottom: 12,
    },
    tagsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    tagChip: {
      backgroundColor: theme.bg,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    tagText: {
      fontSize: 13,
      fontFamily: fontFamilies.semibold,
      color: theme.textMuted,
    },
    sourceSection: {
      marginTop: 24,
      marginHorizontal: 20,
      padding: 16,
      backgroundColor: theme.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sourceHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    sourceTitle: {
      fontSize: 13,
      fontFamily: fontFamilies.heavy,
      color: theme.text,
    },
    sourceText: {
      fontSize: 14,
      fontFamily: fontFamilies.regular,
      color: theme.text,
      marginBottom: 12,
    },
    sourceLinkButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
    },
    sourceLinkText: {
      fontSize: 14,
      fontFamily: fontFamilies.bold,
      color: theme.primary,
    },
    bottomSpacing: {
      height: 40,
    },
  });
