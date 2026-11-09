import { Icon } from "@/components/ui/icon";
import { useTabBarInset } from "@/components/layout";
import {useTheme, type Palette, fontFamilies, useResponsiveLayout} from "@/theme";
import {
    getLeaderboardSnapshot,
    getLeaderboardSnapshotUpdatedAt,
    type LocalLeaderboardUser,
} from "@/services/database";
import {
  getProfileAvatarSource,
  PROFILE_AVATAR_OPTIONS,
} from "@/services/profile-avatars";
import { useStorage } from "@/services/StorageContext";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    LinearTransition,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DURATION, EASE_OUT } from "@/theme/motion";

// NPC Characters - Personal Goals for the User
export const NPC_CHARACTERS = [
  {
    name: "AtomMaster99",
    title: "Radiation Pioneer",
    baseXP: 2000,
    avatarColor: "#EA580C",
    isNPC: true,
  },
  {
    name: "NuclearNinja",
    title: "Physics Legend",
    baseXP: 1800,
    avatarColor: "#2ECC71",
    isNPC: true,
  },
  {
    name: "ReactorRex",
    title: "Reactor Architect",
    baseXP: 1600,
    avatarColor: "#3498DB",
    isNPC: true,
  },
  {
    name: "QuantumQuinn",
    title: "Quantum Master",
    baseXP: 1400,
    avatarColor: "#9B59B6",
    isNPC: true,
  },
  {
    name: "FissionFiona",
    title: "Fission Expert",
    baseXP: 1200,
    avatarColor: "#E91E63",
    isNPC: true,
  },
  {
    name: "AtomSmasher",
    title: "Atom Splitter",
    baseXP: 1000,
    avatarColor: "#F39C12",
    isNPC: true,
  },
  {
    name: "BetaBeast",
    title: "Beta Decay Pro",
    baseXP: 800,
    avatarColor: "#1ABC9C",
    isNPC: true,
  },
  {
    name: "ElementElla",
    title: "Element Hunter",
    baseXP: 600,
    avatarColor: "#E74C3C",
    isNPC: true,
  },
  {
    name: "NuclearNora",
    title: "Nuclear Theorist",
    baseXP: 400,
    avatarColor: "#16A085",
    isNPC: true,
  },
  {
    name: "ChemWizard",
    title: "Chemistry Wizard",
    baseXP: 200,
    avatarColor: "#D35400",
    isNPC: true,
  },
];

type LeaderboardEntry = {
  userId?: string;
  name: string;
  title: string;
  xp: number;
  avatar?: string;
  avatarColor?: string;
  isUser?: boolean;
  isNPC?: boolean;
  rank?: number;
};

type LeaderboardSourceUser = LocalLeaderboardUser;

const CircleAvatar = ({
  uri,
  size,
  borderColor,
  borderWidth = 3,
  avatarColor,
  isUser,
  isNPC,
}: {
  uri?: string;
  size: number;
  borderColor: string;
  borderWidth?: number;
  avatarColor?: string;
  isUser?: boolean;
  isNPC?: boolean;
}) => {
  if (uri) {
    const isRemote = uri.startsWith("http://") || uri.startsWith("https://");
    if (isRemote) {
      return (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth,
            borderColor,
            overflow: "hidden",
          }}
        >
          <Image
            source={{ uri }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
      );
    }
    // Local profile preset (works for both user and NPCs)
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor,
          overflow: "hidden",
          backgroundColor: "#FFF",
        }}
      >
        <Image
          source={getProfileAvatarSource(uri)}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>
    );
  }
  // Default avatar fallback (NPCs and users without uploaded avatar)
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth,
        borderColor,
        overflow: "hidden",
        backgroundColor: "#FFF",
      }}
    >
      <Image
        source={require("@/assets/images/mascot/profile.png")}
        style={{ width: "100%", height: "100%" }}
        resizeMode="contain"
      />
    </View>
  );
};

export default function LeaderboardScreen() {
  const { userProfile, isDatabaseReady } = useStorage();
  const { theme } = useTheme();
  const router = useRouter();
  const THEME = theme.palettes.tab;
  const isDark = theme.mode === "dark";
  const styles = useMemo(() => createStyles(THEME, isDark), [THEME, isDark]);
  const bgColors: [string, string] =
    theme.mode === "dark" ? [THEME.bg, THEME.bg] : ["#FFF3E0", "#FFFFFF"];
  const pulse = useSharedValue(1);
  const reducedMotion = useReducedMotion();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  React.useEffect(() => {
    if (reducedMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(withTiming(1.02, { duration: 1000 }), -1, true);
  }, [reducedMotion]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const buildLeaderboard = useCallback(
    (users: LeaderboardSourceUser[] = []) => {
      const localDisplayName =
        userProfile?.display_name || userProfile?.username || "You";

      const entries: LeaderboardEntry[] = users.map((user) => ({
        userId: user.user_id,
        name:
          user.user_id === userProfile?.user_id
            ? localDisplayName
            : user.username,
        title: user.is_npc ? "NPC Challenger" : "Nuclear Learner",
        xp: user.total_xp ?? 0,
        avatar: user.avatar_url ?? undefined,
        avatarColor: undefined,
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
          avatarColor: undefined,
          isUser: true,
          isNPC: false,
        });
      }

      // Always merge the full NPC personal-goal roster: the leaderboard is
      // local-only (the sync snapshot table is never populated anymore), so
      // the rivals keep the board full of targets to climb past — even while
      // the user is offline.
      for (let idx = 0; idx < NPC_CHARACTERS.length; idx++) {
        const npc = NPC_CHARACTERS[idx];
        if (!entries.some((entry) => entry.name === npc.name)) {
          // Deterministic randomized avatar per NPC (stable across reloads)
          const avatarKey =
            PROFILE_AVATAR_OPTIONS[idx % PROFILE_AVATAR_OPTIONS.length].key;
          entries.push({
            name: npc.name,
            title: npc.title,
            xp: npc.baseXP,
            avatar: avatarKey,
            avatarColor: npc.avatarColor,
            isNPC: true,
          });
        }
      }

      return entries
        .sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0))
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    },
    [userProfile],
  );

  const loadLeaderboard = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        if (!isDatabaseReady) {
          setLeaderboardData(buildLeaderboard([]));
          setError(null);
          return;
        }

        // Always hydrate from local snapshot first for instant/offline UX.
        const localSnapshot = await getLeaderboardSnapshot(100);
        const cachedAt = await getLeaderboardSnapshotUpdatedAt();

        if (localSnapshot.length > 0) {
          setLeaderboardData(buildLeaderboard(localSnapshot));
          setLastUpdatedAt(cachedAt);
          setError(null);
        } else {
          setLeaderboardData(buildLeaderboard([]));
        }
      } catch (err) {
        console.error("Error loading leaderboard:", err);
        const localSnapshot = await getLeaderboardSnapshot(100);

        if (localSnapshot.length > 0) {
          setLeaderboardData(buildLeaderboard(localSnapshot));
          setError("Showing cached leaderboard data.");
        } else {
          setError("Could not load leaderboard. Showing defaults.");
          setLeaderboardData(buildLeaderboard([]));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildLeaderboard, isDatabaseReady],
  );

  const onRefresh = useCallback(() => {
    loadLeaderboard(true);
  }, [loadLeaderboard]);

  useEffect(() => {
    setLeaderboardData(buildLeaderboard([]));
    loadLeaderboard();
  }, [buildLeaderboard, loadLeaderboard]);

  // Refresh when screen regains focus to keep leaderboard fresh
  useFocusEffect(
    useCallback(() => {
      loadLeaderboard(true);
    }, [loadLeaderboard]),
  );

  const topThree = leaderboardData.slice(0, 3);
  const restList = leaderboardData.slice(3);
  const userRank = leaderboardData.find((item) => item.isUser);
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsiveLayout();
  const tabBarInset = useTabBarInset();

  if (leaderboardData.length < 3) {
    return (
      <View
        style={[
          styles.container,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Text style={{ color: THEME.textMuted }}>
          {loading ? "Loading leaderboard..." : "Preparing leaderboard..."}
        </Text>
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
      {/* Header — amber outer like profile/home */}
      <Animated.View
        entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.springify()}
        layout={reducedMotion ? undefined : LinearTransition.duration(DURATION.medium).easing(EASE_OUT)}
        style={[styles.headerContainer, { marginTop: insets.top + 12 }]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
          >
            <Icon name="ArrowLeft2" size={20} color="#FF8C00" variant="Bold" />
          </TouchableOpacity>
          <View style={styles.headerTitlePill}>
            <Icon name="Crown1" size={14} color="#FFFFFF" variant="Bold" />
            <Text style={styles.headerTitle}>Leaderboard</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

          {/* Podium — white inner card like profile/home */}
          <View style={styles.podiumCard}>
            <View style={styles.podiumContainer}>
              {/* Rank 2 */}
              <View style={[styles.podiumColumn, styles.podiumSide]}>
                <View style={styles.podiumAvatarWrapper}>
                  <CircleAvatar
                    uri={topThree[1].avatar}
                    avatarColor={topThree[1].avatarColor}
                    isUser={topThree[1].isUser}
                    isNPC={topThree[1].isNPC}
                    size={70}
                    borderColor="#E5E7EB"
                  />
                <View
                  style={[styles.rankBadge, { backgroundColor: "#C0C0C0" }]}
                >
                  <Text style={[styles.rankText, { color: "#FFF" }]}>2</Text>
                </View>
              </View>
              <Text style={styles.podiumName}>{topThree[1].name}</Text>
              <Text style={styles.podiumXP}>{topThree[1].xp} XP</Text>
            </View>

            {/* Rank 1 */}
            <View style={[styles.podiumColumn, styles.podiumCenter]}>
              <Animated.View style={[styles.podiumAvatarWrapper, pulseStyle]}>
                <View style={styles.crownWrapper}>
                  <Icon
                    name="Crown1"
                    size={32}
                    color="#FFD700"
                    variant="Bold"
                  />
                </View>
                <CircleAvatar
                  uri={topThree[0].avatar}
                  avatarColor={topThree[0].avatarColor}
                  isUser={topThree[0].isUser}
                  isNPC={topThree[0].isNPC}
                  size={90}
                  borderColor="#FFD700"
                  borderWidth={4}
                />
                <View
                  style={[
                    styles.rankBadge,
                    {
                      backgroundColor: "#FFD700",
                      width: 32,
                      height: 32,
                      bottom: -14,
                    },
                  ]}
                >
                  <Text
                    style={[styles.rankText, { fontSize: 16, color: "#FFF" }]}
                  >
                    1
                  </Text>
                </View>
              </Animated.View>
              <Text style={[styles.podiumName, styles.podiumNameLarge]}>
                {topThree[0].name}
              </Text>
              <Text style={styles.podiumXP}>
                <Icon name="Flash" size={14} color="#FFD700" variant="Bold" />{" "}
                {topThree[0].xp} XP
              </Text>
            </View>

            {/* Rank 3 */}
            <View style={[styles.podiumColumn, styles.podiumSide]}>
              <View style={styles.podiumAvatarWrapper}>
                <CircleAvatar
                  uri={topThree[2].avatar}
                  avatarColor={topThree[2].avatarColor}
                  isUser={topThree[2].isUser}
                  isNPC={topThree[2].isNPC}
                  size={70}
                  borderColor="#E5E7EB"
                />
                <View
                  style={[styles.rankBadge, { backgroundColor: "#CD7F32" }]}
                >
                  <Text style={styles.rankText}>3</Text>
                </View>
              </View>
              <Text style={styles.podiumName}>{topThree[2].name}</Text>
              <Text style={styles.podiumXP}>{topThree[2].xp} XP</Text>
            </View>
          </View>
          </View>
        </Animated.View>

      {/* Scrollable List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" },
          { paddingBottom: tabBarInset + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.primary}
          />
        }
      >
        {error && (
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <Text style={{ color: THEME.textMuted }}>{error}</Text>
          </View>
        )}
        {lastUpdatedAt && (
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <Text style={{ color: THEME.textMuted }}>
              Last updated {new Date(lastUpdatedAt).toLocaleTimeString()}
            </Text>
          </View>
        )}
        <View style={styles.listContainer}>
          {restList.map((user, index) => (
            <Animated.View
              key={user.rank}
              entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(index * 50)}
              style={[styles.listItem, user.isUser && styles.listItemActive]}
            >
              <Text
                style={[
                  styles.listRankText,
                  user.isUser && { color: THEME.primary },
                ]}
              >
                {user.rank}
              </Text>

              <View style={styles.listAvatarWrapper}>
                <CircleAvatar
                  uri={user.avatar}
                  isUser={user.isUser}
                  isNPC={user.isNPC}
                  size={40}
                  borderColor={user.isUser ? THEME.primary : "transparent"}
                  borderWidth={user.isUser ? 2 : 0}
                />
                {user.isNPC && (
                  <View style={styles.npcBadge}>
                    <Icon
                      name="Star"
                      size={10}
                      color="#FFD700"
                      variant="Bold"
                    />
                  </View>
                )}
              </View>

              <View style={styles.listInfo}>
                <Text
                  style={[
                    styles.listName,
                    user.isUser && { color: THEME.primary },
                  ]}
                >
                  {user.name} {user.isUser && "(You)"}
                </Text>
                <Text style={styles.listTitle}>{user.title}</Text>
              </View>

              <View style={styles.listXP}>
                <Text
                  style={[
                    styles.xpText,
                    user.isUser && { color: THEME.primary },
                  ]}
                >
                  {user.xp.toLocaleString()} XP
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky User Bar — above the tab bar, white card like profile */}
      {userRank && userRank.rank && userRank.rank > 3 && (
        <View
          pointerEvents="box-none"
          style={[styles.stickyLayer, { bottom: tabBarInset + 12 }]}
        >
          <Animated.View
            entering={reducedMotion ? FadeIn.duration(120) : FadeIn.duration(200)}
            style={[styles.stickyBar, { maxWidth: contentMaxWidth - 40 }]}
          >
            <View style={styles.stickyBarInner}>
              <Text
                style={[
                  styles.listRankText,
                  { color: "#E67E22", width: 30, textAlign: "center" },
                ]}
              >
                {userRank.rank}
              </Text>
              <View style={styles.listAvatarWrapper}>
                <CircleAvatar
                  uri={userRank.avatar}
                  isUser={true}
                  isNPC={false}
                  size={40}
                  borderColor="#FFCA5F"
                  borderWidth={2}
                />
              </View>
              <View style={styles.listInfo}>
                <Text style={[styles.listName, { color: "#333333" }]}>
                  {userRank.name}
                </Text>
                <Text style={[styles.listTitle, { color: "#9CA3AF" }]}>
                  {userRank.title}
                </Text>
              </View>
              <View style={styles.listXP}>
                <Icon name="Flash" size={16} color="#FF8C00" variant="Bold" />
                <Text style={[styles.xpText, { color: "#E67E22" }]}>
                  {userRank.xp.toLocaleString()} XP
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Palette, isDark: boolean) => {
  /* Mode-aware neutral surfaces — amber header identity stays in both modes */
  const P = isDark
    ? {
        card: "#213356",
        border: "#2D3A56",
        creamTint: "#4A381B",
        text: "#F6F9FC",
        muted: "#8898AA",
      }
    : {
        card: "#FFFFFF",
        border: "#E5E7EB",
        creamTint: "#FFF3E0",
        text: "#333333",
        muted: "#9CA3AF",
      };
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    bgGradient: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    scrollContent: {
      paddingTop: 12,
      paddingBottom: 100,
    },
    headerContainer: {
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
    headerGradient: {
      paddingBottom: 0,
      paddingHorizontal: 0,
      alignItems: "center",
    },
    headerTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      paddingHorizontal: 4,
      paddingTop: 2,
      paddingBottom: 2,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: P.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#FFDD8D",
      borderBottomWidth: 4,
    },
    headerTitlePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#434343",
      paddingHorizontal: 14,
      height: 40,
      borderRadius: 14,
    },
    headerTitle: {
      color: "#FFFFFF",
      fontSize: 14,
      fontFamily: fontFamilies.bold,
    },
    podiumCard: {
      backgroundColor: P.card,
      borderRadius: 20,
      padding: 16,
      borderWidth: 2,
      borderColor: P.border,
      borderBottomWidth: 4,
    },
    podiumContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: 16,
      marginTop: 4,
    },
    podiumColumn: {
      alignItems: "center",
    },
    podiumSide: {
      marginBottom: 0,
    },
    podiumCenter: {
      marginBottom: 0,
      zIndex: 10,
    },
    podiumAvatarWrapper: {
      marginBottom: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    crownWrapper: {
      position: "absolute",
      top: -24,
      zIndex: 20,
    },
    rankBadge: {
      position: "absolute",
      bottom: -8,
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: "#FFF",
      zIndex: 5,
    },
    rankText: {
      color: "#FFF",
      fontSize: 12,
      fontFamily: fontFamilies.heavy,
    },
    podiumName: {
      color: P.text,
      fontFamily: fontFamilies.bold,
      fontSize: 12,
      marginTop: 6,
      textAlign: "center",
    },
    podiumNameLarge: {
      fontSize: 14,
      fontFamily: fontFamilies.heavy,
      color: P.text,
    },
    podiumXP: {
      color: "#E67E22",
      fontSize: 11,
      fontFamily: fontFamilies.bold,
      marginTop: 2,
      flexDirection: "row",
      alignItems: "center",
    },
    listContainer: {
      paddingHorizontal: 20,
      gap: 12,
      marginTop: 12,
    },
    listItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: P.card,
      padding: 16,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: P.border,
      borderBottomWidth: 4,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    listItemActive: {
      backgroundColor: P.creamTint,
      borderColor: "#FFCA5F",
    },
    listRankText: {
      color: P.muted,
      fontFamily: fontFamilies.heavy,
      fontSize: 16,
      width: 30,
      textAlign: "center",
      marginRight: 8,
    },
    listAvatarWrapper: {
      marginRight: 12,
      position: "relative",
    },
    listAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    listInfo: {
      flex: 1,
    },
    listName: {
      color: P.text,
      fontFamily: fontFamilies.heavy,
      fontSize: 15,
    },
    listTitle: {
      color: P.muted,
      fontSize: 12,
      fontFamily: fontFamilies.semibold,
      marginTop: 2,
    },
    npcBadge: {
      position: "absolute",
      bottom: -2,
      right: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "#FFF",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#FFD700",
    },
    listXP: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    xpText: {
      color: "#E67E22",
      fontFamily: fontFamilies.heavy,
      fontSize: 14,
    },
    stickyLayer: {
      position: "absolute",
      left: 0,
      right: 0,
      alignItems: "center",
      paddingHorizontal: 20,
    },
    stickyBar: {
      width: "100%",
      borderRadius: 20,
      overflow: "hidden",
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    stickyBarInner: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      backgroundColor: P.card,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: "#FFCA5F",
      borderBottomWidth: 4,
    },
  });
};
