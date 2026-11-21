import {
    DarkTheme,
    DefaultTheme,
    Stack,
    ThemeProvider as NavigationThemeProvider,
    usePathname,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { ReduceMotion, ReducedMotionConfig } from "react-native-reanimated";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme } from "@/theme";
import { useAndroidBackPolicy } from "@/hooks/use-android-back";
import { ContentGate } from "@/components/content/ContentGate";
import { TutorialLayer } from "@/components/tutorial/TutorialLayer";
import { useAppFonts } from "@/hooks/use-app-fonts";
import { StorageProvider } from "@/services/StorageContext";
import { installMediaLifecycle, setMediaPathname } from "@/services/media";
import { initializeSfx, unloadSfx } from "@/services/sfx";
import { initMotionLevel, useMotionLevel } from "@/services/motion-level";
import { initCrashGuard } from "@/services/crash-guard";
import { CrashPrompt } from "@/components/crash/CrashPrompt";
import { PERF_PROBE_ON } from "@/components/dev/perf-flag";

// dev-perf: the frame counter and its readout; present only when the probe is in this build (components/dev/perf-flag.ts)
const PerfCollector: typeof import("@/components/dev/PerfCollector").PerfCollector | null = PERF_PROBE_ON ? require("@/components/dev/PerfCollector").PerfCollector : null;
const PerfHud: typeof import("@/components/dev/PerfHud").PerfHud | null = PERF_PROBE_ON ? require("@/components/dev/PerfHud").PerfHud : null;

// Keep the native splash up until fonts AND the content database are ready.
// ContentGate hides it as soon as it has something real to show.
SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: "(tabs)",
};

function AppContent() {
  const { theme, isDark } = useTheme();
  const pathname = usePathname();
  useAndroidBackPolicy();

  // Keep React Navigation chrome on the same palette as the app surfaces.
  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.error,
      },
    };
  }, [isDark, theme]);

  useEffect(() => {
    // Single media policy: route-aware SFX/music gates + stops narration.
    setMediaPathname(pathname);
  }, [pathname]);

  // The learner's animation level (Settings > Animations). At "Disabled" every Reanimated animation that follows the system's
  // reduced-motion setting is switched off too, and `useReducedMotion` (components/motion/use-reduced-motion.ts) says so to the rest.
  const motionLevel = useMotionLevel();
  useEffect(() => {
    void initMotionLevel();
    // Did the app die last time? (a flag kept while it is in front; the prompt below offers a lighter animation level)
    void initCrashGuard();
  }, []);

  useEffect(() => {
    void initializeSfx();
    // Preferences, AppState and screen-reader listeners for all media.
    const removeMediaLifecycle = installMediaLifecycle();

    return () => {
      removeMediaLifecycle();
      void unloadSfx();
    };
  }, []);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <View style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        {/* Nothing to go back to from onboarding: no swipe, no back gesture (the Android key is handled by the screen) */}
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* A lesson (and practice) fades in over the map: the node bubble zooms away first, then the preview fades up */}
        <Stack.Screen name="lesson" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="mythbuster" options={{ headerShown: false }} />
        <Stack.Screen name="practice" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="blog" options={{ headerShown: false }} />
        <Stack.Screen name="blogs" options={{ headerShown: false }} />
        <Stack.Screen name="reacted" options={{ headerShown: false }} />
        <Stack.Screen name="npc" options={{ headerShown: false }} />
        <Stack.Screen name="phone-apps" options={{ headerShown: false }} />
        <Stack.Screen name="ranks" options={{ headerShown: false }} />
        <Stack.Screen name="daily-facts" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="beta" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
        <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
        <Stack.Screen name="streak" options={{ headerShown: false }} />
        <Stack.Screen
          name="daily-streak"
          options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade" }}
        />
        <Stack.Screen name="lab" options={{ headerShown: false }} />
        <Stack.Screen name="explorer" options={{ headerShown: false }} />
        <Stack.Screen name="encyclopedia" options={{ headerShown: false }} />
        <Stack.Screen name="periodic-table" options={{ headerShown: false }} />
        <Stack.Screen name="achievements" options={{ headerShown: false }} />
        <Stack.Screen name="shop" options={{ headerShown: false }} />
        {/* dev-perf: the performance probe (components/dev/PerfProbe.tsx), redirects home when it is not in the build */}
        <Stack.Screen name="dev-perf" options={{ headerShown: false }} />
        <Stack.Screen
          name="achievement-detail"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      {/* Shrodi's tour: above every screen, so it can dim them and light one control (docs/features/TUTORIAL_SPEC.md) */}
      <TutorialLayer host="root" />
      <CrashPrompt />
      {motionLevel === "off" ? <ReducedMotionConfig mode={ReduceMotion.Always} /> : null}
      {/* dev-perf */}
      {PerfCollector ? <PerfCollector /> : null}
      {PerfHud ? <PerfHud /> : null}
      </View>
      <StatusBar style={isDark ? "light" : "dark"} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const fontsLoaded = useAppFonts();

  // Wait for fonts to load before rendering
  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StorageProvider>
        <ThemeProvider>
          <ContentGate>
            <AppContent />
          </ContentGate>
        </ThemeProvider>
      </StorageProvider>
    </GestureHandlerRootView>
  );
}
