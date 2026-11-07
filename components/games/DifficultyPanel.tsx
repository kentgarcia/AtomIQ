/**
 * DifficultyPanel — in-page selection for Atom Maze, Myth Buster and the
 * Lab. Renders the same full-bleed slanted stack design as the game
 * picker; slides in on the Games tab after the picker slides away.
 */

import { StackCard } from "@/components/games/StackCard";
import { getAllMazes } from "@/content/explorer";
import { GAME_MODES } from "@/constants/mythbuster-modes";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
    // the header and above the floating tab bar.
    const stackH = Math.round(
        windowHeight - insets.top - 18 - HEADER_H - insets.bottom - TAB_CLEAR,
    );

    const items = useMemo(() => {
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
        if (game === "lab") {
            return [
                {
                    key: "radiation-shield",
                    title: "Radiation Shield Lab",
                    color: "#FF8C00",
                    icon: "ShieldTick",
                    delay: 50,
                    onPress: () => router.push("/lab?exp=radiation-shield"),
                },
                {
                    key: "build-atom",
                    title: "Build an Atom",
                    color: "#1CB0F6",
                    icon: "Atom",
                    delay: 100,
                    onPress: () => router.push("/lab?exp=build-atom"),
                },
                {
                    key: "decay-lab",
                    title: "Radioactive Decay Lab",
                    color: "#2ECC71",
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
                color: "#7C3AED",
                icon: "Unlimited",
                delay: 50,
                onPress: () => router.push("/explorer/atom-maze?id=endless"),
            },
            ...mazes.map((maze, i) => ({
                key: maze.id,
                title: maze.title,
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