import { Icon } from '@/components/ui/icon';
import { UNITS } from '@/content/units';
import { useAllLevels } from '@/hooks/use-storage';
import { useStorage } from '@/services/StorageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Theme Constants
const THEME = {
  bg: '#F7F7F7',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#9CA3AF',
  primary: '#FF6B00', // Orange
  primaryDark: '#E65100',
  primaryLight: '#FF9E40',
  success: '#2ECC71', // Green for completed
  gold: '#FFC107',
  border: '#E5E7EB',
  borderDark: '#D1D5DB', // Slightly darker for "3D" edge effects if needed (removed per request, but good for borders)
};

export default function HomeScreen() {
  const router = useRouter();
  const { userProfile } = useStorage();
  const { levels } = useAllLevels();

  // Calculate current progress
  const currentProgress = useMemo(() => {
    const completedLessonIds = levels
      .filter(l => l.status === 'completed')
      .map(l => l.id);

    // Find the current unit and lesson
    let currentUnit = UNITS[0];
    let currentLessonIndex = 0;
    let totalLessonsInUnit = currentUnit.lessonIds.length;
    let completedInCurrentUnit = 0;

    for (const unit of UNITS) {
      const completedInUnit = unit.lessonIds.filter(id => completedLessonIds.includes(id)).length;
      const totalInUnit = unit.lessonIds.length;

      if (completedInUnit < totalInUnit) {
        // This is the current unit
        currentUnit = unit;
        currentLessonIndex = completedInUnit;
        totalLessonsInUnit = totalInUnit;
        completedInCurrentUnit = completedInUnit;
        break;
      }
    }

    const progressPercentage = totalLessonsInUnit > 0 
      ? Math.round((completedInCurrentUnit / totalLessonsInUnit) * 100) 
      : 0;

    return {
      unit: currentUnit,
      lessonIndex: currentLessonIndex,
      totalLessons: totalLessonsInUnit,
      progressPercentage,
      completedLessons: completedInCurrentUnit
    };
  }, [levels]);

  // Calculate debunking stats
  const debunkingStats = useMemo(() => {
    const totalLessons = userProfile?.lessons_completed || 0;
    const totalMyths = userProfile?.myths_busted || 0;
    const total = totalLessons + totalMyths;
    
    // Calculate percentages for the bar chart
    const mythsPercentage = total > 0 ? (totalMyths / Math.max(total, 50)) : 0;
    const lessonsPercentage = total > 0 ? (totalLessons / Math.max(total, 50)) : 0;

    return {
      totalLessons,
      totalMyths,
      mythsPercentage: Math.min(mythsPercentage, 1),
      lessonsPercentage: Math.min(lessonsPercentage, 1)
    };
  }, [userProfile]);

  // Calculate leaderboard data (same logic as leaderboard screen)
  const leaderboardPreview = useMemo(() => {
    const NPC_CHARACTERS = [
      { name: 'AtomMaster99', title: 'Radiation Pioneer', baseXP: 2000, avatarColor: '#FF6B00', isNPC: true },
      { name: 'NuclearNinja', title: 'Physics Legend', baseXP: 1800, avatarColor: '#2ECC71', isNPC: true },
      { name: 'ReactorRex', title: 'Reactor Architect', baseXP: 1600, avatarColor: '#3498DB', isNPC: true },
      { name: 'QuantumQuinn', title: 'Quantum Master', baseXP: 1400, avatarColor: '#9B59B6', isNPC: true },
      { name: 'FissionFiona', title: 'Fission Expert', baseXP: 1200, avatarColor: '#E91E63', isNPC: true },
      { name: 'AtomSmasher', title: 'Atom Splitter', baseXP: 1000, avatarColor: '#F39C12', isNPC: true },
      { name: 'BetaBeast', title: 'Beta Decay Pro', baseXP: 800, avatarColor: '#1ABC9C', isNPC: true },
      { name: 'ElementElla', title: 'Element Hunter', baseXP: 600, avatarColor: '#E74C3C', isNPC: true },
      { name: 'NuclearNora', title: 'Nuclear Theorist', baseXP: 400, avatarColor: '#16A085', isNPC: true },
      { name: 'ChemWizard', title: 'Chemistry Wizard', baseXP: 200, avatarColor: '#D35400', isNPC: true },
    ];

    const userXP = userProfile?.total_xp || 0;
    const userData = {
      name: userProfile?.username || 'You',
      title: 'Nuclear Learner',
      xp: userXP,
      avatar: 'profile',
      isUser: true,
      isNPC: false
    };

    const npcs = NPC_CHARACTERS.map(npc => ({
      name: npc.name,
      title: npc.title,
      xp: npc.baseXP,
      avatarColor: npc.avatarColor,
      isUser: false,
      isNPC: true
    }));

    const allCharacters = [userData, ...npcs];
    const sorted = allCharacters.sort((a, b) => b.xp - a.xp);
    const ranked = sorted.map((char, index) => ({
      ...char,
      rank: index + 1
    }));

    const topThree = ranked.slice(0, 3);
    const userRank = ranked.find(item => item.isUser);

    return {
      topThree,
      userRank
    };
  }, [userProfile]);

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Header */}
      <View style={styles.header}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Image 
            source={require('@/assets/images/mascot/profile.png')} 
            style={styles.profileAvatar} 
            resizeMode="contain"
          />
          <Text style={styles.profileName}>{userProfile?.username || 'Scientist'}</Text>
        </View>
        
        {/* Right Stats */}
        <View style={styles.statsRow}>
           <View style={styles.statPill}>
              <Icon name="Flash" size={18} color={THEME.gold} variant="Bold" />
              <Text style={styles.statValue}>{userProfile?.total_xp || 0}</Text>
           </View>
           <TouchableOpacity style={styles.languagePill}>
              <Text style={styles.flagEmoji}>🇺🇸</Text>
              <Icon name="ArrowDown2" size={14} color={THEME.text} />
           </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Main Banner */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.bannerContainer}>
           <LinearGradient
             colors={[currentProgress.unit.color, currentProgress.unit.color + 'CC']}
             start={{ x: 0, y: 0 }}
             end={{ x: 1, y: 0 }}
             style={styles.bannerGradient}
           >
             <View style={styles.bannerContent}>
               <View style={{ flex: 1 }}>
                 <Text style={styles.bannerTitle}>Continue Learning</Text>
                 <Text style={styles.bannerSubtitle}>
                   Unit {currentProgress.unit.order}: {currentProgress.unit.title}
                 </Text>
                 <Text style={[styles.bannerSubtitle, { fontSize: 11, opacity: 0.8, marginTop: 2 }]}>
                   Lesson {currentProgress.completedLessons + 1} of {currentProgress.totalLessons}
                 </Text>
                 
                 <View style={styles.bannerProgressRow}>
                   <View style={styles.bannerProgressBar}>
                     <View style={[styles.bannerProgressFill, { width: `${currentProgress.progressPercentage}%` }]} />
                     <View style={[styles.bannerProgressKnob, { left: `${currentProgress.progressPercentage}%` }]}>
                        <Text style={styles.bannerProgressText}>{currentProgress.progressPercentage}%</Text>
                     </View>
                   </View>
                 </View>
               </View>
               
               <TouchableOpacity 
                 style={styles.resumeButton}
                 onPress={() => router.push('/map')}
               >
                 <Icon name="Play" size={16} color="#FFF" variant="Bold" />
                 <Text style={styles.resumeButtonText}>Resume</Text>
               </TouchableOpacity>
             </View>
           </LinearGradient>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Play</Text>
            <View style={styles.quickBadge}>
              <Icon name="Flash" size={14} color={THEME.gold} variant="Bold" />
              <Text style={styles.quickBadgeText}>Earn XP</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>Jump in for a quick session anytime</Text>

          <View style={styles.quickActionsContainer}>
            {/* MythBuster Mode */}
            <TouchableOpacity 
              style={styles.quickActionCard}
              activeOpacity={0.8}
              onPress={() => router.push('/mythbuster')}
            >
              <LinearGradient
                colors={['#FF6B00', '#FF9E40']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionGradient}
              >
                <View style={styles.quickActionIcon}>
                  <Icon name="Danger" size={32} color="#FFF" variant="Bold" />
                </View>
                <View style={styles.quickActionContent}>
                  <Text style={styles.quickActionTitle}>MythBuster</Text>
                  <Text style={styles.quickActionDesc}>Swipe to bust myths</Text>
                  <View style={styles.quickActionMeta}>
                    <Icon name="Timer" size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.quickActionMetaText}>~2 min</Text>
                    <Text style={styles.quickActionDot}>•</Text>
                    <Icon name="Flash" size={14} color="#FFD700" variant="Bold" />
                    <Text style={styles.quickActionMetaText}>+10 XP</Text>
                  </View>
                </View>
                <Icon name="ArrowRight2" size={24} color="rgba(255,255,255,0.6)" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Encyclopedia */}
            <TouchableOpacity 
              style={styles.quickActionCard}
              activeOpacity={0.8}
              onPress={() => router.push('/encyclopedia')}
            >
              <LinearGradient
                colors={['#64B5F6', '#90CAF9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionGradient}
              >
                <View style={styles.quickActionIcon}>
                  <Icon name="SearchNormal" size={32} color="#FFF" variant="Bold" />
                </View>
                <View style={styles.quickActionContent}>
                  <Text style={styles.quickActionTitle}>Encyclopedia</Text>
                  <Text style={styles.quickActionDesc}>Searchable knowledge vault</Text>
                  <View style={styles.quickActionMeta}>
                    <Icon name="SearchNormal" size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.quickActionMetaText}>Search</Text>
                    <Text style={styles.quickActionDot}>•</Text>
                    <Icon name="Book" size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.quickActionMetaText}>Terms</Text>
                    <Text style={styles.quickActionDot}>•</Text>
                    <Icon name="Flash" size={14} color="#FFD700" variant="Bold" />
                    <Text style={styles.quickActionMetaText}>+5 XP</Text>
                  </View>
                </View>
                <Icon name="ArrowRight2" size={24} color="rgba(255,255,255,0.6)" />
              </LinearGradient>
            </TouchableOpacity>

            {/* AtomMaze */}
            <TouchableOpacity 
              style={styles.quickActionCard}
              activeOpacity={0.8}
              onPress={() => router.push('/atom-maze')}
            >
              <LinearGradient
                colors={['#9B59B6', '#8E44AD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionGradient}
              >
                <View style={styles.quickActionIcon}>
                  <Icon name="Game" size={32} color="#FFF" variant="Bold" />
                </View>
                <View style={styles.quickActionContent}>
                  <Text style={styles.quickActionTitle}>AtomMaze</Text>
                  <Text style={styles.quickActionDesc}>Navigate quiz challenges</Text>
                  <View style={styles.quickActionMeta}>
                    <Icon name="Game" size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.quickActionMetaText}>Adventure</Text>
                    <Text style={styles.quickActionDot}>•</Text>
                    <Icon name="Timer" size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.quickActionMetaText}>~10 min</Text>
                    <Text style={styles.quickActionDot}>•</Text>
                    <Icon name="Flash" size={14} color="#FFD700" variant="Bold" />
                    <Text style={styles.quickActionMetaText}>+250 XP</Text>
                  </View>
                </View>
                <Icon name="ArrowRight2" size={24} color="rgba(255,255,255,0.6)" />
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </Animated.View>

        {/* Learning Progress Chart */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.sectionContainer}>
           <Text style={styles.sectionTitle}>Debunking Progress</Text>
           <View style={styles.chartHeader}>
             <Text style={styles.sectionSubtitle}>Your learning journey so far</Text>
             <View style={styles.legendContainer}>
               <View style={styles.legendItem}>
                 <View style={[styles.legendDot, { backgroundColor: THEME.primary }]} />
                 <Text style={styles.legendText}>Myths Busted</Text>
               </View>
               <View style={styles.legendItem}>
                 <View style={[styles.legendDot, { backgroundColor: THEME.success }]} />
                 <Text style={styles.legendText}>Lessons Completed</Text>
               </View>
             </View>
           </View>

           <View style={styles.chartContainer}>
             <View style={styles.statsGrid}>
               <View style={styles.statCard}>
                 <Icon name="Danger" size={32} color={THEME.primary} variant="Bold" />
                 <Text style={styles.statCardValue}>{debunkingStats.totalMyths}</Text>
                 <Text style={styles.statCardLabel}>Myths Busted</Text>
               </View>
               <View style={styles.statCard}>
                 <Icon name="Book" size={32} color={THEME.success} variant="Bold" />
                 <Text style={styles.statCardValue}>{debunkingStats.totalLessons}</Text>
                 <Text style={styles.statCardLabel}>Lessons Done</Text>
               </View>
             </View>

             <Text style={[styles.chartLabel, { marginTop: 16, marginBottom: 8 }]}>Overall Progress</Text>
             <View style={styles.barRow}>
                {debunkingStats.mythsPercentage > 0 && (
                  <View style={[styles.barSegment, { 
                    flex: debunkingStats.mythsPercentage, 
                    backgroundColor: THEME.primary, 
                    borderTopLeftRadius: 8, 
                    borderBottomLeftRadius: 8 
                  }]} />
                )}
                {debunkingStats.lessonsPercentage > 0 && (
                  <View style={[styles.barSegment, { 
                    flex: debunkingStats.lessonsPercentage, 
                    backgroundColor: THEME.success,
                    borderTopRightRadius: debunkingStats.mythsPercentage === 0 ? 8 : 0,
                    borderBottomRightRadius: debunkingStats.mythsPercentage === 0 ? 8 : 0,
                    borderTopLeftRadius: debunkingStats.mythsPercentage === 0 ? 8 : 0,
                    borderBottomLeftRadius: debunkingStats.mythsPercentage === 0 ? 8 : 0
                  }]} />
                )}
                <View style={{ flex: Math.max(0.1, 1 - debunkingStats.mythsPercentage - debunkingStats.lessonsPercentage) }} /> 
             </View>

             {(debunkingStats.totalLessons + debunkingStats.totalMyths) > 0 && (
               <View style={styles.successPill}>
                  <Icon name="Cup" size={16} color={THEME.primary} variant="Bold" />
                  <Text style={styles.successPillText}>
                    Keep it up! You've completed {debunkingStats.totalLessons + debunkingStats.totalMyths} activities!
                  </Text>
               </View>
             )}
           </View>
        </Animated.View>

        {/* Leaderboard Teaser */}
        <Animated.View entering={FadeInDown.delay(400)} style={[styles.sectionContainer, { marginBottom: 120 }]}>
          <View style={styles.leaderboardHeader}>
            <View>
              <Text style={styles.sectionTitle}>Top Mythbusters</Text>
              <Text style={styles.sectionSubtitle}>See who's leading the truth squad</Text>
            </View>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/(tabs)/leaderboard')}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Icon name="ArrowRight2" size={16} color={THEME.primary} variant="Bold" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.leaderboardCard}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/leaderboard')}
          >
            {/* Top 3 Ranks */}
            {leaderboardPreview.topThree.map((leader, index) => {
              const rankColors = [
                { bg: '#FFD700', text: '#FFF' }, // Gold
                { bg: '#C0C0C0', text: '#FFF' }, // Silver
                { bg: '#CD7F32', text: '#FFF' }  // Bronze
              ];
              const rankColor = rankColors[index];
              const isUser = leader.isUser;
              
              return (
                <View 
                  key={leader.rank} 
                  style={[
                    styles.leaderboardRow,
                    isUser && styles.leaderboardRowUser,
                    index < leaderboardPreview.topThree.length - 1 && styles.leaderboardRowBorder
                  ]}
                >
                  <View style={[styles.rankBadge, { backgroundColor: rankColor.bg }]}>
                    <Text style={[styles.rankText, { color: rankColor.text }]}>{leader.rank}</Text>
                  </View>
                  {leader.isUser ? (
                    <Image source={require('@/assets/images/mascot/profile.png')} style={styles.avatarSmall} resizeMode="contain" />
                  ) : (
                    <View style={[styles.avatarSmall, { backgroundColor: leader.avatarColor || '#E5E7EB', borderRadius: 18, alignItems: 'center', justifyContent: 'center' }]}>
                      <Icon name="Profile" size={20} color="#FFF" variant="Bold" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.leaderName, isUser && styles.leaderNameUser]}>
                      {leader.name} {isUser && '(You)'}
                    </Text>
                    {leader.title && (
                      <Text style={styles.leaderTitle}>{leader.title}</Text>
                    )}
                  </View>
                  <View style={styles.xpContainer}>
                    <Icon name="Flash" size={14} color={index === 0 ? THEME.gold : THEME.textMuted} variant="Bold" />
                    <Text style={[styles.xpText, index === 0 && styles.xpTextGold]}>
                      {leader.xp.toLocaleString()} XP
                    </Text>
                  </View>
                </View>
              );
            })}
            
            {/* User Rank if not in top 3 */}
            {leaderboardPreview.userRank && leaderboardPreview.userRank.rank > 3 && (
              <>
                <View style={styles.leaderboardDivider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Your Rank</Text>
                  <View style={styles.dividerLine} />
                </View>
                <View style={[styles.leaderboardRow, styles.leaderboardRowUser]}>
                  <View style={[styles.rankBadge, { backgroundColor: THEME.primary }]}>
                    <Text style={[styles.rankText, { color: '#FFF' }]}>{leaderboardPreview.userRank.rank}</Text>
                  </View>
                  <Image source={require('@/assets/images/mascot/profile.png')} style={styles.avatarSmall} resizeMode="contain" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leaderNameUser}>
                      {leaderboardPreview.userRank.name} (You)
                    </Text>
                    <Text style={styles.leaderTitle}>{leaderboardPreview.userRank.title}</Text>
                  </View>
                  <View style={styles.xpContainer}>
                    <Icon name="Flash" size={14} color={THEME.primary} variant="Bold" />
                    <Text style={[styles.xpText, { color: THEME.primary }]}>
                      {leaderboardPreview.userRank.xp.toLocaleString()} XP
                    </Text>
                  </View>
                </View>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: THEME.bg,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: THEME.primary,
  },
  profileName: {
    fontWeight: '700',
    fontSize: 16,
    color: THEME.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
  },
  statValue: {
    fontWeight: '700',
    fontSize: 14,
    color: THEME.text,
  },
  languagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
  },
  flagEmoji: {
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bannerContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    // Removed shadow
  },
  bannerGradient: {
    padding: 20,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bannerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginBottom: 16,
  },
  bannerProgressRow: {
    width: '100%',
  },
  bannerProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    position: 'relative',
    justifyContent: 'center',
  },
  bannerProgressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 4,
  },
  bannerProgressKnob: {
    position: 'absolute',
    backgroundColor: '#FFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    transform: [{ translateX: -10 }, { translateY: -12 }],
    top: 0,
  },
  bannerProgressText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.primary,
  },
  resumeButton: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)', // Duolingo 3D lip for dark button
  },
  resumeButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionContainer: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4, // Duolingo 3D lip
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 4,
  },
  quickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.gold + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quickBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.gold,
  },
  sectionSubtitle: {
    color: THEME.textMuted,
    fontSize: 13,
    marginBottom: 20,
  },
  quickActionsContainer: {
    gap: 12,
  },
  quickActionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 2,
  },
  quickActionDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  quickActionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickActionMetaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  quickActionDot: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  chartHeader: {
    marginBottom: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  chartContainer: {
    gap: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: THEME.bg,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.text,
  },
  statCardLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  chartLabel: {
    fontSize: 12,
    color: THEME.textMuted,
    fontWeight: '600',
  },
  barRow: {
    flexDirection: 'row',
    height: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
  },
  axisLabel: {
    fontSize: 10,
    color: '#D1D5DB',
  },
  successPill: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  successPillText: {
    color: THEME.success,
    fontWeight: '700',
    fontSize: 13,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: THEME.primary + '15',
    borderRadius: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
  },
  leaderboardCard: {
    backgroundColor: THEME.bg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  leaderboardRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  leaderboardRowUser: {
    backgroundColor: THEME.primary + '08',
    borderRadius: 12,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  rankText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  leaderName: {
    fontWeight: '700',
    color: THEME.text,
    fontSize: 14,
  },
  leaderNameUser: {
    color: THEME.primary,
    fontWeight: '800',
  },
  leaderTitle: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 2,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  xpText: {
    fontWeight: '700',
    color: THEME.textMuted,
    fontSize: 13,
  },
  xpTextGold: {
    color: THEME.gold,
  },
  leaderboardDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.border,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
