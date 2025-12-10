import { Icon } from '@/components/ui/icon';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStorage } from '@/services/StorageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
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
};

export default function ProfileScreen() {
  const router = useRouter();
  const { userProfile } = useStorage();
  const colorScheme = useColorScheme();
  const THEME = colorScheme === 'dark' ? DarkTHEME : LightTHEME;
  const styles = useMemo(() => createStyles(THEME), [THEME]);
  
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate user level
  const userLevel = useMemo(() => {
    if (!userProfile) return 1;
    return Math.floor(userProfile.total_xp / 100) + 1;
  }, [userProfile]);

  // Calculate user title based on level
  const userTitle = useMemo(() => {
    if (userLevel < 5) return 'Atomic Novice';
    if (userLevel < 10) return 'Isotope Initiate';
    if (userLevel < 20) return 'Fusion Explorer';
    return 'Quantum Master';
  }, [userLevel]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!userProfile) return [];
    
    const lessonsCompleted = userProfile.lessons_completed || 0;
    const mythsBusted = userProfile.myths_busted || 0;
    
    return [
      { id: 1, label: 'Streak', value: userProfile.current_streak.toString(), icon: 'Flash', gradient: GRADIENTS.orange },
      { id: 2, label: 'Best', value: (userProfile.longest_streak || 0).toString(), icon: 'Trophy', gradient: GRADIENTS.yellow },
      { id: 3, label: 'Myths', value: mythsBusted.toString(), icon: 'TickCircle', gradient: GRADIENTS.green },
      { id: 4, label: 'Lessons', value: lessonsCompleted.toString(), icon: 'Book', gradient: GRADIENTS.blue },
    ];
  }, [userProfile]);

  // Stats helpers for detail view
  const totalLessons = 31;
  const totalMyths = 8;
  const lessonsProgress = Math.min((userProfile?.lessons_completed || 0) / totalLessons, 1);
  const mythsProgress = Math.min((userProfile?.myths_busted || 0) / totalMyths, 1);
  const levelProgress = Math.min((userProfile?.total_xp || 0) % 100 / 100, 1);

  const handleSearchFriends = () => {
    setSearchModalVisible(true);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      Alert.alert('Empty Search', 'Please enter a username to search');
      return;
    }
    Alert.alert('Coming Soon', 'Friend search will be connected to Supabase');
    setSearchResults([]);
  };

  const handleAddFriend = (userId: string) => {
    Alert.alert('Friend Request Sent', 'Your friend request has been sent!');
  };

  if (!userProfile) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: THEME.textMuted }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => router.push('/settings')}
            >
              <Icon name="Setting" size={24} color={THEME.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Image 
                source={require('@/assets/images/mascot/profile.png')} 
                style={styles.avatar} 
                resizeMode="contain"
              />
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{userLevel}</Text>
              </View>
            </View>
            <Text style={styles.name}>{userProfile.username}</Text>
            <Text style={styles.title}>{userTitle}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {['overview', 'friends'].map((tab) => (
            <TouchableOpacity 
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]} 
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content Area */}
        <View style={styles.contentArea}>
          {activeTab === 'overview' && (
            <Animated.View entering={FadeInDown.duration(400)}>
              
              {/* Level Progress Card */}
              <View style={styles.progressCard}>
                <LinearGradient
                  colors={GRADIENTS.blueSolid}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.progressGradient}
                >
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressTitle}>Level Progress</Text>
                    <Text style={styles.xpText}>{userProfile.total_xp.toLocaleString()} XP</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${(userProfile.total_xp % 100)}%` }]} />
                  </View>
                  <Text style={styles.nextLevelText}>
                    {100 - (userProfile.total_xp % 100)} XP until Level {userLevel + 1}
                  </Text>
                </LinearGradient>
              </View>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                {stats.map((stat, index) => (
                  <Animated.View 
                    key={stat.id} 
                    entering={FadeInDown.delay(100 + (index * 50))}
                    style={styles.statItemContainer}
                  >
                    <LinearGradient
                      colors={stat.gradient}
                      style={styles.statGradient}
                    >
                      <View style={styles.statIconCircle}>
                        <Icon name={stat.icon as any} size={20} color={stat.gradient[1]} variant="Bold" />
                      </View>
                      <Text style={styles.statValue}>{stat.value}</Text>
                      <Text style={styles.statLabel}>{stat.label}</Text>
                    </LinearGradient>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          )}

          {activeTab === 'stats' && null}

          {activeTab === 'friends' && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <TouchableOpacity style={styles.addFriendButton} onPress={handleSearchFriends}>
                <LinearGradient
                  colors={GRADIENTS.purple}
                  style={styles.addFriendGradient}
                >
                  <Icon name="Add" size={24} color="#FFF" />
                  <Text style={styles.addFriendText}>Find Friends</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.emptyStateContainer}>
                 <Icon name="Profile2User" size={64} color={THEME.textMuted} variant="Bulk" />
                 <Text style={styles.emptyStateTitle}>No Friends Yet</Text>
                 <Text style={styles.emptyStateDesc}>Connect with other learners to compete and share progress.</Text>
               </View>
            </Animated.View>
          )}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Search Friends Modal */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Friends</Text>
              <TouchableOpacity onPress={() => setSearchModalVisible(false)} style={styles.closeButton}>
                <Icon name="CloseCircle" size={24} color={THEME.textMuted} variant="Bold" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBar}>
              <Icon name="SearchNormal" size={20} color={THEME.textMuted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Enter username..."
                placeholderTextColor={THEME.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
                <Text style={styles.searchButtonText}>Search</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalResults} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {searchResults.length === 0 ? (
                <View style={styles.modalEmptyState}>
                  <Icon name="Profile2User" size={48} color={THEME.textMuted} variant="Bulk" />
                  <Text style={styles.modalEmptyText}>
                    {searchQuery ? 'No users found' : 'Search for friends by username'}
                  </Text>
                </View>
              ) : (
                searchResults.map((user, index) => (
                  <View key={index} style={styles.searchResultItem}>
                    <View style={styles.searchResultAvatar}>
                      <Icon name="Profile" size={24} color={THEME.primary} variant="Bold" />
                    </View>
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>{user.username}</Text>
                      <Text style={styles.searchResultStats}>{user.xp} XP • Level {user.level}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.addButton}
                      onPress={() => handleAddFriend(user.id)}
                    >
                      <Icon name="AddUser" size={18} color="#FFF" variant="Bold" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (theme: typeof LightTHEME) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: theme.bg,
  },
  headerTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    position: 'absolute',
    top: 60,
    zIndex: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.card,
  },
  levelBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#5E72E4',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.bg,
  },
  levelText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    color: theme.textMuted,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: theme.card,
    padding: 4,
    borderRadius: 16,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: theme.bg,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textMuted,
  },
  activeTabText: {
    color: theme.primary,
    fontWeight: '700',
  },
  contentArea: {
    paddingHorizontal: 20,
  },
  progressCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressGradient: {
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  xpText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 4,
  },
  nextLevelText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItemContainer: {
    width: (width - 56) / 2,
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDesc: {
    fontSize: 14,
    color: theme.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  addFriendButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  addFriendGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  addFriendText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
  },
  closeButton: {
    padding: 4,
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.text,
    fontWeight: '600',
  },
  searchButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalResults: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  modalEmptyText: {
    fontSize: 14,
    color: theme.textMuted,
    marginTop: 12,
    textAlign: 'center',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  searchResultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },
  searchResultStats: {
    fontSize: 12,
    color: theme.textMuted,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: theme.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Stats detail view
  statsDetailContainer: {
    gap: 16,
  },
  detailCardLarge: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: theme.card,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(94,114,228,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 6,
  },
  detailSubtle: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailProgressBg: {
    height: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  detailProgressFill: {
    height: '100%',
    backgroundColor: '#5E72E4',
    borderRadius: 6,
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  detailCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    backgroundColor: theme.card,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
});


