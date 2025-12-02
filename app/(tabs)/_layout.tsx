import { Icon } from '@/components/ui/icon';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';

function DuolingoTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  
  const THEME = {
    bg: '#FFFFFF',
    border: '#E5E5E5',
    active: '#EA580C',
    inactive: '#AFAFAF',
  };

  const tabs = [
    { name: 'index', icon: 'Home', label: 'Home' },
    { name: 'community', icon: 'People', label: 'Feed' },
    { name: 'chat', icon: 'Message', label: 'AI' },
    { name: 'leaderboard', icon: 'Ranking', label: 'Rank' },
    { name: 'profile', icon: 'Profile', label: 'Profile' },
  ] as const;

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: THEME.bg,
          borderTopColor: THEME.border,
        },
      ]}
    >
      {tabs.map((tab) => {
        const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
        if (routeIndex === -1) return null;

        const isFocused = state.index === routeIndex;
        const color = isFocused ? THEME.active : THEME.inactive;

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
            activeOpacity={0.7}
            style={styles.tabButton}
          >
            {isFocused ? (
              <View style={styles.activeTabWrapper}>
                <View style={styles.activeTabShadow} />
                <View style={[styles.activeTabContent, { backgroundColor: THEME.active }]}>
                  <Icon 
                    name={tab.icon as any} 
                    size={26} 
                    color="#FFFFFF" 
                    variant="Bold"
                  />
                  <Text style={[styles.tabLabel, { color: '#FFFFFF' }]}>
                    {tab.label}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.tabContent}>
                <Icon 
                  name={tab.icon as any} 
                  size={26} 
                  color={color} 
                  variant="Linear"
                />
                <Text style={[styles.tabLabel, { color }]}>
                  {tab.label}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
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
          display: 'none',
        },
      }}
      tabBar={(props) => <DuolingoTabBar {...props} />}
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
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  activeTabWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabShadow: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    bottom: -4,
    backgroundColor: '#CC5500',
    borderRadius: 16,
  },
  activeTabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});