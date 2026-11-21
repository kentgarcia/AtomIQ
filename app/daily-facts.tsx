import { emitClaimFlight } from "@/components/quests/claim-fx-bus";
import { CLAIM_AT, SKIP_FILL } from "@/components/quests/claim-fx-core";
import { DailyFactCard } from "@/components/facts/DailyFactCard";
import { FactStory } from "@/components/facts/FactStory";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useMissions } from "@/hooks/use-missions";
import { factDayLabel, listReadFacts, readCountLabel, recordFactRead, type ReadFactRow } from "@/services/daily-facts";
import { getDailyFact, getFactById, type DailyFact } from "@/services/missions";
import { impactLight } from "@/services/haptics";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Daily facts: today's "Did you know?" card (reading it completes the daily fact quest, once a day)
 * and the list of facts already read, newest first. Tapping a fact in the list reopens its story.
 * Opened from the Daily facts circle on Discover.
 */

/** The icon colour of the "Facts you have read" section. */
const BOOK_BLUE = "#3B82F6";

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.mapBackground },
    content: { paddingTop: 16, gap: 28 },
    sectionHead: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 40, marginBottom: 4 },
    sectionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(BOOK_BLUE, 0.14) },
    sectionTitle: { flex: 1, fontSize: 20, ...fontFaces.heavy, color: c.text },
    row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingVertical: 10 },
    rowPressed: { opacity: 0.6 },
    divided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    rowCopy: { flex: 1, gap: 2 },
    rowTitle: { fontSize: 16, lineHeight: 22, ...fontFaces.heavy, color: c.text },
    rowDay: { fontSize: 14, ...fontFaces.medium, color: c.textMuted },
    arrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" },
    empty: { fontSize: 15, lineHeight: 22, ...fontFaces.medium, color: c.textMuted, paddingVertical: 8 },
  };
});

export default function DailyFactsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const { daily, markFactRead, refresh: refreshMissions } = useMissions();

  const factMission = daily.missions.find((m) => m.type === "fact");
  const claimed = factMission?.isClaimed ?? false;
  const reward = factMission?.reward ?? 0;

  const [read, setRead] = useState<ReadFactRow[]>([]);
  const [todayOpen, setTodayOpen] = useState(false);
  const [oldFact, setOldFact] = useState<DailyFact | null>(null);

  const reload = useCallback(async () => {
    setRead(await listReadFacts());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        await refreshMissions();
        await reload();
      })();
    }, [refreshMissions, reload]),
  );

  // A fact claimed before this list existed still belongs in it
  React.useEffect(() => {
    if (!claimed) return;
    void getDailyFact().then(async (f) => {
      if (await recordFactRead(f.id, f.title)) await reload();
    });
  }, [claimed, reload]);

  // Reading the fact is saved at once; its XP is claimed when the learner says "Got it": the coins fly from the button to the
  // counter and the XP is paid as the first one lands (the same beat as a quest claim, `CLAIM_AT`). Leaving the screen in
  // between pays it at once, so it is never lost, and a second "Got it" while the coins fly is ignored.
  const reducedMotion = useReducedMotion();
  const markRef = useRef(markFactRead);
  useEffect(() => {
    markRef.current = markFactRead;
  }, [markFactRead]);
  const claimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const payNow = useCallback(() => {
    if (claimTimer.current) clearTimeout(claimTimer.current);
    claimTimer.current = null;
    void markRef.current();
  }, []);
  useEffect(
    () => () => {
      if (claimTimer.current) payNow();
    },
    [payNow],
  );

  const readToday = useCallback(async () => {
    impactLight();
    setTodayOpen(true);
    const fact = await getDailyFact();
    await recordFactRead(fact.id, fact.title);
    await reload();
  }, [reload]);

  const closeToday = useCallback(
    (origin?: { x: number; y: number }) => {
      setTodayOpen(false);
      if (claimed || claimTimer.current) return;
      if (!origin || reducedMotion) {
        void markRef.current();
        return;
      }
      emitClaimFlight(origin, { kind: "xp", skipFill: true });
      claimTimer.current = setTimeout(payNow, CLAIM_AT - SKIP_FILL);
    },
    [claimed, reducedMotion, payNow],
  );

  const openOld = useCallback(async (row: ReadFactRow) => {
    impactLight();
    const fact = await getFactById(row.factId);
    setOldFact(
      fact ?? {
        id: row.factId,
        kind: "myth",
        title: row.title,
        statement: row.title,
        short: "This fact is no longer in the app.",
        explanation: "",
      },
    );
  }, []);

  const frame = { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: gutter + 4 } as const;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Daily facts" subtitle={readCountLabel(read.length)} onBack={() => router.back()} scrolled={scrolled} />

      <ScrollView onScroll={onScroll} scrollEventThrottle={scrollEventThrottle} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, frame, { paddingBottom: insets.bottom + 32 }]}>
        <DailyFactCard claimed={claimed} reward={reward} open={todayOpen} onRead={() => void readToday()} onClose={closeToday} />

        <View>
          <View style={styles.sectionHead}>
            <View style={styles.sectionIcon}>
              <Icon name="Book" size={20} color={BOOK_BLUE} variant="Bold" />
            </View>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              Facts you have read
            </Text>
          </View>

          {read.length === 0 ? (
            <Text style={styles.empty}>Read today&apos;s fact and it will be saved here, so you can come back to it.</Text>
          ) : (
            read.map((row, i) => (
              <Pressable
                key={row.factId}
                style={({ pressed }) => [styles.row, i > 0 && styles.divided, pressed && styles.rowPressed]}
                accessibilityRole="button"
                accessibilityLabel={`${row.title}, read ${factDayLabel(row.readOn)}. Opens the fact`}
                onPress={() => void openOld(row)}
              >
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {row.title}
                  </Text>
                  <Text style={styles.rowDay}>Read {factDayLabel(row.readOn)}</Text>
                </View>
                <View style={styles.arrow}>
                  <Icon name="ArrowRight2" size={16} color={theme.colors.onPrimary} variant="Bold" />
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      <FactStory fact={oldFact} open={oldFact !== null} onClose={() => setOldFact(null)} />
    </View>
  );
}
