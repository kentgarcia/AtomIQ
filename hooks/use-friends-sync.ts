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
import { normalizeProfileAvatarKey } from "@/services/profile-avatars";
import { useStorage } from "@/services/StorageContext";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

const FRIENDS_ONLINE_REQUIRED_MESSAGE =
  "Friend requests are online-only. Connect to the internet and sync your profile first.";
const FRIENDS_SYNC_REQUIRED_MESSAGE =
  "Please sync your profile online before sending friend requests, then try again.";
const FRIENDS_ACTION_SYNC_HINT =
  "Friend actions need internet and a recent sync. Connect online, sync your profile, then try again.";

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
        Alert.alert("Internet Required", FRIENDS_ONLINE_REQUIRED_MESSAGE);
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
      if (!userProfile) {
        Alert.alert(
          "Profile Required",
          "Finish setting up your profile, then connect online to send friend requests.",
        );
        return;
      }

      if (!isOnline) {
        Alert.alert("Internet Required", FRIENDS_ONLINE_REQUIRED_MESSAGE);
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
          Alert.alert("Sync Required", FRIENDS_SYNC_REQUIRED_MESSAGE);
          return;
        }

        // Now send the friend request with synced user data
        const success = await sendFriendRequest(
          userProfile.user_id,
          toUserId,
          userProfile.username,
          normalizeProfileAvatarKey(userProfile.avatar_url),
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
          Alert.alert(
            "Send Failed",
            "Could not send request right now. Make sure you are online and synced, then try again.",
          );
        }
      } catch (error) {
        console.error("Send request error:", error);
        Alert.alert(
          "Send Failed",
          "Could not send request right now. Make sure you are online and synced, then try again.",
        );
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
        Alert.alert("Internet Required", FRIENDS_ACTION_SYNC_HINT);
        return;
      }

      try {
        setIsLoading(true);
        const success = await acceptFriendRequest(
          requestId,
          fromUserId,
          userProfile.user_id,
          userProfile.username,
          normalizeProfileAvatarKey(userProfile.avatar_url),
          userProfile.total_xp,
          userProfile.current_streak,
        );

        if (success) {
          Alert.alert("Success", "Friend request accepted!");
          // Reload both lists
          await Promise.all([loadFriends(), loadFriendRequests()]);
        } else {
          Alert.alert(
            "Action Failed",
            "Unable to accept right now. Make sure you are online and synced, then try again.",
          );
        }
      } catch (error) {
        console.error("Accept request error:", error);
        Alert.alert(
          "Action Failed",
          "Unable to accept right now. Make sure you are online and synced, then try again.",
        );
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
        Alert.alert("Internet Required", FRIENDS_ACTION_SYNC_HINT);
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
                Alert.alert(
                  "Action Failed",
                  "Unable to remove friend right now. Make sure you are online and synced, then try again.",
                );
              }
            } catch (error) {
              console.error("Remove friend error:", error);
              Alert.alert(
                "Action Failed",
                "Unable to remove friend right now. Make sure you are online and synced, then try again.",
              );
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
