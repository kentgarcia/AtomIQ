import { Avatar } from "@/components/avatar/Avatar";
import { FieldInput } from "@/components/ui/field-input";
import { Icon } from "@/components/ui/icon";
import { HeaderButton, ScreenHeader, useHeaderBorder, useTabBarInset } from "@/components/layout";
import {useTheme, type Theme, fontFaces, useResponsiveLayout} from "@/theme";
import { DIALOG_SETTLE_MS, LEVEL_UNLOCKS, RANK_UP, rankUpStart } from "@/components/celebration/celebration-core";
import { LEVEL_UP_BODY_STYLE, LevelUpBody, LevelUpButton } from "@/components/celebration/LevelUpBody";
import { normalizeAvatar } from "@/components/avatar/avatar-core";
import { itemsUnlockedBetween } from "@/components/shop/shop-core";
import { RankUpBadge } from "@/components/celebration/RankUpBadge";
import { Reveal } from "@/components/motion/Reveal";
import { ModalButton, ModalSecondaryButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { BadgePicker } from "@/components/profile/BadgePicker";
import { AchievementsSection } from "@/components/profile/AchievementsSection";
import { PassportCard } from "@/components/profile/PassportCard";
import { StreakCard } from "@/components/profile/StreakCard";
import { passportNumber, resolveShowcase } from "@/components/profile/passport-core";
import { useAchievementValues } from "@/hooks/use-achievement-values";
import {
  ACHIEVEMENTS,
  achievementById,
  achievementValue,
  levelUps,
  levelsFromProfile,
  mergeLevels,
  progressFor,
  type LevelUp,
} from "@/services/achievements-core";
import { getAchievementLevels, getShowcaseBadgeIds, setAchievementLevels, setShowcaseBadgeIds } from "@/services/storage";
import { useStorage } from "@/services/StorageContext";
import { useFocusEffect, useIsFocused, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "@/components/ui/text";
import Animated, {
    FadeIn,
    FadeOut,
    LinearTransition,
    useReducedMotion,
} from "react-native-reanimated";
import { DURATION, EASE_OUT } from "@/theme/motion";
import { playSfx } from "@/services/sfx";
import { useTutorialTarget } from "@/components/tutorial/use-tutorial-target";
import { LockedDialog } from "@/components/ui/locked-dialog";
import { loadPhoneProgress } from "@/services/phone";
import { PHONE_APPS, isUnlocked, unlockRequirement, type PhoneProgress } from "@/services/phone-core";

export default function ProfileScreen() {
  const router = useRouter();
  const { contentMaxWidth } = useResponsiveLayout();
  const tabBarInset = useTabBarInset();
  const reducedMotion = useReducedMotion();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const {
    userProfile,
    updateUserProfile,
    levelUpLevel,
    levelUpFrom,
    dismissLevelUp,
  } = useStorage();
  const { theme } = useTheme();
  // Shrodi's first visit lights the passport, its badges and its flip button (docs/features/TUTORIAL_SPEC.md §5.4)
  const passportLit = useTutorialTarget("profile.passport", { radius: 24 });
  const badgesLit = useTutorialTarget("profile.badges", { radius: 20 });
  const flipLit = useTutorialTarget("profile.flip", { radius: "round" });

  // The Shop button is locked until the Shop is on the phone (the same rule as its app icon)
  const shopApp = PHONE_APPS.find((a) => a.id === "shop");
  const [phoneProgress, setPhoneProgress] = useState<PhoneProgress | null>(null);
  const [shopLockOpen, setShopLockOpen] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void loadPhoneProgress()
        .then((p) => alive && setPhoneProgress(p))
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, []),
  );
  const shopLocked = !!shopApp && !!phoneProgress && !isUnlocked(shopApp.unlock, phoneProgress);
  const shopRequirement = shopApp && phoneProgress ? unlockRequirement(shopApp.unlock, phoneProgress) : null;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [profileName, setProfileName] = useState("");

  // Same page background as the Home map: text placed straight on it uses the normal text colours
  const bgColor = theme.colors.mapBackground;

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
  const passportNo = useMemo(
    () => passportNumber(userProfile?.friend_code, userProfile?.user_id ?? ""),
    [userProfile?.friend_code, userProfile?.user_id],
  );

  // Title milestones — tap the title pill to see progress
  const [showTitleProgress, setShowTitleProgress] = useState(false);
  const TITLE_MILESTONES = useMemo(
    () => [
      { title: "Atomic Novice", minLevel: 1, icon: "Star", color: "#64B5F6" },
      { title: "Isotope Initiate", minLevel: 5, icon: "Flash", color: "#EA580C" },
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
        color: "#C2410C",
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

  const achievementValues = useAchievementValues();

  // Achievements that ranked up, celebrated once via overlay on this screen
  const [celebrationAwards, setCelebrationAwards] = useState<LevelUp[] | null>(null);
  // One celebration at a time: the level-up dialog goes first, the badges wait until it has closed
  // (and had a moment to shrink away, so two modals are never on screen together)
  const [levelUpGone, setLevelUpGone] = useState(levelUpLevel === null);
  if (levelUpLevel !== null && levelUpGone) setLevelUpGone(false);
  useEffect(() => {
    if (levelUpLevel !== null) return;
    const id = setTimeout(() => setLevelUpGone(true), 450);
    return () => clearTimeout(id);
  }, [levelUpLevel]);
  // The dialog opens only while Profile is on screen, so its show (which starts when it mounts)
  // is seen from the first frame instead of playing out behind another tab
  const focused = useIsFocused();
  const levelUpOpen = levelUpLevel !== null && focused;
  // What the level(s) just gained opened in the shop; held while the dialog closes so it does not change as it shrinks
  const opened = useMemo(() => (levelUpLevel === null ? null : itemsUnlockedBetween(levelUpFrom ?? levelUpLevel - 1, levelUpLevel)), [levelUpLevel, levelUpFrom]);
  const [unlockedItems, setUnlockedItems] = useState(opened ?? []);
  if (opened !== null && opened !== unlockedItems) setUnlockedItems(opened);
  const unlockedTiles = Math.min(LEVEL_UNLOCKS.max, unlockedItems.length);
  const avatarLook = useMemo(() => normalizeAvatar(userProfile?.avatar_url), [userProfile?.avatar_url]);
  const badgesOpen = celebrationAwards != null && celebrationAwards.length > 0 && focused && levelUpLevel === null && levelUpGone;
  // The fanfares when each dialog opens (the dialog adds its own opening sound)
  useEffect(() => {
    if (levelUpOpen) void playSfx("reward.level-up");
  }, [levelUpOpen]);
  useEffect(() => {
    if (badgesOpen) void playSfx("reward.rank-up");
  }, [badgesOpen]);

  // Awards: every achievement's level, from the profile's numbers
  const awards = useMemo(() => {
    return ACHIEVEMENTS.map((track) => ({ track, progress: progressFor(track, achievementValue(track, achievementValues)) }));
  }, [achievementValues]);
  // Badges on the passport: what the explorer picked, else their three best (see resolveShowcase)
  const [showcaseIds, setShowcaseIds] = useState<number[] | null>(null);
  const [badgePickerOpen, setBadgePickerOpen] = useState(false);
  const showcase = useMemo(() => {
    const earned = awards.filter((a) => a.progress.earned).map((a) => ({ id: a.track.id, level: a.progress.level }));
    const ids = resolveShowcase(showcaseIds, earned);
    return ids.flatMap((id) => {
      const a = awards.find((x) => x.track.id === id);
      return a ? [{ track: a.track, level: a.progress.badgeLevel }] : [];
    });
  }, [awards, showcaseIds]);
  const saveShowcase = useCallback((ids: number[]) => {
    setShowcaseIds(ids);
    setBadgePickerOpen(false);
    setShowcaseBadgeIds(ids).catch((error) => console.error("Failed to save showcased badges:", error));
  }, []);

  const checkAchievementUnlocks = useCallback(async () => {
    if (!achievementValues) return;
    const now = levelsFromProfile(achievementValues);
    const stored = await getAchievementLevels();

    // First run ever: treat the current levels as the baseline, no retroactive party.
    if (stored === null) {
      await setAchievementLevels(now);
      return;
    }

    const ups = levelUps(stored, now);
    if (ups.length === 0) return;

    setCelebrationAwards(ups);
    await setAchievementLevels(mergeLevels(stored, now));
  }, [achievementValues]);

  // Refresh when returning to the tab (e.g. after finishing a game)
  useFocusEffect(
    useCallback(() => {
      void checkAchievementUnlocks();
      getShowcaseBadgeIds()
        .then(setShowcaseIds)
        .catch(() => {});
    }, [checkAchievementUnlocks]),
  );

  const hasChanges = useMemo(() => {
    if (!userProfile) return false;
    const trimmed = profileName.trim();
    return !!trimmed && trimmed !== (userProfile.display_name || userProfile.username || "");
  }, [profileName, userProfile]);

  const openEditModal = () => {
    if (!userProfile) return;
    setProfileName(userProfile.display_name || userProfile.username || "");
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!userProfile || isSavingProfile) return;

    const trimmedName = profileName.trim();
    if (!trimmedName) return;

    try {
      setIsSavingProfile(true);
      await updateUserProfile({ display_name: trimmedName });
      setEditModalVisible(false);
    } catch (error) {
      // Display names are rate-limited to one change per 7 days: say so instead of a generic failure.
      const cooldown = error as { code?: string; nextAllowedAt?: number };
      if (cooldown?.code === "DISPLAY_NAME_COOLDOWN") {
        const nextDate = cooldown.nextAllowedAt
          ? new Date(cooldown.nextAllowedAt).toLocaleDateString()
          : null;
        Alert.alert(
          "Display name limited",
          nextDate
            ? `Names can only be changed once every 7 days. You can pick a new name on ${nextDate}.`
            : "Display name can only be changed once every 7 days.",
        );
      } else {
        Alert.alert("Error", "Failed to update profile.");
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!userProfile) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bgColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: theme.colors.text, fontSize: 16, ...fontFaces.heavy }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScreenHeader
        title="Profile"
        scrolled={scrolled}
        right={
          <View style={styles.headerActions}>
            {shopLocked ? (
              <View>
                <HeaderButton icon="Shop" label="Shop, locked" color={theme.colors.textFaint} onPress={() => setShopLockOpen(true)} />
                <View pointerEvents="none" style={styles.shopLockBadge}>
                  <Icon name="Lock" size={10} color={theme.colors.textMuted} variant="Bold" />
                </View>
              </View>
            ) : (
              <HeaderButton icon="Shop" label="Shop" onPress={() => router.push("/shop")} />
            )}
            <HeaderButton icon="Edit2" label="Edit profile" onPress={openEditModal} />
            <HeaderButton icon="Setting" label="Settings" onPress={() => router.push("/settings")} />
          </View>
        }
      />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          /* Cap the readable width on tablets without adding a second gutter;
             the cards already carry their own 20 dp margins. */
          { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" },
          /* Clear the measured tab bar so the last card isn't covered */
          { paddingBottom: tabBarInset + 16 },
        ]}
      >
        {/* Edit and Settings are on the passport; the header above adds the safe-area inset */}
        <View style={{ height: 8 }} />

        {/* Explorer passport (front: profile, back: stats) */}
        <View ref={passportLit.ref} collapsable={false}>
        <PassportCard
          name={userProfile.display_name || userProfile.username}
          title={userTitle}
          level={userLevel}
          xp={userProfile.total_xp}
          levelProgress={levelProgress}
          streak={userProfile.current_streak}
          passportNo={passportNo}
          avatar={userProfile.avatar_url}
          badges={showcase}
          badgesRef={badgesLit.ref}
          flipRef={flipLit.ref}
          stats={stats}
          titleOpen={showTitleProgress}
          onToggleTitle={() => setShowTitleProgress((v) => !v)}
          onEdit={openEditModal}
          onPickBadges={() => setBadgePickerOpen(true)}
        />
        </View>

          {/* Rank progress — opens under the passport when the rank is tapped */}
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
                <View style={[styles.titleProgressTrack, { backgroundColor: theme.colors.surfaceSoft }]}>
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
                          { backgroundColor: isUnlocked ? `${m.color}22` : theme.colors.surfaceSoft },
                          isCurrent && { borderWidth: 2, borderColor: m.color },
                        ]}
                      >
                        <Icon
                          name={m.icon}
                          size={16}
                          color={isUnlocked ? m.color : theme.colors.textFaint}
                          variant="Bold"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.titleMilestoneName,
                            isCurrent && { color: m.color },
                            !isUnlocked && { color: theme.colors.textFaint },
                          ]}
                        >
                          {m.title}
                        </Text>
                        <Text style={styles.titleMilestoneLevel}>Level {m.minLevel}+</Text>
                      </View>
                      {isUnlocked ? (
                        <Icon name="TickCircle" size={18} color="#22C55E" variant="Bold" />
                      ) : (
                        <Icon name="Lock" size={16} color={theme.colors.textFaint} variant="Bold" />
                      )}
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}

        {/* Streak and the last 14 days, in one widget */}
        <StreakCard streak={userProfile.current_streak} longest={userProfile.longest_streak || 0} />

        {/* Every achievement, flat on the page */}
        <View style={styles.achievements}>
          <AchievementsSection />
        </View>
      </ScrollView>

      <LockedDialog visible={shopLockOpen} title="Shop" text={shopRequirement?.text ?? "Finish your first lesson."} progress={shopRequirement?.progress} onClose={() => setShopLockOpen(false)} />

      <BadgePicker
        visible={badgePickerOpen}
        badges={awards}
        selected={showcase.map((b) => b.track.id)}
        onSave={saveShowcase}
        onClose={() => setBadgePickerOpen(false)}
      />

      {/* Edit Profile: a ModalDialog (the house modal design, see components/ui/modal-card.tsx) */}
      <ModalDialog
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        title="Edit Profile"
        closeLabel="Close edit profile"
        footer={
          <ModalButton
            label={isSavingProfile ? "Saving…" : hasChanges ? "Save changes" : "No changes yet"}
            disabled={!hasChanges || isSavingProfile}
            onPress={() => void handleSaveProfile()}
          />
        }
      >
        {/* Live preview: the passport's photo and name, as they will look */}
        <View style={styles.preview}>
          <View style={styles.previewPhotoWrap}>
            <View style={styles.previewPhotoFrame}>
              <Avatar value={userProfile.avatar_url} size={60} radius={17} />
            </View>
            <View style={styles.previewLevelBadge}>
              <Text style={styles.previewLevelText}>{userLevel}</Text>
            </View>
          </View>
          <View style={styles.previewText}>
            <Text style={styles.previewName} numberOfLines={1}>
              {profileName.trim() || "Your name"}
            </Text>
            <Text style={styles.previewTitle}>{userTitle}</Text>
            <Text style={styles.previewXp}>{(userProfile?.total_xp || 0).toLocaleString()} XP</Text>
          </View>
        </View>

        <View style={styles.nameFieldSection}>
          <View style={styles.nameFieldHeader}>
            <Text style={styles.nameFieldLabel}>Display name</Text>
            <Text style={styles.charCount}>{profileName.length}/24</Text>
          </View>
          <View style={styles.nameInputWrap}>
            <FieldInput
              style={styles.nameInput}
              value={profileName}
              onChangeText={setProfileName}
              placeholder="Your display name"
              maxLength={24}
              autoCorrect={false}
              returnKeyType="done"
              accessibilityLabel="Display name"
            />
            {profileName.length > 0 && (
              <TouchableOpacity
                onPress={() => setProfileName("")}
                style={styles.clearButton}
                activeOpacity={0.7}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear display name"
              >
                <Icon name="CloseCircle" size={18} color={theme.colors.textFaint} variant="Bold" />
              </TouchableOpacity>
            )}
          </View>
          {userProfile?.next_display_name_change_at &&
          // eslint-disable-next-line react-hooks/purity -- cooldown is compared to the current clock at render time
          userProfile.next_display_name_change_at > Date.now() ? (
            <Text style={styles.nameCooldownHint}>
              Name can be changed again on{" "}
              {new Date(
                userProfile.next_display_name_change_at,
              ).toLocaleDateString()}
            </Text>
          ) : null}
        </View>
      </ModalDialog>

      {/* Level up: the house modal, shown once when XP crosses a level boundary (before any badge dialog) */}
      <ModalDialog
        visible={levelUpOpen}
        onClose={dismissLevelUp}
        title="Level up!"
        closeLabel="Keep going"
        bodyStyle={LEVEL_UP_BODY_STYLE}
        footer={
          <LevelUpButton tiles={unlockedTiles}>
            <ModalButton label="Keep going" onPress={dismissLevelUp} />
            {unlockedItems.length > 0 && !shopLocked ? (
              <ModalSecondaryButton
                label="See them in the shop"
                onPress={() => {
                  dismissLevelUp();
                  router.push("/shop");
                }}
              />
            ) : null}
          </LevelUpButton>
        }
      >
        <LevelUpBody level={levelUpLevel ?? 0} from={levelUpFrom ?? undefined} xpIntoLevel={(userProfile?.total_xp ?? 0) % 100} unlocked={unlockedItems} look={avatarLook} />
      </ModalDialog>

      {/* Badge ranked up: the house modal */}
      <ModalDialog
        visible={badgesOpen}
        onClose={() => setCelebrationAwards(null)}
        title={celebrationAwards != null && celebrationAwards.length > 1 ? "Badges ranked up!" : "Badge ranked up!"}
        closeLabel="Awesome"
        bodyStyle={{ paddingTop: 32 }}
        footer={<ModalButton label="Awesome!" onPress={() => setCelebrationAwards(null)} />}
      >
        {(celebrationAwards ?? []).map((up, i) => {
          const track = achievementById(up.id);
          if (!track) return null;
          // The first few badges play their rank-up one after another; the rest are plain
          const textAt = i < RANK_UP.maxAnimated ? DIALOG_SETTLE_MS + rankUpStart(i) + RANK_UP.text : 0;
          return (
            <View key={up.id} style={styles.celebrationRow}>
              <RankUpBadge track={track} from={up.from} to={up.to} index={i} size={56} />
              <Reveal at={textAt} style={{ flex: 1 }}>
                <Text style={styles.celebrationBadgeTitle}>
                  {track.title} · Level {up.to}
                </Text>
                <Text style={styles.celebrationBadgeReq}>
                  {track.requirement(track.tiers[up.to - 1])}
                </Text>
              </Reveal>
            </View>
          );
        })}
      </ModalDialog>
    </View>
  );
}

const createStyles = (theme: Theme) => {
  /* Shared mode-aware neutral surfaces — brand accents stay identical */
  const P = theme.palettes.ui;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.mapBackground,
    },
    bgGradient: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    achievements: { marginHorizontal: 24, marginTop: 32 },
    headerActions: { flexDirection: "row", alignItems: "center" },
    shopLockBadge: {
      position: "absolute",
      right: 2,
      bottom: 2,
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    titleProgressPanel: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: P.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 2,
      borderColor: P.border,
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
      ...fontFaces.heavy,
      color: P.faint,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    titleProgressMeta: {
      fontSize: 11,
      ...fontFaces.bold,
      color: "#C2410C",
    },
    titleProgressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: P.soft,
      overflow: "hidden",
    },
    titleProgressFill: {
      height: "100%",
      borderRadius: 4,
      backgroundColor: "#EA580C",
    },
    titleProgressHint: {
      fontSize: 11,
      ...fontFaces.semibold,
      color: P.muted,
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
      backgroundColor: P.soft,
    },
    titleMilestoneRowCurrent: {
      backgroundColor: P.soft,
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
      ...fontFaces.heavy,
      color: P.text,
    },
    titleMilestoneLevel: {
      fontSize: 11,
      ...fontFaces.semibold,
      color: P.faint,
      marginTop: 1,
    },
    /* Badge ranked-up modal content (the card, header and button are the house ModalDialog) */
    celebrationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      width: "100%",
      backgroundColor: P.soft,
      borderRadius: 14,
      padding: 12,
    },
    celebrationBadgeTitle: {
      fontSize: 14,
      ...fontFaces.heavy,
      color: P.text,
    },
    celebrationBadgeReq: {
      fontSize: 11,
      ...fontFaces.semibold,
      color: P.muted,
      marginTop: 1,
    },

    /* Edit profile modal (a ModalDialog; these are its content) */

    preview: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 12,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceSoft,
    },
    previewPhotoWrap: { padding: 3 },
    /* The same tilted white frame as the passport's photo */
    previewPhotoFrame: {
      padding: 3,
      borderRadius: 22,
      backgroundColor: theme.colors.card,
      borderWidth: 2,
      borderColor: theme.colors.border,
      transform: [{ rotate: "-6deg" }],
    },
    previewLevelBadge: {
      position: "absolute",
      bottom: -3,
      right: -3,
      minWidth: 24,
      height: 24,
      paddingHorizontal: 4,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      borderWidth: 2,
      borderColor: theme.colors.surfaceSoft,
    },
    previewLevelText: { color: theme.colors.onPrimary, fontSize: 11, ...fontFaces.heavy },
    previewText: { flex: 1, gap: 1 },
    previewName: { fontSize: 18, ...fontFaces.heavy, color: theme.colors.text },
    previewTitle: { fontSize: 13, ...fontFaces.bold, color: theme.colors.textMuted },
    previewXp: { fontSize: 12, ...fontFaces.bold, color: theme.colors.primaryDark },

    nameFieldSection: {},
    nameFieldHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    nameFieldLabel: {
      fontSize: 13,
      ...fontFaces.semibold,
      color: theme.colors.textMuted,
    },
    charCount: {
      fontSize: 12,
      ...fontFaces.semibold,
      color: theme.colors.textFaint,
    },
    /* A plain rounded field, no border */
    nameInputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.field,
      borderRadius: 14,
      minHeight: 56,
      paddingRight: 8,
    },
    nameInput: {
      flex: 1,
      backgroundColor: "transparent",
      borderWidth: 0,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      ...fontFaces.semibold,
      color: theme.colors.fieldText,
    },
    clearButton: {
      padding: 6,
    },
    nameCooldownHint: {
      fontSize: 12,
      ...fontFaces.medium,
      color: theme.colors.textFaint,
      marginTop: 6,
    },
  });
};
