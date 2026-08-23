/**
 * HowToPlayCard — the single uniform "How to Play" card used by the Atom
 * Maze, Myth Buster and the Lab. Numbered step rows with an icon badge
 * and an optional footer (mode stats, etc.). Palette-driven so it works
 * on any surface (light cards, dark cards, gradients).
 */

import { Icon } from "@/components/ui/icon";
import { fontFamilies } from "@/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export interface HowToPlayStep {
    id: string;
    title: string;
    hint: string;
    /** Iconsax icon name rendered in the step badge. */
    icon: string;
}

export interface HowToPlayPalette {
    cardBg: string;
    cardBorder: string;
    primaryText: string;
    mutedText: string;
    subtleBg: string;
    subtleBorder: string;
    iconWrapBg: string;
}

interface HowToPlayCardProps {
    steps: HowToPlayStep[];
    palette: HowToPlayPalette;
    /** Single accent color for the header icon and step number badges. */
    accentColor: string;
    /** Iconsax icon name for the header; defaults to "MessageQuestion". */
    headerIcon?: string;
    /** Optional content rendered below the steps, under a divider. */
    footer?: React.ReactNode;
}

export function HowToPlayCard({
    steps,
    palette,
    accentColor,
    headerIcon = "MessageQuestion",
    footer,
}: HowToPlayCardProps) {
    return (
        <View
            style={[
                styles.card,
                { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
            ]}
        >
            <View style={styles.headerRow}>
                <View
                    style={[
                        styles.headerIcon,
                        { backgroundColor: palette.iconWrapBg },
                    ]}
                >
                    <Icon
                        name={headerIcon}
                        size={16}
                        color={accentColor}
                        variant="Bold"
                    />
                </View>
                <Text style={[styles.title, { color: palette.primaryText }]}>
                    How to Play
                </Text>
            </View>

            <View style={styles.steps}>
                {steps.map((step, index) => (
                    <View
                        key={step.id}
                        style={[
                            styles.stepRow,
                            {
                                backgroundColor: palette.subtleBg,
                                borderColor: palette.subtleBorder,
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.stepNumber,
                                { backgroundColor: accentColor },
                            ]}
                        >
                            <Text style={styles.stepNumberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.stepCopy}>
                            <Text
                                style={[
                                    styles.stepTitle,
                                    { color: palette.primaryText },
                                ]}
                            >
                                {step.title}
                            </Text>
                            <Text
                                style={[
                                    styles.stepHint,
                                    { color: palette.mutedText },
                                ]}
                            >
                                {step.hint}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>

            {footer != null && (
                <>
                    <View
                        style={[
                            styles.divider,
                            { backgroundColor: palette.subtleBorder },
                        ]}
                    />
                    {footer}
                </>
            )}
        </View>
    );
}

export default HowToPlayCard;

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 2,
        borderBottomWidth: 4,
        alignSelf: "stretch",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 5,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 14,
    },
    headerIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 16,
        fontFamily: fontFamilies.heavy,
    },
    steps: {
        gap: 8,
    },
    stepRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    stepNumber: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    stepNumberText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontFamily: fontFamilies.heavy,
    },
    stepCopy: {
        flex: 1,
        gap: 1,
    },
    stepTitle: {
        fontSize: 13,
        fontFamily: fontFamilies.heavy,
    },
    stepHint: {
        fontSize: 12,
        fontFamily: fontFamilies.semibold,
        lineHeight: 16,
    },
    divider: {
        height: 1,
        marginVertical: 14,
    },
});