import {
    ensureSupabaseAuthUserId,
    isSupabaseConfigured,
    supabase,
} from "./supabase";

export interface UserProfileSync {
  user_id: string;
  username: string;
  display_name?: string;
  friend_code?: string | null;
  display_name_updated_at?: number | null;
  next_display_name_change_at?: number | null;
  avatar_url: string | null;
  total_xp: number | null;
  current_streak: number | null;
  longest_streak: number | null;
  myths_busted: number | null;
  lessons_completed: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  synced_at?: string; // Last sync timestamp for offline-first tracking
}

/**
 * Push local profile to Supabase (upsert)
 */
export const syncProfileToSupabase = async (
  profile: UserProfileSync,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.log("Supabase not configured, skipping profile sync");
    return false;
  }

  try {
    const authUserId = await ensureSupabaseAuthUserId();
    if (!authUserId) {
      console.warn("Unable to initialize Supabase auth user for profile sync");
      return false;
    }

    const { error } = await supabase.from("users").upsert(
      {
        id: authUserId,
        user_id: profile.user_id,
        username: profile.username,
        display_name: profile.display_name || profile.username,
        friend_code: profile.friend_code || null,
        display_name_updated_at:
          profile.display_name_updated_at !== undefined &&
          profile.display_name_updated_at !== null &&
          profile.display_name_updated_at > 0
            ? new Date(profile.display_name_updated_at).toISOString()
            : null,
        next_display_name_change_at:
          profile.next_display_name_change_at !== undefined &&
          profile.next_display_name_change_at !== null &&
          profile.next_display_name_change_at > 0
            ? new Date(profile.next_display_name_change_at).toISOString()
            : null,
        avatar_url: profile.avatar_url,
        total_xp: profile.total_xp,
        current_streak: profile.current_streak,
        longest_streak: profile.longest_streak,
        myths_busted: profile.myths_busted,
        lessons_completed: profile.lessons_completed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id", defaultToNull: false },
    );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error syncing profile to Supabase:", error);
    return false;
  }
};

/**
 * Pull profile from Supabase
 */
export const syncProfileFromSupabase = async (
  userId: string,
): Promise<UserProfileSync | null> => {
  if (!isSupabaseConfigured()) {
    console.log("Supabase not configured, skipping profile fetch");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching profile from Supabase:", error);
    return null;
  }
};

/**
 * Merge local and remote profiles (for conflict resolution)
 * Strategy: Use server version if newer, otherwise keep local
 */
export const mergeProfileChanges = (
  localProfile: UserProfileSync,
  remoteProfile: UserProfileSync | null,
): UserProfileSync => {
  if (!remoteProfile) return localProfile;

  const localUpdated = new Date(localProfile.updated_at || 0).getTime();
  const remoteUpdated = new Date(remoteProfile.updated_at || 0).getTime();

  // If remote is newer, use it; otherwise use local
  if (remoteUpdated > localUpdated) {
    return remoteProfile;
  }

  return localProfile;
};

/**
 * Get user profile by username (for adding friends)
 */
export const getProfileByUsername = async (
  username: string,
): Promise<UserProfileSync | null> => {
  if (!isSupabaseConfigured()) {
    console.log("Supabase not configured, cannot fetch profile by username");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching profile by username:", error);
    return null;
  }
};

/**
 * Update single profile field (for partial updates)
 */
export const updateProfileField = async (
  userId: string,
  field: keyof Omit<UserProfileSync, "created_at" | "updated_at" | "synced_at">,
  value: any,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.log("Supabase not configured, skipping field update");
    return false;
  }

  try {
    const { error } = await supabase
      .from("users")
      .update({
        [field]: value,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error updating profile field ${field}:`, error);
    return false;
  }
};

export default {
  syncProfileToSupabase,
  syncProfileFromSupabase,
  mergeProfileChanges,
  getProfileByUsername,
  updateProfileField,
};
