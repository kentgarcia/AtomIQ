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
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Image, Pressable, View } from "react-native";
import Animated, {
    LinearTransition,
    useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar/Avatar";
import { HeaderStat } from "@/components/layout/HeaderStat";
import { Icon } from "@/components/ui/icon";
import { measureViewRect, registerLockHit } from "@/components/tutorial/lock-hits";
import type { ViewRef } from "@/components/tutorial/use-tutorial-target";
import { LockedDialog } from "@/components/ui/locked-dialog";
import { Text } from "@/components/ui/text";
import { useCompletedLessonCount } from "@/hooks/use-completed-lessons";
import { useTabLocks } from "@/hooks/use-tutorial";
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
    // The avatar opens the Profile tab, which Shrodi's tour keeps locked at first
    const locks = useTabLocks();
    const profileLocked = locks.isLocked("profile");
    const [lockOpen, setLockOpen] = useState(false);
    // While the tour's dim is up the avatar still answers a press with its dialog (`lock-hits.ts`)
    const avatarRef = useRef<ViewRef>(null);
    const instance = useId();
    const profileLockedRef = useRef(profileLocked);
    profileLockedRef.current = profileLocked;
    useEffect(
        () =>
            registerLockHit(`header:profile:${instance}`, {
                rect: () => measureViewRect(avatarRef.current),
                open: () => setLockOpen(true),
                active: () => profileLockedRef.current,
            }),
        [instance],
    );

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
                            ref={avatarRef}
                            collapsable={false}
                            style={styles.avatarWrap}
                            accessibilityRole="button"
                            accessibilityLabel={profileLocked ? "Profile, locked" : "Open profile"}
                            hitSlop={6}
                            onPress={() => (profileLocked ? setLockOpen(true) : router.navigate("/(tabs)/profile"))}
                        >
                            <View style={profileLocked ? styles.avatarLocked : undefined}>
                                <Avatar value={userProfile?.avatar_url} size={40} />
                            </View>
                            {profileLocked ? (
                                <View pointerEvents="none" style={styles.lockBadge}>
                                    <Icon name="Lock" size={11} color={c.textMuted} variant="Bold" />
                                </View>
                            ) : null}
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
                                    <HeaderStat
                                        key={stat.key}
                                        kind={stat.key === "lessons" ? "lessons" : "diamonds"}
                                        amount={stat.value}
                                        style={styles.statItem}
                                        accessibilityLabel={`${stat.value.toLocaleString()} ${stat.label}`}
                                    >
                                        {content}
                                    </HeaderStat>
                                );
                            })}
                        </View>
                    </View>
                    {children}
                </Animated.View>
            </View>
            <LockedDialog visible={lockOpen} title="Profile" text={locks.hint} onClose={() => setLockOpen(false)} />
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
        avatarLocked: { opacity: 0.45 },
        lockBadge: {
            position: "absolute",
            right: -4,
            bottom: -4,
            width: 18,
            height: 18,
            borderRadius: 9,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.border,
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
