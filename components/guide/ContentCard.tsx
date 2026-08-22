/**
 * Guide ContentCard — the rich result shown when a user commits to a pill.
 * Cards surface real content (lesson / quiz / encyclopedia / article / game /
 * profile) and a single CTA that routes into the matching feature screen.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import { fontFamilies } from "@/theme";

import type { GuideCard } from "@/services/guide/types";

const CARD_ICON: Record<GuideCard["kind"], string> = {
  lesson: "Book",
  quiz: "Target",
  encyclopedia: "InfoCircle",
  article: "DocumentText",
  game: "Game",
  "profile-summary": "Chart",
};

const CARD_ACCENT: Record<GuideCard["kind"], string> = {
  lesson: "#FF8C00",
  quiz: "#E67E22",
  encyclopedia: "#5E72E4",
  article: "#2ECC71",
  game: "#8B5CF6",
  "profile-summary": "#FF8C00",
};

export interface ContentCardProps {
  card: GuideCard;
  onCta: () => void;
}

export function ContentCard({ card, onCta }: ContentCardProps) {
  const reduce = useReducedMotion();
  const pressed = useSharedValue(0);

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
      case "quiz": return "QUIZ";
      case "encyclopedia": return "ENCYCLOPEDIA";
      case "article": return "ARTICLE";
      case "game": return "GAME";
      case "profile-summary": return "PROFILE";
      default: return "CONTENT";
    }
  })();

  const accent = CARD_ACCENT[card.kind] ?? "#FF8C00";

  // Badge — mirrors profile's countPill / badgeCircle language
  const badgeStyle = (() => {
    if (!card.badge) return null;
    if (isLocked) return { bg: "#F4F5F7", text: "#9CA3AF" };
    if (isCompleted) return { bg: "#22C55E1A", text: "#22C55E" };
    if (isRecommended) return { bg: "#FFF3E0", text: "#E67E22" };
    return { bg: `${accent}1A`, text: accent };
  })();

  const ctaBg = isLocked ? "#E5E7EB" : "#FF8C00";
  const ctaBorder = isLocked ? "#D1D5DB" : "#E67E22";
  const ctaTextColor = isLocked ? "#9CA3AF" : "#FFFFFF";

  return (
    <Animated.View
      style={[
        styles.card,
        { borderColor: isRecommended ? "#FFCA5F" : "#E5E7EB" },
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
            { backgroundColor: isLocked ? "#F4F5F7" : `${accent}14` },
          ]}
        >
          <Icon
            name={isLocked ? "Lock" : CARD_ICON[card.kind]}
            size={20}
            color={isLocked ? "#9CA3AF" : accent}
            variant="Bold"
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>{card.title}</Text>
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
        {!isLocked && <Icon name="ArrowRight2" size={16} color="#FFFFFF" variant="Bold" />}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    marginBottom: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  typeLabel: {
    fontSize: 10,
    fontFamily: fontFamilies.heavy,
    color: "#9CA3AF",
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
    fontFamily: fontFamilies.heavy,
    color: "#333333",
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: fontFamilies.semibold,
    color: "#888888",
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
    fontFamily: fontFamilies.heavy,
  },
  body: {
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: "#666666",
    marginTop: 10,
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
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: fontFamilies.heavy,
  },
});
