import { ArticleCard } from "@/components/community/ArticleCard";
import { DailyFactCard } from "@/components/community/DailyFactCard";
import {
  EncyclopediaRow,
  PeriodicTableBanner,
} from "@/components/community/EncyclopediaParts";
import { HubBar } from "@/components/community/HubBar";
import type { ArticleView, HubTab } from "@/components/community/HubTabs";
import { createStyles } from "@/components/community/styles";
import { PageBackground, TopRowHeader, useTabBarInset } from "@/components/layout";
import { Icon } from "@/components/ui/icon";
import { getAllArticles, getAllPosts } from "@/content/articles";
import { getAllEncyclopediaEntries, type EncyclopediaEntry } from "@/content/explorer";
import { impactLight } from "@/services/haptics";
import { getReadArticleIds } from "@/services/read-articles";
import {
  getColumnCount,
  layout,
  useResponsiveLayout,
  useTheme,
} from "@/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";

/**
 * A feed item holds only what the cards and search need. The article body is
 * deliberately left out (it is ~28 KB of text the grid never shows) and the
 * search text and sort time are computed once instead of on every keystroke.
 */
type FeedItem = {
  id: string;
  title: string;
  category?: string;
  author?: { name?: string };
  readTime?: number;
  image?: string;
  searchText: string;
  time: number;
};

type EncyclopediaIndexEntry = { entry: EncyclopediaEntry; haystack: string };

type ListRow =
  | { kind: "bar"; id: string }
  | { kind: "banner"; id: string }
  | { kind: "empty"; id: string }
  | { kind: "cards"; id: string; items: FeedItem[] }
  | { kind: "entry"; id: string; entry: EncyclopediaEntry };

// Storage keys
const BOOKMARKS_KEY = "@atomiq_bookmarks";

const toFeedItem = (
  prefix: string,
  source: {
    id: string;
    title: string;
    content?: string;
    excerpt?: string;
    category?: string;
    author?: { name?: string };
    readTime?: number;
    image?: string;
    tags?: string[];
    publishedDate?: string;
  },
  searchBody: string | undefined,
): FeedItem => ({
  id: `${prefix}-${source.id}`,
  title: source.title,
  category: source.category,
  author: source.author,
  readTime: source.readTime,
  image: source.image,
  searchText: `${source.title} ${searchBody ?? ""} ${(source.tags ?? []).join(" ")}`.toLowerCase(),
  time: source.publishedDate ? new Date(source.publishedDate).getTime() : -Infinity,
});

// Articles and posts live in the content database (async). Newest first.
const generateFeedItems = async (): Promise<FeedItem[]> => {
  const [articles, posts] = await Promise.all([getAllArticles(), getAllPosts()]);
  const items = [
    ...articles.map((a) => toFeedItem("article", a, a.excerpt)),
    ...posts.map((p) => toFeedItem("article", p, p.content)),
  ];
  return items.sort((a, b) => b.time - a.time);
};

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

export default function CommunityScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { contentWidth, contentFrameStyle } = useResponsiveLayout();
  const tabBarInset = useTabBarInset();
  const styles = createStyles(theme);

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
  const [articleView, setArticleView] = useState<ArticleView>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [allFeedItems, setAllFeedItems] = useState<FeedItem[]>([]);
  const [tab, setTab] = useState<HubTab>("articles");
  const [encyclopedia, setEncyclopedia] = useState<EncyclopediaIndexEntry[]>([]);

  // Typing stays responsive: the input uses `searchQuery`, list filtering
  // follows `deferredQuery` and can lag a frame behind.
  const deferredQuery = useDeferredValue(searchQuery);
  const isSearching = searchQuery.trim().length > 0;
  const isArticles = tab === "articles";

  // Scroll offset and the scrolling header's height live in shared values, so
  // scrolling never re-renders React; the pinned bar reads them on the UI thread.
  const scrollY = useSharedValue(0);
  const headerHeight = useSharedValue(0);
  useEffect(() => {
    if (isSearching) headerHeight.value = 0; // the daily-fact card is hidden
  }, [isSearching, headerHeight]);
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.value = e.nativeEvent.contentOffset.y;
    },
    [scrollY],
  );

  // Articles may have been read since this tab was last on screen
  useFocusEffect(
    useCallback(() => {
      void getReadArticleIds().then((ids) =>
        setReadIds((prev) => (sameIds(prev, ids) ? prev : ids)),
      );
    }, []),
  );

  useEffect(() => {
    let alive = true;
    generateFeedItems().then((items) => {
      if (alive) setAllFeedItems(items);
    });
    return () => {
      alive = false;
    };
  }, []);

  // The encyclopedia is only fetched the first time its tab opens
  const encyclopediaRequested = useRef(false);
  useEffect(() => {
    if (tab !== "encyclopedia" || encyclopediaRequested.current) return;
    encyclopediaRequested.current = true;
    getAllEncyclopediaEntries()
      .then((entries) =>
        setEncyclopedia(
          [...entries]
            .sort((a, b) => a.term.localeCompare(b.term))
            .map((entry) => ({
              entry,
              haystack: `${entry.term} ${entry.definition} ${entry.category}`.toLowerCase(),
            })),
        ),
      )
      .catch(() => {
        encyclopediaRequested.current = false;
      });
  }, [tab]);

  const query = deferredQuery.trim().toLowerCase();

  // Encyclopedia tab: A–Z, filtered by the search box
  const visibleEntries = useMemo(
    () =>
      (query ? encyclopedia.filter((e) => e.haystack.includes(query)) : encyclopedia).map(
        (e) => e.entry,
      ),
    [encyclopedia, query],
  );

  // Articles tab: everything, only what's been read, or only what's saved.
  // Bookmarks only matter to the filter while the Saved view is open.
  const savedForFilter = articleView === "saved" ? bookmarkedIds : null;
  const visibleItems = useMemo(() => {
    let items = allFeedItems;
    if (query) items = items.filter((item) => item.searchText.includes(query));
    if (articleView === "read") {
      const read = new Set(readIds);
      items = items.filter((item) => read.has(item.id.replace("article-", "")));
    } else if (savedForFilter) {
      items = items.filter((item) => savedForFilter.includes(item.id));
    }
    return items;
  }, [allFeedItems, query, articleView, readIds, savedForFilter]);

  // Bookmarks load once; the handler is stable so cards are not re-rendered
  // just because another card was saved.
  const bookmarksRef = useRef<string[]>([]);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(BOOKMARKS_KEY)
      .then((saved) => {
        if (!alive || !saved) return;
        const ids = JSON.parse(saved);
        bookmarksRef.current = ids;
        setBookmarkedIds(ids);
      })
      .catch((error) => console.error("Error loading bookmarks:", error));
    return () => {
      alive = false;
    };
  }, []);

  const toggleBookmark = useCallback((itemId: string) => {
    impactLight();
    const current = bookmarksRef.current;
    const next = current.includes(itemId)
      ? current.filter((id) => id !== itemId)
      : [...current, itemId];
    bookmarksRef.current = next;
    setBookmarkedIds(next);
    AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next)).catch((error) =>
      console.error("Error saving bookmark:", error),
    );
  }, []);

  const switchTab = useCallback((next: HubTab) => {
    setTab(next);
    setSearchQuery("");
    setSearchOpen(false);
  }, []);

  const toggleSearch = useCallback(() => {
    setSearchOpen((open) => {
      if (open) setSearchQuery("");
      return !open;
    });
  }, []);

  const openItem = useCallback(
    (item: { id: string }) => {
      impactLight();
      router.push(`/article-detail?id=${item.id}`);
    },
    [router],
  );

  // The pinned bar is the first list row; cards are laid out in rows of
  // `galleryColumns` so the list can keep a single column and pin that row.
  const rows = useMemo<ListRow[]>(() => {
    const out: ListRow[] = [{ kind: "bar", id: "bar" }];
    if (isArticles) {
      if (visibleItems.length === 0) out.push({ kind: "empty", id: "empty" });
      for (let i = 0; i < visibleItems.length; i += galleryColumns) {
        out.push({
          kind: "cards",
          id: `cards-${visibleItems[i].id}`,
          items: visibleItems.slice(i, i + galleryColumns),
        });
      }
    } else {
      if (!isSearching) out.push({ kind: "banner", id: "banner" });
      if (visibleEntries.length === 0 && encyclopedia.length > 0) {
        out.push({ kind: "empty", id: "empty" });
      }
      visibleEntries.forEach((entry) => out.push({ kind: "entry", id: entry.id, entry }));
    }
    return out;
  }, [isArticles, visibleItems, visibleEntries, encyclopedia.length, galleryColumns, isSearching]);

  const emptyCopy = !isArticles
    ? { badge: "No results", title: "No matching entries", body: "Try a different term or category" }
    : isSearching
      ? {
          badge: "No results",
          title: "Nothing here yet",
          body: "Try a different search term to discover more stories",
        }
      : articleView === "read"
        ? {
            badge: "Nothing read",
            title: "No articles read yet",
            body: "Open an article and read it for a few seconds. It will show up here.",
          }
        : articleView === "saved"
          ? {
              badge: "Saved",
              title: "No saved stories yet",
              body: "Tap the bookmark on a story to add it to your collection",
            }
          : {
              badge: "No results",
              title: "Nothing here yet",
              body: "Try a different search term to discover more stories",
            };

  const renderRow = useCallback(
    ({ item }: { item: ListRow }) => {
      switch (item.kind) {
        case "bar":
          return (
            <HubBar
              tab={tab}
              onTabChange={switchTab}
              articleView={articleView}
              onArticleViewChange={setArticleView}
              searchOpen={searchOpen}
              onToggleSearch={toggleSearch}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              scrollY={scrollY}
              headerHeight={headerHeight}
            />
          );
        case "banner":
          return (
            <View style={styles.tabIntro}>
              <PeriodicTableBanner />
            </View>
          );
        case "empty":
          return (
            <View style={styles.emptyState}>
              <Image
                source={require("@/assets/images/mascot/blink.png")}
                style={styles.emptyMascot}
                resizeMode="contain"
              />
              <View style={styles.emptyBadge}>
                <Text style={styles.emptyBadgeText}>{emptyCopy.badge}</Text>
              </View>
              <Text style={styles.emptyText}>{emptyCopy.title}</Text>
              <Text style={styles.emptySubtext}>{emptyCopy.body}</Text>
            </View>
          );
        case "entry":
          return <EncyclopediaRow entry={item.entry} />;
        case "cards": {
          const filler = galleryColumns - item.items.length;
          return (
            <View style={styles.galleryRow}>
              {item.items.map((card) => (
                <ArticleCard
                  key={card.id}
                  item={card}
                  bookmarked={bookmarkedIds.includes(card.id)}
                  onOpen={openItem}
                  onToggleBookmark={toggleBookmark}
                />
              ))}
              {Array.from({ length: filler }, (_, i) => (
                <View key={`filler-${i}`} style={styles.galleryFiller} />
              ))}
            </View>
          );
        }
      }
    },
    [
      tab,
      switchTab,
      articleView,
      searchOpen,
      toggleSearch,
      searchQuery,
      scrollY,
      headerHeight,
      styles,
      emptyCopy.badge,
      emptyCopy.title,
      emptyCopy.body,
      galleryColumns,
      bookmarkedIds,
      openItem,
      toggleBookmark,
    ],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <PageBackground />

      {/* Shared top row — avatar and stats */}
      <TopRowHeader />

      <FlatList
        data={rows}
        renderItem={renderRow}
        keyExtractor={(item) => item.id}
        // Indices count the header component, so the bar row is 1 while the
        // daily-fact card is shown and 0 once the card is hidden (searching).
        stickyHeaderIndices={[isSearching ? 0 : 1]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews={false}
        contentContainerStyle={[
          styles.galleryContent,
          contentFrameStyle,
          { paddingBottom: tabBarInset + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          isSearching ? undefined : (
            <View
              style={styles.header}
              onLayout={(e) => {
                headerHeight.value = e.nativeEvent.layout.height;
              }}
            >
              <DailyFactCard />
            </View>
          )
        }
        ListFooterComponent={
          !isArticles ? (
            <TouchableOpacity
              style={[styles.emptyAction, styles.vaultLink]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Open the full encyclopedia with filters and A to Z index"
              onPress={() => {
                impactLight();
                router.push("/encyclopedia");
              }}
            >
              <Icon name="Book1" size={16} color={theme.colors.primaryLight} variant="Bold" />
              <Text style={styles.emptyActionText}>Open full encyclopedia</Text>
            </TouchableOpacity>
          ) : articleView === "all" && visibleItems.length > 0 ? (
            <View style={styles.feedFooter}>
              <View style={styles.footerIconCircle}>
                <Icon name="TickCircle" size={24} color="#C2410C" variant="Bold" />
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
