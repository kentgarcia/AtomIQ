/**
 * ModalDialog — a centred modal in the house design: the scrim, keyboard avoidance, the
 * open/close animation and a <ModalCard> (see `modal-card.tsx` for the rules it follows).
 *
 *   <ModalDialog visible={open} onClose={close} title="Delete account" footer={…}>…</ModalDialog>
 *
 * Pass `origin` (from `useModalOrigin`) for a card that grows out of the control that opened it;
 * without one it scales up a little from the centre. Reduced motion: a short fade. `dismissOnScrim`
 * lets a tap outside the card close it (off by default, so a form is not lost by accident).
 */

import React, { useCallback, useEffect, useRef } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GrowCard, GrowModal, type Origin } from "@/components/ui/grow-modal";
import { MODAL_MARGIN, ModalCard, type ModalCardProps } from "@/components/ui/modal-card";
import { useTutorialBusy } from "@/hooks/use-tutorial";
import { playSfx } from "@/services/sfx";
import { useTheme } from "@/theme";

export interface ModalDialogProps extends Omit<ModalCardProps, "onClose" | "style"> {
  visible: boolean;
  onClose: () => void;
  origin?: Origin | null;
  dismissOnScrim?: boolean;
  /** Style for the card itself (e.g. a fixed width). */
  cardStyle?: StyleProp<ViewStyle>;
  /** A destructive dialog (delete account, reset): it opens with the warning sound, not the plain one. */
  warning?: boolean;
}

export function ModalDialog({
  visible,
  onClose,
  origin = null,
  dismissOnScrim = false,
  cardStyle,
  warning = false,
  maxWidth = 380,
  closeLabel,
  ...card
}: ModalDialogProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  // Shrodi's tour stays out of the way of any open dialog (a level-up, a badge, a confirmation)
  useTutorialBusy(visible, `dialog: ${typeof card.title === "string" ? card.title : "untitled"}`);

  // Sound (docs/features/SFX_SPEC.md §6.1): opening, the X, and every other way out. `soundedClose` keeps a
  // close that already played its own sound (the X) from playing a second one when `visible` flips.
  const wasVisible = useRef(visible);
  const soundedClose = useRef(false);
  useEffect(() => {
    if (visible === wasVisible.current) return;
    wasVisible.current = visible;
    if (visible) {
      soundedClose.current = false;
      void playSfx(warning ? "ui.warning" : "ui.modal-open");
    } else if (!soundedClose.current) {
      void playSfx("ui.modal-close");
    }
  }, [visible, warning]);
  // A dialog that is mounted already open sounds on mount.
  useEffect(() => {
    if (visible) void playSfx(warning ? "ui.warning" : "ui.modal-open");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const closeWithX = useCallback(() => {
    soundedClose.current = true;
    void playSfx("ui.cancel");
    onClose();
  }, [onClose]);
  const closeQuietly = useCallback(() => {
    soundedClose.current = true;
    void playSfx("ui.modal-close");
    onClose();
  }, [onClose]);

  return (
    <GrowModal visible={visible} origin={origin} onRequestClose={closeQuietly} statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.overlay,
          paddingTop: insets.top + MODAL_MARGIN,
          paddingBottom: insets.bottom + MODAL_MARGIN,
          paddingHorizontal: MODAL_MARGIN,
        }}
      >
        {dismissOnScrim ? (
          <Pressable style={StyleSheet.absoluteFill} onPress={closeQuietly} accessibilityRole="button" accessibilityLabel={closeLabel ?? "Close"} />
        ) : null}
        <KeyboardAvoidingView
          pointerEvents="box-none"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <GrowCard style={[{ width: "100%", maxWidth, flexShrink: 1 }, cardStyle]}>
            <ModalCard {...card} maxWidth={maxWidth} closeLabel={closeLabel} onClose={closeWithX} />
          </GrowCard>
        </KeyboardAvoidingView>
      </View>
    </GrowModal>
  );
}
