import {
  useTabBarMetrics,
  TabBarInsetProvider,
  useTabBarHeightReporter,
  useTabBarVisible,
} from "@/components/layout";
import { ClaimCoinLayer } from "@/components/quests/ClaimCoinLayer";
import { measureViewRect, registerLockHit } from "@/components/tutorial/lock-hits";
import { useTutorialTarget, type ViewRef } from "@/components/tutorial/use-tutorial-target";
import { LockedDialog } from "@/components/ui/locked-dialog";
import { useFeedUnseenCount } from "@/hooks/use-feed";
import { useTabLocks } from "@/hooks/use-tutorial";
import { usePhone } from "@/hooks/use-phone";
import { playSfx } from "@/services/sfx";
import { fontFaces, layout, useTheme } from "@/theme";
import { TAB_BAR_CONSTANTS, TAB_BAR_TAB_COUNT } from "@/theme/tab-bar-metrics";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Image } from "expo-image";
import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useStorage } from "@/services/StorageContext";
import type { TabName } from "@/services/tutorial-core";
import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import { EASE_OUT } from "@/theme/motion";

const TAB_ICONS = {
  map: require("@/assets/images/icons/map.png"),
  discovery: require("@/assets/images/icons/feed.png"),
  quests: require("@/assets/images/icons/chest.png"),
  phone: require("@/assets/images/icons/phone.png"),
  games: require("@/assets/images/icons/games.png"),
  profile: require("@/assets/images/icons/profile.png"),
};

const TabButton = ({
  tab,
  isFocused,
  onPress,
  iconSize,
  labelFontSize,
  labelLineHeight,
  labelGap,
  activeColor,
  inactiveColor,
  dot,
  lit,
  locked,
  wrapRef,
}: {
  /** The tab's wrapper view, for the tour's "press a locked tab" lookup (`lock-hits.ts`). */
  wrapRef?: (node: ViewRef | null) => void;
  /** Not open yet (Shrodi's tour opens the tabs one by one): dimmed, with a lock, and pressing it says why. */
  locked?: boolean;
  /** Shrodi's tour lights this tab through this ref (docs/features/TUTORIAL_SPEC.md). */
  lit?: React.RefObject<ViewRef | null>;
  tab: { name: string; icon: number; label: string };
  isFocused: boolean;
  onPress: () => void;
  iconSize: number;
  labelFontSize: number;
  labelLineHeight: number;
  labelGap: number;
  activeColor: string;
  inactiveColor: string;
  /** A small dot on the icon (Feed while there are unseen posts), with what it means for a screen reader. */
  dot?: { color: string; ring: string; label: string };
}) => {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  // The dot pops in (from 85%, 180 ms, ease-out) when it appears while the bar is showing; a dot that is already there when
  // the bar mounts is simply there. The dot is out of the layout, so nothing moves.
  const hasDot = dot !== undefined;
  const dotIn = useSharedValue(hasDot ? 1 : 0);
  useEffect(() => {
    if (!hasDot) {
      dotIn.set(0);
      return;
    }
    dotIn.set(reducedMotion ? 1 : withTiming(1, { duration: 180, easing: EASE_OUT }));
  }, [hasDot, reducedMotion, dotIn]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: dotIn.get(), transform: [{ scale: 0.85 + 0.15 * dotIn.get() }] }));

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: reducedMotion ? 1 : scale.value }],
    };
  });

  const handlePress = () => {
    void playSfx(locked ? "ui.invalid" : "ui.tab");
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
    <View
      ref={(node) => {
        if (lit) lit.current = node;
        wrapRef?.(node);
      }}
      collapsable={false}
      style={styles.tabButtonWrap}
    >
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={1}
      accessibilityRole="tab"
      accessibilityLabel={locked ? `${tab.label}, locked` : dot ? dot.label : tab.label}
      // Not `disabled`: TouchableOpacity reads that as "ignore presses", and a locked tab must still answer with its dialog
      accessibilityState={{ selected: isFocused }}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.tabContent, animatedStyle, locked ? styles.tabLocked : null]}>
        <View style={{ width: iconSize, height: iconSize }}>
          <Image
            source={tab.icon}
            style={{ width: iconSize, height: iconSize }}
            contentFit="contain"
          />
          {locked ? (
            <View pointerEvents="none" accessible={false} style={[styles.lockBadge, { backgroundColor: activeColor }]}>
              <Icon name="Lock" size={10} color={inactiveColor} variant="Bold" />
            </View>
          ) : null}
          {/* The dot sits over the icon's corner, so the bar's height does not change */}
          {dot && !locked ? (
            <Animated.View
              pointerEvents="none"
              accessible={false}
              style={[
                styles.dot,
                { backgroundColor: dot.color, borderColor: dot.ring },
                dotStyle,
              ]}
            />
          ) : null}
        </View>
        {/* Fixed line height and no font scaling keep the bar height equal to the metrics */}
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={[
            isFocused ? fontFaces.heavy : fontFaces.bold,
            {
              marginTop: labelGap,
              fontSize: labelFontSize,
              lineHeight: labelLineHeight,
              color: isFocused ? activeColor : inactiveColor,
            },
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
    </View>
  );
};

/** The tabs' names, for the dialog a locked tab opens. */
const TAB_LABELS: Record<string, string> = { index: "Home", quests: "Quests", community: "Feed", phone: "Phone", awards: "Games", profile: "Profile" };

function ModernTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  // Hooks must run before any early return (rules of hooks)
  const metrics = useTabBarMetrics();
  const { theme } = useTheme();
  const reportTabBarHeight = useTabBarHeightReporter();
  const tabsRowRef = React.useRef<React.ComponentRef<typeof View>>(null);
  // Immersive screens (Guide mode) and the soft keyboard hide the bar through
  // the inset provider, so screens and bar always agree about the reserved
  // space — see components/layout/tab-bar-inset.tsx.
  const barVisible = useTabBarVisible();
  // Unseen posts in the NPC feed: a dot on the Feed tab (0 while the feed is muted)
  const unseenPosts = useFeedUnseenCount();
  // Anything new on the phone (an app waiting, an unread chat, an unread daily fact): a dot on the Phone tab.
  // The focused tab re-reads it, since progress made on another tab is what puts an app on the phone.
  const phone = usePhone(state.index);
  // The tour lights the Feed and Phone tabs (hooks stay above the early return)
  const feedTab = useTutorialTarget("tab.feed");
  const phoneTab = useTutorialTarget("tab.phone");
  // Shrodi's tour opens the tabs one by one (docs/features/TUTORIAL_SPEC.md §15)
  const locks = useTabLocks();
  const [lockedName, setLockedName] = useState<string | null>(null);
  // A locked tab still answers a press while the tour's dim is up: the layer asks these for the tab under a tap
  const tabViews = React.useRef<Record<string, ViewRef | null>>({});
  const locksRef = React.useRef(locks);
  locksRef.current = locks;
  useEffect(() => {
    const offs = Object.keys(TAB_LABELS)
      .filter((name) => name !== "index")
      .map((name) =>
        registerLockHit(`tab:${name}`, {
          rect: () => measureViewRect(tabViews.current[name]),
          open: () => setLockedName(TAB_LABELS[name]),
          active: () => locksRef.current.isLocked(name as TabName),
        }),
      );
    return () => offs.forEach((off) => off());
  }, []);
  const focusedName = state.routes[state.index]?.name;
  const homeKey = state.routes.find((r) => r.name === "index")?.key;
  // Whatever put the learner on a locked tab (a link, a restored screen) is sent back to Home
  useEffect(() => {
    if (focusedName && focusedName !== "index" && locks.isLocked(focusedName as TabName) && homeKey) {
      setLockedName(TAB_LABELS[focusedName] ?? focusedName);
      navigateToTab(homeKey);
    }
  }, [focusedName, locks, homeKey, navigateToTab]);
  if (!barVisible) return null;

  const THEME = theme.palettes.tabBar;
  const tabs = [
    { name: "index", icon: TAB_ICONS.map, label: "Home" },
    { name: "quests", icon: TAB_ICONS.quests, label: "Quests" },
    { name: "community", icon: TAB_ICONS.discovery, label: "Feed" },
    { name: "phone", icon: TAB_ICONS.phone, label: "Phone" },
    { name: "awards", icon: TAB_ICONS.games, label: "Games" },
    { name: "profile", icon: TAB_ICONS.profile, label: "Profile" },
  ] as const;
  // The metrics resolver sizes tabs for TAB_BAR_TAB_COUNT; keep them in sync.
  if (__DEV__ && tabs.length !== TAB_BAR_TAB_COUNT) {
    console.warn("Tab bar: update TAB_BAR_TAB_COUNT in theme/tab-bar-metrics.ts");
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Docked: the bar is fixed to the bottom edge and runs the full width; its background
          continues under the system inset. Screens reserve it through the inset provider. */}
      <View
        onLayout={(event) =>
          reportTabBarHeight?.(event.nativeEvent.layout.height - metrics.bottomOffset)
        }
        style={[
          styles.tabBarLayer,
          {
            backgroundColor: THEME.bg,
            borderTopColor: THEME.border,
            paddingBottom: metrics.bottomOffset,
            paddingHorizontal: metrics.horizontalMargin,
          },
        ]}
      >
        <View
          style={[
            styles.tabBar,
            { paddingVertical: metrics.verticalPadding },
          ]}
        >
          <View ref={tabsRowRef} collapsable={false} style={styles.tabsRow}>
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

              if (locks.blocks(tab.name as TabName)) {
                // Locked: say why. (Before the tour has been read nothing is shown as locked, and a press just waits.)
                if (locks.isLocked(tab.name as TabName)) setLockedName(tab.label);
                return;
              }
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
                iconSize={metrics.iconSize}
                labelFontSize={metrics.labelFontSize}
                labelLineHeight={metrics.labelLineHeight}
                labelGap={metrics.labelGap}
                activeColor={THEME.active}
                inactiveColor={THEME.inactive}
                locked={locks.isLocked(tab.name as TabName)}
                wrapRef={(node) => {
                  tabViews.current[tab.name] = node;
                }}
                lit={tab.name === "community" ? feedTab.ref : tab.name === "phone" ? phoneTab.ref : undefined}
                dot={
                  tab.name === "community" && unseenPosts > 0
                    ? { color: theme.colors.error, ring: THEME.bg, label: "Feed, new posts" }
                    : tab.name === "phone" && phone.tabDot
                      ? { color: theme.colors.error, ring: THEME.bg, label: "Phone, something new" }
                      : undefined
                }
              />
            );
          })}
          </View>
        </View>
      </View>

      <LockedDialog visible={lockedName !== null} title={lockedName ?? ""} text={locks.hint} onClose={() => setLockedName(null)} />

      {/* Above the bar and every screen: the XP coins of a quest claim land on the Profile tab */}
      <ClaimCoinLayer tabsRowRef={tabsRowRef} tabCount={tabs.length} />
    </View>
  );
}

export default function TabLayout() {
  const { isLoading, onboardingCompleted } = useStorage();
  // Onboarding always comes first: if the tabs are ever reached without it (a back gesture, a restored screen), go through it
  if (!isLoading && !onboardingCompleted) return <Redirect href="/onboarding" />;
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
          name="quests"
          options={{
            title: "Quests",
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "Feed",
          }}
        />
        <Tabs.Screen
          name="phone"
          options={{
            title: "Phone",
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
      </Tabs>
    </TabBarInsetProvider>
  );
}

const styles = StyleSheet.create({
  tabBarLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    borderTopWidth: TAB_BAR_CONSTANTS.barVerticalBorders,
  },
  tabBar: {
    width: "100%",
    maxWidth: TAB_BAR_CONSTANTS.maxWidth,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: TAB_BAR_CONSTANTS.barPaddingHorizontal,
  },
  tabsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  tabButtonWrap: { flex: 1 },
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
  tabLocked: { opacity: 0.45 },
  lockBadge: {
    position: "absolute",
    right: -6,
    bottom: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
});
