import { useEffect, useRef } from "react";
import { Alert, BackHandler, Platform, ToastAndroid } from "react-native";
import { usePathname, useRouter } from "expo-router";

/**
 * Global Android hardware-back policy (Google Play readiness).
 *
 * iPhone has no system back button, so every hardware-back path was
 * untested. Only Atom Maze handled it (`app/explorer/atom-maze.tsx`).
 * This hook owns the policy for every other route:
 *
 * - Tab roots / onboarding → double-tap-to-exit (first press toasts,
 *   second press within 2 s lets the OS exit). Prevents instant,
 *   accidental app exits.
 * - Active flows (lesson, quiz, mythbuster) → exit-confirmation dialog,
 *   mirroring the Atom Maze behavior. Prevents silent progress loss.
 * - Atom Maze → untouched; the screen's own handler decides.
 * - Everything else → system default (expo-router pops the stack).
 */

const TAB_ROOTS = new Set([
  "",
  "/",
  "/community",
  "/chat",
  "/awards",
  "/profile",
  "/onboarding",
]);

/** Routes where backing out can silently discard session progress. */
const CONFIRM_PREFIXES = ["/lesson", "/quiz", "/mythbuster"];

/** Routes with their own BackHandler (must not double-handle). */
const OWN_HANDLER_PREFIXES = ["/explorer/atom-maze"];

const DOUBLE_TAP_EXIT_MS = 2000;

export const normalizeBackRoute = (
  pathname: string | null | undefined,
): string => {
  if (!pathname) {
    return "";
  }

  return pathname
    .toLowerCase()
    .replace(/\/(\([^/]+\))/g, "")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
};

const startsWithRoute = (route: string, prefix: string): boolean =>
  route === prefix || route.startsWith(`${prefix}/`);

export function useAndroidBackPolicy(): void {
  const pathname = usePathname();
  const router = useRouter();
  const lastRootBackAt = useRef(0);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        const route = normalizeBackRoute(pathname);

        if (OWN_HANDLER_PREFIXES.some((p) => startsWithRoute(route, p))) {
          return false;
        }

        if (TAB_ROOTS.has(route)) {
          const now = Date.now();
          if (now - lastRootBackAt.current < DOUBLE_TAP_EXIT_MS) {
            // Second tap: let the OS exit.
            return false;
          }
          lastRootBackAt.current = now;
          ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
          return true;
        }

        if (CONFIRM_PREFIXES.some((p) => startsWithRoute(route, p))) {
          Alert.alert(
            "Leave this session?",
            "Your progress in this session will be lost.",
            [
              { text: "Stay", style: "cancel" },
              {
                text: "Leave",
                style: "destructive",
                onPress: () => router.back(),
              },
            ],
          );
          return true;
        }

        // System default: expo-router pops the stack.
        return false;
      },
    );

    return () => subscription.remove();
  }, [pathname, router]);
}
