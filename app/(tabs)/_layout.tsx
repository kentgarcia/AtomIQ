import { Icon } from '@/components/ui/icon';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TabButton = ({ 
  tab, 
  isFocused, 
  onPress, 
  theme 
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
        <View style={[
          styles.iconContainer, 
          isFocused && { backgroundColor: theme.active + '15' }
        ]}>
          <Icon 
            name={tab.icon} 
            size={24} 
            color={isFocused ? theme.active : theme.inactive} 
            variant={isFocused ? 'Bold' : 'Linear'}
          />
        </View>
        <Text style={[
          styles.tabLabel, 
          { color: isFocused ? theme.active : theme.inactive, fontWeight: isFocused ? '700' : '500' }
        ]}>
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

function ModernTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const THEME = {
    bg: isDark ? '#1A1A1A' : '#FFFFFF',
    border: isDark ? '#2D3A56' : '#F0F0F0',
    active: '#5E72E4', // Matching Home Screen Primary
    inactive: isDark ? '#666666' : '#9CA3AF',
  };

  const tabs = [
    { name: 'index', icon: 'Home', label: 'Home' },
    { name: 'community', icon: 'People', label: 'Feed' },
    { name: 'chat', icon: 'Message', label: 'AI' },
    { name: 'awards', icon: 'Cup', label: 'Awards' },
    { name: 'profile', icon: 'Profile', label: 'Profile' },
  ] as const;

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom: insets.bottom + Platform.select({ ios: 0, android: 8 }),
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
            type: 'tabPress',
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
          display: 'none',
        },
      }}
      tabBar={(props) => <ModernTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'AI',
        }}
      />
      <Tabs.Screen
        name="awards"
        options={{
          title: 'Awards',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});