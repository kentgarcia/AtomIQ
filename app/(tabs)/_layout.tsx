import { colors, spacing } from "@/theme/tokens";
import { Icon } from "@/components/ui/icon";
import {useTheme, withAlpha} from "@/theme";
import { playButtonClickSfx } from "@/services/ui-sfx";
import { LinearGradient } from "expo-linear-gradient";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import React from "react";
import {
    StyleSheet,
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
            isFocused && { backgroundColor: withAlpha(theme.active, 0.1) },
          ]}
        >
          <Icon
            name={tab.icon}
            size={26}
            color={isFocused ? theme.active : theme.inactive}
            variant={isFocused ? "Bold" : "Linear"}
          />
        </View>
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
    { name: "community", icon: "People", label: "Discover" },
    { name: "chat", icon: "Message", label: "AI" },
    { name: "awards", icon: "Cup", label: "Awards" },
    { name: "profile", icon: "Profile", label: "Profile" },
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
            backgroundColor: colors.role.onSurface,
            borderColor: THEME.border,
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
    shadowColor: colors.role.black,
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
