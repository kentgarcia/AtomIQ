/**
 * One Safety Guide card (docs/features/PHONE_SPEC.md §5.9): a one-screen read. A big icon, the title and its one line, then the card's lines (a myth
 * card's lines are labelled "Myth" and "What is true"), a "See in AtomDex" button when the card has an entry, the sources it stands on, and
 * the line every card ends with: this is for learning, not an emergency service.
 */

import { settle } from "@/components/motion/settle";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { SAFETY_FOOT, splitLabel } from "@/components/safety/safety-core";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useSafetyCards } from "@/hooks/use-phone-content";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RoundTile, sectionTone } from "./safety";

export default function SafetyCardScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsiveLayout();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { cards, loaded } = useSafetyCards();
  const card = cards.find((x) => x.id === id);
  const tone = card ? sectionTone(c, card.section) : null;
  const back = () => {
    void playSfx("nav.page-back");
    if (router.canGoBack()) router.back();
    else router.replace("/phone-apps/safety");
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Safety Guide" onBack={back} backLabel="Back to the Safety Guide" scrolled={scrolled} />
      <ScrollView onScroll={onScroll} scrollEventThrottle={scrollEventThrottle} showsVerticalScrollIndicator={false} contentContainerStyle={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 28, gap: 18 }}>
        {card && tone ? (
          <>
            <Animated.View entering={settle(0)} style={styles.head}>
              <View style={styles.tile}>
                <RoundTile icon={card.icon} size={72} lip={4} tone={tone} iconColor={c.onPrimary} />
              </View>
              <Text style={styles.title} accessibilityRole="header">
                {card.title}
              </Text>
              <Text style={styles.summary}>{card.summary}</Text>
            </Animated.View>

            <View style={styles.lines}>
              {card.steps.map((line, i) => {
                const { label, text } = splitLabel(line);
                return (
                  <Animated.View key={i} entering={settle(60 * (i + 1))} style={styles.line}>
                    {label ? (
                      <View style={[styles.tag, { backgroundColor: label === "Myth" ? withAlpha(c.error, 0.14) : withAlpha(c.success, 0.16) }]}>
                        <Text style={[styles.tagText, { color: label === "Myth" ? c.error : c.successDark }]}>{label}</Text>
                      </View>
                    ) : (
                      <View style={[styles.dot, { backgroundColor: tone.face }]} />
                    )}
                    <Text style={styles.lineText}>{text}</Text>
                  </Animated.View>
                );
              })}
            </View>

            {card.entryId ? (
              <Button
                label="See in AtomDex"
                variant="secondary"
                size="compact"
                fullWidth={false}
                onPress={() => router.push(`/explorer/encyclopedia-entry?id=${encodeURIComponent(card.entryId as string)}`)}
                renderIcon={(color) => <Icon name="Book" size={16} color={color} variant="Bold" />}
              />
            ) : null}

            {card.sources.length ? <Text style={styles.sources}>Sources: {card.sources.join("; ")}</Text> : null}
            <Text style={styles.foot}>{SAFETY_FOOT}</Text>
          </>
        ) : loaded ? (
          <Text style={styles.summary}>That card is not in this version of the content.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.mapBackground },
    head: { alignItems: "flex-start", gap: 8 },
    tile: { marginBottom: 4 },
    title: { fontSize: 26, lineHeight: 32, ...fontFaces.black, color: c.text },
    summary: { fontSize: 16, lineHeight: 23, ...fontFaces.semibold, color: c.textSecondary },
    lines: { gap: 14 },
    line: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: 16, backgroundColor: c.field },
    dot: { width: 10, height: 10, borderRadius: 5, marginTop: 7 },
    tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 1 },
    tagText: { fontSize: 12, lineHeight: 16, ...fontFaces.heavy },
    lineText: { flex: 1, fontSize: 16, lineHeight: 23, ...fontFaces.medium, color: c.text },
    sources: { fontSize: 12, lineHeight: 17, ...fontFaces.medium, color: c.textMuted },
    foot: { fontSize: 13, lineHeight: 18, ...fontFaces.semibold, color: c.textMuted },
  };
});
