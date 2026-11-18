import { Icon } from "@/components/ui/icon";
import { ModalButton, ModalSecondaryButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { createStyles, fontFaces, radius, useTheme } from "@/theme";
import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

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
  const styles = makeStyles(theme);

  return (
    <ModalDialog
      visible={visible}
      onClose={onDismiss}
      title="Welcome to the Beta"
      closeLabel="Dismiss beta notice"
      footer={
        <>
          <ModalButton
            label="Share Feedback"
            onPress={onOpenFeedback}
            renderIcon={(color) => <Icon name="Send" size={17} color={color} variant="Bold" />}
          />
          <ModalSecondaryButton label="Got it" onPress={onDismiss} accessibilityLabel="Dismiss beta notice" />
        </>
      }
    >
      <Text style={styles.body}>
        Thanks for joining the public beta! This version is still in active development, so you may
        run into rough edges along the way.
      </Text>

      <View style={styles.callout}>
        <View style={styles.calloutIcon}>
          <Icon name="Mobile" size={18} color={theme.colors.primaryLight} variant="Bold" />
        </View>
        <View style={styles.calloutTextWrap}>
          <Text style={styles.calloutTitle}>Optimized for iPhone</Text>
          <Text style={styles.calloutBody}>
            AtomIQ is currently tuned for iPhone. We need your help optimizing it for the many
            Android devices out there, different screen sizes, resolutions, and hardware.
          </Text>
        </View>
      </View>

      <Text style={styles.body}>
        Found a bug, a layout that looks off, or something that could feel better? Tell us through
        the feedback form — every report helps shape the final release.
      </Text>

      <Text style={styles.footnote}>
        You can find the feedback form anytime in Settings → Beta Feedback.
      </Text>
    </ModalDialog>
  );
}

const makeStyles = createStyles((theme) => ({
  body: {
    fontSize: 14,
    ...fontFaces.regular,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  callout: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: radius.lg,
    padding: 12,
  },
  calloutIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
  },
  calloutTextWrap: { flex: 1 },
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
  footnote: {
    fontSize: 11,
    ...fontFaces.regular,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 16,
  },
}));
