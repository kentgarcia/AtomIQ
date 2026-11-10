import { Icon } from "@/components/ui/icon";
import { useStorage } from "@/services/StorageContext";
import { fontFamilies, useResponsiveLayout, useTheme } from "@/theme";
import { setOnboardingCompleted } from "@/services/storage";
import {
    DEFAULT_PROFILE_AVATAR_KEY,
    PROFILE_AVATAR_OPTIONS,
    type ProfileAvatarKey,
    getProfileAvatarSource,
} from "@/services/profile-avatars";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    BackHandler,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { impactLight } from "@/services/haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* Autumn action tokens — same as home screen */
const BTN_COLOR = "#FF8C00";
const BTN_LIP = "#E67E22";
const CREAM = "#FFF3E0";

const FEATURE_SHOWCASE = [
    {
        id: "learn",
        title: "Learn by Doing",
        description:
            "Follow a guided learning path with bite-sized lessons, quizzes, and an encyclopedia built for beginners.",
        icon: "Book",
        color: "#FF8C00",
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
            "Earn XP and climb the leaderboard",
        ],
    },
    {
        id: "guide",
        title: "Shrodi, Your Guide",
        description:
            "Not sure where to start? Shrodi routes you to the right lesson, entry, article, or game — no typing needed.",
        icon: "Star",
        color: "#2ECC71",
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
    /* Mode-aware surfaces — mirrors tokens.base light/dark */
    const P = isDark
        ? {
            bgTop: "#172B4D",
            bgBottom: "#172B4D",
            card: "#213356",
            border: "#2D3A56",
            text: "#F6F9FC",
            textSecondary: "#C0CBDD",
            muted: "#8898AA",
            faint: "#667799",
            soft: "#1A2D4A",
            softBorder: "#26365A",
            track: "#1A2D4A",
            dot: "#334A70",
            clearIcon: "#667799",
            shadowOpacity: 0.3,
          }
        : {
            bgTop: CREAM,
            bgBottom: "#FFFFFF",
            card: "#FFFFFF",
            border: "#E5E7EB",
            text: "#333333",
            textSecondary: "#555555",
            muted: "#888888",
            faint: "#9CA3AF",
            soft: "#F9FAFB",
            softBorder: "#F4F5F7",
            track: CREAM,
            dot: "#E5E7EB",
            clearIcon: "#C9CDD3",
            shadowOpacity: 0.08,
          };
    const styles = React.useMemo(() => createStyles(P), [P]);

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
                color={isDark ? "#FFC107" : P.faint}
                variant="Bold"
            />
            <Text style={[styles.themeToggleText, { color: P.text }]}>
                {isDark ? "Dark" : "Light"}
            </Text>
        </TouchableOpacity>
    );

    const [step, setStep] = useState<OnboardingStep>("splash");
    const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
    const [username, setUsername] = useState("");
    const [avatarKey, setAvatarKey] = useState<ProfileAvatarKey>(
        DEFAULT_PROFILE_AVATAR_KEY,
    );
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
                avatar_url: avatarKey,
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
            <View style={[styles.container, { backgroundColor: P.bgBottom }]}>
                {renderThemeToggle()}
                <LinearGradient colors={[P.bgTop, P.bgBottom]} style={StyleSheet.absoluteFill} />
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
                                <Icon name="Book" size={16} color="#FF8C00" variant="Bold" />
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
            <View style={[styles.container, { backgroundColor: P.bgBottom }]}>
                {renderThemeToggle()}
                <LinearGradient colors={[P.bgTop, P.bgBottom]} style={StyleSheet.absoluteFill} />
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
        <View style={[styles.container, { backgroundColor: P.bgBottom }]}>
            {renderThemeToggle()}
            <LinearGradient colors={[P.bgTop, P.bgBottom]} style={StyleSheet.absoluteFill} />
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
                            <Image
                                source={getProfileAvatarSource(avatarKey)}
                                style={styles.previewAvatar}
                                resizeMode="cover"
                            />
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
                            <TextInput
                                style={styles.input}
                                placeholder="Your display name"
                                placeholderTextColor={P.faint}
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
                                    <Icon name="CloseCircle" size={18} color={P.clearIcon} variant="Bold" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={styles.charCount}>{username.length}/24</Text>
                    </Animated.View>

                    {/* Avatar picker */}
                    <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.fieldSection}>
                        <View style={styles.avatarSectionHeader}>
                            <Text style={styles.fieldLabel}>Choose Avatar</Text>
                            <Text style={styles.avatarCount}>{PROFILE_AVATAR_OPTIONS.length} options</Text>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.avatarOptionsWrap}
                        >
                            {PROFILE_AVATAR_OPTIONS.map((option) => {
                                const isSelected = avatarKey === option.key;
                                return (
                                    <TouchableOpacity
                                        key={option.key}
                                        style={[styles.avatarOption, isSelected && styles.avatarOptionSelected]}
                                        activeOpacity={0.85}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Choose avatar ${option.key}`}
                                        accessibilityState={{ selected: isSelected }}
                                        onPress={() => {
                                            impactLight();
                                            setAvatarKey(option.key);
                                        }}
                                    >
                                        <Image
                                            source={option.source}
                                            style={styles.avatarOptionImage}
                                            resizeMode="cover"
                                        />
                                        {isSelected && (
                                            <View style={styles.avatarCheck}>
                                                <Icon name="TickCircle" size={16} color="#FFFFFF" variant="Bold" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
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

interface OPalette {
    bgTop: string;
    bgBottom: string;
    card: string;
    border: string;
    text: string;
    textSecondary: string;
    muted: string;
    faint: string;
    soft: string;
    softBorder: string;
    track: string;
    dot: string;
    clearIcon: string;
    shadowOpacity: number;
}

const createStyles = (P: OPalette) =>
  StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
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
        backgroundColor: P.card,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderColor: P.border,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: P.shadowOpacity,
        shadowRadius: 6,
        elevation: 3,
    },
    themeToggleText: {
        fontSize: 12,
        fontFamily: fontFamilies.heavy,
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
        backgroundColor: P.card,
        borderRadius: 26,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderColor: P.border,
        padding: 20,
        alignItems: "center",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: P.shadowOpacity,
        shadowRadius: 10,
        elevation: 5,
    },
    splashTitle: {
        fontSize: 40,
        fontFamily: fontFamilies.heavy,
        letterSpacing: -1,
        color: P.text,
    },
    splashSubtitle: {
        fontSize: 14,
        fontFamily: fontFamilies.semibold,
        color: P.muted,
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
        backgroundColor: P.soft,
        borderWidth: 1,
        borderColor: P.softBorder,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    splashPointText: {
        flex: 1,
        fontSize: 13,
        fontFamily: fontFamilies.medium,
        color: P.textSecondary,
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
        shadowColor: "#000000",
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
        fontFamily: fontFamilies.heavy,
        color: "#FFFFFF",
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
        backgroundColor: P.track,
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
        backgroundColor: P.card,
        borderRadius: 26,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderColor: P.border,
        padding: 20,
        alignItems: "center",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: P.shadowOpacity,
        shadowRadius: 10,
        elevation: 5,
    },
    mascotWrapSmall: {
        width: 132,
        height: 132,
        borderRadius: 66,
        backgroundColor: P.track,
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
        fontFamily: fontFamilies.heavy,
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    featureTitle: {
        fontSize: 24,
        fontFamily: fontFamilies.heavy,
        color: P.text,
        textAlign: "center",
    },
    featureDescription: {
        fontSize: 14,
        fontFamily: fontFamilies.medium,
        color: P.muted,
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
        backgroundColor: P.soft,
        borderWidth: 1,
        borderColor: P.softBorder,
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
        fontFamily: fontFamilies.medium,
        color: P.textSecondary,
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
        backgroundColor: P.dot,
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
        fontFamily: fontFamilies.heavy,
        color: P.faint,
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
        fontFamily: fontFamilies.heavy,
        color: P.text,
    },
    previewInner: {
        backgroundColor: P.card,
        borderRadius: 20,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderColor: P.border,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    previewAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: P.track,
        borderWidth: 3,
        borderColor: P.track,
    },
    profileName: {
        fontSize: 18,
        fontFamily: fontFamilies.heavy,
        color: P.text,
    },
    profileHint: {
        fontSize: 12,
        fontFamily: fontFamilies.semibold,
        color: P.muted,
        marginTop: 2,
    },
    fieldSection: {
        gap: 8,
    },
    fieldLabel: {
        fontSize: 13,
        fontFamily: fontFamilies.heavy,
        color: P.text,
    },
    inputWrap: {
        position: "relative",
    },
    input: {
        backgroundColor: P.soft,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderColor: P.border,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        paddingRight: 44,
        fontSize: 15,
        fontFamily: fontFamilies.semibold,
        color: P.text,
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
        fontFamily: fontFamilies.semibold,
        color: P.faint,
    },
    avatarSectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    avatarCount: {
        fontSize: 11,
        fontFamily: fontFamilies.semibold,
        color: P.faint,
    },
    avatarOptionsWrap: {
        gap: 10,
        paddingVertical: 2,
    },
    avatarOption: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: P.border,
        backgroundColor: P.track,
    },
    avatarOptionSelected: {
        borderWidth: 3,
        borderColor: BTN_COLOR,
    },
    avatarOptionImage: {
        width: "100%",
        height: "100%",
        borderRadius: 30,
    },
    avatarCheck: {
        position: "absolute",
        bottom: -2,
        right: -2,
        backgroundColor: BTN_COLOR,
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#FFFFFF",
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
        borderColor: P.border,
        backgroundColor: P.soft,
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
        fontFamily: fontFamilies.medium,
        color: P.muted,
        lineHeight: 17,
    },
    consentLink: {
        fontFamily: fontFamilies.heavy,
        color: BTN_COLOR,
        textDecorationLine: "underline",
    },
});
