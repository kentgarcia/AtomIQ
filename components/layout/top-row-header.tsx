/**
 * TopRowHeader — the shared top row of the tab screens: the learner's avatar
 * on the left and flat stat pills (streak, lessons, XP, diamonds) on the right.
 *
 * It owns the safe-area top padding and the readable-width frame, so a screen
 * just renders it as the first block under `PageBackground`. `children` render
 * directly under the row (Home uses this for its daily panels).
 */

import { useRouter } from "expo-router";
import { useMemo, type ReactNode } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated, {
    LinearTransition,
    useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCompletedLessonCount } from "@/hooks/use-completed-lessons";
import { getProfileAvatarSource } from "@/services/profile-avatars";
import { useStorage } from "@/services/StorageContext";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";
import { DURATION, EASE_OUT } from "@/theme/motion";

const FIRE_ICON = require("@/assets/images/icons/fire.png");
const MEDAL_ICON = require("@/assets/images/icons/medal.png");
const XP_ICON = require("@/assets/images/icons/xp.png");
const DIAMOND_ICON = require("@/assets/images/icons/diamond.png");
const MISSION_ICON = require("@/assets/images/icons/mission.png");

/** Space the block takes below the safe-area inset (top pad + avatar + bottom pad). */
export const TOP_ROW_HEADER_HEIGHT = 12 + 46 + 8;

export function TopRowHeader({
    children,
    onMissionsPress,
}: {
    children?: ReactNode;
    /**
     * Called when the daily-missions button is pressed. Screens that host the
     * missions panel (Home) pass this; elsewhere the button opens Home with
     * the panel expanded.
     */
    onMissionsPress?: () => void;
}) {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const { userProfile } = useStorage();
    const { contentMaxWidth } = useResponsiveLayout();
    const completedLessons = useCompletedLessonCount();
    const reducedMotion = useReducedMotion();
    const router = useRouter();
    const styles = useMemo(() => makeStyles(theme), [theme]);

    // Currency — no balance is stored yet, so this reads 0 until diamonds are wired up
    const diamonds = 0;

    const stats = [
        { key: "streak", icon: FIRE_ICON, value: userProfile?.current_streak || 0, label: "day streak" },
        { key: "lessons", icon: MEDAL_ICON, value: completedLessons, label: "lessons completed" },
        { key: "xp", icon: XP_ICON, value: userProfile?.total_xp || 0, label: "XP" },
        { key: "diamonds", icon: DIAMOND_ICON, value: diamonds, label: "diamonds" },
    ];

    return (
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <View
                style={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }}
            >
                <Animated.View
                    layout={
                        reducedMotion
                            ? undefined
                            : LinearTransition.duration(DURATION.medium).easing(EASE_OUT)
                    }
                    style={styles.bar}
                >
                    <View style={styles.row}>
                        <Pressable
                            style={styles.avatarWrap}
                            accessibilityRole="button"
                            accessibilityLabel="Open profile"
                            hitSlop={6}
                            onPress={() => router.navigate("/(tabs)/profile")}
                        >
                            <Image
                                source={getProfileAvatarSource(userProfile?.avatar_url)}
                                style={styles.avatar}
                                resizeMode="cover"
                            />
                        </Pressable>
                        <Pressable
                            style={styles.missionBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Daily missions"
                            hitSlop={8}
                            onPress={
                                onMissionsPress ??
                                (() =>
                                    router.navigate({
                                        pathname: "/(tabs)",
                                        params: { panel: "missions" },
                                    }))
                            }
                        >
                            <Image source={MISSION_ICON} style={styles.missionIcon} resizeMode="contain" />
                        </Pressable>
                        <View style={{ flex: 1 }} />
                        <View style={styles.statsRow}>
                            {stats.map((stat) => {
                                const content = (
                                    <>
                                        <Image source={stat.icon} style={styles.statIcon} resizeMode="contain" />
                                        <Text style={styles.statText}>{stat.value.toLocaleString()}</Text>
                                    </>
                                );
                                // The streak pill opens the daily streak screen
                                return stat.key === "streak" ? (
                                    <Pressable
                                        key={stat.key}
                                        style={styles.statItem}
                                        accessibilityRole="button"
                                        accessibilityLabel={`${stat.value.toLocaleString()} ${stat.label}. Open streak`}
                                        hitSlop={8}
                                        onPress={() => router.push("/daily-streak")}
                                    >
                                        {content}
                                    </Pressable>
                                ) : (
                                    <View
                                        key={stat.key}
                                        style={styles.statItem}
                                        accessible
                                        accessibilityLabel={`${stat.value.toLocaleString()} ${stat.label}`}
                                    >
                                        {content}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                    {children}
                </Animated.View>
            </View>
        </View>
    );
}

const makeStyles = createStyles((theme) => {
    const c = theme.colors;
    return {
        /* zIndex keeps panels that open under the row above the content below */
        header: {
            paddingHorizontal: 16,
            paddingBottom: 8,
            zIndex: 100,
        },
        bar: {
            gap: 12,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
        },
        avatarWrap: {
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: c.card,
            borderWidth: 2,
            borderColor: c.card,
            borderBottomWidth: 4,
        },
        avatar: {
            width: "100%",
            height: "100%",
            borderRadius: 23,
        },
        missionBtn: {
            alignItems: "center",
            justifyContent: "center",
        },
        missionIcon: {
            width: 30,
            height: 30,
        },
        statsRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        /* Flat, fully rounded pill — no border lip or elevation */
        statItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            height: 32,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: c.card,
        },
        statIcon: {
            width: 18,
            height: 18,
        },
        statText: {
            fontSize: 13,
            ...fontFaces.heavy,
            color: c.text,
            fontVariant: ["tabular-nums"],
        },
    };
});
