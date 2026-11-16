/**
 * ContentGate — holds the app back until the content database is ready.
 *
 * Seeding (services/content-db.ts) copies the bundled lessons into on-device
 * storage on first launch and after every content update. Without a gate each
 * screen would wait on that copy by itself and fail on its own if it broke.
 * Here the splash stays up while it runs, a short "Preparing lessons…" screen
 * covers a slow first launch after an update, and a failure shows one error
 * screen with a retry button.
 *
 * User progress lives in a separate database, so none of this touches it.
 */

import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { ensureContentDatabase, retryContentDatabase } from "@/services/content-db";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme } from "@/theme";

/** Below this the splash simply stays up; no flash of a loading screen. */
export const CONTENT_GATE_SLOW_MS = 800;

type Phase = "loading" | "slow" | "ready" | "error";

export function ContentGate({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const slowTimer = setTimeout(() => {
      if (!cancelled) setPhase((p) => (p === "loading" ? "slow" : p));
    }, CONTENT_GATE_SLOW_MS);

    const run = attempt === 0 ? ensureContentDatabase() : retryContentDatabase();
    run
      .then(() => {
        if (!cancelled) setPhase("ready");
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setPhase("error");
      })
      .finally(() => clearTimeout(slowTimer));

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [attempt]);

  const retry = () => {
    setError(null);
    setPhase("loading");
    setAttempt((n) => n + 1);
  };

  // Anything other than "still silently loading" needs the real screen visible.
  useEffect(() => {
    if (phase !== "loading") SplashScreen.hideAsync().catch(() => {});
  }, [phase]);

  if (phase === "ready") return <>{children}</>;
  if (phase === "loading") return null; // native splash is still showing

  if (phase === "slow") {
    return (
      <View style={styles.screen} accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.title}>Preparing lessons…</Text>
        <Text style={styles.body}>Setting up the latest content. This only takes a moment.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen} accessibilityRole="alert">
      <Text style={styles.title}>Couldn&apos;t load the lessons</Text>
      <Text style={styles.body}>
        Your progress is safe: it is stored separately from the lessons. Please try again.
      </Text>
      {error ? (
        <ScrollView style={styles.detailBox} contentContainerStyle={styles.detailContent}>
          <Text style={styles.detail} selectable>
            {error}
          </Text>
        </ScrollView>
      ) : null}
      <Button label="Try again" onPress={retry} style={styles.button} />
    </View>
  );
}

const makeStyles = createStyles((theme) => ({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    padding: spacing["3xl"],
    backgroundColor: theme.colors.background,
  },
  title: {
    ...fontFaces.heavy,
    fontSize: fontSizes["5xl"],
    color: theme.colors.text,
    textAlign: "center",
  },
  body: {
    ...fontFaces.book,
    fontSize: fontSizes.xl,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  detailBox: {
    maxHeight: 120,
    alignSelf: "stretch",
    borderRadius: radius.md,
    backgroundColor: theme.colors.errorSurface,
  },
  detailContent: {
    padding: spacing.md,
  },
  detail: {
    ...fontFaces.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.error,
  },
  button: {
    alignSelf: "stretch",
  },
}));
