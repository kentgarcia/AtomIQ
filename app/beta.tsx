import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Alert, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { Shrodi } from "@/components/mascot/Shrodi";
import { settle } from "@/components/motion/settle";
import { settleDelay } from "@/components/motion/settle-core";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { BETA_FEEDBACK_FORM_URL, BETA_NOTICE_ID } from "@/constants/beta";
import { openExternalUrl } from "@/services/open-url";
import { setBetaNoticeSeen } from "@/services/storage";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";

/**
 * The public-beta page, opened from the beta button on Home: what a beta is, what we need help with, and the feedback form.
 * Opening it counts as reading the notice, so the button's "!" goes away.
 */

export default function BetaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();

  useEffect(() => {
    void setBetaNoticeSeen(BETA_NOTICE_ID).catch(() => undefined);
  }, []);

  const openFeedback = async () => {
    const opened = await openExternalUrl(BETA_FEEDBACK_FORM_URL);
    if (!opened) Alert.alert("Couldn't open the form", "Please check your internet connection and try again.");
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Public beta" onBack={() => router.back()} scrolled={scrolled} />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: gutter, paddingBottom: insets.bottom + 32 }]}
      >
        <Animated.View entering={settle()} style={styles.hero}>
          <Shrodi mood="happy" size={120} />
          <Text style={styles.heroTitle} accessibilityRole="header">
            Welcome to the Beta
          </Text>
          <Text style={styles.body}>Thanks for joining the public beta! This version is still in active development, so you may run into rough edges along the way.</Text>
        </Animated.View>

        <Animated.View entering={settle(settleDelay(1))} style={styles.block}>
          <View style={styles.blockHead}>
            <View style={styles.blockIcon}>
              <Icon name="Mobile" size={20} color={theme.colors.primaryLight} variant="Bold" />
            </View>
            <Text style={styles.blockTitle} accessibilityRole="header">
              Optimized for iPhone
            </Text>
          </View>
          <Text style={styles.body}>
            AtomIQ is currently tuned for iPhone. We need your help optimizing it for the many Android devices out there, different screen sizes, resolutions, and hardware.
          </Text>
        </Animated.View>

        <Animated.View entering={settle(settleDelay(2))} style={styles.block}>
          <View style={styles.blockHead}>
            <View style={styles.blockIcon}>
              <Icon name="Message" size={20} color={theme.colors.primaryLight} variant="Bold" />
            </View>
            <Text style={styles.blockTitle} accessibilityRole="header">
              Found something?
            </Text>
          </View>
          <Text style={styles.body}>
            Found a bug, a layout that looks off, or something that could feel better? Tell us through the feedback form — every report helps shape the final release.
          </Text>
          <Button label="Share feedback" onPress={() => void openFeedback()} renderIcon={(color) => <Icon name="Send" size={18} color={color} variant="Bold" />} />
          <Text style={styles.footnote}>You can find the feedback form anytime in Settings → Beta Feedback.</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.mapBackground },
    content: { paddingTop: 8 },
    hero: { alignItems: "center", gap: 10, paddingBottom: 20 },
    heroTitle: { fontSize: 24, lineHeight: 30, ...fontFaces.heavy, color: c.text, textAlign: "center" },
    block: { gap: 10, paddingVertical: 18, borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    blockHead: { flexDirection: "row", alignItems: "center", gap: 12 },
    blockIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSoft },
    blockTitle: { flex: 1, fontSize: 16, lineHeight: 22, ...fontFaces.heavy, color: c.text },
    body: { fontSize: 14, lineHeight: 22, ...fontFaces.medium, color: c.textSecondary },
    footnote: { fontSize: 12, lineHeight: 18, ...fontFaces.medium, color: c.textMuted, textAlign: "center" },
  };
});
