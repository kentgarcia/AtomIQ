/**
 * The top of Discover below the title (docs/features/NPC_FEED_SPEC.md §3), both scroll away with the feed:
 *   ShortcutsRow  four round shortcuts (AtomDex, Periodic table, Reacted, Blogs): a soft circle
 *                 inside a dashed ring, an icon and a small label.
 *   RanksBanner   a soft rounded panel with the learner's weekly rank and a trophy; opens Ranks.
 * They are labelled buttons, not posts.
 */

import { useRouter } from "expo-router";
import { memo } from "react";
import { Pressable, View } from "react-native";

import { RANKS_HREF, SHORTCUTS, rankBannerLines } from "@/components/feed/feed-ui-core";
import { pushHref } from "@/components/feed/navigate";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { WeeklyRanking } from "@/services/feed";
import { impactLight } from "@/services/haptics";
import { createStyles, fontFaces, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    row: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, paddingBottom: 20 },
    shortcut: { width: 76, alignItems: "center", gap: 8, minHeight: 48 },
    circle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: controls.border,
      borderStyle: "dashed",
      borderColor: c.borderStrong,
      backgroundColor: c.surfaceSoft,
    },
    circlePressed: { opacity: 0.7 },
    label: { fontSize: 12, lineHeight: 16, textAlign: "center", ...fontFaces.bold, color: c.textSecondary },
    banner: { flexDirection: "row", alignItems: "center", gap: 16, minHeight: 88, paddingVertical: 20, paddingHorizontal: 22, marginBottom: 6, borderRadius: 20, backgroundColor: c.surfaceSoft },
    bannerPressed: { opacity: 0.8 },
    copy: { flex: 1, gap: 4 },
    title: { fontSize: 19, lineHeight: 24, ...fontFaces.heavy, color: c.text },
    sub: { fontSize: 15, lineHeight: 21, ...fontFaces.medium, color: c.textMuted },
  };
});

export const ShortcutsRow = memo(function ShortcutsRow() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return (
    <View style={styles.row}>
      {SHORTCUTS.map((s) => (
        <Pressable
          key={s.key}
          style={styles.shortcut}
          accessibilityRole="button"
          accessibilityLabel={`${s.label}. Opens ${s.label}`}
          onPress={() => {
            impactLight();
            pushHref(router, s.href);
          }}
        >
          {({ pressed }) => (
            <>
              <View style={[styles.circle, pressed && styles.circlePressed]} accessible={false} importantForAccessibility="no-hide-descendants">
                <Icon name={s.icon} size={28} color={theme.colors.textSecondary} variant="Bold" />
              </View>
              <Text style={styles.label} numberOfLines={2}>
                {s.label}
              </Text>
            </>
          )}
        </Pressable>
      ))}
    </View>
  );
});

export const RanksBanner = memo(function RanksBanner({ ranking }: { ranking: WeeklyRanking | null }) {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  // The rival just above the learner: the one to pass
  const above = ranking && ranking.learnerRank > 1 ? (ranking.rows[ranking.learnerRank - 2]?.name ?? null) : null;
  const { title, sub } = ranking ? rankBannerLines(ranking.learnerRank, ranking.learner.xp, above) : { title: "Weekly ranking", sub: "See how you compare this week" };
  return (
    <Pressable
      style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}. Opens the weekly ranking`}
      onPress={() => {
        impactLight();
        pushHref(router, RANKS_HREF);
      }}
    >
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        <Icon name="Trophy" size={44} color={theme.colors.warning} variant="Bold" />
      </View>
    </Pressable>
  );
});
