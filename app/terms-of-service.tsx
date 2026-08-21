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
    title: "1. Acceptance of Terms",
    body: "By downloading, accessing, or using AtomIQ, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree with any part of these terms, please do not use the app.",
  },
  {
    title: "2. Educational Purpose",
    body: "AtomIQ is an educational application designed to teach nuclear science concepts including atomic structure, reactions, radiation, and everyday applications. The content is provided for general educational and informational purposes only.",
  },
  {
    title: "3. Content Accuracy",
    body: "While we strive to keep content accurate and up to date, educational material is provided \"as is\" without warranties of any kind. Nuclear science is a complex and developing field; where decisions with real-world impact are involved, always consult qualified professionals and official sources.",
  },
  {
    title: "4. User Conduct",
    body: "You agree to use AtomIQ responsibly. You must not attempt to compromise the app's security, abuse the AI chat feature, reverse-engineer the software, or use it for any unlawful or harmful purpose.",
  },
  {
    title: "5. Accounts and Data",
    body: "AtomIQ does not require an online account. Your progress and preferences are stored locally on your device. You are responsible for safeguarding your device and any data stored on it.",
  },
  {
    title: "6. AI Chat Usage",
    body: "The built-in AI tutor generates responses to help you learn. AI output may occasionally be inaccurate or incomplete and should be treated as a study aid, not an authoritative source. Do not input sensitive personal information into chat.",
  },
  {
    title: "7. Intellectual Property",
    body: "All content, design, trademarks, and software in AtomIQ are the property of AtomIQ or its licensors and are protected by applicable laws. You may not copy, reproduce, or redistribute the app or its content without permission.",
  },
  {
    title: "8. Disclaimer of Warranties",
    body: "AtomIQ is provided \"as is\" and \"as available\" without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.",
  },
  {
    title: "9. Limitation of Liability",
    body: "To the maximum extent permitted by law, AtomIQ and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of, or inability to use, the app.",
  },
  {
    title: "10. Termination",
    body: "We reserve the right to restrict, suspend, or terminate your access to AtomIQ at any time for violations of these terms or for any other reason at our discretion.",
  },
  {
    title: "11. Changes to These Terms",
    body: "We may update these Terms of Service periodically. The effective date below will be revised accordingly. Your continued use of AtomIQ after changes are posted constitutes acceptance of the updated terms.",
  },
  {
    title: "12. Contact Us",
    body: "If you have questions about these Terms of Service, please contact us at support@atomiq.app.",
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
