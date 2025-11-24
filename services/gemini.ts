import Constants from 'expo-constants';

// Gemini API Configuration
const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeminiMessage {
  role: 'user' | 'model';
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
  const organizations = ['IAEA', 'UNSCEAR', 'NRC', 'WHO', 'ICRP', 'NEA', 'ANS'];
  organizations.forEach(org => {
    if (text.includes(org) && !citations.includes(org)) {
      citations.push(org);
    }
  });
  
  return citations.length > 0 ? citations : ['IAEA', 'UNSCEAR']; // Default citations
}

/**
 * Extract follow-up suggestions from response
 */
function extractFollowUpSuggestions(text: string, userQuestion: string): string[] {
  const suggestions: string[] = [];
  
  // Try to extract from "You might also ask" or similar patterns
  const followUpPattern = /(?:You might (?:also )?ask|Follow-up|Related questions?)[:;]?\s*(.+?)(?:\n\n|$)/i;
  const match = text.match(followUpPattern);
  
  if (match) {
    const followUps = match[1].split(/[•\-\n]/).map(s => s.trim()).filter(s => s.length > 0);
    suggestions.push(...followUps.slice(0, 4));
  }
  
  // Generate contextual suggestions based on the topic
  const topic = userQuestion.toLowerCase();
  
  if (topic.includes('radiation') || topic.includes('radioactive')) {
    suggestions.push(
      'How is radiation measured?',
      'What are safe radiation exposure limits?',
      'How does radiation affect the human body?'
    );
  } else if (topic.includes('reactor') || topic.includes('nuclear power')) {
    suggestions.push(
      'How does nuclear fission work?',
      'What are the safety features of modern reactors?',
      'How is nuclear waste managed?'
    );
  } else if (topic.includes('myth') || topic.includes('dangerous') || topic.includes('safe')) {
    suggestions.push(
      'What are common misconceptions about nuclear energy?',
      'How safe is nuclear power compared to other energy sources?',
      'What happened at Chernobyl and Fukushima?'
    );
  } else {
    suggestions.push(
      'Can you explain this in simpler terms?',
      'What are the real-world applications?',
      'How does this relate to nuclear safety?'
    );
  }
  
  return [...new Set(suggestions)].slice(0, 4); // Remove duplicates and limit to 4
}

/**
 * Parse JSON response from Gemini
 */
function parseGeminiResponse(text: string, userQuestion: string): GeminiResponse {
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
          followUpSuggestions: parsed.followUpSuggestions || extractFollowUpSuggestions(cleanedText, userQuestion)
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
    followUpSuggestions: extractFollowUpSuggestions(cleanedText, userQuestion)
  };
}

/**
 * Send message to Gemini API
 */
export async function sendMessageToGemini(
  userMessage: string,
  conversationHistory: GeminiMessage[] = []
): Promise<GeminiResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please set EXPO_PUBLIC_GEMINI_API_KEY in your .env file');
  }

  try {
    // Build conversation context
    const contents = [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT }]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I am Schrödi, ready to assist with nuclear physics questions and debunk myths with scientific facts.' }]
      },
      ...conversationHistory,
      {
        role: 'user',
        parts: [{ text: userMessage }]
      }
    ];

    const response = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || 
        `Gemini API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    
    // Check for blocked content
    if (data.candidates?.[0]?.finishReason === 'SAFETY') {
      throw new Error('Response was blocked by safety filters. Please rephrase your question.');
    }
    
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      const errorMsg = data.error?.message || 'Invalid response format from Gemini API';
      throw new Error(errorMsg);
    }

    const responseText = data.candidates[0].content.parts[0].text;
    return parseGeminiResponse(responseText, userMessage);

  } catch (error) {
    console.error('Gemini API Error:', error);
    
    // Return a helpful error message
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Gemini API key not configured. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file');
      }
      throw error;
    }
    
    throw new Error('Failed to communicate with Gemini API. Please check your internet connection.');
  }
}

/**
 * Convert chat messages to Gemini format
 */
export function convertMessagesToGeminiFormat(messages: Array<{ role: string; text: string }>): GeminiMessage[] {
  return messages
    .filter(msg => msg.role === 'user' || msg.role === 'bot' || msg.role === 'model')
    .map(msg => ({
      role: msg.role === 'bot' ? 'model' : (msg.role as 'user' | 'model'),
      parts: [{ text: msg.text }]
    }));
}

