import { Icon } from "@/components/ui/icon";
import {useTheme, type Palette, fontFamilies} from "@/theme";
import { ACHIEVEMENTS } from "@/app/achievement-detail";
import { NPC_CHARACTERS } from "@/app/(tabs)/leaderboard";
import {
    DEFAULT_PROFILE_AVATAR_KEY,
    PROFILE_AVATAR_OPTIONS,
    type ProfileAvatarKey,
    getProfileAvatarSource,
    normalizeProfileAvatarKey,
} from "@/services/profile-avatars";
import { getBestGameScores, type GameBestScore } from "@/services/database";
import { getUnlockedAchievementIds, setUnlockedAchievementIds } from "@/services/storage";
import { useStorage } from "@/services/StorageContext";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeOut,
    LinearTransition,
    ZoomIn,
    interpolate,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DURATION, EASE_OUT } from "@/theme/motion";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const {
    userProfile,
    updateUserProfile,
  } = useStorage();
  const { theme } = useTheme();
  const THEME = theme.palettes.tab;
  const styles = useMemo(() => createStyles(THEME), [THEME]);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [pendingAvatarKey, setPendingAvatarKey] =
    useState<ProfileAvatarKey>(DEFAULT_PROFILE_AVATAR_KEY);

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

  // Title milestones — tap the title pill to see progress
  const [showTitleProgress, setShowTitleProgress] = useState(false);
  const TITLE_MILESTONES = useMemo(
    () => [
      { title: "Atomic Novice", minLevel: 1, icon: "Star", color: "#64B5F6" },
      { title: "Isotope Initiate", minLevel: 5, icon: "Flash", color: "#FF8C00" },
      { title: "Fusion Explorer", minLevel: 10, icon: "Cup", color: "#8B5CF6" },
      { title: "Quantum Master", minLevel: 20, icon: "Crown", color: "#FFD700" },
    ],
    [],
  );
  const titleProgress = useMemo(() => {
    const idx = TITLE_MILESTONES.findIndex((m) => m.title === userTitle);
    const current = TITLE_MILESTONES[idx];
    const next = TITLE_MILESTONES[idx + 1] ?? null;
    if (!next) {
      return { idx, current, next, xpNeeded: 0, levelNeeded: 0, progress: 1 };
    }
    const xpNeeded = Math.max(0, (next.minLevel - 1) * 100 - (userProfile?.total_xp ?? 0));
    const levelNeeded = Math.max(0, next.minLevel - userLevel);
    // Progress within current bracket
    const span = next.minLevel - current.minLevel;
    const progressed = userLevel - current.minLevel;
    const progress = span > 0 ? Math.min(1, Math.max(0, progressed / span)) : 1;
    return { idx, current, next, xpNeeded, levelNeeded, progress };
  }, [TITLE_MILESTONES, userTitle, userLevel, userProfile?.total_xp]);

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

  // Newly unlocked achievements, celebrated once via overlay on this screen
  const [celebrationAwards, setCelebrationAwards] =
    useState<(typeof ACHIEVEMENTS)[number][] | null>(null);

  // Awards — achievements unlocked from the profile's numbers
  const awards = useMemo(() => {
    return ACHIEVEMENTS.map((achievement) => {
      const current = Number((userProfile as any)?.[achievement.field] ?? 0);
      return { ...achievement, unlocked: current >= achievement.threshold };
    });
  }, [userProfile]);
  const unlockedCount = awards.filter((a) => a.unlocked).length;

  const checkAchievementUnlocks = useCallback(async () => {
    if (!userProfile) return;
    const unlocked = awards.filter((a) => a.unlocked);
    const unlockedIds = unlocked.map((a) => a.id);
    const stored = await getUnlockedAchievementIds();

    // First run ever — treat current state as the baseline, no retroactive party.
    if (stored === null) {
      await setUnlockedAchievementIds(unlockedIds);
      return;
    }

    const newlyUnlocked = unlocked.filter((a) => !stored.includes(a.id));
    if (newlyUnlocked.length === 0) return;

    setCelebrationAwards(newlyUnlocked);
    await setUnlockedAchievementIds([
      ...new Set([...stored, ...newlyUnlocked.map((a) => a.id)]),
    ]);
  }, [awards, userProfile]);

  // Global rank vs the NPC rivals (the only "opponents" on the local board)
  const leaderboardRank = useMemo(() => {
    const xp = userProfile?.total_xp ?? 0;
    return 1 + NPC_CHARACTERS.filter((npc) => npc.baseXP > xp).length;
  }, [userProfile]);

  // Refresh when returning to the tab (e.g. after finishing a game)
  useFocusEffect(
    useCallback(() => {
      refreshBestScores();
      void checkAchievementUnlocks();
    }, [refreshBestScores, checkAchievementUnlocks]),
  );

  const handleShare = () => {
    Share.share({
      message: `Join me learning nuclear science on AtomIQ! 🚀`,
    }).catch(() => {});
  };

  const selectedAvatarKey = normalizeProfileAvatarKey(userProfile?.avatar_url);
  const hasChanges = useMemo(() => {
    if (!userProfile) return false;
    const trimmed = profileName.trim();
    const nameChanged = trimmed !== (userProfile.display_name || userProfile.username || "");
    const avatarChanged = pendingAvatarKey !== selectedAvatarKey;
    return (nameChanged || avatarChanged) && !!trimmed;
  }, [profileName, pendingAvatarKey, selectedAvatarKey, userProfile]);

  const openEditModal = () => {
    if (!userProfile) return;
    setProfileName(userProfile.display_name || userProfile.username || "");
    setPendingAvatarKey(selectedAvatarKey);
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!userProfile || isSavingProfile) return;

    const trimmedName = profileName.trim();
    if (!trimmedName) return;

    try {
      setIsSavingProfile(true);
      await updateUserProfile({
        display_name: trimmedName,
        ...(pendingAvatarKey !== selectedAvatarKey
          ? { avatar_url: pendingAvatarKey }
          : {}),
      });
      setEditModalVisible(false);
    } catch {
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const toggleFlip = useCallback(() => {
    flipped.value = withTiming(flipped.value === 1 ? 0 : 1, { duration: DURATION.flip });
  }, [flipped]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateY: `${flipped.value * (reducedMotion ? 0 : 180)}deg` },
    ],
    // Opacity guard — backfaceVisibility alone is unreliable on Android
    opacity: flipped.value < 0.5 ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateY: `${-180 + flipped.value * (reducedMotion ? 0 : 180)}deg` },
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
            onPress={openEditModal}
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

        {/* Profile Card — amber outer wrapper (same as home headerBar) */}
        <Animated.View
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.springify()}
          layout={reducedMotion ? undefined : LinearTransition.duration(DURATION.medium).easing(EASE_OUT)}
          style={styles.profileCard}
        >
          {/* First row: title pill (tap for progress) + stats button — same as home header */}
          <View style={styles.profileCardHeader}>
            <TouchableOpacity
              style={styles.levelPill}
              activeOpacity={0.85}
              onPress={() => setShowTitleProgress((v) => !v)}
            >
              <Icon name="Crown" size={14} color="#FFFFFF" variant="Bold" />
              <Text style={styles.levelPillText}>{userTitle}</Text>
              <Icon
                name={showTitleProgress ? "ArrowUp2" : "ArrowDown2"}
                size={12}
                color="#FFFFFF"
                variant="Bold"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.flipCornerBtn}
              onPress={toggleFlip}
              activeOpacity={0.85}
            >
              <Icon name="ChartSquare" size={19} color="#FF8C00" variant="Bold" />
            </TouchableOpacity>
          </View>

          {/* Inner white card — flips between profile and stats (profile first) */}
          <Animated.View style={cardHeightStyle}>
            {/* Front face — avatar left, lvl + XP on the right */}
            <Animated.View
              onLayout={(e) => setFrontHeight(e.nativeEvent.layout.height)}
              style={[styles.cardFace, frontStyle]}
            >
              <View style={styles.profileRowCompact}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={openEditModal}
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
                <View style={styles.profileInfo}>
                  <Text style={styles.name} numberOfLines={1}>
                    {userProfile.display_name || userProfile.username}
                  </Text>
                  <View style={styles.levelSectionCompact}>
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
                </View>
              </View>
            </Animated.View>

            {/* Back face — stats */}
            <Animated.View
              onLayout={(e) => setBackHeight(e.nativeEvent.layout.height)}
              style={[styles.cardFace, backStyle]}
            >
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

          {/* Title milestone progress — below the profile card, inside same amber wrapper */}
          {showTitleProgress && (
            <Animated.View
              entering={reducedMotion ? FadeIn.duration(120) : FadeIn.duration(DURATION.small)}
              exiting={FadeOut.duration(DURATION.press)}
              layout={reducedMotion ? undefined : LinearTransition.duration(DURATION.medium).easing(EASE_OUT)}
              style={styles.titleProgressPanel}
            >
              <View style={styles.titleProgressHeader}>
                <Text style={styles.titleProgressLabel}>Title progress</Text>
                {titleProgress.next ? (
                  <Text style={styles.titleProgressMeta}>
                    {titleProgress.xpNeeded.toLocaleString()} XP to {titleProgress.next.title}
                  </Text>
                ) : (
                  <Text style={styles.titleProgressMeta}>Highest title reached</Text>
                )}
              </View>

              {titleProgress.next ? (
                <>
                  <View style={styles.titleProgressTrack}>
                    <View
                      style={[
                        styles.titleProgressFill,
                        { width: `${Math.round(titleProgress.progress * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.titleProgressHint}>
                    Level {userLevel} → Level {titleProgress.next.minLevel} · {titleProgress.levelNeeded} level{titleProgress.levelNeeded === 1 ? "" : "s"} to go
                  </Text>
                </>
              ) : (
                <View style={[styles.titleProgressTrack, { backgroundColor: "#FFF3E0" }]}>
                  <View style={[styles.titleProgressFill, { width: "100%" }]} />
                </View>
              )}

              <View style={styles.titleMilestoneList}>
                {TITLE_MILESTONES.map((m, i) => {
                  const isUnlocked = userLevel >= m.minLevel;
                  const isCurrent = i === titleProgress.idx;
                  return (
                    <View
                      key={m.title}
                      style={[
                        styles.titleMilestoneRow,
                        isCurrent && styles.titleMilestoneRowCurrent,
                      ]}
                    >
                      <View
                        style={[
                          styles.titleMilestoneIcon,
                          { backgroundColor: isUnlocked ? `${m.color}22` : "#F4F5F7" },
                          isCurrent && { borderWidth: 2, borderColor: m.color },
                        ]}
                      >
                        <Icon
                          name={m.icon}
                          size={16}
                          color={isUnlocked ? m.color : "#C9CDD3"}
                          variant="Bold"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.titleMilestoneName,
                            isCurrent && { color: m.color },
                            !isUnlocked && { color: "#AAAAAA" },
                          ]}
                        >
                          {m.title}
                        </Text>
                        <Text style={styles.titleMilestoneLevel}>Level {m.minLevel}+</Text>
                      </View>
                      {isUnlocked ? (
                        <Icon name="TickCircle" size={18} color="#22C55E" variant="Bold" />
                      ) : (
                        <Icon name="Lock" size={16} color="#C9CDD3" variant="Bold" />
                      )}
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}
        </Animated.View>

        {/* Streak card */}
        <Animated.View entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(100).springify()}>
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
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(200).springify()}
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
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(250).springify()}
          style={styles.sectionCard}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Game Leaderboard</Text>
            <View style={styles.countPill}>
              <Icon name="Cup" size={13} color="#E67E22" variant="Bold" />
              <Text style={styles.countPillText}>Personal bests</Text>
            </View>
          </View>
          {/* Global ranking — merged from separate card */}
          <TouchableOpacity
            style={[styles.leaderRow, styles.leaderRowDivider]}
            activeOpacity={0.85}
            onPress={() => router.push("/leaderboard")}
          >
            <View style={[styles.leaderIconCircle, { backgroundColor: "#FFF3E0" }]}>
              <Icon name="Cup" size={20} color="#E67E22" variant="Bold" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.leaderTitle}>Ranking</Text>
              <Text style={styles.leaderPlays}>
                Rank #{leaderboardRank} of {NPC_CHARACTERS.length + 1} • Tap to view
              </Text>
            </View>
            <View style={styles.streakArrow}>
              <Icon name="ArrowRight2" size={16} color="#E67E22" variant="Bold" />
            </View>
          </TouchableOpacity>
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

      {/* Edit Profile Modal — beautiful */}
      <Modal
        visible={editModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}
          style={styles.avatarModalOverlay}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={insets.top + 12}
          >
            <Animated.View
              entering={reducedMotion ? FadeIn.duration(200) : ZoomIn.duration(260).easing(EASE_OUT)}
              exiting={FadeOut.duration(150)}
              style={styles.avatarModalContent}
            >
            <View style={styles.dragHandle} />
            <View style={styles.avatarModalHeader}>
              <View style={styles.editHeaderLeft}>
                <View style={styles.editHeaderIcon}>
                  <Icon name="Edit2" size={16} color="#FF8C00" variant="Bold" />
                </View>
                <Text style={styles.avatarModalTitle}>Edit Profile</Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.closeButtonNew}
                activeOpacity={0.85}
              >
                <Icon name="CloseCircle" size={20} color="#9CA3AF" variant="Bold" />
              </TouchableOpacity>
            </View>

            {/* Live preview — amber outer like profile card */}
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Preview</Text>
              <View style={styles.previewInner}>
                <View style={styles.previewAvatarWrap}>
                  <Image
                    source={getProfileAvatarSource(pendingAvatarKey)}
                    style={styles.previewAvatar}
                    resizeMode="cover"
                  />
                  <View style={styles.previewLevelBadge}>
                    <Text style={styles.previewLevelText}>{userLevel}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewName} numberOfLines={1}>
                    {profileName.trim() || "Your name"}
                  </Text>
                  <Text style={styles.previewTitle}>{userTitle}</Text>
                  <View style={styles.previewXpRow}>
                    <Icon name="Flash" size={12} color="#E67E22" variant="Bold" />
                    <Text style={styles.previewXp}>{(userProfile?.total_xp || 0).toLocaleString()} XP</Text>
                  </View>
                </View>
                <View style={styles.previewCheck}>
                  <Icon name="Eye" size={16} color="#FF8C00" variant="Bold" />
                </View>
              </View>
            </View>

            <View style={styles.nameFieldSection}>
              <View style={styles.nameFieldHeader}>
                <Text style={styles.nameFieldLabel}>Display Name</Text>
                <Text style={styles.charCount}>{profileName.length}/24</Text>
              </View>
              <View style={styles.nameInputWrap}>
                <TextInput
                  style={styles.nameInput}
                  value={profileName}
                  onChangeText={setProfileName}
                  placeholder="Your display name"
                  placeholderTextColor={THEME.textMuted}
                  maxLength={24}
                  autoCorrect={false}
                  returnKeyType="done"
                />
                {profileName.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setProfileName("")}
                    style={styles.clearButton}
                    activeOpacity={0.7}
                  >
                    <Icon name="CloseCircle" size={18} color="#C9CDD3" variant="Bold" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.avatarSectionHeader}>
              <Text style={styles.nameFieldLabel}>Choose Avatar</Text>
              <Text style={styles.avatarCount}>{PROFILE_AVATAR_OPTIONS.length} options</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.avatarOptionsWrap}
              style={styles.avatarScroll}
            >
              {PROFILE_AVATAR_OPTIONS.map((avatarOption, index) => {
                const isSelected = pendingAvatarKey === avatarOption.key;

                return (
                  <Animated.View
                    key={avatarOption.key}
                    entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(index * 24).springify()}
                    layout={reducedMotion ? undefined : LinearTransition.duration(DURATION.small).easing(EASE_OUT)}
                    style={styles.avatarOptionWrapper}
                  >
                    <TouchableOpacity
                      style={[
                        styles.avatarModalOption,
                        isSelected && styles.avatarModalOptionSelected,
                        isSavingProfile && styles.avatarModalOptionDisabled,
                      ]}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setPendingAvatarKey(avatarOption.key);
                      }}
                      activeOpacity={0.85}
                      disabled={isSavingProfile}
                    >
                      <Image
                        source={avatarOption.source}
                        style={styles.avatarModalOptionImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    {isSelected && (
                      <Animated.View
                        entering={ZoomIn.springify()}
                        style={styles.avatarModalCheck}
                      >
                        <Icon name="TickCircle" size={16} color="#FFFFFF" variant="Bold" />
                      </Animated.View>
                    )}
                  </Animated.View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (!hasChanges || isSavingProfile) && styles.saveButtonDisabled,
              ]}
              onPress={() => void handleSaveProfile()}
              activeOpacity={0.85}
              disabled={!hasChanges || isSavingProfile}
            >
              {isSavingProfile ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.saveButtonContent}>
                  <Icon
                    name={hasChanges ? "TickCircle" : "InfoCircle"}
                    size={18}
                    color="#FFFFFF"
                    variant="Bold"
                  />
                  <Text style={styles.saveButtonText}>{hasChanges ? "Save Changes" : "No changes yet"}</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      {/* Achievement unlocked celebration */}
      {celebrationAwards != null && celebrationAwards.length > 0 && (
        <View style={styles.celebrationOverlay}>
          <Animated.View
            entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.springify().delay(80)}
            style={styles.celebrationCard}
          >
            <View style={styles.celebrationIconWrap}>
              <Icon name="Award" size={34} color="#FFC800" variant="Bold" />
            </View>
            <Text style={styles.celebrationTitle}>Achievement Unlocked!</Text>
            {celebrationAwards.map((badge) => (
              <View key={badge.id} style={styles.celebrationRow}>
                <View
                  style={[
                    styles.celebrationBadge,
                    { backgroundColor: `${badge.color}22` },
                  ]}
                >
                  <Icon
                    name={badge.icon}
                    size={24}
                    color={badge.color}
                    variant="Bold"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.celebrationBadgeTitle}>{badge.title}</Text>
                  <Text style={styles.celebrationBadgeReq}>
                    {badge.requirement}
                  </Text>
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={styles.celebrationButton}
              activeOpacity={0.85}
              onPress={() => setCelebrationAwards(null)}
            >
              <Text style={styles.celebrationButtonText}>Awesome!</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
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
    /* Flip card shell — amber outer like home's headerBar */
    profileCard: {
      marginHorizontal: 20,
      backgroundColor: "#FFCA5F",
      borderRadius: 26,
      padding: 10,
      gap: 10,
      elevation: 4,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    },
    profileCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 4,
      paddingTop: 2,
      paddingBottom: 2,
    },
    levelPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#434343",
      paddingHorizontal: 12,
      height: 40,
      borderRadius: 14,
    },
    levelPillText: {
      fontSize: 13,
      fontFamily: fontFamilies.heavy,
      color: "#FFFFFF",
    },
    titleProgressPanel: {
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 14,
      borderWidth: 2,
      borderColor: "#E5E7EB",
      borderBottomWidth: 4,
      gap: 10,
    },
    titleProgressHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    titleProgressLabel: {
      fontSize: 10,
      fontFamily: fontFamilies.heavy,
      color: "#9CA3AF",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    titleProgressMeta: {
      fontSize: 11,
      fontFamily: fontFamilies.bold,
      color: "#E67E22",
    },
    titleProgressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: "#FFF3E0",
      overflow: "hidden",
    },
    titleProgressFill: {
      height: "100%",
      borderRadius: 4,
      backgroundColor: "#FF8C00",
    },
    titleProgressHint: {
      fontSize: 11,
      fontFamily: fontFamilies.semibold,
      color: "#888888",
    },
    titleMilestoneList: {
      gap: 8,
      marginTop: 2,
    },
    titleMilestoneRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: "#F9FAFB",
    },
    titleMilestoneRowCurrent: {
      backgroundColor: "#FFF3E0",
    },
    titleMilestoneIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    titleMilestoneName: {
      fontSize: 13,
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    titleMilestoneLevel: {
      fontSize: 11,
      fontFamily: fontFamilies.semibold,
      color: "#9CA3AF",
      marginTop: 1,
    },
    flipClip: {
      position: "relative",
      minHeight: 240,
    },
    cardFace: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      padding: 16,
      borderWidth: 2,
      borderColor: "#E5E7EB",
      borderBottomWidth: 4,
      backfaceVisibility: "hidden",
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    profileRowCompact: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    profileInfo: {
      flex: 1,
      gap: 2,
    },
    levelSectionCompact: {
      marginTop: 8,
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
      fontFamily: fontFamilies.heavy,
      fontSize: 12,
    },
    name: {
      fontSize: 20,
      fontFamily: fontFamilies.heavy,
      color: "#333333",
      marginBottom: 2,
    },
    title: {
      fontSize: 13,
      color: "#888888",
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
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    levelXp: {
      fontSize: 12,
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
      fontFamily: fontFamilies.semibold,
      color: "#888888",
      marginTop: 6,
    },
    flipCornerBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#FFDD8D",
      borderBottomWidth: 4,
    },
    profileTextCol: {
      flex: 1,
      paddingRight: 36,
    },
    /* Stats (back face) */
    statsTitle: {
      fontSize: 16,
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
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    statLabel: {
      fontSize: 12,
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
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    streakSub: {
      fontSize: 12,
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
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    leaderPlays: {
      fontSize: 11,
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
      fontFamily: fontFamilies.heavy,
      color: "#555555",
    },
    leaderScoreTextTop: {
      color: "#E67E22",
    },
    leaderNoScore: {
      fontSize: 14,
      fontFamily: fontFamilies.heavy,
      color: "#C9CDD3",
    },

    /* Achievement unlocked celebration */
    celebrationOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.55)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      zIndex: 50,
    },
    celebrationCard: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      padding: 24,
      alignItems: "center",
      elevation: 10,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
    },
    celebrationIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "#FFF9E5",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    celebrationTitle: {
      fontSize: 18,
      fontFamily: fontFamilies.heavy,
      color: "#333333",
      marginBottom: 16,
    },
    celebrationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      width: "100%",
      backgroundColor: "#F4F5F7",
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
    },
    celebrationBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    celebrationBadgeTitle: {
      fontSize: 14,
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    celebrationBadgeReq: {
      fontSize: 11,
      fontFamily: fontFamilies.semibold,
      color: "#888888",
      marginTop: 1,
    },
    celebrationButton: {
      width: "100%",
      backgroundColor: "#FF8C00",
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 6,
    },
    celebrationButtonText: {
      fontSize: 15,
      fontFamily: fontFamilies.heavy,
      color: "#FFFFFF",
    },

    /* Avatar picker modal — beautiful */
    avatarModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    keyboardAvoidingView: {
      flex: 1,
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    avatarModalContent: {
      width: "100%",
      maxWidth: 380,
      maxHeight: "82%",
      backgroundColor: "#FFFFFF",
      borderRadius: 26,
      padding: 16,
      paddingTop: 12,
      borderWidth: 2,
      borderColor: "#E5E7EB",
      borderBottomWidth: 4,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 10,
      overflow: "hidden",
      flexShrink: 1,
    },
    dragHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#E5E7EB",
      alignSelf: "center",
      marginBottom: 8,
    },
    avatarModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    editHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    editHeaderIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#FFF3E0",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarModalTitle: {
      fontSize: 18,
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    closeButton: {
      padding: 4,
    },
    closeButtonNew: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#F9FAFB",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#E5E7EB",
    },
    previewCard: {
      backgroundColor: "#FFCA5F",
      borderRadius: 20,
      padding: 10,
      gap: 6,
      marginBottom: 12,
    },
    previewLabel: {
      fontSize: 10,
      fontFamily: fontFamilies.heavy,
      color: "#724D06",
      textTransform: "uppercase",
      letterSpacing: 0.7,
      paddingHorizontal: 4,
    },
    previewInner: {
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 12,
      borderWidth: 2,
      borderColor: "#E5E7EB",
      borderBottomWidth: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    previewAvatarWrap: {
      position: "relative",
    },
    previewAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "#FFF3E0",
      borderWidth: 2,
      borderColor: "#FFF3E0",
    },
    previewLevelBadge: {
      position: "absolute",
      bottom: -4,
      right: -4,
      backgroundColor: "#FF8C00",
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#FFFFFF",
    },
    previewLevelText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontFamily: fontFamilies.heavy,
    },
    previewName: {
      fontSize: 16,
      fontFamily: fontFamilies.heavy,
      color: "#333333",
      marginBottom: 2,
    },
    previewTitle: {
      fontSize: 12,
      fontFamily: fontFamilies.semibold,
      color: "#888888",
    },
    previewXpRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 4,
    },
    previewXp: {
      fontSize: 11,
      fontFamily: fontFamilies.bold,
      color: "#E67E22",
    },
    previewCheck: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "#FFF3E0",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarModalGrid: {
      paddingTop: 4,
      paddingBottom: 8,
    },
    nameFieldSection: {
      marginBottom: 14,
    },
    nameFieldHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    nameFieldLabel: {
      fontSize: 12,
      fontFamily: fontFamilies.heavy,
      color: "#9CA3AF",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    charCount: {
      fontSize: 11,
      fontFamily: fontFamilies.semibold,
      color: "#9CA3AF",
    },
    nameInputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingRight: 8,
    },
    nameInput: {
      flex: 1,
      backgroundColor: "transparent",
      borderWidth: 0,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: fontFamilies.semibold,
      color: theme.text,
    },
    clearButton: {
      padding: 6,
    },
    avatarSectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
      marginTop: 4,
    },
    avatarCount: {
      fontSize: 11,
      fontFamily: fontFamilies.semibold,
      color: "#9CA3AF",
    },
    avatarOptionsWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 4,
      paddingVertical: 8,
      paddingRight: 16,
    },
    avatarScroll: {
      height: 88,
      flexGrow: 0,
      flexShrink: 0,
      marginTop: 4,
    },
    avatarOptionWrapper: {
      position: "relative",
      width: 72,
      height: 72,
    },
    saveButton: {
      marginTop: 12,
      alignSelf: "stretch",
      backgroundColor: "#FF8C00",
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#FF8C00",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
      flexShrink: 0,
    },
    saveButtonDisabled: {
      opacity: 0.4,
      shadowOpacity: 0,
      elevation: 0,
    },
    saveButtonContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    saveButtonText: {
      fontSize: 16,
      fontFamily: fontFamilies.heavy,
      color: "#FFFFFF",
    },
    avatarModalOption: {
      width: 72,
      height: 72,
      borderRadius: 36,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: "#E5E7EB",
      backgroundColor: "#FFFFFF",
    },
    avatarModalOptionSelected: {
      borderColor: "#FF8C00",
      borderWidth: 3,
      shadowColor: "#FF8C00",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
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
      bottom: -2,
      right: -2,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "#22C55E",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#FFFFFF",
    },
  });
