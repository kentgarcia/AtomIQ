import { Icon } from '@/components/ui/icon';
import { useStorage } from '@/services/StorageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

// Orange theme to match the app
const THEME = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  border: '#E5E5E5',
  text: '#2D3436',
  textMuted: '#636E72',
  primary: '#FF6B00',
  primaryLight: '#FF8533',
  accent: '#1CB0F6',
  warning: '#FFC800',
  secondary: '#FF4B4B',
  green: '#2ECC71',
};

// Achievement thresholds - same as profile
const ACHIEVEMENTS = [
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
    color: THEME.green,
    description: 'You\'re becoming an expert at separating fact from fiction! Bust 10 myths in the Myth Buster game to earn this achievement.',
    tips: ['Play the Myth Buster game regularly', 'Read each myth carefully', 'Use your knowledge to identify false statements']
  },
  { 
    id: 3, 
    title: 'On Fire', 
    requirement: '7 day streak', 
    threshold: 7, 
    field: 'current_streak', 
    icon: 'Flash', 
    color: '#FF6B00',
    description: 'You\'re on fire! Maintain a 7-day learning streak to show your dedication to mastering nuclear science.',
    tips: ['Log in daily to maintain your streak', 'Complete at least one lesson or activity per day', 'Don\'t break the chain!']
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
  const { achievementId } = useLocalSearchParams<{ achievementId: string }>();
  const { userProfile } = useStorage();

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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="ArrowLeft2" size={24} color={THEME.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Achievement</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Achievement not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="ArrowLeft2" size={24} color={THEME.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Achievement Icon Card */}
        <Animated.View 
          entering={FadeInDown.delay(100).springify()}
          style={styles.iconCard}
        >
          <LinearGradient
            colors={achievement.locked 
              ? ['#F5F5F5', '#E8E8E8'] 
              : [achievement.color + '30', achievement.color + '15']
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
                  color="#999" 
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
                <Icon name="TickCircle" size={28} color={THEME.green} variant="Bold" />
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Achievement Info */}
        <Animated.View 
          entering={FadeInDown.delay(200).springify()}
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
          entering={FadeInDown.delay(300).springify()}
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
              colors={achievement.locked 
                ? ['#E0E0E0', '#D0D0D0'] 
                : [achievement.color, achievement.color + 'CC']
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
              <Text style={[styles.progressStatValue, { color: achievement.locked ? achievement.color : THEME.green }]}>
                {Math.max(0, achievement.threshold - achievement.currentValue)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Tips Card */}
        <Animated.View 
          entering={FadeInDown.delay(400).springify()}
          style={styles.tipsCard}
        >
          <View style={styles.tipsHeader}>
            <Icon name="InfoCircle" size={20} color={THEME.primary} variant="Bold" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: THEME.bg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: THEME.textMuted,
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
    borderColor: THEME.border,
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  largeIconCircleLocked: {
    backgroundColor: '#F5F5F5',
    borderColor: '#D0D0D0',
  },
  largeBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: THEME.green,
    padding: 4,
  },
  infoCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  achievementTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 8,
  },
  achievementTitleLocked: {
    color: THEME.textMuted,
  },
  achievementRequirement: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.primary,
    marginBottom: 16,
  },
  achievementDescription: {
    fontSize: 15,
    color: THEME.textMuted,
    lineHeight: 24,
  },
  progressCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.primary,
  },
  progressBarLarge: {
    width: '100%',
    height: 16,
    backgroundColor: '#E8E8E8',
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
    color: THEME.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  progressStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
  },
  progressDivider: {
    width: 1,
    height: 40,
    backgroundColor: THEME.border,
  },
  tipsCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
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
    backgroundColor: THEME.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  tipBulletText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.primary,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    color: THEME.text,
    lineHeight: 22,
    fontWeight: '500',
  },
});

