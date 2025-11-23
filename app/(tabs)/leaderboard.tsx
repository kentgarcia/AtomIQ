import { Icon } from '@/components/ui/icon';
import { useStorage } from '@/services/StorageContext';
import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Orange Theme
const THEME = {
  primary: '#FF6B00', // Vibrant Orange
  primaryLight: '#FF8533',
  primaryDark: '#E65100',
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
  { name: 'Dr. Marie Curie', title: 'Radiation Pioneer', baseXP: 2000, avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg', isNPC: true },
  { name: 'Prof. Albert Einstein', title: 'Physics Legend', baseXP: 1800, avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg', isNPC: true },
  { name: 'Dr. Enrico Fermi', title: 'Reactor Architect', baseXP: 1600, avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg', isNPC: true },
  { name: 'Dr. Niels Bohr', title: 'Quantum Master', baseXP: 1400, avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg', isNPC: true },
  { name: 'Dr. Lisa Meitner', title: 'Fission Expert', baseXP: 1200, avatar: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg', isNPC: true },
  { name: 'Dr. Ernest Rutherford', title: 'Atom Splitter', baseXP: 1000, avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg', isNPC: true },
  { name: 'Dr. Chien-Shiung Wu', title: 'Beta Decay Pro', baseXP: 800, avatar: 'https://images.pexels.com/photos/774095/pexels-photo-774095.jpeg', isNPC: true },
  { name: 'Dr. Glenn Seaborg', title: 'Element Hunter', baseXP: 600, avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg', isNPC: true },
  { name: 'Dr. Lise Meitner', title: 'Nuclear Theorist', baseXP: 400, avatar: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg', isNPC: true },
  { name: 'Dr. Otto Hahn', title: 'Chemistry Wizard', baseXP: 200, avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg', isNPC: true },
];

const CircleAvatar = ({ uri, size, borderColor, borderWidth = 3 }: { uri: string, size: number, borderColor: string, borderWidth?: number }) => {
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
        source={{ uri }} 
        style={{ width: '100%', height: '100%' }} 
        resizeMode="cover"
      />
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
      avatar: userProfile?.avatar_url || 'https://images.pexels.com/photos/1181695/pexels-photo-1181695.jpeg',
      isUser: true,
      isNPC: false
    };

    // Transform NPCs to have xp field
    const npcs = NPC_CHARACTERS.map(npc => ({
      name: npc.name,
      title: npc.title,
      xp: npc.baseXP,
      avatar: npc.avatar,
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
                <CircleAvatar uri={topThree[1].avatar} size={80} borderColor="rgba(255,255,255,0.8)" />
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
                <CircleAvatar uri={topThree[0].avatar} size={96} borderColor="#FFD700" borderWidth={4} />
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
                <CircleAvatar uri={topThree[2].avatar} size={80} borderColor="rgba(255,255,255,0.8)" />
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
                <Image source={{ uri: user.avatar }} style={styles.listAvatar} />
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
                <Icon name="Flash" size={16} color="#FF6B00" variant="Bold" />
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
            <Image source={{ uri: userRank.avatar }} style={styles.listAvatar} />
          </View>
          <View style={styles.listInfo}>
            <Text style={styles.listName}>{userRank.name}</Text>
            <Text style={styles.listTitle}>{userRank.title}</Text>
          </View>
          <View style={styles.listXP}>
            <Icon name="Flash" size={16} color="#FF6B00" variant="Bold" />
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
