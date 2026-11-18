/**
 * GuideLandingCards — the Guide tab's landing, in the same frame as Quests and the Feed: a bordered
 * info card on top, then flat sections on the page (no cards), each a heading over rows split
 * by dashed lines.
 *
 *   Info card     the standard Card (gray border and lip) with a blue (`guide`) header band; the body
 *                 has Shrodi, what the Guide does and the blue standard-design "Talk to Guide" button
 *   Focus areas   (only with weak spots) each topic with a Fix button; "Review all" opens a review
 *   Quick starts  one row per intent (Learn, Explore, Practice)
 *   Teachers      the cast, one row each; a row opens the teacher's Meet sheet (`GuideTeachers`)
 *
 * The screen (`app/(tabs)/chat.tsx`) owns the scroll view and the tab-bar clearance; this only lays
 * out the page's content. Every button opens the chat with the same intent as before.
 */

import React, { useMemo } from "react";
import { Image, Pressable, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";

import { GuideTeachers } from "@/components/guide/GuideTeachers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { getGuideContext } from "@/services/guide/context";
import type { LoadedContent } from "@/services/guide/topics";
import type { GuideIntent } from "@/services/guide/types";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";

const SHRODI = require("@/assets/images/mascot/happy.png");

const MASCOT_SIZE = 88;

type TileColor = "primary" | "sky" | "success";

const QUICK_TILES: { intent: GuideIntent; icon: string; tone: TileColor; title: string; desc: string }[] = [
  { intent: "learn", icon: "Book", tone: "primary", title: "Learn", desc: "Build your understanding through lessons." },
  { intent: "explore", icon: "SearchNormal", tone: "sky", title: "Explore", desc: "Dive into a topic." },
  { intent: "practice", icon: "Game", tone: "success", title: "Practice", desc: "Test knowledge through quizzes and games." },
];

/** Fades a section in, a little after the one above it (ease-out, under 300 ms). */
function useEnter(delay: number) {
  const reducedMotion = useReducedMotion();
  return reducedMotion ? FadeIn.duration(120) : FadeInDown.duration(220).delay(delay);
}

export function GuideLandingCards({
  ctx,
  content,
  onEnterChat,
}: {
  ctx: Awaited<ReturnType<typeof getGuideContext>>;
  content: LoadedContent;
  onEnterChat: (intent?: GuideIntent) => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const c = theme.colors;
  const weakChips = useMemo(
    () => ctx.weakQuizIds.slice(0, 3).map((id) => content.quizzes.find((q) => q.id === id)).filter(Boolean) as { id: string; title: string }[],
    [ctx.weakQuizIds, content.quizzes],
  );
  const hasWeak = weakChips.length > 0;

  const toneColor: Record<TileColor, string> = { primary: c.primary, sky: c.sky, success: c.success };

  const heroEnter = useEnter(0);
  const focusEnter = useEnter(80);
  const quickEnter = useEnter(hasWeak ? 160 : 80);
  const teachersEnter = useEnter(hasWeak ? 240 : 160);

  const hint = hasWeak
    ? `${weakChips.length} ${weakChips.length === 1 ? "topic needs" : "topics need"} a review`
    : "Tap a sentence and fill the blank. No typing needed.";

  return (
    <View style={styles.stack}>
      {/* Info card: the standard card (border and lip), the blue only on its header band */}
      <Animated.View entering={heroEnter}>
        <Card padding={0} faceStyle={styles.cardFace}>
          <View style={styles.band}>
            <Text style={styles.headline} accessibilityRole="header">
              Hi, I’m Shrodi
            </Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.intro}>
              <Image source={SHRODI} style={styles.mascot} resizeMode="contain" accessibilityIgnoresInvertColors accessible={false} />
              <Text style={styles.hint}>{hint}</Text>
            </View>
            <Button
              label="Talk to Guide"
              variant="guide"
              design="standard"
              onPress={() => onEnterChat()}
              renderIcon={(color) => <Icon name="Message" size={20} color={color} variant="Bold" />}
            />
          </View>
        </Card>
      </Animated.View>

      {/* Weak spots: only if you have them */}
      {hasWeak && (
        <Animated.View entering={focusEnter} style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              Focus areas
            </Text>
            <Pressable
              onPress={() => onEnterChat("review")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Review all focus areas"
              style={({ pressed }) => [styles.sectionLink, pressed && styles.pressed]}
            >
              <Text style={styles.sectionLinkText}>Review all</Text>
              <Icon name="ArrowRight2" size={14} color={c.primaryDark} variant="Bold" />
            </Pressable>
          </View>
          <View style={styles.list}>
            {weakChips.map((q, i) => (
              <View key={q.id} style={[styles.row, i > 0 && styles.divided]}>
                <View style={[styles.rowIcon, { backgroundColor: withAlpha(c.primary, 0.14) }]}>
                  <Icon name="Refresh" size={18} color={c.primaryDark} variant="Bold" />
                </View>
                <Text style={styles.rowTitleFlex} numberOfLines={2}>
                  {q.title}
                </Text>
                <Button
                  label="Fix"
                  size="compact"
                  variant="secondary"
                  fullWidth={false}
                  onPress={() => onEnterChat("review")}
                  accessibilityLabel={`Fix ${q.title}`}
                />
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {hasWeak && <View style={styles.divider} />}

      {/* Quick starts: one row per intent */}
      <Animated.View entering={quickEnter} style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Quick starts
        </Text>
        <View style={styles.list}>
          {QUICK_TILES.map((t, i) => {
            const color = toneColor[t.tone];
            return (
              <Pressable
                key={t.intent}
                onPress={() => onEnterChat(t.intent)}
                accessibilityRole="button"
                accessibilityLabel={`${t.title}. ${t.desc}`}
                style={({ pressed }) => [styles.row, i > 0 && styles.divided, pressed && styles.pressed]}
              >
                <View style={[styles.rowIcon, { backgroundColor: withAlpha(color, 0.14) }]}>
                  <Icon name={t.icon} size={20} color={color} variant="Bold" />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{t.title}</Text>
                  <Text style={styles.rowDesc}>{t.desc}</Text>
                </View>
                <View style={styles.arrow}>
                  <Icon name="ArrowRight2" size={16} color={c.onPrimary} variant="Bold" />
                </View>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      <View style={styles.divider} />

      {/* Teachers: who teaches each unit and what they teach */}
      <Animated.View entering={teachersEnter}>
        <GuideTeachers />
      </Animated.View>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    stack: { gap: 18 },

    /* Info card: the face clips the blue band to the card's rounded corners */
    cardFace: { overflow: "hidden" },
    band: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.guide },
    headline: { fontSize: 20, lineHeight: 26, ...fontFaces.heavy, color: c.onPrimary },
    cardBody: { padding: 16, gap: 16 },
    intro: { flexDirection: "row", alignItems: "center", gap: 12 },
    mascot: { width: MASCOT_SIZE, height: MASCOT_SIZE },
    hint: { flex: 1, fontSize: 15, lineHeight: 21, ...fontFaces.medium, color: c.textSecondary },

    /* Inset like the info card's inner padding, so headings and rows line up with the card's content */
    section: { gap: 12, paddingHorizontal: 16 },
    sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    sectionTitle: { fontSize: 20, ...fontFaces.heavy, color: c.text },
    sectionLink: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 32 },
    sectionLinkText: { fontSize: 14, ...fontFaces.heavy, color: c.primaryDark },
    /* Between the sections: the same thin dashed line as between settings rows */
    divider: { marginHorizontal: 16, borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },

    list: { gap: 0 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 },
    divided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border, paddingTop: 12, marginTop: 12 },
    pressed: { opacity: 0.6 },
    rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { fontSize: 16, ...fontFaces.heavy, color: c.text },
    rowTitleFlex: { flex: 1, fontSize: 15, ...fontFaces.heavy, color: c.text },
    // textSecondary keeps the description readable (textMuted was too faint at this size)
    rowDesc: { fontSize: 13, lineHeight: 18, ...fontFaces.regular, color: c.textSecondary },
    arrow: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: c.primary },
  };
});
