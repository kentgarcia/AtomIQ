/**
 * TopRowHeader — the shared top row of the tab screens, justified edge to edge:
 * the learner's avatar at the left edge and one row of stats (streak, lessons,
 * diamonds) at the right edge, each an icon and a number in the icon's colour,
 * with no container.
 *
 * It owns the safe-area top padding and the readable-width frame, so a screen
 * just renders it as the first block of the screen. `children` render
 * directly under the row (Home uses this for its daily panels).
 */

import { useRouter } from "expo-router";
import { useMemo, type ReactNode } from "react";
import { Image, Pressable, View } from "react-native";
import Animated, {
    LinearTransition,
    useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar/Avatar";
import { Text } from "@/components/ui/text";
import { useCompletedLessonCount } from "@/hooks/use-completed-lessons";
import { useDiamonds } from "@/hooks/use-wallet";
import { useStorage } from "@/services/StorageContext";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";
import { DURATION, EASE_OUT } from "@/theme/motion";

const FIRE_ICON = require("@/assets/images/icons/fire.png");
const MEDAL_ICON = require("@/assets/images/icons/medal.png");
const DIAMOND_ICON = require("@/assets/images/icons/diamond.png");

/** Space the block takes below the safe-area inset (top pad + avatar + bottom pad). */
export const TOP_ROW_HEADER_HEIGHT = 12 + 46 + 8;

export function TopRowHeader({
    children,
}: {
    children?: ReactNode;
}) {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const { userProfile } = useStorage();
    const { contentMaxWidth } = useResponsiveLayout();
    const completedLessons = useCompletedLessonCount();
    const reducedMotion = useReducedMotion();
    const router = useRouter();
    const styles = useMemo(() => makeStyles(theme), [theme]);

    // Currency: earned from quest chests (services/wallet.ts)
    const diamonds = useDiamonds();

    const c = theme.colors;
    const stats = [
        { key: "streak", icon: FIRE_ICON, value: userProfile?.current_streak || 0, label: "day streak", color: c.error },
        { key: "lessons", icon: MEDAL_ICON, value: completedLessons, label: "lessons completed", color: c.primaryLight },
        { key: "diamonds", icon: DIAMOND_ICON, value: diamonds, label: "diamonds", color: c.info },
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
                            <Avatar value={userProfile?.avatar_url} size={40} />
                        </Pressable>
                        <View style={styles.statsRow}>
                            {stats.map((stat) => {
                                const content = (
                                    <>
                                        <Image source={stat.icon} style={styles.statIcon} resizeMode="contain" />
                                        <Text style={[styles.statText, { color: stat.color }]}>{stat.value.toLocaleString()}</Text>
                                    </>
                                );
                                // The streak stat opens the daily streak screen
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
            paddingHorizontal: 24,
            paddingBottom: 8,
            zIndex: 100,
        },
        bar: {
            gap: 12,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
        },
        avatarWrap: {
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: c.surfaceSoft,
            borderWidth: 2,
            borderColor: c.border,
            borderBottomWidth: 4,
            alignItems: "center",
            justifyContent: "center",
        },
        /* Spaced out, right-aligned by the row's space-between */
        statsRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 32,
        },
        /* No container: the icon and its number sit directly on the page, in the icon's colour */
        statItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            height: 36,
        },
        statIcon: {
            width: 24,
            height: 24,
        },
        statText: {
            fontSize: 20,
            ...fontFaces.heavy,
            fontVariant: ["tabular-nums"],
        },
    };
});
