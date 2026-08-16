import { Icon } from "@/components/ui/icon";
import {useTheme, type Palette, fontFamilies} from "@/theme";
import { ACHIEVEMENTS } from "@/app/achievement-detail";
import {
    PROFILE_AVATAR_OPTIONS,
    type ProfileAvatarKey,
    getProfileAvatarSource,
    normalizeProfileAvatarKey,
} from "@/services/profile-avatars";
import { getBestGameScores, type GameBestScore } from "@/services/database";
import { useStorage } from "@/services/StorageContext";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeInDown,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    userProfile,
    updateUserProfile,
  } = useStorage();
  const { theme } = useTheme();
  const THEME = theme.palettes.tab;
  const styles = useMemo(() => createStyles(THEME), [THEME]);

  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

  // Card flip (profile ⇄ stats)
  const flipped = useSharedValue(0);
  const [frontHeight, setFrontHeight] = useState(0);
  const [backHeight, setBackHeight] = useState(0);

  // Autumn gradient background, matching the home screen
  const bgColors: [string, string] =
    theme.mode === "dark"
      ? [THEME.bg, THEME.bg]
      : ["#FFF3E0", "#FFFFFF"];

  // Calculate user level
  const userLevel = useMemo(() => {
    if (!userProfile) return 1;
    return Math.floor(userProfile.total_xp / 100) + 1;
  }, [userProfile]);

  // Calculate user title based on level
  const userTitle = useMemo(() => {
    if (userLevel < 5) return "Atomic Novice";
    if (userLevel < 10) return "Isotope Initiate";
    if (userLevel < 20) return "Fusion Explorer";
    return "Quantum Master";
  }, [userLevel]);

  const levelProgress = Math.min(((userProfile?.total_xp || 0) % 100) / 100, 1);

  const stats = useMemo(() => {
    return [
      {
        label: "Streak",
        value: userProfile?.current_streak ?? 0,
        icon: "Sun",
        color: "#E67E22",
      },
      {
        label: "Best",
        value: userProfile?.longest_streak ?? 0,
        icon: "Cup",
        color: "#F59E0B",
      },
      {
        label: "Myths",
        value: userProfile?.myths_busted ?? 0,
        icon: "TickCircle",
        color: "#22C55E",
      },
      {
        label: "Lessons",
        value: userProfile?.lessons_completed ?? 0,
        icon: "Book",
        color: "#64B5F6",
      },
    ];
  }, [userProfile]);

  // Personal game leaderboard — best scores per game
  const GAME_LEADERBOARD_META = [
    { id: "myth-buster", title: "Myth Buster", icon: "Judge", color: "#B984FF" },
    { id: "atom-maze", title: "Atom Maze", icon: "Grid9", color: "#1EE2E6" },
  ];
  const [bestScores, setBestScores] = useState<GameBestScore[]>([]);

  const refreshBestScores = useCallback(() => {
    getBestGameScores()
      .then(setBestScores)
      .catch((error) => console.error("Failed to load game scores:", error));
  }, []);

  // Refresh when returning to the tab (e.g. after finishing a game)
  useFocusEffect(
    useCallback(() => {
      refreshBestScores();
    }, [refreshBestScores]),
  );

  // Awards — achievements unlocked from the profile's numbers
  const awards = useMemo(() => {
    return ACHIEVEMENTS.map((achievement) => {
      const current = Number((userProfile as any)?.[achievement.field] ?? 0);
      return { ...achievement, unlocked: current >= achievement.threshold };
    });
  }, [userProfile]);
  const unlockedCount = awards.filter((a) => a.unlocked).length;

  const handleShare = () => {
    Share.share({
      message: `Join me learning nuclear science on AtomIQ! 🚀`,
    }).catch(() => {});
  };

  const selectedAvatarKey = normalizeProfileAvatarKey(userProfile?.avatar_url);

  const handleSelectAvatar = async (avatarKey: ProfileAvatarKey) => {
    if (!userProfile || isSavingAvatar || avatarKey === selectedAvatarKey) {
      return;
    }

    try {
      setIsSavingAvatar(true);
      await updateUserProfile({ avatar_url: avatarKey });

      setAvatarModalVisible(false);
    } catch {
      Alert.alert("Error", "Failed to update profile avatar.");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const toggleFlip = useCallback(() => {
    flipped.value = withTiming(flipped.value === 1 ? 0 : 1, { duration: 550 });
  }, [flipped]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateY: `${flipped.value * 180}deg` },
    ],
    // Opacity guard — backfaceVisibility alone is unreliable on Android
    opacity: flipped.value < 0.5 ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateY: `${-180 + flipped.value * 180}deg` },
    ],
    opacity: flipped.value < 0.5 ? 0 : 1,
  }));
  const cardHeightStyle = useAnimatedStyle(() => ({
    height: interpolate(
      flipped.value,
      [0, 1],
      [frontHeight || 240, backHeight || 240],
    ),
  }));

  if (!userProfile) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bgColors[0],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: THEME.textMuted }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColors[0] }]}>
      <LinearGradient
        colors={bgColors}
        style={styles.bgGradient}
        pointerEvents="none"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          /* Clear the tab bar so the last card isn't covered */
          { paddingBottom: insets.bottom + 96 },
        ]}
      >
        {/* Header: Share / Edit / Settings */}
        <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
            <Icon name="Share" size={20} color="#555555" variant="Bold" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setAvatarModalVisible(true)}
          >
            <Icon name="Edit2" size={20} color="#555555" variant="Bold" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/settings")}
          >
            <Icon name="Setting" size={20} color="#555555" variant="Bold" />
          </TouchableOpacity>
        </View>

        {/* Flip card: profile on the front, stats on the back */}
        <Animated.View
          entering={FadeInDown.springify()}
          style={[styles.profileCard, cardHeightStyle]}
        >
          {/* Front face */}
          <Animated.View
            onLayout={(e) => setFrontHeight(e.nativeEvent.layout.height)}
            style={[styles.cardFace, frontStyle]}
          >
            {/* Flip to stats */}
            <TouchableOpacity
              style={styles.flipCornerBtn}
              onPress={toggleFlip}
              activeOpacity={0.8}
            >
              <Icon name="ChartSquare" size={17} color="#E67E22" variant="Bold" />
            </TouchableOpacity>
            <View style={styles.profileRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setAvatarModalVisible(true)}
              >
                <View style={styles.avatarContainer}>
                  <Image
                    source={getProfileAvatarSource(userProfile.avatar_url)}
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelBadgeText}>{userLevel}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <View style={styles.profileTextCol}>
                <Text style={styles.name} numberOfLines={1}>
                  {userProfile.display_name || userProfile.username}
                </Text>
                <Text style={styles.title}>{userTitle}</Text>
              </View>
            </View>

            {/* Level progress */}
            <View style={styles.levelSection}>
              <View style={styles.levelMetaRow}>
                <Text style={styles.levelLabel}>Level {userLevel}</Text>
                <Text style={styles.levelXp}>
                  {userProfile.total_xp.toLocaleString()} XP
                </Text>
              </View>
              <View style={styles.levelBarBg}>
                <View
                  style={[
                    styles.levelBarFill,
                    { width: `${levelProgress * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.levelHint}>
                {100 - (userProfile.total_xp % 100)} XP until Level{" "}
                {userLevel + 1}
              </Text>
            </View>
          </Animated.View>

          {/* Back face — stats */}
          <Animated.View
            onLayout={(e) => setBackHeight(e.nativeEvent.layout.height)}
            style={[styles.cardFace, backStyle]}
          >
            {/* Flip back to profile */}
            <TouchableOpacity
              style={styles.flipCornerBtn}
              onPress={toggleFlip}
              activeOpacity={0.8}
            >
              <Icon
                name="ArrowSwapHorizontal"
                size={17}
                color="#E67E22"
                variant="Bold"
              />
            </TouchableOpacity>
            <Text style={styles.statsTitle}>Your Stats</Text>
            <View style={styles.statsGrid}>
              {stats.map((stat) => (
                <View key={stat.label} style={styles.statTile}>
                  <View style={[styles.statIconCircle, { backgroundColor: `${stat.color}1A` }]}>
                    <Icon
                      name={stat.icon}
                      size={20}
                      color={stat.color}
                      variant="Bold"
                    />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </Animated.View>

        {/* Streak card */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <TouchableOpacity
            style={styles.streakCard}
            activeOpacity={0.85}
            onPress={() => router.push("/streak")}
          >
            <View style={styles.streakIconCircle}>
              <Icon name="Sun" size={26} color="#E67E22" variant="Bold" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakValue}>
                {userProfile.current_streak} day streak
              </Text>
              <Text style={styles.streakSub}>
                Longest: {userProfile.longest_streak || 0} days
              </Text>
            </View>
            <View style={styles.streakArrow}>
              <Icon name="ArrowRight2" size={18} color="#E67E22" variant="Bold" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Awards — badges & certificates */}
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={styles.sectionCard}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Awards</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>
                {unlockedCount}/{awards.length} unlocked
              </Text>
            </View>
          </View>
          <View style={styles.badgesRow}>
            {awards.map((award) => (
              <TouchableOpacity
                key={award.id}
                style={styles.badgeItem}
                activeOpacity={0.8}
                onPress={() =>
                  router.push(`/achievement-detail?achievementId=${award.id}`)
                }
              >
                <View
                  style={[
                    styles.badgeCircle,
                    !award.unlocked && styles.badgeLocked,
                    award.unlocked && { backgroundColor: `${award.color}22` },
                  ]}
                >
                  <Icon
                    name={award.icon}
                    size={24}
                    color={award.unlocked ? award.color : "#C9CDD3"}
                    variant="Bold"
                  />
                </View>
                <Text
                  style={[
                    styles.badgeLabel,
                    !award.unlocked && styles.badgeLabelLocked,
                  ]}
                  numberOfLines={1}
                >
                  {award.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Personal game leaderboard */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.sectionCard}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Game Leaderboard</Text>
            <View style={styles.countPill}>
              <Icon name="Cup" size={13} color="#E67E22" variant="Bold" />
              <Text style={styles.countPillText}>Personal bests</Text>
            </View>
          </View>
          {GAME_LEADERBOARD_META.map((game, index) => {
            const best = bestScores.find((s) => s.game_id === game.id);
            const isTop = bestScores[0]?.game_id === game.id && !!best;
            return (
              <View
                key={game.id}
                style={[
                  styles.leaderRow,
                  index < GAME_LEADERBOARD_META.length - 1 &&
                    styles.leaderRowDivider,
                ]}
              >
                <View style={styles.leaderRank}>
                  <Text style={styles.leaderRankText}>{index + 1}</Text>
                </View>
                <View
                  style={[
                    styles.leaderIconCircle,
                    { backgroundColor: `${game.color}22` },
                  ]}
                >
                  <Icon name={game.icon} size={20} color={game.color} variant="Bold" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.leaderTitle}>{game.title}</Text>
                  {best ? (
                    <Text style={styles.leaderPlays}>
                      {best.plays} {best.plays === 1 ? "run" : "runs"} played
                    </Text>
                  ) : (
                    <Text style={styles.leaderPlays}>Not played yet</Text>
                  )}
                </View>
                {best ? (
                  <View
                    style={[
                      styles.leaderScorePill,
                      isTop && styles.leaderScorePillTop,
                    ]}
                  >
                    {isTop ? (
                      <Icon name="Crown1" size={13} color="#FFC107" variant="Bold" />
                    ) : null}
                    <Text
                      style={[
                        styles.leaderScoreText,
                        isTop && styles.leaderScoreTextTop,
                      ]}
                    >
                      {best.best.toLocaleString()}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.leaderNoScore}>—</Text>
                )}
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>

      {/* Avatar Picker Modal */}
      <Modal
        visible={avatarModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.avatarModalOverlay}>
          <View style={styles.avatarModalContent}>
            <View style={styles.avatarModalHeader}>
              <Text style={styles.avatarModalTitle}>Choose Avatar</Text>
              <TouchableOpacity
                onPress={() => setAvatarModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon
                  name="CloseCircle"
                  size={24}
                  color={THEME.textMuted}
                  variant="Bold"
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.avatarModalGrid}
            >
              {PROFILE_AVATAR_OPTIONS.map((avatarOption) => {
                const isSelected = selectedAvatarKey === avatarOption.key;

                return (
                  <TouchableOpacity
                    key={avatarOption.key}
                    style={[
                      styles.avatarModalOption,
                      isSelected && styles.avatarModalOptionSelected,
                      isSavingAvatar && styles.avatarModalOptionDisabled,
                    ]}
                    onPress={() => {
                      void handleSelectAvatar(avatarOption.key);
                    }}
                    activeOpacity={0.85}
                    disabled={isSavingAvatar}
                  >
                    <Image
                      source={avatarOption.source}
                      style={styles.avatarModalOptionImage}
                      resizeMode="cover"
                    />
                    {isSelected && (
                      <View style={styles.avatarModalCheck}>
                        <Icon
                          name="TickCircle"
                          size={16}
                          color="#22C55E"
                          variant="Bold"
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.avatarModalHint}>
              Tap an avatar to update your profile picture.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    bgGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    /* Header icon row — Share left, Edit + Settings right */
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 20,
      paddingBottom: 16,
      zIndex: 10,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      elevation: 3,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    /* Flip card shell — the faces rotate inside it */
    profileCard: {
      marginHorizontal: 20,
      borderRadius: 24,
      backgroundColor: "#FFFFFF",
      elevation: 5,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    cardFace: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      padding: 24,
      paddingTop: 28,
      backfaceVisibility: "hidden",
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    avatarContainer: {
      position: "relative",
    },
    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: "#FFF3E0",
      borderWidth: 3,
      borderColor: "#FFF3E0",
    },
    levelBadge: {
      position: "absolute",
      bottom: -2,
      right: -2,
      backgroundColor: "#FF8C00",
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: "#FFFFFF",
    },
    levelBadgeText: {
      color: "#FFF",
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      fontSize: 12,
    },
    name: {
      fontSize: 20,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#333333",
      marginBottom: 2,
    },
    title: {
      fontSize: 13,
      color: "#888888",
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
      marginBottom: 8,
    },
    /* Level progress, inside the profile card */
    levelSection: {
      marginTop: 18,
    },
    levelMetaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    levelLabel: {
      fontSize: 13,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    levelXp: {
      fontSize: 12,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: "#E67E22",
    },
    levelBarBg: {
      height: 10,
      borderRadius: 5,
      backgroundColor: "#FFF3E0",
      overflow: "hidden",
    },
    levelBarFill: {
      height: "100%",
      borderRadius: 5,
      backgroundColor: "#FF8C00",
    },
    levelHint: {
      fontSize: 11,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
      color: "#888888",
      marginTop: 6,
    },
    /* Flip corner button shared by both faces */
    flipCornerBtn: {
      position: "absolute",
      top: 12,
      right: 12,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "#FFF3E0",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 5,
    },
    profileTextCol: {
      flex: 1,
      paddingRight: 36,
    },
    /* Stats (back face) */
    statsTitle: {
      fontSize: 16,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#333333",
      alignSelf: "center",
      marginBottom: 16,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    statTile: {
      width: "48.5%",
      alignItems: "center",
      paddingVertical: 14,
      borderRadius: 18,
      backgroundColor: "#FDFBF7",
      marginBottom: 10,
    },
    statIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    statValue: {
      fontSize: 22,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    statLabel: {
      fontSize: 12,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
      color: "#888888",
      marginTop: 2,
    },
    /* Streak card */
    streakCard: {
      marginHorizontal: 20,
      marginTop: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      padding: 18,
      elevation: 5,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    streakIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: "#FFF3E0",
      alignItems: "center",
      justifyContent: "center",
    },
    streakValue: {
      fontSize: 16,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    streakSub: {
      fontSize: 12,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
      color: "#888888",
      marginTop: 2,
    },
    streakArrow: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "#FFF3E0",
      alignItems: "center",
      justifyContent: "center",
    },
    /* Shared section card (Awards / Leaderboard) */
    sectionCard: {
      marginHorizontal: 20,
      marginTop: 20,
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      padding: 20,
      elevation: 5,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    countPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#FFF3E0",
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    countPillText: {
      fontSize: 11,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#E67E22",
    },
    /* Awards badges */
    badgesRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    badgeItem: {
      alignItems: "center",
      width: "19%",
      gap: 6,
    },
    badgeCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeLocked: {
      backgroundColor: "#F4F5F7",
    },
    badgeLabel: {
      fontSize: 10,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: "#555555",
      textAlign: "center",
    },
    badgeLabelLocked: {
      color: "#AAAAAA",
    },
    /* Personal game leaderboard rows */
    leaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
    },
    leaderRowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: "#F4F5F7",
    },
    leaderRank: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "#FFF3E0",
      alignItems: "center",
      justifyContent: "center",
    },
    leaderRankText: {
      fontSize: 11,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#E67E22",
    },
    leaderIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    leaderTitle: {
      fontSize: 14,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    leaderPlays: {
      fontSize: 11,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
      color: "#888888",
      marginTop: 1,
    },
    leaderScorePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#F4F5F7",
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    leaderScorePillTop: {
      backgroundColor: "#FFF3E0",
    },
    leaderScoreText: {
      fontSize: 13,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#555555",
    },
    leaderScoreTextTop: {
      color: "#E67E22",
    },
    leaderNoScore: {
      fontSize: 14,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#C9CDD3",
    },

    /* Avatar picker modal */
    avatarModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.55)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    avatarModalContent: {
      width: "100%",
      maxWidth: 360,
      maxHeight: "74%",
      backgroundColor: theme.bg,
      borderRadius: 22,
      paddingTop: 16,
      paddingBottom: 14,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    avatarModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    avatarModalTitle: {
      fontSize: 20,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: theme.text,
    },
    closeButton: {
      padding: 4,
    },
    avatarModalGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 12,
      paddingTop: 4,
      paddingBottom: 8,
    },
    avatarModalOption: {
      width: 64,
      height: 64,
      borderRadius: 32,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    avatarModalOptionSelected: {
      borderColor: theme.primary,
      borderWidth: 3,
    },
    avatarModalOptionDisabled: {
      opacity: 0.65,
    },
    avatarModalOptionImage: {
      width: "100%",
      height: "100%",
    },
    avatarModalCheck: {
      position: "absolute",
      bottom: 0,
      right: 0,
      backgroundColor: "#FFFFFF",
      borderRadius: 10,
      padding: 1,
    },
    avatarModalHint: {
      marginTop: 8,
      textAlign: "center",
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
    },
  });
