/**
 * QuestsHeaderCard — the info card at the top of the Quests page: the sky (purple) colour on a
 * darker lip, white text on the left (what the page is, and how many quests are left) and the two
 * chests on the right, daily and weekly. A chest is the control: dimmed until enough quests of its
 * period are claimed (all daily, any 3 weekly), then normal and tappable (see `ChestCard`).
 */

import React, { useMemo } from "react";
import { View } from "react-native";

import { ChestCard } from "@/components/quests/ChestCard";
import { useTutorialTarget } from "@/components/tutorial/use-tutorial-target";
import { Text } from "@/components/ui/text";
import type { PeriodMissions } from "@/hooks/use-missions";
import type { MissionPeriod } from "@/services/missions-core";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";

/** Depth of the card's lip, the same as the Home lesson card. */
const CARD_LIP = 6;

const CHEST_SIZE = 64;

export interface QuestsHeaderCardProps {
  daily: PeriodMissions;
  weekly: PeriodMissions;
  /** Pays the chest of a period and returns the diamonds it paid. */
  onOpenChest: (period: MissionPeriod) => Promise<number> | number;
}

const questsLeft = (data: PeriodMissions) => Math.max(0, data.missions.length - data.completedCount);

export function QuestsHeaderCard({ daily, weekly, onOpenChest }: QuestsHeaderCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  // Shrodi's first visit lights the daily chest (docs/features/TUTORIAL_SPEC.md §5.4)
  const chestLit = useTutorialTarget("quests.chest.daily", { radius: 20 });

  const anyReady = daily.chest.status === "ready" || weekly.chest.status === "ready";
  const headline = anyReady ? "A chest is ready!" : "Open your chests";
  const hint = anyReady
    ? "Tap a chest to open it"
    : `${questsLeft(daily)} daily and ${questsLeft(weekly)} weekly quests to go`;

  const chests: { period: MissionPeriod; label: string; data: PeriodMissions }[] = [
    { period: "daily", label: "Daily", data: daily },
    { period: "weekly", label: "Weekly", data: weekly },
  ];

  return (
    <View style={styles.card}>
      <View pointerEvents="none" style={styles.lip} />
      <View style={styles.face}>
        <View style={styles.text}>
          <Text style={styles.headline} numberOfLines={2}>
            {headline}
          </Text>
          <Text style={styles.hint} numberOfLines={2}>
            {hint}
          </Text>
        </View>
        <View style={styles.chests}>
          {chests.map(({ period, label, data }) => (
            <View key={period} ref={period === "daily" ? chestLit.ref : undefined} collapsable={false} style={styles.chest}>
              <ChestCard
                period={period}
                status={data.chest.status}
                reward={data.chest.reward}
                size={CHEST_SIZE}
                onOpen={() => onOpenChest(period)}
              />
              <Text style={styles.chestLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    card: { paddingBottom: CARD_LIP },
    /* Its own layer, exactly where the face lands, so it only shows under the bottom edge */
    lip: {
      position: "absolute",
      top: CARD_LIP,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 20,
      backgroundColor: c.skyLip,
    },
    face: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingLeft: 16,
      paddingRight: 8,
      paddingVertical: 12,
      borderRadius: 20,
      backgroundColor: c.sky,
    },
    text: { flex: 1 },
    headline: {
      fontSize: 22,
      lineHeight: 28,
      ...fontFaces.heavy,
      color: c.onPrimary,
    },
    chests: { flexDirection: "row", alignItems: "center", gap: 4 },
    chest: { alignItems: "center", gap: 2 },
    chestLabel: {
      fontSize: 11,
      lineHeight: 14,
      ...fontFaces.heavy,
      color: withAlpha(c.onPrimary, 0.85),
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    hint: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 18,
      ...fontFaces.semibold,
      color: withAlpha(c.onPrimary, 0.9),
    },
  };
});
