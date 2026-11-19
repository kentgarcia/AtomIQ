/**
 * AtomIQ Guide — landing dashboard + Immersive Guide Mode
 *
 * Landing: non-redundant dashboard (personalised next step, topic mastery,
 * weak spots, quick starts). No map, no feed, no awards list.
 * Guide Mode: mascot center + speech bubble overlapping mascot + Response Dock
 *   Sentence Composer: "I want to learn about ___" -> [ Radiation ] [ Atoms ] -> Shrodi Response
 */

import { ContentCard } from "@/components/guide/ContentCard";
import { GuideLandingCards } from "@/components/guide/GuideLandingCards";
import { ProfileProgressCard } from "@/components/guide/ProfileProgressCard";
import { HeaderButton, ScreenHeader, useHeaderBorder, useHideTabBar, useTabBarInset } from "@/components/layout";
import { Icon } from "@/components/ui/icon";
import { ReadAloudButton } from "@/components/ui/read-aloud-button";
import { useStorage } from "@/services/StorageContext";
import { applySelection, initialGuideState } from "@/services/guide/engine";
import { getGuideContext } from "@/services/guide/context";
import { getTopicById } from "@/services/guide/topics";
import { loadGuideContent, type LoadedContent } from "@/services/guide/topics";
import { navigateDestination } from "@/services/guide/navigate";
import type { GuideCard, GuideIntent, GuidePill, GuideState, GuideTurn, MascotMood } from "@/services/guide/types";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";
import { getIntentPillColors, getOptionColors } from "@/theme/option-states";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { FadeIn, FadeInUp, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { playSfx } from "@/services/sfx";

// -- phrase map ---------------------------------------------------------------
const INTENT_PHRASE: Record<GuideIntent, string> = {
  learn: "I want to learn about",
  explore: "I want to explore",
  practice: "I want to practice",
  review: "Help me review",
  continue: "I want to continue",
  progress: "Show my progress",
};
const MASCOTS: Record<string, any> = {
  happy: require("@/assets/images/mascot/happy.png"),
  thinking: require("@/assets/images/mascot/thinking.png"),
  idea: require("@/assets/images/mascot/idea.png"),
  explain: require("@/assets/images/mascot/explain.png"),
  blink: require("@/assets/images/mascot/blink.png"),
  happy2: require("@/assets/images/mascot/happy_2.png"),
};
const MASCOT_FOR_MOOD: Record<MascotMood, any> = {
  greeting: MASCOTS.happy,
  thinking: MASCOTS.thinking,
  excited: MASCOTS.idea,
  explaining: MASCOTS.happy2,
  celebrating: MASCOTS.happy,
  encouraging: MASCOTS.blink,
};
// ============================================================================
export default function GuideScreen() {
  const { theme } = useTheme();
  const { userProfile } = useStorage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsiveLayout();
  const c = theme.colors;
  const reducedMotion = useReducedMotion();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const [mode, setMode] = React.useState<"landing" | "guide">("landing");
  const [state, setState] = React.useState<GuideState | null>(null);
  const [guideCtx, setGuideCtx] = React.useState<Awaited<ReturnType<typeof getGuideContext>> | null>(null);
  const [ready, setReady] = React.useState(false);
  const [pendingPill, setPendingPill] = React.useState<GuidePill | null>(null);
  const contentRef = useRef<LoadedContent | null>(null);

  const float = useSharedValue(0);
  const rot = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    float.value = withRepeat(withTiming(-6, { duration: 1600 }), -1, true);
    rot.value = withRepeat(withTiming(1.2, { duration: 2200 }), -1, true);
  }, [float, rot, reducedMotion]);
  const mascotStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }, { rotate: `${rot.value}deg` }] }));

  // Landing shows the tab bar; Guide Mode is immersive and hides it. Done via
  // the inset provider (layout effect) so the bar never floats over the
  // response dock for a frame, and is always released when this screen unmounts.
  useHideTabBar(mode === "guide", "guide-mode");

  // clear pending pill when switching modes
  useEffect(() => {
    setPendingPill(null);
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const content = await loadGuideContent();
      const ctx = await getGuideContext(userProfile);
      if (cancelled) return;
      contentRef.current = content;
      setGuideCtx(ctx);
      setState(initialGuideState(ctx));
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [userProfile]);

  const handleSelectPill = (pill: GuidePill) => {
    if (!state || !contentRef.current) return;
    if (pill.payload.type === "utility" && pill.payload.utility === "start-over") {
      setPendingPill(null);
      (async () => { const ctx = await getGuideContext(userProfile); setGuideCtx(ctx); setState(initialGuideState(ctx)); })();
      return;
    }
    if (pill.payload.type === "utility" && pill.payload.utility === "change-topic") return;
    // The pill is the learner's message; Shrodi's answer lands when the new turn is set
    void playSfx("social.message-send");
    (async () => {
      const ctx = await getGuideContext(userProfile);
      setGuideCtx(ctx);
      setState((prev) => (prev ? applySelection(prev, pill, ctx, contentRef.current!) : prev));
      void playSfx("social.message-receive");
    })();
  };
  const handleCardCta = (card: GuideCard) => navigateDestination(router, card.destination);
  const handleRevert = (turnIndex: number) => {
    setPendingPill(null);
    setState((prev) => {
      if (!prev) return prev;
      const newTurns = prev.turns.slice(0, turnIndex);
      return { ...prev, turns: newTurns };
    });
  };
  const handlePillPress = (pill: GuidePill) => {
    // Dashboard from completion exits Guide Mode
    if (pill.label === "Dashboard" && pill.payload.type === "utility") {
      setPendingPill(pill);
      handleSelectPill(pill);
      setMode("landing");
      return;
    }
    setPendingPill(pill);
    handleSelectPill(pill);
  };
  const handleUndo = () => {
    if (!state) return;
    const lastIdx = [...state.turns].reverse().findIndex((t) => t.role === "user");
    if (lastIdx === -1) return;
    const turnIndex = state.turns.length - 1 - lastIdx;
    handleRevert(turnIndex);
  };
  // removed send — pills now proceed immediately, undo reverts last step

  const enterChat = async (intent?: GuideIntent) => {
    setMode("guide");
    if (!contentRef.current) return;
    const ctx = await getGuideContext(userProfile);
    setGuideCtx(ctx);
    const fresh = initialGuideState(ctx);
    if (!intent) { setState(fresh); return; }
    const pill = fresh.turns[0].pills?.find((p) => p.payload.type === "intent" && (p.payload as any).intent === intent);
    if (pill) setState(applySelection(fresh, pill, ctx, contentRef.current));
    else setState(fresh);
  };

  if (!ready || !state || !guideCtx || !contentRef.current) {
    return (
      <View style={[styles.container, { backgroundColor: c.mapBackground }]}>
        <View style={styles.loading}>
          {/* A white chip: grey text straight on the blue would be hard to read */}
          <View style={styles.loadingChip}><ActivityIndicator color={c.primary} /><Text style={[styles.loadingText, { color: c.text }]}>Loading your guide…</Text></View>
        </View>
      </View>
    );
  }

  // ---- landing ------------------------------------------------------------
  if (mode === "landing") {
    return <LandingDashboard ctx={guideCtx} content={contentRef.current} onEnterChat={enterChat} />;
  }

  // ---- Guide Mode (Immersive) --------------------------------------------------
  const activeTurn: GuideTurn | null = state.turns.length && state.turns[state.turns.length - 1].role === "guide" ? (state.turns[state.turns.length - 1] as GuideTurn) : null;
  const mascotSrc = MASCOT_FOR_MOOD[state.mascotMood] ?? MASCOTS.happy;
  const sentenceHeader = (() => {
    if (!state.intent || !activeTurn?.pills?.length) return null;
    const firstKind = activeTurn.pills[0].kind;
    if (firstKind === "intent") return null;
    if (firstKind === "topic" || firstKind === "category") return INTENT_PHRASE[state.intent] ?? "I want to";
    if (state.topicId) { const topic = getTopicById(state.topicId); if (topic && state.intent) return `${INTENT_PHRASE[state.intent]} ${topic.label}`; }
    return null;
  })();
  const showPhrasePills = activeTurn?.pills?.[0]?.kind === "intent";
  const showCards = !!activeTurn?.cards?.length;
  // allow pills + cards together for completion state
  const showOptionPills = !!activeTurn?.pills?.length && !showPhrasePills;

  return (
    <View style={[styles.container, { backgroundColor: c.mapBackground }]}>
      {/* Guide Mode header: back to the dashboard on the left, Start Over on the right once there is something to undo */}
      <ScreenHeader
        title="Guide"
        onBack={() => setMode("landing")}
        backLabel="Go to Dashboard"
        right={
          state.turns.length > 1 ? (
            <HeaderButton
              icon="Refresh"
              label="Start over guide"
              onPress={() =>
                handleSelectPill({ id: "util-start-over", label: "Start Over", kind: "utility", icon: "Refresh", payload: { type: "utility", utility: "start-over" } } as GuidePill)
              }
            />
          ) : null
        }
      />

      <View style={styles.stage}>
        <View style={styles.mascotStage}>
          <Animated.View style={[styles.mascotWrapLarge, mascotStyle]}><Image source={mascotSrc} style={styles.mascotLarge} resizeMode="contain" accessible={false} /></Animated.View>
          <Animated.View key={activeTurn?.id ?? "loading"} entering={reducedMotion ? FadeIn.duration(120) : FadeInUp.duration(220)} style={styles.speechOverlayCard}>
            <Text style={styles.speechOverlayText}>{activeTurn?.text ?? "…"}</Text>
            {activeTurn?.text ? (
              // Read Aloud policy: reads the current Guide message only.
              <ReadAloudButton
                ownerId={`guide:${activeTurn.id}`}
                subject="message"
                variant="pill"
                accent={c.primaryLight}
                text={() => activeTurn.text}
                style={{ marginTop: 12 }}
              />
            ) : null}
          </Animated.View>
        </View>
      </View>

      <Animated.View
        entering={reducedMotion ? FadeIn.duration(150) : FadeInUp.duration(300)}
        style={[
          styles.chatBox,
          {
            paddingBottom: insets.bottom + 14,
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
          },
        ]}
      >
        <View style={styles.chatHandle} />
        {sentenceHeader && showOptionPills && (
          <View style={styles.sentenceHeader}><Text style={[styles.sentencePrefix, { color: c.text }]}>{sentenceHeader}</Text><View style={[styles.blankLine, { backgroundColor: c.borderSubtle }]} /><Icon name="Edit" size={12} color={c.textFaint} variant="Linear" /></View>
        )}
        {showCards && activeTurn?.cards && (
          <>
            {activeTurn.cards.length === 1 && activeTurn.cards[0].kind === "profile-summary" ? (
              <View style={{ marginBottom: 8 }}>
                <ProfileProgressCard />
              </View>
            ) : activeTurn.cards?.length === 1 ? (
              /* Single resolved action — full-width card like a profile section card */
              (() => {
                const single = activeTurn.cards![0];
                return (
                  <Animated.View
                    key={activeTurn.id}
                    entering={reducedMotion ? FadeIn.duration(120) : FadeInUp.duration(220)}
                    style={styles.singleCard}
                  >
                    {single.kind === "profile-summary" ? (
                      <ProfileProgressCard />
                    ) : (
                      <ContentCard card={single} onCta={() => handleCardCta(single)} />
                    )}
                  </Animated.View>
                );
              })()
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow} style={styles.cardsScroll}>
                {activeTurn.cards.map((card, i) =>
                  card.kind === "profile-summary" ? (
                    <View key={card.title} style={styles.cardWrap}>
                      <ProfileProgressCard />
                    </View>
                  ) : (
                    <Animated.View
                      key={card.title}
                      entering={reducedMotion ? FadeIn.duration(120) : FadeInUp.duration(220).delay(i * 60)}
                      style={styles.cardWrap}
                    >
                      <ContentCard card={card} onCta={() => handleCardCta(card)} />
                    </Animated.View>
                  )
                )}
              </ScrollView>
            )}
          </>
        )}
        {showPhrasePills && activeTurn?.pills && (
          <View style={styles.phraseGrid}>
            {activeTurn.pills.map((pill) => {
              const phrase = pill.payload.type === "intent" ? INTENT_PHRASE[pill.payload.intent] : pill.label;
              return (
                <Pressable
                  key={pill.id}
                  onPress={() => handlePillPress(pill)}
                  hitSlop={4}
                  accessibilityLabel={phrase}
                  accessibilityRole="button"
                  style={({ pressed }) => {
                    // Semantic amber pair (>= 4.5:1) — never white on orange.
                    const col = getIntentPillColors(c, pressed);
                    return [styles.phrasePill, { backgroundColor: col.background, borderColor: col.border, transform: [{ scale: pressed ? 0.98 : 1 }] }];
                  }}
                >
                  {({ pressed }) => {
                    const col = getIntentPillColors(c, pressed);
                    return (
                      <View style={styles.phrasePillInner}>
                        {pill.icon && <Icon name={pill.icon} size={18} color={col.icon} variant="Bold" />}
                        <Text style={[styles.phraseText, { color: col.text, textAlign: "center", flex: 1 }]}>{phrase}</Text>
                      </View>
                    );
                  }}
                </Pressable>
              );
            })}
          </View>
        )}
        {showOptionPills && activeTurn?.pills && (
          <Animated.View entering={reducedMotion ? FadeIn.duration(120) : FadeIn.duration(200)} style={styles.optionGrid}>
            {activeTurn.pills.map((pill) => {
              const isSelected = pendingPill?.id === pill.id;
              return (
                <Pressable
                  key={pill.id}
                  onPress={() => handlePillPress(pill)}
                  hitSlop={4}
                  accessibilityLabel={pill.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => {
                    const col = getOptionColors(c, isSelected ? "selected" : pressed ? "pressed" : "idle");
                    return [styles.optionPill, { backgroundColor: col.background, borderColor: col.border, borderWidth: col.borderWidth }];
                  }}
                >
                  {({ pressed }) => {
                    const col = getOptionColors(c, isSelected ? "selected" : pressed ? "pressed" : "idle");
                    return (
                      <>
                        {col.showCheck && <Icon name="TickCircle" size={16} color={col.icon} variant="Bold" style={{ marginRight: 6 }} />}
                        <Text style={[styles.optionPillText, { color: col.text }]}>{pill.label}</Text>
                      </>
                    );
                  }}
                </Pressable>
              );
            })}
          </Animated.View>
        )}
        {!showCards && activeTurn && !activeTurn.pills?.length && <Text style={styles.bottomHint}>Choose Start Over to begin a new path</Text>}
        {/* Full-width Back button (replaces the old input field spot) */}
        {state.turns.length > 1 && (
          <Pressable
            onPress={handleUndo}
            hitSlop={4}
            accessibilityLabel="Go back to previous choice"
            accessibilityRole="button"
            style={({ pressed }) => [styles.bottomBackButton, { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <Icon name="ArrowLeft" size={16} color="#FFFFFF" variant="Bold" />
            <Text style={styles.bottomBackButtonText}>Back</Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

// -- Landing dashboard (non-redundant) --------------------------------------
function LandingDashboard({ ctx, content, onEnterChat }: { ctx: Awaited<ReturnType<typeof getGuideContext>>; content: LoadedContent; onEnterChat: (intent?: GuideIntent) => void; }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { contentMaxWidth } = useResponsiveLayout();
  const tabBarInset = useTabBarInset();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={[styles.container, { backgroundColor: c.mapBackground }]}>
      <ScreenHeader title="Guide" scrolled={scrolled} />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.landingScroll,
          {
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
            paddingTop: 16,
            paddingBottom: tabBarInset + 24,
          },
        ]}
      >
        <GuideLandingCards ctx={ctx} content={content} onEnterChat={onEnterChat} />
      </ScrollView>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingChip: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.card, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: c.border, borderBottomWidth: 3 },
  loadingText: { fontSize: 13, ...fontFaces.semibold },
  stage: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingBottom: 12 },
  mascotWrap: { alignItems: "center", justifyContent: "center" },
  mascot: { width: 176, height: 176 },
  chatBox: { backgroundColor: c.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, borderColor: c.border, paddingHorizontal: 16, paddingTop: 12, shadowColor: c.shadow, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 8 },
  bottomBackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EA580C",
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#C2410C",
    borderBottomWidth: 4,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomBackButtonText: { fontSize: 15, ...fontFaces.heavy, color: "#FFFFFF" },
  // center — mascot + overlay speech card (big & bold)
  mascotStage: { alignItems: "center", justifyContent: "center", width: "100%" },
  mascotWrapLarge: { alignItems: "center", justifyContent: "center" },
  mascotLarge: { width: 220, height: 220 },
  speechOverlayCard: {
    backgroundColor: c.card,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 2,
    borderColor: c.border,
    borderBottomWidth: 4,
    maxWidth: 340,
    width: "92%",
    alignSelf: "center",
    marginTop: -28,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 2,
  },
  speechOverlayText: { fontSize: 20, ...fontFaces.heavy, lineHeight: 26, color: c.text, textAlign: "center" },
  chatHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.borderSubtle, alignSelf: "center", marginBottom: 12 },
  sentenceHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, paddingHorizontal: 2 },
  sentencePrefix: { fontSize: 13, ...fontFaces.semibold },
  blankLine: { flex: 1, height: 2, borderRadius: 1, maxWidth: 88, opacity: 0.9 },
  bottomHint: { fontSize: 12, ...fontFaces.regular, marginBottom: 10 },
  cardsScroll: { marginHorizontal: -16 },
  /* alignItems stretch makes every wrap follow the tallest card */
  cardsRow: { gap: 12, paddingHorizontal: 16, paddingBottom: 4, alignItems: "stretch" },
  cardWrap: { width: 300 },
  singleCard: { marginBottom: 8 },
  phraseGrid: { flexDirection: "column", gap: 10 },
  phrasePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderBottomWidth: 4,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    width: "100%",
    minHeight: 52,
  },
  phrasePillInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, flex: 1 },
  phraseText: { fontSize: 14, ...fontFaces.semibold },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderBottomWidth: 4,
    borderColor: c.border,
    backgroundColor: c.card,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    width: "48%",
    minHeight: 50,
  },
  optionPillText: { fontSize: 14, ...fontFaces.semibold },
  // landing — the cards are in components/guide/GuideLandingCards.tsx
  // landing — the same side padding as the Quests page
  landingScroll: { paddingHorizontal: 16 },
  };
});
