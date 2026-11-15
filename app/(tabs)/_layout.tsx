import {
  useTabBarInset,
  useTabBarMetrics,
  TabBarInsetProvider,
  useTabBarHeightReporter,
  useTabBarVisible,
} from "@/components/layout";
import { playButtonClickSfx } from "@/services/ui-sfx";
import { layout, useTheme, withAlpha } from "@/theme";
import { TAB_BAR_CONSTANTS, TAB_BAR_TAB_COUNT } from "@/theme/tab-bar-metrics";
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
  withTiming,
} from "react-native-reanimated";
import { DURATION, EASE_DRAWER, EASE_OUT } from "@/theme/motion";

const TAB_ICONS = {
  map: require("@/assets/images/icons/map.png"),
  discovery: require("@/assets/images/icons/community.png"),
  ai: require("@/assets/images/icons/ai.png"),
  games: require("@/assets/images/icons/games.png"),
  profile: require("@/assets/images/icons/profile.png"),
};

/* Active tab (Duolingo style): the icon sits in a rounded square with a tinted
   fill and an accent border. One highlight serves the whole bar and slides to
   the chosen tab (left to right or back). Position is derived from a
   fractional tab index, so a width change (rotation, tablet resize,
   split-screen) repositions it without animating. */
const ACTIVE_RADIUS = 16;
const ACTIVE_BORDER = 2;
const ACTIVE_FILL_ALPHA = 0.14;

const TabHighlight = ({
  index,
  tabWidth,
  slotWidth,
  slotHeight,
  color,
}: {
  index: number;
  tabWidth: number;
  slotWidth: number;
  slotHeight: number;
  color: string;
}) => {
  const reducedMotion = useReducedMotion();
  const position = useSharedValue(index);

  React.useEffect(() => {
    position.value = reducedMotion
      ? index
      : withTiming(index, { duration: DURATION.sheet, easing: EASE_DRAWER });
  }, [index, reducedMotion, position]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: position.value * tabWidth + (tabWidth - slotWidth) / 2 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.activeHighlight,
        {
          width: slotWidth,
          height: slotHeight,
          borderRadius: ACTIVE_RADIUS,
          borderColor: color,
          backgroundColor: withAlpha(color, ACTIVE_FILL_ALPHA),
        },
        animatedStyle,
      ]}
    />
  );
};

const TabButton = ({
  tab,
  isFocused,
  onPress,
  iconSlot,
  iconSlotHeight,
  iconSize,
}: {
  tab: { name: string; icon: number; label: string };
  isFocused: boolean;
  onPress: () => void;
  iconSlot: number;
  iconSlotHeight: number;
  iconSize: number;
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
          <View
            style={[
              styles.iconContainer,
              {
                width: iconSlot,
                height: iconSlotHeight,
                borderRadius: ACTIVE_RADIUS,
              },
            ]}
          >
            <Image
              source={tab.icon}
              style={{ width: iconSize, height: iconSize }}
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
  const tabBarInset = useTabBarInset();
  const metrics = useTabBarMetrics();
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
  // The metrics resolver sizes tabs for TAB_BAR_TAB_COUNT; keep them in sync.
  if (__DEV__ && tabs.length !== TAB_BAR_TAB_COUNT) {
    console.warn("Tab bar: update TAB_BAR_TAB_COUNT in theme/tab-bar-metrics.ts");
  }

  const activeTabIndex = tabs.findIndex(
    (tab) => state.routes[state.index]?.name === tab.name,
  );
  const rowTabWidth = (tabsWidth > 0 ? tabsWidth : metrics.barWidth) / tabs.length;

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
          {
            bottom: metrics.bottomOffset,
            paddingHorizontal: metrics.horizontalMargin,
          },
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
              paddingVertical: metrics.verticalPadding,
            },
          ]}
        >
          <View
            style={styles.tabsRow}
            onLayout={(event) => setTabsWidth(event.nativeEvent.layout.width)}
          >
          {activeTabIndex !== -1 ? (
            <TabHighlight
              index={activeTabIndex}
              tabWidth={rowTabWidth}
              slotWidth={metrics.iconSlot}
              slotHeight={metrics.iconSlotHeight}
              color={THEME.active}
            />
          ) : null}
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
                iconSlot={metrics.iconSlot}
                iconSlotHeight={metrics.iconSlotHeight}
                iconSize={metrics.iconSize}
              />
            );
          })}
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
  },
  tabBar: {
    width: "100%",
    maxWidth: TAB_BAR_CONSTANTS.maxWidth,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 34,
    borderWidth: TAB_BAR_CONSTANTS.barBorderWidth,
    borderBottomWidth: 5,
    paddingHorizontal: TAB_BAR_CONSTANTS.barPaddingHorizontal,
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
  activeHighlight: {
    position: "absolute",
    left: 0,
    top: 0,
    borderWidth: ACTIVE_BORDER,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
