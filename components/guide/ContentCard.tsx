/**
 * Guide ContentCard — the rich result shown when a user commits to a pill.
 * Cards surface real content (lesson / quiz / encyclopedia / game /
 * profile) and a single CTA that routes into the matching feature screen.
 */

import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";

import type { GuideCard } from "@/services/guide/types";

const CARD_ICON: Record<GuideCard["kind"], string> = {
  lesson: "Book",
  quiz: "Target",
  encyclopedia: "InfoCircle",
  game: "Game",
  "profile-summary": "Chart",
};

const CARD_ACCENT: Record<GuideCard["kind"], string> = {
  lesson: "#EA580C",
  quiz: "#C2410C",
  encyclopedia: "#1CB0F6",
  game: "#8B5CF6",
  "profile-summary": "#EA580C",
};

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    card: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 16,
      borderWidth: 2,
      borderBottomWidth: 4,
      marginBottom: 10,
      /* Fill the wrap so every card matches the tallest sibling */
      flexGrow: 1,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 5,
    },
    typeLabel: {
      fontSize: 10,
      ...fontFaces.heavy,
      color: c.textFaint,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 10,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      ...fontFaces.heavy,
      color: c.text,
      lineHeight: 20,
    },
    subtitle: {
      fontSize: 12,
      ...fontFaces.semibold,
      color: c.textMuted,
      marginTop: 2,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    badgeText: {
      fontSize: 11,
      ...fontFaces.heavy,
    },
    body: {
      fontSize: 13,
      ...fontFaces.regular,
      color: c.textSecondary,
      marginTop: 10,
      marginBottom: 16,
      lineHeight: 18,
    },
    cta: {
      marginTop: "auto",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderBottomWidth: 4,
      minHeight: 48,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    ctaText: {
      fontSize: 14,
      ...fontFaces.heavy,
    },
  };
});

export interface ContentCardProps {
  card: GuideCard;
  onCta: () => void;
}

export function ContentCard({ card, onCta }: ContentCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reduce = useReducedMotion();
  const pressed = useSharedValue(0);

  const c = theme.colors;

  const animated = useAnimatedStyle(() => {
    if (reduce) return { transform: [{ scale: 1 }] };
    return {
      transform: [
        { scale: withSpring(1 - pressed.value * 0.02, { damping: 20, stiffness: 220 }) },
      ],
    };
  });

  const isLocked = card.status === "locked";
  const isCompleted = card.status === "completed";
  const isRecommended = card.status === "recommended";

  const typeLabel = (() => {
    switch (card.kind) {
      case "lesson": return "LESSON";
      case "quiz": return "PRACTICE";
      case "encyclopedia": return "ATOMDEX";
      case "game": return "GAME";
      case "profile-summary": return "PROFILE";
      default: return "CONTENT";
    }
  })();

  const accent = CARD_ACCENT[card.kind] ?? "#EA580C";

  // Badge — mirrors profile's countPill / badgeCircle language
  const badgeStyle = (() => {
    if (!card.badge) return null;
    if (isLocked) return { bg: c.surfaceSoft, text: c.textFaint };
    if (isCompleted) return { bg: withAlpha(c.success, 0.1), text: c.success };
    if (isRecommended) return { bg: c.surfaceSoft, text: c.primaryLight };
    return { bg: withAlpha(accent, 0.1), text: accent };
  })();

  const ctaBg = isLocked ? c.border : "#EA580C";
  const ctaBorder = isLocked ? c.textFaint : "#C2410C";
  const ctaTextColor = isLocked ? c.textFaint : c.onPrimary;

  return (
    <Animated.View
      style={[
        styles.card,
        { borderColor: isRecommended ? c.border : c.border },
        animated,
      ]}
      accessibilityLabel={`${typeLabel}: ${card.title}`}
    >
      {/* Content type — profile's titleProgressLabel style */}
      <Text style={styles.typeLabel}>{typeLabel}</Text>

      <View style={styles.header}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: isLocked ? c.surfaceSoft : withAlpha(accent, 0.08) },
          ]}
        >
          <Icon
            name={isLocked ? "Lock" : CARD_ICON[card.kind]}
            size={20}
            color={isLocked ? c.textFaint : accent}
            variant="Bold"
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{card.title}</Text>
          {card.subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>{card.subtitle}</Text>
          ) : null}
        </View>
        {card.badge && badgeStyle ? (
          <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[styles.badgeText, { color: badgeStyle.text }]}>{card.badge}</Text>
          </View>
        ) : null}
      </View>

      {card.body ? (
        <Text style={styles.body} numberOfLines={3}>{card.body}</Text>
      ) : null}

      <Pressable
        onPressIn={() => { if (!isLocked) pressed.value = 1; }}
        onPressOut={() => { pressed.value = 0; }}
        onPress={onCta}
        disabled={isLocked}
        accessibilityLabel={card.ctaLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: isLocked }}
        style={({ pressed: isPressed }) => [
          styles.cta,
          {
            backgroundColor: ctaBg,
            borderColor: ctaBorder,
            opacity: isPressed && !isLocked ? 0.96 : 1,
            transform: [{ scale: isPressed && !isLocked ? 0.98 : 1 }],
          },
        ]}
      >
        <Text style={[styles.ctaText, { color: ctaTextColor }]}>{card.ctaLabel}</Text>
        {!isLocked && <Icon name="ArrowRight2" size={16} color={c.onPrimary} variant="Bold" />}
      </Pressable>
    </Animated.View>
  );
}
