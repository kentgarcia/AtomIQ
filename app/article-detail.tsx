import { MarkdownText } from "@/components/markdown-text";
import { getContentImage } from "@/components/community/image-source";
import { Icon } from "@/components/ui/icon";
import { getArticleById, getPostById } from "@/content/articles";
import type {
  ReviewStatus,
  SourceType,
  SummaryOrigin,
} from "@/content/articles";
import { getEncyclopediaEntryById } from "@/content/explorer";
import { getLessonById } from "@/content/lessons";
import {useTheme, type Palette, fontFaces, useResponsiveLayout} from "@/theme";
import { recordActivity } from "@/services/activity-log";
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
  // Research-pipeline metadata (docs/ARTICLE_PIPELINE.md)
  sourceType?: SourceType;
  sourceNote?: string;
  sourcePublishedDate?: string;
  reviewStatus?: ReviewStatus;
  lastReviewed?: string;
  summaryOrigin?: SummaryOrigin;
  relatedLessons?: string[];
  relatedConcepts?: string[];
  relatedElements?: string[];
};

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  "government-agency": "Government agency",
  "international-organization": "International organization",
  "research-institution": "Research institution",
  university: "University",
  "industry-association": "Industry association",
  "standards-body": "Standards body",
  "news-media": "News media",
  encyclopedia: "Encyclopedia",
  textbook: "Textbook",
  other: "Other",
};

const SUMMARY_ORIGIN_LABELS: Record<SummaryOrigin, string> = {
  original: "AtomIQ summary in our own words",
  adapted: "Adapted from the source",
  excerpt: "Close to the source text",
  unknown: "Summary",
};

/** Format an ISO date (YYYY-MM-DD) for display; falls back to the raw text. */
const formatIsoDate = (iso?: string): string => {
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

type RelatedLabel = { id: string; label: string };

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

  // Count as "read" only after the article is open and has had a few seconds
  // of attention — not on list render or an instant back-out.
  useEffect(() => {
    if (!article || !articleId) return;
    const timer = setTimeout(() => {
      recordActivity("article_read", { id: articleId });
    }, 5000);
    return () => clearTimeout(timer);
  }, [article, articleId]);

  // Remote images may fail (offline, blocked, dead link): degrade to a placeholder.
  const [heroFailed, setHeroFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => {
    setHeroFailed(false);
    setAvatarFailed(false);
  }, [articleId]);

  // Resolve related lesson/concept ids into readable, tappable labels.
  const [relatedLessons, setRelatedLessons] = useState<RelatedLabel[]>([]);
  const [relatedConcepts, setRelatedConcepts] = useState<RelatedLabel[]>([]);
  useEffect(() => {
    let alive = true;
    setRelatedLessons([]);
    setRelatedConcepts([]);
    if (!article) return;
    const resolveAll = async <T,>(
      ids: string[] | undefined,
      load: (id: string) => Promise<T | null | undefined>,
      label: (item: T) => string,
    ): Promise<RelatedLabel[]> => {
      const settled = await Promise.all(
        (ids ?? []).map(async (id) => {
          try {
            const item = await load(id);
            return item ? { id, label: label(item) } : null;
          } catch {
            return null;
          }
        }),
      );
      return settled.filter((entry): entry is RelatedLabel => entry !== null);
    };
    void resolveAll(article.relatedLessons, getLessonById, (l) => l.title).then(
      (items) => alive && setRelatedLessons(items),
    );
    void resolveAll(article.relatedConcepts, getEncyclopediaEntryById, (e) => e.term).then(
      (items) => alive && setRelatedConcepts(items),
    );
    return () => {
      alive = false;
    };
  }, [article]);

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
        "The source could not be opened. Check your internet connection and try again. The summary above is still available offline.",
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
            {heroFailed ? (
              <View
                style={[styles.heroImage, styles.heroPlaceholder]}
                accessibilityLabel="Image unavailable"
              >
                <Icon name="Gallery" size={40} color={THEME.textMuted} />
                <Text style={styles.heroPlaceholderText}>Image unavailable</Text>
              </View>
            ) : (
              <Image
                source={getContentImage(article.image)}
                style={styles.heroImage}
                resizeMode="cover"
                onError={() => setHeroFailed(true)}
              />
            )}
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
              {article.author.avatar && !avatarFailed ? (
                <Image
                  source={getContentImage(article.author.avatar)}
                  style={styles.avatarImage}
                  onError={() => setAvatarFailed(true)}
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
              {article.readTime ? (
                <View style={styles.metaItem}>
                  <Icon name="Clock" size={14} color={THEME.textMuted} />
                  <Text style={styles.metaText}>
                    {article.readTime} min read
                  </Text>
                </View>
              ) : null}
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
            Published {formatIsoDate(article.publishedDate)}
          </Text>
        </Animated.View>

        {/* Article Content */}
        <Animated.View
          entering={FadeInDown.delay(300)}
          style={styles.contentContainer}
        >
          <View style={styles.sectionLabelRow}>
            <Icon name="DocumentText" size={16} color={THEME.primary} />
            <Text style={styles.sectionLabel}>Summary</Text>
          </View>
          <Text style={styles.sectionCaption}>
            {SUMMARY_ORIGIN_LABELS[article.summaryOrigin ?? "unknown"]}
          </Text>
          <MarkdownText text={article.content} textColor={THEME.text} />
          <Text style={styles.summaryDisclaimer}>
            This is an educational summary. Read the source below for the full,
            authoritative text.
          </Text>
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

        {/* Related learning */}
        {(relatedLessons.length > 0 ||
          relatedConcepts.length > 0 ||
          (article.relatedElements?.length ?? 0) > 0) && (
          <Animated.View
            entering={FadeInDown.delay(450)}
            style={styles.tagsSection}
          >
            <Text style={styles.tagsTitle}>Related in AtomIQ</Text>
            <View style={styles.tagsRow}>
              {relatedLessons.map((lesson) => (
                <TouchableOpacity
                  key={`lesson-${lesson.id}`}
                  style={styles.relatedChip}
                  onPress={() => router.push(`/lesson/${lesson.id}`)}
                  accessibilityRole="link"
                  accessibilityLabel={`Open lesson ${lesson.label}`}
                >
                  <Icon name="Book" size={14} color={THEME.primary} />
                  <Text style={styles.relatedChipText}>{lesson.label}</Text>
                </TouchableOpacity>
              ))}
              {relatedConcepts.map((concept) => (
                <TouchableOpacity
                  key={`concept-${concept.id}`}
                  style={styles.relatedChip}
                  onPress={() =>
                    router.push(`/explorer/encyclopedia-entry?id=${concept.id}`)
                  }
                  accessibilityRole="link"
                  accessibilityLabel={`Open encyclopedia entry ${concept.label}`}
                >
                  <Icon name="SearchNormal1" size={14} color={THEME.primary} />
                  <Text style={styles.relatedChipText}>{concept.label}</Text>
                </TouchableOpacity>
              ))}
              {(article.relatedElements ?? []).map((symbol) => (
                <View key={`element-${symbol}`} style={styles.tagChip}>
                  <Text style={styles.tagText}>{symbol}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Source material, kept separate from the summary above */}
        {(article.source || article.sourceUrl) && (
          <Animated.View
            entering={FadeInDown.delay(500)}
            style={styles.sourceSection}
          >
            <View style={styles.sourceHeader}>
              <Icon name="Link" size={16} color={THEME.primary} />
              <Text style={styles.sourceTitle}>Source</Text>
            </View>
            {article.source ? (
              <Text style={styles.sourceName}>{article.source}</Text>
            ) : null}
            <View style={styles.sourceMetaRow}>
              {article.sourceType ? (
                <View style={styles.tagChip}>
                  <Text style={styles.tagText}>
                    {SOURCE_TYPE_LABELS[article.sourceType] ?? article.sourceType}
                  </Text>
                </View>
              ) : null}
              {article.sourcePublishedDate ? (
                <Text style={styles.sourceMetaText}>
                  Source published {formatIsoDate(article.sourcePublishedDate)}
                </Text>
              ) : null}
            </View>
            {article.sourceNote ? (
              <Text style={styles.sourceText}>{article.sourceNote}</Text>
            ) : null}
            {article.sourceUrl && (
              <TouchableOpacity
                style={styles.sourceLinkButton}
                onPress={handleOpenSource}
                accessibilityRole="link"
                accessibilityLabel="Open the source website"
              >
                <Text style={styles.sourceLinkText}>Open the source</Text>
                <Icon name="ArrowRight" size={16} color={THEME.primary} />
              </TouchableOpacity>
            )}
            {article.sourceUrl ? (
              <Text style={styles.sourceMetaText}>
                Opens in your browser and needs an internet connection.
              </Text>
            ) : null}
            <View style={styles.reviewRow}>
              <Icon
                name={article.reviewStatus === "reviewed" ? "TickCircle" : "InfoCircle"}
                size={16}
                color={
                  article.reviewStatus === "reviewed"
                    ? THEME.primary
                    : THEME.textMuted
                }
              />
              <Text style={styles.sourceMetaText}>
                {article.reviewStatus === "reviewed"
                  ? "Reviewed"
                  : "Not yet fully reviewed"}
                {article.lastReviewed
                  ? ` · last checked ${formatIsoDate(article.lastReviewed)}`
                  : ""}
              </Text>
            </View>
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
      ...fontFaces.bold,
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
      ...fontFaces.bold,
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
      ...fontFaces.bold,
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
      ...fontFaces.heavy,
      color: theme.primary,
      letterSpacing: 0.5,
    },
    title: {
      fontSize: 28,
      ...fontFaces.heavy,
      color: theme.text,
      lineHeight: 36,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 18,
      ...fontFaces.semibold,
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
      ...fontFaces.bold,
      color: theme.text,
      marginBottom: 2,
    },
    authorTitle: {
      fontSize: 13,
      ...fontFaces.regular,
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
      ...fontFaces.semibold,
    },
    publishedDate: {
      fontSize: 13,
      color: theme.textMuted,
      ...fontFaces.semibold,
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
      ...fontFaces.heavy,
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
      ...fontFaces.semibold,
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
      ...fontFaces.heavy,
      color: theme.text,
    },
    sourceText: {
      fontSize: 14,
      ...fontFaces.regular,
      color: theme.text,
      lineHeight: 20,
      marginBottom: 12,
    },
    sourceName: {
      fontSize: 16,
      ...fontFaces.bold,
      color: theme.text,
      marginBottom: 8,
    },
    sourceMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    sourceMetaText: {
      fontSize: 12,
      ...fontFaces.semibold,
      color: theme.textMuted,
    },
    reviewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    sectionLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 2,
    },
    sectionLabel: {
      fontSize: 13,
      ...fontFaces.heavy,
      color: theme.primary,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    sectionCaption: {
      fontSize: 12,
      ...fontFaces.semibold,
      color: theme.textMuted,
      marginBottom: 12,
    },
    summaryDisclaimer: {
      fontSize: 12,
      ...fontFaces.regular,
      color: theme.textMuted,
      lineHeight: 18,
      marginTop: 16,
    },
    heroPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    heroPlaceholderText: {
      fontSize: 13,
      ...fontFaces.semibold,
      color: theme.textMuted,
    },
    relatedChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    relatedChipText: {
      fontSize: 13,
      ...fontFaces.semibold,
      color: theme.text,
    },
    sourceLinkButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
    },
    sourceLinkText: {
      fontSize: 14,
      ...fontFaces.bold,
      color: theme.primary,
    },
    bottomSpacing: {
      height: 40,
    },
  });
