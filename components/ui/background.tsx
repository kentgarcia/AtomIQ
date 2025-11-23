import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StatusBar, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Modern "Nuclear Future" Palette - Light Mode
export const ATOMIC_THEME = {
  NEON_CYAN: '#00BCD4', // Darker cyan for better contrast on white
  DEEP_BG_START: '#FFFFFF',
  DEEP_BG_END: '#F0F4F8', // Very subtle cool gray/blue
  GLASS_WHITE: 'rgba(255, 255, 255, 0.8)',
  GLASS_BORDER: 'rgba(0, 188, 212, 0.15)', // Subtle cyan border
  TEXT_PRIMARY: '#1A202C', // Dark gray almost black
  TEXT_SECONDARY: '#718096', // Cool gray
  SUCCESS_GREEN: '#00C853',
  ERROR_RED: '#D50000',
};

interface BackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Background({ children, style }: BackgroundProps) {
  return (
    <LinearGradient
      colors={[ATOMIC_THEME.DEEP_BG_START, ATOMIC_THEME.DEEP_BG_END]}
      style={[styles.container, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});

