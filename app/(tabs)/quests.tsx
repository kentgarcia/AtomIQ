/**
 * Quests tab — an info card on top (sky colour, with the daily and weekly chests on its right), then
 * the daily quests, a divider and the weekly quests. No tabs.
 *
 * Same frame as the other tabs (plain page background, 3D cards). No section tabs: the page is
 * just the quests (the Daily | Weekly switch lives inside `MissionsSection`).
 */

import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";

import { ScreenHeader, useHeaderBorder, useTabBarInset } from "@/components/layout";
import { HeaderCurrency } from "@/components/quests/HeaderCurrency";
import { MissionsSection } from "@/components/quests/MissionsSection";
import { QuestsHeaderCard } from "@/components/quests/QuestsHeaderCard";
import { useMissions, type MissionView } from "@/hooks/use-missions";
import { createStyles, useResponsiveLayout, useTheme } from "@/theme";

export default function QuestsScreen() {
  const tabBarInset = useTabBarInset();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const { contentMaxWidth } = useResponsiveLayout();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { daily, weekly, claim, openPeriodChest, refresh: refreshMissions } = useMissions();

  const [refreshing, setRefreshing] = useState(false);

  // Progress is earned elsewhere (Myth Buster, the daily fact), so re-read on focus
  useFocusEffect(
    useCallback(() => {
      void refreshMissions();
    }, [refreshMissions]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshMissions();
    setRefreshing(false);
  }, [refreshMissions]);

  const claimMission = useCallback((mission: MissionView) => claim(mission), [claim]);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Quests" scrolled={scrolled} right={<HeaderCurrency />} />
      <ScrollView
        style={styles.scroll}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[
          styles.content,
          { maxWidth: contentMaxWidth, paddingBottom: tabBarInset + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={theme.colors.textMuted}
          />
        }
      >
        <View style={styles.stack}>
          <QuestsHeaderCard daily={daily} weekly={weekly} onOpenChest={openPeriodChest} />
          <MissionsSection daily={daily} weekly={weekly} onClaim={claimMission} />
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    root: { flex: 1, backgroundColor: c.mapBackground },
    scroll: { flex: 1 },
    stack: { gap: 18 },
    content: { width: "100%", alignSelf: "center", paddingHorizontal: 16, paddingTop: 16 },
  };
});
