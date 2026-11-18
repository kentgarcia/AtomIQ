import { BandCard, BandCircle, LipCard } from "@/components/community/BandCard";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ElementChip } from "@/components/periodic-table/ElementChip";
import { findElementsForTerms } from "@/services/periodic-table";
import { getEncyclopediaEntryById } from "@/content/explorer";
import type { EncyclopediaEntry } from "@/content/explorer";
import { getEncyclopediaImage } from "@/content/explorer/images";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";
import { openExternalUrl } from "@/services/open-url";
import { impactLight, impactMedium } from "@/services/haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ReadAloudButton } from "@/components/ui/read-aloud-button";
import { readAloud } from "@/services/media";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, ScrollView, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ENTRY_IMAGE_MAX_HEIGHT = 320;

export default function EncyclopediaEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, gutter, contentWidth } = useResponsiveLayout();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ENTRY_IMAGE_MAX_WIDTH = Math.max(0, contentWidth - 16);

  const bgTop = theme.colors.background;
  const styles = makeStyles(theme);

  const [entry, setEntry] = useState<EncyclopediaEntry | null>(null);
  const [entryLoaded, setEntryLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    setEntryLoaded(false);
    setEntry(null);
    if (!id) {
      setEntryLoaded(true);
      return;
    }
    getEncyclopediaEntryById(id).then((found) => {
      if (!alive) return;
      setEntry(found ?? null);
      setEntryLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const entryImageSource = useMemo(() => {
    if (!entry) return undefined;
    return getEncyclopediaImage(entry.id);
  }, [entry]);

  const entryImageSize = useMemo(() => {
    if (!entryImageSource) return { width: ENTRY_IMAGE_MAX_WIDTH, height: 220 };
    const resolvedAsset = Image.resolveAssetSource(entryImageSource);
    const assetWidth = resolvedAsset?.width || ENTRY_IMAGE_MAX_WIDTH;
    const assetHeight = resolvedAsset?.height || 220;
    if (assetWidth <= 0 || assetHeight <= 0) return { width: ENTRY_IMAGE_MAX_WIDTH, height: 220 };
    const aspectRatio = assetWidth / assetHeight;
    let displayWidth = ENTRY_IMAGE_MAX_WIDTH;
    let displayHeight = displayWidth / aspectRatio;
    if (displayHeight > ENTRY_IMAGE_MAX_HEIGHT) {
      displayHeight = ENTRY_IMAGE_MAX_HEIGHT;
      displayWidth = displayHeight * aspectRatio;
    }
    return { width: Math.round(displayWidth), height: Math.round(displayHeight) };
  }, [entryImageSource, ENTRY_IMAGE_MAX_WIDTH]);

  const openSourceLink = useCallback(async (url: string) => {
    impactLight();
    const opened = await openExternalUrl(url);
    if (!opened) Alert.alert("Unable to open link", "Please try again in a moment.");
  }, []);

  // Periodic-table links: cheap first-word lookups on the term and related ids.
  const elementLinks = useMemo(
    () => (entry ? findElementsForTerms([entry.term, ...(entry.relatedTerms ?? [])]) : []),
    [entry],
  );

  const getFullEntrySpeech = useCallback(() => {
    if (!entry) return "";
    let fullText = `${entry.term}. ${entry.definition}`;
    if (entry.quickFacts && entry.quickFacts.length > 0) fullText += ` Quick facts: ${entry.quickFacts.join(". ")}`;
    if (entry.debunkingSnippet) fullText += ` Myth debunking: ${entry.debunkingSnippet}`;
    return fullText;
  }, [entry]);

  if (!entry) {
    return (
      <View style={[styles.notFoundWrap, { backgroundColor: bgTop, paddingTop: insets.top + 24 }]}>
        <BandCard
          title={entryLoaded ? "Entry not found" : "Loading…"}
          right={<BandCircle icon="SearchNormal" />}
          style={styles.notFoundCard}
          bodyStyle={styles.notFoundBody}
        >
          <Text style={styles.notFoundEmoji}>🔍</Text>
          <Button label="Go Back" onPress={() => router.back()} />
        </BandCard>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgTop }]}>
      {/* Header: a band with the back circle, the term and the read-all button */}
      <View
        style={[
          styles.headerWrap,
          {
            paddingTop: insets.top + 12,
            paddingHorizontal: gutter,
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
          },
        ]}
      >
        <BandCard
          title={entry.term}
          left={<BandCircle icon="ArrowLeft2" onPress={() => router.back()} label="Go back" />}
          right={
            <ReadAloudButton
              ownerId={`encyclopedia-entry:${entry.id}:all`}
              subject="entry"
              size={36}
              accent={theme.colors.primaryDark}
              onStart={impactMedium}
              text={getFullEntrySpeech}
            />
          }
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
            paddingHorizontal: gutter,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        {/* Image */}
        {entry.image && entryImageSource && (
          <Animated.View entering={FadeInDown.delay(120).springify()}>
            <LipCard faceStyle={styles.imageFace}>
              <Image source={entryImageSource} style={[styles.entryImage, entryImageSize]} resizeMode="contain" />
            </LipCard>
          </Animated.View>
        )}

        {/* Definition */}
        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <LipCard faceStyle={styles.cardFace}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Definition</Text>
              <ReadAloudButton
                ownerId={`encyclopedia-entry:${entry.id}:definition`}
                subject="definition"
                size={34}
                accent={theme.colors.primaryDark}
                onStart={impactLight}
                text={entry.definition}
              />
            </View>
            <View style={styles.divider} />
            <Text style={styles.definition}>{entry.definition}</Text>
          </LipCard>
        </Animated.View>

        {/* Quick Facts */}
        {entry.quickFacts && entry.quickFacts.length > 0 && (
          <Animated.View entering={FadeInDown.delay(220).springify()}>
            <LipCard faceStyle={styles.cardFace}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Quick Facts</Text>
                <ReadAloudButton
                  ownerId={`encyclopedia-entry:${entry.id}:facts`}
                  subject="quick facts"
                  size={34}
                  accent={theme.colors.primaryDark}
                  onStart={impactLight}
                  text={() => `Quick facts about ${entry.term}: ${entry.quickFacts.join(". ")}`}
                />
              </View>
              {entry.quickFacts.map((fact, index) => (
                <View key={index} style={[styles.factRow, styles.divided]}>
                  <View style={styles.factNum}>
                    <Text style={styles.factNumText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.factText}>{fact}</Text>
                </View>
              ))}
            </LipCard>
          </Animated.View>
        )}

        {/* Myth Busted: a red band and the error surface */}
        {entry.debunkingSnippet && (
          <Animated.View entering={FadeInDown.delay(280).springify()}>
            <BandCard
              tone="danger"
              title="Myth Busted!"
              right={
                <ReadAloudButton
                  ownerId={`encyclopedia-entry:${entry.id}:myth`}
                  subject="myth debunking"
                  size={36}
                  accent={theme.colors.dangerDark}
                  onStart={impactLight}
                  text={() => `Myth busting: ${entry.debunkingSnippet}`}
                />
              }
            >
              <Text style={styles.mythText}>{entry.debunkingSnippet}</Text>
            </BandCard>
          </Animated.View>
        )}

        {/* Periodic table elements mentioned by this entry */}
        {elementLinks.length > 0 && (
          <Animated.View entering={FadeInDown.delay(320).springify()}>
            <LipCard faceStyle={styles.cardFace}>
              <Text style={styles.cardTitle}>In the Periodic Table</Text>
              <View style={styles.divider} />
              <View style={styles.pillsWrap}>
                {elementLinks.map((el) => (
                  <ElementChip key={el.symbol} symbol={el.symbol} />
                ))}
              </View>
            </LipCard>
          </Animated.View>
        )}

        {/* Related Terms */}
        {entry.relatedTerms && entry.relatedTerms.length > 0 && (
          <Animated.View entering={FadeInDown.delay(340).springify()}>
            <LipCard faceStyle={styles.cardFace}>
              <Text style={styles.cardTitle}>Related Terms</Text>
              <View style={styles.divider} />
              <View style={styles.pillsWrap}>
                {entry.relatedTerms.map((term, index) => (
                  <Animated.View key={index} entering={ZoomIn.delay(360 + index * 40)}>
                    <TouchableOpacity
                      style={styles.pill}
                      onPress={() => {
                        readAloud.stop("route-change");
                        router.replace(`/explorer/encyclopedia-entry?id=${term}`);
                      }}
                      activeOpacity={0.88}
                      hitSlop={7}
                      accessibilityRole="link"
                    >
                      <Text style={styles.pillText}>{term.replace(/-/g, " ")}</Text>
                      <Icon name="ArrowRight2" size={12} color={theme.colors.text} variant="Bold" />
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            </LipCard>
          </Animated.View>
        )}

        {/* References */}
        {entry.sources && entry.sources.length > 0 && (
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <LipCard faceStyle={styles.cardFace}>
              <Text style={styles.cardTitle}>References</Text>
              {entry.sources.map((source, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.sourceRow, index > 0 && styles.divided]}
                  activeOpacity={0.8}
                  onPress={() => void openSourceLink(source.url)}
                >
                  <View style={styles.sourceOrg}>
                    <Text style={styles.sourceOrgText}>{source.organization}</Text>
                  </View>
                  <Text style={styles.sourceTitle}>{source.title}</Text>
                  <View style={styles.sourceUrlRow}>
                    <Text style={styles.sourceUrl} numberOfLines={1}>
                      {source.url}
                    </Text>
                    <Icon name="ArrowRight2" size={14} color={theme.colors.text} variant="Bold" />
                  </View>
                </TouchableOpacity>
              ))}
            </LipCard>
          </Animated.View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1 },
    notFoundWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    notFoundCard: { width: "100%", maxWidth: 320 },
    notFoundBody: { alignItems: "stretch", gap: 16, paddingVertical: 20 },
    notFoundEmoji: { fontSize: 48, textAlign: "center" },
    headerWrap: { paddingHorizontal: 16, paddingBottom: 10, zIndex: 10 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24, gap: 12 },
    imageFace: { backgroundColor: c.card, padding: 8, alignItems: "center" },
    entryImage: { borderRadius: 14 },
    cardFace: { backgroundColor: c.card, padding: 16, gap: 10 },
    cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    cardTitle: { fontSize: 20, ...fontFaces.heavy, color: c.text },
    /* Dashed lines, as in the Settings cards */
    divider: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    divided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    definition: { fontSize: 14, ...fontFaces.medium, color: c.text, lineHeight: 22 },
    factRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 10 },
    factNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.primarySurface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.primaryBorder },
    factNumText: { fontSize: 12, ...fontFaces.heavy, color: c.primaryLight },
    factText: { flex: 1, fontSize: 13, ...fontFaces.medium, color: c.text, lineHeight: 19 },
    mythText: { fontSize: 14, ...fontFaces.medium, color: c.text, lineHeight: 21 },
    pillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    pill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surfaceSoft, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    pillText: { fontSize: 12, ...fontFaces.heavy, color: c.textSecondary, textTransform: "capitalize" },
    sourceRow: { gap: 6, paddingVertical: 10 },
    sourceOrg: { alignSelf: "flex-start", backgroundColor: c.primarySurface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: c.primaryBorder },
    sourceOrgText: { fontSize: 11, ...fontFaces.heavy, color: c.primaryLight },
    sourceTitle: { fontSize: 13, ...fontFaces.heavy, color: c.text },
    sourceUrlRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    sourceUrl: { flex: 1, fontSize: 12, ...fontFaces.medium, color: c.link },
  };
});
