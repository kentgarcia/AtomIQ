import { StyleSheet } from "react-native";

import { TabLight as LightTHEME } from "@/theme";

export const createStyles = (theme: typeof LightTHEME, width: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    content: {
      paddingBottom: 40,
    },
    // Header
    header: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      backgroundColor: theme.card,
    },
    headerContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerTextContainer: {
      flex: 1,
      paddingRight: 12,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "800",
      marginBottom: 4,
      color: theme.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.textMuted,
      fontWeight: "500",
    },
    headerStats: {
      flexDirection: "row",
      gap: 8,
    },
    compactStat: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: theme.bg,
    },
    compactStatText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.text,
    },

    // Section Container
    sectionContainer: {
      marginTop: 24,
    },

    // Leaderboard Card
    leaderboardCard: {
      marginHorizontal: 20,
      borderRadius: 24,
      overflow: "hidden",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      backgroundColor: theme.card,
    },
    leaderboardGradient: {
      padding: 20,
    },
    leaderboardContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    leaderboardIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.3)",
    },
    leaderboardTextContainer: {
      flex: 1,
    },
    leaderboardTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: "#FFFFFF",
      marginBottom: 4,
    },
    leaderboardDesc: {
      fontSize: 14,
      color: "rgba(255,255,255,0.9)",
      fontWeight: "600",
    },
    leaderboardArrow: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },

    // Section Headers
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "800",
      flex: 1,
      color: theme.text,
    },
    sectionCount: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.textMuted,
    },

    // Certificates
    certificatesScrollContent: {
      paddingHorizontal: 20,
      gap: 16,
      paddingBottom: 20, // Space for shadow
    },

    // Achievements Grid
    achievementsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
  });