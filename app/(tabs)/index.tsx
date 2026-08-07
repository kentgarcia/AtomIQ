import { ActionButton, SectionHeader } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { UNITS } from "@/content/units";
import { getLessonById } from "@/content/lessons";
import { colors, fontFamilies, useTheme, withAlpha, type Palette } from "@/theme";
import { useAllLevels } from "@/hooks/use-storage";
import {
    getLeaderboardSnapshot,
    saveLeaderboardSnapshot,
} from "@/services/database";
import { getProfileAvatarSource } from "@/services/profile-avatars";
import { useStorage } from "@/services/StorageContext";
import { isSupabaseConfigured, supabase } from "@/services/supabase";
import { Tables } from "@/services/supabase.types";
import { useFocusEffect } from "@react-navigation/native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type LeaderEntry = {
  userId?: string;
  name: string;
  title: string;
  xp: number;
  avatar?: string;
  isUser?: boolean;
  isNPC?: boolean;
  rank?: number;
};

type LeaderboardSourceUser = Pick<
  Tables<"users">,
  "user_id" | "username" | "avatar_url" | "total_xp" | "is_npc"
>;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userProfile, isDatabaseReady } = useStorage();
  const { levels, refresh } = useAllLevels();
  const { theme } = useTheme();
  const [leaderboardPreview, setLeaderboardPreview] = useState<{
    topThree: LeaderEntry[];
    userRank?: LeaderEntry | undefined;
  }>({ topThree: [] });
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const THEME = theme.palettes.tab;
  const styles = useMemo(() => createStyles(THEME), [THEME]);

  // Refresh levels whenever the tab/screen gains focus so progress is up to date
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Calculate current progress
  const currentProgress = useMemo(() => {
    const completedLessonIds = levels
      .filter((l) => l.status === "completed")
      .map((l) => l.id);

    // Find the current unit and lesson
    let currentUnit = UNITS[0];
    let currentLessonIndex = 0;
    let totalLessonsInUnit = currentUnit.lessonIds.length;
    let completedInCurrentUnit = 0;

    for (const unit of UNITS) {
      const completedInUnit = unit.lessonIds.filter((id) =>
        completedLessonIds.includes(id),
      ).length;
      const totalInUnit = unit.lessonIds.length;

      if (completedInUnit < totalInUnit) {
        // This is the current unit
        currentUnit = unit;
        currentLessonIndex = completedInUnit;
        totalLessonsInUnit = totalInUnit;
        completedInCurrentUnit = completedInUnit;
        break;
      }
    }

    const progressPercentage =
      totalLessonsInUnit > 0
        ? Math.round((completedInCurrentUnit / totalLessonsInUnit) * 100)
        : 0;

    return {
      unit: currentUnit,
      lessonIndex: currentLessonIndex,
      totalLessons: totalLessonsInUnit,
      progressPercentage,
      completedLessons: completedInCurrentUnit,
    };
  }, [levels]);

  // Resolve the next lesson title for the Continue Learning card
  const currentLessonTitle = useMemo(() => {
    const id = currentProgress.unit.lessonIds[currentProgress.lessonIndex];
    return getLessonById(id)?.title || "Continue Learning";
  }, [currentProgress]);

  // Calculate level + XP progress for the hero pill
  const levelStats = useMemo(() => {
    const totalXp = userProfile?.total_xp || 0;
    const level = Math.floor(totalXp / 100) + 1;
    const levelProgress = Math.min(((totalXp % 100) / 100) * 100, 100);
    return { level, levelProgress };
  }, [userProfile]);

  // Calculate debunking stats
  const debunkingStats = useMemo(() => {
    const totalLessons = userProfile?.lessons_completed || 0;
    const totalMyths = userProfile?.myths_busted || 0;
    const total = totalLessons + totalMyths;

    // Calculate percentages for the bar chart
    const mythsPercentage = total > 0 ? totalMyths / Math.max(total, 50) : 0;
    const lessonsPercentage =
      total > 0 ? totalLessons / Math.max(total, 50) : 0;

    return {
      totalLessons,
      totalMyths,
      mythsPercentage: Math.min(mythsPercentage, 1),
      lessonsPercentage: Math.min(lessonsPercentage, 1),
    };
  }, [userProfile]);

  const buildLeaderboard = useCallback(
    (users: LeaderboardSourceUser[] = []) => {
      const localDisplayName =
        userProfile?.display_name || userProfile?.username || "You";

      const NPC_CHARACTERS = [
        {
          name: "AtomMaster99",
          title: "Radiation Pioneer",
          baseXP: 2000,
          isNPC: true,
        },
        {
          name: "NuclearNinja",
          title: "Physics Legend",
          baseXP: 1800,
          isNPC: true,
        },
        {
          name: "ReactorRex",
          title: "Reactor Architect",
          baseXP: 1600,
          isNPC: true,
        },
        {
          name: "QuantumQuinn",
          title: "Quantum Master",
          baseXP: 1400,
          isNPC: true,
        },
        {
          name: "FissionFiona",
          title: "Fission Expert",
          baseXP: 1200,
          isNPC: true,
        },
        {
          name: "AtomSmasher",
          title: "Atom Splitter",
          baseXP: 1000,
          isNPC: true,
        },
        {
          name: "BetaBeast",
          title: "Beta Decay Pro",
          baseXP: 800,
          isNPC: true,
        },
        {
          name: "ElementElla",
          title: "Element Hunter",
          baseXP: 600,
          isNPC: true,
        },
        {
          name: "NuclearNora",
          title: "Nuclear Theorist",
          baseXP: 400,
          isNPC: true,
        },
        {
          name: "ChemWizard",
          title: "Chemistry Wizard",
          baseXP: 200,
          isNPC: true,
        },
      ];

      const entries: LeaderEntry[] = users.map((user) => ({
        userId: user.user_id,
        name:
          user.user_id === userProfile?.user_id
            ? localDisplayName
            : user.username,
        title: user.is_npc ? "NPC Challenger" : "Nuclear Learner",
        xp: user.total_xp ?? 0,
        avatar: user.avatar_url ?? undefined,
        isUser: user.user_id === userProfile?.user_id,
        isNPC: Boolean(user.is_npc),
      }));

      if (
        userProfile &&
        !entries.some((entry) => entry.userId === userProfile.user_id)
      ) {
        entries.push({
          userId: userProfile.user_id,
          name: localDisplayName,
          title: "Nuclear Learner",
          xp: userProfile.total_xp || 0,
          avatar: userProfile.avatar_url || undefined,
          isUser: true,
          isNPC: false,
        });
      }

      let entriesWithFallback = entries;
      if (entriesWithFallback.length < 3) {
        const needed = 3 - entriesWithFallback.length;
        const fallback = NPC_CHARACTERS.slice(0, needed).map(
          (npc): LeaderEntry => ({
            name: npc.name,
            title: npc.title,
            xp: npc.baseXP,
            isNPC: true,
          }),
        );
        entriesWithFallback = [...entriesWithFallback, ...fallback];
      }

      const ranked = entriesWithFallback
        .sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0))
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      return {
        topThree: ranked.slice(0, 3),
        userRank: ranked.find((entry) => entry.isUser),
      };
    },
    [userProfile],
  );

  const loadLeaderboard = useCallback(async () => {
    try {
      if (!isDatabaseReady) {
        setLeaderboardPreview(buildLeaderboard([]));
        setLeaderboardError(null);
        return;
      }

      const localSnapshot = await getLeaderboardSnapshot(10);
      if (localSnapshot.length > 0) {
        setLeaderboardPreview(buildLeaderboard(localSnapshot));
        setLeaderboardError(null);
      }

      if (!isSupabaseConfigured()) {
        if (localSnapshot.length === 0) {
          setLeaderboardPreview(buildLeaderboard([]));
        }
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select(
          "user_id, username, avatar_url, total_xp, is_npc, created_at, current_streak, id, lessons_completed, longest_streak, myths_busted, updated_at",
        )
        .order("total_xp", { ascending: false })
        .limit(10);

      if (error) {
        if (error.code === "PGRST205") {
          if (localSnapshot.length === 0) {
            setLeaderboardPreview(buildLeaderboard([]));
          }

          setLeaderboardError(
            "Remote leaderboard setup pending. Showing local leaderboard.",
          );
          return;
        }

        throw error;
      }

      const normalizedUsers: LeaderboardSourceUser[] = (data || []).map(
        (row) => ({
          user_id: row.user_id,
          username: row.username,
          avatar_url: row.avatar_url,
          total_xp: row.total_xp,
          is_npc: row.is_npc,
        }),
      );

      await saveLeaderboardSnapshot(
        normalizedUsers.map((row) => ({
          user_id: row.user_id,
          username: row.username,
          avatar_url: row.avatar_url,
          total_xp: row.total_xp ?? 0,
          is_npc: Boolean(row.is_npc),
        })),
      );

      setLeaderboardPreview(buildLeaderboard(normalizedUsers));
      setLeaderboardError(null);
    } catch (err) {
      console.error("Error loading leaderboard preview:", err);
      const localSnapshot = await getLeaderboardSnapshot(10);

      if (localSnapshot.length > 0) {
        setLeaderboardError("Showing cached leaderboard");
        setLeaderboardPreview(buildLeaderboard(localSnapshot));
      } else {
        setLeaderboardError("Showing offline leaderboard");
        setLeaderboardPreview(buildLeaderboard([]));
      }
    }
  }, [buildLeaderboard, isDatabaseReady]);

  useEffect(() => {
    setLeaderboardPreview(buildLeaderboard([]));
    loadLeaderboard();
  }, [buildLeaderboard, loadLeaderboard]);

  const topThree = leaderboardPreview.topThree;
  const userRank = leaderboardPreview.userRank;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* Hero: full-bleed bg image + pill header + mascot */}
        <Animated.View
          entering={FadeInDown.delay(100)}
          style={[styles.hero, { marginTop: -(insets.top + 20) }]}
        >
          <ExpoImage
            source={require("@/assets/images/bg/bg.svg")}
            style={styles.heroBg}
            contentFit="cover"
          />
          <View
            style={[styles.heroHeader, { paddingTop: insets.top + 14 }]}
          >
            {/* Card: profile avatar + name */}
            <View style={styles.heroUserCard}>
              <Image
                source={getProfileAvatarSource(userProfile?.avatar_url)}
                style={styles.heroPillAvatar}
                resizeMode="cover"
              />
              <Text style={styles.heroPillName} numberOfLines={1}>
                {userProfile?.username || "Atom Explorer"}
              </Text>
            </View>

            {/* Card: level */}
            <View style={styles.heroStatCard}>
              <Icon
                name="Ranking"
                size={14}
                color={theme.colors.primary}
                variant="Bold"
              />
              <Text style={styles.heroStatText}>
                {levelStats.level}
              </Text>
            </View>

            {/* Card: xp */}
            <View style={styles.heroStatCard}>
              <Icon name="Flash" size={14} color="#FFA000" variant="Bold" />
              <Text style={styles.heroStatText}>
                {(userProfile?.total_xp || 0).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Mascot placeholder */}
          <View style={styles.mascotWrap}>
            <ExpoImage
              source={require("@/assets/images/mascot/happy.png")}
              style={styles.mascot}
              contentFit="contain"
            />
          </View>
        </Animated.View>
        {/* Continue Learning */}
        <Animated.View
          entering={FadeInDown.delay(200)}
          style={styles.bannerContainer}
        >
          <View style={styles.bannerIconCircle}>
            <Icon
              name={currentProgress.unit.icon || "Atom"}
              size={22}
              color="#FFFFFF"
              variant="Bold"
            />
          </View>

          <View style={styles.bannerContent}>
            <Text style={styles.bannerLabel}>
              Lesson {currentProgress.lessonIndex + 1}
            </Text>
            <Text style={styles.bannerTitle} numberOfLines={1}>
              {currentLessonTitle}
            </Text>
            <Text style={styles.bannerSubtitle} numberOfLines={1}>
              {currentProgress.unit.title}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.bannerButton}
            onPress={() => router.push("/map")}
          >
            <Icon
              name="ArrowRight"
              size={18}
              color={theme.colors.primary}
              variant="Bold"
            />
          </TouchableOpacity>
        </Animated.View>
        {/* Quick Actions Row */}
        <Animated.View
          entering={FadeInDown.delay(300)}
          style={styles.quickActionsRow}
        >
          {/* Card 1: MythBuster */}
          <ActionButton
            icon="Danger"
            label="MythBuster"
            iconColor="#FF6B6B"
            onPress={() => router.push("/mythbuster")}
          />

          {/* Card 2: Encyclopedia */}
          <ActionButton
            icon="Book"
            label="Encyclopedia"
            iconColor="#6A82FB"
            onPress={() => router.push("/encyclopedia")}
          />

          {/* Card 3: AtomMaze */}
          <ActionButton
            icon="Game"
            label="AtomMaze"
            iconColor="#9E87F5"
            onPress={() => router.push("/atom-maze")}
          />
        </Animated.View>

        {/* Leaderboard Widget */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <SectionHeader
            title="Leaderboard"
            palette={THEME}
            right={
              <TouchableOpacity
                style={styles.arrowButton}
                onPress={() => router.push("/(tabs)/leaderboard")}
              >
                <Icon name="ArrowRight" size={20} color={THEME.textMuted} />
              </TouchableOpacity>
            }
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(500)}
          style={styles.leaderboardContainer}
        >
          {leaderboardError && (
            <Text style={{ color: THEME.textMuted, marginBottom: 8 }}>
              {leaderboardError}
            </Text>
          )}
          {topThree.length === 0 ? (
            <Text style={{ color: THEME.textMuted }}>
              Loading leaderboard...
            </Text>
          ) : (
            topThree.map((leader, index) => {
              const isUser = leader.isUser;
              const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
              const isFirst = index === 0;
              const avatarSource = leader.isNPC
                ? require("@/assets/images/mascot/profile.png")
                : getProfileAvatarSource(leader.avatar);

              return (
                <View key={leader.rank} style={styles.leaderboardRow}>
                  <View style={styles.rankInfo}>
                    <View
                      style={[
                        styles.rankBadge,
                        { backgroundColor: rankColors[index] || "#E9ECEF" },
                      ]}
                    >
                      <Text style={styles.rankText}>{leader.rank}</Text>
                    </View>
                    <Image source={avatarSource} style={styles.leaderAvatar} />
                    <View>
                      <Text style={styles.leaderName}>
                        {leader.name} {isUser && "(You)"}
                      </Text>
                      <Text style={styles.leaderScore}>{leader.xp} XP</Text>
                    </View>
                  </View>
                  {isFirst && (
                    <Icon
                      name="Crown"
                      size={24}
                      color="#FFD700"
                      variant="Bold"
                    />
                  )}
                </View>
              );
            })
          )}

          <TouchableOpacity
            style={styles.viewAllLink}
            onPress={() => router.push("/(tabs)/leaderboard")}
          >
            <Text style={styles.viewAllText}>View Full Leaderboard</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    scrollContent: {
      padding: 20,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    hero: {
      marginHorizontal: -20,
      minHeight: 330,
      borderRadius: 0,
      overflow: "hidden",
      marginBottom: 0,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
    },
    heroBg: {
      ...StyleSheet.absoluteFillObject,
    },
    heroHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 20,
      paddingBottom: 14,
    },
    heroUserCard: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: theme.card,
      borderWidth: 2,
      borderColor: theme.border,
      borderBottomWidth: 4,
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    heroPillAvatar: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: withAlpha(colors.role.black, 0.08),
    },
    heroPillName: {
      fontSize: 13,
      color: theme.text,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
    },
    heroStatCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.card,
      borderWidth: 2,
      borderColor: theme.border,
      borderBottomWidth: 4,
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    heroStatText: {
      fontSize: 13,
      color: theme.text,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
    },
    mascotWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 4,
    },
    mascot: {
      width: 158,
      height: 136,
    },
    plusBtn: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "#FFF",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 4,
    },
    quickActionsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 24,
      gap: 12,
    },
    bannerContainer: {
      height: 92,
      borderRadius: 16,
      marginTop: -46,
      marginBottom: 24,
      backgroundColor: theme.card,
      borderWidth: 2,
      borderColor: theme.border,
      borderBottomWidth: 4,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      gap: 12,
      overflow: "hidden",
    },
    bannerIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: theme.card,
    },
    bannerContent: {
      flex: 1,
      flexShrink: 1,
    },
    bannerLabel: {
      fontSize: 11,
      color: theme.primary,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: 2,
    },
    bannerTitle: {
      fontSize: 16,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: theme.text,
      marginBottom: 1,
    },
    bannerSubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
    },
    bannerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: theme.primary,
      backgroundColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    arrowButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.card,
      alignItems: "center",
      justifyContent: "center",
    },
    leaderboardContainer: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 16,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    leaderboardRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    rankInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rankBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    rankText: {
      color: "#FFF",
      fontSize: 12,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
    },
    leaderAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#E9ECEF",
    },
    leaderName: {
      fontSize: 14,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: theme.text,
    },
    leaderScore: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
    },
    viewAllLink: {
      marginTop: 16,
      alignItems: "center",
    },
    viewAllText: {
      color: theme.primary,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      fontSize: 14,
    },
  });
