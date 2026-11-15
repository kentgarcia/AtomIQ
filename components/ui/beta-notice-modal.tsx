import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { createStyles, fontFaces, radius, spacing, useTheme } from "@/theme";
import React, { useMemo } from "react";
import {
  Modal,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BetaNoticeModalProps = {
  visible: boolean;
  onDismiss: () => void;
  onOpenFeedback: () => void;
};

export function BetaNoticeModal({
  visible,
  onDismiss,
  onOpenFeedback,
}: BetaNoticeModalProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View
        style={[
          styles.overlay,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
      >
        <Animated.View
          entering={
            reducedMotion
              ? FadeIn.duration(120)
              : FadeInDown.duration(280).springify()
          }
          style={[styles.card, { maxHeight: Math.max(320, height * 0.85) }]}
          accessibilityViewIsModal
        >
          <Text style={styles.title}>Welcome to the AtomIQ Beta</Text>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.body}>
              Thanks for joining the public beta! This version is still in
              active development, so you may run into rough edges along the
              way.
            </Text>

            <View style={styles.callout}>
              <View style={styles.calloutIcon}>
                <Icon name="Mobile" size={18} color={theme.colors.primaryLight} variant="Bold" />
              </View>
              <View style={styles.calloutTextWrap}>
                <Text style={styles.calloutTitle}>Optimized for iPhone</Text>
                <Text style={styles.calloutBody}>
                  AtomIQ is currently tuned for iPhone. We need your help
                  optimizing it for the many Android devices out there, 
                  different screen sizes, resolutions, and hardware.
                </Text>
              </View>
            </View>

            <Text style={styles.body}>
              Found a bug, a layout that looks off, or something that could
              feel better? Tell us through the feedback form — every report
              helps shape the final release.
            </Text>
          </ScrollView>

          <View style={styles.actions}>
            <Button
              label="Share Feedback"
              onPress={onOpenFeedback}
              renderIcon={(color) => (
                <Icon name="Send" size={17} color={color} variant="Bold" />
              )}
            />
            <Button
              label="Got it"
              variant="secondary"
              onPress={onDismiss}
              accessibilityLabel="Dismiss beta notice"
            />
          </View>

          <Text style={styles.footnote}>
            You can find the feedback form anytime in Settings → Beta Feedback.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = createStyles((theme) => ({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
    },
    card: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: theme.colors.card,
      borderRadius: radius["2xl"],
      padding: spacing.lg,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderBottomWidth: 4,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: theme.mode === "dark" ? 0.4 : 0.18,
      shadowRadius: 20,
      elevation: 12,
    },
    title: {
      fontSize: 21,
      ...fontFaces.heavy,
      color: theme.colors.text,
      marginBottom: 8,
    },
    bodyScroll: {
      flexGrow: 0,
      flexShrink: 1,
    },
    bodyContent: {
      paddingBottom: 4,
    },
    body: {
      fontSize: 13,
      ...fontFaces.regular,
      color: theme.colors.textSecondary,
      lineHeight: 19,
      marginBottom: 12,
    },
    callout: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      borderRadius: radius.lg,
      padding: 12,
      marginBottom: 12,
    },
    calloutIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceSoft,
    },
    calloutTextWrap: {
      flex: 1,
    },
    calloutTitle: {
      fontSize: 13,
      ...fontFaces.bold,
      color: theme.colors.text,
      marginBottom: 3,
    },
    calloutBody: {
      fontSize: 12,
      ...fontFaces.regular,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    actions: {
      gap: spacing.sm,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
    },
    footnote: {
      fontSize: 11,
      ...fontFaces.regular,
      color: theme.colors.textMuted,
      textAlign: "center",
      lineHeight: 16,
      marginTop: 2,
    },
}));
