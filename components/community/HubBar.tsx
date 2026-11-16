/**
 * HubBar — the pinned row of the Discovery Hub: Articles | Encyclopedia tabs,
 * the article sub-tabs with the round search button, and the search field.
 *
 * Memoised so list scrolling and card changes never re-render it. Its
 * opaque "pinned" strip fades in on the UI thread from the list's scroll
 * offset, once the daily-fact card above has scrolled away.
 */

import React, { memo } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import {
  ArticleSubTabs,
  HubTabs,
  type ArticleView,
  type HubTab,
} from "@/components/community/HubTabs";
import { createStyles } from "@/components/community/styles";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/theme";

type Props = {
  tab: HubTab;
  onTabChange: (tab: HubTab) => void;
  articleView: ArticleView;
  onArticleViewChange: (view: ArticleView) => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  scrollY: SharedValue<number>;
  /** Height of the scrolling header above this row (0 when it is hidden). */
  headerHeight: SharedValue<number>;
};

function HubBarBase({
  tab,
  onTabChange,
  articleView,
  onArticleViewChange,
  searchOpen,
  onToggleSearch,
  searchQuery,
  onSearchChange,
  scrollY,
  headerHeight,
}: Props) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const stripStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [headerHeight.value, headerHeight.value + 12],
      [0, 1],
      "clamp",
    ),
  }));

  return (
    <View style={styles.stickyBar}>
      <Animated.View pointerEvents="none" style={[styles.stickyStrip, stripStyle]} />

      <HubTabs value={tab} onChange={onTabChange} />

      {tab === "articles" && (
        <ArticleSubTabs
          value={articleView}
          onChange={onArticleViewChange}
          searchOpen={searchOpen}
          onToggleSearch={onToggleSearch}
        />
      )}

      {/* Always shown on Encyclopedia; behind the round button on Articles */}
      {(tab === "encyclopedia" || searchOpen) && (
        <View style={styles.searchContainer}>
          <View style={styles.searchIconCircle}>
            <Icon name="SearchNormal" size={18} color="#C2410C" variant="Bold" />
          </View>
          <TextInput
            autoFocus={tab === "articles"}
            style={styles.searchInput}
            placeholder={
              tab === "articles"
                ? "Search stories, facts, and more..."
                : "Search the encyclopedia..."
            }
            placeholderTextColor={theme.colors.textFaint}
            value={searchQuery}
            onChangeText={onSearchChange}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              style={styles.searchClearButton}
              onPress={() => onSearchChange("")}
              activeOpacity={0.85}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Icon name="CloseCircle" size={16} color={theme.colors.textFaint} variant="Bold" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

export const HubBar = memo(HubBarBase);
