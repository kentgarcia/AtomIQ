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

const LAST_UPDATED = "September 21, 2026";

const SECTIONS: Section[] = [
  {
    title: "1. Introduction",
    body: "AtomIQ (\"we\", \"us\", or \"our\") is a local-first educational app for learning nuclear science — including lessons and quizzes, the MythBuster game, the Shrodi guide, discovery feed, explorer journeys and encyclopedia, interactive labs, daily facts and missions, and XP, streaks, achievements, and leaderboards. This Privacy Policy explains what information the app handles, how it is stored, and the choices you have. By using AtomIQ, you agree to the practices described below.",
  },
  {
    title: "2. Data We Collect",
    body: "We collect only the minimum needed for your learning experience, and you provide it directly in the app: your display name or username, avatar choice, onboarding selections, learning progress (completed lessons, quizzes, journeys, nodes, and mazes), XP, levels, stars, streaks, missions, achievements and awards, game scores, bookmarks, and app preferences (theme, sound effects, haptics, notification and unit/level state). We do not require an online account, email, phone number, or any government identifier.",
  },
  {
    title: "3. How We Store Your Data",
    body: "Everything is stored locally on your device using SQLite and AsyncStorage — your profile, progress, and preferences never leave your device and are never uploaded to our servers, because we operate none. Uninstalling the app or clearing its data removes this information. There is no cloud sync or cross-device backup provided by AtomIQ.",
  },
  {
    title: "4. What We Do Not Collect",
    body: "AtomIQ has no analytics SDK, no advertising SDK, no user tracking, and no data brokers. We do not collect precise location, contacts, photos, microphone or camera input, device advertising identifiers, or browsing history. We do not sell, rent, or share your personal information with anyone, and the simulated leaderboard characters and community feed content are bundled or generated on-device — they involve no real users and no social data leaving your phone.",
  },
  {
    title: "5. Network Use and External Content",
    body: "AtomIQ's core features — lessons, quizzes, games, the Shrodi guide, encyclopedia, labs, and progress tracking — work fully offline from the bundled database. A network connection is used only when you choose to open an external source link (for example IAEA, Britannica, EPA, or World Nuclear Association references) in the in-app browser, visit the developer credit link in Settings, or load a remote cover image. Those external sites and image hosts are governed by their own privacy policies, and we encourage you to review them before interacting.",
  },
  {
    title: "6. Device Features",
    body: "Text-to-speech read-aloud, haptics, and sound effects run on your device using OS capabilities (such as the system speech engine). Lesson text you choose to hear is processed on-device for playback and is not sent by AtomIQ to any server. AtomIQ does not request microphone, camera, or background-location access.",
  },
  {
    title: "7. Children's Privacy",
    body: "AtomIQ is an educational tool suitable for general audiences, including students using it with a parent, guardian, or teacher. Because the app runs locally without logins and we knowingly collect no personal information from anyone — children included — a child can learn without sharing personal data. Parents or guardians who want progress removed can delete it at any time from Settings.",
  },
  {
    title: "8. Your Rights and Controls",
    body: "You are in control of your data. You can review and change your display name, avatar, and preferences in Profile and Settings, remove bookmarks and progress as you learn, or permanently delete your profile and all local data via Settings > Delete Account. Deletion is immediate and irreversible on the device. To exercise a question or request about this policy, contact us at the address below.",
  },
  {
    title: "9. Data Security",
    body: "Local-only storage greatly limits exposure, and we take reasonable steps to keep the app's code and bundled content safe. No method of storage is perfectly secure, so please protect your device with a lock screen, be cautious with device backups and shared devices, and keep your operating system up to date.",
  },
  {
    title: "10. Changes to This Policy",
    body: "We may update this Privacy Policy from time to time, for example when features or legal requirements change. When we do, the effective date at the top of this page will be revised, and material changes will be reflected in the app. Continued use of the app after changes are posted constitutes acceptance of the updated policy.",
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
