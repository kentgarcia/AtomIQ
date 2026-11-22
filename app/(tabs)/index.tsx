import { PERF_PROBE_ON } from "@/components/dev/perf-flag";
import { useRenderTimer } from "@/components/dev/render-timer";
import { useSfxSet } from "@/components/motion/use-sfx-set";
import { ModalButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { TopRowHeader, useTabBarInset } from "@/components/layout";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { toneColor } from "@/components/lesson/visual/colors";
import { UnitTeacher } from "@/components/npc/UnitTeacher";
import type { Reference } from "@/content/curriculum/types";
import { useCurriculumPath, type CurriculumData } from "@/hooks/use-curriculum";
import { unitRingProgress } from "@/services/lesson-progress-core";
import type { PathState } from "@/services/path-core";
import { openExternalUrl } from "@/services/open-url";
import { useStreakCelebration } from "@/hooks/use-streak-celebration";
import { useTheme, createStyles, withAlpha, fontFaces, useResponsiveLayout } from "@/theme";
import { useFocusEffect, useIsFocused, useRouter } from "expo-router";
import { playSfx } from "@/services/sfx";
import { impactLight } from "@/services/haptics";
import { NODE_REVEAL } from "@/components/celebration/celebration-core";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    type ScrollViewInstance,
    StyleSheet,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  LinearTransition,
} from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import { DURATION, EASE_OUT } from "@/theme/motion";
import { LessonNode, type NodeStatus } from "@/components/path/LessonNode";
import { NodeBubble } from "@/components/path/NodeBubble";
import { LessonPreviewLayer } from "@/components/lesson/LessonPreviewLayer";
import { useTutorialTarget } from "@/components/tutorial/use-tutorial-target";
import { useTutorialBusy } from "@/hooks/use-tutorial";
import { emitTutorial } from "@/services/tutorial";
import { UnitDivider } from "@/components/path/UnitDivider";
import { loadLessonPreview, type LessonPreviewData } from "@/services/lesson-preview";
import { unitPalette, teacherPalette, type UnitPalette } from "@/components/path/unit-theme";
import { useUnitBrands } from "@/components/npc/use-unit-brands";
import { BUBBLE, bubbleHeight, chooseBubbleSide, type BubbleSide } from "@/components/path/node-bubble-core";
import { NODE } from "@/components/path/node-geometry";
import { nodeInWindow, windowBand } from "@/components/path/map-window-core";
import { glyphForNode, type GlyphId } from "@/components/path/node-glyphs";

const NODE_SIZE = NODE.box;
const NODE_ROW_GAP = 100;
const NODE_TOP = 88;
/* Room after a unit: the divider with the next unit's title sits in the gap between the last node and the next unit's first */
const SECTION_PAD = 60;
/* Floating lesson card: gap above it and below it, inside the map area */
const MAP_CARD_TOP = 8;
const MAP_CARD_GAP = 12;
/* Collapsed card height before it is measured */
const DEFAULT_CARD_HEIGHT = 104;
/* How far past the card's bottom edge a unit start must travel to switch the card */
const UNIT_SWITCH_OFFSET = 40;


type PathNode = {
  id: string;
  glyph: GlyphId;
  /** Spoken label: the lesson title, or "Practice" / "Checkpoint". */
  title: string;
  status: NodeStatus;
  kind: "lesson" | "practice" | "checkpoint";
  lessonId?: string;
};

type PathUnit = {
  id: string;
  /** 1-based place of the unit in the path ("Unit 2"). */
  position: number;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  icon: string;
  levels: PathNode[];
  isLocked: boolean;
  /** Guidebook summary shown in "About this unit". */
  info: string;
  references: Reference[];
  /** True until the unit is complete: the learner may test out of it, even while it is locked. */
  canTestOut: boolean;
};

type CardUnit = {
  id: string;
  unit: PathUnit;
  y: number;
};

/* Scroll offset that centers a node in the visible area. */
const computeNodeScrollY = (
  units: PathUnit[],
  unitIndex: number,
  rowIndex: number,
  viewportHeight: number,
  mapTopPad: number,
): number => {
  let offset = 0;
  for (let j = 0; j < unitIndex; j++) {
    offset += units[j].levels.length * NODE_ROW_GAP + SECTION_PAD;
  }
  offset += mapTopPad + NODE_TOP + rowIndex * NODE_ROW_GAP;
  return Math.max(0, offset - (viewportHeight - NODE_SIZE) / 2);
};

const buildPath = (
  curriculum: CurriculumData,
  state: PathState,
  lockedColor: string,
  themeForTone: Parameters<typeof toneColor>[0],
): PathUnit[] => {
  const lessonsById = new Map(curriculum.lessons.map((l) => [l.id, l]));
  return [...curriculum.units]
    .sort((a, b) => a.position - b.position)
    .map((unit) => {
      const unitState = state.units[unit.id];
      const isLocked = !(unitState?.unlocked ?? false);
      const levels: PathNode[] = curriculum.nodes
        .filter((n) => n.unitId === unit.id)
        .sort((a, b) => a.position - b.position)
        .map((n) => {
          const nodeStatus = state.nodes[n.id] ?? "locked";
          // Replayable nodes in a finished unit look completed but stay tappable.
          const status: NodeStatus = nodeStatus === "available" ? "completed" : nodeStatus;
          const lesson = n.lessonId ? lessonsById.get(n.lessonId) : undefined;
          const title = lesson?.title ?? (n.kind === "checkpoint" ? "Checkpoint" : "Practice");
          const glyph = glyphForNode({ kind: n.kind, lessonId: n.lessonId, title: lesson?.title });
          return { id: n.id, glyph, title, status, kind: n.kind, ...(n.lessonId ? { lessonId: n.lessonId } : {}) };
        });
      return {
        id: unit.id,
        position: unit.position,
        title: unit.title,
        subtitle: unit.subtitle,
        description: unit.description,
        color: isLocked ? lockedColor : toneColor(themeForTone, unit.tone),
        icon: unit.icon,
        levels,
        isLocked,
        info: unit.guidebook.summary ?? unit.description,
        references: curriculum.unitReferences[unit.id] ?? [],
        canTestOut: !(unitState?.completed ?? false),
      };
    });
};

const getNodeX = (globalIndex: number, width: number) =>
  width / 2 + Math.sin(globalIndex * 0.8) * 80;

// dev-admin: development-only controls (components/dev); Metro drops this in a release build. Remove with the folder.
const DevAdminFab: typeof import("@/components/dev/DevAdminFab").DevAdminFab | null = __DEV__ ? require("@/components/dev/DevAdminFab").DevAdminFab : null;
// dev-perf: the button that opens the performance probe (components/dev/PerfProbe.tsx). Present in development builds and in a build made with EXPO_PUBLIC_PERF_PROBE=1 (the preview profile).
const PerfFab: typeof import("@/components/dev/PerfFab").PerfFab | null = PERF_PROBE_ON ? require("@/components/dev/PerfFab").PerfFab : null;

export default function HomeScreen() {
  useRenderTimer("/");
  useSfxSet("home");
  const router = useRouter();
  useStreakCelebration();
  const { data: curriculum, state: pathState, runProgress, loading, refresh } = useCurriculumPath();
  const { theme, isDark } = useTheme();
  const c = theme.colors;
  const { width, height: windowHeight } = useWindowDimensions();
  const { contentMaxWidth } = useResponsiveLayout();
  const tabBarInset = useTabBarInset();
  // The winding map is laid out inside the readable frame, not the raw
  // viewport, so tablet nodes do not spread edge-to-edge.
  const mapWidth = Math.min(width, contentMaxWidth);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();

  // The lesson map sits on the plain page background (white in light mode)
  const bgTop = c.background;
  // Page-gradient color at the header backdrop's bottom edge so the backdrop
  // blends seamlessly into the background

  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [cardUnit, setCardUnit] = useState<CardUnit | null>(null);
  const [arrowDir, setArrowDir] = useState<"up" | "down" | null>(null);
  // The unit whose references and resources are open in their modal
  const [refsUnitId, setRefsUnitId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Rebuilt only when content or progress changes, not on every render
  const units = useMemo(
    () => buildPath(curriculum, pathState, c.textFaint, theme),
    [curriculum, pathState, c.textFaint, theme],
  );
  // Each unit wears its teacher's colours (nodes, bubble, divider, the card on top); a unit with no teacher yet takes the next of the default set
  const brands = useUnitBrands();
  const palettes = useMemo(() => {
    const map = new Map<string, UnitPalette>();
    for (const u of units) {
      const brand = brands.get(u.position);
      map.set(u.id, brand ? teacherPalette(brand, c.lessonHeaderText, isDark) : unitPalette(c, u.position, isDark));
    }
    return map;
  }, [units, c, isDark, brands]);
  const completedKey = pathState.currentNodeId ?? "done";

  // Finishing a lesson moves "next up" on, and the map announces it (docs/features/SFX_SPEC.md §6.2, and the duolingo-motion-style
  // skill): the node just completed stamps its check badge on, the next one pops, with the sound and a haptic on the pop.
  // It plays when the map is in front: a change that comes in while a lesson is still on top waits for the map to return.
  // The first value after loading (from nothing) is not an unlock.
  const focused = useIsFocused();
  // The reveal is worked out while rendering, in the same render that draws the new statuses, so the node that
  // is about to be stamped or popped never shows its finished look for a frame first.
  const currentNodeId = pathState.currentNodeId ?? null;
  const [trackedNode, setTrackedNode] = useState<string | null>(null);
  const [pendingReveal, setPendingReveal] = useState<{ completedId: string; unlockedId: string | null } | null>(null);
  const [revealSeq, setRevealSeq] = useState(0);
  const [reveal, setReveal] = useState<{ completedId: string; unlockedId: string | null; key: number } | null>(null);
  let due = pendingReveal;
  if (currentNodeId !== trackedNode) {
    setTrackedNode(currentNodeId);
    if (trackedNode !== null) due = { completedId: trackedNode, unlockedId: currentNodeId };
  }
  if (due && focused) {
    setPendingReveal(null);
    setRevealSeq(revealSeq + 1);
    setReveal({ ...due, key: revealSeq + 1 });
  } else if (due !== pendingReveal) {
    setPendingReveal(due);
  }
  const revealKey = reveal?.key;
  const revealUnlocks = reveal?.unlockedId != null;
  useEffect(() => {
    if (revealKey === undefined) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = reducedMotion ? 0 : NODE_REVEAL.wait;
    if (revealUnlocks) {
      timers.push(setTimeout(() => void playSfx("lesson.unlock"), wait + (reducedMotion ? 0 : NODE_REVEAL.sound)));
      timers.push(setTimeout(impactLight, wait + (reducedMotion ? 0 : NODE_REVEAL.haptic)));
    }
    timers.push(setTimeout(() => setReveal(null), wait + NODE_REVEAL.total + 200));
    return () => timers.forEach(clearTimeout);
  }, [revealKey, revealUnlocks, reducedMotion]);

  // Locate the first "current" (next up) node
  let currentUnitIndex = -1;
  let currentRowIndex = -1;
  for (let u = 0; u < units.length; u++) {
    const idx = units[u].levels.findIndex((l) => l.status === "current");
    if (idx !== -1) {
      currentUnitIndex = u;
      currentRowIndex = idx;
      break;
    }
  }

  // Section offsets for each unit (for the sticky unit card)
  const cardUnits = useMemo(() => {
    const list: CardUnit[] = [];
    let offset = 0;
    for (const unit of units) {
      list.push({ id: unit.id, unit, y: offset });
      offset += unit.levels.length * NODE_ROW_GAP + SECTION_PAD;
    }
    return list;
  }, [units]);

  // Show the unit holding the first "current" (next up) node initially
  useEffect(() => {
    if (cardUnits.length > 0 && !cardUnit) {
      const initial =
        cardUnits[Math.max(0, currentUnitIndex)] ??
        cardUnits[cardUnits.length - 1];
      setCardUnit(initial);
    }
  }, [cardUnits, currentUnitIndex]);

  // Collapsed height of the floating lesson card; the map is padded below it
  const [cardHeight, setCardHeight] = useState(DEFAULT_CARD_HEIGHT);
  const mapTopPad = MAP_CARD_TOP + cardHeight + MAP_CARD_GAP;
  // The map is clipped at the card's vertical centre: it never shows above
  // the card, and slides out of sight once it reaches the card's middle
  const mapClipTop = MAP_CARD_TOP + Math.round(cardHeight / 2);
  const mapContentPad = mapTopPad - mapClipTop;
  // Height of the scroll viewport (the map area under the top row)
  const viewportHeightRef = useRef(windowHeight - 320);

  // Where the map is scrolled to, for placing the node bubble
  const scrollYRef = useRef(0);
  // Which step of scrolling the map is at: only the nodes near the screen are drawn (components/path/map-window-core.ts)
  const [mapBand, setMapBand] = useState(0);

  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const scrollY = e.nativeEvent.contentOffset.y;
      scrollYRef.current = scrollY;
      const band = windowBand(scrollY);
      setMapBand((prev) => (prev === band ? prev : band));
      // The info panel is a peek, not a screen: dismiss it as soon as the
      // map moves so it never covers the path
      setInfoOpen(false);
      // The active unit is the one containing a line just under the card
      const target = scrollY + UNIT_SWITCH_OFFSET;
      let best: CardUnit | null = cardUnits[0] ?? null;
      for (const n of cardUnits) {
        if (n.y <= target) best = n;
      }
      if (best) {
        setCardUnit((prev) => (prev?.id === best!.id ? prev : best));
      }
      // Point the jump arrow at the current node: down if it's below the
      // viewing band, up if it's above, hidden while it overlaps the band
      if (currentUnitIndex !== -1) {
        let nodeY = 0;
        for (let j = 0; j < currentUnitIndex; j++) {
          nodeY += units[j].levels.length * NODE_ROW_GAP + SECTION_PAD;
        }
        nodeY += NODE_TOP + currentRowIndex * NODE_ROW_GAP;
        // Viewport-relative: the scroll view begins right under the header
        const screenTop = mapTopPad + nodeY - scrollY;
        const bandTop = MAP_CARD_TOP + cardHeight;
        const bandBottom = viewportHeightRef.current + mapClipTop - tabBarInset;
        const overlapsBand = screenTop + NODE_SIZE > bandTop && screenTop < bandBottom;
        const dir = overlapsBand ? null : screenTop >= bandBottom ? "down" : "up";
        setArrowDir((prev) => (prev === dir ? prev : dir));
      }
    },
    [
      cardUnits,
      tabBarInset,
      mapTopPad,
      mapClipTop,
      cardHeight,
      units,
      currentUnitIndex,
      currentRowIndex,
    ],
  );

  const scrollToCurrent = useCallback(() => {
    if (currentUnitIndex === -1) return;
    scrollViewRef.current?.scrollTo({
      y: computeNodeScrollY(units, currentUnitIndex, currentRowIndex, viewportHeightRef.current, mapContentPad),
      animated: true,
    });
  }, [units, currentUnitIndex, currentRowIndex, mapContentPad]);

  // Scroll to the current node when the target actually changes (initial
  // load, or progress gained on refocus) — never on unrelated re-renders
  const prevAutoScrollTarget = useRef<string>("");
  useEffect(() => {
    if (!loading && currentUnitIndex !== -1) {
      const targetKey = `${completedKey}|${currentUnitIndex}|${currentRowIndex}`;
      if (prevAutoScrollTarget.current === targetKey) return;
      prevAutoScrollTarget.current = targetKey;
      const timer = setTimeout(() => {
        const y = computeNodeScrollY(units, currentUnitIndex, currentRowIndex, viewportHeightRef.current, mapContentPad);
        // Draw the nodes around the target in the same render the jump happens in, so the map is never empty for a frame
        setMapBand(windowBand(y));
        scrollViewRef.current?.scrollTo({ y, animated: false });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, units, completedKey, currentUnitIndex, currentRowIndex, mapContentPad]);

  // Tapping a node opens a bubble with its title and status; the bubble's button opens it
  const [selected, setSelected] = useState<{ id: string; side: BubbleSide } | null>(null);
  const selectedNodeId = selected?.id ?? null;
  const dismissBubble = useCallback(() => setSelected(null), []);

  // The bubble opens under its node, or above it when there is no room below: the part of the map
  // that can be seen is under the lesson card and above the navbar. When neither side has room the
  // map is scrolled a little so the bubble can be seen.
  // Shrodi's tour lights the current node and its bubble's button (docs/features/TUTORIAL_SPEC.md)
  const nodeLit = useTutorialTarget("home.node.current", { radius: "round" });
  const bubbleLit = useTutorialTarget("home.bubble.button", { radius: 20 });

  const selectNode = (node: { id: string; title: string; status: string }, unitTop: number, y: number) => {
    if (selected?.id === node.id) {
      setSelected(null);
      return;
    }
    const screenY = mapTopPad + unitTop + y - scrollYRef.current;
    const bandTop = MAP_CARD_TOP + cardHeight + BUBBLE.margin / 2;
    const bandBottom = viewportHeightRef.current + mapClipTop - tabBarInset - BUBBLE.margin / 2;
    const width = Math.min(BUBBLE.maxWidth, mapWidth - BUBBLE.margin * 2);
    const choice = chooseBubbleSide({
      y: screenY,
      current: node.status === "current",
      height: bubbleHeight({ title: node.title, width, locked: node.status === "locked" }),
      bandTop,
      bandBottom,
    });
    setSelected({ id: node.id, side: choice.side });
    if (node.status === "current") emitTutorial("node-bubble-opened");
    // A locked node says "not yet"; any other opens with a small pop
    void (node.status === "locked" ? playSfx("ui.lock") : playSfx("reward.pop", { volume: 0.7 }));
    // Start loading the preview now, while the learner reads the bubble
    const picked = units.flatMap((u) => u.levels).find((n) => n.id === node.id);
    if (picked?.kind === "lesson" && picked.lessonId) void prefetchPreview(picked.lessonId);
    if (choice.scrollBy !== 0) {
      scrollViewRef.current?.scrollTo({ y: Math.max(0, scrollYRef.current + choice.scrollBy), animated: true });
    }
  };

  // The lesson preview lives on this screen (a layer over the map), so the bubble's zoom and the page
  // arriving are one animation. It is loaded when the bubble opens, and cleared whenever the map
  // regains focus, because finishing a lesson changes what it says ("Review lesson").
  const previewCache = useRef(new Map<string, Promise<LessonPreviewData | null>>());
  const [preview, setPreview] = useState<{ lessonId: string; data: LessonPreviewData } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const prefetchPreview = useCallback((lessonId: string) => {
    let pending = previewCache.current.get(lessonId);
    if (!pending) {
      pending = loadLessonPreview(lessonId).catch(() => null);
      previewCache.current.set(lessonId, pending);
    }
    return pending;
  }, []);
  useFocusEffect(
    useCallback(() => {
      previewCache.current.clear();
    }, []),
  );

  // The bubble's button was released: a lesson's preview starts arriving over the zoom
  const launchNode = (node: PathNode) => {
    if (node.kind !== "lesson" || !node.lessonId) return;
    const lessonId = node.lessonId;
    void playSfx("lesson.node-zoom");
    void prefetchPreview(lessonId).then((data) => {
      if (data) {
        setPreview({ lessonId, data });
        setPreviewOpen(true);
        emitTutorial("preview-opened");
      } else {
        // No preview to show (should not happen): the lesson screen has its own
        router.push(`/lesson/${lessonId}`);
      }
    });
  };

  // The bubble has dissolved. A lesson's preview is already up; the other kinds open their screen
  const handleNodePress = (node: PathNode) => {
    setSelected(null);
    if (node.kind === "lesson" && node.lessonId) return;
    router.push(`/practice/${node.id}`);
  };

  // Start / Review on the preview: the lesson screen opens straight into the lesson (no second preview),
  // and the preview fades away over it once it is under way
  // A lesson left half way is asked about here, drawn inside the preview's own modal (a second modal over
  // it would not reliably show), so the lesson screen never has to open a dialog while the preview leaves.
  const [resumeAsk, setResumeAsk] = useState(false);
  // The tour waits while "Continue or start again?" is up
  useTutorialBusy(resumeAsk, "resume-lesson question");
  const openLesson = useCallback(
    (resume?: "continue" | "again") => {
      if (!preview) return;
      emitTutorial("lesson-started");
      router.push({ pathname: "/lesson/[id]", params: resume ? { id: preview.lessonId, autostart: "1", resume } : { id: preview.lessonId, autostart: "1" } });
      setTimeout(() => setPreviewOpen(false), 150);
    },
    [preview, router],
  );
  const proceedFromPreview = useCallback(() => {
    if (!preview) return;
    if (preview.data.savedPercent !== null) setResumeAsk(true);
    else openLesson();
  }, [preview, openLesson, setResumeAsk]);
  const closePreview = useCallback(() => {
    void playSfx("lesson.zoom-out");
    setPreviewOpen(false);
  }, []);
  const previewGone = useCallback(() => setPreview(null), []);

  // Global index across all units (for the winding path)
  let globalCounter = 0;

  return (
    <View style={[styles.container, { backgroundColor: bgTop }]}>
      {/* Shared pale-orange page background */}
      {/* Top row — its own block above the map (the lesson card floats over
          the map below it) */}
      <TopRowHeader />

      {/* Map area: the map scrolls behind the floating lesson card, and runs to the bottom of the
          screen so it shows around and under the docked tab bar */}
      <View style={styles.mapArea}>
      <ScrollView
        ref={scrollViewRef}
        style={[styles.mapScroll, { marginTop: mapClipTop }]}
        onLayout={(e) => {
          viewportHeightRef.current = e.nativeEvent.layout.height;
        }}
        onScroll={handleScroll}
        onScrollBeginDrag={dismissBubble}
        scrollEventThrottle={16}
        contentContainerStyle={{
          width: "100%",
          maxWidth: mapWidth,
          alignSelf: "center",
          paddingTop: mapContentPad,
          paddingBottom: tabBarInset + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {units.map((unit, unitIndex) => {
          const palette = palettes.get(unit.id);
          const sectionHeight =
            unit.levels.length * NODE_ROW_GAP + SECTION_PAD;
          // Where this unit's section starts in the map (for placing a node's bubble)
          const unitTop = cardUnits.find((n) => n.id === unit.id)?.y ?? 0;

          // Position nodes (natural order, level 0 on top)
          const nextGlobal = globalCounter;
          globalCounter += unit.levels.length;

          const pathPoints = unit.levels.map((_, i) => ({
            x: getNodeX(nextGlobal + i, mapWidth),
            y: NODE_TOP + i * NODE_ROW_GAP,
          }));

          return (
            <View
              key={unit.id}
              style={{ height: sectionHeight, zIndex: unit.levels.some((l) => l.id === selectedNodeId) ? 5 : 0 }}
            >
              {/* Between units: a dotted line with the unit's title in the middle, in its colour (grey while locked) */}
              {unitIndex > 0 ? (
                <UnitDivider title={`Unit ${unit.position}: ${unit.title}`} color={c.textMuted} top={-4} horizontalPadding={24} />
              ) : null}

              {/* A tap on empty map closes the bubble */}
              {selectedNodeId ? (
                <Pressable style={StyleSheet.absoluteFill} onPress={dismissBubble} accessible={false} />
              ) : null}

              {/* Nodes */}
              {unit.levels.map((node, i) => {
                // Far from the screen a node is not drawn at all; the one the learner is on, the tapped one and a node changing state always are
                const drawn =
                  node.status === "current" ||
                  node.id === selectedNodeId ||
                  reveal?.completedId === node.id ||
                  reveal?.unlockedId === node.id ||
                  nodeInWindow(mapContentPad + unitTop + pathPoints[i].y, NODE.box, mapBand, windowHeight);
                if (!drawn) return null;
                return (
                <LessonNode
                  key={node.id}
                  x={pathPoints[i].x}
                  y={pathPoints[i].y}
                  status={node.status}
                  glyph={node.glyph}
                  palette={palette}
                  reveal={reveal?.completedId === node.id ? "completed" : reveal?.unlockedId === node.id ? "unlocked" : undefined}
                  revealKey={reveal?.key}
                  litRef={node.status === "current" ? nodeLit.ref : undefined}
                  progress={
                    node.status === "current"
                      ? unitRingProgress(
                          unit.levels.filter((l) => l.status === "completed").length,
                          unit.levels.length,
                          runProgress[node.id] ?? 0,
                        )
                      : 0
                  }
                  accessibilityLabel={`${node.title}, ${
                    node.status === "locked" ? "locked" : node.status === "completed" ? "completed" : "next up"
                  }`}
                  onPress={() => selectNode(node, unitTop, pathPoints[i].y)}
                />
                );
              })}

              {/* The speech bubble of the tapped node */}
              {unit.levels.map((node, i) =>
                node.id === selectedNodeId ? (
                  <NodeBubble
                    key={node.id}
                    x={pathPoints[i].x}
                    y={pathPoints[i].y}
                    mapWidth={mapWidth}
                    side={selected?.side ?? "below"}
                    sectionHeight={sectionHeight}
                    title={node.title}
                    kind={node.kind}
                    status={node.status}
                    index={i}
                    total={unit.levels.length}
                    palette={palette}
                    buttonRef={bubbleLit.ref}
                    onLaunch={() => launchNode(node)}
                    onAction={() => handleNodePress(node)}
                  />
                ) : null,
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Floating lesson card — sits over the map, which scrolls behind it */}
      <View style={styles.floatingCard} pointerEvents="box-none">
        <View
          style={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }}
          pointerEvents="box-none"
        >
          {cardUnit &&
            (() => {
              // Look up the fresh unit so the card stays current after refocus
              const activeUnit =
                cardUnits.find((c) => c.id === cardUnit.id)?.unit ??
                cardUnit.unit;
              // The card wears the colours of the unit it shows
              const cardPalette = palettes.get(activeUnit.id);
              const cardFace = cardPalette?.face ?? c.lessonHeader;
              const cardInk = cardPalette?.ink ?? c.lessonHeaderText;
              return (
                <Animated.View
                  layout={reducedMotion ? undefined : LinearTransition.duration(DURATION.medium).easing(EASE_OUT)}
                  style={styles.nowCard}
                  onLayout={(e) => {
                    // Track the collapsed height only, so the map's top
                    // padding does not jump when the unit info expands
                    if (!infoOpen) setCardHeight(Math.round(e.nativeEvent.layout.height));
                  }}
                >
                  {/* The lip: its own layer, exactly where the face lands, so it shows only under the bottom edge */}
                  <View pointerEvents="none" style={[styles.nowCardLip, cardPalette ? { backgroundColor: cardPalette.lip } : null]} />
                  <View style={[styles.nowCardFace, { backgroundColor: cardFace }]}>
                  <View style={styles.nowCardHeader}>
                    {/* Keyed by unit so a section change crossfades the
                        title/subtitle instead of snapping */}
                    <View style={styles.nowCardText} key={activeUnit.id}>
                      <Animated.View
                        entering={reducedMotion ? FadeIn.duration(120) : FadeIn.duration(200)}
                        exiting={FadeOut.duration(150)}
                      >
                        <Text style={[styles.unitKicker, { color: withAlpha(cardInk, 0.75) }]} numberOfLines={1}>
                          {`Unit ${activeUnit.position}: ${activeUnit.title}`}
                        </Text>
                        <Text style={[styles.unitSubtitle, { color: cardInk }]} numberOfLines={2}>
                          {activeUnit.subtitle}
                        </Text>
                      </Animated.View>
                    </View>
                    <TouchableOpacity
                      style={styles.infoBtn}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={
                        infoOpen ? "Hide unit details" : "Show unit details"
                      }
                      onPress={() => {
                        // A panel that is not a dialog: its own open and close sounds (docs/features/SFX_EXPANSION_SPEC.md §6.3)
                        void playSfx(infoOpen ? "ui.panel-close" : "ui.panel-open");
                        setInfoOpen((o) => !o);
                      }}
                    >
                      <Icon
                        name={infoOpen ? "ArrowUp2" : activeUnit.isLocked ? "Lock" : "Book1"}
                        size={22}
                        color={cardFace}
                        variant="Bold"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Unit info expands inside the card, no modal */}
                  <View style={styles.nowCardBody}>
                    {infoOpen && activeUnit.info && (
                      <Animated.View
                        entering={reducedMotion ? FadeIn.duration(120) : FadeIn.duration(200)}
                        exiting={FadeOut.duration(160)}
                        style={styles.infoSection}
                      >
                        <ScrollView
                          style={{ maxHeight: windowHeight * 0.5 }}
                          contentContainerStyle={styles.infoContent}
                          showsVerticalScrollIndicator={false}
                          nestedScrollEnabled
                        >
                          <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>About this unit</Text>
                            <Text style={styles.infoBody}>{activeUnit.info}</Text>
                          </View>

                          <UnitTeacher unitId={activeUnit.id} locked={activeUnit.isLocked} />

                          {activeUnit.isLocked ? (
                            <View style={styles.infoNotice}>
                              <Icon name="Lock" size={18} color={c.textMuted} variant="Bold" />
                              <Text style={styles.infoNoticeText}>
                                This unit opens when you pass the checkpoint of the unit before it. Or skip ahead by testing out.
                              </Text>
                            </View>
                          ) : null}

                          {activeUnit.references.length > 0 && (
                            <TouchableOpacity
                              style={styles.refsBtn}
                              accessibilityRole="button"
                              accessibilityLabel={`References and resources for ${activeUnit.title}`}
                              onPress={() => setRefsUnitId(activeUnit.id)}
                            >
                              <Icon name="Link" size={16} color={c.primary} variant="Bold" />
                              <Text style={styles.refsBtnText}>References & resources</Text>
                              <Icon name="ArrowRight2" size={14} color={c.textMuted} />
                            </TouchableOpacity>
                          )}

                          {activeUnit.canTestOut ? (
                            <TouchableOpacity
                              style={styles.testOutBtn}
                              accessibilityRole="button"
                              accessibilityLabel={`Test out of ${activeUnit.title}`}
                              accessibilityHint="Pass a short test to skip this unit"
                              onPress={() => router.push(`/practice/testout:${activeUnit.id}`)}
                            >
                              <Icon name="Flash" size={16} color={c.primary} variant="Bold" />
                              <Text style={styles.testOutText}>Already know this? Test out</Text>
                            </TouchableOpacity>
                          ) : null}
                        </ScrollView>
                      </Animated.View>
                    )}
                  </View>
                  </View>
                </Animated.View>
              );
            })()}
        </View>
      </View>
      </View>

      {/* dev-admin */}
      {DevAdminFab ? <DevAdminFab bottom={tabBarInset + 16} onChanged={refresh} /> : null}
      {/* dev-perf */}
      {PerfFab ? <PerfFab bottom={tabBarInset + 16} /> : null}

      {/* Floating "jump to current lesson" arrow */}
      {arrowDir && currentUnitIndex !== -1 && (
        <Animated.View
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.duration(250)}
          exiting={FadeOutDown.duration(200)}
          style={[styles.nextBtn, { bottom: tabBarInset + 16 }]}
>
            <View style={styles.nextBtnClip}>
              <TouchableOpacity
                style={styles.nextBtnInner}
                activeOpacity={0.85}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Jump to current lesson"
                onPress={scrollToCurrent}
              >
                <Icon
                  name={arrowDir === "up" ? "ArrowUp" : "ArrowDown"}
                  size={24}
                  color="#FFFFFF"
                  variant="Bold"
                />
              </TouchableOpacity>
              <View style={styles.nextBtnLip} />
            </View>
          </Animated.View>
        )}

      {/* The lesson preview, a layer over the whole screen */}
      <LessonPreviewLayer
        data={preview?.data ?? null}
        open={previewOpen}
        onClose={closePreview}
        onProceed={proceedFromPreview}
        resume={
          resumeAsk
            ? {
                percent: preview?.data.savedPercent ?? 0,
                onContinue: () => {
                  setResumeAsk(false);
                  openLesson("continue");
                },
                onStartAgain: () => {
                  setResumeAsk(false);
                  openLesson("again");
                },
                onCancel: () => setResumeAsk(false),
              }
            : null
        }
        onGone={previewGone}
      />

      {/* References and resources of a unit, one tap away from the card on top */}
      <ModalDialog
        visible={refsUnitId !== null}
        onClose={() => setRefsUnitId(null)}
        title="References & resources"
        dismissOnScrim
        footer={<ModalButton label="Close" onPress={() => setRefsUnitId(null)} />}
      >
        {(units.find((u) => u.id === refsUnitId)?.references ?? []).map((ref) => (
          <TouchableOpacity
            key={ref.id}
            style={styles.referenceItem}
            disabled={!ref.url}
            accessibilityRole={ref.url ? "link" : "text"}
            accessibilityLabel={`${ref.title}, ${ref.publisher}`}
            onPress={async () => {
              const opened = await openExternalUrl(ref.url);
              if (!opened) {
                Alert.alert("Error", "Could not open link");
              }
            }}
          >
            <Icon name="Link" size={16} color={c.primary} variant="Bold" />
            <Text style={styles.referenceText} numberOfLines={3}>
              {ref.publisher}: {ref.title}
            </Text>
            {ref.url ? <Icon name="ArrowRight2" size={14} color={c.textMuted} /> : null}
          </TouchableOpacity>
        ))}
      </ModalDialog>

    </View>
  );
}


/* Depth of the lesson card's lip (the shared control lip is 4) */
const CARD_LIP = 6;

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    mapArea: {
      flex: 1,
    },
    mapScroll: {
      flex: 1,
    },
    /* Lesson card floats over the top of the map area */
    floatingCard: {
      position: "absolute",
      top: MAP_CARD_TOP,
      left: 0,
      right: 0,
      paddingHorizontal: 24,
      zIndex: 90,
    },
    /* Lesson card: a face on a lip, like <Button>. The lip layer sits under
       the face from `lip` down, so it only shows along the bottom edge. */
    nowCard: {
      paddingBottom: CARD_LIP,
    },
    nowCardLip: {
      position: "absolute",
      top: CARD_LIP,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 20,
      backgroundColor: c.lessonCardLip,
    },
    /* The whole face is the lesson colour: header and body share it */
    nowCardFace: {
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: c.lessonHeader,
    },
    /* Unit title and subtitle on the left, the info button on the right */
    nowCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 30,
    },
    /* Only holds the expanded unit info, so it takes no space while closed */
    nowCardBody: {
      paddingHorizontal: 16,
    },
    nowCardText: {
      flex: 1,
      overflow: "hidden",
    },
    /* Unit info expands inside the lesson card */
    /* A white panel inside the coloured card, so the text stays readable */
    infoSection: {
      marginTop: 14,
      padding: 14,
      borderRadius: 14,
      backgroundColor: c.card,
      marginBottom: 14,
    },
    infoContent: {
      gap: 20,
    },
    infoBlock: {
      gap: 8,
    },
    refList: {
      gap: 8,
    },
    infoNotice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      padding: 12,
      borderRadius: 14,
      backgroundColor: c.surfaceSoft,
    },
    infoNoticeText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      color: c.textSecondary,
      ...fontFaces.medium,
    },
    infoLabel: {
      fontSize: 10,
      ...fontFaces.heavy,
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 5,
    },
    infoBody: {
      fontSize: 13,
      ...fontFaces.regular,
      color: c.textSecondary,
      lineHeight: 20,
    },
    /* "UNIT 1: TITLE": small, all caps, lighter than the subtitle */
    unitKicker: {
      fontSize: 15,
      lineHeight: 20,
      ...fontFaces.heavy,
      color: withAlpha(c.lessonHeaderText, 0.75),
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    /* The subtitle is the headline of the card: one line when it fits, two at most */
    unitSubtitle: {
      marginTop: 2,
      fontSize: 22,
      lineHeight: 28,
      ...fontFaces.heavy,
      color: c.lessonHeaderText,
    },
    /* White circle on the yellow band; the icon takes the band color. The glyphs
       have no circle of their own, so there is only one circle. */
    infoBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.onPrimary,
    },
    /* Floating "jump to current lesson" arrow */
    nextBtn: {
      position: "absolute",
      right: 24,
      width: 56,
      height: 56,
      zIndex: 95,
    },
    /* Rounded clip so the bottom lip's corners stay round */
    nextBtnClip: {
      flex: 1,
      borderRadius: 28,
      overflow: "hidden",
      backgroundColor: c.primary,
    },
    nextBtnInner: {
      flex: 1,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    nextBtnLip: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 4,
      backgroundColor: withAlpha(c.text, 0.15),
    },
    referenceItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: c.surfaceSoft,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: c.border,
      borderBottomWidth: 4,
    },
    referenceText: {
      flex: 1,
      fontSize: 13,
      color: c.primary,
      ...fontFaces.medium,
    },
    testOutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: c.primaryBorder,
      backgroundColor: c.primarySurface,
    },
    testOutText: {
      fontSize: 14,
      color: c.primaryLight,
      ...fontFaces.bold,
    },
    /* The "References & resources" button inside the unit info */
    refsBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: c.border,
      borderBottomWidth: 4,
      backgroundColor: c.surfaceSoft,
    },
    refsBtnText: {
      flexShrink: 1,
      fontSize: 14,
      color: c.text,
      ...fontFaces.bold,
    },
  };
});
