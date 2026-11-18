/**
 * Games — "Pick a Game" springy picker (replaces the Awards page).
 *
 * Sits on the same page background as the Home map (`mapBackground`): the standard `ScreenHeader` sits on top
 * (a back arrow while a difficulty panel is open), the game cards keep their own surface. Cards link to AtomIQ's actual games: the Atom
 * Maze, unit quizzes, the Lab, and Myth Buster.
 */

import { DifficultyPanel } from "@/components/games/DifficultyPanel";
import { StackCard } from "@/components/games/StackCard";
import { HeaderButton, ScreenHeader, useTabBarInset } from "@/components/layout";
import { useModalOrigin } from "@/components/ui/grow-modal";
import { ModalButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Icon } from "@/components/ui/icon";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";
import { impactLight, impactMedium } from "@/services/haptics";
import React, { useState } from "react";
import {
    useWindowDimensions,
    View,
} from "react-native";
import { Text } from "@/components/ui/text";
import Animated, {
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    type SharedValue,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DURATION, EASE_DRAWER } from "@/theme/motion";

/** Height of `ScreenHeader` below the status-bar inset (12 top + 50 row + 8 bottom + 2 border); only the first-frame estimate. */
const HEADER_BELOW_INSET = 72;

type DifficultyGame = "atom-maze" | "mythbuster" | "lab";

/** Picker ⇄ difficulty panel (docs/CONTINUITY_SPEC.md, C3). */
const EXPAND = { duration: DURATION.expand - 50, easing: EASE_DRAWER };

/**
 * One picker card. While the picker turns into a difficulty panel, the other
 * cards fade out first and the tapped card hands over to the panel that grows
 * out of its slot. `t` is 0 at the picker and 1 at the panel.
 */
function GameSlot({
    index,
    t,
    selected,
    reducedMotion,
    children,
}: {
    index: number;
    t: SharedValue<number>;
    selected: SharedValue<number>;
    reducedMotion: boolean;
    children: React.ReactNode;
}) {
    const style = useAnimatedStyle(() => {
        if (reducedMotion) return { opacity: 1 - t.value };
        const isTapped = selected.value === index;
        return {
            opacity: isTapped
                ? interpolate(t.value, [0, 0.25, 0.55], [1, 1, 0], Extrapolation.CLAMP)
                : interpolate(t.value, [0, 0.3], [1, 0], Extrapolation.CLAMP),
        };
    });
    return <Animated.View style={style}>{children}</Animated.View>;
}

const GAMES = [
    {
        title: "Myth Buster",
        subtitle: "Fact or myth? Swipe to bust it",
        color: "#A66CFF",
        delay: 50,
        icon: "Judge",
        route: "/mythbuster" as const,
    },
    {
        title: "Atom Maze",
        subtitle: "Find your way through the atom",
        color: "#1CB0F6",
        delay: 100,
        icon: "Grid9",
        route: "/explorer/atom-maze" as const,
    },
    {
        title: "Lab Experiment",
        subtitle: "Build, shield and decay for real",
        color: "#58CC02",
        delay: 150,
        icon: "Microscope",
        route: "/lab" as const,
    },
];

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export function PickAGame() {
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const { contentMaxWidth } = useResponsiveLayout();
    const tabBarInset = useTabBarInset();
    const { theme } = useTheme();
    const c = theme.colors;
    const styles = React.useMemo(() => makeStyles(theme), [theme]);


    // Stack area sits below the header and above the docked tab bar
    const bottomReserve = tabBarInset + 16;

    // Games with difficulty selection stay on this page: the difficulty stack
    // grows out of the tapped card's slot (and folds back into it). `activeGame`
    // is the logical state; `panelGame` stays mounted until the close finishes,
    // so a new tap mid-animation simply takes over from where it is.
    const reducedMotion = useReducedMotion();
    const [activeGame, setActiveGame] = useState<DifficultyGame | null>(null);
    const [panelGame, setPanelGame] = useState<DifficultyGame | null>(null);
    const [stageH, setStageH] = useState(0);
    // The stage fills the space under the header; measured once laid out, estimated for the first frame.
    const stackH = Math.round(
        (stageH > 0 ? stageH : windowHeight - insets.top - HEADER_BELOW_INSET) - bottomReserve,
    );
    const cardH = Math.max(0, Math.round(stackH / GAMES.length));
    const t = useSharedValue(0);
    const selected = useSharedValue(-1);
    const timing = reducedMotion ? { duration: 150 } : EXPAND;

    const clearPanel = () => setPanelGame(null);

    const panelStyle = useAnimatedStyle(() => {
        if (reducedMotion || stageH === 0) return { opacity: t.value };
        const startScale = cardH / stageH;
        const startY = selected.value * cardH + cardH / 2 - stageH / 2;
        return {
            opacity: interpolate(t.value, [0, 0.2, 0.55], [0, 0, 1], Extrapolation.CLAMP),
            transform: [
                { translateY: startY * (1 - t.value) },
                { scaleY: startScale + (1 - startScale) * t.value },
            ],
        };
    });

    const openDifficulty = (game: DifficultyGame, index: number) => {
        impactMedium();
        selected.value = index;
        setActiveGame(game);
        setPanelGame(game);
        t.value = withTiming(1, timing);
    };

    const closeDifficulty = () => {
        if (activeGame === null) return;
        impactLight();
        setActiveGame(null);
        t.value = withTiming(0, timing, (finished) => {
            if (finished) runOnJS(clearPanel)();
        });
    };

    // Every game opens the difficulty picker first.
    const handleSelect = (game: (typeof GAMES)[number], index: number) => {
        openDifficulty(
            game.route === "/explorer/atom-maze"
                ? "atom-maze"
                : (game.route.slice(1) as "mythbuster" | "lab"),
            index,
        );
    };

    const activeGameTitle =
        activeGame === null
            ? null
            : GAMES.find((g) => g.route.endsWith(activeGame === "atom-maze" ? "atom-maze" : activeGame))?.title ?? null;

    const [guideVisible, setGuideVisible] = useState(false);
    const { anchor: guideAnchor, origin: guideOrigin, capture: guideCapture } = useModalOrigin();
    const openGuide = () => {
        impactLight();
        guideCapture(() => setGuideVisible(true));
    };

    const GUIDE_ROWS = [
        {
            icon: "Game",
            title: "Pick a Game",
            desc: "Tap a card to choose — games with levels open their options right here.",
        },
        {
            icon: "Layer",
            title: "Choose Your Level",
            desc: "Tap a difficulty card to start playing.",
        },
        {
            icon: "ArrowLeft2",
            title: "Back",
            desc: "Tap the back arrow in the header to return to the games list.",
        },
    ];

    return (
        <View style={[styles.screen, { backgroundColor: c.mapBackground }]}>
            <ScreenHeader
                title={activeGameTitle ?? "Games"}
                subtitle={activeGameTitle ? "Choose a level" : undefined}
                onBack={activeGame !== null ? closeDifficulty : undefined}
                backLabel="Back to games"
                right={
                    <View ref={guideAnchor} collapsable={false}>
                        <HeaderButton icon="MessageQuestion" label="How to play" onPress={openGuide} />
                    </View>
                }
            />

            {/* Sliding layers — picker vs difficulty panel. Both transparent;
                the blue screen background shows behind them. */}
            <View
                style={[
                    styles.stage,
                    { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" },
                ]}
                onLayout={(e) => setStageH(e.nativeEvent.layout.height)}
            >
                <View
                    style={styles.layer}
                    pointerEvents={activeGame === null ? "auto" : "none"}
                >
                    {/* Game cards */}
                    <View style={[styles.cardsList, { paddingBottom: bottomReserve }]}>
                        {GAMES.map((game, index) => (
                            <GameSlot
                                key={game.title}
                                index={index}
                                t={t}
                                selected={selected}
                                reducedMotion={reducedMotion}
                            >
                                <StackCard
                                    title={game.title}
                                    subtitle={game.subtitle}
                                    color={game.color}
                                    icon={game.icon}
                                    delay={game.delay}
                                    height={cardH}
                                    onPress={() => handleSelect(game, index)}
                                />
                            </GameSlot>
                        ))}
                    </View>
                </View>

                {panelGame !== null && (
                    <Animated.View
                        style={[styles.layer, panelStyle]}
                        pointerEvents={activeGame !== null ? "auto" : "none"}
                    >
                        <DifficultyPanel game={panelGame} stackHeight={stackH} />
                    </Animated.View>
                )}
            </View>

            {/* How to Play guide */}
            <ModalDialog
                visible={guideVisible}
                origin={guideOrigin}
                onClose={() => setGuideVisible(false)}
                title="How to Play"
                closeLabel="Close how to play"
                footer={<ModalButton label="Got it" onPress={() => setGuideVisible(false)} />}
            >
                {GUIDE_ROWS.map((row) => (
                    <View key={row.title} style={styles.guideRow}>
                        <View style={styles.guideRowIcon}>
                            <Icon name={row.icon} size={20} color={theme.colors.primaryLight} variant="Bold" />
                        </View>
                        <View style={styles.guideRowText}>
                            <Text style={styles.guideRowTitle}>{row.title}</Text>
                            <Text style={styles.guideRowDesc}>{row.desc}</Text>
                        </View>
                    </View>
                ))}
            </ModalDialog>
        </View>
    );
}

const makeStyles = createStyles((theme) => {
  const ui = theme.palettes.ui;
  return {
    screen: {
        flex: 1,
    },
    stage: {
        flex: 1,
    },
    layer: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    },
    cardsList: {
        flex: 1,
    },
    /* How to Play (ModalDialog contents) */
    guideRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: ui.soft,
        borderWidth: 1,
        borderColor: ui.softBorder,
    },
    guideRowIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        backgroundColor: ui.soft,
    },
    guideRowText: {
        flex: 1,
    },
    guideRowTitle: {
        fontSize: 14,
        ...fontFaces.heavy,
        color: ui.text,
        marginBottom: 2,
    },
    guideRowDesc: {
        fontSize: 13,
        ...fontFaces.semibold,
        color: ui.muted,
        lineHeight: 18,
    },
  };
});

export default PickAGame;