import { Icon } from "@/components/ui/icon";
import { SectionHeader } from "@/components/ui/section-header";
import { UNITS } from "@/content/units";
import { useAllLevels } from "@/hooks/use-storage";
import { useDailyMissions } from "@/hooks/use-daily-missions";
import { openExternalUrl } from "@/services/open-url";
import { getProfileAvatarSource } from "@/services/profile-avatars";
import { useStorage } from "@/services/StorageContext";
import { useTheme, type Palette, fontFamilies } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, {
    Easing,
    FadeInDown,
    FadeOutDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Polyline } from "react-native-svg";

const NODE_SIZE = 79;
const NODE_ROW_GAP = 120;
const NODE_TOP = 88;
const SECTION_PAD = 110;
/* Sticky card geometry (safe-area-relative) */
const CARD_TOP = 78;
const CARD_AREA = 190;

/* Node look taken from the reference button design — square button, the lip
   is interior depth at the bottom like the reference's inset shadow */
const NODE_RADIUS = 23;
const NODE_BORDER = 5;
const NODE_INNER_RADIUS = NODE_RADIUS - NODE_BORDER;
const NODE_LIP = 10; /* 3D lip band (reference 14px inset shadow at 110px) */
const NODE_LIP_PRESSED = 5; /* lip shallows out when pressed (reference 14 → 7) */
const NODE_PRESS_SHIFT = 6; /* button sinks 6px when pressed (reference :active) */
const BADGE_SIZE = 26;

/* Diagonal glass-stripe overlay (reference button ::before) */
const GLASS_COLORS = [
  "rgba(255,255,255,0)",
  "rgba(255,255,255,0.2)",
  "rgba(255,255,255,0.2)",
  "rgba(255,255,255,0)",
  "rgba(255,255,255,0)",
  "rgba(255,255,255,0.1)",
  "rgba(255,255,255,0.1)",
  "rgba(255,255,255,0)",
] as const;
const GLASS_LOCATIONS = [0, 0.25, 0.48, 0.481, 0.58, 0.581, 0.75, 0.751] as const;

/* Maple leaf decoration (same path as the provided SVG) */
const LEAF_PATH =
  "M15.362 9.69s-.75 1.108-1.068 0c-.318-1.109-1.346-4.949-1.762-5.226l-.417-.278s-.078 1.506-.594 1.307c-.515-.198-4.313-2.217-4.63-2.652l-.317-.397s.355 3.328-.515 2.615c0 0 1.113 2.771-2.573 3.048 0 0 1.186 3.087 4.552 4.75 0 0 1.148 1.783-.949 1.503 0 0-2.932-.395-3.325-.752 0 0-1.548 3.01-3.764 3.128 0 0 2.656 1.504 2.337 4.156 0 0 5.107.041 4.911.832-.2.795-.555 1.601-.555 1.601s4.71-.929 5.422-2.194c0 0 .989.99 1.071 1.939 0 0 2.693-.594 2.452-2.296 0 0 1.269.948 1.427 2.551l.554-.375s-.319-1.661-1.464-2.967c0 0-.517-1.308.789-.633 0 0 3.085 1.029 5.7-.833 0 0-2.888-.948-3.006-1.978 0 0 5.394-3.326 5.625-5.542 0 0-1.944.198-2.972-.633 0 0-1.309-.396.394-4.791 0 0-1.227.724-1.62-3.636 0 0-3.051 4.665-4.518 3.082.001-.001-1.382 3.047-1.185 4.671z";
const LEAF_COLORS = ["#D35400", "#E67E22", "#C0392B", "#F39C12"];

type NodeStatus = "locked" | "current" | "completed";

type PathNode = {
  id: string;
  type: "star" | "book" | "chest" | "trophy";
  status: NodeStatus;
};

type PathUnit = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  icon: string;
  levels: PathNode[];
  isLocked: boolean;
};

type CardUnit = {
  id: string;
  unit: PathUnit;
  y: number;
};

/* Reference press transition: 0.15s cubic-bezier(0.4, 0, 0.2, 1) */
const PRESS_EASING = Easing.bezier(0.4, 0, 0.2, 1);

/* Scroll offset that centers a node in the visible area. */
const computeNodeScrollY = (
  units: PathUnit[],
  unitIndex: number,
  rowIndex: number,
  windowHeight: number,
): number => {
  let offset = 0;
  for (let j = 0; j < unitIndex; j++) {
    offset += units[j].levels.length * NODE_ROW_GAP + SECTION_PAD;
  }
  offset += NODE_TOP + rowIndex * NODE_ROW_GAP;
  return Math.max(0, offset - (windowHeight - 320) / 2);
};

const buildPath = (completedLessonIds: string[]): PathUnit[] => {
  return UNITS.map((unit, unitIndex) => {
    const isPreviousUnitCompleted =
      unitIndex === 0 ||
      UNITS[unitIndex - 1].lessonIds.every((id) =>
        completedLessonIds.includes(id),
      );

    const isUnitLocked = !isPreviousUnitCompleted;

    const levels: PathNode[] = unit.lessonIds.map((lessonId, index) => {
      const isCompleted = completedLessonIds.includes(lessonId);
      const isFirst = index === 0;
      const previousCompleted =
        index === 0 || completedLessonIds.includes(unit.lessonIds[index - 1]);

      let status: NodeStatus = "locked";
      if (!isUnitLocked && isCompleted) {
        status = "completed";
      } else if (!isUnitLocked && (previousCompleted || isFirst)) {
        status = "current";
      }

      const types = ["star", "book", "chest"] as const;
      return {
        id: lessonId,
        type: types[index % types.length],
        status,
      };
    });

    if (unit.quizIds.length > 0) {
      const quizId = unit.quizIds[0];
      const isQuizCompleted = completedLessonIds.includes(quizId);
      const allLessonsCompleted = unit.lessonIds.every((id) =>
        completedLessonIds.includes(id),
      );

      let quizStatus: NodeStatus = "locked";
      if (!isUnitLocked && isQuizCompleted) {
        quizStatus = "completed";
      } else if (!isUnitLocked && allLessonsCompleted) {
        quizStatus = "current";
      }

      levels.push({ id: quizId, type: "trophy", status: quizStatus });
    }

    return {
      id: unit.id,
      title: unit.title,
      subtitle: unit.subtitle,
      description: unit.description,
      color: isUnitLocked ? "#9CA3AF" : unit.color,
      icon: unit.icon,
      levels,
      isLocked: isUnitLocked,
    };
  });
};

const getNodeX = (globalIndex: number, width: number) =>
  width / 2 + Math.sin(globalIndex * 0.8) * 80;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

/* Darken (negative amount) or lighten a hex color, used for the node 3D lip */
const shadeColor = (hex: string, amount: number): string => {
  const mix = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v + 255 * amount)))
      .toString(16)
      .padStart(2, "0");
  return `#${mix(parseInt(hex.slice(1, 3), 16))}${mix(
    parseInt(hex.slice(3, 5), 16),
  )}${mix(parseInt(hex.slice(5, 7), 16))}`;
};

/* Linear mix between two hex colors (extends the page gradient under the header) */
const mixHex = (a: string, b: string, t: number): string => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const mixed = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${mixed.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

/* Deterministic 0..1 pseudo-random so the leaf layout is stable across renders */
const pseudoRandom = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

type LeafSpec = {
  side: "left" | "right";
  top: number;
  size: number;
  rotation: number;
  flipX: boolean;
  opacity: number;
  offsetX: number;
  color: string;
};

/* Autumn leaves scattered down both edges of the scrolling map */
const buildLeaves = (height: number): LeafSpec[] => {
  const leaves: LeafSpec[] = [];
  let seed = 0;
  let top = 160;
  while (top < height - 80) {
    const r = (k: number) => pseudoRandom(seed * 8 + k);
    leaves.push({
      side: r(1) < 0.5 ? "left" : "right",
      top,
      size: 48 + Math.round(r(2) * 60),
      rotation: Math.round(r(3) * 360),
      flipX: r(4) < 0.5,
      opacity: 0.65 + r(5) * 0.35,
      offsetX: -Math.round(r(6) * 18),
      color: LEAF_COLORS[Math.floor(r(7) * LEAF_COLORS.length)],
    });
    top += 140 + Math.round(r(8) * 140);
    seed += 1;
  }
  return leaves;
};

const UNIT_INFO_DATA: Record<string, { info: string; references: string[] }> = {
  "atomic-playground": {
    info: "Explore the basics of nuclear science, including atoms, isotopes, and the energy contained within nuclei. You'll understand atomic structure, nuclear energy fundamentals, and recognize common misconceptions.",
    references: [
      "https://www.britannica.com/science/atom",
      "https://openstax.org/books/anatomy-and-physiology/pages/2-1-elements-and-atoms-the-building-blocks-of-matter",
      "https://www.iaea.org/newscenter/news/what-is-nuclear-energy-the-science-of-nuclear-power",
    ],
  },
  "nuclear-reactions": {
    info: "Explore the fundamental nuclear reactions that power stars, fuel nuclear power plants, and enable essential technologies. You'll gain foundational knowledge about how nuclear reactions work, how energy is released, and how these processes are safely controlled.",
    references: [
      "https://www.iaea.org/topics/nuclear-fission",
      "https://www.britannica.com/science/nuclear-fusion",
      "https://www.world-nuclear.org/information-library/nuclear-fuel-cycle/introduction/physics-of-nuclear-energy.aspx",
    ],
  },
  "radiation-effects": {
    info: "Learn about different types of radiation, how radiation interacts with matter, and the real science behind radiation effects on human health and the environment. This unit provides factual, science-based understanding of radiation.",
    references: [
      "https://www.iaea.org/topics/radiation-protection",
      "https://www.epa.gov/radiation/radiation-basics",
      "https://www.nrc.gov/about-nrc/radiation/health-effects.html",
    ],
  },
  "nuclear-everyday-life": {
    info: "Discover the many peaceful applications of nuclear technology in medicine, agriculture, industry, and environmental protection. Learn how nuclear science improves lives every day.",
    references: [
      "https://www.iaea.org/topics/nuclear-applications",
      "https://www.world-nuclear.org/information-library/non-power-nuclear-applications.aspx",
      "https://www.who.int/health-topics/ionizing-radiation",
    ],
  },
  "nuclear-safety-security": {
    info: "Focuses on how countries, scientists, and international organizations work together to ensure nuclear technology is used safely, securely, and responsibly. Learn about safety frameworks, regulations, and global cooperation.",
    references: [
      "https://www.iaea.org/topics/nuclear-safety-and-security",
      "https://www.nrc.gov/about-nrc/regulatory/enforcement/safety-culture.html",
      "https://www.world-nuclear.org/information-library/safety-and-security.aspx",
    ],
  },
  "invisible-rays": {
    info: 'Learn about different types of radiation and how to protect against them. Demystify "Radiation" by breaking it down into manageable types.',
    references: [
      "https://www.epa.gov/radiation/radiation-protection",
      "https://www.nrc.gov/about-nrc/radiation/protects-you.html",
    ],
  },
  "dose-poison": {
    info: "Understand radiation doses, measurements, and health effects. Contextualize safety using radiation comparison and dose visualization.",
    references: [
      "https://www.iaea.org/topics/radiation-dosimetry",
      "https://xkcd.com/radiation/",
    ],
  },
  "engine-room": {
    info: 'Discover how nuclear reactors generate clean, reliable energy. Explain the mechanics to debunk the "Explosion" myth.',
    references: [
      "https://www.world-nuclear.org/information-library/nuclear-fuel-cycle/nuclear-power-reactors.aspx",
      "https://www.ucs.org/resources/how-nuclear-power-works",
    ],
  },
  "green-horizon": {
    info: "Explore nuclear energy's environmental benefits and waste management. Address environmental concerns using energy statistics visualizations.",
    references: [
      "https://www.world-nuclear.org/information-library/energy-and-the-environment.aspx",
      "https://www.iaea.org/topics/waste-management",
    ],
  },
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userProfile } = useStorage();
  const { levels, loading, refresh } = useAllLevels();
  const { claimableCount, refresh: refreshMissions } = useDailyMissions();
  const { theme } = useTheme();
  const { width, height: windowHeight } = useWindowDimensions();
  const THEME = theme.palettes.tab;
  const styles = useMemo(() => createStyles(THEME), [THEME]);

  // Autumn gradient background (cream → white, like the reference design)
  const bgTop = theme.mode === "dark" ? THEME.bg : "#FFF3E0";
  const bgBottom = theme.mode === "dark" ? THEME.bg : "#FFFFFF";
  // Page-gradient color at the header backdrop's bottom edge so the backdrop
  // blends seamlessly into the background
  const backdropBottom =
    theme.mode === "dark"
      ? THEME.bg
      : mixHex(
          "#FFF3E0",
          "#FFFFFF",
          Math.min(1, (insets.top + CARD_TOP) / windowHeight),
        );

  // Winding path stroke (subtle, visible on the plain background)
  const pathStroke =
    theme.mode === "dark" ? "rgba(255,255,255,0.25)" : "rgba(17,24,39,0.18)";

  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedUnit, setSelectedUnit] = useState<{
    id: string;
    title: string;
    subtitle: string;
  } | null>(null);
  const [cardUnit, setCardUnit] = useState<CardUnit | null>(null);
  const [arrowDir, setArrowDir] = useState<"up" | "down" | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshMissions();
    }, [refresh, refreshMissions]),
  );

  // Stable key so `units` (and everything depending on it) only rebuilds when
  // progress actually changes — not on every render
  const completedKey = useMemo(
    () =>
      levels
        .filter((l) => l.status === "completed")
        .map((l) => l.id)
        .join("|"),
    [levels],
  );

  const units = useMemo(
    () => buildPath(completedKey ? completedKey.split("|") : []),
    [completedKey],
  );

  // Total scrollable map height (for scattering leaves down both edges)
  const mapContentHeight = useMemo(
    () =>
      units.reduce(
        (acc, unit) => acc + unit.levels.length * NODE_ROW_GAP + SECTION_PAD,
        0,
      ),
    [units],
  );

  // Deterministic pseudo-random leaf layout down the edges of the map
  const leaves = useMemo(
    () => buildLeaves(mapContentHeight),
    [mapContentHeight],
  );

  // Locate the first "current" (next up) node
  let firstCurrentId: string | null = null;
  let currentUnitIndex = -1;
  let currentRowIndex = -1;
  for (let u = 0; u < units.length; u++) {
    const idx = units[u].levels.findIndex((l) => l.status === "current");
    if (idx !== -1) {
      firstCurrentId = units[u].levels[idx].id;
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

const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const scrollY = e.nativeEvent.contentOffset.y;
      // Switch when a section's start crosses the card's middle band,
      // measured in scroll-space
      const cardMid = CARD_TOP + 44;
      const target = scrollY - (insets.top + (CARD_AREA - cardMid));
      let best: CardUnit | null = null;
      let bestDist = Infinity;
      for (const n of cardUnits) {
        const dist = Math.abs(n.y - target);
        if (dist < bestDist) {
          bestDist = dist;
          best = n;
        }
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
        const screenTop = insets.top + CARD_AREA + nodeY - scrollY;
        const bandTop = insets.top + CARD_TOP + 96;
        const bandBottom = windowHeight - 170;
        const overlapsBand = screenTop + NODE_SIZE > bandTop && screenTop < bandBottom;
        const dir = overlapsBand ? null : screenTop >= bandBottom ? "down" : "up";
        setArrowDir((prev) => (prev === dir ? prev : dir));
      }
    },
    [
      cardUnits,
      insets.top,
      units,
      currentUnitIndex,
      currentRowIndex,
      windowHeight,
    ],
  );

  const scrollToCurrent = useCallback(() => {
    if (currentUnitIndex === -1) return;
    scrollViewRef.current?.scrollTo({
      y: computeNodeScrollY(units, currentUnitIndex, currentRowIndex, windowHeight),
      animated: true,
    });
  }, [units, currentUnitIndex, currentRowIndex, windowHeight]);

  // Scroll to the current node when the target actually changes (initial
  // load, or progress gained on refocus) — never on unrelated re-renders
  const prevAutoScrollTarget = useRef<string>("");
  useEffect(() => {
    if (!loading && currentUnitIndex !== -1) {
      const targetKey = `${completedKey}|${currentUnitIndex}|${currentRowIndex}`;
      if (prevAutoScrollTarget.current === targetKey) return;
      prevAutoScrollTarget.current = targetKey;
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: computeNodeScrollY(units, currentUnitIndex, currentRowIndex, windowHeight),
          animated: false,
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, units, completedKey, currentUnitIndex, currentRowIndex]);

  const handleNodePress = (node: PathNode) => {
    if (node.type === "trophy" || node.id.includes("-quiz")) {
      router.push(`/quiz/${node.id}`);
    } else {
      router.push(`/lesson/${node.id}`);
    }
  };

  const LoadingDot = ({ delay, color }: { delay: number; color: string }) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    useEffect(() => {
      scale.value = withRepeat(withTiming(1.3, { duration: 600 }), -1, true);
      opacity.value = withRepeat(withTiming(0.4, { duration: 600 }), -1, true);
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    return (
      <Animated.View
        entering={FadeInDown.delay(delay).springify()}
        style={[styles.loadingDot, { backgroundColor: color }, animatedStyle]}
      />
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgTop }]}>
        <LinearGradient
          colors={[bgTop, bgBottom]}
          style={styles.bgGradient}
          pointerEvents="none"
        />
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <Animated.View entering={FadeInDown.springify().damping(10)}>
            <Image
              source={require("@/assets/images/mascot/explain.png")}
              style={styles.loadingMascot}
              resizeMode="contain"
            />
          </Animated.View>
          <Text style={styles.loadingTitle}>Preparing Your Journey</Text>
          <Text style={styles.loadingSubtitle}>Loading learning path...</Text>
          <View style={styles.loadingDotsContainer}>
            <LoadingDot delay={300} color="#FFB74D" />
            <LoadingDot delay={400} color="#64B5F6" />
            <LoadingDot delay={500} color="#81C784" />
          </View>
        </View>
      </View>
    );
  }

  // Global index across all units (for the winding path)
  let globalCounter = 0;

  return (
    <View style={[styles.container, { backgroundColor: bgTop }]}>
      <LinearGradient
        colors={[bgTop, bgBottom]}
        style={styles.bgGradient}
        pointerEvents="none"
      />

      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: insets.top + CARD_AREA,
          paddingBottom: 130 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Autumn leaves scattered down both edges of the scrolling map */}
        <View
          pointerEvents="none"
          style={[styles.leafLayer, { height: mapContentHeight }]}
        >
          {leaves.map((leaf, index) => (
            <Svg
              key={index}
              width={leaf.size}
              height={leaf.size}
              viewBox="0 0 25.263 25.263"
              style={[
                styles.leaf,
                {
                  top: leaf.top,
                  opacity: leaf.opacity,
                  transform: [
                    { rotate: `${leaf.rotation}deg` },
                    { scaleX: leaf.flipX ? -1 : 1 },
                  ],
                },
                leaf.side === "left"
                  ? { left: leaf.offsetX }
                  : { right: leaf.offsetX },
              ]}
            >
              <Path d={LEAF_PATH} fill={leaf.color} />
            </Svg>
          ))}
        </View>

        {units.map((unit) => {
          const sectionHeight =
            unit.levels.length * NODE_ROW_GAP + SECTION_PAD;

          // Position nodes (natural order, level 0 on top)
          const nextGlobal = globalCounter;
          globalCounter += unit.levels.length;

          const pathPoints = unit.levels.map((_, i) => ({
            x: getNodeX(nextGlobal + i, width),
            y: NODE_TOP + i * NODE_ROW_GAP,
          }));

          const pathD = pathPoints
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");

          return (
            <View key={unit.id} style={{ height: sectionHeight }}>
              {/* Winding path */}
              <Svg
                width={width}
                height={sectionHeight}
                style={styles.pathLayer}
              >
                <Path
                  d={pathD}
                  stroke={pathStroke}
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="6 12"
                  fill="none"
                />
              </Svg>

              {/* Nodes */}
              {unit.levels.map((node, i) => (
                <LessonNode
                  key={node.id}
                  node={node}
                  x={pathPoints[i].x}
                  y={pathPoints[i].y}
                  unitColor={unit.color}
                  firstId={firstCurrentId}
                  onPress={() => handleNodePress(node)}
                  styles={styles}
                />
              ))}

              {/* Unit divider */}
              <View style={styles.unitDivider}>
                <View
                  style={[styles.unitDividerLine, { backgroundColor: pathStroke }]}
                />
                <Text style={styles.unitDividerText} numberOfLines={1}>
                  {unit.title}
                </Text>
                <View
                  style={[styles.unitDividerLine, { backgroundColor: pathStroke }]}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Sticky "lesson in view" card (reference lesson-card design) */}
      {cardUnit &&
        (() => {
          // Look up the fresh unit so the card stays current after refocus
          const activeUnit =
            cardUnits.find((c) => c.id === cardUnit.id)?.unit ?? cardUnit.unit;

          return (
            <View
              style={[styles.nowCardWrap, { top: insets.top + CARD_TOP }]}
              pointerEvents="box-none"
            >
              <View style={styles.nowCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.unitSubtitle} numberOfLines={1}>
                    {activeUnit.subtitle}
                  </Text>
                  <Text style={styles.unitTitle} numberOfLines={2}>
                    {activeUnit.title}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.infoBtn}
                  disabled={activeUnit.isLocked}
                  onPress={() =>
                    !activeUnit.isLocked &&
                    setSelectedUnit({
                      id: activeUnit.id,
                      title: activeUnit.title,
                      subtitle: activeUnit.subtitle,
                    })
                  }
                >
                  <Icon
                    name={activeUnit.isLocked ? "Lock" : "InfoCircle"}
                    size={18}
                    color={activeUnit.isLocked ? "#9CA3AF" : THEME.primary}
                    variant={activeUnit.isLocked ? "Bold" : "Linear"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

      {/* Gradient backdrop so scrolling map content never shows in the header */}
      <LinearGradient
        pointerEvents="none"
        colors={[bgTop, backdropBottom]}
        style={[styles.headerBackdrop, { height: insets.top + CARD_TOP }]}
      />

      {/* Floating header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.avatarWrap}>
          <Image
            source={getProfileAvatarSource(userProfile?.avatar_url)}
            style={styles.avatar}
            resizeMode="cover"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingLabel}>{getGreeting()}</Text>
          <Text style={styles.greetingName} numberOfLines={1}>
            {userProfile?.display_name ||
              userProfile?.username ||
              "Atom Explorer"}
          </Text>
        </View>

        {/* XP */}
        <View style={styles.xpPill}>
          <Icon name="Flash" size={15} color="#FFA000" variant="Bold" />
          <Text style={styles.xpText}>
            {(userProfile?.total_xp || 0).toLocaleString()}
          </Text>
        </View>

        {/* Daily missions button */}
        <View style={styles.headerIconBtnWrap}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.85}
            onPress={() => router.push("/missions")}
          >
            <Icon name="Medal" size={20} color="#FF8C00" variant="Bold" />
          </TouchableOpacity>
          {claimableCount > 0 && (
            <View style={styles.missionBadge}>
              <Text style={styles.missionBadgeText}>{claimableCount}</Text>
            </View>
          )}
        </View>

        {/* Daily fact button */}
        <View style={styles.headerIconBtnWrap}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.85}
            onPress={() => router.push("/daily-fact")}
          >
            <Icon name="Book" size={20} color="#2ECC71" variant="Bold" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating "jump to current lesson" arrow */}
      {arrowDir && currentUnitIndex !== -1 && (
        <Animated.View
          entering={FadeInDown.duration(250)}
          exiting={FadeOutDown.duration(200)}
          style={[styles.nextBtn, { bottom: insets.bottom + 130 }]}
        >
          <TouchableOpacity
            style={styles.nextBtnInner}
            activeOpacity={0.85}
            onPress={scrollToCurrent}
          >
            <Icon
              name={arrowDir === "up" ? "ArrowUp" : "ArrowDown"}
              size={24}
              color="#FFFFFF"
              variant="Bold"
            />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Unit info modal */}
      <Modal
        visible={selectedUnit !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedUnit(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalSubtitle}>
                    {selectedUnit?.subtitle}
                  </Text>
                  <Text style={styles.modalTitle}>{selectedUnit?.title}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedUnit(null)}
                  style={styles.modalCloseBtn}
                >
                  <Icon
                    name="CloseCircle"
                    size={28}
                    color={THEME.textMuted}
                    variant="Bold"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.modalSection}>
                <SectionHeader
                  icon="InfoCircle"
                  iconColor={THEME.primary}
                  title="About This Unit"
                  titleColor="#1F2937"
                  palette={THEME}
                />
                <Text style={styles.infoText}>
                  {selectedUnit && UNIT_INFO_DATA[selectedUnit.id]?.info}
                </Text>
              </View>

              {selectedUnit && UNIT_INFO_DATA[selectedUnit.id]?.references && (
                <View style={styles.modalSection}>
                  <SectionHeader
                    icon="Book1"
                    iconColor={THEME.primary}
                    title="References & Resources"
                    titleColor="#1F2937"
                    palette={THEME}
                  />
                  {UNIT_INFO_DATA[selectedUnit.id].references.map(
                    (ref, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.referenceItem}
                        onPress={async () => {
                          const opened = await openExternalUrl(ref);
                          if (!opened) {
                            Alert.alert("Error", "Could not open link");
                          }
                        }}
                      >
                        <Icon
                          name="Link"
                          size={16}
                          color={THEME.primary}
                          variant="Bold"
                        />
                        <Text style={styles.referenceText} numberOfLines={1}>
                          {ref.replace("https://", "").replace("http://", "")}
                        </Text>
                        <Icon
                          name="ArrowRight2"
                          size={16}
                          color={THEME.textMuted}
                        />
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              )}

              <TouchableOpacity
                style={styles.modalActionBtn}
                onPress={() => setSelectedUnit(null)}
              >
                <Text style={styles.modalActionText}>Got it!</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const LessonNode = ({
  node,
  x,
  y,
  unitColor,
  firstId,
  onPress,
  styles,
}: {
  node: PathNode;
  x: number;
  y: number;
  unitColor: string;
  firstId: string | null;
  onPress: () => void;
  styles: any;
}) => {
  const isLocked = node.status === "locked";
  const isCurrent = node.status === "current";
  const isCompleted = node.status === "completed";
  const isFirst = firstId === node.id;

  const pulse = useSharedValue(1);
  const pressed = useSharedValue(0);

  useEffect(() => {
    if (isCurrent) {
      pulse.value = withRepeat(withTiming(1.12, { duration: 800 }), -1, true);
    }
  }, [isCurrent]);

  // Reference :active — button sinks, lip shallows, badge follows it down
  const handlePressIn = useCallback(() => {
    pressed.value = withTiming(1, { duration: 150, easing: PRESS_EASING });
  }, [pressed]);
  const handlePressOut = useCallback(() => {
    pressed.value = withTiming(0, { duration: 150, easing: PRESS_EASING });
  }, [pressed]);

  const nodeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: pressed.value * NODE_PRESS_SHIFT },
      { scale: pulse.value },
    ],
  }));
  /* Face recedes upward when pressed, shallowing the lip below it */
  const faceStyle = useAnimatedStyle(() => ({
    bottom: NODE_LIP - pressed.value * (NODE_LIP - NODE_LIP_PRESSED),
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value * NODE_PRESS_SHIFT }],
  }));

  let iconName = "Star";
  if (node.type === "book") iconName = "Book";
  if (node.type === "chest") iconName = "Box";
  if (node.type === "trophy") iconName = "Cup";

  const faceColor = isLocked ? "#E5E7EB" : unitColor;
  const lipColor = isLocked
    ? shadeColor("#E5E7EB", -0.12)
    : shadeColor(unitColor, -0.14);
  const iconColor = isLocked ? "#9CA3AF" : "#FFFFFF";

  return (
    <View
      style={[
        styles.nodeWrap,
        { left: x - NODE_SIZE / 2, top: y - NODE_SIZE / 2 },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        disabled={isLocked}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            styles.node,
            nodeStyle,
            { shadowColor: isLocked ? "#000000" : `${unitColor}80` },
          ]}
        >
          {/* Inner rounded rect in lip color — its own painted corners */}
          <View style={[styles.nodeInner, { backgroundColor: lipColor }]}>
            {/* Face on top, leaving the rounded lip strip exposed below */}
            <Animated.View
              style={[styles.nodeFace, faceStyle, { backgroundColor: faceColor }]}
            >
              {/* Diagonal glass stripes (reference button ::before) */}
              <LinearGradient
                colors={GLASS_COLORS}
                locations={GLASS_LOCATIONS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.nodeGlass}
              />
            </Animated.View>
            <Icon
              name={iconName}
              size={isCurrent || node.type === "trophy" ? 32 : 26}
              color={iconColor}
              variant="Bold"
              style={{ marginBottom: Math.round(NODE_LIP / 2) }}
            />
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Completed check badge */}
      {isCompleted && (
        <Animated.View style={[styles.completedBadge, badgeStyle]}>
          <LinearGradient
            colors={["#FFBC00", "#FF7B00"]}
            style={styles.completedBadgeFill}
          >
            <Svg width={11} height={11} viewBox="0 0 24 24">
              <Polyline
                points="20 6 9 17 4 12"
                stroke="#333333"
                strokeWidth={4.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </LinearGradient>
        </Animated.View>
      )}

      {isFirst && (
        <Animated.View
          entering={FadeInDown.delay(300)}
          style={styles.startBubble}
        >
          <Text style={styles.startText}>START</Text>
          <View style={styles.bubbleArrow} />
        </Animated.View>
      )}
    </View>
  );
};

const createStyles = (theme: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    bgGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    leafLayer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 0,
    },
    leaf: {
      position: "absolute",
    },
    pathLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    /* Solid backdrop behind the header (covers scrolled map content) */
    headerBackdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 85,
    },
    /* Floating header — plain row, no box */
    header: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 12,
      zIndex: 100,
      pointerEvents: "box-none",
    },
    avatarWrap: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: "#FFFFFF",
      borderWidth: 2,
      borderColor: "#E5E7EB",
      borderBottomWidth: 4,
    },
    avatar: {
      width: "100%",
      height: "100%",
      borderRadius: 23,
    },
    greetingLabel: {
      fontSize: 11,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
      color: theme.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 1,
    },
    greetingName: {
      fontSize: 17,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: theme.text,
    },
    xpPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 12,
      height: 40,
      borderRadius: 20,
      elevation: 3,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    xpText: {
      fontSize: 13,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#1F2937",
    },
    /* Sticky unit card — left-aligned text, info button centered on the right */
    nowCardWrap: {
      position: "absolute",
      left: 20,
      right: 20,
      zIndex: 90,
      gap: 12,
    },
    nowCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      padding: 20,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 5,
    },
    /* Nodes */
    nodeWrap: {
      position: "absolute",
      width: NODE_SIZE,
      height: NODE_SIZE,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
    },
    /* Reference "button" node: square with white border wrapping the face */
    node: {
      width: NODE_SIZE,
      height: NODE_SIZE,
      borderRadius: NODE_RADIUS,
      borderWidth: NODE_BORDER,
      borderColor: "#FFFFFF",
      backgroundColor: "#FFFFFF",
      elevation: 6,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    /* Fills the area inside the border; painted in the lip color */
    nodeInner: {
      flex: 1,
      alignSelf: "stretch",
      borderRadius: NODE_INNER_RADIUS,
      alignItems: "center",
      justifyContent: "center",
    },
    /* Face covering everything except the bottom lip strip — the exposed
       inner rect below it is the lip, rounded by its own painted corners */
    nodeFace: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: NODE_LIP,
      borderRadius: NODE_INNER_RADIUS,
    },
    nodeGlass: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: NODE_INNER_RADIUS,
    },
    completedBadge: {
      position: "absolute",
      bottom: -8,
      alignSelf: "center",
      width: BADGE_SIZE,
      height: BADGE_SIZE,
      borderRadius: BADGE_SIZE / 2,
      borderWidth: 4,
      borderColor: "#FFFFFF",
      backgroundColor: "#FF7B00",
      zIndex: 20,
      elevation: 3,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    completedBadgeFill: {
      flex: 1,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    startBubble: {
      position: "absolute",
      top: -40,
      alignSelf: "center",
      backgroundColor: theme.card,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: "#E5E7EB",
      zIndex: 20,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    startText: {
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: theme.primary,
      fontSize: 13,
    },
    bubbleArrow: {
      position: "absolute",
      bottom: -7,
      left: "50%",
      marginLeft: -6,
      width: 12,
      height: 12,
      backgroundColor: theme.card,
      borderBottomWidth: 2,
      borderRightWidth: 2,
      borderColor: "#E5E7EB",
      transform: [{ rotate: "45deg" }],
    },
    unitDivider: {
      position: "absolute",
      top: 24,
      left: 20,
      right: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    unitDividerLine: {
      flex: 1,
      height: 2,
      borderRadius: 1,
    },
    unitDividerText: {
      fontSize: 13,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: theme.textMuted,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    unitSubtitle: {
      fontSize: 11,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
      color: "#888888",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 3,
    },
    unitTitle: {
      fontSize: 22,
      fontWeight: "700",
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    infoBtn: {
      width: 36,
      height: 36,
      backgroundColor: "#F4F5F7",
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    /* Floating "jump to current lesson" arrow */
    nextBtn: {
      position: "absolute",
      right: 24,
      width: 56,
      height: 56,
      zIndex: 95,
    },
    nextBtnInner: {
      flex: 1,
      borderRadius: 28,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
      borderBottomWidth: 4,
      borderBottomColor: "rgba(0,0,0,0.15)",
    },
    /* Header missions / daily-fact buttons (white circle, like profile header) */
    headerIconBtnWrap: {
      width: 40,
      height: 40,
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      elevation: 3,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    missionBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "#EF4444",
      borderWidth: 2,
      borderColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    missionBadgeText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
    },
    /* Modal */
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalContent: {
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      width: "100%",
      maxWidth: 500,
      maxHeight: "80%",
      padding: 24,
      borderWidth: 2,
      borderColor: "#E5E7EB",
      borderBottomWidth: 4,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 24,
      gap: 12,
    },
    modalSubtitle: {
      fontSize: 12,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
      color: "#9CA3AF",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 4,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#1F2937",
      lineHeight: 30,
    },
    modalCloseBtn: {
      padding: 4,
    },
    modalSection: {
      marginBottom: 24,
    },
    infoText: {
      fontSize: 15,
      fontFamily: fontFamilies.regular,
      lineHeight: 24,
      color: "#374151",
    },
    referenceItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: "#F4F5F7",
      borderRadius: 14,
      marginBottom: 8,
      borderWidth: 2,
      borderColor: "#E5E7EB",
      borderBottomWidth: 4,
    },
    referenceText: {
      flex: 1,
      fontSize: 13,
      color: theme.primary,
      fontWeight: "500",
      fontFamily: fontFamilies.medium,
    },
    modalActionBtn: {
      backgroundColor: theme.primary,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: "center",
      marginTop: 8,
      borderBottomWidth: 4,
      borderBottomColor: "rgba(0,0,0,0.15)",
    },
    modalActionText: {
      fontSize: 16,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: "#FFF",
    },
    /* Loading */
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
    },
    loadingMascot: {
      width: 180,
      height: 180,
      marginBottom: 24,
    },
    loadingTitle: {
      fontSize: 24,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: theme.text,
      textAlign: "center",
      marginBottom: 8,
    },
    loadingSubtitle: {
      fontSize: 16,
      fontFamily: fontFamilies.regular,
      color: theme.textMuted,
      textAlign: "center",
      marginBottom: 32,
    },
    loadingDotsContainer: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
    },
    loadingDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
    },
  });