import {
    acceptFriendRequest,
    Friend,
    FriendRequest,
    getFriendRequests,
    getFriends,
    getSentFriendRequests,
    removeFriend,
    searchUsers,
    sendFriendRequest,
} from "@/services/friends-sync";
import { useStorage } from "@/services/StorageContext";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

export const useFriendsSync = () => {
  const { userProfile, isOnline, syncProfileToSupabase } = useStorage();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [sentRequestUserIds, setSentRequestUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Search for users by friend code or display name
   */
  const handleSearchUsers = useCallback(
    async (query: string) => {
      if (!userProfile || !isOnline) {
        Alert.alert("Offline", "Friend search requires internet connection");
        return;
      }

      if (!query.trim()) {
        Alert.alert(
          "Empty Search",
          "Please enter a friend code or display name",
        );
        return;
      }

      try {
        setIsLoading(true);
        const [results, sentRequests] = await Promise.all([
          searchUsers(query, userProfile.user_id),
          getSentFriendRequests(userProfile.user_id),
        ]);

        const pendingTargets = new Set(
          sentRequests.map((request) => request.to_user_id),
        );

        setSentRequestUserIds(Array.from(pendingTargets));
        setSearchResults(
          results.map((result) => ({
            ...result,
            hasPendingRequest: pendingTargets.has(result.user_id),
          })),
        );
      } catch (error) {
        console.error("Search error:", error);
        Alert.alert("Error", "Failed to search users");
      } finally {
        setIsLoading(false);
      }
    },
    [userProfile, isOnline],
  );

  /**
   * Send a friend request
   */
  const handleSendFriendRequest = useCallback(
    async (toUserId: string) => {
      if (!userProfile || !isOnline) {
        Alert.alert("Offline", "Friend requests require internet connection");
        return;
      }

      if (sentRequestUserIds.includes(toUserId)) {
        Alert.alert("Already Sent", "Friend request already sent");
        return;
      }

      try {
        setIsLoading(true);

        // Ensure local-first changes are pushed before social mutation.
        const syncSuccess = await syncProfileToSupabase();

        if (!syncSuccess) {
          Alert.alert("Error", "Failed to sync profile before sending request");
          return;
        }

        // Now send the friend request with synced user data
        const success = await sendFriendRequest(
          userProfile.user_id,
          toUserId,
          userProfile.username,
          userProfile.avatar_url,
          userProfile.display_name || userProfile.username,
          userProfile.friend_code || null,
        );

        if (success) {
          Alert.alert("Success", "Friend request sent!");
          setSentRequestUserIds((prev) =>
            prev.includes(toUserId) ? prev : [...prev, toUserId],
          );
          setSearchResults((prev) =>
            prev.map((u) =>
              u.user_id === toUserId ? { ...u, hasPendingRequest: true } : u,
            ),
          );
        } else {
          Alert.alert("Error", "Failed to send friend request");
        }
      } catch (error) {
        console.error("Send request error:", error);
        Alert.alert("Error", "Failed to send friend request");
      } finally {
        setIsLoading(false);
      }
    },
    [userProfile, isOnline, syncProfileToSupabase, sentRequestUserIds],
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
      console.error("Load friends error:", error);
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
      console.error("Load requests error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, isOnline]);

  /**
   * Accept a friend request
   */
  const handleAcceptFriendRequest = useCallback(
    async (
      requestId: string,
      fromUserId: string,
      fromUsername: string,
      fromAvatarUrl: string | null,
      fromXp: number,
      fromStreak: number,
    ) => {
      if (!userProfile || !isOnline) {
        Alert.alert("Offline", "Action requires internet connection");
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
          userProfile.current_streak,
        );

        if (success) {
          Alert.alert("Success", "Friend request accepted!");
          // Reload both lists
          await Promise.all([loadFriends(), loadFriendRequests()]);
        } else {
          Alert.alert("Error", "Failed to accept friend request");
        }
      } catch (error) {
        console.error("Accept request error:", error);
        Alert.alert("Error", "Failed to accept friend request");
      } finally {
        setIsLoading(false);
      }
    },
    [userProfile, isOnline, loadFriends, loadFriendRequests],
  );

  /**
   * Remove a friend
   */
  const handleRemoveFriend = useCallback(
    async (friendId: string) => {
      if (!userProfile || !isOnline) {
        Alert.alert("Offline", "Action requires internet connection");
        return;
      }

      Alert.alert("Remove Friend", "Are you sure?", [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Remove",
          onPress: async () => {
            try {
              setIsLoading(true);
              const success = await removeFriend(userProfile.user_id, friendId);
              if (success) {
                Alert.alert("Success", "Friend removed");
                await loadFriends();
              } else {
                Alert.alert("Error", "Failed to remove friend");
              }
            } catch (error) {
              console.error("Remove friend error:", error);
              Alert.alert("Error", "Failed to remove friend");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]);
    },
    [userProfile, isOnline, loadFriends],
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
