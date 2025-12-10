import { isSupabaseConfigured, supabase } from './supabase';

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  username: string | null;
  avatar_url: string | null;
  total_xp: number | null;
  current_streak: number | null;
  status: string | null;
  created_at: string | null;
}

export interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_username: string;
  from_avatar_url: string | null;
  status: string | null;
  created_at: string | null;
}

/**
 * Search for users by username on Supabase
 */
export const searchUsers = async (query: string, currentUserId?: string): Promise<any[]> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, search unavailable');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, user_id, username, avatar_url, total_xp, current_streak, is_npc')
      .ilike('username', `%${query}%`)
      .limit(10);

    if (error) throw error;

    // Filter out current user if provided
    if (currentUserId) {
      return data?.filter(u => u.user_id !== currentUserId) || [];
    }

    return data || [];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

/**
 * Send a friend request
 */
export const sendFriendRequest = async (
  fromUserId: string,
  toUserId: string,
  fromUsername: string,
  fromAvatarUrl: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, friend request unavailable');
    return false;
  }

  try {
    const { error } = await supabase.from('friend_requests').insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      from_username: fromUsername,
      from_avatar_url: fromAvatarUrl,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error sending friend request:', error);
    return false;
  }
};

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (
  requestId: string,
  fromUserId: string,
  toUserId: string,
  toUsername: string,
  toAvatarUrl: string,
  toXp: number,
  toStreak: number
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, friend request acceptance unavailable');
    return false;
  }

  try {
    // Update request status
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // Add friend relationship both ways
    const { error: addError } = await supabase.from('friends').insert([
      {
        user_id: toUserId,
        friend_id: fromUserId,
        status: 'accepted',
        created_at: new Date().toISOString(),
      },
      {
        user_id: fromUserId,
        friend_id: toUserId,
        username: toUsername,
        avatar_url: toAvatarUrl,
        total_xp: toXp,
        current_streak: toStreak,
        status: 'accepted',
        created_at: new Date().toISOString(),
      },
    ]);

    if (addError) throw addError;
    return true;
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return false;
  }
};

/**
 * Get list of friends
 */
export const getFriends = async (userId: string): Promise<Friend[]> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, friends list unavailable');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('friends')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching friends:', error);
    return [];
  }
};

/**
 * Get pending friend requests for a user
 */
export const getFriendRequests = async (userId: string): Promise<FriendRequest[]> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, friend requests unavailable');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('to_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return [];
  }
};

/**
 * Remove a friend
 */
export const removeFriend = async (userId: string, friendId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, friend removal unavailable');
    return false;
  }

  try {
    // Remove both directions
    const { error } = await supabase
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing friend:', error);
    return false;
  }
};

/**
 * Reject a friend request
 */
export const rejectFriendRequest = async (requestId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, friend request rejection unavailable');
    return false;
  }

  try {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    return false;
  }
};

export default {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  getFriendRequests,
  removeFriend,
  rejectFriendRequest,
};
