import { Icon } from "@/components/ui/icon";
import { getProfileAvatarSource } from "@/services/profile-avatars";
import { useStorage } from "@/services/StorageContext";
import { fontFamilies } from "@/theme";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export function ProfileProgressCard() {
  const { userProfile } = useStorage();
  const router = useRouter();

  const userLevel = useMemo(() => {
    if (!userProfile) return 1;
    return Math.floor(userProfile.total_xp / 100) + 1;
  }, [userProfile]);

  const userTitle = useMemo(() => {
    if (userLevel < 5) return "Atomic Novice";
    if (userLevel < 10) return "Isotope Initiate";
    if (userLevel < 20) return "Fusion Explorer";
    return "Quantum Master";
  }, [userLevel]);

  const levelProgress = Math.min(((userProfile?.total_xp || 0) % 100) / 100, 1);

  if (!userProfile) {
    return (
      <View style={styles.outer}>
        <Text style={{ color: "#333333", fontFamily: fontFamilies.medium }}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <View style={styles.outer}>
      {/* Header inside amber — level pill */}
      <View style={styles.header}>
        <View style={styles.levelPill}>
          <Icon name="Crown" size={14} color="#FFFFFF" variant="Bold" />
          <Text style={styles.levelPillText}>{userTitle}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => router.push("/(tabs)/profile")}
          hitSlop={8}
          style={({ pressed }) => [styles.viewProfileBtn, { opacity: pressed ? 0.8 : 1 }]}
          accessibilityLabel="View full profile"
          accessibilityRole="button"
        >
          <Text style={styles.viewProfileText}>View</Text>
          <Icon name="ArrowRight" size={14} color="#FF8C00" variant="Bold" />
        </Pressable>
      </View>

      {/* Inner white card — avatar + level/XP */}
      <View style={styles.inner}>
        <View style={styles.profileRowCompact}>
          <View style={styles.avatarContainer}>
            <Image source={getProfileAvatarSource(userProfile.avatar_url)} style={styles.avatar} resizeMode="cover" />
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{userLevel}</Text>
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name} numberOfLines={1}>{userProfile.display_name || userProfile.username}</Text>
            <View style={styles.levelSectionCompact}>
              <View style={styles.levelMetaRow}>
                <Text style={styles.levelLabel}>Level {userLevel}</Text>
                <Text style={styles.levelXp}>{userProfile.total_xp.toLocaleString()} XP</Text>
              </View>
              <View style={styles.levelBarBg}>
                <View style={[styles.levelBarFill, { width: `${levelProgress * 100}%` }]} />
              </View>
              <Text style={styles.levelHint}>
                {100 - (userProfile.total_xp % 100)} XP until Level {userLevel + 1}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: "#FFCA5F",
    borderRadius: 26,
    padding: 10,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  header: {
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
    height: 36,
    borderRadius: 14,
  },
  levelPillText: {
    fontSize: 13,
    fontFamily: fontFamilies.heavy,
    color: "#FFFFFF",
  },
  viewProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  viewProfileText: {
    fontSize: 12,
    fontFamily: fontFamilies.heavy,
    color: "#FF8C00",
  },
  inner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderBottomWidth: 4,
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF3E0",
    borderWidth: 3,
    borderColor: "#FFF3E0",
  },
  levelBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#FF8C00",
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  levelBadgeText: {
    color: "#FFF",
    fontFamily: fontFamilies.heavy,
    fontSize: 11,
  },
  name: {
    fontSize: 18,
    fontFamily: fontFamilies.heavy,
    color: "#333333",
    marginBottom: 2,
  },
  levelMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
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
});
