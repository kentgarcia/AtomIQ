import { Icon } from "@/components/ui/icon";
import { useDailyMissions } from "@/hooks/use-daily-missions";
import { useTheme, fontFamilies } from "@/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

/* Autumn design tokens shared with the profile + streak screens */
const BTN_COLOR = "#FF8C00";
const BTN_LIP = "#E67E22";
const CREAM = "#FFF3E0";

const getTimeToReset = (now: Date): string => {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
};

export default function MissionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { missions, claim, refresh, completedCount } = useDailyMissions();
  const bgColors: [string, string] =
    theme.mode === "dark"
      ? [theme.palettes.tab.bg, theme.palettes.tab.bg]
      : [CREAM, "#FFFFFF"];

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const styles = useMemo(() => createStyles(), []);

  const progressFraction = missions.length ? completedCount / missions.length : 0;

  return (
    <View style={[styles.container, { backgroundColor: bgColors[0] }]}>
      <LinearGradient
        colors={bgColors}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={{ flex: 1 }}>
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 10 }]}
          onPress={() => router.back()}
        >
          <Icon name="Close" size={22} color="#888888" />
        </TouchableOpacity>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 10 },
          ]}
        >
          {/* Hero card */}
          <Animated.View entering={FadeInDown.springify()} style={styles.card}>
            <View style={styles.tape} />
            <View style={styles.medalButton}>
              <View style={[styles.medalInner, { backgroundColor: BTN_LIP }]}>
                <View style={[styles.medalFace, { backgroundColor: BTN_COLOR }]}>
                  <Icon name="Medal" size={32} color="#FFFFFF" variant="Bold" />
                </View>
              </View>
            </View>
            <Text style={styles.heroTitle}>Daily Missions</Text>
            <Text style={styles.heroSub}>
              Complete tasks to earn bonus XP. Missions reset every day.
            </Text>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(6, progressFraction * 100)}%` },
                ]}
              />
            </View>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                {completedCount} / {missions.length} claimed today
              </Text>
              <Text style={styles.progressText}>Resets in {getTimeToReset(now)}</Text>
            </View>
          </Animated.View>

          {/* Mission cards */}
          {missions.map((mission, index) => {
            const showClaim = mission.isComplete && !mission.isClaimed;
            return (
              <Animated.View
                key={mission.id}
                entering={FadeInDown.delay(80 + index * 80).springify()}
                style={[
                  styles.card,
                  styles.missionCard,
                  mission.isClaimed && styles.missionClaimedCard,
                ]}
              >
                <View style={styles.missionHeader}>
                  <View
                    style={[
                      styles.missionIconCircle,
                      mission.isComplete && styles.missionIconCircleActive,
                    ]}
                  >
                    <Icon
                      name={mission.icon}
                      size={22}
                      color={mission.isComplete ? "#FFFFFF" : BTN_COLOR}
                      variant="Bold"
                    />
                  </View>
                  <View style={styles.missionInfo}>
                    <Text style={styles.missionTitle}>{mission.title}</Text>
                    <Text style={styles.missionDesc} numberOfLines={1}>
                      {mission.description}
                    </Text>
                  </View>
                  <View style={styles.rewardPill}>
                    <Icon name="Flash" size={13} color="#FFA000" variant="Bold" />
                    <Text style={styles.rewardText}>+{mission.reward} XP</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.missionTrack}>
                  <View
                    style={[
                      styles.missionFill,
                      {
                        width: `${
                          mission.target > 0
                            ? Math.max(6, (mission.progress / mission.target) * 100)
                            : 0
                        }%`,
                        backgroundColor: mission.isClaimed
                          ? "#2ECC71"
                          : mission.isComplete
                          ? BTN_COLOR
                          : "#E0E0E0",
                      },
                    ]}
                  />
                </View>
                <View style={styles.missionFooter}>
                  <Text style={styles.progressText}>
                    {mission.progress} / {mission.target}
                  </Text>
                  {mission.isClaimed ? (
                    <View style={styles.claimedPill}>
                      <Icon name="TickCircle" size={15} color="#FFFFFF" variant="Bold" />
                      <Text style={styles.claimedText}>Claimed</Text>
                    </View>
                  ) : showClaim ? (
                    <TouchableOpacity
                      style={styles.claimBtn}
                      activeOpacity={0.85}
                      onPress={() => void claim(mission)}
                    >
                      <Text style={styles.claimText}>Claim +{mission.reward} XP</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.lockedPill}>
                      <Text style={styles.lockedText}>In progress</Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            );
          })}

          {/* Motivation footer */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            style={styles.card}
          >
            <View style={styles.tipRow}>
              <View style={styles.tipIconCircle}>
                <Icon name="Cup" size={16} color="#E67E22" variant="Bold" />
              </View>
              <Text style={styles.tipText}>
                Come back tomorrow — missions refresh with new XP to earn!
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    closeBtn: {
      position: "absolute",
      left: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
      elevation: 3,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
      paddingTop: 56,
    },
    /* Shared rounded card, like the streak cards */
    card: {
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      padding: 24,
      paddingTop: 28,
      alignItems: "center",
      marginBottom: 20,
      elevation: 5,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    tape: {
      position: "absolute",
      top: -11,
      alignSelf: "center",
      width: 84,
      height: 22,
      borderRadius: 3,
      backgroundColor: "rgba(255,140,0,0.30)",
      borderColor: "rgba(255,140,0,0.35)",
      borderWidth: 1,
      transform: [{ rotate: "-4deg" }],
    },
    /* Reference button structure: white border + orange face over a lip */
    medalButton: {
      width: 84,
      height: 84,
      borderRadius: 27,
      borderWidth: 5,
      borderColor: "#FFFFFF",
      backgroundColor: "#FFFFFF",
      marginBottom: 6,
      elevation: 6,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    medalInner: {
      flex: 1,
      alignSelf: "stretch",
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    medalFace: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 12,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#333333",
      marginTop: 10,
    },
    heroSub: {
      fontSize: 13,
      fontFamily: fontFamilies.regular,
      color: "#888888",
      textAlign: "center",
      lineHeight: 19,
      marginTop: 6,
    },
    progressTrack: {
      alignSelf: "stretch",
      height: 12,
      borderRadius: 6,
      backgroundColor: "#F4F5F7",
      marginTop: 18,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 6,
      backgroundColor: BTN_COLOR,
    },
    progressRow: {
      alignSelf: "stretch",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 8,
    },
    progressText: {
      fontSize: 12,
      fontFamily: fontFamilies.semibold,
      color: "#9CA3AF",
    },
    /* Mission cards */
    missionCard: {
      paddingTop: 20,
      alignItems: "stretch",
    },
    missionClaimedCard: {
      borderWidth: 2,
      borderColor: "#C8E6C9",
    },
    missionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    missionIconCircle: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: CREAM,
      alignItems: "center",
      justifyContent: "center",
    },
    missionIconCircleActive: {
      backgroundColor: BTN_COLOR,
    },
    missionInfo: {
      flex: 1,
    },
    missionTitle: {
      fontSize: 15,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    missionDesc: {
      fontSize: 12,
      fontFamily: fontFamilies.regular,
      color: "#9CA3AF",
      marginTop: 2,
    },
    rewardPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: CREAM,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    rewardText: {
      fontSize: 12,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#E67E22",
    },
    missionTrack: {
      alignSelf: "stretch",
      height: 8,
      borderRadius: 4,
      backgroundColor: "#F4F5F7",
      marginTop: 14,
      overflow: "hidden",
    },
    missionFill: {
      height: "100%",
      borderRadius: 4,
    },
    missionFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 10,
    },
    claimBtn: {
      backgroundColor: BTN_COLOR,
      borderBottomWidth: 4,
      borderBottomColor: BTN_LIP,
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    claimText: {
      fontSize: 13,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#FFFFFF",
    },
    claimedPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#2ECC71",
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    claimedText: {
      fontSize: 13,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#FFFFFF",
    },
    lockedPill: {
      backgroundColor: "#F4F5F7",
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    lockedText: {
      fontSize: 13,
      fontFamily: fontFamilies.semibold,
      color: "#9CA3AF",
    },
    tipRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      alignSelf: "stretch",
    },
    tipIconCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: CREAM,
      alignItems: "center",
      justifyContent: "center",
    },
    tipText: {
      flex: 1,
      fontSize: 13,
      fontFamily: fontFamilies.regular,
      color: "#555555",
      lineHeight: 19,
    },
  });