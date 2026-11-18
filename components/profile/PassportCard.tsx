/**
 * PassportCard — the Profile tab's card, laid out as an explorer's passport on the app's 3D `Card`
 * (a border all round and a lip under it).
 *
 * Top: a full-width solid banner in the avatar's paint, with its pattern faint over it (both are
 * choices of the avatar, so they change when the avatar becomes customizable), with the learner standing centred on it in their
 * idle animation and the flip button at the top right.
 *
 * Front: one row with the name and rank on the left and the showcased badges on the right (tap
 * them to choose; tap the rank to open the title progress);
 * the level and XP with one progress bar under them. Tapping the avatar edits the profile
 * (Edit profile and Settings are buttons in the page header).
 *
 * Back (the circle on the banner flips to it): the stats as the same kind of rows, then the
 * perforated line and the barcode made from the passport number, centred. The numbers are in
 * `passport-core.ts`.
 */

import React, { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { Avatar } from "@/components/avatar/Avatar";
import { avatarBackground, normalizeAvatar } from "@/components/avatar/avatar-core";
import { PatternLayer } from "@/components/avatar/PatternLayer";
import { Text } from "@/components/ui/text";
import Animated, {
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AchievementBadge } from "@/components/achievements/AchievementBadge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { AchievementTrack } from "@/services/achievements-core";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";
import { DURATION } from "@/theme/motion";
import { controls } from "@/theme/tokens";

import { barcodeBars, barcodeWidth } from "./passport-core";

export interface PassportStat {
  label: string;
  value: number;
  icon: string;
  color: string;
}

export interface PassportBadge {
  track: AchievementTrack;
  /** 1-based badge level to draw. */
  level: number;
}

export interface PassportCardProps {
  name: string;
  title: string;
  level: number;
  xp: number;
  /** 0..1 progress through the current level. */
  levelProgress: number;
  streak: number;
  passportNo: string;
  /** The stored avatar value (`user_profile.avatar_url`). */
  avatar: string | null | undefined;
  /** The badges shown under the name (the caller picks the best earned ones). */
  badges: PassportBadge[];
  /** The stats page, on the back. */
  stats: PassportStat[];
  /** Whether the rank's progress panel (owned by the screen) is open. */
  titleOpen: boolean;
  onToggleTitle: () => void;
  /** Tapping the avatar. */
  onEdit: () => void;
  /** Tapping the badge strip: the screen opens its picker. */
  onPickBadges: () => void;
}

/** The avatar on the banner, and the banner's height: the figure stands on the banner's bottom edge. */
const HERO = 150;
const BADGE = 40;
/** How far each badge sits over the one before it, so three of them take little room. */
const BADGE_OVERLAP = 12;

/** A label on the left, its value on the right, like the rows of a profile card. */
function Row({
  label,
  icon,
  children,
  styles,
}: {
  label: string;
  /** An optional small round icon before the label (the stats page uses it). */
  icon?: React.ReactNode;
  children: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.row}>
      {icon}
      <Text style={icon ? styles.rowLabelFlex : styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={icon ? styles.rowValueEnd : styles.rowValue}>{children}</View>
    </View>
  );
}

export function PassportCard({
  name,
  title,
  level,
  xp,
  levelProgress,
  streak,
  passportNo,
  avatar,
  badges,
  stats,
  titleOpen,
  onToggleTitle,
  onEdit,
  onPickBadges,
}: PassportCardProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const c = theme.colors;
  const reducedMotion = useReducedMotion();

  const flipped = useSharedValue(0);
  const [isBack, setIsBack] = useState(false);
  const [frontHeight, setFrontHeight] = useState(0);
  const [backHeight, setBackHeight] = useState(0);

  const toggleFlip = useCallback(() => {
    const next = flipped.value === 1 ? 0 : 1;
    setIsBack(next === 1);
    flipped.value = withTiming(next, { duration: DURATION.flip });
  }, [flipped]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${flipped.value * (reducedMotion ? 0 : 180)}deg` }],
    // Opacity guard: backfaceVisibility alone is unreliable on Android
    opacity: flipped.value < 0.5 ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${-180 + flipped.value * (reducedMotion ? 0 : 180)}deg` }],
    opacity: flipped.value < 0.5 ? 0 : 1,
  }));
  const bodyHeightStyle = useAnimatedStyle(() => ({
    height: interpolate(flipped.value, [0, 1], [frontHeight || 300, backHeight || 300]),
  }));

  const look = useMemo(() => normalizeAvatar(avatar), [avatar]);
  const banner = avatarBackground(look);
  const bars = useMemo(() => barcodeBars(passportNo), [passportNo]);
  const barsWidth = barcodeWidth(bars);
  const percent = Math.round(Math.min(1, Math.max(0, levelProgress)) * 100);

  return (
    <Animated.View
      entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.springify()}
      style={styles.card}
      accessibilityLabel={`Explorer passport. ${name}, ${title}, level ${level}, ${xp} XP, ${streak} day streak.`}
    >
      <Card padding={0} faceStyle={styles.face}>
        <View style={[styles.banner, { backgroundColor: banner }]}>
          <PatternLayer pattern={look.pattern} tile={96} />
          <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit profile">
            <Avatar value={avatar} size={HERO} bare live />
          </Pressable>
          <Pressable
            style={[styles.bannerButton, styles.flipButton]}
            onPress={toggleFlip}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={isBack ? "Show passport" : "Show stats"}
          >
            <Icon name={isBack ? "UserSquare" : "ChartSquare"} size={20} color={c.text} variant="Bold" />
          </Pressable>
        </View>

        <Animated.View style={bodyHeightStyle}>
          {/* Front: the passport page */}
          <Animated.View
            pointerEvents={isBack ? "none" : "auto"}
            onLayout={(e) => setFrontHeight(e.nativeEvent.layout.height)}
            style={[styles.page, frontStyle]}
          >
            <View style={styles.identity}>
              <View style={styles.identityText}>
                <Text style={styles.name} numberOfLines={1}>
                  {name}
                </Text>
                <Pressable
                  onPress={onToggleTitle}
                  hitSlop={6}
                  style={styles.rankRow}
                  accessibilityRole="button"
                  accessibilityLabel={titleOpen ? "Hide rank progress" : "Show rank progress"}
                  accessibilityState={{ expanded: titleOpen }}
                >
                  <Text style={styles.rank} numberOfLines={1}>
                    {title}
                  </Text>
                </Pressable>
              </View>
              <Pressable
                onPress={onPickBadges}
                hitSlop={6}
                style={styles.badgeStrip}
                accessibilityRole="button"
                accessibilityLabel={badges.length ? "Choose which badges to show on your profile" : "Choose badges to show on your profile"}
              >
                {badges.length === 0 ? (
                  <Text style={styles.noBadges}>Choose badges</Text>
                ) : (
                  <View style={styles.badges}>
                    {badges.map((b, i) => (
                      <View key={b.track.id} style={i > 0 ? styles.badgeOverlap : undefined}>
                        <AchievementBadge track={b.track} level={b.level} size={BADGE} />
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            </View>

            <View style={styles.rule} />

            {/* Level and XP in one: the level on the left, the XP on the right, one bar under them */}
            <View style={styles.levelBlock}>
              <View style={styles.levelHead}>
                <Text style={styles.levelLabel}>Level {level}</Text>
                <Text style={styles.value}>{xp.toLocaleString()} XP</Text>
              </View>
              <View
                style={styles.track}
                accessibilityRole="progressbar"
                accessibilityLabel="Progress to the next level"
                accessibilityValue={{ min: 0, max: 100, now: percent }}
              >
                <View style={[styles.fill, { width: `${percent}%` }]} />
              </View>
            </View>
          </Animated.View>

          {/* Back: the stats, then the barcode and stamp */}
          <Animated.View
            pointerEvents={isBack ? "auto" : "none"}
            onLayout={(e) => setBackHeight(e.nativeEvent.layout.height)}
            style={[styles.page, backStyle]}
          >
            <View style={styles.rows}>
              {stats.map((stat) => (
                <Row
                  key={stat.label}
                  label={stat.label}
                  styles={styles}
                  icon={
                    <View style={[styles.statIcon, { backgroundColor: withAlpha(stat.color, 0.12) }]}>
                      <Icon name={stat.icon} size={16} color={stat.color} variant="Bold" />
                    </View>
                  }
                >
                  <Text style={styles.value}>{stat.value.toLocaleString()}</Text>
                </Row>
              ))}
            </View>

            <View style={styles.perforation} />

            <View style={styles.footer}>
              <View style={styles.barcodeCol}>
                <View style={[styles.barcode, { width: barsWidth }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  {bars.map((bar, i) => (
                    <View key={i} style={{ width: bar.width, marginRight: bar.gap, backgroundColor: c.text }} />
                  ))}
                </View>
                <Text style={styles.barcodeText}>{passportNo.replace("-", " ")}</Text>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Card>
    </Animated.View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    card: { marginHorizontal: 20 },
    /* The Card's face clips the banner to its rounded corners */
    face: { overflow: "hidden" },
    /* Full-width solid colour; the figure stands on its bottom edge, cut flat at the shoulders */
    banner: { height: HERO, alignItems: "center", justifyContent: "flex-end" },
    /* Round buttons in the banner's top corners */
    bannerButton: {
      position: "absolute",
      top: 12,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    flipButton: { right: 12, backgroundColor: c.card, borderWidth: controls.border, borderColor: c.border },

    page: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      padding: 16,
      gap: 14,
      backfaceVisibility: "hidden",
    },
    /* One row: the name and rank on the left, the badges on the right */
    identity: { flexDirection: "row", alignItems: "center", gap: 12 },
    identityText: { flex: 1, gap: 2 },

    name: { fontSize: 20, ...fontFaces.heavy, color: c.text },
    rankRow: { alignSelf: "flex-start" },
    rank: { fontSize: 13, ...fontFaces.bold, color: c.textMuted },
    /* The showcased badges, no container; tapping them opens the picker */
    badgeStrip: { flexShrink: 0, justifyContent: "center" },
    badges: { flexDirection: "row", alignItems: "center" },
    badgeOverlap: { marginLeft: -BADGE_OVERLAP },
    noBadges: { fontSize: 12, ...fontFaces.bold, color: c.textMuted },

    rule: { height: 1, backgroundColor: c.borderSubtle },

    rows: { gap: 12 },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    rowLabel: { width: 96, fontSize: 13, ...fontFaces.semibold, color: c.textMuted },
    rowLabelFlex: { flex: 1, fontSize: 13, ...fontFaces.semibold, color: c.textMuted },
    rowValue: { flex: 1 },
    rowValueEnd: { alignItems: "flex-end" },
    value: { fontSize: 15, ...fontFaces.heavy, color: c.text },
    statIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },

    /* The level bar: a plain track and a fill */
    levelBlock: { gap: 8 },
    levelHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    levelLabel: { fontSize: 15, ...fontFaces.heavy, color: c.text },
    track: { height: 12, borderRadius: 6, overflow: "hidden", backgroundColor: c.surfaceSoft },
    fill: { height: "100%", borderRadius: 6, backgroundColor: c.primary },

    perforation: {
      borderTopWidth: 2,
      borderStyle: "dashed",
      borderColor: c.border,
      marginHorizontal: -4,
    },

    footer: { alignItems: "center" },
    barcodeCol: { alignItems: "center", gap: 4, maxWidth: "100%" },
    barcode: { height: 46, flexDirection: "row", overflow: "hidden", maxWidth: "100%" },
    barcodeText: {
      fontSize: 10,
      letterSpacing: 2,
      ...fontFaces.bold,
      color: c.textMuted,
      fontVariant: ["tabular-nums"],
    },

  };
});
