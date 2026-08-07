import { Icon } from "@/components/ui/icon";
import {useTheme, type Palette, fontFamilies} from "@/theme";
import useFriendsSync from "@/hooks/use-friends-sync";
import {
    PROFILE_AVATAR_OPTIONS,
    type ProfileAvatarKey,
    getProfileAvatarSource,
    normalizeProfileAvatarKey,
} from "@/services/profile-avatars";
import { useStorage } from "@/services/StorageContext";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Image,
    type ImageSourcePropType,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GRADIENTS } from "@/constants/gradients";

// Gradient Colors

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    userProfile,
    updateUserProfile,
    syncProfileToSupabase,
    isOnline,
    isSyncing: isBackgroundSyncing,
    pendingChanges,
    lastSyncedAt,
  } = useStorage();
  const {
    friends,
    friendRequests,
    searchResults,
    isLoading,
    handleSearchUsers,
    handleSendFriendRequest,
    loadFriends,
    loadFriendRequests,
    handleAcceptFriendRequest,
  } = useFriendsSync();
  const { theme } = useTheme();
  const THEME = theme.palettes.tab;
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(THEME, width), [THEME, width]);

  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

  // Load data per tab when online
  useEffect(() => {
    if (!isOnline) return;
    if (activeTab === "friends") {
      loadFriends();
    } else if (activeTab === "requests") {
      loadFriendRequests();
    }
  }, [activeTab, isOnline, loadFriends, loadFriendRequests]);

  // Calculate user level
  const userLevel = useMemo(() => {
    if (!userProfile) return 1;
    return Math.floor(userProfile.total_xp / 100) + 1;
  }, [userProfile]);

  // Calculate user title based on level
  const userTitle = useMemo(() => {
    if (userLevel < 5) return "Atomic Novice";
    if (userLevel < 10) return "Isotope Initiate";
    if (userLevel < 20) return "Fusion Explorer";
    return "Quantum Master";
  }, [userLevel]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!userProfile) return [];

    const lessonsCompleted = userProfile.lessons_completed || 0;
    const mythsBusted = userProfile.myths_busted || 0;

    return [
      {
        id: 1,
        label: "Streak",
        value: userProfile.current_streak.toString(),
        icon: "Flash",
        gradient: GRADIENTS.orange,
      },
      {
        id: 2,
        label: "Best",
        value: (userProfile.longest_streak || 0).toString(),
        icon: "Trophy",
        gradient: GRADIENTS.yellow,
      },
      {
        id: 3,
        label: "Myths",
        value: mythsBusted.toString(),
        icon: "TickCircle",
        gradient: GRADIENTS.green,
      },
      {
        id: 4,
        label: "Lessons",
        value: lessonsCompleted.toString(),
        icon: "Book",
        gradient: GRADIENTS.blue,
      },
    ];
  }, [userProfile]);

  // Stats helpers for detail view
  const totalLessons = 31;
  const totalMyths = 8;
  const lessonsProgress = Math.min(
    (userProfile?.lessons_completed || 0) / totalLessons,
    1,
  );
  const mythsProgress = Math.min(
    (userProfile?.myths_busted || 0) / totalMyths,
    1,
  );
  const levelProgress = Math.min(((userProfile?.total_xp || 0) % 100) / 100, 1);

  const handleSearchFriends = () => {
    if (!isOnline) {
      Alert.alert("Offline", "You need to be online to search for friends");
      return;
    }
    setSearchModalVisible(true);
  };

  const handleSearch = async () => {
    await handleSearchUsers(searchQuery);
    setSearchQuery("");
  };

  const handleAddFriend = async (userId: string) => {
    await handleSendFriendRequest(userId);
  };

  const selectedAvatarKey = normalizeProfileAvatarKey(userProfile?.avatar_url);

  const resolveFriendAvatarSource = (
    avatarUrl?: string | null,
  ): ImageSourcePropType => {
    const normalized = avatarUrl?.trim();
    if (!normalized) {
      return getProfileAvatarSource();
    }

    const lowerCased = normalized.toLowerCase();
    if (
      lowerCased.startsWith("http://") ||
      lowerCased.startsWith("https://") ||
      lowerCased.startsWith("file://") ||
      lowerCased.startsWith("data:")
    ) {
      return { uri: normalized };
    }

    return getProfileAvatarSource(normalized);
  };

  const handleSelectAvatar = async (avatarKey: ProfileAvatarKey) => {
    if (!userProfile || isSavingAvatar || avatarKey === selectedAvatarKey) {
      return;
    }

    try {
      setIsSavingAvatar(true);
      await updateUserProfile({ avatar_url: avatarKey });

      if (isOnline) {
        await syncProfileToSupabase();
      }

      setAvatarModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update profile avatar.");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const syncStatusText = useMemo(() => {
    if (!isOnline) {
      return "Offline mode";
    }

    if (isBackgroundSyncing) {
      return "Syncing changes...";
    }

    if (pendingChanges > 0) {
      return `${pendingChanges} change${pendingChanges === 1 ? "" : "s"} pending sync`;
    }

    if (lastSyncedAt) {
      return `Synced at ${new Date(lastSyncedAt).toLocaleTimeString()}`;
    }

    return "Online";
  }, [isOnline, isBackgroundSyncing, pendingChanges, lastSyncedAt]);

  if (!userProfile) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: THEME.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: THEME.textMuted }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/settings")}
            >
              <Icon name="Setting" size={24} color={THEME.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Image
                source={getProfileAvatarSource(userProfile.avatar_url)}
                style={styles.avatar}
                resizeMode="cover"
              />
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{userLevel}</Text>
              </View>
            </View>
            <Text style={styles.name}>
              {userProfile.display_name || userProfile.username}
            </Text>
            {userProfile.friend_code ? (
              <Text style={styles.friendCode}>
                Friend Code: {userProfile.friend_code}
              </Text>
            ) : null}
            <Text style={styles.title}>{userTitle}</Text>
            <Text style={styles.syncStatus}>{syncStatusText}</Text>

            <View style={styles.avatarPickerSection}>
              <Text style={styles.avatarPickerLabel}>Profile Avatar</Text>
              <TouchableOpacity
                style={[
                  styles.avatarPickerButton,
                  isSavingAvatar && styles.avatarPickerButtonDisabled,
                ]}
                onPress={() => setAvatarModalVisible(true)}
                disabled={isSavingAvatar}
                activeOpacity={0.85}
              >
                <Icon name="Profile" size={16} color="#FFFFFF" variant="Bold" />
                <Text style={styles.avatarPickerButtonText}>
                  {isSavingAvatar ? "Saving..." : "Change Avatar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {["overview", "friends", "requests"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab === "requests"
                  ? `Requests (${friendRequests.length})`
                  : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content Area */}
        <View style={styles.contentArea}>
          {activeTab === "overview" && (
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
                    <Text style={styles.xpText}>
                      {userProfile.total_xp.toLocaleString()} XP
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${userProfile.total_xp % 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.nextLevelText}>
                    {100 - (userProfile.total_xp % 100)} XP until Level{" "}
                    {userLevel + 1}
                  </Text>
                </LinearGradient>
              </View>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                {stats.map((stat, index) => (
                  <Animated.View
                    key={stat.id}
                    entering={FadeInDown.delay(100 + index * 50)}
                    style={styles.statItemContainer}
                  >
                    <LinearGradient
                      colors={stat.gradient}
                      style={styles.statGradient}
                    >
                      <View style={styles.statIconCircle}>
                        <Icon
                          name={stat.icon as any}
                          size={20}
                          color={stat.gradient[1]}
                          variant="Bold"
                        />
                      </View>
                      <Text style={styles.statValue}>{stat.value}</Text>
                      <Text style={styles.statLabel}>{stat.label}</Text>
                    </LinearGradient>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          )}

          {activeTab === "stats" && null}

          {activeTab === "friends" && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <View style={styles.requestHeader}>
                <Text style={styles.sectionTitle}>Friends</Text>
                <TouchableOpacity
                  style={[styles.refreshButton, isLoading && { opacity: 0.6 }]}
                  onPress={loadFriends}
                  disabled={isLoading}
                >
                  <Icon name="Refresh" size={18} color={THEME.primary} />
                  <Text style={styles.refreshButtonText}>
                    {isLoading ? "Refreshing..." : "Refresh"}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.addFriendButton}
                onPress={handleSearchFriends}
              >
                <LinearGradient
                  colors={GRADIENTS.purple}
                  style={styles.addFriendGradient}
                >
                  <Icon name="Add" size={24} color="#FFF" />
                  <Text style={styles.addFriendText}>Find Friends</Text>
                </LinearGradient>
              </TouchableOpacity>

              {friends.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Icon
                    name="Profile2User"
                    size={64}
                    color={THEME.textMuted}
                    variant="Bulk"
                  />
                  <Text style={styles.emptyStateTitle}>No Friends Yet</Text>
                  <Text style={styles.emptyStateDesc}>
                    Connect with other learners to compete and share progress.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ marginTop: 20 }}
                >
                  {friends.map((friend) => {
                    const friendName =
                      friend.display_name ||
                      friend.username ||
                      "Unknown Explorer";
                    const friendXp = Number(friend.total_xp || 0);
                    const friendStreak = Number(friend.current_streak || 0);
                    const friendCode = friend.friend_code
                      ? `Code: ${friend.friend_code} • `
                      : "";

                    return (
                      <View key={friend.friend_id} style={styles.friendCard}>
                        <View style={styles.friendAvatar}>
                          <Image
                            source={resolveFriendAvatarSource(
                              friend.avatar_url,
                            )}
                            style={styles.friendAvatarImage}
                            resizeMode="cover"
                          />
                        </View>
                        <View style={styles.friendInfo}>
                          <View style={styles.usernameBadgeRow}>
                            <Text style={styles.friendName}>{friendName}</Text>
                            {friend.is_npc ? (
                              <Text style={styles.npcLabel}>NPC</Text>
                            ) : null}
                          </View>
                          <Text style={styles.friendStats}>
                            {friendCode}
                            {friendXp} XP • Streak: {friendStreak}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </Animated.View>
          )}

          {activeTab === "requests" && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <View style={styles.requestHeader}>
                <Text style={styles.sectionTitle}>Friend Requests</Text>
                <TouchableOpacity
                  style={[styles.refreshButton, isLoading && { opacity: 0.6 }]}
                  onPress={loadFriendRequests}
                  disabled={isLoading}
                >
                  <Icon name="Refresh" size={18} color={THEME.primary} />
                  <Text style={styles.refreshButtonText}>
                    {isLoading ? "Refreshing..." : "Refresh"}
                  </Text>
                </TouchableOpacity>
              </View>

              {friendRequests.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Icon
                    name="Profile2User"
                    size={64}
                    color={THEME.textMuted}
                    variant="Bulk"
                  />
                  <Text style={styles.emptyStateTitle}>No Requests</Text>
                  <Text style={styles.emptyStateDesc}>
                    When someone sends you a friend request, it will appear
                    here.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ marginTop: 20 }}
                >
                  {friendRequests.map((request) => (
                    <View key={request.id} style={styles.requestCard}>
                      <View style={styles.requestContent}>
                        <View style={styles.friendAvatar}>
                          <Icon
                            name="Profile"
                            size={24}
                            color={THEME.primary}
                            variant="Bold"
                          />
                        </View>
                        <View style={styles.friendInfo}>
                          <Text style={styles.friendName}>
                            {request.from_display_name || request.from_username}
                          </Text>
                          <Text style={styles.friendStats}>
                            {request.from_friend_code
                              ? `Code: ${request.from_friend_code} • Wants to be friends`
                              : "Wants to be friends"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={styles.acceptButton}
                          onPress={() =>
                            handleAcceptFriendRequest(
                              request.id,
                              request.from_user_id,
                              request.from_display_name ||
                                request.from_username,
                              request.from_avatar_url,
                              0,
                              0,
                            )
                          }
                          disabled={isLoading}
                        >
                          <Icon
                            name="TickCircle"
                            size={20}
                            color="#FFF"
                            variant="Bold"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rejectButton}
                          onPress={() =>
                            Alert.alert("Reject", "This feature coming soon")
                          }
                          disabled={isLoading}
                        >
                          <Icon
                            name="Close"
                            size={20}
                            color={THEME.text}
                            variant="Bold"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </Animated.View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Avatar Picker Modal */}
      <Modal
        visible={avatarModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.avatarModalOverlay}>
          <View style={styles.avatarModalContent}>
            <View style={styles.avatarModalHeader}>
              <Text style={styles.avatarModalTitle}>Choose Avatar</Text>
              <TouchableOpacity
                onPress={() => setAvatarModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon
                  name="CloseCircle"
                  size={24}
                  color={THEME.textMuted}
                  variant="Bold"
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.avatarModalGrid}
            >
              {PROFILE_AVATAR_OPTIONS.map((avatarOption) => {
                const isSelected = selectedAvatarKey === avatarOption.key;

                return (
                  <TouchableOpacity
                    key={avatarOption.key}
                    style={[
                      styles.avatarModalOption,
                      isSelected && styles.avatarModalOptionSelected,
                      isSavingAvatar && styles.avatarModalOptionDisabled,
                    ]}
                    onPress={() => {
                      void handleSelectAvatar(avatarOption.key);
                    }}
                    activeOpacity={0.85}
                    disabled={isSavingAvatar}
                  >
                    <Image
                      source={avatarOption.source}
                      style={styles.avatarModalOptionImage}
                      resizeMode="cover"
                    />
                    {isSelected && (
                      <View style={styles.avatarModalCheck}>
                        <Icon
                          name="TickCircle"
                          size={16}
                          color="#22C55E"
                          variant="Bold"
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.avatarModalHint}>
              Tap an avatar to update your profile picture.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Search Friends Modal */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Friends</Text>
              <TouchableOpacity
                onPress={() => setSearchModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon
                  name="CloseCircle"
                  size={24}
                  color={THEME.textMuted}
                  variant="Bold"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBar}>
              <Icon name="SearchNormal" size={20} color={THEME.textMuted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Enter friend code or display name..."
                placeholderTextColor={THEME.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={handleSearch}
                style={[styles.searchButton, isLoading && { opacity: 0.6 }]}
                disabled={isLoading}
              >
                <Text style={styles.searchButtonText}>
                  {isLoading ? "Searching..." : "Search"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalResults}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {isLoading ? (
                <View style={styles.modalEmptyState}>
                  <Text style={styles.modalEmptyText}>Searching users...</Text>
                </View>
              ) : searchResults.length === 0 ? (
                <View style={styles.modalEmptyState}>
                  <Icon
                    name="Profile2User"
                    size={48}
                    color={THEME.textMuted}
                    variant="Bulk"
                  />
                  <Text style={styles.modalEmptyText}>
                    {searchQuery
                      ? "No users found"
                      : "Search for friends by friend code or display name"}
                  </Text>
                </View>
              ) : (
                searchResults.map((user, index) => (
                  <View key={index} style={styles.searchResultItem}>
                    <View style={styles.searchResultAvatar}>
                      <Icon
                        name="Profile"
                        size={24}
                        color={THEME.primary}
                        variant="Bold"
                      />
                      {user.is_npc && (
                        <View style={styles.npcBadge}>
                          <Icon
                            name="Star"
                            size={12}
                            color="#FFF"
                            variant="Bold"
                          />
                        </View>
                      )}
                    </View>
                    <View style={styles.searchResultInfo}>
                      <View style={styles.usernameBadgeRow}>
                        <Text style={styles.searchResultName}>
                          {user.display_name || user.username}
                        </Text>
                        {user.is_npc && (
                          <Text style={styles.npcLabel}>NPC</Text>
                        )}
                      </View>
                      <Text style={styles.searchResultStats}>
                        {user.friend_code ? `Code: ${user.friend_code} • ` : ""}
                        {user.total_xp} XP • Streak: {user.current_streak}
                      </Text>
                    </View>
                    {user.hasPendingRequest ? (
                      <View style={styles.sentButton}>
                        <Icon
                          name="TickCircle"
                          size={16}
                          color={THEME.primary}
                          variant="Bold"
                        />
                        <Text style={styles.sentButtonText}>Sent</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => handleAddFriend(user.user_id)}
                      >
                        <Icon
                          name="Add"
                          size={18}
                          color="#FFF"
                          variant="Bold"
                        />
                      </TouchableOpacity>
                    )}
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

const createStyles = (theme: Palette, width: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    header: {
      alignItems: "center",
      paddingBottom: 24,
      backgroundColor: theme.bg,
    },
    headerTopRow: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 20,
      position: "absolute",
      top: 60,
      zIndex: 10,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.card,
      alignItems: "center",
      justifyContent: "center",
    },
    profileInfo: {
      alignItems: "center",
      marginTop: 20,
    },
    avatarContainer: {
      position: "relative",
      marginBottom: 16,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.card,
    },
    levelBadge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      backgroundColor: "#5E72E4",
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: theme.bg,
    },
    levelText: {
      color: "#FFF",
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      fontSize: 14,
    },
    name: {
      fontSize: 24,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: theme.text,
      marginBottom: 4,
    },
    friendCode: {
      fontSize: 12,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: theme.primary,
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    title: {
      fontSize: 14,
      color: theme.textMuted,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
    },
    syncStatus: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
      marginTop: 4,
    },
    avatarPickerSection: {
      marginTop: 12,
      width: "100%",
      alignItems: "center",
    },
    avatarPickerLabel: {
      fontSize: 11,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: theme.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    avatarPickerButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 3,
      borderBottomColor: "rgba(0,0,0,0.15)",
    },
    avatarPickerButtonDisabled: {
      opacity: 0.65,
    },
    avatarPickerButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      letterSpacing: 0.2,
    },

    avatarModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.55)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    avatarModalContent: {
      width: "100%",
      maxWidth: 360,
      maxHeight: "74%",
      backgroundColor: theme.bg,
      borderRadius: 22,
      paddingTop: 16,
      paddingBottom: 14,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    avatarModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    avatarModalTitle: {
      fontSize: 20,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: theme.text,
    },
    avatarModalGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 12,
      paddingTop: 4,
      paddingBottom: 8,
    },
    avatarModalOption: {
      width: 64,
      height: 64,
      borderRadius: 32,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    avatarModalOptionSelected: {
      borderColor: theme.primary,
      borderWidth: 3,
    },
    avatarModalOptionDisabled: {
      opacity: 0.65,
    },
    avatarModalOptionImage: {
      width: "100%",
      height: "100%",
    },
    avatarModalCheck: {
      position: "absolute",
      bottom: 0,
      right: 0,
      backgroundColor: "#FFFFFF",
      borderRadius: 10,
      padding: 1,
    },
    avatarModalHint: {
      marginTop: 8,
      textAlign: "center",
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
    },
    tabsContainer: {
      flexDirection: "row",
      marginHorizontal: 20,
      backgroundColor: theme.card,
      padding: 4,
      borderRadius: 16,
      marginBottom: 24,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: 12,
    },
    activeTab: {
      backgroundColor: theme.bg,
    },
    tabText: {
      fontSize: 14,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
      color: theme.textMuted,
    },
    activeTabText: {
      color: theme.primary,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
    },
    contentArea: {
      paddingHorizontal: 20,
    },
    progressCard: {
      borderRadius: 24,
      overflow: "hidden",
      marginBottom: 24,
    },
    progressGradient: {
      padding: 20,
    },
    progressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    progressTitle: {
      fontSize: 18,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#FFF",
    },
    xpText: {
      fontSize: 14,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: "rgba(255,255,255,0.9)",
    },
    progressBarBg: {
      height: 8,
      backgroundColor: "rgba(0,0,0,0.2)",
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 8,
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: "#FFF",
      borderRadius: 4,
    },
    nextLevelText: {
      fontSize: 12,
      color: "rgba(255,255,255,0.8)",
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 16,
    },
    statItemContainer: {
      width: (width - 56) / 2,
      height: 120,
      borderRadius: 20,
      overflow: "hidden",
    },
    statGradient: {
      flex: 1,
      padding: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    statIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.9)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    statValue: {
      fontSize: 24,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#FFF",
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: "rgba(255,255,255,0.9)",
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
    },
    emptyStateContainer: {
      alignItems: "center",
      paddingVertical: 40,
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 24,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: theme.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyStateDesc: {
      fontSize: 14,
      fontFamily: fontFamilies.regular,
      color: theme.textMuted,
      textAlign: "center",
      lineHeight: 20,
    },
    addFriendButton: {
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 24,
    },
    addFriendGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      gap: 8,
    },
    addFriendText: {
      color: "#FFF",
      fontSize: 16,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: theme.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: "80%",
      paddingTop: 20,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: theme.text,
    },
    closeButton: {
      padding: 4,
    },
    modalSearchBar: {
      flexDirection: "row",
      alignItems: "center",
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
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
    },
    searchButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
    },
    searchButtonText: {
      color: "#FFF",
      fontSize: 14,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
    },
    modalResults: {
      flex: 1,
      paddingHorizontal: 20,
    },
    modalEmptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },
    modalEmptyText: {
      fontSize: 14,
      fontFamily: fontFamilies.regular,
      color: theme.textMuted,
      marginTop: 12,
      textAlign: "center",
    },
    searchResultItem: {
      flexDirection: "row",
      alignItems: "center",
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
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    searchResultInfo: {
      flex: 1,
    },
    searchResultName: {
      fontSize: 16,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: theme.text,
      marginBottom: 4,
    },
    searchResultStats: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
    },
    npcBadge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      backgroundColor: "#FFD66E",
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.card,
    },
    usernameBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    npcLabel: {
      fontSize: 10,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: "#FFD66E",
      backgroundColor: "rgba(255, 214, 110, 0.1)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    addButton: {
      backgroundColor: theme.primary,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    sentButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      minWidth: 64,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.primary,
      backgroundColor: "rgba(94,114,228,0.1)",
      paddingHorizontal: 10,
    },
    sentButtonText: {
      fontSize: 12,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: theme.primary,
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
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 3,
    },
    detailHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    detailIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(94,114,228,0.1)",
      alignItems: "center",
      justifyContent: "center",
    },
    detailLabel: {
      fontSize: 14,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
    },
    detailValue: {
      fontSize: 24,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      marginTop: 6,
      marginBottom: 6,
    },
    detailSubtle: {
      fontSize: 12,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
    },
    detailProgressBg: {
      height: 10,
      borderRadius: 6,
      backgroundColor: "rgba(0,0,0,0.06)",
      overflow: "hidden",
    },
    detailProgressFill: {
      height: "100%",
      backgroundColor: "#5E72E4",
      borderRadius: 6,
    },
    detailGrid: {
      flexDirection: "row",
      gap: 12,
    },
    detailCard: {
      flex: 1,
      borderRadius: 16,
      padding: 14,
      backgroundColor: theme.card,
      gap: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    friendCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    friendAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: "rgba(94,114,228,0.1)",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      marginRight: 12,
    },
    friendAvatarImage: {
      width: "100%",
      height: "100%",
    },
    friendInfo: {
      flex: 1,
    },
    friendName: {
      fontSize: 16,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: theme.text,
      marginBottom: 2,
    },
    friendStats: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: "500",
      fontFamily: fontFamilies.medium,
    },
    requestHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: theme.text,
    },
    refreshButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    refreshButtonText: {
      fontSize: 12,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: theme.primary,
    },
    requestCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    requestContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    requestActions: {
      flexDirection: "row",
      gap: 8,
    },
    acceptButton: {
      backgroundColor: "#4FD1C5",
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    rejectButton: {
      backgroundColor: theme.border,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
  });
