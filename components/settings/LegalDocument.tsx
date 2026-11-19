/**
 * LegalDocument — the page the Privacy Policy and Terms of Service share, flat like Settings: the
 * standard header, a short lead-in with its icon and the date, then the numbered sections split by
 * dashed lines. No card. The text is selectable so it can be copied.
 */

import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { settle } from "@/components/motion/settle";
import { settleDelay } from "@/components/motion/settle-core";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";

export type LegalSection = { title: string; body: string };

/** A body is paragraphs split by a newline; one that starts with "• " is a bullet with a hanging indent. */
function LegalBody({ body, styles }: { body: string; styles: ReturnType<typeof useStyles> }) {
  return (
    <View style={styles.paragraphs}>
      {body.split("\n").map((line, i) =>
        line.startsWith("• ") ? (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={[styles.blockBody, styles.bulletText]} selectable>
              {line.slice(2)}
            </Text>
          </View>
        ) : (
          <Text key={i} style={styles.blockBody} selectable>
            {line}
          </Text>
        ),
      )}
    </View>
  );
}

export function LegalDocument({
  title,
  icon,
  lead,
  lastUpdated,
  version,
  highlights,
  sections,
}: {
  title: string;
  icon: string;
  /** One line under the title: what this document is for. */
  lead: string;
  lastUpdated: string;
  version: string;
  /** "In short": the few things most people want to know, before the full text. */
  highlights: readonly string[];
  sections: readonly LegalSection[];
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();

  return (
    <View style={styles.container}>
      <ScreenHeader title={title} subtitle={`Version ${version} · Updated ${lastUpdated}`} onBack={() => router.back()} scrolled={scrolled} />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: gutter, paddingBottom: insets.bottom + 32 }]}
      >
        <Animated.View entering={settle()} style={styles.lead}>
          <View style={styles.leadIcon}>
            <Icon name={icon} size={24} color={theme.palettes.settings.primary} variant="Bold" />
          </View>
          <Text style={styles.leadText}>{lead}</Text>
        </Animated.View>

        <Animated.View entering={settle(settleDelay(1))} style={styles.short}>
          <Text style={styles.shortTitle} accessibilityRole="header">
            In short
          </Text>
          {highlights.map((line) => (
            <View key={line} style={styles.shortRow}>
              <Icon name="TickCircle" size={18} color={theme.colors.success} variant="Bold" />
              <Text style={styles.shortText}>{line}</Text>
            </View>
          ))}
        </Animated.View>

        {sections.map((section, i) => (
          <Animated.View key={section.title} entering={i < 5 ? settle(settleDelay(i + 2)) : undefined} style={styles.block}>
            <Text style={styles.blockTitle} accessibilityRole="header">
              {section.title}
            </Text>
            <LegalBody body={section.body} styles={styles} />
          </Animated.View>
        ))}

        <Text style={styles.footerNote}>© 2026 AtomIQ. All rights reserved.</Text>
      </ScrollView>
    </View>
  );
}

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.mapBackground },
    content: { paddingTop: 8 },
    lead: { flexDirection: "row", alignItems: "center", gap: 14, paddingBottom: 18 },
    leadIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(theme.palettes.settings.primary, 0.14),
    },
    leadText: { flex: 1, fontSize: 15, lineHeight: 21, ...fontFaces.semibold, color: c.textSecondary },
    short: { gap: 10, paddingVertical: 18, borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    shortTitle: { fontSize: 16, lineHeight: 22, ...fontFaces.heavy, color: c.text },
    shortRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    shortText: { flex: 1, fontSize: 14, lineHeight: 21, ...fontFaces.semibold, color: c.textSecondary },
    paragraphs: { gap: 8 },
    bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingLeft: 4 },
    bullet: { fontSize: 14, lineHeight: 22, ...fontFaces.heavy, color: c.textMuted },
    bulletText: { flex: 1 },
    block: { gap: 8, paddingVertical: 18, borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    blockTitle: { fontSize: 16, lineHeight: 22, ...fontFaces.heavy, color: c.text },
    blockBody: { fontSize: 14, lineHeight: 22, ...fontFaces.medium, color: c.textMuted },
    footerNote: { fontSize: 12, lineHeight: 18, ...fontFaces.medium, color: c.textFaint, textAlign: "center", paddingTop: 18, borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
  };
});
