import Constants from 'expo-constants';

// Gemini API Configuration for Moderation
const GEMINI_API_KEYS = [
  Constants.expoConfig?.extra?.geminiModerationApiKey1 || process.env.EXPO_PUBLIC_GEMINI_MODERATION_API_KEY_1,
  Constants.expoConfig?.extra?.geminiModerationApiKey2 || process.env.EXPO_PUBLIC_GEMINI_MODERATION_API_KEY_2,
].filter(Boolean); // Remove undefined keys

// Using gemini-2.5-flash (stable version with better quota than experimental)
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Track current API key index
let currentModerationKeyIndex = 0;

export type ModerationStatus = 'approved' | 'hidden' | 'incorrect';

export interface ModerationResult {
  status: ModerationStatus;
  reason?: string;
  correction?: string;
}

export interface ModeratedComment {
  id: string;
  postId: string;
  text: string;
  author: string;
  timestamp: Date;
  moderation: ModerationResult;
}

/**
 * Call Gemini API for moderation with automatic key rotation on rate limit
 */
async function callGeminiForModeration(prompt: string): Promise<string> {
  if (!GEMINI_API_KEYS || GEMINI_API_KEYS.length === 0) {
    console.warn('Gemini API keys not configured for moderation');
    return '{"status":"approved"}';
  }

  console.log(`[Moderation] Starting API call with ${GEMINI_API_KEYS.length} keys available`);
  
  const maxRetries = GEMINI_API_KEYS.length;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = GEMINI_API_KEYS[currentModerationKeyIndex];
    
    console.log(`[Moderation] Attempt ${attempt + 1}/${maxRetries} using key index ${currentModerationKeyIndex}`);

    try {
      const response = await fetch(
        `${GEMINI_API_URL}?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.3,
              topK: 20,
              topP: 0.8,
              maxOutputTokens: 512,
            },
            safetySettings: [
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              }
            ]
          })
        }
      );

      console.log(`[Moderation] Response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Moderation] API error:', errorData);
        
        // Check for rate limit errors
        if (response.status === 429 || errorData.error?.message?.includes('quota') || errorData.error?.message?.includes('rate limit')) {
          console.log(`Moderation API key ${currentModerationKeyIndex + 1} hit rate limit, switching to next key...`);
          currentModerationKeyIndex = (currentModerationKeyIndex + 1) % GEMINI_API_KEYS.length;
          lastError = new Error('Rate limit reached');
          continue; // Try next key
        }
        
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('[Moderation] Response data:', JSON.stringify(data, null, 2));
      
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('[Moderation] Invalid response structure:', data);
        throw new Error('Invalid response from Gemini');
      }

      const responseText = data.candidates[0].content.parts[0].text;
      console.log('[Moderation] AI response text:', responseText);
      
      return responseText;
    } catch (error) {
      // If it's a rate limit error, we already logged it and will retry
      if (error instanceof Error && error.message === 'Rate limit reached') {
        lastError = error;
        continue;
      }
      
      console.error('[Moderation] Gemini moderation error:', error);
      lastError = error instanceof Error ? error : new Error('Unknown error');
      break; // Don't retry on non-rate-limit errors
    }
  }
  
  // If all keys failed due to rate limit, return approved
  console.warn('[Moderation] All moderation API keys exhausted or error occurred, defaulting to approved');
  return '{"status":"approved"}'; // Default to approved on error
}

/**
 * Analyze a comment using AI to determine if it should be approved, hidden, or corrected
 */
export const moderateComment = async (
  commentText: string,
  postContext: string
): Promise<ModerationResult> => {
  console.log('[Moderation] Starting moderation for comment:', commentText.substring(0, 50) + '...');
  
  try {
    const prompt = `You are an AI moderator for AtomIQ, a friendly educational app about nuclear science for young learners. Your goal is to create a safe, welcoming space where students feel comfortable sharing and learning. Classify comments into one of three categories:

1. **APPROVED**: Most comments should be approved! Include:
   - Science-related comments (even if casual or off-topic from nuclear science)
   - Questions, reactions, and expressions of curiosity
   - Friendly conversation between learners
   - Supportive and encouraging messages
   - General chat that's appropriate for school

2. **HIDDEN**: Only hide comments that are:
   - Clearly harmful, bullying, or mean-spirited
   - Contain inappropriate language or content
   - Spam or advertising
   - Share personal information (phone numbers, addresses, etc.)
   Provide a brief, kind reason (1 sentence).

3. **INCORRECT**: Only use this for significant scientific misinformation about nuclear science that could mislead other students. Provide a friendly, educational correction (2-3 sentences) using simple language.

**Post Context**: ${postContext}

**User Comment**: "${commentText}"

**Important Guidelines**:
- BE LENIENT - when in doubt, approve the comment
- Encourage learning and curiosity, even if comments are casual
- Only hide truly inappropriate or harmful content
- Only correct major scientific errors, not minor misunderstandings
- Keep corrections friendly and educational, not critical

Respond ONLY with valid JSON in this format:
{
  "status": "approved" | "hidden" | "incorrect",
  "reason": "brief explanation (only for hidden)",
  "correction": "educational correction (only for incorrect)"
}

**Examples**:

Comment: "This is cool!"
Response: {"status":"approved"}

Comment: "I love science, anyone want to be friends?"
Response: {"status":"approved"}

Comment: "Radiation is in bananas lol"
Response: {"status":"approved"}

Comment: "You're so dumb and ugly"
Response: {"status":"hidden","reason":"Please keep comments kind and respectful"}

Comment: "Nuclear power plants explode like atomic bombs"
Response: {"status":"incorrect","correction":"Great question! Nuclear power plants can't explode like bombs. They use controlled reactions with low-enriched uranium (3-5%), while bombs need highly-enriched uranium (90%+). Power plants are designed with safety systems to prevent any dangerous reactions."}

Now analyze the comment above and respond with JSON only:`;

    const response = await callGeminiForModeration(prompt);
    console.log('[Moderation] Raw AI response:', response);
    
    // Parse the AI response
    const cleanResponse = response.trim();
    let jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.warn('[Moderation] AI response not in JSON format, defaulting to approved');
      console.warn('[Moderation] Response was:', cleanResponse);
      return { status: 'approved' };
    }

    console.log('[Moderation] Extracted JSON:', jsonMatch[0]);
    const result = JSON.parse(jsonMatch[0]) as ModerationResult;
    
    // Validate the status
    if (!['approved', 'hidden', 'incorrect'].includes(result.status)) {
      console.warn('[Moderation] Invalid status from AI:', result.status, 'defaulting to approved');
      return { status: 'approved' };
    }

    console.log('[Moderation] Final result:', result);
    return result;
  } catch (error) {
    console.error('[Moderation] Error moderating comment:', error);
    // Default to approved if moderation fails
    return { status: 'approved' };
  }
};

/**
 * Generate a Schrödi (AI mascot) moderator reply for incorrect comments
 */
export const generateModeratorReply = (correction: string): ModeratedComment => {
  return {
    id: `ai-mod-${Date.now()}`,
    postId: '', // Will be set when adding to comments
    text: correction,
    author: 'Schrödi',
    timestamp: new Date(),
    moderation: {
      status: 'approved', // AI replies are always approved
    },
  };
};

/**
 * Batch moderate multiple comments
 */
export const moderateComments = async (
  comments: Array<{ text: string; postContext: string }>,
  onProgress?: (index: number, total: number) => void
): Promise<ModerationResult[]> => {
  const results: ModerationResult[] = [];
  
  for (let i = 0; i < comments.length; i++) {
    const result = await moderateComment(comments[i].text, comments[i].postContext);
    results.push(result);
    
    if (onProgress) {
      onProgress(i + 1, comments.length);
    }
  }
  
  return results;
};

export default {
  moderateComment,
  generateModeratorReply,
  moderateComments,
};
