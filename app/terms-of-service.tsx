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
    title: "1. Acceptance of Terms",
    body: "By downloading, accessing, or using AtomIQ, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree with any part of these terms, please do not use the app.",
  },
  {
    title: "2. What AtomIQ Provides",
    body: "AtomIQ is a local-first nuclear science learning app. It offers a guided learning path of lessons and quizzes; the MythBuster game (Quick Play, Challenge, and Endless modes); Shrodi, a tap-based pill guide that routes you to lessons, encyclopedia entries, articles, journeys, and games without typing; a discovery feed with bookmarks; explorer journeys, a searchable encyclopedia, and the Atom Maze; interactive labs such as the Dose Visualizer and Energy Showdown; daily facts, missions, and streak tracking; and XP, levels, achievements, personal-best scores, and an on-device leaderboard alongside profile and settings customization.",
  },
  {
    title: "3. Eligibility and Children",
    body: "AtomIQ is suitable for general audiences, including students. If you are under the age of majority in your country, please use the app with the involvement of a parent, guardian, or teacher. By using AtomIQ you confirm you meet your local age requirements for downloading and using apps.",
  },
  {
    title: "4. Educational Purpose and Safety",
    body: "All lessons, labs, visualizations, and game content are provided for general education and illustration only — not as professional, medical, engineering, or regulatory advice. Never attempt real-world experiments with radioactive materials, radiation sources, or energy equipment based on anything shown in the app. For real-world decisions, always consult qualified professionals and official sources such as the IAEA, UNSCEAR, or your national regulator.",
  },
  {
    title: "5. Content Accuracy and External Sources",
    body: "We strive to keep educational content accurate and up to date, but nuclear science is complex and evolving, and the material is provided \"as is\" without guarantees of completeness or correctness. Some entries link to or cite external sources (for example IAEA, Britannica, EPA, or World Nuclear Association pages) and may show remote cover images; we do not control third-party sites or content and are not responsible for them. Always verify important facts against primary sources.",
  },
  {
    title: "6. Acceptable Use",
    body: "You agree to use AtomIQ responsibly and only for personal, non-commercial learning. You must not misuse the app, attempt to compromise its security or integrity, interfere with other users' devices, reverse-engineer or extract the software beyond what the law permits, tamper with local data to falsify scores or achievements, or use the app for any unlawful, harmful, or misleading purpose.",
  },
  {
    title: "7. Profiles, Progress, and Local Data",
    body: "AtomIQ requires no online account: your profile, preferences, bookmarks, XP, streaks, achievements, and game progress are stored only on your device (SQLite and local storage) as described in the Privacy Policy. There is no cloud sync, so progress does not transfer between devices, and uninstalling the app, clearing its data, or using Settings > Delete Account permanently removes it. Leaderboard rivals shown in the app are simulated on-device characters for motivation, not real users.",
  },
  {
    title: "8. Shrodi Guide",
    body: "Shrodi is a rule-based, tap-to-navigate companion — not a generative-AI chat service. Tapping sentence pills and options moves you through bundled on-device content, and no conversation is transmitted to an AI provider. Treat Shrodi's prompts as navigation aids within the app's educational material.",
  },
  {
    title: "9. Intellectual Property",
    body: "The AtomIQ app, including its software, design, mascot and artwork, lessons, quizzes, games, and text, is owned by AtomIQ or its licensors and is protected by applicable intellectual-property laws. Third-party references and source materials remain the property of their respective owners and are credited where shown. You are granted a personal, non-transferable, revocable license to use the app for learning; you may not copy, reproduce, redistribute, or create derivative works from the app or its content without permission except as allowed by law.",
  },
  {
    title: "10. Third-Party Software and Links",
    body: "AtomIQ is built with third-party open-source software (including Expo and React Native) and uses on-device OS capabilities such as text-to-speech, haptics, audio playback, and the system or in-app browser for external links. External websites you choose to open are governed by their own terms and privacy policies.",
  },
  {
    title: "11. Disclaimer of Warranties",
    body: "AtomIQ is provided \"as is\" and \"as available\" without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, accuracy, reliability, availability, and non-infringement.",
  },
  {
    title: "12. Limitation of Liability",
    body: "To the maximum extent permitted by law, AtomIQ and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including loss of progress, data, or device use — arising out of your use of, or inability to use, the app or reliance on its educational content.",
  },
  {
    title: "13. Termination",
    body: "You may stop using AtomIQ at any time by uninstalling it or deleting your local data in Settings. We may discontinue, update, or change the app and its content at any time. Because AtomIQ is local-first with no server account to suspend, these terms apply for as long as you keep or use any copy of the app.",
  },
  {
    title: "14. Changes to These Terms",
    body: "We may update these Terms of Service periodically, for example when features or legal requirements change. The effective date above will be revised accordingly, and material changes will be reflected in the app. Your continued use of AtomIQ after changes are posted constitutes acceptance of the updated terms.",
  },
];

export default function TermsOfServiceScreen() {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
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
                <Icon name="Shield" size={22} color={THEME.primary} variant="Bold" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>Terms of Service</Text>
                <Text style={styles.docSubtitle}>
                  Please read these terms carefully before using AtomIQ.
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
