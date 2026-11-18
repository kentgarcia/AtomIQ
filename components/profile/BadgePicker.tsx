/**
 * BadgePicker — choose which badges the passport shows (up to `MAX_SHOWCASE`). Badges that are
 * not earned yet are dimmed and cannot be picked. The pick is numbered in the order it was made,
 * which is the order the passport shows them in. The caller owns saving.
 */

import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";

import { AchievementBadge } from "@/components/achievements/AchievementBadge";
import { ModalButton, ModalSecondaryButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import type { AchievementTrack, AchievementProgress } from "@/services/achievements-core";
import { impactLight } from "@/services/haptics";
import { createStyles, fontFaces, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";

import { MAX_SHOWCASE, toggleShowcase } from "./passport-core";

export interface PickableBadge {
  track: AchievementTrack;
  progress: AchievementProgress;
}

export function BadgePicker({
  visible,
  badges,
  selected,
  onSave,
  onClose,
}: {
  visible: boolean;
  badges: PickableBadge[];
  /** The ids shown on the passport now. */
  selected: number[];
  onSave: (ids: number[]) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [pick, setPick] = useState<number[]>(selected);

  // Start from what the passport shows each time it opens (reset while rendering, not in an effect)
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setPick(selected);
  }

  return (
    <ModalDialog
      visible={visible}
      onClose={onClose}
      title="Showcase badges"
      closeLabel="Close"
      footer={
        <>
          <ModalButton label="Save" onPress={() => onSave(pick)} />
          <ModalSecondaryButton label="Cancel" onPress={onClose} />
        </>
      }
    >
      <Text style={styles.sub}>
        Pick up to {MAX_SHOWCASE} for your passport · {pick.length}/{MAX_SHOWCASE}
      </Text>
      <View style={styles.grid}>
        {badges.map(({ track, progress }) => {
          const order = pick.indexOf(track.id);
          const on = order >= 0;
          const full = !on && pick.length >= MAX_SHOWCASE;
          const locked = !progress.earned;
          return (
            <Pressable
              key={track.id}
              disabled={locked}
              onPress={() => {
                impactLight();
                setPick((p) => toggleShowcase(p, track.id));
              }}
              style={[styles.cell, on && styles.cellOn, (locked || full) && styles.cellDim]}
              accessibilityRole="button"
              accessibilityLabel={`${track.title}, ${locked ? "not earned yet" : `level ${progress.level}`}${on ? `, shown, number ${order + 1}` : ""}`}
              accessibilityState={{ selected: on, disabled: locked }}
            >
              <AchievementBadge track={track} level={progress.badgeLevel} size={52} earned={progress.earned} />
              <Text style={styles.cellTitle} numberOfLines={2}>
                {track.title}
              </Text>
              {on ? (
                <View style={styles.order}>
                  <Text style={styles.orderText}>{order + 1}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </ModalDialog>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    sub: { fontSize: 13, ...fontFaces.semibold, color: c.textMuted, marginTop: -4 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    cell: {
      width: "31.5%",
      alignItems: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderRadius: 16,
      borderWidth: controls.border,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    cellOn: { borderColor: c.primaryBorder, backgroundColor: c.primarySurface },
    cellDim: { opacity: 0.5 },
    cellTitle: { fontSize: 10, ...fontFaces.bold, color: c.textSecondary, textAlign: "center" },
    order: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primary,
    },
    orderText: { fontSize: 11, ...fontFaces.heavy, color: c.onPrimary },
  };
});
