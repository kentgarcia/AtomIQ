import { Icon } from '@/components/ui/icon';
import { useStorage } from '@/services/StorageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

// Orange theme to match the app
const THEME = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  border: '#E5E5E5',
  text: '#2D3436',
  textMuted: '#636E72',
  primary: '#EA580C',
  primaryLight: '#F97316',
  accent: '#1CB0F6',
  warning: '#FFC800',
  secondary: '#FF4B4B',
  chartBg: '#FAFAFA',
  green: '#2ECC71',
};

// Achievement thresholds
const ACHIEVEMENTS = [
  { id: 1, title: 'First Steps', requirement: 'Complete 1 lesson', threshold: 1, field: 'lessons_completed', icon: 'Award', color: '#FFC800' },
  { id: 2, title: 'Myth Buster', requirement: 'Bust 10 myths', threshold: 10, field: 'myths_busted', icon: 'TickCircle', color: THEME.green },
  { id: 3, title: 'On Fire', requirement: '7 day streak', threshold: 7, field: 'current_streak', icon: 'Flash', color: '#EA580C' },
  { id: 4, title: 'XP Master', requirement: 'Earn 1000 XP', threshold: 1000, field: 'total_xp', icon: 'Star', color: '#1CB0F6' },
  { id: 5, title: 'Dedicated', requirement: '30 day streak', threshold: 30, field: 'longest_streak', icon: 'Crown', color: '#FFD700' },
];

export default function ProfileScreen() {
  const { userProfile } = useStorage();

  // Calculate stats
  const stats = useMemo(() => {
    if (!userProfile) return [];
    
    const lessonsCompleted = userProfile.lessons_completed || 0;
    const mythsBusted = userProfile.myths_busted || 0;
    const accuracy = lessonsCompleted > 0 ? Math.round((mythsBusted / (lessonsCompleted * 2)) * 100) : 0;
    
    return [
      { id: 1, label: 'Current Streak', value: userProfile.current_streak.toString(), unit: 'Days', icon: 'Flash', color: '#FF9600' },
      { id: 2, label: 'Myths Busted', value: mythsBusted.toString(), unit: 'Total', icon: 'TickCircle', color: THEME.green },
      { id: 3, label: 'Total XP', value: userProfile.total_xp.toLocaleString(), unit: 'Points', icon: 'Star', color: '#1CB0F6' },
      { id: 4, label: 'Lessons Done', value: lessonsCompleted.toString(), unit: 'Completed', icon: 'Book', color: THEME.primary },
    ];
  }, [userProfile]);

  // Calculate achievements
  const achievements = useMemo(() => {
    if (!userProfile) return ACHIEVEMENTS.map(a => ({ ...a, locked: true, progress: 0, currentValue: 0 }));
    
    return ACHIEVEMENTS.map((achievement) => {
      const currentValue = (userProfile as any)[achievement.field] || 0;
      const locked = currentValue < achievement.threshold;
      const progress = Math.min((currentValue / achievement.threshold) * 100, 100);
      
      return {
        ...achievement,
        locked,
        progress,
        currentValue
      };
    });
  }, [userProfile]);

  // Calculate user level
  const userLevel = useMemo(() => {
    if (!userProfile) return 1;
    return Math.floor(userProfile.total_xp / 100) + 1;
  }, [userProfile]);

  const joinDate = useMemo(() => {
    const date = new Date();
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, []);

  if (!userProfile) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: THEME.textMuted }}>Loading profile...</Text>
      </View>
    );
  }

  const router = useRouter();
  
  // Animated values for creative effects
  const glowAnimation = useSharedValue(0);
  const floatAnimation = useSharedValue(0);
  
  useEffect(() => {
    glowAnimation.value = withRepeat(withTiming(1, { duration: 2000 }), -1, true);
    floatAnimation.value = withRepeat(withTiming(1, { duration: 3000 }), -1, true);
  }, []);
  
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowAnimation.value, [0, 1], [0.3, 0.8]),
  }));
  
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(floatAnimation.value, [0, 1], [0, -8]) }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
          >
            <Icon name="Setting" size={24} color={THEME.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Enhanced Profile Card with Gradient Background */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.profileCardWrapper}>
          <LinearGradient
            colors={[THEME.primary, THEME.primaryLight, '#FFA726']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientCard}
          >
            {/* Decorative Elements */}
            <Animated.View style={[styles.decorativeCircle, styles.decorativeCircle1, glowStyle]} />
            <Animated.View style={[styles.decorativeCircle, styles.decorativeCircle2, glowStyle]} />
            <Animated.View style={[styles.decorativeCircle, styles.decorativeCircle3, glowStyle]} />
            
            {/* Avatar with Glow Effect */}
            <Animated.View style={[styles.avatarContainer, floatStyle]}>
              <View style={styles.avatarGlow}>
                <View style={styles.avatarWrapper}>
                  <Image 
                    source={require('@/assets/images/mascot/profile.png')} 
                    style={styles.avatarImage} 
                    resizeMode="contain"
                  />
                </View>
              </View>
              {/* Level Badge */}
              <View style={styles.levelBadge}>
                <Icon name="Crown" size={16} color="#FFD700" variant="Bold" />
                <Text style={styles.levelText}>{userLevel}</Text>
              </View>
            </Animated.View>
            
            {/* User Info */}
            <Text style={styles.userName}>{userProfile.username}</Text>
            <Text style={styles.userTitle}>Nuclear Learner</Text>
            
            {/* XP Progress with Gradient */}
            <View style={styles.xpSection}>
              <View style={styles.xpHeader}>
                <Text style={styles.xpLabel}>Experience Points</Text>
                <Text style={styles.xpValue}>{userProfile.total_xp.toLocaleString()} XP</Text>
              </View>
              <View style={styles.xpProgressBar}>
                <LinearGradient
                  colors={['#FFD700', '#FFA000']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.xpProgressFill, { width: `${(userProfile.total_xp % 100)}%` }]}
                />
              </View>
              <Text style={styles.xpNextLevel}>{100 - (userProfile.total_xp % 100)} XP to Level {userLevel + 1}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Vitals Section */}
        <Text style={styles.sectionTitle}>Vitals</Text>
        
        {/* Enhanced Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <Animated.View 
              key={stat.id}
              entering={FadeInDown.delay(200 + index * 50).springify()}
              style={styles.statBoxWrapper}
            >
              <LinearGradient
                colors={[stat.color + '15', stat.color + '05']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.statBox, { borderColor: stat.color }]}
              >
                <View style={[styles.statIconCircle, { backgroundColor: stat.color }]}>
                  <Icon name={stat.icon as any} size={20} color="#FFF" variant="Bold" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statBoxValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={styles.statBoxLabel}>{stat.label}</Text>
                </View>
                {/* Decorative corner accent */}
                <View style={[styles.statCornerAccent, { backgroundColor: stat.color }]} />
              </LinearGradient>
            </Animated.View>
          ))}
        </View>

        {/* Achievements Section */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Achievements</Text>
        <View style={styles.achievementsGrid}>
          {achievements.map((achievement, index) => (
            <TouchableOpacity
              key={achievement.id}
              onPress={() => router.push(`/achievement-detail?achievementId=${achievement.id}`)}
              activeOpacity={0.7}
            >
              <Animated.View 
                entering={FadeInDown.delay(400 + index * 50).springify()}
                style={[styles.achievementCard, achievement.locked && styles.achievementCardLocked]}
              >
                <LinearGradient
                  colors={achievement.locked 
                    ? ['#F5F5F5', '#E8E8E8'] 
                    : [achievement.color + '20', achievement.color + '10']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.achievementCardGradient}
                >
                  {/* Icon Section */}
                  <View style={styles.achievementIconSection}>
                    <View style={[
                      styles.achievementIconCircle,
                      achievement.locked && styles.achievementIconCircleLocked,
                      { borderColor: achievement.color }
                    ]}>
                      {achievement.locked ? (
                        <Icon 
                          name="Lock1" 
                          size={32} 
                          color="#999" 
                          variant="Bold" 
                        />
                      ) : (
                        <Icon 
                          name={achievement.icon as any} 
                          size={36} 
                          color={achievement.color} 
                          variant="Bold" 
                        />
                      )}
                    </View>
                    {!achievement.locked && (
                      <View style={styles.achievementBadge}>
                        <Icon name="TickCircle" size={18} color={THEME.green} variant="Bold" />
                      </View>
                    )}
                  </View>

                  {/* Content Section */}
                  <View style={styles.achievementContent}>
                    <Text style={[
                      styles.achievementCardTitle,
                      achievement.locked && styles.achievementCardTitleLocked
                    ]}>
                      {achievement.title}
                    </Text>
                    <Text style={styles.achievementCardDescription}>
                      {achievement.requirement}
                    </Text>
                    
                    {/* Progress Section */}
                    <View style={styles.achievementProgressSection}>
                      <View style={styles.achievementProgressBar}>
                        <LinearGradient
                          colors={achievement.locked 
                            ? ['#E0E0E0', '#D0D0D0'] 
                            : [achievement.color, achievement.color + 'CC']
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.achievementProgressFill,
                            { width: `${achievement.progress}%` }
                          ]}
                        />
                      </View>
                      <Text style={styles.achievementProgressText}>
                        {achievement.currentValue} / {achievement.threshold}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.text,
  },
  settingsButton: {
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  profileCardWrapper: {
    marginBottom: 32,
  },
  gradientCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1000,
  },
  decorativeCircle1: {
    width: 150,
    height: 150,
    top: -50,
    right: -30,
  },
  decorativeCircle2: {
    width: 100,
    height: 100,
    bottom: -20,
    left: -20,
  },
  decorativeCircle3: {
    width: 60,
    height: 60,
    top: 40,
    left: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatarGlow: {
    padding: 6,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.text,
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  userTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 24,
  },
  xpSection: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  xpLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
  },
  xpValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  xpProgressBar: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  xpProgressFill: {
    height: '100%',
    borderRadius: 6,
  },
  xpNextLevel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBoxWrapper: {
    width: '48%',
  },
  statBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    height: 110,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statCornerAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    opacity: 0.1,
    transform: [{ rotate: '45deg' }, { translateX: 15 }, { translateY: -15 }],
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  statBoxLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },
  statBoxUnit: {
    fontSize: 10,
    color: THEME.textMuted,
    marginTop: 2,
  },
  achievementsGrid: {
    gap: 16,
  },
  achievementCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: THEME.border,
  },
  achievementCardLocked: {
    borderColor: '#E0E0E0',
  },
  achievementCardGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIconSection: {
    marginRight: 16,
    position: 'relative',
  },
  achievementIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementIconCircleLocked: {
    backgroundColor: '#F5F5F5',
    borderColor: '#D0D0D0',
  },
  achievementBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.green,
    padding: 2,
  },
  achievementContent: {
    flex: 1,
  },
  achievementCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 4,
  },
  achievementCardTitleLocked: {
    color: THEME.textMuted,
  },
  achievementCardDescription: {
    fontSize: 13,
    color: THEME.textMuted,
    marginBottom: 12,
    fontWeight: '500',
  },
  achievementProgressSection: {
    marginTop: 4,
  },
  achievementProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  achievementProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  achievementProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textMuted,
  },
});
