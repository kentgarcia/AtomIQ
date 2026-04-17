import { isSupabaseConfigured, supabase } from "./supabase";

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  username: string | null;
  display_name?: string | null;
  friend_code?: string | null;
  is_npc?: boolean | null;
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
  from_display_name?: string | null;
  from_friend_code?: string | null;
  from_avatar_url: string | null;
  status: string | null;
  created_at: string | null;
}

type SocialUserShape = {
  user_id: string;
  username?: string | null;
  display_name?: string | null;
  friend_code?: string | null;
  avatar_url?: string | null;
  total_xp?: number | null;
  current_streak?: number | null;
  is_npc?: boolean | null;
};

const NPC_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const NPC_NAME_PREFIXES = [
  "Astra",
  "Nova",
  "Lyra",
  "Orion",
  "Vega",
  "Helio",
  "Quanta",
  "Iris",
  "Rhea",
  "Selene",
] as const;
const NPC_NAME_SUFFIXES = [
  "Pulse",
  "Flux",
  "Ray",
  "Field",
  "Helix",
  "Core",
  "Ion",
  "Vector",
  "Spark",
  "Quark",
] as const;

const hashSeed = (seed: string): number => {
  let hash = 2166136261;

  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const isGenericNpcValue = (value?: string | null): boolean => {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return (
    normalized.startsWith("npc") ||
    normalized.includes("npc_user") ||
    normalized.includes("npc-code") ||
    normalized.includes("npc_code") ||
    normalized.includes("npc code")
  );
};

const isGenericNpcCode = (value?: string | null): boolean => {
  if (!value) {
    return true;
  }

  const normalized = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (!normalized) {
    return true;
  }

  return normalized.startsWith("NPC") || normalized === "NPCCODE";
};

const buildNaturalNpcCode = (seed: string): string => {
  let state = hashSeed(seed || "NPC");
  let code = "";

  for (let index = 0; index < 6; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    code += NPC_CODE_ALPHABET[state % NPC_CODE_ALPHABET.length];
  }

  return code;
};

const buildNaturalNpcName = (seed: string): string => {
  const hashedSeed = hashSeed(seed || "npc");
  const prefix = NPC_NAME_PREFIXES[hashedSeed % NPC_NAME_PREFIXES.length];
  const suffix =
    NPC_NAME_SUFFIXES[
      Math.floor(hashedSeed / NPC_NAME_PREFIXES.length) %
        NPC_NAME_SUFFIXES.length
    ];

  return `${prefix} ${suffix}`;
};

const normalizeSocialUserRecord = <T extends SocialUserShape>(record: T): T => {
  const isNpc = Boolean(record.is_npc);
  const seed =
    record.user_id || record.username || record.display_name || "npc";

  const generatedNpcName = buildNaturalNpcName(seed);
  const displayName = isNpc
    ? isGenericNpcValue(record.display_name)
      ? generatedNpcName
      : record.display_name
    : record.display_name || null;

  const username = isNpc
    ? isGenericNpcValue(record.username)
      ? displayName || generatedNpcName
      : record.username
    : record.username || displayName || "Unknown Explorer";

  const friendCode = isNpc
    ? isGenericNpcCode(record.friend_code)
      ? buildNaturalNpcCode(seed)
      : record.friend_code
    : record.friend_code || null;

  return {
    ...record,
    username,
    display_name: displayName,
    friend_code: friendCode,
    total_xp: Number(record.total_xp || 0),
    current_streak: Number(record.current_streak || 0),
  };
};

/**
 * Search for users by friend code, display name, or username on Supabase
 */
export const searchUsers = async (
  query: string,
  currentUserId?: string,
): Promise<any[]> => {
  if (!isSupabaseConfigured()) {
    console.warn("Supabase not configured, search unavailable");
    return [];
  }

  try {
    const normalizedQuery = query.trim();
    const sanitizedQuery = normalizedQuery.replace(/[,%]/g, "");
    const friendCodeCandidate = sanitizedQuery.toUpperCase();
    const isFriendCodeQuery = /^[A-Z0-9]{6}$/.test(friendCodeCandidate);
    const fields =
      "id, user_id, username, display_name, friend_code, avatar_url, total_xp, current_streak, is_npc";

    if (isFriendCodeQuery) {
      try {
        const { data: codeData, error: codeError } = await supabase
          .from("users")
          .select(fields)
          .eq("friend_code", friendCodeCandidate)
          .limit(10);

        if (!codeError && codeData) {
          const normalizedCodeData = (codeData || []).map((user) =>
            normalizeSocialUserRecord(user),
          );

          if (currentUserId) {
            return normalizedCodeData.filter(
              (user) => user.user_id !== currentUserId,
            );
          }

          return normalizedCodeData;
        }
      } catch {
        // Continue to fallback search for older schemas.
      }
    }

    let data: any[] | null = null;

    try {
      const { data: richData, error: richError } = await supabase
        .from("users")
        .select(fields)
        .or(
          `display_name.ilike.%${sanitizedQuery}%,username.ilike.%${sanitizedQuery}%`,
        )
        .limit(10);

      if (richError) {
        throw richError;
      }

      data = richData;
    } catch {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("users")
        .select(
          "id, user_id, username, avatar_url, total_xp, current_streak, is_npc",
        )
        .ilike("username", `%${sanitizedQuery}%`)
        .limit(10);

      if (fallbackError) {
        throw fallbackError;
      }

      data = fallbackData;
    }

    // Filter out current user if provided
    const normalizedData = (data || []).map((user) =>
      normalizeSocialUserRecord(user),
    );

    if (currentUserId) {
      return normalizedData.filter((user) => user.user_id !== currentUserId);
    }

    return normalizedData;
  } catch (error) {
    console.error("Error searching users:", error);
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
  fromAvatarUrl: string | null,
  fromDisplayName?: string | null,
  fromFriendCode?: string | null,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.warn("Supabase not configured, friend request unavailable");
    return false;
  }

  try {
    const payload = {
      from_user_id: fromUserId,
      to_user_id: toUserId,
      from_username: fromUsername,
      from_display_name: fromDisplayName || fromUsername,
      from_friend_code: fromFriendCode || null,
      from_avatar_url: fromAvatarUrl,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("friend_requests").insert(payload);

    if (error) {
      const errorMessage = error.message.toLowerCase();

      // Backward compatibility for environments where snapshot columns are missing.
      if (
        errorMessage.includes("from_display_name") ||
        errorMessage.includes("from_friend_code")
      ) {
        const { error: fallbackError } = await supabase
          .from("friend_requests")
          .insert({
            from_user_id: fromUserId,
            to_user_id: toUserId,
            from_username: fromUsername,
            from_avatar_url: fromAvatarUrl,
            status: "pending",
            created_at: new Date().toISOString(),
          });

        if (fallbackError) {
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }

    return true;
  } catch (error) {
    console.error("Error sending friend request:", error);
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
  toStreak: number,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.warn(
      "Supabase not configured, friend request acceptance unavailable",
    );
    return false;
  }

  try {
    // Update request status
    const { error: updateError } = await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", requestId);

    if (updateError) throw updateError;

    // Add friend relationship both ways
    const { error: addError } = await supabase.from("friends").insert([
      {
        user_id: toUserId,
        friend_id: fromUserId,
        status: "accepted",
        created_at: new Date().toISOString(),
      },
      {
        user_id: fromUserId,
        friend_id: toUserId,
        username: toUsername,
        avatar_url: toAvatarUrl,
        total_xp: toXp,
        current_streak: toStreak,
        status: "accepted",
        created_at: new Date().toISOString(),
      },
    ]);

    if (addError) throw addError;
    return true;
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return false;
  }
};

/**
 * Get list of friends
 */
export const getFriends = async (userId: string): Promise<Friend[]> => {
  if (!isSupabaseConfigured()) {
    console.warn("Supabase not configured, friends list unavailable");
    return [];
  }

  try {
    const { data: friendRows, error } = await supabase
      .from("friends")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "accepted");

    if (error) throw error;

    if (!friendRows || friendRows.length === 0) {
      return [];
    }

    const friendIds = Array.from(
      new Set(
        friendRows
          .map((friend) => friend.friend_id)
          .filter((friendId): friendId is string => Boolean(friendId)),
      ),
    );

    const profileFields =
      "user_id, username, display_name, friend_code, avatar_url, total_xp, current_streak, is_npc";

    const profileMap = new Map<string, SocialUserShape>();
    if (friendIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("users")
        .select(profileFields)
        .in("user_id", friendIds);

      if (profilesError) {
        throw profilesError;
      }

      for (const profile of profiles || []) {
        profileMap.set(profile.user_id, profile);
      }
    }

    return friendRows.map((friendRow) => {
      const profile = profileMap.get(friendRow.friend_id);
      const normalized = normalizeSocialUserRecord({
        user_id: friendRow.friend_id,
        username: profile?.username ?? friendRow.username,
        display_name: profile?.display_name ?? null,
        friend_code: profile?.friend_code ?? null,
        avatar_url: profile?.avatar_url ?? friendRow.avatar_url,
        total_xp: profile?.total_xp ?? friendRow.total_xp,
        current_streak: profile?.current_streak ?? friendRow.current_streak,
        is_npc: profile?.is_npc ?? false,
      });

      return {
        ...friendRow,
        username: normalized.username,
        display_name: normalized.display_name,
        friend_code: normalized.friend_code,
        avatar_url: normalized.avatar_url || null,
        total_xp: normalized.total_xp || 0,
        current_streak: normalized.current_streak || 0,
        is_npc: normalized.is_npc || false,
      } as Friend;
    });
  } catch (error) {
    console.error("Error fetching friends:", error);
    return [];
  }
};

/**
 * Get pending friend requests for a user
 */
export const getFriendRequests = async (
  userId: string,
): Promise<FriendRequest[]> => {
  if (!isSupabaseConfigured()) {
    console.warn("Supabase not configured, friend requests unavailable");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("to_user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    return [];
  }
};

/**
 * Get pending friend requests sent by a user
 */
export const getSentFriendRequests = async (
  userId: string,
): Promise<FriendRequest[]> => {
  if (!isSupabaseConfigured()) {
    console.warn("Supabase not configured, sent friend requests unavailable");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("from_user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching sent friend requests:", error);
    return [];
  }
};

/**
 * Remove a friend
 */
export const removeFriend = async (
  userId: string,
  friendId: string,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.warn("Supabase not configured, friend removal unavailable");
    return false;
  }

  try {
    // Remove both directions
    const { error } = await supabase
      .from("friends")
      .delete()
      .or(
        `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`,
      );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error removing friend:", error);
    return false;
  }
};

/**
 * Reject a friend request
 */
export const rejectFriendRequest = async (
  requestId: string,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.warn(
      "Supabase not configured, friend request rejection unavailable",
    );
    return false;
  }

  try {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    return false;
  }
};

export default {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  getFriendRequests,
  getSentFriendRequests,
  removeFriend,
  rejectFriendRequest,
};
