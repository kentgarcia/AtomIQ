/**
 * AtomIQ Guide — landing dashboard + Immersive Guide Mode
 *
 * Landing: non-redundant dashboard (personalised next step, topic mastery,
 * weak spots, quick starts). No map, no feed, no awards list.
 * Guide Mode: mascot center + speech bubble overlapping mascot + Response Dock
 *   Sentence Composer: "I want to learn about ___" -> [ Radiation ] [ Atoms ] -> Shrodi Response
 */

import { ContentCard } from "@/components/guide/ContentCard";
import { ProfileProgressCard } from "@/components/guide/ProfileProgressCard";
import { Icon } from "@/components/ui/icon";
import { useStorage } from "@/services/StorageContext";
import { applySelection, initialGuideState } from "@/services/guide/engine";
import { getGuideContext } from "@/services/guide/context";
import { getTopicById } from "@/services/guide/topics";
import { loadGuideContent, type LoadedContent } from "@/services/guide/topics";
import { navigateDestination } from "@/services/guide/navigate";
import type { GuideCard, GuideIntent, GuidePill, GuideState, GuideTurn, MascotMood } from "@/services/guide/types";
import { getProfileAvatarSource } from "@/services/profile-avatars";
import { fontFamilies, useTheme } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInUp, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// -- phrase map ---------------------------------------------------------------
const INTENT_PHRASE: Record<GuideIntent, string> = {
  learn: "I want to learn about",
  explore: "I want to explore",
  discover: "I want to discover",
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
  explaining: MASCOTS.explain,
  celebrating: MASCOTS.happy,
  encouraging: MASCOTS.blink,
};
const QUICK_TILES: { intent: GuideIntent; icon: string; color: string; title: string; desc: string }[] = [
  { intent: "learn", icon: "Book", color: "#FF8C00", title: "Learn", desc: "Build your understanding through lessons." },
  { intent: "explore", icon: "SearchNormal", color: "#5E72E4", title: "Explore", desc: "Dive into a topic." },
  { intent: "discover", icon: "DocumentText", color: "#2ECC71", title: "Discover", desc: "Find facts, encyclopedia entries, and articles." },
  { intent: "practice", icon: "Game", color: "#E67E22", title: "Practice", desc: "Test knowledge through quizzes and games." },
];
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

// ============================================================================
export default function GuideScreen() {
  const { theme } = useTheme();
  const { userProfile } = useStorage();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const c = theme.colors;
  const reducedMotion = useReducedMotion();

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

  // Landing shows tab bar, Guide Mode hides it (immersive) — read by ModernTabBar via route params
  useEffect(() => {
    (navigation as any).setParams?.({ hideTabBar: mode === "guide" ? "true" : undefined });
    try { (router as any).setParams?.({ hideTabBar: mode === "guide" ? "true" : undefined }); } catch {}
  }, [mode, navigation, router]);

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
    (async () => {
      const ctx = await getGuideContext(userProfile);
      setGuideCtx(ctx);
      setState((prev) => (prev ? applySelection(prev, pill, ctx, contentRef.current!) : prev));
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
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <LinearGradient colors={["#FFF3E0", "#FFFFFF"]} style={StyleSheet.absoluteFillObject} />
        <View style={styles.loading}><ActivityIndicator color={c.primary} /><Text style={[styles.loadingText, { color: c.textMuted }]}>Loading your guide…</Text></View>
      </View>
    );
  }

  // ---- landing ------------------------------------------------------------
  if (mode === "landing") {
    return <LandingDashboard ctx={guideCtx} content={contentRef.current} userProfile={userProfile} onEnterChat={enterChat} onDirectNav={(card: GuideCard) => handleCardCta(card)} />;
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
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <LinearGradient colors={theme.mode === "dark" ? [c.background, c.surface] : ["#FFF3E0", "#FFFFFF"]} style={StyleSheet.absoluteFillObject} />
      {/* Immersive Guide Mode header — minimal */}
      <View style={[styles.chatHeaderPlain, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => setMode("landing")}
          hitSlop={8}
          accessibilityLabel="Go to Dashboard"
          accessibilityRole="button"
          style={({ pressed }) => [styles.chatBackBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Icon name="ArrowLeft" size={16} color="#333333" variant="Bold" />
          <Text style={styles.chatBackText}>Dashboard</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        {state.turns.length > 1 && (
          <Pressable
            onPress={() => handleSelectPill({ id: "util-start-over", label: "Start Over", kind: "utility", icon: "Refresh", payload: { type: "utility", utility: "start-over" } } as GuidePill)}
            hitSlop={8}
            accessibilityLabel="Start over guide"
            accessibilityRole="button"
            style={({ pressed }) => [styles.startOverLink, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={styles.startOverLinkText}>Start Over</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.stage}>
        <View style={styles.mascotStage}>
          <Animated.View style={[styles.mascotWrapLarge, mascotStyle]}><Image source={mascotSrc} style={styles.mascotLarge} resizeMode="contain" accessible={false} /></Animated.View>
          <Animated.View key={activeTurn?.id ?? "loading"} entering={reducedMotion ? FadeIn.duration(120) : FadeInUp.duration(220)} style={styles.speechOverlayCard}>
            <Text style={styles.speechOverlayText}>{activeTurn?.text ?? "…"}</Text>
          </Animated.View>
        </View>
      </View>

      <Animated.View entering={reducedMotion ? FadeIn.duration(150) : FadeInUp.duration(300)} style={[styles.chatBox, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.chatHandle} />
        {sentenceHeader && showOptionPills && (
          <View style={styles.sentenceHeader}><Text style={[styles.sentencePrefix, { color: "#333333" }]}>{sentenceHeader}</Text><View style={[styles.blankLine, { backgroundColor: "#E5E7EB" }]} /><Icon name="Edit" size={12} color="#9CA3AF" variant="Linear" /></View>
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
              // single color for all intent pills, no inline blank
              const col = { bg: "#FF8C00", border: "#E67E22" };
              return (
                <Pressable
                  key={pill.id}
                  onPress={() => handlePillPress(pill)}
                  hitSlop={4}
                  accessibilityLabel={phrase}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.phrasePill, { backgroundColor: col.bg, borderColor: col.border, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                >
                  <View style={styles.phrasePillInner}>
                    {pill.icon && <Icon name={pill.icon} size={18} color="#FFFFFF" variant="Bold" />}
                    <Text style={[styles.phraseText, { color: "#FFFFFF", textAlign: "center", flex: 1 }]}>{phrase}</Text>
                  </View>
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
                  style={({ pressed }) => [styles.optionPill, { backgroundColor: isSelected ? "#FF8C00" : pressed ? "#FFF3E0" : "#FFFFFF", borderColor: isSelected ? "#E67E22" : "#E5E7EB", opacity: pressed ? 0.95 : 1 }]}
                >
                  <Text style={[styles.optionPillText, { color: isSelected ? "#FFFFFF" : "#333333" }]}>{pill.label}</Text>
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
function LandingDashboard({ ctx, content, userProfile, onEnterChat, onDirectNav }: { ctx: Awaited<ReturnType<typeof getGuideContext>>; content: LoadedContent; userProfile: any; onEnterChat: (intent?: GuideIntent) => void; onDirectNav: (card: GuideCard) => void; }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const weakChips = useMemo(() => ctx.weakQuizIds.slice(0, 3).map((id) => content.quizzes.find((q) => q.id === id)).filter(Boolean) as any[], [ctx.weakQuizIds, content.quizzes]);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <LinearGradient colors={theme.mode === "dark" ? [c.background, c.surface] : ["#FFF3E0", "#FFFFFF"]} style={StyleSheet.absoluteFillObject} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.landingScroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
        {/* overlapping header stack — amber on top, white behind */}
        <View style={styles.headerStack}>
          <View style={styles.homeHeaderBar}>
            <View style={styles.homeHeaderRow}>
              <View style={styles.homeAvatarWrap}>
                <Image source={getProfileAvatarSource(userProfile?.avatar_url)} style={styles.homeAvatar} resizeMode="cover" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.homeGreetingLabel}>{getGreeting()}</Text>
                <Text style={styles.homeGreetingName} numberOfLines={1}>{userProfile?.display_name || userProfile?.username || "Atom Explorer"}</Text>
              </View>
              <View style={styles.homeXpPill}>
                <Icon name="Flash" size={15} color="#FFA000" variant="Bold" />
                <Text style={styles.homeXpText}>{(userProfile?.total_xp || 0).toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.shrodiCard}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.shrodiTitle}>Meet Shrodi</Text>
                <Text style={styles.shrodiOverview}>
                  Shrodi is your AtomIQ Guide — a friendly nuclear science companion. Tap a sentence like “I want to learn about —” and fill the blank to jump straight to lessons, encyclopedia entries, articles or games. No typing needed.
                </Text>
              </View>
              <View style={styles.shrodiAvatarWrap}>
                <Image source={MASCOTS.happy} style={styles.shrodiAvatar} resizeMode="contain" />
              </View>
            </View>
          </View>
          <View style={styles.whiteBehindWrapper}>
            <Pressable onPress={() => onEnterChat()} style={({ pressed }) => [styles.guideCta3d, { opacity: pressed ? 0.95 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
              <Icon name="Message" size={18} color="#FFFFFF" variant="Bold" />
              <Text style={styles.guideCta3dText}>Talk to Guide</Text>
              <Icon name="ArrowRight" size={16} color="#FFFFFF" variant="Bold" />
            </Pressable>
          </View>
        </View>

        {/* weak spots — only if you have them */}
        {weakChips.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Focus areas</Text><Pressable onPress={() => onEnterChat("review")}><Text style={[styles.linkText, { color: c.primary }]}>Review all</Text></Pressable></View>
            <View style={{ gap: 8 }}>
              {weakChips.map((q: any) => (
                <View key={q.id} style={[styles.weakRow, { backgroundColor: "#F9FAFB", borderColor: "#F4F5F7" }]}>
                  <View style={[styles.weakIcon, { backgroundColor: "#FFF3E0" }]}><Icon name="Refresh" size={14} color="#E67E22" variant="Bold" /></View>
                  <Text style={[styles.weakText, { color: "#333333" }]} numberOfLines={1}>{q.title}</Text>
                  <Pressable onPress={() => onEnterChat("review")} style={({ pressed }) => [styles.weakBtn, { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", opacity: pressed ? 0.8 : 1 }]}><Text style={[styles.weakBtnText, { color: "#333333" }]}>Fix</Text></Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* quick starts — intent tiles */}
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Quick starts</Text>
          <View style={styles.tileGrid}>
            {QUICK_TILES.map((t) => (
              <Pressable key={t.intent} onPress={() => onEnterChat(t.intent)} style={({ pressed }) => [styles.tile, { backgroundColor: "#FDFBF7", borderColor: "#F4F5F7", opacity: pressed ? 0.9 : 1 }]}>
                <View style={[styles.tileIcon, { backgroundColor: `${t.color}14` }]}><Icon name={t.icon} size={18} color={t.color} variant="Bold" /></View>
                <Text style={styles.tileTitle}>{t.title}</Text>
                <Text style={styles.tileDesc}>{t.desc}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 13, fontFamily: fontFamilies.regular },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10, zIndex: 10 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  backText: { fontSize: 12, fontFamily: fontFamilies.semibold },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2ECC71" },
  topBarTitle: { fontSize: 13, fontFamily: fontFamilies.heavy },
  startOverBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  startOverText: { fontSize: 12, fontFamily: fontFamilies.semibold },
  stage: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingBottom: 12 },
  bubbleWrap: { alignItems: "center", width: "100%", maxWidth: 340, marginBottom: 18 },
  bubble: { borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 18, paddingVertical: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  bubbleText: { fontSize: 15, lineHeight: 22, fontFamily: fontFamilies.medium, textAlign: "center" },
  bubbleTail: { width: 16, height: 16, borderLeftWidth: 1.5, borderBottomWidth: 1.5, transform: [{ rotate: "-45deg" }], marginTop: -9 },
  bubbleTailInner: { width: 18, height: 10, marginTop: -10 },
  mascotWrap: { alignItems: "center", justifyContent: "center" },
  mascot: { width: 176, height: 176 },
  historyRowWrap: { marginTop: 14, maxWidth: "100%" },
  historyRow: { gap: 8, paddingHorizontal: 4 },
  historyChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, maxWidth: 160 },
  historyChipText: { fontSize: 12, fontFamily: fontFamilies.semibold },
  bottomSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 14, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 8 },
  chatBox: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 16, paddingTop: 12, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 8 },
  bottomBackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF8C00",
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E67E22",
    borderBottomWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomBackButtonText: { fontSize: 15, fontFamily: fontFamilies.heavy, color: "#FFFFFF" },
  // chat — fixed amber header (app design)
  chatHeaderContainer: { paddingHorizontal: 16, zIndex: 10 },
  chatHeaderBar: {
    backgroundColor: "#FFCA5F",
    borderRadius: 26,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  chatHeaderPlain: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 10, zIndex: 10 },
  chatHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  chatBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderBottomWidth: 2,
  },
  chatBackText: { fontSize: 12, fontFamily: fontFamilies.heavy, color: "#333333" },
  chatTitleCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  chatTitleText: { fontSize: 14, fontFamily: fontFamilies.heavy, color: "#724D06" },
  chatResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderBottomWidth: 2,
  },
  chatResetText: { fontSize: 12, fontFamily: fontFamilies.semibold, color: "#333333" },
  chatResetPlaceholder: { width: 72 },
  startOverLink: { paddingHorizontal: 8, paddingVertical: 8, justifyContent: "center" },
  startOverLinkText: { fontSize: 12, fontFamily: fontFamilies.medium, color: "#9CA3AF" },
  // center — mascot + overlay speech card (big & bold)
  mascotStage: { alignItems: "center", justifyContent: "center", width: "100%" },
  mascotWrapLarge: { alignItems: "center", justifyContent: "center" },
  mascotLarge: { width: 220, height: 220 },
  speechOverlayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderBottomWidth: 4,
    maxWidth: 340,
    width: "92%",
    alignSelf: "center",
    marginTop: -28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 2,
  },
  speechOverlayText: { fontSize: 20, fontFamily: fontFamilies.heavy, lineHeight: 26, color: "#333333", textAlign: "center" },
  chatHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 12 },
  bottomPillContainer: { alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingTop: 12 },
  roundedPillButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF8C00",
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E67E22",
    borderBottomWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 200,
    alignSelf: "center",
  },
  roundedPillText: { fontSize: 15, fontFamily: fontFamilies.heavy, color: "#FFFFFF" },
  sentenceHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, paddingHorizontal: 2 },
  sentencePrefix: { fontSize: 13, fontFamily: fontFamilies.semibold },
  blankLine: { flex: 1, height: 2, borderRadius: 1, maxWidth: 88, opacity: 0.9 },
  bottomHint: { fontSize: 12, fontFamily: fontFamilies.regular, marginBottom: 10 },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    width: "100%",
    minHeight: 52,
  },
  phrasePillInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, flex: 1 },
  phraseText: { fontSize: 14, fontFamily: fontFamilies.semibold },
  inlineBlank: { width: 46, height: 0, borderBottomWidth: 1.8, borderStyle: "dashed", marginLeft: 8, marginTop: 8, opacity: 0.9 },
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
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    width: "48%",
    minHeight: 50,
  },
  optionPillText: { fontSize: 14, fontFamily: fontFamilies.semibold },
  // landing — copied from profile/home page (amber outer + white section cards)
  landingScroll: { paddingHorizontal: 16, gap: 14, paddingBottom: 8 },
  heroCard: {
    backgroundColor: "#FFCA5F",
    borderRadius: 26,
    padding: 10,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  heroTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  heroEyebrow: { fontSize: 10, fontFamily: fontFamilies.heavy, color: "#724D06", letterSpacing: 0.8 },
  heroTitle: { fontSize: 22, fontFamily: fontFamilies.heavy, color: "#724D06", marginTop: 2 },
  heroSub: { fontSize: 12, fontFamily: fontFamilies.medium, color: "#7A4D00", marginTop: 4, lineHeight: 16 },
  heroMascot: { width: 84, height: 84 },
  heroBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderBottomWidth: 4,
  },
  heroBubbleText: { fontSize: 13, fontFamily: fontFamilies.medium, lineHeight: 18, color: "#333333" },
  heroCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 12, marginTop: 2 },
  heroCtaText: { fontSize: 14, fontFamily: fontFamilies.heavy },
  // home header — exact copy from app/(tabs)/index.tsx
  homeHeaderBar: {
    backgroundColor: "#FFCA5F",
    borderRadius: 26,
    padding: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 2,
  },
  homeHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  homeAvatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderBottomWidth: 4,
  },
  homeAvatar: { width: "100%", height: "100%", borderRadius: 23 },
  homeGreetingLabel: { fontSize: 11, fontFamily: fontFamilies.semibold, color: "#724D06", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 1 },
  homeGreetingName: { fontSize: 17, fontFamily: fontFamilies.heavy, color: "#724D06" },
  homeXpPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#434343", paddingHorizontal: 12, height: 40, borderRadius: 14 },
  homeXpText: { fontSize: 13, fontFamily: fontFamilies.heavy, color: "#FFFFFF" },
  headerStack: { gap: 0 },
  whiteBehindWrapper: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 16,
    paddingTop: 28,
    marginTop: -16,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 1,
  },
  shrodiCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderBottomWidth: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  shrodiTitle: { fontSize: 15, fontFamily: fontFamilies.heavy, color: "#333333" },
  shrodiOverview: { fontSize: 12, fontFamily: fontFamilies.regular, color: "#666666", lineHeight: 16 },
  shrodiAvatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF3E0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFE0B2",
    overflow: "hidden",
  },
  shrodiAvatar: { width: 56, height: 56 },
  nextCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 0,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  nextCardHeader: { flexDirection: "row", gap: 12 },
  nextIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  nextLabel: { fontSize: 10, fontFamily: fontFamilies.heavy, letterSpacing: 0.7, color: "#9CA3AF" },
  nextTitle: { fontSize: 15, fontFamily: fontFamilies.heavy, marginTop: 2, color: "#333333" },
  nextSub: { fontSize: 12, fontFamily: fontFamilies.regular, marginTop: 4, lineHeight: 16, color: "#888888" },
  nextActions: { flexDirection: "row", gap: 10 },
  nextPrimary: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  nextPrimaryText: { fontSize: 13, fontFamily: fontFamilies.heavy },
  nextSecondary: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, justifyContent: "center", borderColor: "#E5E7EB" },
  nextSecondaryText: { fontSize: 13, fontFamily: fontFamilies.semibold, color: "#333333" },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontFamily: fontFamilies.heavy, color: "#333333" },
  sectionMeta: { fontSize: 12, fontFamily: fontFamilies.semibold, color: "#888888" },
  linkText: { fontSize: 12, fontFamily: fontFamilies.heavy },
  weakRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  weakIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  weakText: { flex: 1, fontSize: 13, fontFamily: fontFamilies.medium },
  weakBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  weakBtnText: { fontSize: 12, fontFamily: fontFamilies.heavy },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "48%", borderRadius: 14, borderWidth: 1, padding: 12, gap: 6 },
  tileIcon: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tileTitle: { fontSize: 13, fontFamily: fontFamilies.heavy, color: "#333333" },
  tileDesc: { fontSize: 11, fontFamily: fontFamilies.regular, lineHeight: 14, color: "#888888" },
  guideCta3d: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF8C00",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#E67E22",
    borderBottomWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  guideCta3dText: { fontSize: 15, fontFamily: fontFamilies.heavy, color: "#FFFFFF" },
});
