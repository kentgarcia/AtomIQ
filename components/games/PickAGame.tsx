/**
 * Games — "Pick a Game" springy picker (replaces the Awards page).
 *
 * Sits on the same page background as the Home map (`mapBackground`): the standard `ScreenHeader` sits on top
 * (a back arrow while a difficulty panel is open), the game cards keep their own surface. Cards link to AtomIQ's actual games: the Atom
 * Maze, unit quizzes, the Lab, and Myth Buster.
 */

import { DifficultyPanel } from "@/components/games/DifficultyPanel";
import { GAME_GUIDES, guideById, initialGuide, type GuideId } from "@/components/games/game-instructions";
import { StackCard } from "@/components/games/StackCard";
import { HeaderButton, ScreenHeader, useTabBarInset } from "@/components/layout";
import { useModalOrigin } from "@/components/ui/grow-modal";
import { ModalButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Icon } from "@/components/ui/icon";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";
import { impactLight, impactMedium } from "@/services/haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Pressable,
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
    const router = useRouter();
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
        // Atom Maze is story mode now: its level map opens instead of a difficulty picker
        if (game.route === "/explorer/atom-maze") {
            impactLight();
            router.push("/explorer/story");
            return;
        }
        openDifficulty(game.route.slice(1) as "mythbuster" | "lab", index);
    };

    const activeGameTitle =
        activeGame === null
            ? null
            : GAMES.find((g) => g.route.endsWith(activeGame === "atom-maze" ? "atom-maze" : activeGame))?.title ?? null;

    // The instructions: they open on the game whose levels are showing (or the overview) and can switch to another game's
    const [guideVisible, setGuideVisible] = useState(false);
    const [guideId, setGuideId] = useState<GuideId>("overview");
    const { anchor: guideAnchor, origin: guideOrigin, capture: guideCapture } = useModalOrigin();
    const openGuide = () => {
        impactLight();
        setGuideId(initialGuide(activeGame));
        guideCapture(() => setGuideVisible(true));
    };
    const guide = guideById(guideId);

    return (
        <View style={[styles.screen, { backgroundColor: c.mapBackground }]}>
            <ScreenHeader
                title={activeGameTitle ?? "Games"}
                subtitle={activeGameTitle ? "Choose a level" : undefined}
                onBack={activeGame !== null ? closeDifficulty : undefined}
                backLabel="Back to games"
                right={
                    <View ref={guideAnchor} collapsable={false}>
                        <HeaderButton icon="MessageQuestion" label="Instructions" onPress={openGuide} />
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

            {/* Instructions: pick which game's to read */}
            <ModalDialog
                visible={guideVisible}
                origin={guideOrigin}
                onClose={() => setGuideVisible(false)}
                title="Instructions"
                closeLabel="Close instructions"
                footer={<ModalButton label="Got it" onPress={() => setGuideVisible(false)} />}
            >
                <View style={styles.guideChips}>
                    {GAME_GUIDES.map((g) => {
                        const active = g.id === guideId;
                        return (
                            <Pressable
                                key={g.id}
                                onPress={() => {
                                    impactLight();
                                    setGuideId(g.id);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={`${g.label} instructions`}
                                accessibilityState={{ selected: active }}
                                style={({ pressed }) => [styles.guideChip, active && styles.guideChipActive, pressed && styles.guideChipPressed]}
                            >
                                <Icon name={g.icon} size={16} color={g.color} variant="Bold" />
                                <Text style={[styles.guideChipText, active && styles.guideChipTextActive]}>{g.label}</Text>
                            </Pressable>
                        );
                    })}
                </View>

                <Text style={styles.guideSummary}>{guide.summary}</Text>

                <View>
                    {guide.steps.map((step, i) => (
                        <View key={step.title} style={[styles.guideRow, i > 0 && styles.guideDivided]}>
                            <View style={[styles.guideRowIcon, { backgroundColor: withAlpha(guide.color, 0.14) }]}>
                                <Icon name={step.icon} size={20} color={guide.color} variant="Bold" />
                            </View>
                            <View style={styles.guideRowText}>
                                <Text style={styles.guideRowTitle}>{step.title}</Text>
                                <Text style={styles.guideRowDesc}>{step.hint}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ModalDialog>
        </View>
    );
}

const makeStyles = createStyles((theme) => {
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
    /* Instructions (ModalDialog contents) */
    guideChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    guideChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 34,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    guideChipActive: { backgroundColor: theme.colors.primarySurface, borderColor: theme.colors.primaryBorder },
    guideChipPressed: { opacity: 0.7 },
    guideChipText: { fontSize: 13, ...fontFaces.bold, color: theme.colors.textSecondary },
    guideChipTextActive: { color: theme.colors.text },
    guideSummary: { fontSize: 15, lineHeight: 22, ...fontFaces.semibold, color: theme.colors.textMuted },
    guideRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
    guideDivided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: theme.colors.border },
    guideRowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    guideRowText: { flex: 1, gap: 2 },
    guideRowTitle: { fontSize: 15, ...fontFaces.heavy, color: theme.colors.text },
    guideRowDesc: { fontSize: 13, lineHeight: 18, ...fontFaces.medium, color: theme.colors.textMuted },
  };
});

export default PickAGame;