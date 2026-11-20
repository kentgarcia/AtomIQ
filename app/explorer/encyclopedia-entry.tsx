import { settle } from "@/components/motion/settle";
import { getVaultCat } from "@/components/encyclopedia/categories";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ElementChip } from "@/components/periodic-table/ElementChip";
import { findElementsForTerms } from "@/services/periodic-table";
import { getEncyclopediaEntryById } from "@/content/explorer";
import type { EncyclopediaEntry } from "@/content/explorer";
import { getEncyclopediaImage } from "@/content/explorer/images";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";
import { openExternalUrl } from "@/services/open-url";
import { impactLight, impactMedium } from "@/services/haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AddToNotesButton } from "@/components/phone/AddToNotesButton";
import { ReadAloudButton } from "@/components/ui/read-aloud-button";
import { clipSnippet } from "@/services/field-notes";
import { readAloud } from "@/services/media";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ENTRY_IMAGE_MAX_HEIGHT = 320;

/** A section's title: a round tinted icon, the title and an optional control on the right (like a Settings row). */
function SectionTitle({ icon, color, title, right }: { icon: string; color: string; title: string; right?: React.ReactNode }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionIcon, { backgroundColor: withAlpha(color, 0.14) }]}>
        <Icon name={icon} size={20} color={color} variant="Bold" />
      </View>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}

export default function EncyclopediaEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, gutter, contentWidth } = useResponsiveLayout();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ENTRY_IMAGE_MAX_WIDTH = Math.max(0, contentWidth - 16);

  const bgTop = theme.colors.background;
  const styles = makeStyles(theme);
  const { scrolled, onScroll } = useHeaderBorder();

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
      <View style={[styles.container, { backgroundColor: bgTop }]}>
        <ScreenHeader title="AtomDex" onBack={() => router.back()} />
        <View style={styles.notFoundWrap}>
          <Text style={styles.notFoundTitle}>{entryLoaded ? "Entry not found" : "Loading…"}</Text>
          {entryLoaded ? (
            <>
              <Text style={styles.notFoundSub}>This term is not in the AtomDex.</Text>
              <Button label="Go Back" onPress={() => router.back()} />
            </>
          ) : null}
        </View>
      </View>
    );
  }

  const cat = getVaultCat(entry.category);

  return (
    <View style={[styles.container, { backgroundColor: bgTop }]}>
      <ScreenHeader
        title={entry.term}
        onBack={() => router.back()}
        right={
          <ReadAloudButton
            ownerId={`encyclopedia-entry:${entry.id}:all`}
            subject="entry"
            appearance="flat"
            size={36}
            accent={theme.colors.link}
            onStart={impactMedium}
            text={getFullEntrySpeech}
          />
        }
        scrolled={scrolled}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={onScroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
            paddingHorizontal: gutter + 4,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        {/* Image */}
        {entry.image && entryImageSource && (
          <Animated.View entering={settle(60)} style={styles.imageWrap}>
            <Image source={entryImageSource} style={[styles.entryImage, entryImageSize]} resizeMode="contain" />
          </Animated.View>
        )}

        {/* Definition */}
        <Animated.View entering={settle(120)} style={styles.section}>
          <SectionTitle
            icon="Book"
            color="#3B82F6"
            title="Definition"
            right={
              <ReadAloudButton
                ownerId={`encyclopedia-entry:${entry.id}:definition`}
                subject="definition"
                appearance="flat"
                size={34}
                accent="#3B82F6"
                onStart={impactLight}
                text={entry.definition}
              />
            }
          />
          <Text style={styles.definition}>{entry.definition}</Text>
          <AddToNotesButton type="atomdex" sourceId={entry.id} title={entry.term} snippet={clipSnippet(entry.definition)} style={{ alignSelf: "flex-start", marginTop: 4 }} />
        </Animated.View>

        {/* Quick Facts */}
        {entry.quickFacts && entry.quickFacts.length > 0 && (
          <Animated.View entering={settle(180)} style={styles.section}>
            <SectionTitle
              icon="Flash"
              color="#F59E0B"
              title="Quick Facts"
              right={
                <ReadAloudButton
                  ownerId={`encyclopedia-entry:${entry.id}:facts`}
                  subject="quick facts"
                  appearance="flat"
                  size={34}
                  accent="#F59E0B"
                  onStart={impactLight}
                  text={() => `Quick facts about ${entry.term}: ${entry.quickFacts.join(". ")}`}
                />
              }
            />
            {entry.quickFacts.map((fact, index) => (
              <View key={index} style={[styles.factRow, index > 0 && styles.divided]}>
                <View style={styles.factNum}>
                  <Text style={styles.factNumText}>{index + 1}</Text>
                </View>
                <Text style={styles.factText}>{fact}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Myth Busted: a flat red tint, not a card */}
        {entry.debunkingSnippet && (
          <Animated.View entering={settle(240)} style={styles.mythBlock}>
            <SectionTitle
              icon="Danger"
              color={theme.colors.error}
              title="Myth Busted!"
              right={
                <ReadAloudButton
                  ownerId={`encyclopedia-entry:${entry.id}:myth`}
                  subject="myth debunking"
                  appearance="flat"
                  size={34}
                  accent={theme.colors.error}
                  onStart={impactLight}
                  text={() => `Myth busting: ${entry.debunkingSnippet}`}
                />
              }
            />
            <Text style={styles.definition}>{entry.debunkingSnippet}</Text>
          </Animated.View>
        )}

        {/* Periodic table elements mentioned by this entry */}
        {elementLinks.length > 0 && (
          <Animated.View entering={settle(300)} style={styles.section}>
            <SectionTitle icon="Element4" color="#8B5CF6" title="In the Periodic Table" />
            <View style={styles.pillsWrap}>
              {elementLinks.map((el) => (
                <ElementChip key={el.symbol} symbol={el.symbol} />
              ))}
            </View>
          </Animated.View>
        )}

        {/* Related Terms, led by the entry's archive */}
        <Animated.View entering={settle(340)} style={styles.section}>
          <SectionTitle icon="Link" color="#14B8A6" title={entry.relatedTerms?.length ? "Related Terms" : "Category"} />
          <View style={styles.pillsWrap}>
            <View style={[styles.catChip, { backgroundColor: withAlpha(cat.color, 0.14) }]}>
              <Icon name={cat.icon} size={16} color={cat.color} variant="Bold" />
              <Text style={[styles.catChipText, { color: cat.color }]}>{cat.label}</Text>
            </View>
            {(entry.relatedTerms ?? []).map((term, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
                onPress={() => {
                  readAloud.stop("route-change");
                  router.replace(`/explorer/encyclopedia-entry?id=${term}`);
                }}
                accessibilityRole="link"
              >
                <Text style={styles.pillText}>{term.replace(/-/g, " ")}</Text>
                <Icon name="ArrowRight2" size={12} color={theme.colors.textMuted} variant="Bold" />
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* References */}
        {entry.sources && entry.sources.length > 0 && (
          <Animated.View entering={settle(400)} style={styles.section}>
            <SectionTitle icon="DocumentText" color="#EC4899" title="References" />
            {entry.sources.map((source, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.sourceRow, index > 0 && styles.divided]}
                activeOpacity={0.6}
                onPress={() => void openSourceLink(source.url)}
                accessibilityRole="link"
                accessibilityLabel={`${source.organization}: ${source.title}`}
              >
                <View style={styles.sourceCopy}>
                  <Text style={styles.sourceOrgText}>{source.organization}</Text>
                  <Text style={styles.sourceTitle}>{source.title}</Text>
                  <Text style={styles.sourceUrl} numberOfLines={1}>
                    {source.url}
                  </Text>
                </View>
                <View style={styles.arrow}>
                  <Icon name="ArrowRight2" size={16} color={theme.colors.onPrimary} variant="Bold" />
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1 },
    notFoundWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
    notFoundTitle: { fontSize: 20, ...fontFaces.heavy, color: c.text },
    notFoundSub: { fontSize: 14, ...fontFaces.medium, color: c.textMuted, textAlign: "center" },
    scrollContent: { paddingTop: 16, gap: 24 },
    catChip: { flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 12 },
    catChipText: { fontSize: 13, ...fontFaces.heavy },
    imageWrap: { alignItems: "center" },
    entryImage: { borderRadius: 16 },
    section: { gap: 4 },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 40, marginBottom: 4 },
    sectionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    sectionTitle: { flex: 1, fontSize: 20, ...fontFaces.heavy, color: c.text },
    /* Dashed lines, as in the Settings list */
    divided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    definition: { fontSize: 16, ...fontFaces.medium, color: c.text, lineHeight: 24 },
    factRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 12 },
    factNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.primarySurface, alignItems: "center", justifyContent: "center" },
    factNumText: { fontSize: 12, ...fontFaces.heavy, color: c.primaryLight },
    factText: { flex: 1, fontSize: 15, ...fontFaces.medium, color: c.text, lineHeight: 22 },
    mythBlock: { gap: 4, padding: 16, borderRadius: 20, backgroundColor: c.errorSurface },
    pillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    /* The same small chip as the Encyclopedia's filters */
    pill: { flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface },
    pillPressed: { opacity: 0.7 },
    pillText: { fontSize: 13, ...fontFaces.bold, color: c.textSecondary, textTransform: "capitalize" },
    sourceRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
    sourceCopy: { flex: 1, gap: 2 },
    sourceOrgText: { fontSize: 12, ...fontFaces.heavy, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
    sourceTitle: { fontSize: 15, ...fontFaces.heavy, color: c.text },
    sourceUrl: { fontSize: 12, ...fontFaces.medium, color: c.link },
    arrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" },
  };
});
