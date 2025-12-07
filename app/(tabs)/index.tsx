import { Icon } from '@/components/ui/icon';
import { UNITS } from '@/content/units';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAllLevels } from '@/hooks/use-storage';
import { useStorage } from '@/services/StorageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Theme Constants
const LightTHEME = {
  bg: '#F8F9FE',
  card: '#FFFFFF',
  text: '#32325D',
  textMuted: '#8898AA',
  primary: '#5E72E4',
  border: '#E9ECEF',
};

const DarkTHEME = {
  bg: '#172B4D',
  card: '#213356',
  text: '#F6F9FC',
  textMuted: '#8898AA',
  primary: '#5E72E4',
  border: '#2D3A56',
};

// Gradient Colors
const GRADIENTS = {
  purple: ['#B8A5FE', '#9E87F5'] as const,
  green: ['#4FD1C5', '#2DCECC'] as const,
  orange: ['#FF9F65', '#FF6B6B'] as const,
  yellow: ['#FFD66E', '#FFA043'] as const,
  blue: ['#6A82FB', '#FC5C7D'] as const,
  blueSolid: ['#5E72E4', '#825EE4'] as const,
  cyan: ['#11CDEF', '#1171EF'] as const,
};

export default function HomeScreen() {
  const router = useRouter();
  const { userProfile } = useStorage();
  const { levels } = useAllLevels();
  const colorScheme = useColorScheme();
  
  const THEME = colorScheme === 'dark' ? DarkTHEME : LightTHEME;
  const styles = useMemo(() => createStyles(THEME), [THEME]);

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
      { name: 'AtomMaster99', title: 'Radiation Pioneer', baseXP: 2000, avatarColor: '#EA580C', isNPC: true },
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
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <View style={styles.headerLeft}>
            <Image 
              source={require('@/assets/images/mascot/blink.png')} 
              style={styles.avatar}
            />
            <View>
              <Text style={styles.greeting}>Good Afternoon!</Text>
              <Text style={styles.username}>{userProfile?.name || 'Atom Explorer'}</Text>
            </View>
          </View>
          
          <View style={styles.gemPill}>
            <LinearGradient
              colors={GRADIENTS.yellow}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gemGradient}
            >
              <Icon name="Flash" size={16} color="#FFF" variant="Bold" />
              <Text style={styles.gemText}>{userProfile?.total_xp || 0} XP</Text>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Quick Actions Row */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.quickActionsRow}>
          {/* Card 1: MythBuster (Orange) */}
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/mythbuster')}
          >
            <LinearGradient
              colors={GRADIENTS.orange}
              style={styles.actionGradient}
            >
              <View style={styles.actionIconCircle}>
                <Icon name="Danger" size={24} color="#FF6B6B" variant="Bold" />
              </View>
              <Text style={styles.actionText}>MythBuster</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Card 2: Encyclopedia (Blue) */}
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/encyclopedia')}
          >
            <LinearGradient
              colors={GRADIENTS.blue}
              style={styles.actionGradient}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
                <Icon name="Book" size={24} color="#6A82FB" variant="Bold" />
              </View>
              <Text style={styles.actionText}>Encyclopedia</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Card 3: AtomMaze (Purple) */}
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/atom-maze')}
          >
            <LinearGradient
              colors={GRADIENTS.purple}
              style={styles.actionGradient}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
                <Icon name="Game" size={24} color="#9E87F5" variant="Bold" />
              </View>
              <Text style={styles.actionText}>AtomMaze</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Daily Quiz Banner */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.bannerContainer}>
          <LinearGradient
            colors={GRADIENTS.yellow}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerGradient}
          >
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>Continue Learning</Text>
              <Text style={styles.bannerSubtitle}>Unit {currentProgress.unit.order}: {currentProgress.unit.title}</Text>
              
              <TouchableOpacity 
                style={styles.bannerButton}
                onPress={() => router.push('/map')}
              >
                <Text style={styles.bannerButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.bannerImageContainer}>
               <Icon name="Play" size={80} color="#FFF" variant="Bold" />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Leaderboard Widget */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          <TouchableOpacity 
            style={styles.arrowButton}
            onPress={() => router.push('/(tabs)/leaderboard')}
          >
            <Icon name="ArrowRight" size={20} color={THEME.textMuted} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500)} style={styles.leaderboardContainer}>
          {leaderboardPreview.topThree.map((leader, index) => {
            const isUser = leader.isUser;
            const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
            
            return (
              <View key={leader.rank} style={styles.leaderboardRow}>
                <View style={styles.rankInfo}>
                  <View style={[styles.rankBadge, { backgroundColor: rankColors[index] || '#E9ECEF' }]}>
                    <Text style={styles.rankText}>{leader.rank}</Text>
                  </View>
                  <Image 
                    source={isUser ? require('@/assets/images/mascot/profile.png') : { uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=' + leader.name }} 
                    style={styles.leaderAvatar} 
                  />
                  <View>
                    <Text style={styles.leaderName}>{leader.name} {isUser && '(You)'}</Text>
                    <Text style={styles.leaderScore}>{leader.xp} XP</Text>
                  </View>
                </View>
                {index === 0 && <Icon name="Crown" size={24} color="#FFD700" variant="Bold" />}
              </View>
            );
          })}
          
          <TouchableOpacity 
            style={styles.viewAllLink}
            onPress={() => router.push('/(tabs)/leaderboard')}
          >
            <Text style={styles.viewAllText}>View Full Leaderboard</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: typeof LightTHEME) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E9ECEF',
  },
  greeting: {
    fontSize: 14,
    color: theme.textMuted,
    fontWeight: '600',
  },
  username: {
    fontSize: 18,
    color: theme.text,
    fontWeight: '800',
  },
  gemPill: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  gemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 8,
  },
  gemText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  plusBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    height: 110,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  actionGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  bannerContainer: {
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bannerGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  bannerContent: {
    flex: 1,
    zIndex: 2,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 20,
    fontWeight: '600',
  },
  bannerButton: {
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: '#FFA043',
    fontWeight: '800',
    fontSize: 14,
  },
  bannerImageContainer: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    opacity: 0.9,
    transform: [{ rotate: '-10deg' }],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardContainer: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  rankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  leaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E9ECEF',
  },
  leaderName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
  },
  leaderScore: {
    fontSize: 12,
    color: theme.textMuted,
    fontWeight: '600',
  },
  viewAllLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  viewAllText: {
    color: theme.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
