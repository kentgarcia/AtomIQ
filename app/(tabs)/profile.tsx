import { Icon } from '@/components/ui/icon';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColors } from '@/hooks/use-theme-colors';
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
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const { userProfile } = useStorage();
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
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
      { id: 1, label: 'Streak', value: userProfile.current_streak.toString(), icon: 'Flash', color: '#FF9600' },
      { id: 2, label: 'Best', value: (userProfile.longest_streak || 0).toString(), icon: 'Trophy', color: '#FFD700' },
      { id: 3, label: 'Myths', value: mythsBusted.toString(), icon: 'TickCircle', color: '#2ECC71' },
      { id: 4, label: 'Lessons', value: lessonsCompleted.toString(), icon: 'Book', color: '#EA580C' },
    ];
  }, [userProfile]);

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
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Loading profile...</Text>
      </View>
    );
  }

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      {/* Fixed Top Section */}
      <View style={{ zIndex: 1 }}>
        {/* Cover Photo / Banner */}
        <View style={styles.bannerContainer}>
          <LinearGradient
            colors={['#EA580C', '#F97316']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          />
          
          {/* Pattern Overlay */}
          <View style={[StyleSheet.absoluteFill, { opacity: 0.3 }]}>
            <Svg height="100%" width="100%">
              <Defs>
                <Pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <Circle cx="2" cy="2" r="2" fill="#FFFFFF" opacity="0.5" />
                </Pattern>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#dots)" />
            </Svg>
          </View>

          {/* Fade to Background Gradient */}
          <LinearGradient
            colors={[isDark ? 'rgba(13,13,13,0)' : 'rgba(255,255,255,0)', colors.background]}
            style={[StyleSheet.absoluteFill, { top: '30%' }]} 
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          <TouchableOpacity 
            style={styles.settingsButton} 
            onPress={() => router.push('/settings')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.settingsIconBlur}>
              <Icon name="Setting" size={24} color="#FFFFFF" variant="Bold" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Profile Header Info */}
        <View style={styles.profileHeader}>
          <View style={styles.headerTopRow}>
            <View style={styles.avatarContainer}>
              <Image 
                source={require('@/assets/images/mascot/profile.png')} 
                style={styles.avatar} 
                resizeMode="contain"
              />
              <View style={styles.onlineIndicator} />
            </View>
            <TouchableOpacity style={styles.editProfileButton} onPress={() => setEditModalVisible(true)}>
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.name}>{userProfile.username}</Text>
            <Text style={styles.handle}>@{userProfile.username.toLowerCase()} • {userTitle}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]} 
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'stats' && styles.activeTab]} 
            onPress={() => setActiveTab('stats')}
          >
            <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'friends' && styles.activeTab]} 
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>Friends</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
        {/* Content Area */}
        <View style={styles.contentArea}>
          {activeTab === 'overview' && (
            <Animated.View entering={FadeInDown.duration(400)}>
              {/* Level Progress */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Level Progress</Text>
                  <Text style={styles.xpText}>{userProfile.total_xp.toLocaleString()} XP</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${(userProfile.total_xp % 100)}%` }]} />
                </View>
                <Text style={styles.nextLevelText}>
                  {100 - (userProfile.total_xp % 100)} XP until Level {userLevel + 1}
                </Text>
              </View>

              {/* Quick Stats Grid */}
              <View style={styles.statsGrid}>
                {stats.map((stat) => (
                  <View key={stat.id} style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: stat.color + '15' }]}>
                      <Icon name={stat.icon as any} size={20} color={stat.color} variant="Bold" />
                    </View>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {activeTab === 'stats' && (
             <Animated.View entering={FadeInDown.duration(400)}>
               <View style={styles.emptyTabState}>
                 <Icon name="Chart" size={48} color={colors.textSecondary} variant="Bulk" />
                 <Text style={styles.emptyTabTitle}>Detailed Stats</Text>
                 <Text style={styles.emptyTabDesc}>More detailed statistics and charts coming soon!</Text>
               </View>
             </Animated.View>
          )}

          {activeTab === 'friends' && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <TouchableOpacity style={styles.addFriendBar} onPress={handleSearchFriends}>
                <View style={styles.addFriendIcon}>
                  <Icon name="Add" size={20} color="#FFF" />
                </View>
                <Text style={styles.addFriendText}>Find and add friends</Text>
              </TouchableOpacity>
              
              <View style={styles.emptyTabState}>
                 <Icon name="Profile2User" size={48} color={colors.textSecondary} variant="Bulk" />
                 <Text style={styles.emptyTabTitle}>No Friends Yet</Text>
                 <Text style={styles.emptyTabDesc}>Connect with other learners to compete and share progress.</Text>
               </View>
            </Animated.View>
          )}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.closeButton}>
                <Icon name="CloseCircle" size={24} color={colors.textSecondary} variant="Bold" />
              </TouchableOpacity>
            </View>
            
            <View style={{ padding: 20, alignItems: 'center' }}>
               <Image 
                source={require('@/assets/images/mascot/profile.png')} 
                style={{ width: 100, height: 100, marginBottom: 20 }} 
                resizeMode="contain"
              />
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                Profile editing functionality coming soon!
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
                <Icon name="CloseCircle" size={24} color={colors.textSecondary} variant="Bold" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBar}>
              <Icon name="SearchNormal" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Enter username..."
                placeholderTextColor={colors.textSecondary}
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
                  <Icon name="Profile2User" size={48} color={colors.textSecondary} variant="Bulk" />
                  <Text style={styles.modalEmptyText}>
                    {searchQuery ? 'No users found' : 'Search for friends by username'}
                  </Text>
                </View>
              ) : (
                searchResults.map((user, index) => (
                  <View key={index} style={styles.searchResultItem}>
                    <View style={styles.searchResultAvatar}>
                      <Icon name="Profile" size={24} color={colors.primary} variant="Bold" />
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

const createStyles = (colors: any, isDark: boolean) => {
  const borderColor = isDark ? '#333333' : '#E5E5E5';
  const cardBorderColor = isDark ? '#333333' : '#E0E0E0';
  
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flex: 1,
  },
    // Banner
  bannerContainer: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  settingsButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  settingsIconBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Profile Header
  profileHeader: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -40,
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: colors.background,
    backgroundColor: colors.card,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2ECC71',
    borderWidth: 3,
    borderColor: colors.background,
  },
  editProfileButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: borderColor,
    backgroundColor: colors.card,
    marginBottom: 0,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  userInfo: {
    marginTop: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  handle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 12,
    fontWeight: '500',
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: borderColor,
    paddingHorizontal: 20,
  },
  tab: {
    paddingVertical: 14,
    marginRight: 24,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginBottom: -2, // Overlap the container border
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
  },
  // Content Area
  contentArea: {
    padding: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: cardBorderColor,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  xpText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBarBg: {
    height: 16,
    backgroundColor: isDark ? '#333' : '#F0F0F0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  nextLevelText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    width: (width - 52) / 2, // 20px padding * 2 + 12px gap = 52
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: cardBorderColor,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  // Friends Tab
  addFriendBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.primaryDark || '#4A148C', // Fallback if primaryDark missing
  },
  addFriendIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addFriendText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyTabState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTabTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyTabDesc: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 22,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
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
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: borderColor,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  searchButton: {
    backgroundColor: colors.primary,
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
    color: colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: cardBorderColor,
  },
  searchResultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
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
    color: colors.text,
    marginBottom: 4,
  },
  searchResultStats: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
};

