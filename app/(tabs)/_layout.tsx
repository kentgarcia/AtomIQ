import { Icon } from '@/components/ui/icon';
import { Tabs } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  
  // Orange Theme
  const THEME = {
    bg: '#1a1a1a',
    active: '#FF6B00', // Vibrant Orange
    inactive: '#666666',
  };

  const tabs = [
    { name: 'index', icon: 'Home' },
    { name: 'wiki', icon: 'Book' },
    { name: 'chat', icon: 'Message' },
    { name: 'leaderboard', icon: 'Ranking' },
    { name: 'profile', icon: 'Profile' },
  ] as const;

  return (
    <View
      style={[
        styles.tabBarOuter,
        {
          paddingBottom: Math.max(insets.bottom, 20),
        },
      ]}
    >
      <View style={styles.tabBarRow}>
        {/* Floating pill tab group */}
        <View style={styles.pillContainer}>
          {tabs.map((tab) => {
            const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
            if (routeIndex === -1) return null;

            const isFocused = state.index === routeIndex;
            const iconColor = isFocused ? '#FFFFFF' : THEME.inactive;

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
              <TouchableOpacity
                key={tab.name}
                onPress={onPress}
                activeOpacity={0.8}
                style={styles.tabButton}
              >
                <View
                  style={[
                    styles.iconWrapper,
                    isFocused && {
                      backgroundColor: THEME.active,
                      transform: [{ scale: 1.1 }],
                    },
                  ]}
                >
                  <Icon 
                    name={tab.icon as any} 
                    size={24} 
                    color={iconColor} 
                    variant={isFocused ? 'Bold' : 'Linear'}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="wiki"
        options={{
          title: 'Wiki',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'AI',
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Rank',
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
  tabBarOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24, // More padding for floating look
    backgroundColor: 'transparent',
    zIndex: 20,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  tabBarRow: {
    width: '100%',
    maxWidth: 360, // Limit width for pill shape
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a', // Dark background
    borderRadius: 35, // Full pill shape
    height: 70,
    width: '100%',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24, // Circle
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});