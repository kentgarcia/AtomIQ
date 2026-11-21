/**
 * HeaderStat — a stat in a header (lessons, XP, diamonds) that opens a small card under itself when
 * pressed: its name, the number, and a line or two about it (XP also shows the bar to the next level).
 * Tap anywhere else, or Android back, to close it. The card pops up out of its pointer (fade and a
 * short rise, ease-out; reduced motion: just there). Placement and wording are in `header-stat-core.ts`.
 *
 * The children are the stat itself (icon and number); `anchorRef` lets a caller (the Quests header's
 * coin landing targets) keep measuring the pieces inside.
 */

import React, { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { Modal, Pressable, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme } from "@/theme";
import { DURATION } from "@/theme/motion";

import { POPOVER, placePopover, statInfo, type HeaderStatKind, type PopoverPlacement } from "./header-stat-core";

export interface HeaderStatProps {
  kind: HeaderStatKind;
  /** The number the card reports (lessons completed, total XP, diamonds). */
  amount: number;
  /** Spoken label of the pressable stat. */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function HeaderStat({ kind, amount, accessibilityLabel, style, children }: HeaderStatProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();
  const { width: screenWidth } = useWindowDimensions();
  const anchorRef = useRef<React.ComponentRef<typeof Pressable>>(null);
  const [placement, setPlacement] = useState<PopoverPlacement | null>(null);

  const open = useCallback(() => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setPlacement(placePopover({ x, y, width, height }, screenWidth));
    });
  }, [screenWidth]);
  const close = useCallback(() => setPlacement(null), []);

  const info = statInfo(kind, amount);
  const entering = reducedMotion ? undefined : FadeIn.duration(DURATION.small);
  const exiting = reducedMotion ? undefined : FadeOut.duration(120);

  return (
    <>
      <Pressable
        ref={anchorRef}
        collapsable={false}
        onPress={open}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Shows details"
        style={style}
      >
        {children}
      </Pressable>
      <Modal visible={placement !== null} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
        <Pressable style={styles.scrim} onPress={close} accessibilityLabel="Close details" accessibilityRole="button">
          {placement ? (
            <Animated.View
              entering={entering}
              exiting={exiting}
              style={[styles.wrap, { left: placement.left, top: placement.top, width: placement.width }]}
            >
              <View style={[styles.arrow, { left: placement.arrowLeft - POPOVER.arrow }]} />
              {/* The card swallows taps so only the scrim closes it */}
              <Pressable style={styles.card} onPress={close} accessibilityLabel={`${info.title}. ${info.value}. ${info.lines.join(". ")}`}>
                <Text style={styles.title}>{info.title}</Text>
                <Text style={styles.value}>{info.value}</Text>
                {info.progress !== null ? (
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${Math.round(info.progress * 100)}%` }]} />
                  </View>
                ) : null}
                {info.lines.map((line) => (
                  <Text key={line} style={styles.line}>
                    {line}
                  </Text>
                ))}
              </Pressable>
            </Animated.View>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  const ARROW = POPOVER.arrow * 2;
  return {
    scrim: { flex: 1 },
    wrap: { position: "absolute" },
    /* A rotated square tucked under the card's top edge; its top and left borders make the tip */
    arrow: {
      position: "absolute",
      top: -ARROW / 2 + 1,
      width: ARROW,
      height: ARROW,
      backgroundColor: c.surface,
      borderTopWidth: 2,
      borderLeftWidth: 2,
      borderColor: c.border,
      transform: [{ rotate: "45deg" }],
      zIndex: 1,
    },
    card: {
      backgroundColor: c.surface,
      borderWidth: 2,
      borderColor: c.border,
      borderBottomWidth: 4,
      borderBottomColor: c.borderStrong,
      borderRadius: 16,
      padding: 14,
      gap: 6,
    },
    title: { fontSize: 13, ...fontFaces.bold, color: c.textMuted },
    value: { fontSize: 26, lineHeight: 32, ...fontFaces.black, color: c.text },
    line: { fontSize: 14, lineHeight: 20, ...fontFaces.semibold, color: c.text },
    track: { height: 10, borderRadius: 5, overflow: "hidden", backgroundColor: c.surfaceSoft },
    fill: { height: "100%", borderRadius: 5, backgroundColor: c.primary },
  };
});
