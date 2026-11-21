/**
 * Quests tab — an info card on top (sky colour, with the daily and weekly chests on its right), then
 * the daily quests, a divider and the weekly quests. No tabs.
 *
 * Same frame as the other tabs (plain page background, 3D cards). No section tabs: the page is
 * just the quests (the Daily | Weekly switch lives inside `MissionsSection`).
 */

import { useRenderTimer } from "@/components/dev/render-timer";
import { useSfxSet } from "@/components/motion/use-sfx-set";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { usePullRefresh } from "@/hooks/use-pull-refresh";

import { ScreenHeader, useHeaderBorder, useTabBarInset } from "@/components/layout";
import { HeaderCurrency } from "@/components/quests/HeaderCurrency";
import { MissionsSection } from "@/components/quests/MissionsSection";
import { QuestsHeaderCard } from "@/components/quests/QuestsHeaderCard";
import { useMissions, type MissionView } from "@/hooks/use-missions";
import { refreshOnFocus } from "@/services/missions-core";
import { createStyles, useResponsiveLayout, useTheme } from "@/theme";

export default function QuestsScreen() {
  useRenderTimer("/quests");
  useSfxSet("quests");
  const tabBarInset = useTabBarInset();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const { contentMaxWidth } = useResponsiveLayout();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { loading, daily, weekly, claim, openPeriodChest, refresh: refreshMissions } = useMissions();

  // Progress is earned elsewhere (Myth Buster, the daily fact), so re-read on focus. The hook reads once as it mounts, so a first focus that
  // finds that read still going does not start a second one (`refreshOnFocus`); every later focus reads as before.
  const loadingRef = useRef(loading);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      const first = firstFocus.current;
      firstFocus.current = false;
      if (refreshOnFocus(first, loadingRef.current)) void refreshMissions();
    }, [refreshMissions]),
  );

  const { refreshing, onRefresh, spinner } = usePullRefresh(refreshMissions);

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...spinner} />
        }
      >
        {/* Not drawn until the counters have been read (a few ms): drawn first with nothing, every row and chest was built twice and the
            bars animated up from empty. `loading` is true only for that first read; a later refresh never blanks the page. */}
        {loading ? null : (
          <View style={styles.stack}>
            <QuestsHeaderCard daily={daily} weekly={weekly} onOpenChest={openPeriodChest} />
            <MissionsSection daily={daily} weekly={weekly} onClaim={claimMission} />
          </View>
        )}
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
