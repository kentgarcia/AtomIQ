/**
 * Developer admin controls: a small button beside the beta button on Home that opens a panel for
 * setting local state (streak, XP, diamonds, completed lessons, quests, feed, Atom Maze) so a tester
 * does not have to play to reach it.
 *
 * DEVELOPMENT ONLY. Home loads this file only inside `__DEV__`, which Metro folds away in a release
 * build, so it is not in the bundle.
 *
 * TO REMOVE: delete the `components/dev/` folder and the two lines in `app/(tabs)/index.tsx`
 * marked `dev-admin`.
 */

import React, { useCallback, useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";

import {
  completeNextNode,
  completeThroughUnit,
  finishDailyQuests,
  rebuildFeed,
  reconcileFeedNow,
  resetPath,
  resetQuests,
  resetStory,
  unlockAllStory,
} from "@/components/dev/dev-admin-actions";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Text } from "@/components/ui/text";
import { useDiamonds } from "@/hooks/use-wallet";
import { contentRepository } from "@/services/content-db";
import { emitStreak, reconcileFeedSoon } from "@/services/feed";
import { useStorage } from "@/services/StorageContext";
import { addDiamonds } from "@/services/wallet";
import { createStyles, fontFaces, useTheme } from "@/theme";

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    fab: {
      position: "absolute",
      left: 24,
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.card,
      borderWidth: 2,
      borderColor: c.border,
      borderBottomWidth: 4,
      zIndex: 95,
    },
    section: { gap: 8 },
    title: { fontSize: 14, ...fontFaces.heavy, color: c.text },
    value: { ...fontFaces.medium, color: c.textMuted },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    note: { fontSize: 13, ...fontFaces.medium, color: c.textMuted },
  };
});

export interface DevAdminFabProps {
  /** Distance from the bottom edge: the same as the beta button's. */
  bottom: number;
  /** Called after anything that changes progress, so the map reads it again. */
  onChanged?: () => void;
}

export function DevAdminFab({ bottom, onChanged }: DevAdminFabProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("Changes are local to this device.");
  const [busy, setBusy] = useState(false);
  const [unitCount, setUnitCount] = useState(0);
  const { userProfile, updateUserProfile, addXP } = useStorage();
  const diamonds = useDiamonds();

  useEffect(() => {
    if (!open) return;
    void contentRepository.getUnits().then((u) => setUnitCount(u.length)).catch(() => setUnitCount(0));
  }, [open]);

  /** Run one action, say what it did, and let the map read progress again. */
  const run = useCallback(
    async (what: string, task: () => Promise<string | void>) => {
      if (busy) return;
      setBusy(true);
      try {
        const detail = await task();
        setNote(detail ? `${what}: ${detail}` : what);
        onChanged?.();
        // Dev edits write progress directly (no lesson-complete event), so the feed reads it again, like chats do.
        void reconcileFeedSoon(true);
      } catch (error) {
        setNote(`${what} failed: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setBusy(false);
      }
    },
    [busy, onChanged],
  );

  const setStreak = (days: number) =>
    run(`Streak set to ${days}`, async () => {
      const n = Math.max(0, Math.round(days));
      await updateUserProfile({ current_streak: n, longest_streak: Math.max(n, userProfile?.longest_streak ?? 0) });
      if (n > 0) emitStreak(n); // posts when n is a milestone (3, 7, 14, 30, 60, 100)
    });

  const btn = (label: string, onPress: () => void) => <Button key={label} size="compact" variant="secondary" fullWidth={false} label={label} onPress={onPress} disabled={busy} />;

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { bottom }]}
        activeOpacity={0.85}
        hitSlop={4}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Open developer admin controls"
      >
        <Icon name="Setting2" size={20} color={theme.colors.text} variant="Bold" />
      </TouchableOpacity>

      <ModalDialog visible={open} onClose={() => setOpen(false)} title="Dev admin" closeLabel="Close developer admin">
        <View style={{ gap: 18 }}>
          <Text style={styles.note}>{note}</Text>

          <View style={styles.section}>
            <Text style={styles.title}>
              Streak <Text style={styles.value}>now {userProfile?.current_streak ?? 0}, best {userProfile?.longest_streak ?? 0}</Text>
            </Text>
            <View style={styles.row}>
              {btn("-1", () => void setStreak((userProfile?.current_streak ?? 0) - 1))}
              {btn("+1", () => void setStreak((userProfile?.current_streak ?? 0) + 1))}
              {[0, 3, 7, 14, 30].map((n) => btn(String(n), () => void setStreak(n)))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.title}>
              XP <Text style={styles.value}>{userProfile?.total_xp ?? 0}</Text>
            </Text>
            <View style={styles.row}>
              {[50, 250, 1000].map((n) => btn(`+${n}`, () => void run(`Added ${n} XP`, () => addXP(n))))}
              {btn("Reset", () => void run("XP reset", () => updateUserProfile({ total_xp: 0 })))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.title}>
              Diamonds <Text style={styles.value}>{diamonds}</Text>
            </Text>
            <View style={styles.row}>{[50, 500].map((n) => btn(`+${n}`, () => void run(`Added ${n} diamonds`, async () => void (await addDiamonds(n)))))}</View>
          </View>

          <View style={styles.section}>
            <Text style={styles.title}>Lessons</Text>
            <View style={styles.row}>
              {btn("Complete next", () => void run("Complete next", async () => ((await completeNextNode()) ?? "everything is already done")))}
              {Array.from({ length: unitCount }, (_, i) => btn(`Through unit ${i + 1}`, () => void run(`Completed through unit ${i + 1}`, async () => `${await completeThroughUnit(i + 1)} nodes`)))}
              {btn("Reset path", () => void run("Path reset", resetPath))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.title}>Quests</Text>
            <View style={styles.row}>
              {btn("Finish daily", () => void run("Daily quests counted as done", finishDailyQuests))}
              {btn("Reset quests", () => void run("Quests reset", resetQuests))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.title}>Feed</Text>
            <View style={styles.row}>
              {btn("Reconcile", () => void run("Feed reconciled", async () => `${await reconcileFeedNow()} new posts`))}
              {btn("Rebuild", () => void run("Feed rebuilt", async () => `${await rebuildFeed()} posts`))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.title}>Atom Maze</Text>
            <View style={styles.row}>
              {btn("Unlock all", () => void run("Story levels won", async () => `${await unlockAllStory()} levels`))}
              {btn("Reset", () => void run("Story progress reset", resetStory))}
            </View>
          </View>
        </View>
      </ModalDialog>
    </>
  );
}
