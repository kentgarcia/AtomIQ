import { Icon } from "@/components/ui/icon";
import { getProfileAvatarSource } from "@/services/profile-avatars";
import { useStorage } from "@/services/StorageContext";
import { createStyles, fontFaces, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Image, Pressable, Text, View } from "react-native";

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    outer: {
      backgroundColor: c.surfaceSoft,
      borderRadius: 26,
      padding: 10,
      gap: 10,
      shadowColor: c.shadow,
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
      backgroundColor: c.inverseSurface,
      paddingHorizontal: 12,
      height: 36,
      borderRadius: 14,
    },
    levelPillText: {
      fontSize: 13,
      ...fontFaces.heavy,
      color: c.inverseText,
    },
    viewProfileBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.card,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
    },
    viewProfileText: {
      fontSize: 12,
      ...fontFaces.heavy,
      color: c.link,
    },
    inner: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 16,
      borderWidth: 2,
      borderColor: c.border,
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
      backgroundColor: c.surfaceSoft,
      borderWidth: 3,
      borderColor: c.surfaceSoft,
    },
    levelBadge: {
      position: "absolute",
      bottom: -2,
      right: -2,
      backgroundColor: c.link,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: c.card,
    },
    levelBadgeText: {
      color: c.onPrimary,
      ...fontFaces.heavy,
      fontSize: 11,
    },
    name: {
      fontSize: 18,
      ...fontFaces.heavy,
      color: c.text,
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
      ...fontFaces.heavy,
      color: c.text,
    },
    levelXp: {
      fontSize: 12,
      ...fontFaces.bold,
      color: c.link,
    },
    levelBarBg: {
      height: 10,
      borderRadius: 5,
      backgroundColor: c.surfaceSoft,
      overflow: "hidden",
    },
    levelBarFill: {
      height: "100%",
      borderRadius: 5,
      backgroundColor: c.link,
    },
    levelHint: {
      fontSize: 11,
      ...fontFaces.semibold,
      color: c.textMuted,
      marginTop: 6,
    },
    loadingText: {
      color: c.text,
      ...fontFaces.medium,
    },
    loadingOuter: {
      backgroundColor: c.surfaceSoft,
      borderRadius: 26,
      padding: 16,
    },
  };
});

export function ProfileProgressCard() {
  const { theme } = useTheme();
  const { userProfile } = useStorage();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
      <View style={styles.loadingOuter}>
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <View style={styles.outer}>
      {/* Header inside amber — level pill */}
      <View style={styles.header}>
        <View style={styles.levelPill}>
          <Icon name="Crown" size={14} color={theme.colors.inverseText} variant="Bold" />
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
          <Icon name="ArrowRight" size={14} color={theme.colors.link} variant="Bold" />
        </Pressable>
      </View>

      {/* Inner card — avatar + level/XP */}
      <View style={styles.inner}>
        <View style={styles.profileRowCompact}>
          <View style={styles.avatarContainer}>
            <Image source={getProfileAvatarSource(userProfile.avatar_url)} style={styles.avatar} resizeMode="cover" />
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{userLevel}</Text>
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{userProfile.display_name || userProfile.username}</Text>
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
