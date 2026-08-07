import { Icon } from "@/components/ui/icon";
import { getAllMazes } from "@/content/explorer";

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme, withAlpha, type Palette } from "@/theme";

// Maze colors - Bright Mustard
const MAZE_COLORS: Record<string, { color: string; colorSecondary: string }> = {
  safety: { color: "#FFB300", colorSecondary: "#FFC107" },
  radiation: { color: "#FFA000", colorSecondary: "#FFB300" },
  history: { color: "#FF8F00", colorSecondary: "#FFA000" },
  reactor: { color: "#FFD54F", colorSecondary: "#FFEB3B" },
  default: { color: "#FFB300", colorSecondary: "#FFC107" },
};

const getMazeColors = (theme: string | undefined) => {
  if (!theme) return MAZE_COLORS.default;
  const lowerTheme = theme.toLowerCase();
  if (lowerTheme.includes("safety")) return MAZE_COLORS.safety;
  if (lowerTheme.includes("radiation")) return MAZE_COLORS.radiation;
  if (lowerTheme.includes("history")) return MAZE_COLORS.history;
  if (lowerTheme.includes("reactor")) return MAZE_COLORS.reactor;
  return MAZE_COLORS.default;
};

type MazeStageDifficulty = "easy" | "average" | "difficult";

const STAGE_DIFFICULTY_META: Record<
  MazeStageDifficulty,
  {
    label: string;
    backgroundColor: string;
    textColor: string;
  }
> = {
  easy: {
    label: "Easy",
    backgroundColor: "rgba(34, 197, 94, 0.22)",
    textColor: "#DCFCE7",
  },
  average: {
    label: "Average",
    backgroundColor: "rgba(251, 191, 36, 0.26)",
    textColor: "#FEF3C7",
  },
  difficult: {
    label: "Difficult",
    backgroundColor: "rgba(239, 68, 68, 0.24)",
    textColor: "#FEE2E2",
  },
};

const getMazeStageDifficulty = (
  index: number,
  totalMazes: number,
): MazeStageDifficulty => {
  if (totalMazes <= 1) {
    return "easy";
  }

  const maxIndex = Math.max(totalMazes - 1, 1);
  const progress = index / maxIndex;

  if (progress < 1 / 3) {
    return "easy";
  }

  if (progress < 2 / 3) {
    return "average";
  }

  return "difficult";
};

export default function AtomMazeSelectionScreen() {
  const router = useRouter();
  const allMazes = getAllMazes();
  const { theme: appTheme } = useTheme();
  const theme = appTheme.palettes.maze;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.modeHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.backButtonCircle,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Icon name="ArrowLeft2" size={20} color={theme.text} />
          </TouchableOpacity>
          <View
            style={[
              styles.headerBadge,
              {
                backgroundColor: theme.primary,
                borderBottomColor: theme.primaryDark,
              },
            ]}
          >
            <Icon name="Game" size={18} color={theme.white} variant="Bold" />
            <Text style={styles.headerBadgeText}>AtomMaze</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.modeScrollView}
          contentContainerStyle={styles.modeContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Maze Cards */}
          <View style={styles.modesGridNew}>
            {allMazes.map((maze, index) => {
              const colors = getMazeColors(maze.theme);
              const stageDifficulty = getMazeStageDifficulty(
                index,
                allMazes.length,
              );
              const stageDifficultyMeta =
                STAGE_DIFFICULTY_META[stageDifficulty];

              return (
                <Animated.View
                  key={maze.id}
                  entering={FadeInDown.delay(100 + index * 100)}
                >
                  <Pressable
                    onPress={() =>
                      router.push(`/explorer/atom-maze?id=${maze.id}`)
                    }
                    style={({ pressed }) => [
                      styles.modeCardNew,
                      pressed && styles.modeCardPressed,
                    ]}
                  >
                    {/* 3D Card Bottom Layer (Shadow/Depth) */}
                    <View
                      style={[
                        styles.card3DBottom,
                        { backgroundColor: colors.color + "AA" },
                      ]}
                    />

                    {/* 3D Card Middle Layer */}
                    <View
                      style={[
                        styles.card3DMiddle,
                        { backgroundColor: colors.color },
                      ]}
                    />

                    {/* Card Background Gradient - Top Layer */}
                    <LinearGradient
                      colors={[colors.colorSecondary, colors.color] as const}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0.3, y: 1 }}
                      style={styles.modeCardGradientNew}
                    >
                      {/* Content */}
                      <View style={styles.modeCardContent}>
                        <View style={styles.modeCardHeaderRow}>
                          <Text style={styles.modeStageText}>
                            Stage {index + 1}
                          </Text>
                          <View
                            style={[
                              styles.modeDifficultyChip,
                              {
                                backgroundColor:
                                  stageDifficultyMeta.backgroundColor,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.modeDifficultyChipText,
                                { color: stageDifficultyMeta.textColor },
                              ]}
                            >
                              {stageDifficultyMeta.label}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.modeCardTitleNew}>
                          {maze.title}
                        </Text>
                        <Text style={styles.modeCardDescNew} numberOfLines={2}>
                          {maze.description}
                        </Text>
                      </View>

                      {/* Play Arrow */}
                      <View
                        style={[styles.playArrowCircle, { marginTop: -16 }]}
                      >
                        <Icon
                          name="Play"
                          size={20}
                          color={colors.color}
                          variant="Bold"
                        />
                      </View>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          <View style={{ height: 36 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  modeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  backButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderBottomWidth: 4,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexShrink: 0,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: withAlpha(theme.white, 0.3),
    borderBottomWidth: 4,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    flexShrink: 1,
  },
  headerBadgeText: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.white,
  },
  modeScrollView: {
    flex: 1,
  },
  modeContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  modesGridNew: {
    gap: 16,
  },
  modeCardNew: {
    borderRadius: 24,
    position: "relative",
    height: 150,
  },
  modeCardPressed: {
    transform: [{ scale: 0.97 }, { translateY: 2 }],
  },
  // 3D Layers
  card3DBottom: {
    position: "absolute",
    top: 8,
    left: 4,
    right: -4,
    bottom: -8,
    borderRadius: 24,
    opacity: 0.4,
  },
  card3DMiddle: {
    position: "absolute",
    top: 4,
    left: 2,
    right: -2,
    bottom: -4,
    borderRadius: 24,
    opacity: 0.6,
  },
  modeCardGradientNew: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    paddingRight: 68,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: withAlpha(theme.white, 0.3),
    borderTopColor: withAlpha(theme.white, 0.5),
    borderLeftColor: withAlpha(theme.white, 0.4),
  },
  // Shine Effect
  cardShine: {
    position: "absolute",
    top: -50,
    left: -50,
    width: 100,
    height: 200,
    backgroundColor: withAlpha(theme.white, 0.15),
    transform: [{ rotate: "45deg" }],
  },
  cardCircle: {
    position: "absolute",
    borderRadius: 100,
    backgroundColor: withAlpha(theme.white, 0.12),
  },
  cardCircle1: {
    width: 140,
    height: 140,
    top: -40,
    right: -40,
  },
  cardCircle2: {
    width: 100,
    height: 100,
    bottom: -30,
    left: -30,
  },
  modeIconBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: withAlpha(theme.white, 0.3),
    alignItems: "center",
    justifyContent: "center",
    // 3D effect for badge
    borderWidth: 2,
    borderColor: withAlpha(theme.white, 0.4),
    borderTopColor: withAlpha(theme.white, 0.6),
  },
  modeIconInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.white,
    alignItems: "center",
    justifyContent: "center",
    // Inner shadow effect
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  iconBadgeShine: {
    position: "absolute",
    top: 4,
    left: 8,
    width: 16,
    height: 8,
    borderRadius: 4,
    backgroundColor: withAlpha(theme.white, 0.6),
    transform: [{ rotate: "-20deg" }],
  },
  modeCardContent: {
    flex: 1,
    gap: 8,
  },
  modeCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  modeStageText: {
    fontSize: 12,
    fontWeight: "800",
    color: withAlpha(theme.white, 0.92),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modeDifficultyChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: withAlpha(theme.white, 0.3),
  },
  modeDifficultyChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  modeCardTitleNew: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.white,
  },
  modeCardDescNew: {
    fontSize: 12,
    color: withAlpha(theme.white, 0.9),
    fontWeight: "500",
    lineHeight: 16,
  },
  playArrowCircle: {
    position: "absolute",
    right: 16,
    top: "50%",
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.white,
    alignItems: "center",
    justifyContent: "center",
    // 3D effect
    borderWidth: 3,
    borderColor: withAlpha(theme.white, 0.9),
    borderBottomColor: "rgba(0,0,0,0.1)",
    borderRightColor: "rgba(0,0,0,0.05)",
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
});
