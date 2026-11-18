import { LipCard } from "@/components/community/BandCard";
import { DailyFactCard } from "@/components/facts/DailyFactCard";
import { FactStory } from "@/components/facts/FactStory";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useMissions } from "@/hooks/use-missions";
import { factDayLabel, listReadFacts, readCountLabel, recordFactRead, type ReadFactRow } from "@/services/daily-facts";
import { getDailyFact, getFactById, type DailyFact } from "@/services/missions";
import { impactLight } from "@/services/haptics";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Daily facts: today's "Did you know?" card (reading it completes the daily fact quest, once a day)
 * and the list of facts already read, newest first. Tapping a fact in the list reopens its story.
 * Opened from the Daily facts circle on Discover.
 */

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.mapBackground },
    content: { paddingTop: 16, gap: 20 },
    sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 4 },
    sectionTitle: { fontSize: 20, ...fontFaces.heavy, color: c.text },
    rows: { paddingVertical: 4 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingHorizontal: 16, paddingVertical: 10 },
    rowPressed: { opacity: 0.7 },
    divided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    rowCopy: { flex: 1, gap: 2 },
    rowTitle: { fontSize: 16, lineHeight: 22, ...fontFaces.heavy, color: c.text },
    rowDay: { fontSize: 14, ...fontFaces.medium, color: c.textMuted },
    empty: { fontSize: 15, lineHeight: 22, textAlign: "center", ...fontFaces.medium, color: c.textMuted, paddingVertical: 24, paddingHorizontal: 20 },
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

  const readToday = useCallback(async () => {
    impactLight();
    setTodayOpen(true);
    const fact = await getDailyFact();
    await recordFactRead(fact.id, fact.title);
    await reload();
    await markFactRead();
  }, [markFactRead, reload]);

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

  const frame = { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: gutter } as const;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Daily facts" subtitle={readCountLabel(read.length)} onBack={() => router.back()} scrolled={scrolled} />

      <ScrollView onScroll={onScroll} scrollEventThrottle={scrollEventThrottle} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, frame, { paddingBottom: insets.bottom + 32 }]}>
        <DailyFactCard claimed={claimed} reward={reward} open={todayOpen} onRead={() => void readToday()} onClose={() => setTodayOpen(false)} />

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Facts you have read
          </Text>
        </View>

        {read.length === 0 ? (
          <LipCard>
            <Text style={styles.empty}>Read today&apos;s fact and it will be saved here, so you can come back to it.</Text>
          </LipCard>
        ) : (
          <LipCard faceStyle={styles.rows}>
            {read.map((row, i) => (
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
                <Icon name="ArrowRight2" size={18} color={theme.colors.textMuted} variant="Bold" />
              </Pressable>
            ))}
          </LipCard>
        )}
      </ScrollView>

      <FactStory fact={oldFact} open={oldFact !== null} onClose={() => setOldFact(null)} />
    </View>
  );
}
