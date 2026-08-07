import { colors, fontSizes, opacity, radius, shadows, spacing } from "@/theme/tokens";
import { Icon } from "@/components/ui/icon";
import { useTheme, withAlpha } from "@/theme";
import { playButtonClickSfx } from "@/services/ui-sfx";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import React from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TabButton = ({
  tab,
  isFocused,
  onPress,
  theme,
}: {
  tab: any;
  isFocused: boolean;
  onPress: () => void;
  theme: any;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePress = () => {
    void playButtonClickSfx();
    scale.value = withSpring(0.9, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 10 });
    });
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={1}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        <View
          style={[
            styles.iconContainer,
            isFocused && { backgroundColor: withAlpha(theme.active, 0.08) },
          ]}
        >
          <Icon
            name={tab.icon}
            size={24}
            color={isFocused ? theme.active : theme.inactive}
            variant={isFocused ? "Bold" : "Linear"}
          />
        </View>
        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? theme.active : theme.inactive,
              fontWeight: isFocused ? "700" : "500",
            },
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

function ModernTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const THEME = theme.palettes.tabBar;

  const tabs = [
    { name: "index", icon: "Home", label: "Home" },
    { name: "community", icon: "People", label: "Feed" },
    { name: "chat", icon: "Message", label: "AI" },
    { name: "awards", icon: "Cup", label: "Awards" },
    { name: "profile", icon: "Profile", label: "Profile" },
  ] as const;

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom:
            (insets.bottom || 0) +
            (Platform.select({ ios: 0, android: 8 }) || 8),
          backgroundColor: THEME.bg,
          borderTopColor: THEME.border,
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
            theme={THEME}
          />
        );
      })}
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
          title: "Community",
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "AI",
        }}
      />
      <Tabs.Screen
        name="awards"
        options={{
          title: "Awards",
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
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.sm,
    elevation: shadows.md?.elevation ?? 8,
    shadowColor: colors.role.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: opacity.subtle,
    shadowRadius: shadows.md?.shadowRadius ?? 8,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  iconContainer: {
    padding: spacing.sm,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: fontSizes.xs,
    letterSpacing: 0.2,
  },
});
