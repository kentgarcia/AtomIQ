/**
 * Atom Maze story mode: the level map. The story is told in worlds (the tutorial, then each unit of the
 * lessons in its own biome), five levels each, strung along a winding road. The stops are the lesson
 * map's own (round pucks on a lip in the world's colour, fireflies round the next one, the speech
 * bubble that pops out when one is tapped), so the two maps feel like one app; the scenery along the
 * road is the game's own props. A level opens once the one before it is won. Opened from Games >
 * Atom Maze; the bubble's "Play" pushes the platformer with the level's id. The maths (where a stop
 * sits, the road, the stars, the scenery, the scroll) is in components/platformer/story-map-core.ts; what
 * is open, and which level is next, in story-core.ts.
 */

import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { settle } from "@/components/motion/settle";
import { LessonNode } from "@/components/path/LessonNode";
import { NodeBubble } from "@/components/path/NodeBubble";
import { unitPalette, type UnitPalette } from "@/components/path/unit-theme";
import { levelsOfWorld, STORY_LEVELS, STORY_WORLDS, type StoryLevel, type StoryWorld } from "@/components/platformer/story-levels";
import { MAP, decorFor, nextStop, pathHeight, roadSegments, scrollTarget, stopStatus, stopX, stopY, worldHeight, worldOpen, worldStars } from "@/components/platformer/story-map-core";
import { BIOMES, SCENERY_SPRITES } from "@/components/platformer/sprites";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useStoryProgress } from "@/hooks/use-story-progress";
import { impactLight } from "@/services/haptics";
import { playSfx } from "@/services/sfx";
import { useTutorialTarget } from "@/components/tutorial/use-tutorial-target";
import { emitTutorial } from "@/services/tutorial";
import { createStyles, fontFaces, fontSizes, pickReadableText, radius, useResponsiveLayout, useTheme, withAlpha } from "@/theme";

/** How far the banner's lip shows under its face, dp (the lesson map's unit card, `CARD_LIP`). */
const BANNER_LIP = 6;
/** Room above the first banner, dp. */
const PAD_TOP = 16;
/** The picture window in a banner, dp. */
const SCENE = 88;
/** How far under a stop's centre its stars and name sit. */
const STARS_DROP = 58;
const NAME_DROP = 82;
/** The bubble opens above the stops from this place in a world on (there is more room above them than below). */
const BUBBLE_ABOVE_FROM = 3;

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    screen: { flex: 1, backgroundColor: c.mapBackground },
    /* The lesson map's unit card: a face on its own rounded lip layer, so the lip curves with the corners */
    banner: { position: "absolute", top: 0, height: MAP.bannerH },
    bannerLip: { position: "absolute", top: BANNER_LIP, left: 0, right: 0, bottom: 0, borderRadius: 20 },
    bannerFace: { height: MAP.bannerH - BANNER_LIP, borderRadius: 20, overflow: "hidden", flexDirection: "row", alignItems: "center", gap: 14, paddingLeft: 18, paddingRight: 14 },
    bannerCopy: { flex: 1, gap: 2 },
    tag: { ...fontFaces.heavy, fontSize: 11, letterSpacing: 0.9, textTransform: "uppercase" },
    bannerTitle: { ...fontFaces.heavy, fontSize: 22, lineHeight: 27 },
    bannerSubtitle: { ...fontFaces.semibold, fontSize: fontSizes.sm, lineHeight: 18 },
    pill: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", marginTop: 6, paddingVertical: 3, paddingLeft: 7, paddingRight: 10, borderRadius: radius.full },
    pillText: { ...fontFaces.heavy, fontSize: 13 },
    scene: { width: SCENE, height: SCENE, borderRadius: radius.lg, overflow: "hidden", borderWidth: 3 },
    sceneImage: { position: "absolute", width: SCENE * 2.1, height: SCENE * 2.1, left: -SCENE * 0.55, top: -SCENE * 0.78 },
    lockOver: { position: "absolute", right: 6, bottom: 6, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    stars: { position: "absolute", width: 90, flexDirection: "row", justifyContent: "center", gap: 3 },
    name: { position: "absolute", width: 150, textAlign: "center", ...fontFaces.bold, fontSize: 13, lineHeight: 17 },
    nameDim: { color: c.textMuted },
  };
});

function StarsRow({ x, y, earned, colors }: { x: number; y: number; earned: number; colors: { on: string; off: string } }) {
  const styles = useStyles(useTheme().theme);
  return (
    <View pointerEvents="none" accessible={false} style={[styles.stars, { left: x - 45, top: y + STARS_DROP }]}>
      {[1, 2, 3].map((n) => (
        <Icon key={n} name="Star1" size={19} variant="Bold" color={n <= earned ? colors.on : colors.off} />
      ))}
    </View>
  );
}

function WorldBanner({ world, palette, open, stars, left, right }: { world: StoryWorld; palette: UnitPalette; open: boolean; stars: { earned: number; total: number }; left: number; right: number }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const face = open ? palette.face : c.borderStrong;
  const lip = open ? palette.lip : c.border;
  const ink = open ? palette.ink : pickReadableText(face, [c.text, c.onPrimary]);
  const biome = BIOMES[world.biome];
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${world.tag}: ${world.title}. ${stars.earned} of ${stars.total} stars${open ? "" : ". Locked"}`}
      style={[styles.banner, { left, right }]}
    >
      <View pointerEvents="none" style={[styles.bannerLip, { backgroundColor: lip }]} />
      <View style={[styles.bannerFace, { backgroundColor: face }]}>
      <View style={styles.bannerCopy}>
        <Text style={[styles.tag, { color: withAlpha(ink, 0.78) }]}>{world.tag}</Text>
        <Text style={[styles.bannerTitle, { color: ink }]} numberOfLines={2}>
          {world.title}
        </Text>
        <Text style={[styles.bannerSubtitle, { color: withAlpha(ink, 0.88) }]} numberOfLines={2}>
          {world.subtitle}
        </Text>
        <View style={[styles.pill, { backgroundColor: withAlpha(ink, 0.18) }]}>
          <Icon name="Star1" size={16} variant="Bold" color={ink} />
          <Text style={[styles.pillText, { color: ink }]}>
            {stars.earned} / {stars.total}
          </Text>
        </View>
      </View>
      <View style={[styles.scene, { borderColor: withAlpha(ink, 0.55), opacity: open ? 1 : 0.6 }]}>
        <Image source={biome.color} style={styles.sceneImage} resizeMode="cover" fadeDuration={0} />
        {open ? null : (
          <View style={[styles.lockOver, { backgroundColor: face }]}>
            <Icon name="Lock" size={16} variant="Bold" color={ink} />
          </View>
        )}
      </View>
      </View>
    </View>
  );
}

export default function StoryScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { width: windowW } = useWindowDimensions();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const { records, loaded } = useStoryProgress();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [viewportH, setViewportH] = useState(0);
  const [selected, setSelected] = useState<{ id: string } | null>(null);
  const dismiss = useCallback(() => setSelected(null), []);

  const mapWidth = Math.min(windowW, contentMaxWidth);
  const worlds = useMemo(() => STORY_WORLDS.map((world) => ({ world, levels: levelsOfWorld(world) })), []);
  const ids = useMemo(() => worlds.flatMap((w) => w.levels.map((l) => l.id)), [worlds]);
  const counts = useMemo(() => worlds.map((w) => w.levels.length), [worlds]);
  const next = useMemo(() => nextStop(STORY_WORLDS, records), [records]);

  // Open scrolled to the next level, once the progress and the screen's height are known
  const placed = useRef(false);
  useEffect(() => {
    if (placed.current || !loaded || viewportH === 0) return;
    placed.current = true;
    const y = scrollTarget({ counts, worldIndex: next.worldIndex, levelPosition: next.position, viewportH, pad: PAD_TOP });
    if (y > 0) scrollRef.current?.scrollTo({ y, animated: false });
  }, [loaded, viewportH, counts, next]);

  // Shrodi's first visit lights the first level's stop (docs/features/TUTORIAL_SPEC.md §5.4)
  const firstLit = useTutorialTarget("story.level-1", { radius: "round" });

  const pick = (level: StoryLevel, status: "locked" | "current" | "completed") => {
    impactLight();
    if (selected?.id === level.id) {
      setSelected(null);
      return;
    }
    setSelected({ id: level.id });
    if (status === "current") emitTutorial("story-level-opened");
    void (status === "locked" ? playSfx("ui.lock") : playSfx("reward.pop", { volume: 0.7 }));
  };

  let globalBase = 0;
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Atom Maze" subtitle="Story mode" onBack={() => router.back()} backLabel="Back to games" scrolled={scrolled} />
      <ScrollView
        ref={scrollRef}
        onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
        onScroll={onScroll}
        onScrollBeginDrag={dismiss}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingTop: PAD_TOP, paddingBottom: insets.bottom + 40 }}
      >
        {worlds.map(({ world, levels }, wi) => {
          const base = globalBase;
          globalBase += levels.length;
          const palette = unitPalette(c, world.paletteIndex, isDark);
          const open = worldOpen(base, ids, records);
          const stars = worldStars(world.levelIds, records);
          const statuses = levels.map((_, i) => stopStatus(base + i, ids, records));
          const segments = roadSegments(mapWidth, statuses);
          const decor = decorFor(levels.map((l) => l.biome), mapWidth, 31 + wi * 17);
          const winsHere = statuses.filter((s) => s === "completed").length;
          const hasBubble = levels.some((l) => l.id === selected?.id);
          const margin = gutter + 4;
          return (
            <Animated.View
              key={world.id}
              entering={settle(wi * 60)}
              style={{ height: worldHeight(levels.length), marginTop: wi === 0 ? 0 : MAP.worldGap, zIndex: hasBubble ? 5 : 0 }}
            >
              <WorldBanner world={world} palette={palette} open={open} stars={stars} left={margin} right={margin} />

              <View style={{ position: "absolute", left: 0, right: 0, top: MAP.bannerH + MAP.bannerGap, height: pathHeight(levels.length) }}>
                {/* A tap on empty map closes the bubble */}
                {selected ? <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessible={false} /> : null}

                {/* Scenery along the road */}
                <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
                  {decor.map((d, i) => (
                    <Image
                      key={i}
                      source={SCENERY_SPRITES[d.kind]}
                      style={{ position: "absolute", left: d.x - d.size / 2, top: d.y - d.size, width: d.size, height: d.size, opacity: open ? 1 : 0.45, transform: d.flip ? [{ scaleX: -1 }] : undefined }}
                      fadeDuration={0}
                    />
                  ))}
                </View>

                {/* The road: dots, lit in the world's colour once the stop it leaves is won */}
                <Svg pointerEvents="none" width={mapWidth} height={pathHeight(levels.length)} style={StyleSheet.absoluteFill}>
                  {segments.map((s, i) => (
                    <Path
                      key={i}
                      d={s.d}
                      fill="none"
                      stroke={s.lit ? palette.face : withAlpha(c.textMuted, 0.45)}
                      strokeWidth={s.lit ? 7 : 5}
                      strokeLinecap="round"
                      strokeDasharray={s.lit ? "0 13" : "0 12"}
                    />
                  ))}
                </Svg>

                {levels.map((level, i) => {
                  const x = stopX(i, mapWidth);
                  const y = stopY(i);
                  const status = statuses[i];
                  const record = records.find((r) => r.levelId === level.id);
                  const earned = record?.stars ?? 0;
                  return (
                    <View key={level.id} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                      <LessonNode
                        x={x}
                        y={y}
                        status={status}
                        glyph={level.glyph}
                        palette={palette}
                        litRef={level.id === STORY_LEVELS[0]?.id ? firstLit.ref : undefined}
                        progress={status === "current" ? winsHere / levels.length : 0}
                        accessibilityLabel={`Level ${level.number}, ${level.title}, ${status === "locked" ? "locked" : status === "completed" ? `${earned} of 3 stars` : "next up"}`}
                        onPress={() => pick(level, status)}
                      />
                      {status === "locked" ? null : <StarsRow x={x} y={y} earned={earned} colors={{ on: c.gold, off: c.border }} />}
                      <Text pointerEvents="none" numberOfLines={1} style={[styles.name, { left: x - 75, top: y + NAME_DROP }, status === "locked" ? styles.nameDim : { color: c.textSecondary }]}>
                        {level.title}
                      </Text>
                    </View>
                  );
                })}

                {/* The speech bubble of the tapped stop */}
                {levels.map((level, i) =>
                  level.id === selected?.id ? (
                    <NodeBubble
                      key={level.id}
                      x={stopX(i, mapWidth)}
                      y={stopY(i)}
                      mapWidth={mapWidth}
                      side={i >= BUBBLE_ABOVE_FROM ? "above" : "below"}
                      sectionHeight={pathHeight(levels.length)}
                      title={level.title}
                      kind="lesson"
                      status={statuses[i]}
                      index={i}
                      total={levels.length}
                      palette={palette}
                      copy={{
                        eyebrow: `Level ${level.number} · ${level.subtitle}`,
                        detail: statuses[i] === "locked" ? undefined : level.blurb,
                        actionLabel: (records.find((r) => r.levelId === level.id)?.stars ?? 0) > 0 ? "Play again" : "Play",
                        hint: "Win the level before this one to unlock it.",
                      }}
                      onLaunch={() => void playSfx("lesson.node-zoom")}
                      onAction={() => {
                        setSelected(null);
                        router.push(`/explorer/platformer?level=${level.id}`);
                      }}
                    />
                  ) : null,
                )}
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}
