/**
 * DifficultyPanel — in-page selection for Myth Buster and the
 * Lab. Renders the same card stack as the game
 * picker; slides in on the Games tab after the picker slides away.
 */

import { StackCard } from "@/components/games/StackCard";
import { useTabBarInset } from "@/components/layout";
import { unitPalette, teacherPalette } from "@/components/path/unit-theme";
import { useUnitBrands } from "@/components/npc/use-unit-brands";
import { Icon } from "@/components/ui/icon";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Text } from "@/components/ui/text";
import { getUnitStatements } from "@/content/myths/unit-statements";
import type { Unit } from "@/content/curriculum/types";
import { contentRepository } from "@/services/content-db";
import { GAME_MODES } from "@/constants/mythbuster-modes";
import { createStyles, fontFaces, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HEADER_H = 200;

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function DifficultyPanel({
    game,
    stackHeight,
}: {
    game: "mythbuster" | "lab";
    /** Height of the card stack (without the tab-bar clearance); the picker passes its own so both match. */
    stackHeight?: number;
}) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const tabBarInset = useTabBarInset();
    const { theme, isDark } = useTheme();
    const modal = useMemo(() => makeModalStyles(theme), [theme]);

    // Quick Play asks for a unit (its theme): the units and how many statements each has
    const [units, setUnits] = useState<Unit[]>([]);
    const brands = useUnitBrands();
    const [deckSizes, setDeckSizes] = useState<Record<string, number>>({});
    const [themeOpen, setThemeOpen] = useState(false);
    useEffect(() => {
        if (game !== "mythbuster") return;
        let cancelled = false;
        void Promise.all([contentRepository.getUnits(), getUnitStatements()]).then(([all, statements]) => {
            if (cancelled) return;
            const sizes: Record<string, number> = {};
            for (const st of statements) sizes[st.unitId] = (sizes[st.unitId] ?? 0) + 1;
            setUnits([...all].sort((a, b) => a.position - b.position));
            setDeckSizes(sizes);
        });
        return () => {
            cancelled = true;
        };
    }, [game]);

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
                onPress: () => (mode.byUnit ? setThemeOpen(true) : router.push(`/mythbuster?mode=${mode.id}`)),
            }));
        }
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
    }, [game, router]);

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

            {/* Quick Play: pick the unit to review */}
            <ModalDialog visible={themeOpen} onClose={() => setThemeOpen(false)} title="Pick a unit" closeLabel="Close unit list" dismissOnScrim>
                <Text style={modal.hint}>Quick Play asks the 10 statements of one unit.</Text>
                <View>
                    {units.map((unit, i) => {
                        const count = deckSizes[unit.id] ?? 0;
                        const ready = count > 0;
                        const brand = brands.get(unit.position);
                        const face = brand ? teacherPalette(brand, theme.colors.lessonHeaderText, isDark).face : unitPalette(theme.colors, unit.position, isDark).face;
                        return (
                            <Pressable
                                key={unit.id}
                                disabled={!ready}
                                onPress={() => {
                                    setThemeOpen(false);
                                    router.push(`/mythbuster?mode=quick&unit=${unit.id}`);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={`${unit.title}, ${ready ? `${count} statements` : "coming soon"}`}
                                style={({ pressed }) => [modal.row, i > 0 && modal.divided, !ready && modal.rowOff, pressed && modal.rowPressed]}
                            >
                                <View style={[modal.icon, { backgroundColor: face }]}>
                                    <Icon name={unit.icon || "Book"} size={20} color={theme.colors.onPrimary} variant="Bold" />
                                </View>
                                <View style={modal.copy}>
                                    <Text style={modal.title} numberOfLines={2}>
                                        Unit {unit.position}: {unit.title}
                                    </Text>
                                    <Text style={modal.sub}>{ready ? `${count} statements` : "Coming soon"}</Text>
                                </View>
                                {ready ? (
                                    <View style={modal.arrow}>
                                        <Icon name="ArrowRight2" size={16} color={theme.colors.onPrimary} variant="Bold" />
                                    </View>
                                ) : null}
                            </Pressable>
                        );
                    })}
                </View>
            </ModalDialog>
        </View>
    );
}

export default DifficultyPanel;

const makeModalStyles = createStyles((theme) => {
    const c = theme.colors;
    return {
        hint: { fontSize: 15, lineHeight: 22, ...fontFaces.semibold, color: c.textMuted },
        row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 10 },
        divided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
        rowOff: { opacity: 0.5 },
        rowPressed: { opacity: 0.6 },
        icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
        copy: { flex: 1, gap: 2 },
        title: { fontSize: 16, ...fontFaces.heavy, color: c.text },
        sub: { fontSize: 13, ...fontFaces.medium, color: c.textMuted },
        arrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" },
    };
});

const styles = StyleSheet.create({
    panel: {
        flex: 1,
    },
    stack: {
        flex: 1,
    },
});