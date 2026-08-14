/**
 * DifficultyPanel — in-page selection for Atom Maze, Myth Buster and the
 * Lab. Renders the same full-bleed slanted stack design as the game
 * picker; slides in on the Games tab after the picker slides away.
 */

import { StackCard } from "@/components/games/StackCard";
import { getAllMazes } from "@/content/explorer";
import { GAME_MODES } from "@/app/mythbuster/modes";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HEADER_H = 200;
const TAB_CLEAR = 110;

/* ------------------------------------------------------------------ */
/* Maze stage colors (mirrors app/atom-maze.tsx)                       */
/* ------------------------------------------------------------------ */

const MAZE_COLORS: Record<string, string> = {
  safety: "#FFB300",
  radiation: "#FFA000",
  history: "#FF8F00",
  reactor: "#FFD54F",
  default: "#FFB300",
};

const getMazeColor = (theme: string | undefined) => {
  if (!theme) return MAZE_COLORS.default;
  const lowerTheme = theme.toLowerCase();
  if (lowerTheme.includes("safety")) return MAZE_COLORS.safety;
  if (lowerTheme.includes("radiation")) return MAZE_COLORS.radiation;
  if (lowerTheme.includes("history")) return MAZE_COLORS.history;
  if (lowerTheme.includes("reactor")) return MAZE_COLORS.reactor;
  return MAZE_COLORS.default;
};

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function DifficultyPanel({
    game,
}: {
    game: "atom-maze" | "mythbuster" | "lab";
}) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const { theme } = useTheme();
    const tab = theme.palettes.tab;

    // Same stacking math as the game picker: stack fills the area below
    // the header and above the floating tab bar.
    const stackH = Math.round(
        windowHeight - insets.top - 18 - HEADER_H - insets.bottom - TAB_CLEAR,
    );

    const items = useMemo(() => {
        if (game === "atom-maze") {
            return getAllMazes().map((maze, i) => ({
                key: maze.id,
                title: maze.title,
                color: getMazeColor(maze.theme),
                icon: "Grid9",
                delay: 50 + i * 50,
                onPress: () =>
                    router.push(`/explorer/atom-maze?id=${maze.id}`),
            }));
        }
        if (game === "mythbuster") {
            return GAME_MODES.map((mode, i) => ({
                key: mode.id,
                title: mode.title,
                color: mode.color,
                icon: mode.icon,
                delay: 50 + i * 50,
                onPress: () => router.push(`/mythbuster?mode=${mode.id}`),
            }));
        }
        return [
            {
                key: "dose-visualizer",
                title: "Dose Visualizer",
                color: "#00D9FF",
                icon: "Chart",
                delay: 50,
                onPress: () =>
                    router.push("/lab?exp=dose-visualizer"),
            },
            {
                key: "energy-showdown",
                title: "Energy Showdown",
                color: "#06FFA5",
                icon: "Flash",
                delay: 100,
                onPress: () =>
                    router.push("/lab?exp=energy-showdown"),
            },
        ];
    }, [game, router]);

    const cardH = Math.round(stackH / Math.max(items.length, 1));

    return (
        <View style={[styles.panel, { backgroundColor: tab.bg }]}>
            <View
                style={[
                    styles.stack,
                    { paddingBottom: insets.bottom + TAB_CLEAR },
                ]}
            >
                {items.map((item) => (
                    <StackCard
                        key={item.key}
                        title={item.title}
                        color={item.color}
                        icon={item.icon}
                        delay={item.delay}
                        height={cardH}
                        onPress={item.onPress}
                    />
                ))}
            </View>
        </View>
    );
}

export default DifficultyPanel;

const styles = StyleSheet.create({
    panel: {
        flex: 1,
    },
    stack: {
        flex: 1,
        marginHorizontal: -14,
    },
});