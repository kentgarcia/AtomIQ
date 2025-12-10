import {
    acceptFriendRequest,
    Friend,
    FriendRequest,
    getFriendRequests,
    getFriends,
    removeFriend,
    searchUsers,
    sendFriendRequest,
} from '@/services/friends-sync';
import { syncProfileToSupabase } from '@/services/profile-sync';
import { useStorage } from '@/services/StorageContext';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

export const useFriendsSync = () => {
  const { userProfile, isOnline } = useStorage();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Search for users by username
   */
  const handleSearchUsers = useCallback(
    async (query: string) => {
      if (!userProfile || !isOnline) {
        Alert.alert('Offline', 'Friend search requires internet connection');
        return;
      }

      if (!query.trim()) {
        Alert.alert('Empty Search', 'Please enter a username');
        return;
      }

      try {
        setIsLoading(true);
        const results = await searchUsers(query, userProfile.user_id);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        Alert.alert('Error', 'Failed to search users');
      } finally {
        setIsLoading(false);
      }
    },
    [userProfile, isOnline]
  );

  /**
   * Send a friend request
   */
  const handleSendFriendRequest = useCallback(
    async (toUserId: string) => {
      if (!userProfile || !isOnline) {
        Alert.alert('Offline', 'Friend requests require internet connection');
        return;
      }

      try {
        setIsLoading(true);
        
        // Sync profile first to ensure sender data is up-to-date on Supabase
        const syncSuccess = await syncProfileToSupabase({
          user_id: userProfile.user_id,
          username: userProfile.username,
          avatar_url: userProfile.avatar_url,
          total_xp: userProfile.total_xp,
          current_streak: userProfile.current_streak,
          longest_streak: userProfile.longest_streak,
          myths_busted: userProfile.myths_busted,
          lessons_completed: userProfile.lessons_completed,
        });

        if (!syncSuccess) {
          Alert.alert('Error', 'Failed to sync profile before sending request');
          return;
        }

        // Now send the friend request with synced user data
        const success = await sendFriendRequest(
          userProfile.user_id,
          toUserId,
          userProfile.username,
          userProfile.avatar_url
        );

        if (success) {
          Alert.alert('Success', 'Friend request sent!');
          // Remove from search results
          setSearchResults(prev => prev.filter(u => u.user_id !== toUserId));
        } else {
          Alert.alert('Error', 'Failed to send friend request');
        }
      } catch (error) {
        console.error('Send request error:', error);
        Alert.alert('Error', 'Failed to send friend request');
      } finally {
        setIsLoading(false);
      }
    },
    [userProfile, isOnline]
  );

  /**
   * Load friends list
   */
  const loadFriends = useCallback(async () => {
    if (!userProfile || !isOnline) {
      return;
    }

    try {
      setIsLoading(true);
      const friendsList = await getFriends(userProfile.user_id);
      setFriends(friendsList);
    } catch (error) {
      console.error('Load friends error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, isOnline]);

  /**
   * Load friend requests
   */
  const loadFriendRequests = useCallback(async () => {
    if (!userProfile || !isOnline) {
      return;
    }

    try {
      setIsLoading(true);
      const requests = await getFriendRequests(userProfile.user_id);
      setFriendRequests(requests);
    } catch (error) {
      console.error('Load requests error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, isOnline]);

  /**
   * Accept a friend request
   */
  const handleAcceptFriendRequest = useCallback(
    async (requestId: string, fromUserId: string, fromUsername: string, fromAvatarUrl: string | null, fromXp: number, fromStreak: number) => {
      if (!userProfile || !isOnline) {
        Alert.alert('Offline', 'Action requires internet connection');
        return;
      }

      try {
        setIsLoading(true);
        const success = await acceptFriendRequest(
          requestId,
          fromUserId,
          userProfile.user_id,
          userProfile.username,
          userProfile.avatar_url,
          userProfile.total_xp,
          userProfile.current_streak
        );

        if (success) {
          Alert.alert('Success', 'Friend request accepted!');
          // Reload both lists
          await Promise.all([loadFriends(), loadFriendRequests()]);
        } else {
          Alert.alert('Error', 'Failed to accept friend request');
        }
      } catch (error) {
        console.error('Accept request error:', error);
        Alert.alert('Error', 'Failed to accept friend request');
      } finally {
        setIsLoading(false);
      }
    },
    [userProfile, isOnline, loadFriends, loadFriendRequests]
  );

  /**
   * Remove a friend
   */
  const handleRemoveFriend = useCallback(
    async (friendId: string) => {
      if (!userProfile || !isOnline) {
        Alert.alert('Offline', 'Action requires internet connection');
        return;
      }

      Alert.alert('Remove Friend', 'Are you sure?', [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Remove',
          onPress: async () => {
            try {
              setIsLoading(true);
              const success = await removeFriend(userProfile.user_id, friendId);
              if (success) {
                Alert.alert('Success', 'Friend removed');
                await loadFriends();
              } else {
                Alert.alert('Error', 'Failed to remove friend');
              }
            } catch (error) {
              console.error('Remove friend error:', error);
              Alert.alert('Error', 'Failed to remove friend');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]);
    },
    [userProfile, isOnline, loadFriends]
  );

  return {
    friends,
    friendRequests,
    searchResults,
    isLoading,
    handleSearchUsers,
    handleSendFriendRequest,
    loadFriends,
    loadFriendRequests,
    handleAcceptFriendRequest,
    handleRemoveFriend,
  };
};

export default useFriendsSync;
