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

import React from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GrowCard, GrowModal, type Origin } from "@/components/ui/grow-modal";
import { MODAL_MARGIN, ModalCard, type ModalCardProps } from "@/components/ui/modal-card";
import { useTheme } from "@/theme";

export interface ModalDialogProps extends Omit<ModalCardProps, "onClose" | "style"> {
  visible: boolean;
  onClose: () => void;
  origin?: Origin | null;
  dismissOnScrim?: boolean;
  /** Style for the card itself (e.g. a fixed width). */
  cardStyle?: StyleProp<ViewStyle>;
}

export function ModalDialog({
  visible,
  onClose,
  origin = null,
  dismissOnScrim = false,
  cardStyle,
  maxWidth = 380,
  closeLabel,
  ...card
}: ModalDialogProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <GrowModal visible={visible} origin={origin} onRequestClose={onClose} statusBarTranslucent>
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
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel ?? "Close"} />
        ) : null}
        <KeyboardAvoidingView
          pointerEvents="box-none"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <GrowCard style={[{ width: "100%", maxWidth, flexShrink: 1 }, cardStyle]}>
            <ModalCard {...card} maxWidth={maxWidth} closeLabel={closeLabel} onClose={onClose} />
          </GrowCard>
        </KeyboardAvoidingView>
      </View>
    </GrowModal>
  );
}
