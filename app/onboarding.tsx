import { Icon } from "@/components/ui/icon";
import { FieldInput } from "@/components/ui/field-input";
import { useStorage } from "@/services/StorageContext";
import { fontFaces, useResponsiveLayout, useTheme, createStyles } from "@/theme";
import { setOnboardingCompleted } from "@/services/storage";
import { Avatar } from "@/components/avatar/Avatar";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    BackHandler,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "@/components/ui/text";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { impactLight } from "@/services/haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* Autumn action tokens — same as home screen */
const BTN_COLOR = "#EA580C";
const BTN_LIP = "#C2410C";

const FEATURE_SHOWCASE = [
    {
        id: "learn",
        title: "Learn by Doing",
        description:
            "Follow a guided learning path with bite-sized lessons, quizzes, and an encyclopedia built for beginners.",
        icon: "Book",
        color: "#EA580C",
        mascot: require("@/assets/images/mascot/explain.png"),
        highlights: [
            "Guided lesson path with progress tracking",
            "Bite-sized lessons that fit your day",
            "Quizzes to lock in what you learned",
        ],
    },
    {
        id: "play",
        title: "Play & Practice",
        description:
            "Practice what you learn through games. Swipe through myths and facts or navigate mazes to earn XP.",
        icon: "Game",
        color: "#8B5CF6",
        mascot: require("@/assets/images/mascot/experiment.png"),
        highlights: [
            "Myth Buster: swipe fact vs. fiction",
            "Atom Maze: quiz-powered maze runs",
            "Earn XP and unlock achievements",
        ],
    },
    {
        id: "guide",
        title: "Shrodi, Your Guide",
        description:
            "Not sure where to start? Shrodi routes you to the right lesson, entry, or game — no typing needed.",
        icon: "Star",
        color: "#58CC02",
        mascot: require("@/assets/images/mascot/thinking.png"),
        highlights: [
            "Tap-through navigation, no typing",
            "Recommendations based on your progress",
            "Review weak spots automatically",
        ],
    },
];

type OnboardingStep = "splash" | "features" | "profile";

export default function Onboarding() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { contentMaxWidth } = useResponsiveLayout();
    const { updateUserProfile, userProfile } = useStorage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme.mode === "dark";
    const styles = React.useMemo(() => makeStyles(theme), [theme]);

    /* Dark mode toggle — floating pill, top-right, on every step */
    const renderThemeToggle = () => (
        <TouchableOpacity
            onPress={() => void toggleTheme()}
            style={[styles.themeToggle, { top: insets.top + 12 }]}
            activeOpacity={0.85}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${isDark ? "light" : "dark"} mode`}
        >
            <Icon
                name={isDark ? "Moon" : "Sun"}
                size={16}
                color={isDark ? theme.colors.warning : theme.colors.textFaint}
                variant="Bold"
            />
            <Text style={[styles.themeToggleText, { color: theme.colors.text }]}>
                {isDark ? "Dark" : "Light"}
            </Text>
        </TouchableOpacity>
    );

    const [step, setStep] = useState<OnboardingStep>("splash");
    const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
    const [username, setUsername] = useState("");
    const [isFinishing, setIsFinishing] = useState(false);
    const [agreed, setAgreed] = useState(false);

    // Android back walks onboarding backwards instead of exiting the flow and
    // losing the in-progress step state.
    useEffect(() => {
        if (Platform.OS !== "android") {
            return;
        }

        const subscription = BackHandler.addEventListener(
            "hardwareBackPress",
            () => {
                if (step === "profile") {
                    setStep("features");
                    return true;
                }
                if (step === "features") {
                    setStep("splash");
                    return true;
                }
                return false;
            },
        );

        return () => subscription.remove();
    }, [step]);

    /* 3D press button (home-screen ActionButton language) */
    const Button3D = ({
        onPress,
        label,
        icon,
        disabled,
    }: {
        onPress: () => void;
        label: string;
        icon?: string;
        disabled?: boolean;
    }) => (
        <View style={styles.btnClip}>
            <TouchableOpacity
                style={[styles.btnFace, disabled && styles.btnDisabled]}
                activeOpacity={0.85}
                onPress={onPress}
                disabled={disabled}
            >
                {icon ? (
                    <Icon name={icon} size={18} color="#FFFFFF" variant="Bold" />
                ) : null}
                <Text style={styles.btnText}>{label}</Text>
            </TouchableOpacity>
        </View>
    );

    const handleNextFeature = () => {
        impactLight();
        if (currentFeatureIndex < FEATURE_SHOWCASE.length - 1) {
            setCurrentFeatureIndex(currentFeatureIndex + 1);
        } else {
            setStep("profile");
        }
    };

    const handleFinish = async () => {
        if (isFinishing) return;
        try {
            setIsFinishing(true);
            const fallbackUserId =
                userProfile?.user_id ||
                `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

            await updateUserProfile({
                user_id: fallbackUserId,
                username: username.trim() || "Scientist",
                display_name: username.trim() || "Scientist",
            });

            await setOnboardingCompleted(true);
            router.replace("/(tabs)");
        } catch (error) {
            console.error("Error completing onboarding:", error);
            router.replace("/(tabs)");
        } finally {
            setIsFinishing(false);
        }
    };

    /* ---------------- Splash ---------------- */
    if (step === "splash") {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                {renderThemeToggle()}
                <View
                    style={[
                        styles.splashContent,
                        { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" },
                        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
                    ]}
                >
                    <Animated.View entering={FadeInDown.springify()} style={styles.mascotWrap}>
                        <Image
                            source={require("@/assets/images/mascot/happy_2.png")}
                            style={styles.mascot}
                            resizeMode="contain"
                        />
                    </Animated.View>

                    {/* Hero card */}
                    <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.heroCard}>
                        <Text style={styles.splashTitle}>
                            Atom<Text style={{ color: BTN_COLOR }}>IQ</Text>
                        </Text>
                        <Text style={styles.splashSubtitle}>
                            Master the atomic world — one myth busted at a time.
                        </Text>

                        <View style={styles.splashPoints}>
                            <View style={styles.splashPointRow}>
                                <Icon name="Book" size={16} color="#EA580C" variant="Bold" />
                                <Text style={styles.splashPointText}>Learn nuclear science step by step</Text>
                            </View>
                            <View style={styles.splashPointRow}>
                                <Icon name="Game" size={16} color="#8B5CF6" variant="Bold" />
                                <Text style={styles.splashPointText}>Play games that make it stick</Text>
                            </View>
                            <View style={styles.splashPointRow}>
                                <Icon name="Chart" size={16} color="#22C55E" variant="Bold" />
                                <Text style={styles.splashPointText}>Track streaks, XP, and achievements</Text>
                            </View>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeIn.delay(400)} style={styles.bottomContainer}>
                        <Button3D label="Get Started" icon="ArrowRight2" onPress={() => setStep("features")} />
                    </Animated.View>
                </View>
            </View>
        );
    }

    /* ---------------- Feature tour ---------------- */
    if (step === "features") {
        const feature = FEATURE_SHOWCASE[currentFeatureIndex];
        const isLast = currentFeatureIndex === FEATURE_SHOWCASE.length - 1;

        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                {renderThemeToggle()}
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" },
                        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Progress bar */}
                    <View style={styles.progressTrack}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${((currentFeatureIndex + 1) / FEATURE_SHOWCASE.length) * 100}%`,
                                },
                            ]}
                        />
                    </View>

                    {/* Tour card — vertically centered in remaining space */}
                    <View style={styles.tourCenter}>
                        <Animated.View
                            key={feature.id}
                            entering={FadeInUp.duration(250)}
                            style={styles.tourCard}
                        >
                            <View style={styles.mascotWrapSmall}>
                                <Image source={feature.mascot} style={styles.mascotSmall} resizeMode="contain" />
                            </View>

                            <View style={[styles.stepChip, { backgroundColor: `${feature.color}14` }]}>
                                <Icon name={feature.icon} size={14} color={feature.color} variant="Bold" />
                                <Text style={[styles.stepChipText, { color: feature.color }]}>
                                    Step {currentFeatureIndex + 1} of {FEATURE_SHOWCASE.length}
                                </Text>
                            </View>

                            <Text style={styles.featureTitle}>{feature.title}</Text>
                            <Text style={styles.featureDescription}>{feature.description}</Text>

                            <View style={styles.highlights}>
                                {feature.highlights.map((highlight, index) => (
                                    <Animated.View
                                        key={highlight}
                                        entering={FadeInDown.delay(120 + index * 80)}
                                        style={styles.highlightRow}
                                    >
                                        <View style={[styles.highlightCheck, { backgroundColor: `${feature.color}14` }]}>
                                            <Icon name="TickCircle" size={14} color={feature.color} variant="Bold" />
                                        </View>
                                        <Text style={styles.highlightText}>{highlight}</Text>
                                    </Animated.View>
                                ))}
                            </View>
                        </Animated.View>
                    </View>

                    {/* Bottom-anchored controls */}
                    <View style={styles.bottomControls}>
                        {/* Dots */}
                        <View style={styles.dots}>
                            {FEATURE_SHOWCASE.map((f, index) => (
                                <View
                                    key={f.id}
                                    style={[
                                        styles.dot,
                                        index === currentFeatureIndex && styles.dotActive,
                                    ]}
                                />
                            ))}
                        </View>

                        <Button3D
                            label={isLast ? "Continue" : "Next"}
                            icon={isLast ? "TickCircle" : "ArrowRight2"}
                            onPress={handleNextFeature}
                        />
                        {!isLast && (
                            <TouchableOpacity
                                onPress={() => setStep("profile")}
                                style={styles.skipBtn}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.skipText}>Skip tour</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </View>
        );
    }

    /* ---------------- Profile setup ---------------- */
    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {renderThemeToggle()}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        styles.profileContent,
                        { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" },
                        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View entering={FadeInDown.springify()} style={styles.fieldSection}>
                        <Text style={[styles.profileHeading, styles.centerSelf]}>Create your profile</Text>

                        {/* Preview card — avatar + name */}
                        <View style={styles.previewInner}>
                            <Avatar value={userProfile?.avatar_url} size={64} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.profileName}>
                                    {username.trim() || "Your name"}
                                </Text>
                                <Text style={styles.profileHint}>Level 1 · Atomic Novice</Text>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Name */}
                    <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.fieldSection}>
                        <Text style={styles.fieldLabel}>Display Name</Text>
                        <View style={styles.inputWrap}>
                            <FieldInput
                                style={styles.input}
                                placeholder="Your display name"
                                value={username}
                                onChangeText={(text) => setUsername(text.slice(0, 24))}
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="done"
                                maxLength={24}
                            />
                            {username.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => setUsername("")}
                                    style={styles.clearBtn}
                                    activeOpacity={0.7}
                                    hitSlop={8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Clear display name"
                                >
                                    <Icon name="CloseCircle" size={18} color={theme.colors.textFaint} variant="Bold" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={styles.charCount}>{username.length}/24</Text>
                    </Animated.View>

                    {/* Terms & Privacy consent */}
                    <Animated.View entering={FadeInDown.delay(220).springify()}>
                        <TouchableOpacity
                            style={styles.consentRow}
                            activeOpacity={0.8}
                            onPress={() => {
                                impactLight();
                                setAgreed((v) => !v);
                            }}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: agreed }}
                        >
                            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                                {agreed && (
                                    <Icon name="TickCircle" size={14} color="#FFFFFF" variant="Bold" />
                                )}
                            </View>
                            <Text style={styles.consentText}>
                                I agree to the{" "}
                                <Text
                                    style={styles.consentLink}
                                    onPress={() => router.push("/terms-of-service")}
                                >
                                    Terms of Service
                                </Text>{" "}
                                and{" "}
                                <Text
                                    style={styles.consentLink}
                                    onPress={() => router.push("/privacy-policy")}
                                >
                                    Privacy Policy
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(260).springify()}>
                        <Button3D
                            label={isFinishing ? "Starting..." : "Start Journey"}
                            icon="ArrowRight2"
                            disabled={!username.trim() || !agreed || isFinishing}
                            onPress={() => void handleFinish()}
                        />
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const makeStyles = createStyles((theme) => {
    const shadowOpacity = theme.mode === "dark" ? 0.3 : 0.08;
    return {
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    /* Dark mode toggle — floating pill, top-right */
    themeToggle: {
        position: "absolute",
        right: 20,
        zIndex: 50,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: theme.colors.card,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity,
        shadowRadius: 6,
        elevation: 3,
    },
    themeToggleText: {
        fontSize: 12,
        ...fontFaces.heavy,
    },
    /* Splash */
    splashContent: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
        gap: 24,
    },
    mascotWrap: {
        width: 160,
        height: 160,
        borderRadius: 80,
        alignItems: "center",
        justifyContent: "center",
    },
    mascot: {
        width: 160,
        height: 160,
    },
    heroCard: {
        width: "100%",
        maxWidth: 380,
        backgroundColor: theme.colors.card,
        borderRadius: 26,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderColor: theme.colors.border,
        padding: 20,
        alignItems: "center",
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity,
        shadowRadius: 10,
        elevation: 5,
    },
    splashTitle: {
        fontSize: 40,
        ...fontFaces.heavy,
        letterSpacing: -1,
        color: theme.colors.text,
    },
    splashSubtitle: {
        fontSize: 14,
        ...fontFaces.semibold,
        color: theme.colors.textMuted,
        textAlign: "center",
        marginTop: 6,
        lineHeight: 20,
    },
    splashPoints: {
        alignSelf: "stretch",
        marginTop: 18,
        gap: 8,
    },
    splashPointRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: theme.colors.surfaceSoft,
        borderWidth: 1,
        borderColor: theme.colors.borderSubtle,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    splashPointText: {
        flex: 1,
        fontSize: 13,
        ...fontFaces.medium,
        color: theme.colors.textSecondary,
    },
    bottomContainer: {
        width: "100%",
        maxWidth: 380,
    },
    /* 3D button — single surface, thick bottom lip, press sink */
    btnClip: {
        borderRadius: 16,
    },
    btnFace: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: BTN_COLOR,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderBottomWidth: 4,
        borderColor: BTN_LIP,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
    btnDisabled: {
        opacity: 0.45,
    },
    btnText: {
        fontSize: 15,
        ...fontFaces.heavy,
        color: theme.colors.onPrimary,
    },
    /* Feature tour */
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        gap: 16,
    },
    progressTrack: {
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.surfaceSoft,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 5,
        backgroundColor: BTN_COLOR,
    },
    /* Center the tour card in the space between the bar and the controls */
    tourCenter: {
        flex: 1,
        justifyContent: "center",
    },
    /* Bottom-anchored dots + buttons */
    bottomControls: {
        gap: 14,
    },
    tourCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 26,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderColor: theme.colors.border,
        padding: 20,
        alignItems: "center",
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity,
        shadowRadius: 10,
        elevation: 5,
    },
    mascotWrapSmall: {
        width: 132,
        height: 132,
        borderRadius: 66,
        backgroundColor: theme.colors.surfaceSoft,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    mascotSmall: {
        width: 116,
        height: 116,
    },
    stepChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        marginBottom: 12,
    },
    stepChipText: {
        fontSize: 11,
        ...fontFaces.heavy,
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    featureTitle: {
        fontSize: 24,
        ...fontFaces.heavy,
        color: theme.colors.text,
        textAlign: "center",
    },
    featureDescription: {
        fontSize: 14,
        ...fontFaces.medium,
        color: theme.colors.textMuted,
        textAlign: "center",
        lineHeight: 21,
        marginTop: 8,
    },
    highlights: {
        alignSelf: "stretch",
        marginTop: 18,
        gap: 8,
    },
    highlightRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: theme.colors.surfaceSoft,
        borderWidth: 1,
        borderColor: theme.colors.borderSubtle,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    highlightCheck: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    highlightText: {
        flex: 1,
        fontSize: 13,
        ...fontFaces.medium,
        color: theme.colors.textSecondary,
    },
    dots: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.border,
    },
    dotActive: {
        width: 22,
        backgroundColor: BTN_COLOR,
    },
    skipBtn: {
        alignSelf: "center",
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    skipText: {
        fontSize: 13,
        ...fontFaces.heavy,
        color: theme.colors.textFaint,
    },
    /* Profile */
    /* Vertically center the whole form when it fits the screen */
    profileContent: {
        justifyContent: "center",
        gap: 20,
    },
    centerSelf: {
        textAlign: "center",
        alignSelf: "center",
    },
    profileHeading: {
        fontSize: 22,
        ...fontFaces.heavy,
        color: theme.colors.text,
    },
    previewInner: {
        backgroundColor: theme.colors.card,
        borderRadius: 20,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderColor: theme.colors.border,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    profileName: {
        fontSize: 18,
        ...fontFaces.heavy,
        color: theme.colors.text,
    },
    profileHint: {
        fontSize: 12,
        ...fontFaces.semibold,
        color: theme.colors.textMuted,
        marginTop: 2,
    },
    fieldSection: {
        gap: 8,
    },
    fieldLabel: {
        fontSize: 13,
        ...fontFaces.heavy,
        color: theme.colors.text,
    },
    inputWrap: {
        position: "relative",
    },
    input: {
        backgroundColor: theme.colors.field,
        borderRadius: 14,
        minHeight: 56,
        paddingHorizontal: 14,
        paddingVertical: 14,
        paddingRight: 44,
        fontSize: 15,
        ...fontFaces.semibold,
        color: theme.colors.fieldText,
    },
    clearBtn: {
        position: "absolute",
        right: 12,
        top: "50%",
        transform: [{ translateY: -18 }],
        padding: 4,
    },
    charCount: {
        alignSelf: "flex-end",
        fontSize: 11,
        ...fontFaces.semibold,
        color: theme.colors.textFaint,
    },
    /* Terms & Privacy consent */
    consentRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        paddingHorizontal: 4,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 7,
        borderWidth: 2,
        borderBottomWidth: 3,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.input,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 1,
    },
    checkboxChecked: {
        backgroundColor: BTN_COLOR,
        borderColor: BTN_LIP,
    },
    consentText: {
        flex: 1,
        fontSize: 12,
        ...fontFaces.medium,
        color: theme.colors.textMuted,
        lineHeight: 17,
    },
    consentLink: {
        ...fontFaces.heavy,
        color: BTN_COLOR,
        textDecorationLine: "underline",
    },
    };
});
