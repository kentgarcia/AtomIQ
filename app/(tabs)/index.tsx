import { SectionHeader } from "@/components/ui/section-header";
import { Icon } from "@/components/ui/icon";
import { UNITS } from "@/content/units";
import { useTheme, type Palette } from "@/theme";
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
import { LinearGradient } from "expo-linear-gradient";
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

import { GRADIENTS } from "@/constants/gradients";

// Gradient Colors

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
  const [greeting, setGreeting] = useState("Hello");

  const THEME = theme.palettes.tab;
  const styles = useMemo(() => createStyles(THEME), [THEME]);

  // Update greeting based on local time, refreshing each minute
  useEffect(() => {
    const computeGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 5) return "Good Night!";
      if (hour < 12) return "Good Morning!";
      if (hour < 17) return "Good Afternoon!";
      if (hour < 21) return "Good Evening!";
      return "Good Night!";
    };

    const update = () => setGreeting(computeGreeting());
    update();
    const id = setInterval(update, 60 * 1000);
    return () => clearInterval(id);
  }, []);

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
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={getProfileAvatarSource(userProfile?.avatar_url)}
              style={styles.avatar}
              resizeMode="cover"
            />
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.username}>
                {userProfile?.username || "Atom Explorer"}
              </Text>
            </View>
          </View>

          <View style={styles.gemPill}>
            <LinearGradient
              colors={GRADIENTS.yellow}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gemGradient}
            >
              <Icon name="Flash" size={16} color="#FFF" variant="Bold" />
              <Text style={styles.gemText}>
                {userProfile?.total_xp || 0} XP
              </Text>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Quick Actions Row */}
        <Animated.View
          entering={FadeInDown.delay(200)}
          style={styles.quickActionsRow}
        >
          {/* Card 1: MythBuster (Orange) */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/mythbuster")}
          >
            <LinearGradient
              colors={GRADIENTS.orange}
              style={styles.actionGradient}
            >
              <View style={styles.actionIconCircle}>
                <Icon name="Danger" size={24} color="#FF6B6B" variant="Bold" />
              </View>
              <Text
                style={styles.actionText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                MythBuster
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Card 2: Encyclopedia (Blue) */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/encyclopedia")}
          >
            <LinearGradient
              colors={GRADIENTS.blue}
              style={styles.actionGradient}
            >
              <View
                style={[
                  styles.actionIconCircle,
                  { backgroundColor: "rgba(255,255,255,0.9)" },
                ]}
              >
                <Icon name="Book" size={24} color="#6A82FB" variant="Bold" />
              </View>
              <Text
                style={styles.actionText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Encyclopedia
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Card 3: AtomMaze (Purple) */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/atom-maze")}
          >
            <LinearGradient
              colors={GRADIENTS.purple}
              style={styles.actionGradient}
            >
              <View
                style={[
                  styles.actionIconCircle,
                  { backgroundColor: "rgba(255,255,255,0.9)" },
                ]}
              >
                <Icon name="Game" size={24} color="#9E87F5" variant="Bold" />
              </View>
              <Text
                style={styles.actionText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                AtomMaze
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Daily Quiz Banner */}
        <Animated.View
          entering={FadeInDown.delay(300)}
          style={styles.bannerContainer}
        >
          <LinearGradient
            colors={GRADIENTS.yellow}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerGradient}
          >
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>Continue Learning</Text>
              <Text style={styles.bannerSubtitle}>
                Unit {currentProgress.unit.order}: {currentProgress.unit.title}
              </Text>

              <TouchableOpacity
                style={styles.bannerButton}
                onPress={() => router.push("/map")}
              >
                <Text style={styles.bannerButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bannerImageContainer}>
              <Icon name="Play" size={80} color="#FFF" variant="Bold" />
            </View>
          </LinearGradient>
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
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#E9ECEF",
    },
    greeting: {
      fontSize: 14,
      color: theme.textMuted,
      fontWeight: "600",
    },
    username: {
      fontSize: 18,
      color: theme.text,
      fontWeight: "800",
    },
    gemPill: {
      borderRadius: 20,
      overflow: "hidden",
    },
    gemGradient: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 6,
      paddingHorizontal: 12,
      gap: 8,
    },
    gemText: {
      color: "#FFF",
      fontWeight: "800",
      fontSize: 14,
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
    actionCard: {
      flex: 1,
      height: 110,
      borderRadius: 20,
      overflow: "hidden",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    actionGradient: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
    },
    actionIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.9)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    actionText: {
      color: "#FFF",
      fontWeight: "700",
      fontSize: 13,
      textAlign: "center",
      flexShrink: 1,
      width: "100%",
    },
    bannerContainer: {
      height: 160,
      borderRadius: 24,
      overflow: "hidden",
      marginBottom: 32,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    bannerGradient: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    bannerContent: {
      flex: 1,
      zIndex: 2,
    },
    bannerTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: "#FFF",
      marginBottom: 4,
    },
    bannerSubtitle: {
      fontSize: 14,
      color: "rgba(255,255,255,0.9)",
      marginBottom: 20,
      fontWeight: "600",
    },
    bannerButton: {
      backgroundColor: "#FFF",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
      alignSelf: "flex-start",
    },
    bannerButtonText: {
      color: "#FFA043",
      fontWeight: "800",
      fontSize: 14,
    },
    bannerImageContainer: {
      position: "absolute",
      right: 20,
      bottom: 20,
      opacity: 0.9,
      transform: [{ rotate: "-10deg" }],
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
      color: theme.text,
    },
    leaderScore: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: "600",
    },
    viewAllLink: {
      marginTop: 16,
      alignItems: "center",
    },
    viewAllText: {
      color: theme.primary,
      fontWeight: "700",
      fontSize: 14,
    },
  });
