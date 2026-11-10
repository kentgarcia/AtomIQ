import { getContentImage } from "@/components/community/image-source";
import { useTabBarInset } from "@/components/layout";
import { Icon } from "@/components/ui/icon";
import { getAllArticles, getAllPosts } from "@/content/articles";
import {
  getColumnCount,
  layout,
  useResponsiveLayout,
  useTheme,
} from "@/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { impactLight } from "@/services/haptics";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import {
  FlatList,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createStyles } from "@/components/community/styles";

// Storage keys
const BOOKMARKS_KEY = "@atomiq_bookmarks";

// Category pills (excluding the bookmark & "All" pills, which are rendered first)
const CATEGORIES: { id: string; label: string }[] = [
  { id: "facts", label: "Facts" },
  { id: "stories", label: "Stories" },
  { id: "real-life", label: "Real Life" },
  { id: "discoveries", label: "Discoveries" },
  { id: "safety", label: "Safety" },
];

const CATEGORY_FILTERS: Record<string, (item: any) => boolean> = {
  all: () => true,
  facts: (it) =>
    it.contentType === "did-you-know" ||
    it.category === "science" ||
    it.tags?.includes("science"),
  stories: (it) => it.contentType === "article" || it.contentType === "guide",
  "real-life": (it) =>
    it.category === "environment" ||
    it.category === "health" ||
    it.tags?.some((t: string) =>
      ["background-radiation", "agriculture", "education"].includes(t),
    ),
  discoveries: (it) =>
    it.contentType === "news" ||
    it.tags?.some((t: string) =>
      ["research", "discovery", "innovation", "breakthrough"].includes(t),
    ),
  safety: (it) => it.category === "safety" || it.tags?.includes("safety"),
};

// Helper to generate feed items from articles and posts only (DB-backed, async)
const generateFeedItems = async () => {
  const articles = await getAllArticles();
  const posts = await getAllPosts();

  const feedItems: any[] = [];

  // Add articles as feed items
  articles.forEach((article) => {
    feedItems.push({
      id: `article-${article.id}`,
      type: "article",
      contentType: article.type,
      title: article.title,
      subtitle: article.subtitle,
      content: article.excerpt,
      fullContent: article.content,
      author: article.author,
      publishedDate: article.publishedDate,
      readTime: article.readTime,
      source: article.source,
      sourceUrl: article.sourceUrl,
      category: article.category,
      tags: article.tags,
      image: article.image,
      difficulty: article.difficulty,
      featured: article.featured,
    });
  });

  // Add posts as feed items
  posts.forEach((post) => {
    feedItems.push({
      id: `article-${post.id}`,
      type: "article",
      contentType: post.type,
      title: post.title,
      content: post.content,
      author: post.author,
      publishedDate: post.publishedDate,
      source: post.source,
      sourceUrl: post.sourceUrl,
      videoUrl: post.videoUrl,
      category: post.category,
      tags: post.tags,
      image: post.image,
    });
  });

  // Sort by published date (newest first)
  return feedItems.sort((a, b) => {
    if (a.publishedDate && b.publishedDate) {
      return (
        new Date(b.publishedDate).getTime() -
        new Date(a.publishedDate).getTime()
      );
    }
    if (a.publishedDate) return -1;
    if (b.publishedDate) return 1;
    return 0;
  });
};

export default function CommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { contentWidth, contentMaxWidth, contentFrameStyle, gutter } =
    useResponsiveLayout();
  const tabBarInset = useTabBarInset();
  const THEME = theme.palettes.tab;
  const styles = useMemo(() => createStyles(THEME), [THEME]);

  // Keep the gallery two-up only while each card keeps the minimum readable
  // width. Compact phones fall back to a single column.
  const galleryColumns = useMemo(
    () =>
      getColumnCount(contentWidth, {
        minItemWidth: layout.gridItemMinWidth,
        gap: layout.gridGap,
        maxColumns: 2,
      }),
    [contentWidth],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [allFeedItems, setAllFeedItems] = useState<any[]>([]);

  const reducedMotion = useReducedMotion();
  const mascotY = useSharedValue(0);
  const mascotRotate = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) {
      mascotY.value = 0;
      mascotRotate.value = 0;
      return;
    }
    mascotY.value = withRepeat(
      withTiming(-6, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    mascotRotate.value = withRepeat(
      withTiming(3, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [mascotY, mascotRotate, reducedMotion]);
  const mascotStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: mascotY.value },
      { rotate: `${mascotRotate.value}deg` },
    ],
  }));

  const SKY: [string, string] = isDark
    ? [THEME.bg, THEME.bg]
    : ["#FFF3E0", "#FFFFFF"];

  // Generate feed items (articles + posts live in the content database)
  useEffect(() => {
    let alive = true;
    generateFeedItems().then((items) => {
      if (alive) setAllFeedItems(items);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Get saved items
  const savedItems = useMemo(() => {
    return allFeedItems.filter((item) => bookmarkedIds.includes(item.id));
  }, [allFeedItems, bookmarkedIds]);

  // Filter feed items based on search
  const filteredItems = useMemo(() => {
    let items = allFeedItems;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.title?.toLowerCase().includes(query) ||
          item.content?.toLowerCase().includes(query) ||
          item.tags?.some((tag: string) => tag.toLowerCase().includes(query)),
      );
    }

    return items;
  }, [allFeedItems, searchQuery]);

  // Items to render, based on the active category pill
  const visibleItems = useMemo(() => {
    if (activeFilter === "saved") {
      return savedItems;
    }
    const match = CATEGORY_FILTERS[activeFilter] || CATEGORY_FILTERS.all;
    return filteredItems.filter(match);
  }, [activeFilter, filteredItems, savedItems]);

  // Load bookmarks on mount
  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const saved = await AsyncStorage.getItem(BOOKMARKS_KEY);
      if (saved) {
        setBookmarkedIds(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading bookmarks:", error);
    }
  };

  const toggleBookmark = async (itemId: string) => {
    try {
      impactLight();
      let newBookmarks: string[];
      if (bookmarkedIds.includes(itemId)) {
        newBookmarks = bookmarkedIds.filter((id) => id !== itemId);
      } else {
        newBookmarks = [...bookmarkedIds, itemId];
      }
      setBookmarkedIds(newBookmarks);
      await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(newBookmarks));
    } catch (error) {
      console.error("Error saving bookmark:", error);
    }
  };

  const selectFilter = useCallback((id: string) => {
    if (id !== activeFilter) {
      impactLight();
      setActiveFilter(id);
    }
  }, [activeFilter]);

  const openItem = useCallback(
    (item: any) => {
      impactLight();
      router.push(`/article-detail?id=${item.id}`);
    },
    [router],
  );

  const renderGalleryItem = ({ item }: { item: any }) => {
    const isBookmarked = bookmarkedIds.includes(item.id);
    const imageSource = getContentImage(item.image);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.galleryCard}
        onPress={() => openItem(item)}
      >
        <View style={styles.galleryImageWrap}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.galleryImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.galleryImagePlaceholder}>
              <Icon name="Atom" size={32} color={THEME.textMuted} />
            </View>
          )}
          <TouchableOpacity
            style={[styles.saveButton, isBookmarked && styles.saveButtonActive]}
            onPress={() => toggleBookmark(item.id)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Icon
              name={isBookmarked ? "Archive" : "ArchiveAdd"}
              size={16}
              color={isBookmarked ? "#FFFFFF" : "#888888"}
              variant="Bold"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.galleryBody}>
          <Text style={styles.galleryCategory}>
            {(item.category || "News").toUpperCase()}
          </Text>
          <Text style={styles.galleryTitle}>
            {item.title}
          </Text>
          <View style={styles.galleryMeta}>
            {item.author?.name && (
              <Text style={styles.galleryMetaText} numberOfLines={1}>
                {item.author.name}
              </Text>
            )}
            {item.readTime && (
              <View style={styles.galleryMetaItem}>
                <Icon name="Clock" size={12} color={THEME.textMuted} />
                <Text style={styles.galleryMetaText}>{item.readTime}m</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: SKY[0] }]}>
      {/* Autumn gradient flowing through the whole page */}
      <LinearGradient
        colors={SKY}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.pageGradient}
        pointerEvents="none"
      />

      {/* Header — enlarged mascot behind text (absolute, no layout) */}
      <View style={[styles.header, contentFrameStyle, { paddingTop: insets.top + 16 }]}>
        {/* Background mascot: 168px, behind text, still floating */}
        <View style={styles.headerMascotWrap} pointerEvents="none">
          <Animated.View style={mascotStyle}>
            <ExpoImage
              source={require("@/assets/images/mascot/discover.svg")}
              style={styles.headerMascot}
              contentFit="contain"
            />
          </Animated.View>
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Discovery Hub</Text>
            <Text style={styles.headerSubtitle}>
              Explore stories, facts, and breakthroughs
            </Text>
          </View>
        </View>

        {/* Search Bar — premium card with amber icon pill */}
        <View style={styles.searchContainer}>
          <View style={styles.searchIconCircle}>
            <Icon name="SearchNormal" size={18} color="#E67E22" variant="Bold" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search stories, facts, and more..."
            placeholderTextColor={isDark ? "#667799" : "#9CA3AF"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              style={styles.searchClearButton}
              onPress={() => setSearchQuery("")}
              activeOpacity={0.85}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Icon name="CloseCircle" size={16} color="#9CA3AF" variant="Bold" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category Pills — 3D lip cards */}
      <View
        style={[
          styles.categoryRow,
          { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.categoryScrollContent,
            { paddingHorizontal: gutter },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              styles.categoryChipIcon,
              activeFilter === "saved" && styles.categoryChipActive,
            ]}
            activeOpacity={0.85}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Saved stories"
            accessibilityState={{ selected: activeFilter === "saved" }}
            onPress={() => selectFilter("saved")}
          >
            <Icon
              name="Star"
              size={16}
              color={activeFilter === "saved" ? "#FFFFFF" : isDark ? "#8898AA" : "#6B7280"}
              variant="Bold"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryChip,
              activeFilter === "all" && styles.categoryChipActive,
            ]}
            activeOpacity={0.85}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="All categories"
            accessibilityState={{ selected: activeFilter === "all" }}
            onPress={() => selectFilter("all")}
          >
            <Text
              style={[
                styles.categoryChipText,
                activeFilter === "all" && styles.categoryChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                activeFilter === cat.id && styles.categoryChipActive,
              ]}
              activeOpacity={0.85}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={cat.label}
              accessibilityState={{ selected: activeFilter === cat.id }}
              onPress={() => selectFilter(cat.id)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  activeFilter === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Gallery */}
      <FlatList
        key={`gallery-${galleryColumns}`}
        data={visibleItems}
        renderItem={renderGalleryItem}
        keyExtractor={(item) => item.id}
        numColumns={galleryColumns}
        columnWrapperStyle={galleryColumns > 1 ? styles.galleryRow : undefined}
        contentContainerStyle={[
          styles.galleryContent,
          contentFrameStyle,
          { paddingBottom: tabBarInset + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Image
              source={require("@/assets/images/mascot/blink.png")}
              style={styles.emptyMascot}
              resizeMode="contain"
            />
            <View style={styles.emptyBadge}>
              <Text style={styles.emptyBadgeText}>
                {activeFilter === "saved" ? "Saved" : "No results"}
              </Text>
            </View>
            <Text style={styles.emptyText}>
              {activeFilter === "saved"
                ? "No saved stories yet"
                : "Nothing here yet"}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeFilter === "saved"
                ? "Tap the bookmark on a story to add it to your collection"
                : "Try a different category or search term to discover more stories"}
            </Text>
            {activeFilter !== "all" && activeFilter !== "saved" && (
              <TouchableOpacity
                style={styles.emptyAction}
                activeOpacity={0.85}
                onPress={() => selectFilter("all")}
              >
                <Icon name="Refresh" size={14} color="#E67E22" variant="Bold" />
                <Text style={styles.emptyActionText}>Show all stories</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={
          activeFilter !== "saved" && visibleItems.length > 0 ? (
            <View style={styles.feedFooter}>
              <View style={styles.footerIconCircle}>
                <Icon name="TickCircle" size={24} color="#E67E22" variant="Bold" />
              </View>
              <View style={styles.footerContent}>
                <Text style={styles.footerTitle}>You&apos;re all caught up!</Text>
                <Text style={styles.footerSubtext}>
                  More stories, facts and breakthroughs are on the way. Check back
                  soon for fresh discoveries from the world of nuclear science.
                </Text>
              </View>
              <View style={styles.footerDivider} />
            </View>
          ) : undefined
        }
      />
    </View>
  );
}
