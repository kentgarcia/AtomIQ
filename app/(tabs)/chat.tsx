import { Icon } from "@/components/ui/icon";
import { fontFamilies, useTheme, withAlpha } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GRADIENTS } from "@/constants/gradients";

type FeatureColor = "primary" | "cyan" | "coral";

const FEATURES: { icon: string; title: string; description: string; color: FeatureColor }[] = [
    {
        icon: "Book1",
        title: "Explain Concepts",
        description: "Break down complex topics into simple terms",
        color: "primary",
    },
    {
        icon: "SearchNormal",
        title: "Fact Check",
        description: "Verify myths and misconceptions instantly",
        color: "cyan",
    },
    {
        icon: "Teacher",
        title: "Study Partner",
        description: "Quiz you on what you've learned so far",
        color: "coral",
    },
];

const SUGGESTIONS = [
    "How does a nuclear reactor work?",
    "Is radiation always dangerous?",
    "What is half-life?",
    "Explain fusion vs fission",
];

export default function ChatLandingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();

    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: 100 + insets.bottom, paddingTop: insets.top + 20 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero */}
                <View style={styles.heroSection}>
                    <Animated.View
                        entering={FadeInDown.delay(100).springify()}
                        style={styles.mascotContainer}
                    >
                        <Image
                            source={require("@/assets/images/mascot/explain.png")}
                            style={styles.mascotImage}
                            resizeMode="contain"
                        />
                    </Animated.View>

                    <Animated.Text
                        entering={FadeInDown.delay(200).springify()}
                        style={styles.heroDescription}
                    >
                        Hi! I'm Schrödi. I can explain complex nuclear concepts, debunk myths, and
                        help you learn faster.
                    </Animated.Text>
                </View>

                {/* Features */}
                <Animated.View
                    entering={FadeInDown.delay(300).springify()}
                    style={styles.featuresContainer}
                >
                    {FEATURES.map((feature, index) => {
                        const color = theme.colors[feature.color];
                        return (
                            <View key={index} style={styles.featureCard}>
                                <View
                                    style={[
                                        styles.featureIcon,
                                        { backgroundColor: withAlpha(color, 0.14) },
                                    ]}
                                >
                                    <Icon name={feature.icon} size={24} color={color} variant="Bold" />
                                </View>
                                <View style={styles.featureContent}>
                                    <Text style={styles.featureTitle}>{feature.title}</Text>
                                    <Text style={styles.featureDescription}>
                                        {feature.description}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </Animated.View>

                {/* Start button */}
                <Animated.View
                    entering={FadeInUp.delay(500).springify()}
                    style={styles.actionContainer}
                >
                    <TouchableOpacity
                        style={styles.startButton}
                        activeOpacity={0.9}
                        onPress={() => router.push("../ai-chat" as never)}
                    >
                        <LinearGradient
                            colors={GRADIENTS.purple}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.startButtonGradient}
                        >
                            <Icon
                                name="Message"
                                size={24}
                                color={theme.colors.onPrimary}
                                variant="Bold"
                            />
                            <Text style={styles.startButtonText}>Start Conversation</Text>
                            <Icon
                                name="ArrowRight"
                                size={24}
                                color={theme.colors.onPrimary}
                                variant="Bold"
                            />
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const createStyles = (theme: ThemeType) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        content: {
            paddingBottom: 40,
        },
        heroSection: {
            alignItems: "center",
            paddingHorizontal: theme.spacing["2xl"],
            marginBottom: theme.spacing["3xl"],
            marginTop: theme.spacing.lg,
        },
        mascotContainer: {
            position: "relative",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: theme.spacing["2xl"],
        },
        mascotImage: {
            width: 160,
            height: 160,
        },
        heroDescription: {
            fontSize: theme.fontSizes.xl,
            textAlign: "center",
            lineHeight: theme.lineHeights.xl,
            fontWeight: theme.fontWeights.medium,
            fontFamily: fontFamilies.medium,
            opacity: 0.8,
            color: theme.colors.text,
        },
        featuresContainer: {
            paddingHorizontal: theme.spacing.xl,
            gap: theme.spacing.md,
            marginBottom: theme.spacing["3xl"],
        },
        featureCard: {
            flexDirection: "row",
            alignItems: "center",
            padding: theme.spacing.lg,
            borderRadius: theme.radius.xl,
            elevation: theme.shadows.md?.elevation ?? 2,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: theme.opacity.subtle,
            shadowRadius: theme.shadows.md?.shadowRadius ?? 8,
            backgroundColor: theme.colors.card,
        },
        featureIcon: {
            width: 48,
            height: 48,
            borderRadius: theme.radius.lg,
            alignItems: "center",
            justifyContent: "center",
            marginRight: theme.spacing.lg,
        },
        featureContent: {
            flex: 1,
        },
        featureTitle: {
            fontSize: theme.fontSizes.xl,
            fontFamily: theme.fontFamilies.bold,
            marginBottom: theme.spacing.xs,
            color: theme.colors.text,
        },
        featureDescription: {
            fontSize: theme.fontSizes.md,
            fontFamily: fontFamilies.regular,
            color: theme.colors.textMuted,
            lineHeight: theme.lineHeights.md,
        },
        actionContainer: {
            paddingHorizontal: theme.spacing.xl,
        },
        startButton: {
            borderRadius: theme.radius.xl,
            overflow: "hidden",
            elevation: theme.shadows.md?.elevation ?? 4,
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: theme.opacity.light,
            shadowRadius: theme.shadows.md?.shadowRadius ?? 12,
        },
        startButtonGradient: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: theme.spacing["2xl"],
            gap: theme.spacing.md,
        },
        startButtonText: {
            fontSize: theme.fontSizes["2xl"],
            fontFamily: theme.fontFamilies.heavy,
            color: theme.colors.onPrimary,
        },
    });

type ThemeType = ReturnType<typeof useTheme>["theme"];