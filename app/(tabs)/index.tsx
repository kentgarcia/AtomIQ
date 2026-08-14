import { Icon } from "@/components/ui/icon";
import { SectionHeader } from "@/components/ui/section-header";
import { UNITS } from "@/content/units";
import { useAllLevels } from "@/hooks/use-storage";
import { openExternalUrl } from "@/services/open-url";
import { getProfileAvatarSource } from "@/services/profile-avatars";
import { useStorage } from "@/services/StorageContext";
import { useTheme, type Palette, fontFamilies } from "@/theme";
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
    FadeInDown,
    FadeOutDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const NODE_SIZE = 70;
const NODE_ROW_GAP = 120;
const NODE_TOP = 88;
const SECTION_PAD = 110;
/* Sticky card geometry (safe-area-relative) */
const CARD_TOP = 78;
const CARD_AREA = 190;

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
  const { theme } = useTheme();
  const { width, height: windowHeight } = useWindowDimensions();
  const THEME = theme.palettes.tab;
  const styles = useMemo(() => createStyles(THEME), [THEME]);

  // Plain background (white in light mode, same navy as Discovery in dark)
  const pageBg = theme.mode === "dark" ? THEME.bg : "#FFFFFF";

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
    }, [refresh]),
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
      <View style={[styles.container, { backgroundColor: pageBg }]}>
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
    <View style={[styles.container, { backgroundColor: pageBg }]}>

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

      {/* Sticky "lesson in view" card */}
      {cardUnit && (
        <View
          style={[styles.nowCard, { top: insets.top + CARD_TOP }]}
          pointerEvents="box-none"
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.unitSubtitle} numberOfLines={1}>
              {cardUnit.unit.subtitle}
            </Text>
            <Text style={styles.unitTitle} numberOfLines={1}>
              {cardUnit.unit.title}
            </Text>
            <Text style={styles.nowDesc} numberOfLines={2}>
              {UNIT_INFO_DATA[cardUnit.unit.id]?.info ?? cardUnit.unit.subtitle}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.infoBtn}
            disabled={cardUnit.unit.isLocked}
            onPress={() =>
              !cardUnit.unit.isLocked &&
              setSelectedUnit({
                id: cardUnit.unit.id,
                title: cardUnit.unit.title,
                subtitle: cardUnit.unit.subtitle,
              })
            }
          >
            <Icon
              name={cardUnit.unit.isLocked ? "Lock" : "InfoCircle"}
              size={20}
              color={cardUnit.unit.isLocked ? "#9CA3AF" : theme.primary}
              variant={cardUnit.unit.isLocked ? "Bold" : "Linear"}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Solid backdrop so scrolling map content never shows in the header */}
      <View
        pointerEvents="none"
        style={[
          styles.headerBackdrop,
          { height: insets.top + CARD_TOP, backgroundColor: pageBg },
        ]}
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
        <View style={styles.xpPill}>
          <Icon name="Flash" size={15} color="#FFA000" variant="Bold" />
          <Text style={styles.xpText}>
            {(userProfile?.total_xp || 0).toLocaleString()}
          </Text>
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
  const ring = useSharedValue(1);

  useEffect(() => {
    if (isCurrent) {
      pulse.value = withRepeat(withTiming(1.12, { duration: 800 }), -1, true);
      ring.value = withRepeat(
        withTiming(1.35, { duration: 800 }),
        -1,
        true,
      );
    }
  }, [isCurrent]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value }],
    opacity: 0.5 - (ring.value - 1) * 1.4,
  }));

  let iconName = "Star";
  if (node.type === "book") iconName = "Book";
  if (node.type === "chest") iconName = "Box";
  if (node.type === "trophy") iconName = "Cup";

  const faceColor = isLocked
    ? "#E5E7EB"
    : isCompleted
      ? "#FFFFFF"
      : unitColor;
  const iconColor = isLocked ? "#9CA3AF" : isCompleted ? unitColor : "#FFFFFF";

  return (
    <View
      style={[
        styles.nodeWrap,
        { left: x - NODE_SIZE / 2, top: y - NODE_SIZE / 2 },
      ]}
    >
      {isCurrent && (
        <Animated.View style={[styles.pulseRing, { borderColor: unitColor }, ringStyle]} />
      )}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={isLocked ? undefined : onPress}
      >
        <Animated.View
          style={[
            styles.node,
            isCurrent ? pulseStyle : {},
            { shadowColor: isLocked ? "#00000030" : `${unitColor}80` },
          ]}
        >
          <View
            style={[
              styles.nodeLip,
              { backgroundColor: isLocked ? "#CFD8DC" : unitColor },
            ]}
          />
          <View
            style={[
              styles.nodeFace,
              {
                backgroundColor: faceColor,
                borderWidth: isCurrent ? 0 : 2,
                borderColor: isCompleted ? unitColor : "transparent",
              },
            ]}
          >
            <Icon
              name={iconName}
              size={isCurrent || node.type === "trophy" ? 30 : 24}
              color={iconColor}
              variant="Bold"
            />
            {isCompleted && (
              <View style={styles.crownBadge}>
                <Icon name="Crown1" size={12} color="#FFC107" variant="Bold" />
              </View>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>

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
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: "#E5E7EB",
      borderBottomWidth: 4,
    },
    xpText: {
      fontSize: 13,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#1F2937",
    },
    /* Sticky unit card — fixed light surface (never black in dark mode) */
    nowCard: {
      position: "absolute",
      left: 20,
      right: 20,
      zIndex: 90,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      padding: 20,
      borderWidth: 2,
      borderColor: "#E5E7EB",
      borderBottomWidth: 4,
    },
    nowDesc: {
      fontSize: 12,
      fontFamily: fontFamilies.regular,
      lineHeight: 16,
      color: "#9CA3AF",
      marginTop: 2,
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
    pulseRing: {
      position: "absolute",
      width: NODE_SIZE,
      height: NODE_SIZE,
      borderRadius: NODE_SIZE / 2,
      borderWidth: 3,
    },
    node: {
      width: NODE_SIZE,
      height: NODE_SIZE,
      borderRadius: NODE_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      elevation: 5,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
    },
    nodeLip: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "100%",
      borderRadius: NODE_SIZE / 2,
      zIndex: -1,
      transform: [{ translateY: 5 }],
    },
    nodeFace: {
      width: "100%",
      height: "100%",
      borderRadius: NODE_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    crownBadge: {
      position: "absolute",
      bottom: -4,
      right: -4,
      backgroundColor: theme.card,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#E5E7EB",
      zIndex: 20,
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
      color: "#9CA3AF",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 2,
    },
    unitTitle: {
      fontSize: 17,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#1F2937",
    },
    infoBtn: {
      width: 40,
      height: 40,
      backgroundColor: "#F4F5F7",
      borderRadius: 12,
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