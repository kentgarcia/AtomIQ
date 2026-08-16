import { Icon } from "@/components/ui/icon";
import { useDailyMissions } from "@/hooks/use-daily-missions";
import { getDailyFact, type DailyFact } from "@/services/missions";
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

export default function DailyFactScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { missions, markFactRead } = useDailyMissions();
  const bgColors: [string, string] =
    theme.mode === "dark"
      ? [theme.palettes.tab.bg, theme.palettes.tab.bg]
      : [CREAM, "#FFFFFF"];

  const [dailyFact, setDailyFact] = useState<DailyFact | null>(null);

  useEffect(() => {
    void getDailyFact().then(setDailyFact);
  }, []);

  const factMission = missions.find((m) => m.type === "fact");
  const styles = useMemo(() => createStyles(), []);

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
          <Animated.View
            entering={FadeInDown.springify()}
            style={[styles.card, styles.factCard]}
          >
            <View style={styles.factHeader}>
              <View style={styles.factHeaderLeft}>
                <View
                  style={[
                    styles.factBadge,
                    dailyFact?.kind === "myth" && styles.factBadgeMyth,
                  ]}
                >
                  <Icon
                    name={dailyFact?.kind === "myth" ? "CloseCircle" : "TickCircle"}
                    size={13}
                    color="#FFFFFF"
                    variant="Bold"
                  />
                  <Text style={styles.factBadgeText}>
                    {dailyFact?.kind === "myth" ? "MYTH" : "DAILY FACT"}
                  </Text>
                </View>
                <Text style={styles.factTitle} numberOfLines={1}>
                  {dailyFact?.title ?? "Loading today's fact..."}
                </Text>
              </View>
              <View style={styles.rewardPill}>
                <Icon name="Flash" size={13} color="#FFA000" variant="Bold" />
                <Text style={styles.rewardText}>+50 XP</Text>
              </View>
            </View>

            {dailyFact ? (
              <>
                <Text style={styles.factStatement}>
                  {"\u201C"}{dailyFact.statement}{"\u201D"}
                </Text>
                <View style={styles.factDivider} />
                <Text style={styles.factExplainLabel}>Why it matters</Text>
                <Text style={styles.factExplain}>{dailyFact.explanation}</Text>
                <View style={styles.factAction}>
                  {factMission?.isClaimed ? (
                    <View style={styles.factReadPill}>
                      <Icon name="TickCircle" size={15} color="#FFFFFF" variant="Bold" />
                      <Text style={styles.factReadText}>Read & Claimed</Text>
                    </View>
                  ) : factMission?.isComplete ? (
                    <View style={styles.factReadPill}>
                      <Icon name="TickCircle" size={15} color="#FFFFFF" variant="Bold" />
                      <Text style={styles.factReadText}>Read — claim on Missions</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.factReadBtn}
                      activeOpacity={0.85}
                      onPress={() => void markFactRead()}
                    >
                      <Icon name="Book" size={16} color="#FFFFFF" variant="Bold" />
                      <Text style={styles.factReadText}>Mark as read</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              <Text style={styles.factExplain}>Loading...</Text>
            )}
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
    card: {
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      padding: 24,
      alignItems: "center",
      elevation: 5,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    /* Daily fact card */
    factCard: {
      paddingTop: 20,
      alignItems: "stretch",
      borderWidth: 2,
      borderColor: "#FFE0B2",
    },
    factHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    factHeaderLeft: {
      flex: 1,
      alignItems: "flex-start",
      gap: 6,
    },
    factBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#2ECC71",
      borderRadius: 9,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    factBadgeMyth: {
      backgroundColor: "#E74C3C",
    },
    factBadgeText: {
      fontSize: 11,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#FFFFFF",
      letterSpacing: 0.6,
    },
    factTitle: {
      fontSize: 16,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    factStatement: {
      fontSize: 17,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: "#1F2937",
      lineHeight: 25,
      marginTop: 16,
    },
    factDivider: {
      height: 1,
      backgroundColor: "#F0F0F0",
      marginVertical: 16,
    },
    factExplainLabel: {
      fontSize: 11,
      fontWeight: "700",
      fontFamily: fontFamilies.heavy,
      color: "#9CA3AF",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    factExplain: {
      fontSize: 14,
      fontFamily: fontFamilies.regular,
      color: "#555555",
      lineHeight: 22,
    },
    factAction: {
      flexDirection: "row",
      justifyContent: "flex-start",
      marginTop: 18,
    },
    factReadBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: BTN_COLOR,
      borderBottomWidth: 4,
      borderBottomColor: BTN_LIP,
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    factReadPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#2ECC71",
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    factReadText: {
      fontSize: 13,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#FFFFFF",
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
  });
