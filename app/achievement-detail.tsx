import { AchievementBadge } from '@/components/achievements/AchievementBadge';
import { PageHeader } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { useAchievementValues } from '@/hooks/use-achievement-values';
import { achievementById, achievementValue, progressFor } from '@/services/achievements-core';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';

import {createStyles, useTheme, fontFaces, useResponsiveLayout, withAlpha} from "@/theme";

export default function AchievementDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsiveLayout();
  const { theme } = useTheme();
  const accent = theme.palettes.achievements.primary;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { achievementId } = useLocalSearchParams<{ achievementId: string }>();
  const values = useAchievementValues();
  const reducedMotion = useReducedMotion();

  const achievement = useMemo(() => {
    const track = achievementById(parseInt(achievementId || '0', 10));
    if (!track || !values) return null;
    return { track, progress: progressFor(track, achievementValue(track, values)) };
  }, [achievementId, values]);

  if (!achievement) {
    return (
      <View style={styles.container}>
        <PageHeader title="Achievement" onBack={() => router.back()} palette={theme.palettes.achievements} centered />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Achievement not found</Text>
        </View>
      </View>
    );
  }

  const { track, progress } = achievement;
  const goal = progress.next === null ? 'You reached the top level!' : track.requirement(progress.next);
  const levelText = progress.earned ? `Level ${progress.level} of ${progress.maxLevel}` : 'Not started yet';

  return (
    <View style={styles.container}>
      {/* Header */}
      <PageHeader title="Achievement" onBack={() => router.back()} palette={theme.palettes.achievements} centered />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Current badge */}
        <Animated.View 
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(100).springify()}
          style={styles.iconCard}
        >
          <LinearGradient
            colors={(progress.earned
              ? [withAlpha(accent, 0.19), withAlpha(accent, 0.08)]
              : [theme.colors.surfaceSoft, theme.colors.surfaceRaised]) as readonly [string, string]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCardGradient}
          >
            <AchievementBadge track={track} level={progress.badgeLevel} size={160} earned={progress.earned} />
            {progress.earned ? (
              <View style={styles.levelPill}>
                <Text style={styles.levelPillText}>Level {progress.level}</Text>
              </View>
            ) : null}
          </LinearGradient>
        </Animated.View>

        {/* Achievement Info */}
        <Animated.View 
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(200).springify()}
          style={styles.infoCard}
        >
          <Text style={[styles.achievementTitle, !progress.earned && styles.achievementTitleLocked]}>
            {track.title}
          </Text>
          <Text style={styles.achievementRequirement}>{levelText}</Text>
          <Text style={styles.achievementDescription}>{track.description}</Text>
        </Animated.View>

        {/* Progress Card */}
        <Animated.View 
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(300).springify()}
          style={styles.progressCard}
        >
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{progress.maxed ? 'Top level' : `Next: ${goal}`}</Text>
            <Text style={styles.progressPercentage}>{Math.round(progress.ratio * 100)}%</Text>
          </View>
          
          <View style={styles.progressBarLarge}>
            <LinearGradient
              colors={(progress.maxed
                ? [theme.colors.success, theme.colors.success]
                : [accent, withAlpha(accent, 0.8)]) as readonly [string, string]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFillLarge, { width: `${progress.ratio * 100}%` }]}
            />
          </View>
          
          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatLabel}>Current</Text>
              <Text style={[styles.progressStatValue, { color: accent }]}>
                {progress.value.toLocaleString()}
              </Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressStat}>
              <Text style={styles.progressStatLabel}>Next level</Text>
              <Text style={styles.progressStatValue}>
                {progress.next === null ? 'Max' : progress.next.toLocaleString()}
              </Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressStat}>
              <Text style={styles.progressStatLabel}>To go</Text>
              <Text style={[styles.progressStatValue, { color: progress.maxed ? theme.colors.success : accent }]}>
                {progress.next === null ? 0 : Math.max(0, progress.next - progress.value).toLocaleString()}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Every level */}
        <Animated.View
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(350).springify()}
          style={styles.levelsCard}
        >
          <Text style={styles.tipsTitle}>All levels</Text>
          <View style={styles.levelsGrid}>
            {track.tiers.map((threshold, index) => {
              const level = index + 1;
              const earned = progress.level >= level;
              return (
                <View
                  key={level}
                  style={styles.levelCell}
                  accessible
                  accessibilityLabel={`Level ${level}, ${track.requirement(threshold)}, ${earned ? 'earned' : 'locked'}`}
                >
                  <AchievementBadge track={track} level={level} size={64} earned={earned} />
                  <Text style={[styles.levelCellTitle, !earned && styles.levelCellLocked]}>Lv {level}</Text>
                  <Text style={styles.levelCellGoal}>{threshold.toLocaleString()}</Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Tips Card */}
        <Animated.View 
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(400).springify()}
          style={styles.tipsCard}
        >
          <View style={styles.tipsHeader}>
            <Icon name="InfoCircle" size={20} color={accent} variant="Bold" />
            <Text style={styles.tipsTitle}>How to rank up</Text>
          </View>
          {track.tips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <View style={styles.tipBullet}>
                <Text style={styles.tipBulletText}>{index + 1}</Text>
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const accent = theme.palettes.achievements.primary;
  return {
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: theme.colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    ...fontFaces.heavy,
    color: theme.colors.text,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    ...fontFaces.regular,
    color: theme.colors.textMuted,
  },
  content: {
    padding: 24,
    paddingTop: 0,
  },
  iconCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  iconCardGradient: {
    padding: 32,
    paddingBottom: 56,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  levelPill: {
    position: 'absolute',
    bottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  levelPillText: {
    fontSize: 13,
    ...fontFaces.heavy,
    color: theme.colors.text,
  },
  levelsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
    gap: 16,
  },
  levelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
  },
  levelCell: {
    width: '25%',
    alignItems: 'center',
    gap: 2,
  },
  levelCellTitle: {
    fontSize: 12,
    ...fontFaces.heavy,
    color: theme.colors.text,
  },
  levelCellLocked: {
    color: theme.colors.textFaint,
  },
  levelCellGoal: {
    fontSize: 11,
    ...fontFaces.semibold,
    color: theme.colors.textMuted,
  },
  infoCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  achievementTitle: {
    fontSize: 28,
    ...fontFaces.heavy,
    color: theme.colors.text,
    marginBottom: 8,
  },
  achievementTitleLocked: {
    color: theme.colors.textMuted,
  },
  achievementRequirement: {
    fontSize: 16,
    ...fontFaces.bold,
    color: accent,
    marginBottom: 16,
  },
  achievementDescription: {
    fontSize: 15,
    ...fontFaces.regular,
    color: theme.colors.textMuted,
    lineHeight: 24,
  },
  progressCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 16,
    ...fontFaces.bold,
    color: theme.colors.text,
  },
  progressPercentage: {
    fontSize: 20,
    ...fontFaces.heavy,
    color: accent,
  },
  progressBarLarge: {
    width: '100%',
    height: 16,
    backgroundColor: theme.colors.disabled,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFillLarge: {
    height: '100%',
    borderRadius: 8,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  progressStat: {
    alignItems: 'center',
    flex: 1,
  },
  progressStatLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    ...fontFaces.semibold,
    marginBottom: 4,
  },
  progressStatValue: {
    fontSize: 20,
    ...fontFaces.heavy,
    color: theme.colors.text,
  },
  progressDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  tipsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  tipsTitle: {
    fontSize: 18,
    ...fontFaces.heavy,
    color: theme.colors.text,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tipBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: withAlpha(accent, 0.13),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  tipBulletText: {
    fontSize: 14,
    ...fontFaces.heavy,
    color: accent,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
    ...fontFaces.medium,
  },
  };
});

