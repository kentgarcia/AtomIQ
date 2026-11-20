/**
 * Safety Guide (docs/features/PHONE_SPEC.md §5.9): calm, sourced reference cards on radiation and nuclear safety, under the app's usual header. The
 * list opens with what this is and is not (an educational reference, not an emergency service), then three sections (Radiation basics, If
 * something happens, Myths that cost people), each card a filled row that opens a one-screen read (`safety-card.tsx`). Cards are content
 * (`safety_cards`), worded from their cited official pages and checked by a person before publishing.
 */

import { settle } from "@/components/motion/settle";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { cardCountText, groupCards, SAFETY_DISCLAIMER, type SafetySection } from "@/components/safety/safety-core";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useSafetyCards } from "@/hooks/use-phone-content";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";
import { useRouter } from "expo-router";
import { playSfx } from "@/services/sfx";
import React, { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** The colour of a section's cards, from the theme: blue for the basics, red for what to do, yellow for myths. */
export function sectionTone(c: ReturnType<typeof useTheme>["theme"]["colors"], section: SafetySection): { face: string; lip: string } {
  if (section === "happens") return { face: c.error, lip: c.dangerDark };
  if (section === "myths") return { face: c.warning, lip: c.warningDark ?? c.warning };
  return { face: c.guide, lip: c.guideLip };
}

/** A round icon on a lip: the face sits over a second circle one step lower, so the shadow follows the curve (a border-bottom on a circle goes flat). */
export function RoundTile({ icon, size, lip, tone, iconColor }: { icon: string; size: number; lip: number; tone: { face: string; lip: string }; iconColor: string }) {
  return (
    <View style={{ width: size, height: size + lip }}>
      <View style={{ position: "absolute", left: 0, top: lip, width: size, height: size, borderRadius: size / 2, backgroundColor: tone.lip }} />
      <View style={{ position: "absolute", left: 0, top: 0, width: size, height: size, borderRadius: size / 2, backgroundColor: tone.face, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={Math.round(size * 0.5)} color={iconColor} variant="Bold" />
      </View>
    </View>
  );
}

export default function SafetyScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsiveLayout();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const { cards, loaded } = useSafetyCards();
  const groups = useMemo(() => groupCards(cards), [cards]);
  let delay = 0;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Safety Guide" subtitle={cardCountText(cards.length)} onBack={() => { void playSfx("phone.app-close"); if (router.canGoBack()) router.back(); else router.replace("/(tabs)/phone"); }} backLabel="Back to the phone" scrolled={scrolled} />
      <ScrollView onScroll={onScroll} scrollEventThrottle={scrollEventThrottle} showsVerticalScrollIndicator={false} contentContainerStyle={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 24, gap: 12 }}>
        <Animated.View entering={settle(0)} style={styles.notice} accessible accessibilityLabel={SAFETY_DISCLAIMER}>
          <Icon name="InfoCircle" size={22} color={c.guideLip} variant="Bold" />
          <Text style={styles.noticeText}>{SAFETY_DISCLAIMER}</Text>
        </Animated.View>

        {groups.map((g) => {
          const tone = sectionTone(c, g.section);
          return (
            <View key={g.section} style={styles.group}>
              <Text style={styles.section} accessibilityRole="header">
                {g.title}
              </Text>
              {g.cards.map((card) => {
                delay += 40;
                return (
                  <Animated.View key={card.id} entering={settle(Math.min(delay, 400))}>
                    <Pressable
                      onPress={() => {
                        void playSfx("library.book");
                        router.push(`/phone-apps/safety-card?id=${encodeURIComponent(card.id)}`);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${card.title}. ${card.summary} Opens the card.`}
                      style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
                    >
                      <RoundTile icon={card.icon} size={48} lip={3} tone={tone} iconColor={c.onPrimary} />
                      <View style={styles.text}>
                        <Text style={styles.title} numberOfLines={2}>
                          {card.title}
                        </Text>
                        <Text style={styles.summary} numberOfLines={2}>
                          {card.summary}
                        </Text>
                      </View>
                      <Icon name="ArrowRight2" size={18} color={c.textMuted} variant="Bold" />
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          );
        })}

        {loaded && groups.length === 0 ? <Text style={styles.empty}>No safety cards in this version of the content yet.</Text> : null}
      </ScrollView>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.mapBackground },
    notice: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: 16, backgroundColor: withAlpha(c.guide, 0.12) },
    noticeText: { flex: 1, fontSize: 14, lineHeight: 20, ...fontFaces.semibold, color: c.text },
    group: { gap: 10, marginTop: 6 },
    section: { fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", ...fontFaces.heavy, color: c.textMuted },
    row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 16, backgroundColor: c.field },
    text: { flex: 1, gap: 2 },
    title: { fontSize: 16, lineHeight: 21, ...fontFaces.heavy, color: c.text },
    summary: { fontSize: 13, lineHeight: 18, ...fontFaces.medium, color: c.textMuted },
    empty: { marginTop: 16, fontSize: 14, lineHeight: 20, ...fontFaces.medium, color: c.textMuted },
  };
});
