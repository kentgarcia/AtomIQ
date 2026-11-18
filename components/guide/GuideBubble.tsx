/**
 * GuideBubble — renders one turn of the Guide conversation.
 *
 *  - guide turns: bot avatar + prompt, optionally followed by an interactive
 *    pill row (when `active`) and/or rich content cards (history preserved).
 *  - user turns: an echo chip of the chosen pill, with a "Change" affordance
 *    when it is not the latest turn (lets the learner rewind a branch).
 */

import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";

import { ContentCard } from "@/components/guide/ContentCard";
import { Pill } from "@/components/guide/Pill";
import { Icon } from "@/components/ui/icon";
import { createStyles, fontFaces, useTheme } from "@/theme";

import type { GuideCard, GuidePill, GuideTurn } from "@/services/guide/types";

export interface GuideBubbleProps {
  turn: GuideTurn;
  /** Only the latest unanswered guide turn renders interactive pills. */
  active: boolean;
  onSelectPill: (pill: GuidePill) => void;
  onCardCta: (card: GuideCard) => void;
  onRevert?: () => void;
  onStartOver: () => void;
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    guideRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 16,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      borderWidth: 2,
      borderColor: c.border,
      borderBottomWidth: 4,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    guideCol: {
      flex: 1,
      gap: 0,
    },
    bubble: {
      backgroundColor: c.card,
      borderRadius: 20,
      borderTopLeftRadius: 6,
      borderWidth: 2,
      borderColor: c.border,
      borderBottomWidth: 4,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignSelf: "flex-start",
      maxWidth: "100%",
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    bubbleText: {
      fontSize: 14,
      lineHeight: 20,
      ...fontFaces.semibold,
      color: c.text,
    },
    cards: {
      marginTop: 12,
      gap: 10,
    },
    pillRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 14,
    },
    utilRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12,
    },
    userRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: 16,
    },
    userChipWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      maxWidth: "85%",
    },
    userChip: {
      backgroundColor: c.link,
      borderWidth: 1,
      borderColor: c.link,
      borderBottomWidth: 4,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 16,
      borderTopRightRadius: 6,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    userChipText: {
      fontSize: 14,
      ...fontFaces.heavy,
      color: c.onPrimary,
    },
    change: {
      fontSize: 13,
      ...fontFaces.heavy,
      color: c.link,
      textDecorationLine: "underline",
    },
  };
});

export function GuideBubble({
  turn,
  active,
  onSelectPill,
  onCardCta,
  onRevert,
  onStartOver,
}: GuideBubbleProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (turn.role === "user") {
    return (
      <View style={styles.userRow}>
        <View style={styles.userChipWrap}>
          <View style={styles.userChip}>
            <Text style={styles.userChipText}>{turn.text}</Text>
          </View>
          {!active && onRevert ? (
            <Pressable onPress={onRevert} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Text style={styles.change}>Change</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.guideRow}>
      <View style={styles.avatar}>
        <Icon name="Atom" size={20} color={theme.colors.link} variant="Bold" />
      </View>
      <View style={styles.guideCol}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{turn.text}</Text>
        </View>

        {turn.cards && turn.cards.length > 0 ? (
          <View style={styles.cards}>
            {turn.cards.map((card) => (
              <ContentCard
                key={`${turn.id}-${card.title}`}
                card={card}
                onCta={() => onCardCta(card)}
              />
            ))}
          </View>
        ) : null}

        {active && turn.pills && turn.pills.length > 0 ? (
          <View style={styles.pillRow}>
            {turn.pills.map((pill) => (
              <Pill
                key={pill.id}
                label={pill.label}
                icon={pill.icon}
                onPress={() => onSelectPill(pill)}
              />
            ))}
          </View>
        ) : null}

        {active && turn.utilities && turn.utilities.length > 0 ? (
          <View style={styles.utilRow}>
            {turn.utilities.map((pill) =>
              pill.payload.type === "utility" &&
              pill.payload.utility === "start-over" ? (
                <Pill
                  key={pill.id}
                  label={pill.label}
                  icon={pill.icon}
                  variant="utility"
                  onPress={onStartOver}
                />
              ) : null,
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}
