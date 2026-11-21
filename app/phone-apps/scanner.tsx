/**
 * Atom Scanner (docs/features/PHONE_SPEC.md §8): a simulation, not a camera, drawn like a camera app. The scene fills the screen as the
 * viewfinder; the learner drags it under a fixed reticle, and when a thing is in the frame it locks on, the round shutter button
 * runs a 1.2 s scan (its ring fills) and the result rises as a sheet. Over the viewfinder: a dark translucent top bar (back, title) and
 * a status pill; under it a dark panel with the things in the scene, the scene strip (like a camera's modes) and the shutter between
 * two counters. `?target=<id>` opens that thing's scene with the reticle on it (a Field Notes clipping points back here). Logic is in
 * `components/scanner/scanner-core.ts`; nothing here uses a camera or a permission.
 */

import { EEL, SNOW, type ArtId } from "@/components/lesson/visual/object-art";
import { settle } from "@/components/motion/settle";
import { BandButton, BandRow, BandTitle } from "@/components/phone/band-header";
import { Reticle } from "@/components/scanner/Reticle";
import { ScanResultCard } from "@/components/scanner/ScanResultCard";
import { ScannerScene, VignetteArt } from "@/components/scanner/ScannerScene";
import { Shutter } from "@/components/scanner/Shutter";
import { SCAN_SCENES, SCENE_BY_ID } from "@/components/scanner/scan-scenes";
import {
  assembleResult,
  clampPan,
  collectionText,
  lockOn,
  maxViewHeight,
  panAfterDrag,
  scanMs,
  startPan,
} from "@/components/scanner/scanner-core";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useScanner } from "@/hooks/use-scanner";
import { recordScan } from "@/services/scanner";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// The camera chrome is dark and the same in light and dark mode, like a camera app: the dark is the object art's darkest Eel, the text its snow
const DARK = EEL[2];
const LIGHT = SNOW;
/** The panel under the viewfinder (things, scenes, shutter), without the bottom inset. */
const PANEL_H = 262;
const PANEL_RADIUS = 28;

export default function ScannerScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ target?: string }>();
  const { targets, scannedIds } = useScanner();

  // The scene is the whole screen above the panel (the panel's rounded top lets it show behind its corners)
  const viewW = Math.round(width);
  const panelH = PANEL_H + insets.bottom;
  const viewH = Math.round(
    Math.min(height - panelH + PANEL_RADIUS, maxViewHeight(viewW)),
  );
  const byId = useMemo(() => new Map(targets.map((t) => [t.id, t])), [targets]);

  // A deep link (`?target=`) opens the target's scene with the reticle on it
  const linked = useMemo(() => {
    const owner = SCAN_SCENES.find((sc) =>
      sc.places.some((p) => p.id === params.target),
    );
    const place = owner?.places.find((p) => p.id === params.target);
    return owner && place
      ? {
          scene: owner,
          pan: clampPan({ x: place.x + place.w / 2, y: place.y + place.h / 2 }),
          id: place.id,
        }
      : null;
  }, [params.target]);
  const [sceneId, setSceneId] = useState<string>(
    linked?.scene.id ?? SCAN_SCENES[0].id,
  );
  const scene = SCENE_BY_ID[sceneId] ?? SCAN_SCENES[0];
  const [locked, setLocked] = useState<string | null>(
    linked ? linked.id : null,
  );
  const [scanning, setScanning] = useState(false);
  const [shown, setShown] = useState<{
    id: string;
    isNew: boolean;
    key: number;
  } | null>(null);
  // Until the learner does something, a linked thing that was scanned before shows its result
  const [touched, setTouched] = useState(false);

  const panX = useSharedValue((linked?.pan ?? startPan(scene.places)).x);
  const panY = useSharedValue((linked?.pan ?? startPan(scene.places)).y);
  const dragFrom = useSharedValue({ x: 0, y: 0 });
  const clock = useSharedValue(0);
  const scanTarget = useRef<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const places = scene.places;

  // The reticle's lock-on, worked out on the JS thread as the drag moves (a state change only when it changes).
  const updateLock = (x: number, y: number) =>
    setLocked(lockOn(places, { x, y }));

  // A scan ends on a timer; the clock only draws it.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // The reticle locks on to something new (a link that opens already locked is not a lock-on)
  const lastLock = useRef<string | null>(locked);
  useEffect(() => {
    if (locked && locked !== lastLock.current) void playSfx("scanner.lock");
    lastLock.current = locked;
  }, [locked]);

  const stopScan = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    cancelAnimation(clock);
    clock.value = 0;
    scanTarget.current = null;
    setScanning(false);
  };

  // Dragging off the thing cancels the scan.
  useEffect(() => {
    if (scanning && locked !== scanTarget.current) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      cancelAnimation(clock);
      clock.value = 0;
      scanTarget.current = null;
      setScanning(false);
    }
  }, [locked, scanning, clock]);

  const goTo = (x: number, y: number) => {
    const p = clampPan({ x, y });
    cancelAnimation(panX);
    cancelAnimation(panY);
    if (reduced) {
      panX.value = p.x;
      panY.value = p.y;
    } else {
      const timing = { duration: 260, easing: Easing.out(Easing.cubic) };
      panX.value = withTiming(p.x, timing);
      panY.value = withTiming(p.y, timing);
    }
    setLocked(lockOn(places, p));
  };

  const pickScene = (id: string) => {
    if (id === sceneId) return;
    stopScan();
    setTouched(true);
    setShown(null);
    const next = SCENE_BY_ID[id];
    const p = startPan(next.places);
    cancelAnimation(panX);
    cancelAnimation(panY);
    panX.value = p.x;
    panY.value = p.y;
    setLocked(lockOn(next.places, p));
    setSceneId(id);
  };

  const drag = Gesture.Pan()
    .minDistance(2)
    .onBegin(() => {
      dragFrom.value = { x: panX.value, y: panY.value };
    })
    .onUpdate((e) => {
      const p = panAfterDrag(
        dragFrom.value,
        e.translationX,
        e.translationY,
        viewW,
      );
      panX.value = p.x;
      panY.value = p.y;
      runOnJS(updateLock)(p.x, p.y);
    });

  const finish = async () => {
    const id = scanTarget.current;
    scanTarget.current = null;
    setScanning(false);
    if (!id) return;
    const done = await recordScan(id);
    void playSfx("ui.select");
    setShown({ id, isNew: done?.first ?? false, key: Date.now() });
  };

  const startScan = () => {
    if (scanning) return;
    if (!locked) {
      // The shutter with nothing under the reticle
      void playSfx("scanner.miss");
      return;
    }
    scanTarget.current = locked;
    setTouched(true);
    setShown(null);
    setScanning(true);
    cancelAnimation(clock);
    clock.value = 0;
    clock.value = withTiming(scanMs(reduced), {
      duration: scanMs(reduced),
      easing: Easing.linear,
    });
    timer.current = setTimeout(() => void finish(), scanMs(reduced));
    // One rising sweep as the ring starts to fill
    void playSfx("scanner.scan");
  };

  const lockedTarget = locked ? byId.get(locked) : undefined;
  const showing =
    shown ??
    (!touched && linked && scannedIds.has(linked.id)
      ? { id: linked.id, isNew: false, key: 0 }
      : null);
  const result = showing ? byId.get(showing.id) : undefined;
  const scannedHere = scene.places.filter((p) => scannedIds.has(p.id)).length;

  const closeResult = () => {
    setTouched(true);
    setShown(null);
  };
  const totalTargets =
    targets.length || SCAN_SCENES.reduce((n, sc) => n + sc.places.length, 0);
  const statusText = scanning
    ? "Scanning…"
    : lockedTarget
      ? `Locked on: ${lockedTarget.name}`
      : "Drag to find something";
  const back = () => {
    void playSfx("phone.app-close");
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/phone");
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* The viewfinder: the scene under the reticle, dragged with one finger */}
      <GestureDetector gesture={drag}>
        <View
          style={[styles.viewport, { width: viewW, height: viewH }]}
          accessible
          accessibilityLabel={`${scene.name} scene. Drag to move the scanner over the scene, or choose a thing below.`}
        >
          <ScannerScene
            scene={scene}
            viewW={viewW}
            viewH={viewH}
            panX={panX}
            panY={panY}
          />
          <Reticle
            locked={locked !== null}
            clock={clock}
            scanning={scanning}
            reduced={reduced}
            idleColor={withAlpha(LIGHT, 0.9)}
            lockedColor={c.success}
            sweepColor={c.success}
          />
          <View
            style={[styles.status, { bottom: PANEL_RADIUS + 14 }]}
            pointerEvents="none"
          >
            <Text style={styles.statusText} accessibilityLiveRegion="polite">
              {statusText}
            </Text>
          </View>
        </View>
      </GestureDetector>

      {/* The top bar: a dark fade over the scene, with the app's usual header row on it */}
      <View
        style={[styles.top, { paddingTop: insets.top + 12 }]}
        pointerEvents="box-none"
      >
        <LinearGradient
          pointerEvents="none"
          colors={[withAlpha(DARK, 0.78), withAlpha(DARK, 0)]}
          style={StyleSheet.absoluteFill}
        />
        <BandRow
          left={
            <BandButton
              icon="ArrowLeft2"
              label="Back to the phone"
              onPress={back}
              color={LIGHT}
            />
          }
          center={
            <BandTitle
              title="Atom Scanner"
              subtitle={collectionText(scannedIds.size, totalTargets)}
              color={LIGHT}
            />
          }
        />
      </View>

      {/* The panel: the things in this scene, the scene strip like a camera's modes, and the shutter between two counters */}
      <View
        style={[
          styles.panel,
          { height: panelH, paddingBottom: insets.bottom + 12 },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thingsScroll}
          contentContainerStyle={styles.thingsRow}
        >
          {scene.places.map((p) => {
            const t = byId.get(p.id);
            const done = scannedIds.has(p.id);
            const on = locked === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  setTouched(true);
                  setShown(null);
                  goTo(p.x + p.w / 2, p.y + p.h / 2);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${t?.name ?? "A thing"}${done ? ", scanned" : ""}. Moves the scanner onto it.`}
                style={({ pressed }) => [
                  styles.thing,
                  pressed && { opacity: 0.65 },
                ]}
              >
                <View
                  style={[styles.thingFace, on && { borderColor: c.success }]}
                >
                  <View style={styles.thingArt}>
                    <VignetteArt object={p.object as ArtId} size={50} />
                  </View>
                  {done ? (
                    <View style={[styles.tick, { backgroundColor: c.success }]}>
                      <Icon
                        name="TickCircle"
                        size={14}
                        color={LIGHT}
                        variant="Bold"
                      />
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[styles.thingName, on && { color: LIGHT }]}
                  numberOfLines={1}
                >
                  {t?.name ?? ""}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.modes} accessibilityRole="tablist">
          {SCAN_SCENES.map((s) => {
            const on = s.id === sceneId;
            return (
              <Pressable
                key={s.id}
                onPress={() => pickScene(s.id)}
                hitSlop={8}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={styles.mode}
              >
                <Text style={[styles.modeText, on && styles.modeOn]}>
                  {s.name}
                </Text>
                <View
                  style={[
                    styles.modeDot,
                    { backgroundColor: on ? LIGHT : "transparent" },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.shutterRow}>
          <View
            style={styles.count}
            accessible
            accessibilityLabel={`${scannedHere} of ${scene.places.length} scanned in this scene`}
          >
            <Text style={styles.countValue}>
              {scannedHere}/{scene.places.length}
            </Text>
            <Text style={styles.countLabel}>here</Text>
          </View>
          <Shutter
            clock={clock}
            scanning={scanning}
            locked={locked !== null}
            reduced={reduced}
            onPress={startScan}
            label={
              locked
                ? `Scan ${lockedTarget?.name ?? "this"}`
                : "Scan. Move the scanner over a thing first."
            }
            ringColor={LIGHT}
            discColor={LIGHT}
            lockedColor={c.success}
            progressColor={c.success}
          />
          <View
            style={styles.count}
            accessible
            accessibilityLabel={collectionText(scannedIds.size, totalTargets)}
          >
            <Text style={styles.countValue}>
              {Math.min(scannedIds.size, totalTargets)}/{totalTargets}
            </Text>
            <Text style={styles.countLabel}>all</Text>
          </View>
        </View>
      </View>

      {/* The result rises from the bottom as a sheet over a dim scrim */}
      {result && showing ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: withAlpha(DARK, 0.5) },
            ]}
            onPress={closeResult}
            accessibilityRole="button"
            accessibilityLabel="Close the result"
          />
          <Animated.View
            key={showing.key}
            entering={settle(0)}
            style={[styles.sheet, { maxHeight: height * 0.82 }]}
          >
            <View style={styles.sheetBar}>
              <View style={styles.grip} />
              <Pressable
                onPress={closeResult}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close the result"
                style={styles.close}
              >
                <Icon
                  name="CloseCircle"
                  size={26}
                  color={c.textMuted}
                  variant="Bold"
                />
              </Pressable>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: insets.bottom + 20,
              }}
            >
              <ScanResultCard
                result={assembleResult(result)}
                isNew={showing.isNew}
                reduced={reduced}
              />
            </ScrollView>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: DARK },
    viewport: {
      position: "absolute",
      left: 0,
      top: 0,
      overflow: "hidden",
      backgroundColor: DARK,
    },
    top: { position: "absolute", left: 0, right: 0, top: 0, paddingBottom: 28 },
    status: { position: "absolute", left: 0, right: 0, alignItems: "center" },
    statusText: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 14,
      overflow: "hidden",
      fontSize: 13,
      lineHeight: 18,
      ...fontFaces.heavy,
      color: LIGHT,
      backgroundColor: withAlpha(DARK, 0.72),
    },
    panel: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      borderTopLeftRadius: PANEL_RADIUS,
      borderTopRightRadius: PANEL_RADIUS,
      paddingTop: 14,
      backgroundColor: DARK,
      justifyContent: "space-between",
    },
    thingsScroll: { flexGrow: 0 },
    thingsRow: { paddingHorizontal: 20, gap: 12 },
    thing: { width: 64, alignItems: "center", gap: 4 },
    thingFace: {
      width: 56,
      height: 56,
      borderRadius: 18,
      borderWidth: 3,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(LIGHT, 0.14),
    },
    thingArt: { width: 50, height: 50, borderRadius: 15, overflow: "hidden" },
    tick: {
      position: "absolute",
      right: -4,
      top: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    thingName: {
      fontSize: 11,
      lineHeight: 14,
      textAlign: "center",
      ...fontFaces.heavy,
      color: withAlpha(LIGHT, 0.65),
    },
    modes: { flexDirection: "row", justifyContent: "center", gap: 26 },
    mode: { alignItems: "center", gap: 3, paddingVertical: 2 },
    modeText: {
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      ...fontFaces.heavy,
      color: withAlpha(LIGHT, 0.55),
    },
    modeOn: { color: LIGHT },
    modeDot: { width: 5, height: 5, borderRadius: 3 },
    shutterRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 36,
    },
    count: { width: 64, alignItems: "center" },
    countValue: {
      fontSize: 18,
      lineHeight: 24,
      ...fontFaces.black,
      color: LIGHT,
    },
    countLabel: {
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      ...fontFaces.heavy,
      color: withAlpha(LIGHT, 0.55),
    },
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      borderTopLeftRadius: PANEL_RADIUS,
      borderTopRightRadius: PANEL_RADIUS,
      backgroundColor: c.mapBackground,
      overflow: "hidden",
    },
    sheetBar: { alignItems: "center", justifyContent: "center", height: 44 },
    grip: { width: 40, height: 5, borderRadius: 3, backgroundColor: c.border },
    close: { position: "absolute", right: 14, top: 9 },
  };
});
