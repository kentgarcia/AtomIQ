import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_ERROR_LENGTH = 500;
const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000;
const FAILURE_COOLDOWN_MS = 2 * 60 * 1000;
const INVALID_KEY_DEACTIVATION_THRESHOLD = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type GeminiRole = "user" | "model";

interface GeminiMessage {
  role: GeminiRole;
  parts: Array<{ text: string }>;
}

interface GeminiChatRequest {
  userMessage?: unknown;
  conversationHistory?: unknown;
  systemPrompt?: unknown;
}

interface GeminiKeyRow {
  id: string;
  key_name: string;
  api_key: string;
  purpose: "chat" | "moderation" | "both";
  priority: number;
  fail_count: number;
  request_count: number;
  cooldown_until: string | null;
}

const defaultSystemPrompt =
  "You are Schrodi, an expert AI assistant specializing in nuclear physics, radiation safety, and debunking nuclear myths with scientific facts.";

const json = (body: unknown, status = 200): Response => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
};

const coerceConversationHistory = (value: unknown): GeminiMessage[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is GeminiMessage => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as GeminiMessage;
      if (candidate.role !== "user" && candidate.role !== "model") return false;
      if (!Array.isArray(candidate.parts)) return false;
      return candidate.parts.every(
        (part) => part && typeof part.text === "string",
      );
    })
    .slice(0, 24);
};

const containsText = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const isRateLimitError = (status: number, message: string): boolean => {
  const lower = message.toLowerCase();
  return (
    status === 429 ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource_exhausted")
  );
};

const isInvalidKeyError = (status: number, message: string): boolean => {
  const lower = message.toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    lower.includes("api key") ||
    lower.includes("permission denied") ||
    lower.includes("invalid argument")
  );
};

const summarizeError = (status: number, message: string): string => {
  const normalized = `${status}: ${message}`.trim();
  return normalized.slice(0, MAX_ERROR_LENGTH);
};

const buildContents = (
  userMessage: string,
  conversationHistory: GeminiMessage[],
  systemPrompt: string,
): GeminiMessage[] => {
  return [
    {
      role: "user",
      parts: [{ text: systemPrompt || defaultSystemPrompt }],
    },
    {
      role: "model",
      parts: [
        {
          text: "Understood. I am Schrodi, ready to assist with nuclear physics questions and debunk myths with scientific facts.",
        },
      ],
    },
    ...conversationHistory,
    {
      role: "user",
      parts: [{ text: userMessage }],
    },
  ];
};

const getCandidateKeys = async (
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<GeminiKeyRow[]> => {
  const { data, error } = await supabaseAdmin
    .from("gemini_api_keys")
    .select(
      "id, key_name, api_key, purpose, priority, fail_count, request_count, cooldown_until",
    )
    .eq("is_active", true)
    .in("purpose", ["chat", "both"])
    .order("priority", { ascending: true })
    .order("fail_count", { ascending: true })
    .order("last_success_at", { ascending: true, nullsFirst: true });

  if (error) {
    throw new Error(`Unable to fetch Gemini key pool: ${error.message}`);
  }

  const nowMs = Date.now();
  return (data || []).filter((row) => {
    if (!row.cooldown_until) {
      return true;
    }
    const cooldownMs = new Date(row.cooldown_until).getTime();
    return Number.isNaN(cooldownMs) || cooldownMs <= nowMs;
  }) as GeminiKeyRow[];
};

const markKeySuccess = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  key: GeminiKeyRow,
): Promise<void> => {
  const nowIso = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("gemini_api_keys")
    .update({
      fail_count: 0,
      last_error: null,
      last_success_at: nowIso,
      last_used_at: nowIso,
      cooldown_until: null,
      request_count: (key.request_count || 0) + 1,
      updated_at: nowIso,
    })
    .eq("id", key.id);

  if (error) {
    console.warn(`Unable to mark key success for ${key.id}: ${error.message}`);
  }
};

const markKeyFailure = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  key: GeminiKeyRow,
  status: number,
  message: string,
): Promise<void> => {
  const nowIso = new Date().toISOString();
  const nextFailCount = (key.fail_count || 0) + 1;
  const rateLimit = isRateLimitError(status, message);
  const invalidKey = isInvalidKeyError(status, message);
  const cooldownMs = rateLimit ? RATE_LIMIT_COOLDOWN_MS : FAILURE_COOLDOWN_MS;
  const cooldownUntil = new Date(Date.now() + cooldownMs).toISOString();

  const { error } = await supabaseAdmin
    .from("gemini_api_keys")
    .update({
      fail_count: nextFailCount,
      last_error: summarizeError(status, message),
      last_failure_at: nowIso,
      last_used_at: nowIso,
      cooldown_until: cooldownUntil,
      is_active: invalidKey
        ? nextFailCount < INVALID_KEY_DEACTIVATION_THRESHOLD
        : true,
      request_count: (key.request_count || 0) + 1,
      updated_at: nowIso,
    })
    .eq("id", key.id);

  if (error) {
    console.warn(`Unable to mark key failure for ${key.id}: ${error.message}`);
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase service credentials are missing" }, 500);
  }

  let parsedBody: GeminiChatRequest;
  try {
    parsedBody = (await req.json()) as GeminiChatRequest;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!containsText(parsedBody.userMessage)) {
    return json({ error: "userMessage is required" }, 400);
  }

  const userMessage = parsedBody.userMessage.trim();
  const conversationHistory = coerceConversationHistory(
    parsedBody.conversationHistory,
  );
  const systemPrompt = containsText(parsedBody.systemPrompt)
    ? parsedBody.systemPrompt.trim()
    : defaultSystemPrompt;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let keys: GeminiKeyRow[] = [];
  try {
    keys = await getCandidateKeys(supabaseAdmin);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown key-pool error";
    return json({ error: message }, 500);
  }

  if (keys.length === 0) {
    return json(
      {
        error:
          "No active Gemini chat keys are currently available. Add keys to public.gemini_api_keys with is_active=true.",
      },
      503,
    );
  }

  const contents = buildContents(
    userMessage,
    conversationHistory,
    systemPrompt,
  );

  for (const key of keys) {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${key.api_key}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
          ],
        }),
      });

      const responseJson = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          responseJson?.error?.message ||
          `Gemini API error ${response.status} ${response.statusText}`;

        await markKeyFailure(supabaseAdmin, key, response.status, message);
        continue;
      }

      if (responseJson?.candidates?.[0]?.finishReason === "SAFETY") {
        await markKeySuccess(supabaseAdmin, key);
        return json(
          {
            text: "Response was blocked by safety filters. Please rephrase your question.",
          },
          200,
        );
      }

      const responseText =
        responseJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!containsText(responseText)) {
        await markKeyFailure(
          supabaseAdmin,
          key,
          500,
          "Invalid response format from Gemini API",
        );
        continue;
      }

      await markKeySuccess(supabaseAdmin, key);
      return json({ text: responseText }, 200);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Gemini request error";
      await markKeyFailure(supabaseAdmin, key, 500, message);
    }
  }

  return json(
    {
      error:
        "All configured Gemini keys failed. Add more keys or reactivate a healthy key in public.gemini_api_keys.",
    },
    503,
  );
});
