import { Icon } from "@/components/ui/icon";
import { UNITS } from "@/content/units";
import { useAllLevels } from "@/hooks/use-storage";
import {
  useDailyMissions,
  type MissionView,
} from "@/hooks/use-daily-missions";
import { getDailyFact, type DailyFact } from "@/services/missions";
import { openExternalUrl } from "@/services/open-url";
import { getProfileAvatarSource } from "@/services/profile-avatars";
import { useStorage } from "@/services/StorageContext";
import { useTheme, type Palette, fontFamilies } from "@/theme";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    FadeIn,
    FadeInDown,
    FadeOut,
    FadeOutDown,
    LinearTransition,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    ZoomIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Polygon, Polyline } from "react-native-svg";

const NODE_SIZE = 79;
const NODE_ROW_GAP = 120;
const NODE_TOP = 88;
const SECTION_PAD = 48;
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

/* Autumn action tokens, shared with the missions + daily-fact screens */
const BTN_COLOR = "#FF8C00";
const BTN_LIP = "#E67E22";
const CREAM = "#FFF3E0";

/* Flat-top hexagon for the per-mission icon (46x46 viewBox), inset so the
   thicker rounding stroke stays inside the canvas */
const HEX_POINTS = "23,6.3 37.72,14.5 37.72,31.5 23,39.7 8.28,31.5 8.28,14.5";

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

/* Standard UI ease-out (fade up, settle) for state-driven fills */
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

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
  const {
    missions,
    claim,
    claimableCount,
    completedCount,
    markFactRead,
    refresh: refreshMissions,
  } = useDailyMissions();
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
  const [infoOpen, setInfoOpen] = useState(false);
  const [cardUnit, setCardUnit] = useState<CardUnit | null>(null);
  const [arrowDir, setArrowDir] = useState<"up" | "down" | null>(null);
  const [dailyPanel, setDailyPanel] = useState<"missions" | "fact" | null>(null);
  const [dailyFact, setDailyFact] = useState<DailyFact | null>(null);

  useEffect(() => {
    void getDailyFact().then(setDailyFact);
  }, []);

  /* Today's fact is claimed once the "fact" mission flips to claimed */
  const factClaimed = missions.some((m) => m.type === "fact" && m.isClaimed);
  const remainingReward = missions
    .filter((m) => !m.isClaimed)
    .reduce((sum, m) => sum + m.reward, 0);

  /* Missions progress fill — grows left-to-right when a claim lands */
  const fill = useSharedValue(0);
  const fillStyle = useAnimatedStyle(() => ({
    transformOrigin: "left",
    transform: [{ scaleX: Math.max(0.08, fill.get()) }],
  }));
  useEffect(() => {
    fill.set(
      withTiming(missions.length ? completedCount / missions.length : 0, {
        duration: 300,
        easing: EASE_OUT,
      }),
    );
  }, [fill, missions.length, completedCount]);

  const claimMission = useCallback(
    async (mission: MissionView) => {
      if (!mission.isComplete || mission.isClaimed) return;
      await claim(mission);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [claim],
  );

  const handleMarkFactRead = useCallback(async () => {
    if (factClaimed) return;
    await markFactRead();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [markFactRead, factClaimed]);

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
      // The expanded panels are a peek, not a screen — dismiss them as
      // soon as the map moves so they never cover the path
      setDailyPanel(null);
      setInfoOpen(false);
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

  /* Action button with a rounded bottom lip (missions row action) */
  const ActionButton = ({
    color,
    lipColor,
    icon,
    label,
    onPress,
  }: {
    color: string;
    lipColor: string;
    icon: string;
    label: string;
    onPress: () => void;
  }) => (
    <View style={[styles.actionBtnClip, { backgroundColor: color }]}>
      <TouchableOpacity
        style={[styles.actionBtnFace, { backgroundColor: color }]}
        activeOpacity={0.85}
        onPress={onPress}
      >
        <Icon name={icon} size={15} color="#FFFFFF" variant="Bold" />
        <Text style={styles.actionBtnText}>{label}</Text>
      </TouchableOpacity>
      <View style={[styles.actionBtnLip, { backgroundColor: lipColor }]} />
    </View>
  );

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

      {/* Gradient backdrop so scrolling map content never shows in the header */}
      <LinearGradient
        pointerEvents="none"
        colors={[bgTop, backdropBottom]}
        style={[styles.headerBackdrop, { height: insets.top + CARD_AREA }]}
      />

      {/* Floating header + lesson card, one rounded container */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {/* One rounded amber card holding the header row and the lesson card —
            layout-animated so the daily panels morph the card open, not pop in */}
        <Animated.View
          layout={LinearTransition.duration(260).easing(EASE_OUT)}
          style={styles.headerBar}
        >
          <View style={styles.headerRow}>
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

            {/* Daily missions + fact — two icon buttons, expand the card */}
            <View style={styles.dailyRow}>
              <TouchableOpacity
                style={[
                  styles.dailyChip,
                  dailyPanel === "missions" && styles.dailyChipActive,
                ]}
                activeOpacity={0.85}
                hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
                onPress={() => {
                  setInfoOpen(false);
                  setDailyPanel((p) => (p === "missions" ? null : "missions"));
                }}
              >
                <Icon name="Medal" size={19} color="#FF8C00" variant="Bold" />
                {claimableCount > 0 && (
                  <View style={styles.missionBadge}>
                    <Text style={styles.missionBadgeText}>{claimableCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dailyChip,
                  dailyPanel === "fact" && styles.dailyChipActive,
                ]}
                activeOpacity={0.85}
                hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
                onPress={() => {
                  setInfoOpen(false);
                  setDailyPanel((p) => (p === "fact" ? null : "fact"));
                }}
              >
                <Icon name="Book" size={19} color="#2ECC71" variant="Bold" />
              </TouchableOpacity>
            </View>
          </View>

          {cardUnit &&
            (() => {
              // Look up the fresh unit so the card stays current after refocus
              const activeUnit =
                cardUnits.find((c) => c.id === cardUnit.id)?.unit ??
                cardUnit.unit;
              const unitInfo = UNIT_INFO_DATA[activeUnit.id];

              return (
                <Animated.View
                  layout={LinearTransition.duration(260).easing(EASE_OUT)}
                  style={styles.nowCard}
                >
                  <View style={styles.nowCardRow}>
                    {/* Keyed by unit so a section change crossfades the
                        title/subtitle instead of snapping */}
                    <View style={styles.nowCardText} key={activeUnit.id}>
                      <Animated.View
                        entering={FadeIn.duration(200)}
                        exiting={FadeOut.duration(150)}
                      >
                        <Text style={styles.unitSubtitle} numberOfLines={1}>
                          {activeUnit.subtitle}
                        </Text>
                        <Text style={styles.unitTitle} numberOfLines={2}>
                          {activeUnit.title}
                        </Text>
                      </Animated.View>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.infoBtn,
                        infoOpen && styles.infoBtnActive,
                      ]}
                      disabled={activeUnit.isLocked}
                      onPress={() => {
                        if (activeUnit.isLocked) return;
                        setDailyPanel(null);
                        setInfoOpen((o) => !o);
                      }}
                    >
                      <Icon
                        name={
                          activeUnit.isLocked
                            ? "Lock"
                            : infoOpen
                              ? "CloseCircle"
                              : "InfoCircle"
                        }
                        size={18}
                        color={
                          activeUnit.isLocked
                            ? "#9CA3AF"
                            : infoOpen
                              ? "#724D06"
                              : THEME.primary
                        }
                        variant={
                          activeUnit.isLocked || infoOpen ? "Bold" : "Linear"
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Unit info expands inside the card — no modal */}
                  {infoOpen && unitInfo?.info && (
                    <Animated.View
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(160)}
                      style={styles.infoSection}
                    >
                      <View style={styles.infoDivider} />
                      <Text style={styles.infoLabel}>About this unit</Text>
                      <Text style={styles.infoBody}>{unitInfo.info}</Text>
                      {unitInfo.references.length > 0 && (
                        <>
                          <Text style={styles.infoLabel}>
                            References & Resources
                          </Text>
                          <ScrollView
                            showsVerticalScrollIndicator={false}
                            style={styles.infoRefs}
                          >
                            {unitInfo.references.map((ref, index) => (
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
                                  size={14}
                                  color={THEME.primary}
                                  variant="Bold"
                                />
                                <Text
                                  style={styles.referenceText}
                                  numberOfLines={1}
                                >
                                  {ref
                                    .replace("https://", "")
                                    .replace("http://", "")}
                                </Text>
                                <Icon
                                  name="ArrowRight2"
                                  size={14}
                                  color={THEME.textMuted}
                                />
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </>
                      )}
                    </Animated.View>
                  )}
                </Animated.View>
              );
            })()}

          {/* Daily missions panel — claims happen right here */}
          {dailyPanel === "missions" && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(160)}
              style={styles.dailyPanel}
            >
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Daily Missions</Text>
                <Text style={styles.panelMeta}>
                  {completedCount}/{missions.length} · {remainingReward} XP left
                </Text>
              </View>
              <View style={styles.panelProgressTrack}>
                <Animated.View style={[styles.panelProgressFill, fillStyle]} />
              </View>
              {missions.map((mission) => {
                const showClaim = mission.isComplete && !mission.isClaimed;
                return (
                  <View key={mission.id} style={styles.panelRow}>
                    <View style={styles.missionIconBox}>
                      <Svg width={40} height={40} viewBox="0 0 46 46">
                        <Polygon
                          points={HEX_POINTS}
                          fill={mission.isComplete ? BTN_COLOR : CREAM}
                          stroke={mission.isComplete ? BTN_COLOR : CREAM}
                          strokeWidth={12}
                          strokeLinejoin="round"
                        />
                      </Svg>
                      <Icon
                        name={mission.icon}
                        size={19}
                        color={mission.isComplete ? "#FFFFFF" : BTN_COLOR}
                        variant="Bold"
                        style={styles.missionIconOverlay}
                      />
                    </View>
                    <View style={styles.missionInfo}>
                      <Text style={styles.missionTitle} numberOfLines={1}>
                        {mission.title}
                      </Text>
                      <Text style={styles.missionDesc} numberOfLines={1}>
                        {mission.description}
                      </Text>
                    </View>
                    {mission.isClaimed ? (
                      <Animated.View
                        entering={ZoomIn.duration(200)}
                        style={styles.claimedPill}
                      >
                        <Icon
                          name="TickCircle"
                          size={14}
                          color="#FFFFFF"
                          variant="Bold"
                        />
                        <Text style={styles.claimedText}>Claimed</Text>
                      </Animated.View>
                    ) : showClaim ? (
                      <ActionButton
                        color={BTN_COLOR}
                        lipColor={BTN_LIP}
                        icon="TickCircle"
                        label="Claim"
                        onPress={() => void claimMission(mission)}
                      />
                    ) : mission.type === "mythbuster" ? (
                      <ActionButton
                        color="#8B5CF6"
                        lipColor="#6D28D9"
                        icon="Play"
                        label="Play"
                        onPress={() => router.push("/mythbuster")}
                      />
                    ) : mission.type === "fact" ? (
                      <ActionButton
                        color="#2ECC71"
                        lipColor="#27AE60"
                        icon="Book"
                        label="Read"
                        onPress={() => setDailyPanel("fact")}
                      />
                    ) : (
                      <View style={styles.lockedPill}>
                        <Text style={styles.lockedText}>In progress</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </Animated.View>
          )}

          {/* Daily fact panel — today's myth or fact, read in place */}
          {dailyPanel === "fact" && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(160)}
              style={styles.dailyPanel}
            >
              <View style={styles.factHeader}>
                <View style={styles.factHeaderLeft}>
                  <View
                    style={[
                      styles.factBadge,
                      dailyFact?.kind === "myth" && styles.factBadgeMyth,
                    ]}
                  >
                    <Icon
                      name={
                        dailyFact?.kind === "myth" ? "CloseCircle" : "TickCircle"
                      }
                      size={12}
                      color="#FFFFFF"
                      variant="Bold"
                    />
                    <Text style={styles.factBadgeText}>
                      {dailyFact?.kind === "myth" ? "MYTH" : "DAILY FACT"}
                    </Text>
                  </View>
                  <Text style={styles.factTitle} numberOfLines={1}>
                    {dailyFact?.title ?? "Loading today's fact..."}
                  </Text>
                </View>
                <View style={styles.rewardPill}>
                  <Icon name="Flash" size={13} color="#FFA000" variant="Bold" />
                  <Text style={styles.rewardText}>+50 XP</Text>
                </View>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.panelScroll}
              >
                <View style={styles.panelScrollInner}>
                  {dailyFact ? (
                    <>
                      <Text style={styles.factStatement}>
                        {"\u201C"}{dailyFact.statement}{"\u201D"}
                      </Text>
                      <View style={styles.factDivider} />
                      <Text style={styles.factExplainLabel}>Why it matters</Text>
                      <Text style={styles.factExplain}>
                        {dailyFact.explanation}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.factExplain}>Loading...</Text>
                  )}
                </View>
              </ScrollView>
              <View style={styles.factAction}>
                {factClaimed ? (
                  <Animated.View
                    entering={ZoomIn.duration(200)}
                    style={styles.factReadPill}
                  >
                    <Icon
                      name="TickCircle"
                      size={15}
                      color="#FFFFFF"
                      variant="Bold"
                    />
                    <Text style={styles.factReadText}>Read & Claimed</Text>
                  </Animated.View>
                ) : (
                  <TouchableOpacity
                    style={styles.factReadBtn}
                    activeOpacity={0.85}
                    onPress={() => void handleMarkFactRead()}
                  >
                    <Icon name="Book" size={17} color="#FFFFFF" variant="Bold" />
                    <Text style={styles.factReadBtnText}>Read & Claim</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </View>

      {/* Floating "jump to current lesson" arrow */}
      {arrowDir && currentUnitIndex !== -1 && (
        <Animated.View
          entering={FadeInDown.duration(250)}
          exiting={FadeOutDown.duration(200)}
          style={[styles.nextBtn, { bottom: insets.bottom + 130 }]}
>
            <View style={styles.nextBtnClip}>
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
              <View style={styles.nextBtnLip} />
            </View>
          </Animated.View>
        )}
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
      // Loop the "next up" pulse while this node is the current lesson
      pulse.value = withRepeat(withTiming(1.12, { duration: 800 }), -1, true);
    } else {
      // The infinite loop only stops when it's cancelled — otherwise a node
      // that was current keeps pulsing forever after it's completed
      cancelAnimation(pulse);
      pulse.set(1);
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
    /* Floating header — positioning wrapper for the rounded bar */
    header: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 16,
      paddingBottom: 12,
      zIndex: 100,
      pointerEvents: "box-none",
    },
    /* One rounded amber card holding the header row and the lesson card */
    headerBar: {
      backgroundColor: "#FFCA5F",
      borderRadius: 26,
      padding: 10,
      gap: 12,
      elevation: 4,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
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
      color: "#724D06",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 1,
    },
    greetingName: {
      fontSize: 17,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#724D06",
    },
    xpPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#434343",
      paddingHorizontal: 12,
      height: 40,
      borderRadius: 14,
    },
    xpText: {
      fontSize: 13,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#FFFFFF",
    },
    /* Lesson card — its own separate card design nested in the header bar */
    nowCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      padding: 16,
      borderWidth: 2,
      borderColor: "#E5E7EB",
      borderBottomWidth: 4,
    },
    nowCardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    nowCardText: {
      flex: 1,
      overflow: "hidden",
    },
    /* Unit info expands inside the lesson card */
    infoSection: {
      marginTop: 12,
    },
    infoDivider: {
      height: 1,
      backgroundColor: "#F0F0F0",
      marginBottom: 12,
    },
    infoLabel: {
      fontSize: 10,
      fontWeight: "700",
      fontFamily: fontFamilies.heavy,
      color: "#9CA3AF",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 5,
    },
    infoBody: {
      fontSize: 13,
      fontFamily: fontFamilies.regular,
      color: "#555555",
      lineHeight: 20,
    },
    infoRefs: {
      maxHeight: 172,
      marginTop: 2,
    },
    infoBtnActive: {
      backgroundColor: "#FFE0B2",
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
      top: 10,
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
      fontSize: 20,
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
    /* Rounded clip so the bottom lip's corners stay round */
    nextBtnClip: {
      flex: 1,
      borderRadius: 28,
      overflow: "hidden",
      backgroundColor: theme.primary,
    },
    nextBtnInner: {
      flex: 1,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    nextBtnLip: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 4,
      backgroundColor: "rgba(0,0,0,0.15)",
    },
    /* Daily missions + fact icons: two square buttons that expand the card */
    dailyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    dailyChip: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#FFDD8D",
      borderBottomWidth: 4,
      elevation: 2,
    },
    dailyChipActive: {
      backgroundColor: "#FFE0B2",
    },
    /* Expanded daily panel — a white card floating under the header bar */
    dailyPanel: {
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      padding: 14,
      gap: 12,
      borderWidth: 2,
      borderColor: "#E5E7EB",
      borderBottomWidth: 4,
      elevation: 6,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    },
    panelHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    panelTitle: {
      fontSize: 15,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    panelMeta: {
      fontSize: 12,
      fontFamily: fontFamilies.semibold,
      color: "#9CA3AF",
    },
    panelProgressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: "#F4F5F7",
      overflow: "hidden",
    },
    panelProgressFill: {
      width: "100%",
      height: "100%",
      borderRadius: 4,
      backgroundColor: BTN_COLOR,
    },
    panelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    missionIconBox: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    missionIconOverlay: {
      position: "absolute",
    },
    missionInfo: {
      flex: 1,
    },
    missionTitle: {
      fontSize: 13,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    missionDesc: {
      fontSize: 11,
      fontFamily: fontFamilies.regular,
      color: "#9CA3AF",
      marginTop: 1,
    },
    /* Mission row actions */
    actionBtnClip: {
      height: 36,
      borderRadius: 13,
      overflow: "hidden",
    },
    actionBtnFace: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingHorizontal: 12,
    },
    actionBtnText: {
      fontSize: 12,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#FFFFFF",
    },
    actionBtnLip: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 4,
    },
    claimedPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#2ECC71",
      borderRadius: 12,
      paddingHorizontal: 11,
      height: 32,
    },
    claimedText: {
      fontSize: 12,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#FFFFFF",
    },
    lockedPill: {
      backgroundColor: "#F4F5F7",
      borderRadius: 12,
      paddingHorizontal: 11,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    lockedText: {
      fontSize: 12,
      fontFamily: fontFamilies.semibold,
      color: "#9CA3AF",
    },
    /* Daily fact panel */
    factHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    factHeaderLeft: {
      flex: 1,
      alignItems: "flex-start",
      gap: 6,
    },
    factBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#2ECC71",
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    factBadgeMyth: {
      backgroundColor: "#E74C3C",
    },
    factBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#FFFFFF",
      letterSpacing: 0.6,
    },
    factTitle: {
      fontSize: 14,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    rewardPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: CREAM,
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    rewardText: {
      fontSize: 11,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#E67E22",
    },
    factStatement: {
      fontSize: 15,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: "#1F2937",
      lineHeight: 23,
    },
    factDivider: {
      height: 1,
      backgroundColor: "#F0F0F0",
      marginVertical: 12,
    },
    factExplainLabel: {
      fontSize: 10,
      fontWeight: "700",
      fontFamily: fontFamilies.heavy,
      color: "#9CA3AF",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 5,
    },
    factExplain: {
      fontSize: 13,
      fontFamily: fontFamilies.regular,
      color: "#555555",
      lineHeight: 20,
    },
    factAction: {
      flexDirection: "row",
      justifyContent: "flex-start",
    },
    factReadBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 16,
      height: 40,
      borderRadius: 13,
      backgroundColor: BTN_COLOR,
      borderBottomWidth: 4,
      borderBottomColor: BTN_LIP,
    },
    factReadBtnText: {
      fontSize: 13,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#FFFFFF",
    },
    factReadPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#2ECC71",
      borderRadius: 13,
      paddingHorizontal: 15,
      height: 40,
    },
    factReadText: {
      fontSize: 13,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#FFFFFF",
    },
    /* Long fact content scrolls within the panel */
    panelScroll: {
      maxHeight: 280,
    },
    panelScrollInner: {
      paddingVertical: 2,
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
  });