import { Icon } from "@/components/ui/icon";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    getLeaderboardSnapshot,
    getLeaderboardSnapshotUpdatedAt,
    saveLeaderboardSnapshot,
} from "@/services/database";
import { useStorage } from "@/services/StorageContext";
import { isSupabaseConfigured, supabase } from "@/services/supabase";
import { Tables } from "@/services/supabase.types";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Dimensions,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// Theme Constants
const LightTHEME = {
  bg: "#F8F9FE",
  card: "#FFFFFF",
  text: "#32325D",
  textMuted: "#8898AA",
  primary: "#5E72E4",
  border: "#E9ECEF",
};

const DarkTHEME = {
  bg: "#172B4D",
  card: "#213356",
  text: "#F6F9FC",
  textMuted: "#8898AA",
  primary: "#5E72E4",
  border: "#2D3A56",
};

// Gradient Colors
const GRADIENTS = {
  purple: ["#B8A5FE", "#9E87F5"] as const,
  green: ["#4FD1C5", "#2DCECC"] as const,
  orange: ["#FF9F65", "#FF6B6B"] as const,
  yellow: ["#FFD66E", "#FFA043"] as const,
  blue: ["#6A82FB", "#FC5C7D"] as const,
  blueSolid: ["#5E72E4", "#825EE4"] as const,
};

// NPC Characters - Personal Goals for the User
const NPC_CHARACTERS = [
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

type LeaderboardSourceUser = Pick<
  Tables<"users">,
  "user_id" | "username" | "avatar_url" | "total_xp" | "is_npc"
>;

const CircleAvatar = ({
  uri,
  size,
  borderColor,
  borderWidth = 3,
  avatarColor,
  isUser,
}: {
  uri?: string;
  size: number;
  borderColor: string;
  borderWidth?: number;
  avatarColor?: string;
  isUser?: boolean;
}) => {
  // User avatar - use profile mascot
  if (isUser || uri === "profile") {
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
  }

  // Remote avatar
  if (uri) {
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
  const colorScheme = useColorScheme();
  const THEME = colorScheme === "dark" ? DarkTHEME : LightTHEME;
  const styles = useMemo(() => createStyles(THEME), [THEME]);
  const pulse = useSharedValue(1);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  React.useEffect(() => {
    pulse.value = withRepeat(withTiming(1.02, { duration: 1000 }), -1, true);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const buildLeaderboard = useCallback(
    (users: LeaderboardSourceUser[] = []) => {
      const entries: LeaderboardEntry[] = users.map((user) => ({
        userId: user.user_id,
        name: user.username,
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
          name: userProfile.username || "You",
          title: "Nuclear Learner",
          xp: userProfile.total_xp || 0,
          avatar: "profile",
          avatarColor: undefined,
          isUser: true,
          isNPC: false,
        });
      }

      let entriesWithFallback = entries;
      if (entriesWithFallback.length < 3) {
        const needed = 3 - entriesWithFallback.length;
        const fallback = NPC_CHARACTERS.slice(0, needed).map(
          (npc): LeaderboardEntry => ({
            name: npc.name,
            title: npc.title,
            xp: npc.baseXP,
            avatarColor: npc.avatarColor,
            isNPC: true,
          }),
        );
        entriesWithFallback = [...entriesWithFallback, ...fallback];
      }

      return entriesWithFallback
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
        }

        if (!isSupabaseConfigured()) {
          if (localSnapshot.length === 0) {
            setLeaderboardData(buildLeaderboard([]));
          }
          return;
        }

        const { data, error: supabaseError } = await supabase
          .from("users")
          .select(
            "user_id, username, avatar_url, total_xp, current_streak, is_npc, created_at, id, lessons_completed, longest_streak, myths_busted, updated_at",
          )
          .order("total_xp", { ascending: false })
          .limit(100);

        if (supabaseError) {
          if (supabaseError.code === "PGRST205") {
            if (localSnapshot.length === 0) {
              setLeaderboardData(buildLeaderboard([]));
            }

            setError("Remote leaderboard setup pending. Showing local data.");
            return;
          }

          throw supabaseError;
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

        setLeaderboardData(buildLeaderboard(normalizedUsers));
        setLastUpdatedAt(Date.now());
        setError(null);
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
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={GRADIENTS.blueSolid}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.headerTitle}>Leaderboard</Text>

          {/* Podium */}
          <View style={styles.podiumContainer}>
            {/* Rank 2 */}
            <View style={[styles.podiumColumn, styles.podiumSide]}>
              <View style={styles.podiumAvatarWrapper}>
                <CircleAvatar
                  uri={topThree[1].avatar}
                  avatarColor={topThree[1].avatarColor}
                  isUser={topThree[1].isUser}
                  size={70}
                  borderColor="rgba(255,255,255,0.8)"
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
                  size={70}
                  borderColor="rgba(255,255,255,0.8)"
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
        </LinearGradient>
      </View>

      {/* Scrollable List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 + insets.bottom },
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
              entering={FadeInDown.delay(index * 50)}
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
                {user.isUser ? (
                  <Image
                    source={require("@/assets/images/mascot/profile.png")}
                    style={styles.listAvatar}
                    resizeMode="contain"
                  />
                ) : user.avatar ? (
                  <Image
                    source={{ uri: user.avatar }}
                    style={styles.listAvatar}
                    resizeMode="cover"
                  />
                ) : (
                  <Image
                    source={require("@/assets/images/mascot/profile.png")}
                    style={styles.listAvatar}
                    resizeMode="contain"
                  />
                )}
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

      {/* Sticky User Bar */}
      {userRank && userRank.rank && userRank.rank > 3 && (
        <View style={[styles.stickyBar, { bottom: 20 }]}>
          <LinearGradient
            colors={GRADIENTS.blueSolid}
            style={styles.stickyBarGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text
              style={[
                styles.listRankText,
                { color: "#FFF", width: 30, textAlign: "center" },
              ]}
            >
              {userRank.rank}
            </Text>
            <View style={styles.listAvatarWrapper}>
              <View
                style={[
                  styles.listAvatar,
                  { backgroundColor: "#FFF", padding: 2, overflow: "hidden" },
                ]}
              >
                <Image
                  source={require("@/assets/images/mascot/profile.png")}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              </View>
            </View>
            <View style={styles.listInfo}>
              <Text style={[styles.listName, { color: "#FFF" }]}>
                {userRank.name}
              </Text>
              <Text
                style={[styles.listTitle, { color: "rgba(255,255,255,0.8)" }]}
              >
                {userRank.title}
              </Text>
            </View>
            <View style={styles.listXP}>
              <Icon name="Flash" size={16} color="#FFD700" variant="Bold" />
              <Text style={[styles.xpText, { color: "#FFF" }]}>
                {userRank.xp.toLocaleString()} XP
              </Text>
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: typeof LightTHEME) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    scrollContent: {
      paddingTop: 20,
      paddingBottom: 100,
    },
    headerContainer: {
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      overflow: "hidden",
      marginBottom: 0,
      backgroundColor: theme.card,
      zIndex: 10,
      elevation: 4,
      shadowColor: "#5E72E4",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    headerGradient: {
      paddingTop: 50,
      paddingBottom: 20,
      paddingHorizontal: 20,
      alignItems: "center",
    },
    headerTitle: {
      color: "#FFF",
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 10,
    },
    podiumContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: 24,
      marginTop: 10,
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
      fontWeight: "800",
    },
    podiumName: {
      color: "#FFF",
      fontWeight: "600",
      fontSize: 13,
      marginTop: 4,
      textAlign: "center",
    },
    podiumNameLarge: {
      fontSize: 15,
      fontWeight: "700",
    },
    podiumXP: {
      color: "rgba(255,255,255,0.9)",
      fontSize: 11,
      fontWeight: "600",
      marginTop: 2,
      flexDirection: "row",
      alignItems: "center",
    },
    listContainer: {
      paddingHorizontal: 20,
      gap: 12,
    },
    listItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 20,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    listItemActive: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    listRankText: {
      color: theme.textMuted,
      fontWeight: "800",
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
      color: theme.text,
      fontWeight: "800",
      fontSize: 16,
    },
    listTitle: {
      color: theme.textMuted,
      fontSize: 13,
      fontWeight: "600",
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
      color: theme.textMuted,
      fontWeight: "800",
      fontSize: 14,
    },
    stickyBar: {
      position: "absolute",
      left: 20,
      right: 20,
      borderRadius: 20,
      overflow: "hidden",
      elevation: 8,
      shadowColor: "#5E72E4",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    stickyBarGradient: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
    },
  });
