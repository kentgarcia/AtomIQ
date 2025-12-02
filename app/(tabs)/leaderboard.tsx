import { Icon } from '@/components/ui/icon';
import { useStorage } from '@/services/StorageContext';
import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Orange Theme
const THEME = {
  primary: '#EA580C', // Vibrant Orange
  primaryLight: '#F97316',
  primaryDark: '#C2410C',
  bg: '#F4F5F7', // Light Grey Background
  card: '#FFFFFF',
  text: '#2D3436',
  textMuted: '#636E72',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  green: '#2ECC71', // For rank increase / positive stats
};

// NPC Characters - Personal Goals for the User
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

const CircleAvatar = ({ uri, size, borderColor, borderWidth = 3, avatarColor, isUser }: { uri?: string, size: number, borderColor: string, borderWidth?: number, avatarColor?: string, isUser?: boolean }) => {
  // User avatar - use profile mascot
  if (isUser || uri === 'profile') {
    return (
      <View style={{ 
        width: size, 
        height: size, 
        borderRadius: size / 2, 
        borderWidth, 
        borderColor,
        overflow: 'hidden',
        backgroundColor: '#FFF'
      }}>
        <Image 
          source={require('@/assets/images/mascot/profile.png')} 
          style={{ width: '100%', height: '100%' }} 
          resizeMode="contain"
        />
      </View>
    );
  }
  
  // NPC avatar with colored icon
  return (
    <View style={{ 
      width: size, 
      height: size, 
      borderRadius: size / 2, 
      borderWidth, 
      borderColor,
      backgroundColor: avatarColor || '#E5E7EB',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Icon name="Profile" size={size * 0.6} color="#FFF" variant="Bold" />
    </View>
  );
};

export default function LeaderboardScreen() {
  const { userProfile } = useStorage();
  const pulse = useSharedValue(1);
  
  React.useEffect(() => {
    pulse.value = withRepeat(withTiming(1.02, { duration: 1000 }), -1, true);
  }, []);
  
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  // Generate leaderboard with user and NPCs
  const leaderboardData = useMemo(() => {
    const userXP = userProfile?.total_xp || 0;
    const userData = {
      name: userProfile?.username || 'You',
      title: 'Nuclear Learner',
      xp: userXP,
      avatar: 'profile', // Use profile mascot
      isUser: true,
      isNPC: false
    };

    // Transform NPCs to have xp field
    const npcs = NPC_CHARACTERS.map(npc => ({
      name: npc.name,
      title: npc.title,
      xp: npc.baseXP,
      avatarColor: npc.avatarColor,
      isUser: false,
      isNPC: true
    }));

    // Combine user with NPCs
    const allCharacters = [userData, ...npcs];
    
    // Sort by XP descending
    const sorted = allCharacters.sort((a, b) => b.xp - a.xp);
    
    // Add ranks
    return sorted.map((char, index) => ({
      ...char,
      rank: index + 1
    }));
  }, [userProfile]);

  const topThree = leaderboardData.slice(0, 3);
  const restList = leaderboardData.slice(3);
  const userRank = leaderboardData.find(item => item.isUser);

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Fixed Header */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={[THEME.primary, THEME.primaryLight]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Decorative Shapes */}
          <View style={[styles.decoCircle, { top: -20, left: -20, width: 100, height: 100, opacity: 0.1 }]} />
          <View style={[styles.decoCircle, { bottom: 40, right: -10, width: 80, height: 80, opacity: 0.1 }]} />
          <View style={[styles.decoCircle, { top: 40, right: 40, width: 40, height: 40, opacity: 0.1 }]} />
          
          <Text style={styles.headerTitle}>Leaderboard</Text>
          
          {/* Podium */}
          <View style={styles.podiumContainer}>
            {/* Rank 2 */}
            <View style={[styles.podiumColumn, styles.podiumSide]}>
              <View style={styles.podiumAvatarWrapper}>
                <CircleAvatar uri={topThree[1].avatar} avatarColor={topThree[1].avatarColor} isUser={topThree[1].isUser} size={80} borderColor="rgba(255,255,255,0.8)" />
                <View style={[styles.rankBadge, { backgroundColor: THEME.silver }]}>
                  <Text style={styles.rankText}>2</Text>
                </View>
              </View>
              <Text style={styles.podiumName}>{topThree[1].name}</Text>
              <Text style={styles.podiumXP}>{topThree[1].xp} XP</Text>
            </View>

            {/* Rank 1 */}
            <View style={[styles.podiumColumn, styles.podiumCenter]}>
              <Animated.View style={[styles.podiumAvatarWrapper, pulseStyle]}>
                <View style={styles.crownWrapper}>
                   <Icon name="Crown1" size={24} color="#FFD700" variant="Bold" />
                </View>
                <CircleAvatar uri={topThree[0].avatar} avatarColor={topThree[0].avatarColor} isUser={topThree[0].isUser} size={96} borderColor="#FFD700" borderWidth={4} />
                <View style={[styles.rankBadge, { backgroundColor: THEME.gold, width: 28, height: 28, bottom: -12 }]}>
                  <Text style={styles.rankText}>1</Text>
                </View>
              </Animated.View>
              <Text style={[styles.podiumName, styles.podiumNameLarge]}>{topThree[0].name}</Text>
              <Text style={styles.podiumXP}>
                <Icon name="Flash" size={14} color="#FFD700" variant="Bold" />
                {' '}{topThree[0].xp} XP
              </Text>
            </View>

            {/* Rank 3 */}
            <View style={[styles.podiumColumn, styles.podiumSide]}>
              <View style={styles.podiumAvatarWrapper}>
                <CircleAvatar uri={topThree[2].avatar} avatarColor={topThree[2].avatarColor} isUser={topThree[2].isUser} size={80} borderColor="rgba(255,255,255,0.8)" />
                <View style={[styles.rankBadge, { backgroundColor: THEME.bronze }]}>
                  <Text style={styles.rankText}>3</Text>
                </View>
              </View>
              <Text style={styles.podiumName}>{topThree[2].name}</Text>
              <Text style={styles.podiumXP}>{topThree[2].xp} XP</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Scrollable List */}
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listContainer}>
          {restList.map((user) => (
            <View 
              key={user.rank} 
              style={[
                styles.listItem, 
                user.isUser && { backgroundColor: '#FFF5ED', borderColor: THEME.primary }
              ]}
            >
              <View style={styles.rankCircle}>
                <Text style={styles.listRankText}>{user.rank}</Text>
              </View>
              
              <View style={styles.listAvatarWrapper}>
                {user.isUser ? (
                  <Image source={require('@/assets/images/mascot/profile.png')} style={styles.listAvatar} resizeMode="contain" />
                ) : (
                  <View style={[styles.listAvatar, { backgroundColor: user.avatarColor || '#E5E7EB', borderRadius: 18, alignItems: 'center', justifyContent: 'center' }]}>
                    <Icon name="Profile" size={24} color="#FFF" variant="Bold" />
                  </View>
                )}
                {user.isNPC && (
                  <View style={styles.npcBadge}>
                    <Icon name="Star" size={10} color="#FFD700" variant="Bold" />
                  </View>
                )}
              </View>

              <View style={styles.listInfo}>
                <Text style={styles.listName}>
                  {user.name} {user.isUser && '(You)'}
                </Text>
                <Text style={styles.listTitle}>{user.title}</Text>
              </View>

              <View style={styles.listXP}>
                <Icon name="Flash" size={16} color="#EA580C" variant="Bold" />
                <Text style={styles.xpText}>{user.xp.toLocaleString()} XP</Text>
              </View>
            </View>
          ))}
        </View>
        
        <View style={{ height: 180 }} />
      </ScrollView>

      {/* Sticky User Bar */}
      {userRank && (
        <View style={styles.stickyBar}>
          <View style={[styles.rankCircle, { backgroundColor: '#FFF', borderWidth: 2, borderColor: THEME.primary }]}>
            <Text style={[styles.listRankText, { color: THEME.primary }]}>{userRank.rank}</Text>
          </View>
          <View style={styles.listAvatarWrapper}>
            <Image source={require('@/assets/images/mascot/profile.png')} style={styles.listAvatar} resizeMode="contain" />
          </View>
          <View style={styles.listInfo}>
            <Text style={styles.listName}>{userRank.name}</Text>
            <Text style={styles.listTitle}>{userRank.title}</Text>
          </View>
          <View style={styles.listXP}>
            <Icon name="Flash" size={16} color="#EA580C" variant="Bold" />
            <Text style={styles.xpText}>{userRank.xp.toLocaleString()} XP</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 100,
  },
  headerContainer: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    marginBottom: 0,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  headerGradient: {
    paddingTop: 50, 
    paddingBottom: 20, 
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20, 
    fontWeight: '700',
    marginBottom: 10,
  },
  decoCircle: {
    position: 'absolute',
    backgroundColor: '#FFF',
    borderRadius: 100,
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 24, 
    marginTop: 10,
  },
  podiumColumn: {
    alignItems: 'center',
  },
  podiumSide: {
    marginBottom: 0,
  },
  podiumCenter: {
    marginBottom: 0, 
    zIndex: 10,
  },
  podiumAvatarWrapper: {
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownWrapper: {
    position: 'absolute',
    top: -24, 
    zIndex: 20,
  },
  rankBadge: {
    position: 'absolute',
    bottom: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    zIndex: 5,
  },
  rankText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  podiumName: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  podiumNameLarge: {
    fontSize: 15,
    fontWeight: '700',
  },
  podiumXP: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5', // Duolingo-style outline
  },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listRankText: {
    color: THEME.textMuted,
    fontWeight: '700',
    fontSize: 12,
  },
  listAvatarWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    color: THEME.text,
    fontWeight: '700',
    fontSize: 15,
  },
  listTitle: {
    color: THEME.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  npcBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  listXP: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  xpText: {
    color: THEME.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  stickyBar: {
    position: 'absolute',
    bottom: 110, 
    left: 20,
    right: 20,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.primary, // Highlighted outline for user
  },
});
