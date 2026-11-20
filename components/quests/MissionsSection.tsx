/**
 * MissionsSection — the quests of the Quests tab as compact rows (title and progress in a pale
 * pill, the action button beside it): the daily quests, a divider, then the weekly quests, each
 * list under its own heading with the time left until it resets. No tabs and no card around the
 * lists (the chests are in the page's info card). State comes from `useMissions` (owned by the screen).
 */

import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

import { QuestRow } from "@/components/quests/QuestRow";
import { useTutorialTarget } from "@/components/tutorial/use-tutorial-target";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { MissionView, PeriodMissions } from "@/hooks/use-missions";
import { notifySuccess } from "@/services/haptics";
import { timeUntilReset, type MissionPeriod } from "@/services/missions-core";
import { createStyles, fontFaces, useTheme } from "@/theme";

/** "5 HOURS" / "3 DAYS" until the period's quests start again; re-read every minute. */
function useResetLabel(period: MissionPeriod): string {
  const [label, setLabel] = useState(() => formatReset(period));
  useEffect(() => {
    const id = setInterval(() => setLabel(formatReset(period)), 60_000);
    return () => clearInterval(id);
  }, [period]);
  return label;
}

const formatReset = (period: MissionPeriod): string => {
  const { amount, unit } = timeUntilReset(period);
  return `${amount} ${unit}${amount === 1 ? "" : "S"}`;
};

export function MissionsSection({
  daily,
  weekly,
  onClaim,
}: {
  daily: PeriodMissions;
  weekly: PeriodMissions;
  onClaim: (mission: MissionView) => Promise<void> | void;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const claim = async (mission: MissionView) => {
    await onClaim(mission);
    notifySuccess();
  };

  /** The button beside a row. It is always there, so rows keep one height: grayed when nothing can be done. */
  const action = (mission: MissionView, busy: boolean, startClaim: () => void) => {
    const base = { fullWidth: false, style: styles.action } as const;
    if (mission.isClaimed)
      return (
        <Button {...base} label="Done" disabled onPress={() => undefined} />
      );
    if (mission.isComplete) {
      return (
        <Button
          {...base}
          label={`Claim +${mission.reward}`}
          disabled={busy}
          shine
          onPress={startClaim}
        />
      );
    }
    // Weekly quests are earned by playing and learning as usual: nothing to open from here
    if (mission.period === "daily" && mission.type === "mythbuster") {
      return (
        <Button
          {...base}
          label="Play"
          onPress={() => router.push("/mythbuster")}
        />
      );
    }
    if (mission.period === "daily" && mission.type === "fact") {
      return <Button {...base} label="Read" onPress={() => router.push("/daily-facts")} />;
    }
    if (mission.period === "weekly" && mission.type === "mythbuster") {
      return (
        <Button
          {...base}
          label="Play"
          onPress={() => router.push("/mythbuster")}
        />
      );
    }
    if (mission.type === "maze") {
      return <Button {...base} label="Play" onPress={() => router.push("/explorer/story")} />;
    }
    if (mission.type === "lesson") {
      return (
        <Button
          {...base}
          label="Learn"
          onPress={() => router.navigate("/(tabs)")}
        />
      );
    }
    return (
      <Button {...base} label="Claim" disabled onPress={() => undefined} />
    );
  };

  // ...and the first daily quest
  const rowLit = useTutorialTarget("quests.first-row", { radius: 16 });

  const section = (period: MissionPeriod, title: string, data: PeriodMissions) => (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <ResetTimer period={period} />
      </View>
      <View style={styles.list}>
        {data.missions.map((mission, i) => (
          <View key={mission.id} ref={period === "daily" && i === 0 ? rowLit.ref : undefined} collapsable={false}>
            <QuestRow mission={mission} onClaim={claim} renderAction={(busy, startClaim) => action(mission, busy, startClaim)} />
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {section("daily", "Daily quests", daily)}
      <View style={styles.divider} />
      {section("weekly", "Weekly quests", weekly)}
    </View>
  );
}

function ResetTimer({ period }: { period: MissionPeriod }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const label = useResetLabel(period);
  return (
    <View
      style={styles.timer}
      accessible
      accessibilityLabel={`Refreshes in ${label.toLowerCase()}`}
    >
      <Icon
        name="Clock"
        size={16}
        color={theme.colors.textMuted}
        variant="Bold"
      />
      <Text style={styles.timerText}>{label}</Text>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    /* Inset like the info card's inner padding, so titles and buttons line up with the card's content */
    root: { gap: 20, paddingHorizontal: 16 },
    section: { gap: 12 },
    sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    sectionTitle: { fontSize: 20, color: c.text, ...fontFaces.heavy },
    /* Between the daily and the weekly quests: the same thin dashed line as between settings rows */
    divider: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    timer: { flexDirection: "row", alignItems: "center", gap: 5 },
    timerText: { fontSize: 13, color: c.textMuted, ...fontFaces.heavy },
    list: { gap: 10 },
    /* One fixed width for every label (Claim +25, Done, Play, Learn), so the row never shifts */
    action: { width: 124, alignSelf: "center" },
  };
});
