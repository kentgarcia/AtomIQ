import { Icon } from "@/components/ui/icon";
import { useTheme, type Palette, fontFamilies } from "@/theme";
import { useRouter } from "expo-router";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Section = { title: string; body: string };

const LAST_UPDATED = "January 15, 2026";

const SECTIONS: Section[] = [
  {
    title: "1. Introduction",
    body: "AtomIQ (\"we\", \"us\", or \"our\") is an educational app designed to help you learn about nuclear science. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using AtomIQ, you agree to the practices described below.",
  },
  {
    title: "2. Data We Collect",
    body: "We collect minimal data needed to power your learning experience. This includes your display name, learning progress, XP, streaks, achievements, and app preferences. We do not require you to create an online account or provide personal information to use the app.",
  },
  {
    title: "3. How We Store Your Data",
    body: "All of your progress and preferences are stored locally on your device using SQLite and local storage. We do not maintain a cloud database of your profile, and your data never leaves your device unless you choose to engage with features covered in this policy.",
  },
  {
    title: "4. AI Chat Assistance",
    body: "AtomIQ includes an AI-powered chat tutor. When you send a message, it may be processed by a third-party AI provider (such as Google Gemini) to generate a helpful reply. Please do not share personal or sensitive information in chat. Chat data is handled according to the respective provider's privacy policy.",
  },
  {
    title: "5. Third-Party Services",
    body: "We may rely on third-party services such as AI providers to operate certain features. These services process data only as needed to deliver the feature, and each is governed by its own privacy policy. We do not sell your data to anyone.",
  },
  {
    title: "6. Your Rights",
    body: "You are in control of your data. You can clear all progress or permanently delete your account and all local data at any time from the Settings screen. Deleting your data is irreversible.",
  },
  {
    title: "7. Children's Privacy",
    body: "AtomIQ is an educational tool suitable for all ages. We do not knowingly collect personal information from children. Because the app runs locally without a login, children can use it without sharing any personal data.",
  },
  {
    title: "8. Changes to This Policy",
    body: "We may update this Privacy Policy from time to time. When we do, the effective date at the top of this page will be revised. Continued use of the app after changes are posted constitutes acceptance of the updated policy.",
  },
  {
    title: "9. Contact Us",
    body: "If you have any questions about this Privacy Policy or how your data is handled, please contact us at support@atomiq.app.",
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const THEME = theme.palettes.settings;
  const styles = React.useMemo(() => createStyles(THEME), [THEME]);

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="ArrowLeft2" size={24} color={THEME.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <View style={styles.metaRow}>
            <Icon name="Calendar" size={14} color={THEME.textMuted} />
            <Text style={styles.metaText}>Last updated: {LAST_UPDATED}</Text>
          </View>

          <View style={styles.docCard}>
            <View style={styles.docHeader}>
              <View style={styles.docIcon}>
                <Icon name="DocumentText" size={22} color={THEME.primary} variant="Bold" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>Privacy Policy</Text>
                <Text style={styles.docSubtitle}>
                  How AtomIQ collects, uses, and protects your information.
                </Text>
              </View>
            </View>

            <View style={styles.headerDivider} />

            {SECTIONS.map((section, index) => (
              <View key={section.title} style={styles.block}>
                <Text style={styles.blockTitle}>{section.title}</Text>
                <Text style={styles.blockBody}>{section.body}</Text>
                {index < SECTIONS.length - 1 && <View style={styles.blockDivider} />}
              </View>
            ))}
          </View>

          <Text style={styles.footerNote}>
            © 2026 AtomIQ. All rights reserved.
          </Text>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Palette) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 16,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 20,
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: fontFamilies.bold,
      color: theme.text,
    },
    content: {
      padding: 20,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 14,
      paddingHorizontal: 2,
    },
    metaText: {
      fontSize: 12,
      fontFamily: fontFamilies.medium,
      color: theme.textMuted,
    },
    docCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 22,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    docHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 18,
    },
    docIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.primary + "14",
      borderWidth: 1,
      borderColor: theme.primary + "22",
      alignItems: "center",
      justifyContent: "center",
    },
    docTitle: {
      fontSize: 18,
      fontFamily: fontFamilies.bold,
      color: theme.text,
      marginBottom: 2,
    },
    docSubtitle: {
      fontSize: 13,
      fontFamily: fontFamilies.regular,
      color: theme.textMuted,
      lineHeight: 18,
    },
    headerDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginBottom: 20,
    },
    block: {
      paddingVertical: 2,
    },
    blockTitle: {
      fontSize: 15,
      fontFamily: fontFamilies.bold,
      color: theme.text,
      marginBottom: 8,
      lineHeight: 22,
    },
    blockBody: {
      fontSize: 14,
      fontFamily: fontFamilies.regular,
      color: theme.textMuted,
      lineHeight: 22,
    },
    blockDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginTop: 18,
      marginBottom: 2,
      opacity: 0.7,
    },
    footerNote: {
      fontSize: 12,
      fontFamily: fontFamilies.regular,
      color: theme.textMuted,
      textAlign: "center",
      marginTop: 18,
      lineHeight: 18,
    },
  });
