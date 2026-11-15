import {
  useTabBarInset,
  TabBarInsetProvider,
  useTabBarHeightReporter,
  useTabBarVisible,
} from "@/components/layout";
import { playButtonClickSfx } from "@/services/ui-sfx";
import { layout, useTheme, withAlpha } from "@/theme";
import { spacing } from "@/theme/tokens";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router/js-tabs";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { DURATION, EASE_DRAWER, EASE_OUT } from "@/theme/motion";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const TAB_ICONS = {
  map: require("@/assets/images/icons/map.png"),
  discovery: require("@/assets/images/icons/community.png"),
  ai: require("@/assets/images/icons/ai.png"),
  games: require("@/assets/images/icons/games.png"),
  profile: require("@/assets/images/icons/profile.png"),
};

/* Sharp triangle pointing up (active tab marker). ViewBox 24 x 12 */
const ACTIVE_TRIANGLE = "M 12 0 L 24 12 L 0 12 Z";
const MARKER_WIDTH = 24;
const MARKER_HEIGHT = 12;

/**
 * One marker for the whole bar (docs/CONTINUITY_SPEC.md, C2). It travels to
 * the chosen tab, stretching a little on the way and settling as it lands.
 * Position is derived from a fractional tab index, so a width change (rotation,
 * tablet resize) repositions it without animating.
 */
const TabMarker = ({
  index,
  count,
  width,
  color,
}: {
  index: number;
  count: number;
  width: number;
  color: string;
}) => {
  const reducedMotion = useReducedMotion();
  const position = useSharedValue(index);
  const stretch = useSharedValue(0);
  const tabWidth = width / count;

  React.useEffect(() => {
    if (reducedMotion) {
      position.value = index;
      return;
    }
    position.value = withTiming(index, {
      duration: DURATION.sheet,
      easing: EASE_DRAWER,
    });
    stretch.value = withSequence(
      withTiming(1, { duration: 160, easing: EASE_OUT }),
      withTiming(0, { duration: 240, easing: EASE_OUT }),
    );
  }, [index, reducedMotion, position, stretch]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: position.value * tabWidth + (tabWidth - MARKER_WIDTH) / 2,
      },
      { scaleX: 1 + 0.15 * stretch.value },
      { scaleY: 1 - 0.1 * stretch.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.activeMarker, animatedStyle]}
    >
      <Svg width={MARKER_WIDTH} height={MARKER_HEIGHT} viewBox="0 0 24 12">
        <Path d={ACTIVE_TRIANGLE} fill={color} />
      </Svg>
    </Animated.View>
  );
};

const TabButton = ({
  tab,
  isFocused,
  onPress,
}: {
  tab: { name: string; icon: number; label: string };
  isFocused: boolean;
  onPress: () => void;
}) => {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: reducedMotion ? 1 : scale.value }],
    };
  });

  const handlePress = () => {
    void playButtonClickSfx();
    if (reducedMotion) {
      scale.value = withTiming(0.99, { duration: 100, easing: EASE_OUT });
      setTimeout(() => {
        scale.value = withTiming(1, { duration: 120, easing: EASE_OUT });
      }, 100);
    } else {
      scale.value = withTiming(0.97, { duration: 100, easing: EASE_OUT });
      setTimeout(() => {
        scale.value = withTiming(1, { duration: 160, easing: EASE_OUT });
      }, 100);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={1}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: isFocused }}
      style={styles.tabButton}
    >
      <View style={styles.tabContent}>
        <Animated.View style={animatedStyle}>
          <View style={styles.iconContainer}>
            <Image
              source={tab.icon}
              style={styles.tabImage}
              contentFit="contain"
            />
          </View>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

function ModernTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  // Hooks must run before any early return (rules of hooks)
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const { theme } = useTheme();
  const reportTabBarHeight = useTabBarHeightReporter();
  const [tabsWidth, setTabsWidth] = React.useState(0);
  // Immersive screens (Guide mode) and the soft keyboard hide the bar through
  // the inset provider, so screens and bar always agree about the reserved
  // space — see components/layout/tab-bar-inset.tsx.
  const barVisible = useTabBarVisible();
  if (!barVisible) return null;

  const THEME = theme.palettes.tabBar;
  // The fade may only cover the band the screens reserve for the bar. A taller
  // fade washed out the last content row (Discover/Practice descriptions).
  const fadeHeight = tabBarInset;

  const tabs = [
    { name: "index", icon: TAB_ICONS.map, label: "Home" },
    { name: "community", icon: TAB_ICONS.discovery, label: "Discover" },
    { name: "chat", icon: TAB_ICONS.ai, label: "Guide" },
    { name: "awards", icon: TAB_ICONS.games, label: "Games" },
    { name: "profile", icon: TAB_ICONS.profile, label: "Profile" },
  ] as const;

  const activeTabIndex = tabs.findIndex(
    (tab) => state.routes[state.index]?.name === tab.name,
  );

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(THEME.bg, 0), withAlpha(THEME.bg, 0.96)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.fade, { height: fadeHeight }]}
      />
      <View
        style={[
          styles.tabBarLayer,
          { bottom: (insets.bottom || 0) + layout.tabBar.gap },
        ]}
      >
        <View
          onLayout={(event) =>
            reportTabBarHeight?.(event.nativeEvent.layout.height)
          }
          style={[
            styles.tabBar,
            {
              backgroundColor: THEME.bg,
              borderColor: THEME.border,
              shadowColor: THEME.shadow,
            },
          ]}
        >
          <View
            style={styles.tabsRow}
            onLayout={(event) => setTabsWidth(event.nativeEvent.layout.width)}
          >
          {tabs.map((tab) => {
            const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
            if (routeIndex === -1) return null;

            const isFocused = state.index === routeIndex;

            const onPress = () => {
              const event = emitter.emit({
                type: "tabPress",
                target: state.routes[routeIndex].key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigateToTab(state.routes[routeIndex].key);
              }
            };

            return (
              <TabButton
                key={tab.name}
                tab={tab}
                isFocused={isFocused}
                onPress={onPress}
              />
            );
          })}
          {tabsWidth > 0 && activeTabIndex !== -1 ? (
            <TabMarker
              index={activeTabIndex}
              count={tabs.length}
              width={tabsWidth}
              color={THEME.active}
            />
          ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <TabBarInsetProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            display: "none",
          },
        }}
        tabBar={(props) => <ModernTabBar {...props} />}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "Discovery Hub",
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "Guide",
          }}
        />
        <Tabs.Screen
          name="awards"
          options={{
            title: "Games",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
          }}
        />
        <Tabs.Screen
          name="leaderboard"
          options={{
            href: null,
            title: "Leaderboard",
          }}
        />
      </Tabs>
    </TabBarInsetProvider>
  );
}

const styles = StyleSheet.create({
  tabBarLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: layout.tabBar.horizontalMargin,
  },
  tabBar: {
    width: "100%",
    maxWidth: layout.tabBar.maxWidth,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 34,
    borderWidth: 2,
    borderBottomWidth: 5,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    elevation: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  tabButton: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  activeMarker: {
    position: "absolute",
    left: 0,
    bottom: -8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  tabImage: {
    width: 40,
    height: 40,
  },
});
