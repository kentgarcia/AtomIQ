import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useColorScheme } from "@/theme";
import { useSnPro } from "@/hooks/use-snpro";
import { ensureContentDatabase } from "@/services/content-db";
import { StorageProvider } from "@/services/StorageContext";
import {
    initializeUiSfx,
    installGlobalUiSfxHandlers,
    setUiSfxPathname,
    unloadUiSfx,
} from "@/services/ui-sfx";

export const unstable_settings = {
  anchor: "(tabs)",
};

function AppContent() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();

  useEffect(() => {
    setUiSfxPathname(pathname);
  }, [pathname]);

  useEffect(() => {
    installGlobalUiSfxHandlers();
    void initializeUiSfx();

    // Prime the bundled content database (lessons/quizzes/myths/facts/games).
    void ensureContentDatabase().catch((e) => {
      console.error("[content-db] Startup seeding failed:", e);
    });

    return () => {
      void unloadUiSfx();
    };
  }, []);

  return (
    <NavigationThemeProvider
      value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lesson" options={{ headerShown: false }} />
        <Stack.Screen name="mythbuster" options={{ headerShown: false }} />
        <Stack.Screen name="health-check" options={{ headerShown: false }} />
        <Stack.Screen name="quiz" options={{ headerShown: false }} />
        <Stack.Screen name="quiz-results" options={{ headerShown: false }} />
        <Stack.Screen name="leaderboard" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
        <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
        <Stack.Screen name="streak" options={{ headerShown: false }} />
        <Stack.Screen name="lab" options={{ headerShown: false }} />
        <Stack.Screen name="explorer" options={{ headerShown: false }} />
        <Stack.Screen name="atom-maze" options={{ headerShown: false }} />
        <Stack.Screen name="encyclopedia" options={{ headerShown: false }} />
        <Stack.Screen
          name="achievement-detail"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen name="article-detail" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const snProLoaded = useSnPro();

  // Wait for fonts to load before rendering
  if (!snProLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StorageProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </StorageProvider>
    </GestureHandlerRootView>
  );
}
