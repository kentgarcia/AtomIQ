/**
 * DifficultyPanel — in-page selection for Atom Maze, Myth Buster and the
 * Lab. Renders the same card stack as the game
 * picker; slides in on the Games tab after the picker slides away.
 */

import { StackCard } from "@/components/games/StackCard";
import { useTabBarInset } from "@/components/layout";
import { getAllMazes } from "@/content/explorer";
import { GAME_MODES } from "@/constants/mythbuster-modes";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HEADER_H = 200;

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
    stackHeight,
}: {
    game: "atom-maze" | "mythbuster" | "lab";
    /** Height of the card stack (without the tab-bar clearance); the picker passes its own so both match. */
    stackHeight?: number;
}) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const tabBarInset = useTabBarInset();
    useTheme();

    // Mazes live in the SQLite content database and load async.
    const [mazes, setMazes] = useState<
        { id: string; title: string; theme?: string }[]
    >([]);
    useEffect(() => {
        let cancelled = false;
        void getAllMazes().then((all) => {
            if (!cancelled) setMazes(all);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    // Same stacking math as the game picker: stack fills the area below
    // the header and above the docked tab bar.
    const stackH =
        stackHeight ?? Math.round(windowHeight - insets.top - 18 - HEADER_H - tabBarInset - 16);

    const items = useMemo(() => {
        if (game === "mythbuster") {
            return GAME_MODES.map((mode, i) => ({
                key: mode.id,
                title: mode.title,
                subtitle: mode.description,
                color: mode.color,
                icon: mode.icon,
                delay: 50 + i * 50,
                onPress: () => router.push(`/mythbuster?mode=${mode.id}`),
            }));
        }
        if (game === "lab") {
            return [
                {
                    key: "radiation-shield",
                    title: "Radiation Shield Lab",
                    subtitle: "Pick the right shield for each source",
                    color: "#EA580C",
                    icon: "ShieldTick",
                    delay: 50,
                    onPress: () => router.push("/lab?exp=radiation-shield"),
                },
                {
                    key: "build-atom",
                    title: "Build an Atom",
                    subtitle: "Add protons, neutrons and electrons",
                    color: "#1CB0F6",
                    icon: "Atom",
                    delay: 100,
                    onPress: () => router.push("/lab?exp=build-atom"),
                },
                {
                    key: "decay-lab",
                    title: "Radioactive Decay Lab",
                    subtitle: "Watch half-lives play out",
                    color: "#58CC02",
                    icon: "Timer1",
                    delay: 150,
                    onPress: () => router.push("/lab?exp=decay-lab"),
                },
            ];
        }
        return [
            {
                key: "endless",
                title: "Endless Maze",
                subtitle: "Keep going as long as you can",
                color: "#7C3AED",
                icon: "Unlimited",
                delay: 50,
                onPress: () => router.push("/explorer/atom-maze?id=endless"),
            },
            ...mazes.map((maze, i) => ({
                key: maze.id,
                title: maze.title,
                subtitle: "Reach the exit to finish",
                color: getMazeColor(maze.theme),
                icon: "Grid9",
                delay: 100 + i * 50,
                onPress: () => router.push(`/explorer/atom-maze?id=${maze.id}`),
            })),
        ];
    }, [game, router, mazes]);

    const cardH = Math.round(stackH / Math.max(items.length, 1));

    return (
        /* Transparent so the wrapping layer's gradient shows through */
        <View style={styles.panel}>
            <View
                style={[
                    styles.stack,
                    { paddingBottom: tabBarInset + 16 },
                ]}
            >
                {items.map((item) => (
                    <StackCard
                        key={item.key}
                        title={item.title}
                        subtitle={item.subtitle}
                        color={item.color}
                        icon={item.icon}
                        delay={item.delay}
                        height={cardH}
                        onPress={item.onPress}
                        animateIn={false}
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
    },
});