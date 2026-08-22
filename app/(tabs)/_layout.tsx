import { playButtonClickSfx } from "@/services/ui-sfx";
import { useTheme, withAlpha } from "@/theme";
import { spacing } from "@/theme/tokens";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { EASE_OUT } from "@/theme/motion";
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

const TabButton = ({
  tab,
  isFocused,
  onPress,
  activeColor,
}: {
  tab: { name: string; icon: number; label: string };
  isFocused: boolean;
  onPress: () => void;
  activeColor: string;
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
        {isFocused && (
          <View style={styles.activeMarker} pointerEvents="none">
            <Svg width={24} height={12} viewBox="0 0 24 12">
              <Path d={ACTIVE_TRIANGLE} fill={activeColor} />
            </Svg>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

function ModernTabBar({ state, navigation }: BottomTabBarProps) {
  // Guide: show bar on landing, hide on chat (immersive)
  const focused = state.routes[state.index];
  const hide = (focused.params as any)?.hideTabBar === true || (focused.params as any)?.hideTabBar === "true";
  if (focused?.name === "chat" && hide) return null;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const THEME = theme.palettes.tabBar;

  const tabs = [
    { name: "index", icon: TAB_ICONS.map, label: "Home" },
    { name: "community", icon: TAB_ICONS.discovery, label: "Discover" },
    { name: "chat", icon: TAB_ICONS.ai, label: "Guide" },
    { name: "awards", icon: TAB_ICONS.games, label: "Games" },
    { name: "profile", icon: TAB_ICONS.profile, label: "Profile" },
  ] as const;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(THEME.bg, 0), withAlpha(THEME.bg, 0.96)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.fade}
      />
      <View
        style={[
          styles.tabBar,
          {
            bottom: (insets.bottom || 0) + 16,
            backgroundColor: THEME.bg,
            borderColor: THEME.border,
            shadowColor: THEME.shadow,
          },
        ]}
      >
        {tabs.map((tab) => {
          const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
          if (routeIndex === -1) return null;

          const isFocused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: state.routes[routeIndex].key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(state.routes[routeIndex].name);
            }
          };

          return (
            <TabButton
              key={tab.name}
              tab={tab}
              isFocused={isFocused}
              onPress={onPress}
              activeColor={THEME.active}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 36,
    right: 36,
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
    height: 180,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  activeMarker: {
    position: "absolute",
    bottom: -8,
    alignSelf: "center",
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
