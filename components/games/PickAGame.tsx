/**
 * Games — "Pick a Game" springy picker (replaces the Awards page).
 *
 * Fixed light surface. Cards link to AtomIQ's actual games: the Atom
 * Maze, unit quizzes, the Lab, and Myth Buster.
 */

import { DifficultyPanel } from "@/components/games/DifficultyPanel";
import { StackCard } from "@/components/games/StackCard";
import { Icon } from "@/components/ui/icon";
import { fontFamilies, useTheme } from "@/theme";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const HEADER_H = 200;
const TAB_CLEAR = 110;

const GAMES = [
    {
        title: "Myth Buster",
        color: "#b984ff",
        delay: 50,
        icon: "Judge",
        route: "/mythbuster" as const,
    },
    {
        title: "Atom Maze",
        color: "#1ee2e6",
        delay: 100,
        icon: "Grid9",
        route: "/atom-maze" as const,
    },
    {
        title: "Lab Experiment",
        color: "#90ea6c",
        delay: 150,
        icon: "Microscope",
        route: "/lab" as const,
    },
    {
        title: "Encyclopedia",
        color: "#ff4d28",
        delay: 200,
        icon: "Book1",
        route: "/encyclopedia" as const,
    },
];

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

const QuestionMark = ({ color }: { color: string }) => (
    <Svg width={44} height={44} viewBox="0 0 24 24">
        <Path
            d="M9.2 8.3C9.2 6.4 10.5 5 12.4 5C14.3 5 15.6 6.4 15.6 8.3C15.6 9.8 14.8 10.8 13.4 11.5C12.4 12 12 12.6 12 13.6V14.2"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
        />
        <Path
            d="M12 18.4h.01"
            stroke={color}
            strokeWidth={3.2}
            strokeLinecap="round"
        />
    </Svg>
);

const RightArrow = ({ color = "#C7CBD4" }: { color?: string }) => (
    <Svg width={60} height={18} viewBox="0 0 60 18">
        <Path
            d="M2 9H54M54 9L44 2M54 9L44 16"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export function PickAGame() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { height: windowHeight, width: windowWidth } = useWindowDimensions();
    const { theme, isDark } = useTheme();
    const tab = theme.palettes.tab;
    const P = isDark
        ? { card: "#213356", border: "#2D3A56", softBorder: "#26365A", soft: "#1A2D4A", creamTint: "#4A381B", text: "#F6F9FC", textSecondary: "#C0CBDD", muted: "#8898AA", faint: "#667799" }
        : { card: "#FFFFFF", border: "#E5E7EB", softBorder: "#F4F5F7", soft: "#F9FAFB", creamTint: "#FFF3E0", text: "#333333", textSecondary: "#555555", muted: "#888888", faint: "#9CA3AF" };
    const styles = React.useMemo(() => createStyles(P), [P]);

    // Autumn gradient background, matching home / profile / discovery
    const SKY: [string, string] = isDark
        ? [tab.bg, tab.bg]
        : ["#FFF3E0", "#FFFFFF"];

    // Stack area sits below the header and above the floating tab bar
    const stackH = Math.round(
        windowHeight - insets.top - 18 - HEADER_H - insets.bottom - TAB_CLEAR,
    );
    const cardH = Math.round(stackH / GAMES.length);

    // Games with difficulty selection stay on this page: the picker slides
    // out and the difficulty panel slides in (and back again).
    const [activeGame, setActiveGame] = useState<"atom-maze" | "mythbuster" | "lab" | null>(null);
    const SLIDE = { duration: 320, easing: Easing.inOut(Easing.cubic) };

    const gamesX = useSharedValue(0);
    const diffX = useSharedValue(windowWidth);
    const gamesSlide = useAnimatedStyle(() => ({
        transform: [{ translateX: gamesX.value }],
    }));
    const diffSlide = useAnimatedStyle(() => ({
        transform: [{ translateX: diffX.value }],
    }));

    const openDifficulty = (game: "atom-maze" | "mythbuster" | "lab") => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setActiveGame(game);
        gamesX.value = withTiming(-windowWidth, SLIDE);
        diffX.value = withTiming(0, SLIDE);
    };

    const closeDifficulty = () => {
        if (activeGame === null) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        diffX.value = withTiming(windowWidth, SLIDE, (finished) => {
            if (finished) {
                runOnJS(setActiveGame)(null);
            }
        });
        gamesX.value = withTiming(0, SLIDE);
    };

    // Header arrow: nudges while picking, rotates 180° and darkens to
    // become the active back button while a difficulty panel is open.
    const flip = useSharedValue(0);
    useEffect(() => {
        flip.value = withSpring(activeGame === null ? 0 : 1, {
            damping: 20,
            stiffness: 220,
        });
    }, [activeGame, flip]);

    const arrowIdleStyle = useAnimatedStyle(() => ({
        opacity: 1 - flip.value,
    }));
    const arrowBackStyle = useAnimatedStyle(() => ({
        opacity: flip.value,
        transform: [{ rotate: `${flip.value * 180}deg` }],
    }));

    const arrowX = useSharedValue(0);
    useEffect(() => {
        arrowX.value = withRepeat(
            withSpring(12, { damping: 16, stiffness: 200 }),
            -1,
            true,
        );
    }, [arrowX]);

    const arrowStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: arrowX.value }],
    }));

    const handleSelect = (game: (typeof GAMES)[number]) => {
        if (
            game.route === "/atom-maze" ||
            game.route === "/mythbuster" ||
            game.route === "/lab"
        ) {
            openDifficulty(game.route.slice(1) as "atom-maze" | "mythbuster" | "lab");
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push(game.route);
    };

    const [guideVisible, setGuideVisible] = useState(false);
    const openGuide = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setGuideVisible(true);
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
            desc: "Tap the header arrow to return to the games list.",
        },
    ];

    return (
        <View style={[styles.screen, { paddingTop: insets.top + 18, backgroundColor: SKY[0] }]}>
            {/* Autumn gradient flowing through the whole page */}
            <LinearGradient
                colors={SKY}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            />

            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    onPress={openGuide}
                    style={({ pressed }) => [
                        styles.logoContainer,
                        pressed && styles.logoPressed,
                    ]}
                >
                    <QuestionMark color="#E67E22" />
                </Pressable>

                <View style={styles.titleGroup}>
                    <Text style={[styles.titlePick, { color: tab.text }]}>Pick</Text>
                    <View style={styles.titleBottomRow}>
                        <Text style={[styles.titleA, { color: tab.text }]}>a</Text>
                        <Text style={[styles.titleGame, { color: "#FF8C00" }]}>Game</Text>
                    </View>
                    <Pressable onPress={closeDifficulty} hitSlop={12}>
                        <Animated.View
                            style={[styles.arrow, activeGame === null ? arrowStyle : null]}
                        >
                            <Animated.View style={[styles.arrowAbs, arrowIdleStyle]}>
                                <RightArrow color={tab.textMuted} />
                            </Animated.View>
                            <Animated.View style={[styles.arrowAbs, arrowBackStyle]}>
                                <RightArrow color={tab.text} />
                            </Animated.View>
                        </Animated.View>
                    </Pressable>
                </View>
            </View>

            {/* Sliding layers — picker vs difficulty panel. Both transparent;
                the base gradient covers the full screen behind them. */}
            <View style={styles.stage}>
                <Animated.View
                    style={[styles.layer, gamesSlide]}
                    pointerEvents={activeGame === null ? "auto" : "none"}
                >
                    {/* Full-bleed slanted card stack */}
                    <View style={[styles.cardsList, { paddingBottom: insets.bottom + TAB_CLEAR }]}>
                        {GAMES.map((game) => (
                            <StackCard
                                key={game.title}
                                title={game.title}
                                color={game.color}
                                icon={game.icon}
                                delay={game.delay}
                                height={cardH}
                                onPress={() => handleSelect(game)}
                            />
                        ))}
                    </View>
                </Animated.View>

                {activeGame !== null && (
                    <Animated.View style={[styles.layer, diffSlide]}>
                        <DifficultyPanel game={activeGame} />
                    </Animated.View>
                )}
            </View>

            {/* How to Play guide */}
            <Modal
                visible={guideVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setGuideVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.dragHandle} />

                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <View style={styles.modalHeaderIcon}>
                                    <Icon name="MessageQuestion" size={16} color="#FF8C00" variant="Bold" />
                                </View>
                                <Text style={styles.modalTitle}>How to Play</Text>
                            </View>
                            <Pressable
                                onPress={() => setGuideVisible(false)}
                                style={({ pressed }) => [styles.modalCloseBtn, pressed && { opacity: 0.8 }]}
                            >
                                <Icon
                                    name="CloseCircle"
                                    size={20}
                                    color={isDark ? "#667799" : "#9CA3AF"}
                                    variant="Bold"
                                />
                            </Pressable>
                        </View>

                        {GUIDE_ROWS.map((row) => (
                            <View key={row.title} style={styles.guideRow}>
                                <View style={styles.guideRowIcon}>
                                    <Icon
                                        name={row.icon}
                                        size={20}
                                        color="#FF8C00"
                                        variant="Bold"
                                    />
                                </View>
                                <View style={styles.guideRowText}>
                                    <Text style={styles.guideRowTitle}>
                                        {row.title}
                                    </Text>
                                    <Text style={styles.guideRowDesc}>
                                        {row.desc}
                                    </Text>
                                </View>
                            </View>
                        ))}

                        <Pressable
                            style={({ pressed }) => [
                                styles.guideActionBtn,
                                pressed && { transform: [{ scale: 0.97 }], opacity: 0.96 },
                            ]}
                            onPress={() => setGuideVisible(false)}
                        >
                            <Icon name="TickCircle" size={18} color="#FFFFFF" variant="Bold" />
                            <Text style={styles.guideActionText}>Got it</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (P: { card: string; border: string; softBorder: string; soft: string; creamTint: string; text: string; textSecondary: string; muted: string; faint: string }) =>
  StyleSheet.create({
    screen: {
        flex: 1,
    },
    header: {
        height: 200,
        paddingHorizontal: 24,
        paddingBottom: 15,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    logoContainer: {
        marginTop: 15,
    },
    logoPressed: {
        transform: [{ scale: 0.8 }, { rotate: "-10deg" }],
    },
    titleGroup: {
        alignItems: "flex-end",
        paddingTop: 5,
        lineHeight: 0,
    },
    titlePick: {
        fontSize: 84,
        fontFamily: fontFamilies.heavy,
        letterSpacing: -4,
        lineHeight: 78,
    },
    titleBottomRow: {
        flexDirection: "row",
        alignItems: "baseline",
    },
    titleGame: {
        fontSize: 84,
        fontFamily: fontFamilies.heavy,
        letterSpacing: -4,
        lineHeight: 78,
    },
    titleA: {
        fontSize: 34,
        fontFamily: fontFamilies.heavy,
        letterSpacing: -1.5,
        marginLeft: 4,
    },
    arrow: {
        marginTop: 8,
        width: 60,
        height: 18,
        position: "relative",
    },
    arrowAbs: {
        ...StyleSheet.absoluteFillObject,
    },
    stage: {
        flex: 1,
    },
    layer: {
        ...StyleSheet.absoluteFillObject,
    },
    cardsList: {
        flex: 1,
        marginHorizontal: -14,
    },
    /* Guide modal — profile edit-modal design */
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        borderRadius: 26,
        width: "100%",
        maxWidth: 380,
        maxHeight: "82%",
        padding: 16,
        paddingTop: 12,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderColor: P.border,
        backgroundColor: P.card,
        elevation: 10,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
    },
    dragHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: P.softBorder,
        alignSelf: "center",
        marginBottom: 8,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
        gap: 12,
    },
    modalHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    modalHeaderIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: P.creamTint,
        alignItems: "center",
        justifyContent: "center",
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: fontFamilies.heavy,
        color: P.text,
    },
    modalCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: P.soft,
        borderWidth: 1,
        borderColor: P.border,
    },
    guideRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: P.soft,
        borderWidth: 1,
        borderColor: P.softBorder,
    },
    guideRowIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        backgroundColor: P.creamTint,
    },
    guideRowText: {
        flex: 1,
    },
    guideRowTitle: {
        fontSize: 14,
        fontFamily: fontFamilies.heavy,
        color: P.text,
        marginBottom: 2,
    },
    guideRowDesc: {
        fontSize: 13,
        fontFamily: fontFamilies.semibold,
        color: P.muted,
        lineHeight: 18,
    },
    guideActionBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginTop: 6,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderBottomWidth: 4,
        borderColor: "#E67E22",
        backgroundColor: "#FF8C00",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
    guideActionText: {
        fontSize: 15,
        fontFamily: fontFamilies.heavy,
        color: "#FFFFFF",
    },
});

export default PickAGame;