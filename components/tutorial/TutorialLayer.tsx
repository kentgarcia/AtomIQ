/**
 * Shrodi's tour: the overlay (docs/features/TUTORIAL_SPEC.md §4). It dims the screen, lights one control, and Shrodi says
 * one short thing. Only the lit control can be touched: four touch strips swallow every other tap, and nothing
 * covers the hole, so a tap there reaches the real control underneath. (Not a `Modal`: a Modal is its own window
 * and takes every touch, hole or not.)
 *
 * Mounted twice, over the one store in `services/tutorial.ts`: `host="root"` in the root layout, and
 * `host="preview"` inside the lesson preview's modal, which sits over the root layer. A beat names its host and
 * only that layer draws it. The root layer also owns what is app-wide: it loads the tour, tells the store which
 * screen the route is (and reports `tab-*-opened`), sends the learner back into a lesson left half way, and plays
 * the closing moment that pays the tour's diamonds.
 *
 * It stays out of the way (`mayShow`): while a dialog or celebration is open, while the keyboard is up, off the
 * beat's own screen, on a lesson run or a game level, and with Tips off. The tour keeps its place meanwhile.
 */

import { usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Pressable, type GestureResponderEvent, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { emitClaimFlight } from "@/components/quests/claim-fx-bus";
import { getTarget, measureTarget } from "@/components/tutorial/target-registry";
import { Spotlight } from "@/components/tutorial/Spotlight";
import { openLockedAt } from "@/components/tutorial/lock-hits";
import { TourReward } from "@/components/tutorial/TourReward";
import { TutorialBubble } from "@/components/tutorial/TutorialBubble";
import {
  TUTORIAL_FX,
  bubbleSide,
  bubbleTop,
  holeFor,
  isSettled,
  mayLight,
  mayShow,
  missingAction,
  strips,
  type Rect,
} from "@/components/tutorial/tutorial-fx-core";
import { useTutorial, useTutorialBusy } from "@/hooks/use-tutorial";
import { playSfx } from "@/services/sfx";
import { useStorage } from "@/services/StorageContext";
import {
  claimTourReward,
  emitTutorial,
  finishLookBeat,
  installTutorialLifecycle,
  loadTutorial,
  refreshTutorialProgress,
  rewardIsDue,
  setTutorialScreen,
  skipBeat,
  skipTour,
  stepBackToStable,
  takeLessonRedirect,
} from "@/services/tutorial";
import { isQuietPath, screenOfPath, type TutorialHost } from "@/services/tutorial-core";
import { spacing } from "@/theme";

/** Switch on to log why the tour is (not) showing. */
const TOUR_DEBUG = false;

/** Two rectangles within `tol` dp of each other on every side. */
const sameRect = (a: Rect | null, b: Rect, tol = 0.5) => !!a && Math.abs(a.x - b.x) < tol && Math.abs(a.y - b.y) < tol && Math.abs(a.w - b.w) < tol && Math.abs(a.h - b.h) < tol;

export function TutorialLayer({ host = "root" }: { host?: TutorialHost }) {
  const isRoot = host === "root";
  const { snapshot, pick } = useTutorial();
  const pathname = usePathname();
  const router = useRouter();
  const { onboardingCompleted, isLoading } = useStorage();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const screenSize = useMemo(() => ({ w: width, h: height }), [width, height]);
  const screen = screenOfPath(pathname);

  /* ---- app-wide, root only -------------------------------------------------------------------- */

  useEffect(() => {
    if (!isRoot) return;
    return installTutorialLifecycle();
  }, [isRoot]);

  useEffect(() => {
    if (!isRoot || isLoading || !onboardingCompleted) return;
    void loadTutorial();
  }, [isRoot, isLoading, onboardingCompleted]);

  // The store learns which screen this is, and the tab beats finish when their tab opens
  useEffect(() => {
    if (!isRoot) return;
    setTutorialScreen(screen);
    if (screen === "feed") emitTutorial("tab-feed-opened");
    if (screen === "phone") emitTutorial("tab-phone-opened");
    if (screen) void refreshTutorialProgress();
  }, [isRoot, screen]);

  // The keyboard hides the overlay (the tour keeps its place)
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    if (!isRoot) return;
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboard(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [isRoot]);
  useTutorialBusy(isRoot && keyboard, "keyboard");

  // Lesson 1 left half way: back into it, once per session (docs/features/TUTORIAL_SPEC.md §6.3)
  useEffect(() => {
    if (!isRoot || !snapshot.loaded || screen !== "home" || snapshot.busy > 0) return;
    const t = setTimeout(() => {
      const target = takeLessonRedirect();
      if (target) router.push({ pathname: "/lesson/[id]", params: { id: target.lessonId, autostart: "1", resume: "continue" } });
    }, 700);
    return () => clearTimeout(t);
  }, [isRoot, snapshot.loaded, snapshot.steps, snapshot.busy, screen, router]);

  /* ---- may it draw? --------------------------------------------------------------------------- */

  const beat = pick?.beat ?? null;
  // A dialog or celebration just closed: wait a moment before coming back
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    if (snapshot.busy > 0) {
      setCalm(false);
      return;
    }
    const wait = snapshot.busyClearedAt ? Math.max(0, TUTORIAL_FX.busyHoldMs - (Date.now() - snapshot.busyClearedAt)) : 0;
    const t = setTimeout(() => setCalm(true), wait);
    return () => clearTimeout(t);
  }, [snapshot.busy, snapshot.busyClearedAt]);

  // A screen that has just opened (or a map still playing its own unlock moment) is left alone for a beat first
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    setEntered(false);
    const t = setTimeout(() => setEntered(true), snapshot.screen === "home" ? TUTORIAL_FX.homeHoldMs : TUTORIAL_FX.screenHoldMs);
    return () => clearTimeout(t);
  }, [snapshot.screen]);

  const allowed =
    !!beat &&
    entered &&
    !isQuietPath(pathname) &&
    mayShow({
      busy: snapshot.busy,
      sinceBusyClearedMs: calm ? TUTORIAL_FX.busyHoldMs : 0,
      onScreen: beat.screen === snapshot.screen,
      hostMatches: beat.host === host,
      enabled: snapshot.enabled && snapshot.loaded,
    });

  /* ---- measuring the lit control ---------------------------------------------------------------- */

  const beatId = beat?.id ?? null;
  const target = beat?.target ?? null;
  const stable = beat?.stable ?? true;
  // The lit control's rectangle and which beat it was measured for: after a beat ends the old hole stays as a picture
  // while the next control settles, but nothing in it can be touched until the new one is found
  const [spot, setSpot] = useState<{ id: string | null; rect: Rect } | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (!allowed || !target) {
      setSpot(null);
      setFallback(false);
      return;
    }
    let alive = true;
    const samples: (readonly [number, Rect])[] = [];
    let missingSince: number | null = null;
    let firstSeenAt: number | null = null;
    let scrolled = false;
    const tick = async () => {
      const r = await measureTarget(target);
      if (!alive) return;
      const now = Date.now();
      if (!r) {
        samples.length = 0;
        firstSeenAt = null;
        if (missingSince === null) {
          missingSince = now;
          if (!scrolled) {
            scrolled = true;
            getTarget(target)?.scrollIntoView?.();
          }
        }
        const action = missingAction(now - missingSince, stable);
        if (action === "fallback") setFallback(true);
        if (action === "step-back") stepBackToStable();
        return;
      }
      missingSince = null;
      if (firstSeenAt === null) firstSeenAt = now;
      setFallback(false);
      samples.push([now, r]);
      if (samples.length > 6) samples.shift();
      if (mayLight(samples, firstSeenAt, now)) {
        // A control lit only because it never held still (it pulses) moves the hole only when it has really gone elsewhere, not on every sample
        const tol = isSettled(samples) ? 0.5 : 4;
        setSpot((prev) => (prev && prev.id === beatId && sameRect(prev.rect, r, tol) ? prev : { id: beatId, rect: r }));
      }
    };
    // Quick while the control settles, relaxed once it has held still
    let timer: ReturnType<typeof setTimeout> | null = null;
    const loop = async () => {
      await tick();
      if (!alive) return;
      timer = setTimeout(() => void loop(), isSettled(samples) ? TUTORIAL_FX.restPollMs : TUTORIAL_FX.pollMs);
    };
    void loop();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [allowed, target, stable, beatId]);

  const rect = spot?.rect ?? null;
  const fresh = !!spot && spot.id === beatId;
  const visible = allowed && (!target || fallback || spot !== null);
  const lit = !!target && !fallback && fresh;
  const hole = !fallback && target && rect ? holeFor(rect, { radius: getTarget(target)?.radius ?? 16 }) : null;
  const mode = beat ? (fallback ? "look" : beat.mode) : "look";

  /* ---- taps on the dim ---------------------------------------------------------------------------- */

  const lastNudge = useRef(0);
  const onDimTap = useCallback((event?: GestureResponderEvent, originX = 0, originY = 0) => {
    // A soft "not that" cue, no motion: at most one every 600 ms
    const nudgeBubble = () => {
      const now = Date.now();
      if (now - lastNudge.current > 600) void playSfx("ui.invalid");
      lastNudge.current = now;
    };
    // A press on a locked tab (or the locked avatar) opens its dialog, so the learner can see why; any other tap is a nudge.
    // The point is the strip's own corner plus the touch inside it: the same space the hole is measured in, so a status bar or
    // navigation bar offset in the event's page coordinates cannot throw it off.
    const point = event?.nativeEvent;
    if (!point) return nudgeBubble();
    void openLockedAt(originX + point.locationX, originY + point.locationY).then((opened) => {
      if (!opened) nudgeBubble();
    });
  }, []);

  // "Skip this step" appears when a tap beat has waited; "Skip tour" asks twice
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    setWaited(false);
    if (!visible || mode !== "tap") return;
    const t = setTimeout(() => setWaited(true), TUTORIAL_FX.unreachableMs);
    return () => clearTimeout(t);
  }, [beatId, visible, mode]);
  const [confirmSkip, setConfirmSkip] = useState(false);
  useEffect(() => {
    if (!confirmSkip) return;
    const t = setTimeout(() => setConfirmSkip(false), 3000);
    return () => clearTimeout(t);
  }, [confirmSkip]);
  useEffect(() => setConfirmSkip(false), [beatId]);

  /* ---- bubble placement --------------------------------------------------------------------------- */

  const [bubbleH, setBubbleH] = useState(170);
  const side = bubbleSide(hole, screenSize, bubbleH, { top: insets.top + 8, bottom: insets.bottom + 8, gap: hole && mode === "tap" ? 12 + 36 : 12 });
  const top = bubbleTop(side, hole, screenSize, bubbleH, { top: insets.top + 8, bottom: insets.bottom + 8, gap: hole && mode === "tap" ? 12 + 36 : 12 });

  // Development only, and only when TOUR_DEBUG is switched on: one line each time the answer to "why is the tour not showing?" changes.
  // Off by default: stringifying and logging on every change slows a dev build down.
  useEffect(() => {
    if (!TOUR_DEBUG || !__DEV__ || !isRoot) return;
    console.log(
      "[tutorial]",
      JSON.stringify({
        loaded: snapshot.loaded,
        enabled: snapshot.enabled,
        onboardingDone: snapshot.progress.onboardingDone,
        path: pathname,
        screen: snapshot.screen,
        beat: beatId,
        beatScreen: beat?.screen ?? null,
        busy: snapshot.busy,
        busyBy: snapshot.busyBy,
        entered,
        calm,
        allowed,
        measured: spot !== null,
        fallback,
      }),
    );
  }, [isRoot, snapshot.loaded, snapshot.enabled, snapshot.progress.onboardingDone, pathname, snapshot.screen, beatId, beat?.screen, snapshot.busy, snapshot.busyBy, entered, calm, allowed, spot, fallback]);

  /* ---- the closing moment (root only) ---------------------------------------------------------------- */

  const [closing, setClosing] = useState<number | null>(null);
  const claiming = useRef(false);
  useEffect(() => {
    if (!isRoot || closing !== null || claiming.current || !calm || snapshot.busy > 0 || !snapshot.loaded || pick || !screen || isQuietPath(pathname)) return;
    if (!rewardIsDue()) return;
    claiming.current = true;
    void claimTourReward().then((paid) => {
      claiming.current = false;
      if (paid > 0) setClosing(paid);
    });
  }, [isRoot, closing, calm, snapshot.busy, snapshot.loaded, snapshot.steps, snapshot.progress, pick, screen, pathname]);

  // The diamonds fly to the counter when the moment ends (button, tap or timeout), so the number rises as they land
  const finishClosing = useCallback(() => {
    if (closing === null) return;
    emitClaimFlight({ x: width / 2, y: height * 0.5 }, { kind: "diamond", count: closing });
    setClosing(null);
  }, [closing, width, height]);
  useTutorialBusy(isRoot && closing !== null, "closing moment");

  /* ---- render ------------------------------------------------------------------------------------- */

  const showHand = lit && mode === "tap";
  const blockAll = mode === "look" || !hole || !fresh;
  const parts = hole && !blockAll ? strips(hole, screenSize) : null;

  const onGotIt = beat ? () => (beat.mode === "look" && !fallback ? finishLookBeat(beat.id) : skipBeat(beat.id)) : undefined;
  const bubbleWidth = Math.min(width - spacing.lg * 2, 460);

  return (
    <>
      {visible && beat && pick ? (
        <View key={host} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Spotlight hole={hole} screen={screenSize} hand={showHand} />

          {/* The touch strips: everything except the lit control swallows taps (a tap is a nudge, never a dismiss) */}
          {blockAll ? (
            <Pressable style={StyleSheet.absoluteFill} onPress={(e) => onDimTap(e)} accessible={false} importantForAccessibility="no" />
          ) : parts ? (
            (Object.values(parts) as Rect[]).map((r, i) =>
              r.w > 0 && r.h > 0 ? (
                <Pressable key={i} onPress={(e) => onDimTap(e, r.x, r.y)} accessible={false} importantForAccessibility="no" style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h }} />
              ) : null,
            )
          ) : null}

          <View pointerEvents="box-none" style={{ position: "absolute", left: (width - bubbleWidth) / 2, width: bubbleWidth, top }}>
            <TutorialBubble
              key={beat.id}
              text={beat.say}
              mood={beat.mood}
              index={pick.index}
              total={pick.total}
              onGotIt={mode === "look" ? onGotIt : undefined}
              onSkipStep={mode === "tap" && waited ? onGotIt : undefined}
              onSkipTour={pick.kind === "chapter" ? () => (confirmSkip ? void skipTour() : setConfirmSkip(true)) : undefined}
              confirmSkip={confirmSkip}
              onMeasure={setBubbleH}
            />
          </View>
        </View>
      ) : null}

      {isRoot && closing !== null ? <TourReward amount={closing} onDone={finishClosing} /> : null}
    </>
  );
}

