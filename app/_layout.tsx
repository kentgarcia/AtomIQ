import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import * as Linking from "expo-linking";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import "react-native-reanimated";

import { ThemeProvider, useColorScheme } from "@/theme";
import { useSnPro } from "@/hooks/use-snpro";
import { StorageProvider } from "@/services/StorageContext";
import LocalFirstSyncBootstrap from "@/services/local-first/SyncBootstrap";
import { LocalFirstProvider } from "@/services/local-first/hooks";
import {
    completeSupabaseAuthFromRedirectUrl,
    isSupabaseConfigured,
} from "@/services/supabase";
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
  const handledAuthUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setUiSfxPathname(pathname);
  }, [pathname]);

  useEffect(() => {
    installGlobalUiSfxHandlers();
    void initializeUiSfx();

    return () => {
      void unloadUiSfx();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    let isMounted = true;

    const maybeHandleAuthRedirect = async (url: string | null | undefined) => {
      if (!url || !isMounted) {
        return;
      }

      if (!/(?:\?|#).*(access_token|refresh_token|code|error)=/.test(url)) {
        return;
      }

      if (handledAuthUrlsRef.current.has(url)) {
        return;
      }

      handledAuthUrlsRef.current.add(url);

      const result = await completeSupabaseAuthFromRedirectUrl(url);
      if (result.status === "error" && result.message) {
        console.warn("Auth callback handling failed:", result.message);
      }
    };

    void Linking.getInitialURL().then((url) => {
      void maybeHandleAuthRedirect(url);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void maybeHandleAuthRedirect(url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
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
        <Stack.Screen name="ai-chat" options={{ headerShown: false }} />
        <Stack.Screen name="mythbuster" options={{ headerShown: false }} />
        <Stack.Screen name="health-check" options={{ headerShown: false }} />
        <Stack.Screen name="quiz" options={{ headerShown: false }} />
        <Stack.Screen name="quiz-results" options={{ headerShown: false }} />
        <Stack.Screen name="leaderboard" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="streak" options={{ headerShown: false }} />
        <Stack.Screen name="missions" options={{ headerShown: false }} />
        <Stack.Screen
          name="daily-fact"
          options={{ headerShown: false, presentation: "modal" }}
        />
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
    <LocalFirstProvider>
      <LocalFirstSyncBootstrap />
      <StorageProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </StorageProvider>
    </LocalFirstProvider>
  );
}
