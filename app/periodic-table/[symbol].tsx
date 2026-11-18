/**
 * Element detail — beginner-friendly facts, nuclear connection, the
 * element/isotope/ion explainer, and links to related lessons and
 * encyclopedia entries. Everything except the linked titles is bundled data.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { FadeIn, FadeInLeft, FadeInRight, FadeOut, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DURATION, EASE_IN_OUT } from "@/theme/motion";

import { ElementIsotopeIonCard } from "@/components/periodic-table/ElementIsotopeIonCard";
import { useCategoryColors } from "@/components/periodic-table/use-category-colors";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { CATEGORY_BLURBS, CATEGORY_LABELS } from "@/content/periodic-table/elements";
import { getEncyclopediaEntryById } from "@/content/explorer";
import { recordActivity } from "@/services/activity-log";
import { contentRepository } from "@/services/content-db";
import { navigateDestination } from "@/services/guide/navigate";
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
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");

const makeStyles = createStyles((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { gap: 14, paddingTop: 4 },
  swapGroup: { gap: 14 },
  hero: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 24,
    borderWidth: 3,
  },
  tile: {
    width: 116,
    height: 116,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tileNumber: {
    position: "absolute",
    top: 8,
    left: 10,
    fontSize: 14,
    lineHeight: 18,
    ...fontFaces.heavy,
  },
  tileSymbol: {
    fontSize: 52,
    lineHeight: 60,
    ...fontFaces.black,
    includeFontPadding: false,
  },
  heroCopy: { flex: 1, minWidth: 160, gap: 6 },
  heroName: {
    fontSize: 26,
    lineHeight: 32,
    ...fontFaces.black,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  badgeText: {
    fontSize: 13,
    lineHeight: 18,
    ...fontFaces.heavy,
    color: theme.colors.text,
  },
  card: {
    gap: 10,
    padding: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    ...fontFaces.heavy,
    color: theme.colors.text,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    ...fontFaces.book,
    color: theme.colors.text,
  },
  note: {
    fontSize: 13,
    lineHeight: 19,
    ...fontFaces.book,
    color: theme.colors.textSecondary,
  },
  factRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  factLabel: {
    fontSize: 14,
    lineHeight: 20,
    ...fontFaces.semibold,
    color: theme.colors.textSecondary,
  },
  factValue: {
    flexShrink: 1,
    textAlign: "right",
    fontSize: 15,
    lineHeight: 21,
    ...fontFaces.heavy,
    color: theme.colors.text,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: layout.minTouchTarget + 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: withAlpha(theme.colors.primary, 0.08),
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    ...fontFaces.semibold,
    color: theme.colors.text,
  },
  linkKind: {
    fontSize: 12,
    lineHeight: 16,
    ...fontFaces.semibold,
    color: theme.colors.textSecondary,
  },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  navRow: { flexDirection: "row", gap: 12 },
  navBtn: {
    flex: 1,
    minHeight: layout.minTouchTarget + 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  navBtnDisabled: { opacity: 0.4 },
  navText: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 19,
    ...fontFaces.semibold,
    color: theme.colors.text,
  },
  primaryBtn: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    backgroundColor: theme.colors.primary,
  },
  primaryBtnText: {
    fontSize: 14,
    ...fontFaces.heavy,
    color: theme.colors.onPrimary,
  },
  notFound: { alignItems: "center", gap: 14, padding: 24 },
}));

export default function ElementDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const colors = useCategoryColors();
  const { contentFrameStyle } = useResponsiveLayout();
  const { symbol } = useLocalSearchParams<{ symbol: string }>();

  const element = useMemo(
    () => getElementBySymbol(typeof symbol === "string" ? decodeURIComponent(symbol) : undefined),
    [symbol],
  );

  // Prev/next swaps the element in place (docs/CONTINUITY_SPEC.md, C6): the
  // content slides out and the new element enters from the side of travel.
  // `null` until the first swap, so opening the screen plays no extra entrance.
  const reducedMotion = useReducedMotion();
  const [swapDirection, setSwapDirection] = useState<"forward" | "back" | null>(null);

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
      Promise.all(
        lessonIds.map((id) => contentRepository.getLessonById(id).then((l) => [id, l?.title] as const)),
      ),
      Promise.all(
        termIds.map((id) => getEncyclopediaEntryById(id).then((e) => [id, e?.term] as const)),
      ),
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
      setSwapDirection(n > (element?.atomicNumber ?? n) ? "forward" : "back");
      router.setParams({ symbol: target.symbol });
    },
    [router, element?.atomicNumber],
  );

  if (!element) {
    return (
      <View style={styles.root}>
        <PageHeader title="Periodic Table" subtitle="Element not found" onBack={onBack} />
        <View style={[contentFrameStyle, styles.notFound]}>
          <Text style={styles.body}>We could not find that element.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open the periodic table"
            onPress={() => router.replace(PERIODIC_TABLE_HREF)}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Open the periodic table</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const c = colors[element.category];
  const prev = getElementByAtomicNumber(element.atomicNumber - 1);
  const next = getElementByAtomicNumber(element.atomicNumber + 1);
  const category = CATEGORY_LABELS[element.category];
  const groupText =
    element.group === null ? "f-block (no group number)" : `Group ${element.group}`;

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
      <PageHeader
        title={element.name}
        subtitle={`Element ${element.atomicNumber} of ${TOTAL_ELEMENTS}`}
        onBack={onBack}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[contentFrameStyle, styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        <Animated.View
          key={element.symbol}
          entering={
            swapDirection === null
              ? undefined
              : reducedMotion
                ? FadeIn.duration(150)
                : (swapDirection === "back" ? FadeInLeft : FadeInRight)
                    .duration(DURATION.medium)
                    .easing(EASE_IN_OUT)
          }
          exiting={swapDirection === null ? undefined : FadeOut.duration(reducedMotion ? 100 : 150)}
          style={styles.swapGroup}
        >
        <View
          accessible
          accessibilityLabel={`${elementAccessibilityLabel(element)}, ${groupText}, period ${element.period}`}
          style={[styles.hero, { backgroundColor: c.fill, borderColor: c.accent }]}
        >
          <View style={[styles.tile, { borderColor: c.accent, backgroundColor: c.fill }]}>
            <Text style={[styles.tileNumber, { color: c.textSecondary }]}>{element.atomicNumber}</Text>
            <Text style={[styles.tileSymbol, { color: c.text }]}>{element.symbol}</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroName, { color: c.text }]}>{element.name}</Text>
            <View style={[styles.badge, { borderColor: c.accent }]}>
              <View
                style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.accent }}
              />
              <Text style={styles.badgeText}>{category}</Text>
            </View>
            {element.noStableIsotope ? (
              <View style={[styles.badge, { borderColor: c.text }]}>
                <Icon name="InfoCircle" size={16} color={c.text} variant="Bold" />
                <Text style={styles.badgeText}>No stable isotopes</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">
            At a glance
          </Text>
          <View>
            {facts.map(([label, value]) => (
              <View key={label} style={styles.factRow} accessible accessibilityLabel={`${label}: ${value}`}>
                <Text style={styles.factLabel}>{label}</Text>
                <Text style={styles.factValue}>{value}</Text>
              </View>
            ))}
          </View>
          {element.massIsMassNumber ? (
            <Text style={styles.note}>
              Square brackets mean this element has no stable isotope, so the number shown is the
              mass number of its longest-lived known isotope.
            </Text>
          ) : null}
          <Text style={styles.note}>{CATEGORY_BLURBS[element.category]}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">
            About {element.name}
          </Text>
          <Text style={styles.body}>{element.fact}</Text>
        </View>

        {element.nuclearConnection ? (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Icon name="Radar" size={22} color={theme.colors.primary} variant="Bold" />
              <Text style={styles.cardTitle} accessibilityRole="header">
                Nuclear connection
              </Text>
            </View>
            <Text style={styles.body}>{element.nuclearConnection}</Text>
          </View>
        ) : null}

        <ElementIsotopeIonCard
          element={element}
          footer={
            <View style={styles.pills}>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Read the lesson: ${lessonTitles["isotopes"] ?? "What is an Isotope?"}`}
                onPress={() => openLesson("isotopes")}
                style={styles.pill}
              >
                <Icon name="Book1" size={16} color={theme.colors.primary} variant="Bold" />
                <Text style={styles.linkText}>Lesson: isotopes</Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Read the encyclopedia entry for isotope"
                onPress={() => openTerm("isotope")}
                style={styles.pill}
              >
                <Icon name="Book" size={16} color={theme.colors.primary} variant="Bold" />
                <Text style={styles.linkText}>Isotope</Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Read the encyclopedia entry for atomic number"
                onPress={() => openTerm("atomic-number")}
                style={styles.pill}
              >
                <Icon name="Book" size={16} color={theme.colors.primary} variant="Bold" />
                <Text style={styles.linkText}>Atomic number</Text>
              </Pressable>
            </View>
          }
        />

        {lessonIds.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle} accessibilityRole="header">
              Related lessons
            </Text>
            {lessonIds.map((id) => (
              <Pressable
                key={id}
                accessibilityRole="link"
                accessibilityLabel={`Open lesson: ${lessonTitles[id] ?? prettify(id)}`}
                onPress={() => openLesson(id)}
                style={({ pressed }) => [
                  styles.linkRow,
                  pressed && { borderColor: theme.colors.text, borderWidth: 3 },
                ]}
              >
                <Icon name="Teacher" size={20} color={theme.colors.primary} variant="Bold" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkKind}>Lesson</Text>
                  <Text style={styles.linkText}>{lessonTitles[id] ?? prettify(id)}</Text>
                </View>
                <Icon name="ArrowRight2" size={16} color={theme.colors.textSecondary} variant="Bold" />
              </Pressable>
            ))}
          </View>
        ) : null}

        {element.relatedTerms.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle} accessibilityRole="header">
              Learn more in the encyclopedia
            </Text>
            <View style={styles.pills}>
              {element.relatedTerms.map((id) => (
                <Pressable
                  key={id}
                  accessibilityRole="link"
                  accessibilityLabel={`Open encyclopedia entry: ${termTitles[id] ?? prettify(id)}`}
                  onPress={() => openTerm(id)}
                  style={({ pressed }) => [
                    styles.pill,
                    pressed && { borderColor: theme.colors.text, borderWidth: 3 },
                  ]}
                >
                  <Text style={styles.linkText}>{termTitles[id] ?? prettify(id)}</Text>
                  <Icon name="ArrowRight2" size={14} color={theme.colors.textSecondary} variant="Bold" />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        </Animated.View>

        <View style={styles.navRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={prev ? `Previous element: ${prev.name}` : "No previous element"}
            accessibilityState={{ disabled: !prev }}
            disabled={!prev}
            onPress={() => prev && goToNumber(prev.atomicNumber)}
            style={[styles.navBtn, !prev && styles.navBtnDisabled]}
          >
            <Icon name="ArrowLeft2" size={16} color={theme.colors.text} variant="Bold" />
            <Text style={styles.navText}>{prev ? `${prev.atomicNumber} ${prev.name}` : "Start"}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={next ? `Next element: ${next.name}` : "No next element"}
            accessibilityState={{ disabled: !next }}
            disabled={!next}
            onPress={() => next && goToNumber(next.atomicNumber)}
            style={[styles.navBtn, !next && styles.navBtnDisabled]}
          >
            <Text style={styles.navText}>{next ? `${next.atomicNumber} ${next.name}` : "End"}</Text>
            <Icon name="ArrowRight2" size={16} color={theme.colors.text} variant="Bold" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
