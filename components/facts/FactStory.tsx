/**
 * FactStory — the full story of a daily fact in a modal card (the "Did you know?" sheet): the mascot,
 * the title, the short version in a soft panel, the full explanation, and a "Got it" button that
 * mentions the XP when today's fact has not been claimed yet. Used by today's card and by the list of
 * facts already read.
 */

import { Image as ExpoImage } from "expo-image";
import React, { useCallback, useMemo, useRef } from "react";
import { View } from "react-native";

import { renderRichText } from "@/components/community/rich-text";
import { ModalButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Text } from "@/components/ui/text";
import type { DailyFact } from "@/services/missions";
import { createStyles, fontFaces, useTheme } from "@/theme";

const MASCOT = require("@/assets/images/mascot/discover.svg");

export function FactStory({
  fact,
  open,
  onClose,
  claimed = true,
  reward = 0,
}: {
  fact: DailyFact | null;
  open: boolean;
  /**
   * The learner is done. When today's XP is still to be claimed, `origin` is the middle of the "Got it" button in
   * window coordinates: the XP coins fly from there (the screen plays them).
   */
  onClose: (origin?: { x: number; y: number }) => void;
  /** Today's fact mission is claimed (or this is an old fact): the button shows no XP. */
  claimed?: boolean;
  reward?: number;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const buttonRef = useRef<React.ComponentRef<typeof View>>(null);
  // Every way out (the button, the X, the scrim, back) says where the button is, so unclaimed XP can fly from it
  const close = useCallback(() => {
    const button = buttonRef.current;
    if (claimed || !button) {
      onClose();
      return;
    }
    button.measureInWindow((x, y, w, h) => onClose(w > 0 && h > 0 ? { x: x + w / 2, y: y + h / 2 } : undefined));
  }, [claimed, onClose]);
  return (
    <ModalDialog
      visible={open}
      onClose={close}
      title="Did you know?"
      closeLabel="Close daily fact"
      maxWidth={440}
      footer={
        <View ref={buttonRef} collapsable={false}>
          <ModalButton label={claimed ? "Got it" : `Got it · +${reward} XP`} onPress={close} />
        </View>
      }
    >
      <View style={styles.sheetHead}>
        <ExpoImage source={MASCOT} style={styles.sheetMascot} contentFit="contain" />
        <Text style={styles.sheetTitle}>{fact?.title}</Text>
      </View>

      {fact ? (
        <>
          <View style={styles.sheetShortBox}>
            <Text style={styles.sheetShort}>{fact.short}</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.sheetBody}>{renderRichText(fact.explanation)}</Text>
        </>
      ) : null}
    </ModalDialog>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    sheetHead: { flexDirection: "row", alignItems: "center", gap: 12 },
    sheetMascot: { width: 52, height: 60 },
    sheetTitle: { flex: 1, fontSize: 20, lineHeight: 26, color: c.text, ...fontFaces.heavy },
    /* The short version, in a soft panel like the rows of the Profile cards */
    sheetShortBox: { padding: 12, borderRadius: 14, backgroundColor: c.surfaceSoft },
    sheetShort: { fontSize: 15, lineHeight: 22, color: c.text, ...fontFaces.bold },
    divider: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    sheetBody: { fontSize: 15, lineHeight: 23, color: c.textSecondary, ...fontFaces.regular },
  };
});
