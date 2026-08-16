import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || "";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim() ||
  "";
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  console.warn(
    "Supabase credentials not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_KEY). AI chat will be unavailable.",
  );
}

const createUnconfiguredSupabaseClient = (): SupabaseClient => {
  return new Proxy({} as SupabaseClient, {
    get() {
      throw new Error(
        "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_KEY) to enable AI chat.",
      );
    },
  });
};

export const supabase: SupabaseClient = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : createUnconfiguredSupabaseClient();

const getSessionUserId = async (): Promise<string | null> => {
  if (!hasSupabaseConfig) {
    return null;
  }

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.warn("Unable to read Supabase auth session:", error.message);
      return null;
    }

    return session?.user?.id ?? null;
  } catch (error) {
    console.warn("Unexpected Supabase auth session error:", error);
    return null;
  }
};

export const getSupabaseAuthUserId = async (): Promise<string | null> => {
  return getSessionUserId();
};

export const ensureSupabaseAuthUserId = async (): Promise<string | null> => {
  if (!hasSupabaseConfig) {
    return null;
  }

  const sessionUserId = await getSessionUserId();
  if (sessionUserId) {
    return sessionUserId;
  }

  try {
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      console.warn(
        "Unable to create anonymous Supabase auth user for AI chat:",
        error.message,
      );
      return null;
    }

    return data.user?.id ?? data.session?.user?.id ?? null;
  } catch (error) {
    console.warn("Anonymous Supabase auth bootstrap failed:", error);
    return null;
  }
};

// Helper to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return hasSupabaseConfig;
};

export default supabase;