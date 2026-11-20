/**
 * Element detail — beginner-friendly facts, nuclear connection, the element/isotope/ion explainer,
 * and links to related lessons and encyclopedia entries. Flat sections with dashed dividers, no
 * cards. Previous and Next sit in a pinned footer, so moving along the table never needs a scroll.
 * Everything except the linked titles is bundled data.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View, type ScrollViewInstance } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { settle } from "@/components/motion/settle";
import { ElementIsotopeIonCard } from "@/components/periodic-table/ElementIsotopeIonCard";
import { useCategoryColors } from "@/components/periodic-table/use-category-colors";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { CATEGORY_BLURBS, CATEGORY_LABELS } from "@/content/periodic-table/elements";
import { symbolFromParam } from "@/content/periodic-table/search";
import { getEncyclopediaEntryById } from "@/content/explorer";
import { recordActivity } from "@/services/activity-log";
import { contentRepository } from "@/services/content-db";
import { navigateDestination } from "@/services/guide/navigate";
import { impactLight } from "@/services/haptics";
import {
  elementAccessibilityLabel,
  formatAtomicMass,
  getElementByAtomicNumber,
  getElementBySymbol,
  PERIODIC_TABLE_HREF,
  TOTAL_ELEMENTS,
} from "@/services/periodic-table";
import { createStyles, fontFaces, layout, useResponsiveLayout, useTheme, withAlpha } from "@/theme";

/** How long an element must stay open to count as exploration. */
const ENGAGEMENT_MS = 8000;

const EMPTY_TITLES: Record<string, string> = {};

const prettify = (id: string): string =>
  id
    .split("-")
    .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(" ");

const useStyles = createStyles((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.mapBackground },
  content: { gap: 18, paddingTop: 6 },
  footer: { paddingTop: 10, backgroundColor: theme.colors.mapBackground },
  navRow: { flexDirection: "row", gap: 12 },
  hero: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 4 },
  tile: {
    width: 108,
    height: 108,
    borderRadius: 24,
    borderWidth: 2.5,
    borderBottomWidth: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  tileNumber: { position: "absolute", top: 8, left: 12, fontSize: 14, lineHeight: 18, ...fontFaces.heavy },
  tileSymbol: { fontSize: 50, lineHeight: 58, ...fontFaces.black, includeFontPadding: false },
  heroCopy: { flex: 1, gap: 8 },
  heroName: { fontSize: 26, lineHeight: 32, ...fontFaces.black, color: theme.colors.text },
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { fontSize: 13, ...fontFaces.bold, color: theme.colors.text },
  section: { gap: 8 },
  sectionDivided: { paddingTop: 18, borderTopWidth: 1, borderStyle: "dashed", borderColor: theme.colors.border },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 18, lineHeight: 24, ...fontFaces.heavy, color: theme.colors.text },
  body: { fontSize: 15, lineHeight: 23, ...fontFaces.medium, color: theme.colors.textSecondary },
  note: { fontSize: 13, lineHeight: 19, ...fontFaces.medium, color: theme.colors.textMuted },
  factRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12, paddingVertical: 10 },
  factDivided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: theme.colors.border },
  factLabel: { fontSize: 14, lineHeight: 20, ...fontFaces.semibold, color: theme.colors.textMuted },
  factValue: { flexShrink: 1, textAlign: "right", fontSize: 15, lineHeight: 21, ...fontFaces.heavy, color: theme.colors.text },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: layout.minTouchTarget + 8, paddingVertical: 8 },
  linkTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha(theme.colors.primary, 0.14),
  },
  linkKind: { fontSize: 12, lineHeight: 16, ...fontFaces.heavy, letterSpacing: 0.4, textTransform: "uppercase", color: theme.colors.textMuted },
  linkText: { flex: 1, fontSize: 15, lineHeight: 21, ...fontFaces.bold, color: theme.colors.text },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pillText: { fontSize: 13, ...fontFaces.bold, color: theme.colors.text },
  notFound: { alignItems: "center", gap: 14, padding: 24 },
}));

function Section({ title, icon, divided = true, children }: { title: string; icon?: string; divided?: boolean; children: React.ReactNode }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return (
    <View style={[styles.section, divided && styles.sectionDivided]}>
      <View style={styles.titleRow}>
        {icon ? <Icon name={icon} size={22} color={theme.colors.primary} variant="Bold" /> : null}
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

export default function ElementDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const colors = useCategoryColors();
  const { contentFrameStyle } = useResponsiveLayout();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const scroller = useRef<ScrollViewInstance>(null);

  const element = useMemo(() => getElementBySymbol(symbolFromParam(symbol)), [symbol]);

  // Linked content titles: show prettified ids at once, upgrade from the DB.
  // Results are keyed by symbol so a stale result never shows on another element.
  const [titles, setTitles] = useState<{
    symbol: string;
    lessons: Record<string, string>;
    terms: Record<string, string>;
  } | null>(null);

  useEffect(() => {
    if (!element) return;
    let alive = true;
    const lessonIds = [...element.relatedLessonIds, "isotopes"];
    const termIds = [...element.relatedTerms, "isotope", "atomic-number"];
    Promise.all([
      Promise.all(lessonIds.map((id) => contentRepository.getLessonById(id).then((l) => [id, l?.title] as const))),
      Promise.all(termIds.map((id) => getEncyclopediaEntryById(id).then((e) => [id, e?.term] as const))),
    ])
      .then(([lessonPairs, termPairs]) => {
        if (!alive) return;
        const lessons: Record<string, string> = {};
        const terms: Record<string, string> = {};
        for (const [id, title] of lessonPairs) if (title) lessons[id] = title;
        for (const [id, term] of termPairs) if (term) terms[id] = term;
        setTitles({ symbol: element.symbol, lessons, terms });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [element]);

  const lessonTitles = titles && titles.symbol === element?.symbol ? titles.lessons : EMPTY_TITLES;
  const termTitles = titles && titles.symbol === element?.symbol ? titles.terms : EMPTY_TITLES;

  // Engagement: staying on an element for a few seconds counts as exploring.
  const elementSymbol = element?.symbol;
  useEffect(() => {
    if (!elementSymbol) return;
    const timer = setTimeout(() => {
      recordActivity("periodic_table_explore", { id: elementSymbol });
    }, ENGAGEMENT_MS);
    return () => clearTimeout(timer);
  }, [elementSymbol]);

  // A new element starts at the top, wherever the last one was left.
  useEffect(() => {
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, [elementSymbol]);

  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(PERIODIC_TABLE_HREF);
  }, [router]);

  const openLesson = useCallback(
    (id: string) => {
      // Tapping a linked lesson is also engagement.
      if (elementSymbol) recordActivity("periodic_table_explore", { id: elementSymbol });
      navigateDestination(router, { screen: "lesson", id });
    },
    [router, elementSymbol],
  );

  const openTerm = useCallback(
    (id: string) => {
      navigateDestination(router, { screen: "encyclopedia-entry", id });
    },
    [router],
  );

  const goToNumber = useCallback(
    (n: number) => {
      const target = getElementByAtomicNumber(n);
      if (!target) return;
      impactLight();
      router.setParams({ symbol: target.symbol });
    },
    [router],
  );

  if (!element) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Periodic Table" subtitle="Element not found" onBack={onBack} />
        <View style={[contentFrameStyle, styles.notFound]}>
          <Text style={styles.body}>We could not find that element.</Text>
          <Button label="Open the periodic table" onPress={() => router.replace(PERIODIC_TABLE_HREF)} />
        </View>
      </View>
    );
  }

  const c = colors[element.category];
  const prev = getElementByAtomicNumber(element.atomicNumber - 1);
  const next = getElementByAtomicNumber(element.atomicNumber + 1);
  const category = CATEGORY_LABELS[element.category];
  const groupText = element.group === null ? "f-block (no group number)" : `Group ${element.group}`;
  const lessonIds = element.relatedLessonIds;

  const facts: [string, string][] = [
    ["Atomic number", String(element.atomicNumber)],
    ["Atomic mass", `${formatAtomicMass(element)} u`],
    ["Group", element.group === null ? "f-block" : String(element.group)],
    ["Period", String(element.period)],
    ["Category", category],
  ];

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={element.name}
        subtitle={`Element ${element.atomicNumber} of ${TOTAL_ELEMENTS}`}
        onBack={onBack}
        scrolled={scrolled}
      />
      <ScrollView
        ref={scroller}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[contentFrameStyle, styles.content, { paddingBottom: 24 }]}
      >
        {/* Keyed by symbol: the next element settles in; the old one is simply gone (no exit that would leave two pages in the flow) */}
        <Animated.View key={element.symbol} entering={settle()} style={styles.content}>
          <View
            accessible
            accessibilityLabel={`${elementAccessibilityLabel(element)}, ${groupText}, period ${element.period}`}
            style={styles.hero}
          >
            <View style={[styles.tile, { borderColor: c.accent, backgroundColor: c.fill }]}>
              <Text style={[styles.tileNumber, { color: c.textSecondary }]}>{element.atomicNumber}</Text>
              <Text style={[styles.tileSymbol, { color: c.text }]}>{element.symbol}</Text>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroName}>{element.name}</Text>
              <View style={styles.chip}>
                <View style={[styles.chipDot, { backgroundColor: c.accent }]} />
                <Text style={styles.chipText}>{category}</Text>
              </View>
              {element.noStableIsotope ? (
                <View style={styles.chip}>
                  <Icon name="InfoCircle" size={16} color={theme.colors.warning} variant="Bold" />
                  <Text style={styles.chipText}>No stable isotopes</Text>
                </View>
              ) : null}
            </View>
          </View>

          <Section title="At a glance" divided={false}>
            <View>
              {facts.map(([label, value], i) => (
                <View key={label} style={[styles.factRow, i > 0 && styles.factDivided]} accessible accessibilityLabel={`${label}: ${value}`}>
                  <Text style={styles.factLabel}>{label}</Text>
                  <Text style={styles.factValue}>{value}</Text>
                </View>
              ))}
            </View>
            {element.massIsMassNumber ? (
              <Text style={styles.note}>
                Square brackets mean this element has no stable isotope, so the number shown is the mass number of its
                longest-lived known isotope.
              </Text>
            ) : null}
            <Text style={styles.note}>{CATEGORY_BLURBS[element.category]}</Text>
          </Section>

          <Section title={`About ${element.name}`}>
            <Text style={styles.body}>{element.fact}</Text>
          </Section>

          {element.nuclearConnection ? (
            <Section title="Nuclear connection" icon="Radar">
              <Text style={styles.body}>{element.nuclearConnection}</Text>
            </Section>
          ) : null}

          <View style={styles.sectionDivided}>
            <ElementIsotopeIonCard
              element={element}
              footer={
                <View style={styles.pills}>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Read the lesson: ${lessonTitles["isotopes"] ?? "What is an Isotope?"}`}
                    onPress={() => openLesson("isotopes")}
                    style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}
                  >
                    <Icon name="Book1" size={16} color={theme.colors.primary} variant="Bold" />
                    <Text style={styles.pillText}>Lesson: isotopes</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="Read the AtomDex entry for isotope"
                    onPress={() => openTerm("isotope")}
                    style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}
                  >
                    <Icon name="Book" size={16} color={theme.colors.primary} variant="Bold" />
                    <Text style={styles.pillText}>Isotope</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="Read the AtomDex entry for atomic number"
                    onPress={() => openTerm("atomic-number")}
                    style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}
                  >
                    <Icon name="Book" size={16} color={theme.colors.primary} variant="Bold" />
                    <Text style={styles.pillText}>Atomic number</Text>
                  </Pressable>
                </View>
              }
            />
          </View>

          {lessonIds.length > 0 ? (
            <Section title="Related lessons">
              <View>
                {lessonIds.map((id, i) => (
                  <Pressable
                    key={id}
                    accessibilityRole="link"
                    accessibilityLabel={`Open lesson: ${lessonTitles[id] ?? prettify(id)}`}
                    onPress={() => openLesson(id)}
                    style={({ pressed }) => [styles.linkRow, i > 0 && styles.factDivided, pressed && { opacity: 0.6 }]}
                  >
                    <View style={styles.linkTile}>
                      <Icon name="Teacher" size={20} color={theme.colors.primary} variant="Bold" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.linkKind}>Lesson</Text>
                      <Text style={styles.linkText}>{lessonTitles[id] ?? prettify(id)}</Text>
                    </View>
                    <Icon name="ArrowRight2" size={16} color={theme.colors.textFaint} variant="Bold" />
                  </Pressable>
                ))}
              </View>
            </Section>
          ) : null}

          {element.relatedTerms.length > 0 ? (
            <Section title="Learn more in the AtomDex">
              <View style={styles.pills}>
                {element.relatedTerms.map((id) => (
                  <Pressable
                    key={id}
                    accessibilityRole="link"
                    accessibilityLabel={`Open AtomDex entry: ${termTitles[id] ?? prettify(id)}`}
                    onPress={() => openTerm(id)}
                    style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.pillText}>{termTitles[id] ?? prettify(id)}</Text>
                    <Icon name="ArrowRight2" size={14} color={theme.colors.textFaint} variant="Bold" />
                  </Pressable>
                ))}
              </View>
            </Section>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, contentFrameStyle, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.navRow}>
          <View style={{ flex: 1 }}>
            <Button
              label={prev ? prev.name : "Start"}
              variant="secondary"
              disabled={!prev}
              accessibilityLabel={prev ? `Previous element: ${prev.atomicNumber} ${prev.name}` : "No previous element"}
              onPress={() => prev && goToNumber(prev.atomicNumber)}
              renderIcon={(color) => <Icon name="ArrowLeft2" size={18} color={color} variant="Bold" />}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={next ? next.name : "End"}
              disabled={!next}
              accessibilityLabel={next ? `Next element: ${next.atomicNumber} ${next.name}` : "No next element"}
              onPress={() => next && goToNumber(next.atomicNumber)}
              renderIcon={(color) => <Icon name="ArrowRight2" size={18} color={color} variant="Bold" />}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
