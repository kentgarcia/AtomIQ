/**
 * Nuclear Map (docs/features/PHONE_SPEC.md §5.8): a flat world map in the app's own look (ocean and rounded land, `components/map/world-art.ts`,
 * Natural Earth data, public domain) with a pin for each place that matters in nuclear science: where things were discovered, researched,
 * powered and where accidents happened. Drag to pan, pinch or double-tap to zoom (the plus and minus buttons do the same), tap a pin for
 * its card. Offline: no tiles, no location, no network. The places are content (`map_sites`), worded from their cited pages and checked
 * by a person before publishing.
 *
 * While a finger is down the map layer moves with a transform (shared values, no React render); when it lifts the view is committed and
 * the vector map redraws sharp at the new zoom.
 */

import { WorldLayer, OCEAN } from "@/components/map/WorldLayer";
import {
  MAP_KINDS,
  MAP_KIND_COLORS,
  MAP_KIND_NAMES,
  MAX_ZOOM,
  MIN_ZOOM,
  WORLD_VIEW,
  clampView,
  countByKind,
  focusOnSite,
  kindOf,
  pannedView,
  placeCountText,
  sitePoint,
  toScreen,
  visibleSites,
  zoomedView,
  type MapSite,
  type MapView,
} from "@/components/map/map-core";
import { HeaderButton, ScreenHeader } from "@/components/layout";
import { EEL } from "@/components/lesson/visual/object-art";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useMapSites } from "@/hooks/use-phone-content";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PIN = 26;
/** The header sits on the ocean, a light fixed colour in both themes, so its ink is fixed too (theme exception EX-13). */
const INK = EEL[1];

export default function MapScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sites, loaded } = useMapSites();

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [rawView, setView] = useState<MapView>(WORLD_VIEW);
  const [off, setOff] = useState<ReadonlySet<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  const shown = useMemo(() => visibleSites(sites, off), [sites, off]);
  const counts = useMemo(() => countByKind(sites), [sites]);
  const open = useMemo(() => shown.find((s) => s.id === openId) ?? null, [shown, openId]);

  const W = size.w;
  const H = size.h;
  // the view stays valid when the screen changes size
  const view = useMemo(() => (W > 0 ? clampView(rawView, W, H) : rawView), [rawView, W, H]);

  // live gesture state, relative to the committed view
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sc = useSharedValue(1);
  const kNow = useSharedValue(view.k);

  // a committed view replaces the live transform, in the same frame as far as React allows
  useEffect(() => {
    kNow.value = view.k;
    tx.value = 0;
    ty.value = 0;
    sc.value = 1;
  }, [view, kNow, tx, ty, sc]);

  const commit = useCallback(
    (f: number, fx: number, fy: number, dx: number, dy: number) => {
      if (W === 0) return;
      setView((v) => {
        const zoomed = f === 1 ? v : zoomedView(v, f, fx, fy, W, H);
        return pannedView(zoomed, dx, dy, W, H);
      });
    },
    [W, H],
  );

  // What a zoom sounds like: the lessons' zoom in or out, or a short stop when the map is already at its limit
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  });
  const zoomSound = useCallback((f: number) => {
    if (Math.abs(f - 1) < 0.05) return;
    const k = viewRef.current.k;
    if ((f > 1 && k >= MAX_ZOOM - 0.01) || (f < 1 && k <= MIN_ZOOM + 0.01)) void playSfx("map.limit");
    else void playSfx(f > 1 ? "lesson.zoom-in" : "lesson.zoom-out");
  }, []);

  // The map opens and closes with its own sounds
  useEffect(() => {
    void playSfx("map.open");
    return () => void playSfx("map.close");
  }, []);

  const zoomBy = useCallback(
    (f: number) => {
      if (W === 0) return;
      zoomSound(f);
      setView((v) => zoomedView(v, f, W / 2, H / 2, W, H));
    },
    [W, H, zoomSound],
  );

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd((e, ok) => {
      if (ok) {
        runOnJS(zoomSound)(2);
        runOnJS(commit)(2, e.x, e.y, 0, 0);
      }
    });
  const pan = Gesture.Pan()
    .minDistance(4)
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(commit)(1, 0, 0, e.translationX, e.translationY);
    });
  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const f = Math.min(MAX_ZOOM / kNow.value, Math.max(MIN_ZOOM / kNow.value, e.scale));
      sc.value = f;
      // the point under the fingers stays put: scale about the view's centre, then shift by focal * (1 - f)
      tx.value = (e.focalX - W / 2) * (1 - f);
      ty.value = (e.focalY - H / 2) * (1 - f);
    })
    .onEnd((e) => {
      const f = Math.min(MAX_ZOOM / kNow.value, Math.max(MIN_ZOOM / kNow.value, e.scale));
      runOnJS(zoomSound)(e.scale);
      runOnJS(commit)(f, e.focalX, e.focalY, 0, 0);
    });
  const gesture = Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pan, pinch));

  const layerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: sc.value }] }));

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((s) => (Math.abs(s.w - width) < 1 && Math.abs(s.h - height) < 1 ? s : { w: width, h: height }));
  };

  const select = (site: MapSite) => {
    void playSfx("map.pin");
    setOpenId(site.id);
    if (W > 0) setView(focusOnSite(site, W, H, Math.max(view.k, 3), 120));
  };

  const toggleKind = (kind: string) => {
    // Switched on (it was off) or off
    void playSfx(off.has(kind) ? "ui.tab-right" : "ui.tab-left");
    setOff((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
    if (openId && kindOf(sites.find((s) => s.id === openId)?.kind ?? "") === kind) setOpenId(null);
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/phone"));

  return (
    <View style={styles.container}>
      <ScreenHeader title="Nuclear Map" subtitle={placeCountText(shown.length)} transparent color={INK} left={<HeaderButton icon="ArrowLeft2" label="Back to the phone" onPress={back} color={INK} />} />
      <View style={styles.map} onLayout={onLayout}>
        {W > 0 ? (
          <GestureDetector gesture={gesture}>
            <Animated.View style={[{ width: W, height: H }, layerStyle]} accessibilityLabel="World map. Drag to move, pinch to zoom.">
              <WorldLayer view={view} width={W} height={H} />
              {shown.map((site) => {
                const p = sitePoint(site);
                const at = toScreen(view, W, H, p.x, p.y);
                if (at.x < -PIN || at.x > W + PIN || at.y < -PIN || at.y > H + PIN) return null;
                const tone = MAP_KIND_COLORS[kindOf(site.kind)];
                const selected = site.id === openId;
                const size = selected ? PIN + 8 : PIN;
                return (
                  <Pressable
                    key={site.id}
                    onPress={() => select(site)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`${site.name}, ${site.place}, ${site.year}. ${MAP_KIND_NAMES[kindOf(site.kind)]}.`}
                    style={{ position: "absolute", left: at.x - size / 2, top: at.y - size / 2, width: size, height: size + 3 }}
                  >
                    <View style={{ position: "absolute", left: 0, top: 3, width: size, height: size, borderRadius: size / 2, backgroundColor: tone.lip }} />
                    <View style={{ position: "absolute", left: 0, top: 0, width: size, height: size, borderRadius: size / 2, backgroundColor: tone.face, borderWidth: 3, borderColor: selected ? c.onPrimary : "transparent", alignItems: "center", justifyContent: "center" }}>
                      <View style={{ width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15, backgroundColor: c.onPrimary }} />
                    </View>
                  </Pressable>
                );
              })}
            </Animated.View>
          </GestureDetector>
        ) : null}

        {/* the kinds, as switches */}
        <View style={styles.legend} pointerEvents="box-none">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legendRow}>
            {MAP_KINDS.filter((k) => counts[k] > 0).map((k) => {
              const on = !off.has(k);
              const tone = MAP_KIND_COLORS[k];
              return (
                <Pressable key={k} onPress={() => toggleKind(k)} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={`${MAP_KIND_NAMES[k]}, ${counts[k]}`} style={[styles.chip, { opacity: on ? 1 : 0.55 }]}>
                  <View style={[styles.chipDot, { backgroundColor: tone.face, borderBottomColor: tone.lip }]} />
                  <Text style={styles.chipText}>
                    {MAP_KIND_NAMES[k]} {counts[k]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* zoom buttons: the same as pinching, for anyone who cannot */}
        <View style={[styles.zoom, { bottom: open ? undefined : insets.bottom + 16, top: open ? 56 : undefined }]}>
          <ZoomButton icon="Add" label="Zoom in" disabled={view.k >= MAX_ZOOM - 0.01} onPress={() => zoomBy(1.6)} />
          <ZoomButton icon="Minus" label="Zoom out" disabled={view.k <= MIN_ZOOM + 0.01} onPress={() => zoomBy(1 / 1.6)} />
        </View>

        {loaded && sites.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No places in this version of the content yet.</Text>
          </View>
        ) : null}

        {open ? <SiteCard site={open} bottom={insets.bottom + 12} onClose={() => setOpenId(null)} /> : null}
      </View>
    </View>
  );
}

function ZoomButton({ icon, label, disabled, onPress }: { icon: string; label: string; disabled: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={{ width: 44, height: 47, opacity: disabled ? 0.4 : 1 }}>
      <View style={{ position: "absolute", left: 0, top: 3, width: 44, height: 44, borderRadius: 22, backgroundColor: c.borderStrong }} />
      <View style={{ position: "absolute", left: 0, top: 0, width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={22} color={c.text} variant="Bold" />
      </View>
    </Pressable>
  );
}

function SiteCard({ site, bottom, onClose }: { site: MapSite; bottom: number; onClose: () => void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const c = theme.colors;
  const router = useRouter();
  const kind = kindOf(site.kind);
  const tone = MAP_KIND_COLORS[kind];
  return (
    <View style={[styles.card, { bottom }]}>
      <View style={styles.cardHead}>
        <View style={[styles.kind, { backgroundColor: tone.face, borderBottomColor: tone.lip }]}>
          <Text style={styles.kindText}>{MAP_KIND_NAMES[kind]}</Text>
        </View>
        <Text style={styles.year}>{site.year}</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
          <Icon name="CloseCircle" size={26} color={c.textMuted} variant="Bold" />
        </Pressable>
      </View>
      <ScrollView style={{ maxHeight: 230 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Text style={styles.name} accessibilityRole="header">
          {site.name}
        </Text>
        <Text style={styles.place}>{site.place}</Text>
        <Text style={styles.fact}>{site.fact}</Text>
        {site.sources.length ? <Text style={styles.sources}>Sources: {site.sources.join("; ")}</Text> : null}
      </ScrollView>
      {site.entryId ? (
        <Button
          label="See in AtomDex"
          variant="secondary"
          size="compact"
          fullWidth={false}
          onPress={() => router.push(`/explorer/encyclopedia-entry?id=${encodeURIComponent(site.entryId as string)}`)}
          renderIcon={(color) => <Icon name="Book" size={16} color={color} variant="Bold" />}
        />
      ) : null}
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: OCEAN },
    map: { flex: 1, overflow: "hidden", backgroundColor: OCEAN },
    legend: { position: "absolute", left: 0, right: 0, top: 8 },
    legendRow: { paddingHorizontal: 16, gap: 8 },
    chip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: c.card },
    chipDot: { width: 14, height: 14, borderRadius: 7, borderBottomWidth: 2 },
    chipText: { fontSize: 13, lineHeight: 17, ...fontFaces.heavy, color: c.text },
    zoom: { position: "absolute", right: 16, gap: 8 },
    emptyBox: { position: "absolute", left: 24, right: 24, top: "40%", padding: 16, borderRadius: 16, backgroundColor: c.card },
    emptyText: { fontSize: 14, lineHeight: 20, ...fontFaces.semibold, color: c.textMuted, textAlign: "center" },
    card: { position: "absolute", left: 12, right: 12, gap: 10, padding: 16, borderRadius: 20, backgroundColor: c.card, borderWidth: 2, borderColor: c.border },
    cardHead: { flexDirection: "row", alignItems: "center", gap: 10 },
    kind: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderBottomWidth: 3 },
    kindText: { fontSize: 12, lineHeight: 16, ...fontFaces.heavy, color: c.onPrimary },
    year: { fontSize: 13, lineHeight: 17, ...fontFaces.heavy, color: c.textMuted },
    name: { fontSize: 20, lineHeight: 26, ...fontFaces.black, color: c.text },
    place: { fontSize: 13, lineHeight: 18, ...fontFaces.semibold, color: c.textMuted },
    fact: { fontSize: 15, lineHeight: 22, ...fontFaces.medium, color: c.text },
    sources: { fontSize: 11, lineHeight: 16, ...fontFaces.medium, color: c.textMuted },
  };
});
