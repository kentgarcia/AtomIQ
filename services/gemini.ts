import {
    ensureSupabaseAuthUserId,
    isSupabaseConfigured,
    supabase,
} from "./supabase";

export interface GeminiMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

export interface GeminiResponse {
  text: string;
  citations: string[];
  followUpSuggestions: string[];
}

/**
 * System prompt for nuclear physics assistant
 */
const SYSTEM_PROMPT = `You are Schrödi, an expert AI assistant specializing in nuclear physics, radiation safety, and debunking nuclear myths with scientific facts. Your role is to:

1. Provide accurate, science-based information about nuclear physics, radiation, reactors, and nuclear safety
2. Debunk common myths and misconceptions about nuclear energy and radiation
3. Always cite reliable sources (IAEA, UNSCEAR, NRC, WHO, etc.)
4. Explain complex concepts in an accessible way
5. Be factual, educational, and helpful

When responding:
- Always provide citations from authoritative sources (IAEA, UNSCEAR, NRC, WHO, etc.)
- Format citations as: [Source Name] - Brief description
- Include 2-4 relevant citations per response
- Suggest 3-4 follow-up questions that would help the user learn more
- Use clear, engaging language suitable for students and curious learners
- If asked about myths, clearly state what's false and provide the scientific truth

Format your response as JSON with this structure:
{
  "response": "Your main response text here",
  "citations": ["IAEA - International Atomic Energy Agency", "UNSCEAR - United Nations Scientific Committee on Effects of Atomic Radiation"],
  "followUpSuggestions": ["Question 1", "Question 2", "Question 3"]
}

If the user asks something outside nuclear physics, politely redirect them to nuclear-related topics.`;

const supabaseAnonJwt = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

const getGeminiFunctionAuthToken = async (): Promise<string> => {
  // Edge Functions with verify_jwt expect a JWT token.
  // Prefer the legacy anon JWT when provided in env.
  if (supabaseAnonJwt) {
    return supabaseAnonJwt;
  }

  await ensureSupabaseAuthUserId();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(
      `Unable to read Supabase auth session: ${sessionError.message}`,
    );
  }

  if (session?.access_token) {
    return session.access_token;
  }

  throw new Error(
    "No JWT available for gemini-chat function. Set EXPO_PUBLIC_SUPABASE_ANON_KEY (legacy anon JWT) in .env.local.",
  );
};

/**
 * Parse citations from Gemini response
 */
function parseCitations(text: string): string[] {
  const citations: string[] = [];

  // Look for citation patterns like [IAEA], [UNSCEAR], etc.
  const citationPattern = /\[([A-Z0-9\s\-]+)\]/g;
  const matches = text.matchAll(citationPattern);

  for (const match of matches) {
    if (!citations.includes(match[1])) {
      citations.push(match[1]);
    }
  }

  // Also look for common nuclear organizations
  const organizations = ["IAEA", "UNSCEAR", "NRC", "WHO", "ICRP", "NEA", "ANS"];
  organizations.forEach((org) => {
    if (text.includes(org) && !citations.includes(org)) {
      citations.push(org);
    }
  });

  return citations.length > 0 ? citations : ["IAEA", "UNSCEAR"]; // Default citations
}

/**
 * Extract follow-up suggestions from response
 */
function extractFollowUpSuggestions(
  text: string,
  userQuestion: string,
): string[] {
  const suggestions: string[] = [];

  // Try to extract from "You might also ask" or similar patterns
  const followUpPattern =
    /(?:You might (?:also )?ask|Follow-up|Related questions?)[:;]?\s*(.+?)(?:\n\n|$)/i;
  const match = text.match(followUpPattern);

  if (match) {
    const followUps = match[1]
      .split(/[•\-\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    suggestions.push(...followUps.slice(0, 4));
  }

  // Generate contextual suggestions based on the topic
  const topic = userQuestion.toLowerCase();

  if (topic.includes("radiation") || topic.includes("radioactive")) {
    suggestions.push(
      "How is radiation measured?",
      "What are safe radiation exposure limits?",
      "How does radiation affect the human body?",
    );
  } else if (topic.includes("reactor") || topic.includes("nuclear power")) {
    suggestions.push(
      "How does nuclear fission work?",
      "What are the safety features of modern reactors?",
      "How is nuclear waste managed?",
    );
  } else if (
    topic.includes("myth") ||
    topic.includes("dangerous") ||
    topic.includes("safe")
  ) {
    suggestions.push(
      "What are common misconceptions about nuclear energy?",
      "How safe is nuclear power compared to other energy sources?",
      "What happened at Chernobyl and Fukushima?",
    );
  } else {
    suggestions.push(
      "Can you explain this in simpler terms?",
      "What are the real-world applications?",
      "How does this relate to nuclear safety?",
    );
  }

  return [...new Set(suggestions)].slice(0, 4); // Remove duplicates and limit to 4
}

/**
 * Parse JSON response from Gemini
 */
function parseGeminiResponse(
  text: string,
  userQuestion: string,
): GeminiResponse {
  // Clean up the text
  let cleanedText = text.trim();

  // Try to extract JSON if present
  try {
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.response || parsed.text) {
        return {
          text: parsed.response || parsed.text || cleanedText,
          citations: parsed.citations || parseCitations(cleanedText),
          followUpSuggestions:
            parsed.followUpSuggestions ||
            extractFollowUpSuggestions(cleanedText, userQuestion),
        };
      }
    }
  } catch (e) {
    // If JSON parsing fails, continue with text parsing
  }

  // Fallback: parse manually from text
  return {
    text: cleanedText,
    citations: parseCitations(cleanedText),
    followUpSuggestions: extractFollowUpSuggestions(cleanedText, userQuestion),
  };
}

/**
 * Send message to Gemini API with automatic key rotation on rate limit
 */
export async function sendMessageToGemini(
  userMessage: string,
  conversationHistory: GeminiMessage[] = [],
): Promise<GeminiResponse> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_KEY).",
    );
  }

  try {
    const authToken = await getGeminiFunctionAuthToken();

    const { data, error } = await supabase.functions.invoke("gemini-chat", {
      body: {
        userMessage,
        conversationHistory,
        systemPrompt: SYSTEM_PROMPT,
      },
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (error) {
      const context = (error as { context?: Response }).context;

      if (context) {
        let edgeErrorMessage = "";

        try {
          const payload = (await context.json()) as {
            error?: string;
            message?: string;
          };
          edgeErrorMessage =
            payload?.error || payload?.message || JSON.stringify(payload);
        } catch {
          try {
            edgeErrorMessage = await context.text();
          } catch {
            edgeErrorMessage = "";
          }
        }

        if (edgeErrorMessage) {
          throw new Error(
            `Gemini edge function failed (${context.status}): ${edgeErrorMessage}`,
          );
        }
      }

      throw new Error(error.message || "Failed to invoke Gemini chat function");
    }

    const responseText = data?.text;
    if (typeof responseText !== "string" || responseText.trim().length === 0) {
      throw new Error("Invalid response format from Gemini chat function");
    }

    return parseGeminiResponse(responseText, userMessage);
  } catch (error) {
    console.error("Gemini API Error:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("401") ||
        error.message.includes("Invalid JWT")
      ) {
        throw new Error(
          "Chat authentication failed: invalid JWT for Edge Functions. Set EXPO_PUBLIC_SUPABASE_ANON_KEY to your legacy anon JWT key, restart Expo, and try again.",
        );
      }

      if (error.message.toLowerCase().includes("api key")) {
        throw new Error(
          "Gemini keys are missing or inactive in Supabase. Add keys to the public.gemini_api_keys table and set is_active=true.",
        );
      }
      throw error;
    }

    throw new Error(
      "Failed to communicate with Gemini service. Please check your internet connection.",
    );
  }
}

/**
 * Convert chat messages to Gemini format
 */
export function convertMessagesToGeminiFormat(
  messages: Array<{ role: string; text: string }>,
): GeminiMessage[] {
  return messages
    .filter(
      (msg) =>
        msg.role === "user" || msg.role === "bot" || msg.role === "model",
    )
    .map((msg) => ({
      role: msg.role === "bot" ? "model" : (msg.role as "user" | "model"),
      parts: [{ text: msg.text }],
    }));
}
