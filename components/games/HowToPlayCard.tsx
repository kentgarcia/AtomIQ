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
                        <View
                            style={[
                                styles.stepIconWrap,
                                { backgroundColor: palette.iconWrapBg },
                            ]}
                        >
                            <Icon
                                name={step.icon}
                                size={18}
                                color={palette.primaryText}
                                variant="Bold"
                            />
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
        padding: 20,
        borderWidth: 2,
        borderBottomWidth: 4,
        alignSelf: "stretch",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginBottom: 14,
    },
    headerIcon: {
        width: 28,
        height: 28,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 16,
        fontWeight: "800",
        fontFamily: fontFamilies.heavy,
        textAlign: "center",
    },
    steps: {
        gap: 10,
    },
    stepRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 12,
        paddingVertical: 11,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    stepNumberText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "900",
        fontFamily: fontFamilies.heavy,
    },
    stepIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    stepCopy: {
        flex: 1,
        gap: 2,
    },
    stepTitle: {
        fontSize: 13,
        fontWeight: "700",
        fontFamily: fontFamilies.semibold,
    },
    stepHint: {
        fontSize: 12,
        fontWeight: "500",
        fontFamily: fontFamilies.regular,
        lineHeight: 16,
    },
    divider: {
        height: 1,
        marginVertical: 14,
    },
});