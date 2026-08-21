import { Icon } from "@/components/ui/icon";
import { fontFamilies, useTheme } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

/* Autumn-tinted icon circle for each feature */
const FEATURE_ACCENTS: Record<FeatureColor, { bg: string; icon: string }> = {
    primary: { bg: "rgba(255,140,0,0.12)", icon: "#E67E22" },
    cyan:    { bg: "rgba(46,204,113,0.12)", icon: "#27AE60" },
    coral:   { bg: "rgba(255,107,107,0.12)", icon: "#E05252" },
};

export default function ChatLandingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();

    const styles = useMemo(() => createStyles(isDark), [isDark]);

    const SKY: [string, string] = isDark
        ? ["#172B4D", "#172B4D"]
        : ["#FFF3E0", "#FFFFFF"];

    return (
        <View style={[styles.container, { backgroundColor: SKY[0] }]}>
            {/* Autumn gradient flowing through the whole page */}
            <LinearGradient
                colors={SKY}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            />

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
                        Hi! I&apos;m Schrödi. I can explain complex nuclear concepts, debunk myths, and
                        help you learn faster.
                    </Animated.Text>
                </View>

                {/* Features */}
                <Animated.View
                    entering={FadeInDown.delay(300).springify()}
                    style={styles.featuresContainer}
                >
                    {FEATURES.map((feature, index) => {
                        const accent = FEATURE_ACCENTS[feature.color];
                        return (
                            <View key={index} style={styles.featureCard}>
                                <View
                                    style={[
                                        styles.featureIcon,
                                        { backgroundColor: accent.bg },
                                    ]}
                                >
                                    <Icon name={feature.icon} size={24} color={accent.icon} variant="Bold" />
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
                        {/* 3D lip behind the button face */}
                        <View style={styles.startButtonLip} />
                        <View style={styles.startButtonFace}>
                            <Icon name="Message" size={24} color="#FFFFFF" variant="Bold" />
                            <Text style={styles.startButtonText}>Start Conversation</Text>
                            <Icon name="ArrowRight" size={24} color="#FFFFFF" variant="Bold" />
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const createStyles = (isDark: boolean) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        content: {
            paddingBottom: 40,
        },
        heroSection: {
            alignItems: "center",
            paddingHorizontal: 32,
            marginBottom: 32,
            marginTop: 16,
        },
        mascotContainer: {
            position: "relative",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
        },
        mascotImage: {
            width: 160,
            height: 160,
        },
        heroDescription: {
            fontSize: 17,
            textAlign: "center",
            lineHeight: 26,
            fontFamily: fontFamilies.medium,
            color: isDark ? "#8898AA" : "#6B7280",
        },
        featuresContainer: {
            paddingHorizontal: 24,
            gap: 12,
            marginBottom: 32,
        },
        featureCard: {
            flexDirection: "row",
            alignItems: "center",
            padding: 18,
            borderRadius: 24,
            backgroundColor: "#FFFFFF",
            elevation: 3,
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
        },
        featureIcon: {
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 18,
        },
        featureContent: {
            flex: 1,
        },
        featureTitle: {
            fontSize: 17,
            fontFamily: fontFamilies.bold,
            marginBottom: 4,
            color: "#333333",
        },
        featureDescription: {
            fontSize: 14,
            fontFamily: fontFamilies.regular,
            color: "#888888",
            lineHeight: 20,
        },
        actionContainer: {
            paddingHorizontal: 24,
        },
        startButton: {
            borderRadius: 22,
            overflow: "hidden",
            elevation: 5,
            shadowColor: "#FF8C00",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
        },
        startButtonLip: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 10,
            borderRadius: 22,
            backgroundColor: "#E67E22",
        },
        startButtonFace: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 20,
            gap: 12,
            backgroundColor: "#FF8C00",
            borderRadius: 22,
        },
        startButtonText: {
            fontSize: 20,
            fontFamily: fontFamilies.heavy,
            color: "#FFFFFF",
        },
    });