import { PageHeader } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { useStorage } from '@/services/StorageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';

import {createStyles, useTheme, AchievementPalette, fontFaces, useResponsiveLayout, withAlpha} from "@/theme";

// Achievement thresholds - same as profile
export const ACHIEVEMENTS = [
  { 
    id: 1, 
    title: 'First Steps', 
    requirement: 'Complete 1 lesson', 
    threshold: 1, 
    field: 'lessons_completed', 
    icon: 'Award', 
    color: '#FFC800',
    description: 'Congratulations on taking your first step into the world of nuclear science! Complete your first lesson to unlock this achievement.',
    tips: ['Start with Lesson 1: Meet the Atom', 'Read through the content carefully', 'Complete the lesson to earn XP']
  },
  { 
    id: 2, 
    title: 'Myth Buster', 
    requirement: 'Bust 10 myths', 
    threshold: 10, 
    field: 'myths_busted', 
    icon: 'TickCircle', 
    color: AchievementPalette.green,
    description: 'You\'re becoming an expert at separating fact from fiction! Bust 10 myths in the Myth Buster game to earn this achievement.',
    tips: ['Play the Myth Buster game regularly', 'Read each myth carefully', 'Use your knowledge to identify false statements']
  },
  { 
    id: 3, 
    title: 'On Fire', 
    requirement: 'Reach a 7 day streak', 
    threshold: 7, 
    field: 'longest_streak', 
    icon: 'Flash', 
    color: '#EA580C',
    description: 'You\'re on fire! Reach a 7-day learning streak to show your dedication to mastering nuclear science.',
    tips: ['Log in daily to maintain your streak', 'Open the app once a day — that alone counts', 'Don\'t break the chain!']
  },
  { 
    id: 4, 
    title: 'XP Master', 
    requirement: 'Earn 1000 XP', 
    threshold: 1000, 
    field: 'total_xp', 
    icon: 'Star', 
    color: '#1CB0F6',
    description: 'A true master of learning! Accumulate 1000 experience points through lessons, quizzes, and activities.',
    tips: ['Complete lessons to earn XP', 'Take quizzes to boost your score', 'Participate in all activities']
  },
  { 
    id: 5, 
    title: 'Dedicated', 
    requirement: '30 day streak', 
    threshold: 30, 
    field: 'longest_streak', 
    icon: 'Crown', 
    color: '#FFD700',
    description: 'The ultimate dedication badge! Maintain a 30-day learning streak to prove your commitment to nuclear science education.',
    tips: ['Consistency is key', 'Set a daily reminder', 'Make learning a daily habit']
  },
];

export default function AchievementDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsiveLayout();
  const { theme } = useTheme();
  const accent = theme.palettes.achievements.primary;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { achievementId } = useLocalSearchParams<{ achievementId: string }>();
  const { userProfile } = useStorage();
  const reducedMotion = useReducedMotion();

  const achievement = useMemo(() => {
    const ach = ACHIEVEMENTS.find(a => a.id === parseInt(achievementId || '0'));
    if (!ach || !userProfile) return null;

    const currentValue = (userProfile as any)[ach.field] || 0;
    const locked = currentValue < ach.threshold;
    const progress = Math.min((currentValue / ach.threshold) * 100, 100);

    return {
      ...ach,
      locked,
      progress,
      currentValue
    };
  }, [achievementId, userProfile]);

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
        {/* Achievement Icon Card */}
        <Animated.View 
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(100).springify()}
          style={styles.iconCard}
        >
          <LinearGradient
            colors={(achievement.locked 
              ? [theme.colors.surfaceSoft, theme.colors.surfaceRaised]
              : [achievement.color + '30', achievement.color + '15']) as readonly [string, string]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCardGradient}
          >
            <View style={[
              styles.largeIconCircle,
              achievement.locked && styles.largeIconCircleLocked,
              { borderColor: achievement.color }
            ]}>
              {achievement.locked ? (
                <Icon 
                  name="Lock1" 
                  size={64} 
                  color={theme.colors.textFaint}
                  variant="Bold" 
                />
              ) : (
                <Icon 
                  name={achievement.icon as any} 
                  size={72} 
                  color={achievement.color} 
                  variant="Bold" 
                />
              )}
            </View>
            {!achievement.locked && (
              <View style={styles.largeBadge}>
                <Icon name="TickCircle" size={28} color={theme.colors.success} variant="Bold" />
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Achievement Info */}
        <Animated.View 
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(200).springify()}
          style={styles.infoCard}
        >
          <Text style={[
            styles.achievementTitle,
            achievement.locked && styles.achievementTitleLocked
          ]}>
            {achievement.title}
          </Text>
          <Text style={styles.achievementRequirement}>
            {achievement.requirement}
          </Text>
          <Text style={styles.achievementDescription}>
            {achievement.description}
          </Text>
        </Animated.View>

        {/* Progress Card */}
        <Animated.View 
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(300).springify()}
          style={styles.progressCard}
        >
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressPercentage}>
              {Math.round(achievement.progress)}%
            </Text>
          </View>
          
          <View style={styles.progressBarLarge}>
            <LinearGradient
              colors={(achievement.locked 
                ? [theme.colors.disabled, theme.colors.borderStrong]
                : [achievement.color, achievement.color + 'CC']) as readonly [string, string]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressFillLarge,
                { width: `${achievement.progress}%` }
              ]}
            />
          </View>
          
          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatLabel}>Current</Text>
              <Text style={[styles.progressStatValue, { color: achievement.color }]}>
                {achievement.currentValue}
              </Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressStat}>
              <Text style={styles.progressStatLabel}>Target</Text>
              <Text style={styles.progressStatValue}>
                {achievement.threshold}
              </Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressStat}>
              <Text style={styles.progressStatLabel}>Remaining</Text>
              <Text style={[styles.progressStatValue, { color: achievement.locked ? achievement.color : theme.colors.success }]}>
                {Math.max(0, achievement.threshold - achievement.currentValue)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Tips Card */}
        <Animated.View 
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(400).springify()}
          style={styles.tipsCard}
        >
          <View style={styles.tipsHeader}>
            <Icon name="InfoCircle" size={20} color={accent} variant="Bold" />
            <Text style={styles.tipsTitle}>How to Unlock</Text>
          </View>
          {achievement.tips.map((tip, index) => (
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
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  largeIconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  largeIconCircleLocked: {
    backgroundColor: theme.colors.disabled,
    borderColor: theme.colors.border,
  },
  largeBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: theme.colors.success,
    padding: 4,
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

