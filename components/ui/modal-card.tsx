/**
 * ModalCard — the one card every modal uses (the Edit Profile modal's design): a face on a lip, a
 * yellow header band with the title and a white round close button holding a plain X (the circle is
 * the button's own, so the glyph has none), and a white body.
 *
 * The house rules, built in so a caller only supplies content:
 *   - Content sits 20 from the sides (and 18 below the header); children are spaced 14 apart.
 *   - It is as tall as its content, so everything shows without scrolling. Only when the content
 *     is taller than the screen (`maxHeight`, default: the screen minus its insets and a 20 margin)
 *     does the body scroll, inside the card; the header and the footer stay put.
 *   - `footer` holds the actions, pinned under the body (outside the scroll, so they are always
 *     reachable, with the keyboard open too). The main button is <ModalButton>: same yellow as the
 *     header and a little taller than a normal button. Other actions use another variant, for
 *     example `destructive` for a delete.
 *
 *   <ModalDialog visible={open} onClose={close} title="Edit Profile" footer={<ModalButton label="Save" onPress={save} />}>
 *     …content…
 *   </ModalDialog>
 *
 * `ModalCard` alone is the card without the Modal, scrim and animation (see `modal-dialog.tsx`,
 * which wraps it; use that unless you already have your own overlay).
 */

import React from "react";
import { Pressable, ScrollView, useWindowDimensions, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, type ButtonProps } from "@/components/ui/button";
import { CloseGlyph } from "@/components/ui/close-glyph";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";

/** Space from the screen edge (and safe area) to a modal. */
export const MODAL_MARGIN = 20;
/** Space between the card's edge and its content. */
export const MODAL_SIDE = 20;

export interface ModalCardProps {
  title: string;
  onClose?: () => void;
  /** Spoken name of the close button. */
  closeLabel?: string;
  /** Replaces the close circle (e.g. a different icon button). */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  /** Actions pinned under the body: a <ModalButton> and any other buttons. */
  footer?: React.ReactNode;
  maxWidth?: number;
  /** Caps the card; the body scrolls past it. Default: the screen minus its safe areas and margins. */
  maxHeight?: number;
  style?: StyleProp<ViewStyle>;
  /** Overrides for the scrolling content (padding, gap). */
  bodyStyle?: StyleProp<ViewStyle>;
}

export function ModalCard({
  title,
  onClose,
  closeLabel = "Close",
  headerRight,
  children,
  footer,
  maxWidth = 380,
  maxHeight,
  style,
  bodyStyle,
}: ModalCardProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const c = theme.colors;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cap = maxHeight ?? Math.max(240, height - insets.top - insets.bottom - MODAL_MARGIN * 2);

  return (
    <View style={[styles.card, { maxWidth, maxHeight: cap }, style]} accessibilityViewIsModal>
      {/* The lip: its own layer under the face, so it shows only along the bottom edge */}
      <View pointerEvents="none" style={styles.lip} />
      <View style={styles.face}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
            {title}
          </Text>
          {headerRight ??
            (onClose ? (
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={({ pressed }) => [styles.close, pressed && { opacity: 0.8 }]}
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
              >
                <CloseGlyph size={16} color={c.lessonHeader} />
              </Pressable>
            ) : null)}
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.body, footer ? styles.bodyWithFooter : styles.bodyLast, bodyStyle]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </View>
  );
}

/** The main button of a modal: the header's yellow, a little taller than a normal button. */
export function ModalButton(props: Omit<ButtonProps, "variant" | "size"> & { variant?: ButtonProps["variant"] }) {
  const { variant = "modal", ...rest } = props;
  return <Button size="large" variant={variant} {...rest} />;
}

/** A secondary action under the main one (white face, orange label); pass `variant` for a coloured one. */
export function ModalSecondaryButton(props: Omit<ButtonProps, "size" | "variant"> & { variant?: ButtonProps["variant"] }) {
  const { variant = "secondary", ...rest } = props;
  return <Button size="large" variant={variant} {...rest} />;
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    card: { width: "100%", flexShrink: 1, paddingBottom: controls.lip },
    lip: {
      position: "absolute",
      top: controls.lip,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 20,
      backgroundColor: c.lessonLip,
    },
    face: { flexShrink: 1, borderRadius: 20, overflow: "hidden", backgroundColor: c.card },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingLeft: MODAL_SIDE,
      paddingRight: 14,
      paddingVertical: 10,
      backgroundColor: c.lessonHeader,
    },
    title: { flex: 1, fontSize: 20, ...fontFaces.heavy, color: c.lessonHeaderText },
    /* White circle on the yellow band; the X takes the band's colour */
    close: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: c.onPrimary },
    scroll: { flexGrow: 0, flexShrink: 1 },
    body: { paddingHorizontal: MODAL_SIDE, paddingTop: 18, gap: 14 },
    bodyWithFooter: { paddingBottom: 16 },
    bodyLast: { paddingBottom: MODAL_SIDE },
    footer: { paddingHorizontal: MODAL_SIDE - 3, paddingBottom: MODAL_SIDE - 3, gap: 4 },
  };
});
