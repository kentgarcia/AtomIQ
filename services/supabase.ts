import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./supabase.types";

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || "";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim() ||
  "";
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  console.warn(
    "Supabase credentials not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_KEY). Sync features will be disabled.",
  );
}

const createUnconfiguredSupabaseClient = (): SupabaseClient<Database> => {
  return new Proxy({} as SupabaseClient<Database>, {
    get() {
      throw new Error(
        "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_KEY) to enable sync features.",
      );
    },
  });
};

export const supabase: SupabaseClient<Database> = hasSupabaseConfig
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : createUnconfiguredSupabaseClient();

type AuthFlowStatus = "success" | "ignored" | "error" | "unavailable";

export interface AuthFlowResult {
  status: AuthFlowStatus;
  message?: string;
  sessionUserId?: string | null;
}

type TransferCodeStatus = "success" | "error" | "unavailable";

export interface TransferCodeIssueResult {
  status: TransferCodeStatus;
  code?: string;
  expiresAt?: string;
  message?: string;
}

export interface TransferCodeRedeemProfile {
  user_id: string;
  username: string;
  display_name: string;
  friend_code: string | null;
  display_name_updated_at: number | null;
  next_display_name_change_at: number | null;
  avatar_url: string | null;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  myths_busted: number;
  lessons_completed: number;
}

export interface TransferCodeRedeemResult {
  status: TransferCodeStatus;
  profile?: TransferCodeRedeemProfile;
  message?: string;
}

const AUTH_CALLBACK_PARAM_REGEX =
  /(?:\?|#).*(access_token|refresh_token|code|error)=/;
const TRANSFER_CODE_REGEX = /^[A-Z0-9]{8}$/;
const handledAuthCallbackUrls = new Set<string>();

const isAuthCallbackUrl = (url: string): boolean => {
  return AUTH_CALLBACK_PARAM_REGEX.test(url);
};

const parseRedirectParams = (url: string): Record<string, string> => {
  const collectedParams = new URLSearchParams();

  const queryIndex = url.indexOf("?");
  if (queryIndex >= 0) {
    const fragmentIndex = url.indexOf("#", queryIndex);
    const queryString =
      fragmentIndex >= 0
        ? url.slice(queryIndex + 1, fragmentIndex)
        : url.slice(queryIndex + 1);

    const queryParams = new URLSearchParams(queryString);
    queryParams.forEach((value, key) => collectedParams.set(key, value));
  }

  const hashIndex = url.indexOf("#");
  if (hashIndex >= 0) {
    const hashParams = new URLSearchParams(url.slice(hashIndex + 1));
    hashParams.forEach((value, key) => collectedParams.set(key, value));
  }

  const parsed: Record<string, string> = {};
  collectedParams.forEach((value, key) => {
    parsed[key] = value;
  });

  return parsed;
};

const normalizeTransferCode = (value: string): string => {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
};

const parseTimestampToMillis = (value: unknown): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(String(value));
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
};

export const completeSupabaseAuthFromRedirectUrl = async (
  redirectUrl: string,
): Promise<AuthFlowResult> => {
  if (!hasSupabaseConfig) {
    return {
      status: "unavailable",
      message: "Supabase is not configured in this build.",
    };
  }

  if (!isAuthCallbackUrl(redirectUrl)) {
    return { status: "ignored" };
  }

  if (handledAuthCallbackUrls.has(redirectUrl)) {
    return { status: "ignored" };
  }

  handledAuthCallbackUrls.add(redirectUrl);

  try {
    const params = parseRedirectParams(redirectUrl);

    if (params.error) {
      return {
        status: "error",
        message: params.error_description || params.error,
      };
    }

    if (params.access_token && params.refresh_token) {
      const { data, error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });

      if (error) {
        return { status: "error", message: error.message };
      }

      return {
        status: "success",
        sessionUserId: data.session?.user?.id ?? null,
      };
    }

    if (params.code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        params.code,
      );

      if (error) {
        return { status: "error", message: error.message };
      }

      return {
        status: "success",
        sessionUserId: data.session?.user?.id ?? null,
      };
    }

    return {
      status: "ignored",
      message: "Auth callback URL did not include a supported session payload.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unexpected auth callback handling error.",
    };
  }
};

export const issueTransferCode = async (): Promise<TransferCodeIssueResult> => {
  if (!hasSupabaseConfig) {
    return {
      status: "unavailable",
      message: "Supabase is not configured in this build.",
    };
  }

  try {
    const authUserId = await ensureSupabaseAuthUserId();
    if (!authUserId) {
      return {
        status: "error",
        message:
          "Unable to initialize cloud identity. Please check connection and try again.",
      };
    }

    const { data, error } = await (supabase as any).rpc("issue_transfer_code");

    if (error) {
      return {
        status: "error",
        message: error.message,
      };
    }

    const payload = Array.isArray(data) ? data[0] : data;
    if (!payload?.code || !payload?.expires_at) {
      return {
        status: "error",
        message: "Transfer code payload was not returned by Supabase.",
      };
    }

    return {
      status: "success",
      code: String(payload.code),
      expiresAt: String(payload.expires_at),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unexpected transfer code generation error.",
    };
  }
};

export const previewTransferCode = async (
  code: string,
): Promise<TransferCodeRedeemResult> => {
  if (!hasSupabaseConfig) {
    return {
      status: "unavailable",
      message: "Supabase is not configured in this build.",
    };
  }

  const normalizedCode = normalizeTransferCode(code);
  if (!TRANSFER_CODE_REGEX.test(normalizedCode)) {
    return {
      status: "error",
      message: "Transfer code must be 8 letters or digits.",
    };
  }

  try {
    const authUserId = await ensureSupabaseAuthUserId();
    if (!authUserId) {
      return {
        status: "error",
        message:
          "Unable to initialize cloud identity. Please check connection and try again.",
      };
    }

    const { data, error } = await (supabase as any).rpc(
      "preview_transfer_code",
      {
        input_code: normalizedCode,
      },
    );

    if (error) {
      return {
        status: "error",
        message: error.message,
      };
    }

    const payload = Array.isArray(data) ? data[0] : data;
    if (!payload?.user_id) {
      return {
        status: "error",
        message: "Transfer payload was not returned by Supabase.",
      };
    }

    return {
      status: "success",
      profile: {
        user_id: String(payload.user_id),
        username: String(payload.username || "Scientist"),
        display_name: String(
          payload.display_name || payload.username || "Scientist",
        ),
        friend_code: payload.friend_code ? String(payload.friend_code) : null,
        display_name_updated_at: parseTimestampToMillis(
          payload.display_name_updated_at,
        ),
        next_display_name_change_at: parseTimestampToMillis(
          payload.next_display_name_change_at,
        ),
        avatar_url: payload.avatar_url ? String(payload.avatar_url) : null,
        total_xp: Number(payload.total_xp || 0),
        current_streak: Number(payload.current_streak || 0),
        longest_streak: Number(payload.longest_streak || 0),
        myths_busted: Number(payload.myths_busted || 0),
        lessons_completed: Number(payload.lessons_completed || 0),
      },
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unexpected transfer code preview error.",
    };
  }
};

export const redeemTransferCode = async (
  code: string,
  allowOverwrite = false,
): Promise<TransferCodeRedeemResult> => {
  if (!hasSupabaseConfig) {
    return {
      status: "unavailable",
      message: "Supabase is not configured in this build.",
    };
  }

  const normalizedCode = normalizeTransferCode(code);
  if (!TRANSFER_CODE_REGEX.test(normalizedCode)) {
    return {
      status: "error",
      message: "Transfer code must be 8 letters or digits.",
    };
  }

  try {
    const authUserId = await ensureSupabaseAuthUserId();
    if (!authUserId) {
      return {
        status: "error",
        message:
          "Unable to initialize cloud identity. Please check connection and try again.",
      };
    }

    const { data, error } = await (supabase as any).rpc(
      "redeem_transfer_code",
      {
        input_code: normalizedCode,
        allow_overwrite: allowOverwrite,
      },
    );

    if (error) {
      return {
        status: "error",
        message: error.message,
      };
    }

    const payload = Array.isArray(data) ? data[0] : data;
    if (!payload?.user_id) {
      return {
        status: "error",
        message: "Transfer payload was not returned by Supabase.",
      };
    }

    return {
      status: "success",
      profile: {
        user_id: String(payload.user_id),
        username: String(payload.username || "Scientist"),
        display_name: String(
          payload.display_name || payload.username || "Scientist",
        ),
        friend_code: payload.friend_code ? String(payload.friend_code) : null,
        display_name_updated_at: parseTimestampToMillis(
          payload.display_name_updated_at,
        ),
        next_display_name_change_at: parseTimestampToMillis(
          payload.next_display_name_change_at,
        ),
        avatar_url: payload.avatar_url ? String(payload.avatar_url) : null,
        total_xp: Number(payload.total_xp || 0),
        current_streak: Number(payload.current_streak || 0),
        longest_streak: Number(payload.longest_streak || 0),
        myths_busted: Number(payload.myths_busted || 0),
        lessons_completed: Number(payload.lessons_completed || 0),
      },
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unexpected transfer code redemption error.",
    };
  }
};

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
        "Unable to create anonymous Supabase auth user for sync:",
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
