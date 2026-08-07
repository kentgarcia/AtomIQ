import { Filter } from "glin-profanity";

const HIDDEN_REASON = "Please keep comments kind and appropriate for everyone.";

const profanityFilter = new Filter({
  languages: ["english"],
  detectLeetspeak: true,
  leetspeakLevel: "aggressive",
  normalizeUnicode: true,
  cacheResults: true,
  maxCacheSize: 1000,
  replaceWith: "***",
});

export type ModerationStatus = "approved" | "hidden" | "incorrect";

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
 * Moderate a comment locally using profanity detection.
 */
export const moderateComment = async (
  commentText: string,
  postContext: string,
): Promise<ModerationResult> => {
  void postContext;

  try {
    const normalizedComment = commentText.trim();
    if (!normalizedComment) {
      return { status: "approved" };
    }

    const result = profanityFilter.checkProfanity(normalizedComment);
    if (result.containsProfanity) {
      return {
        status: "hidden",
        reason: HIDDEN_REASON,
      };
    }

    return { status: "approved" };
  } catch (error) {
    console.error("[Moderation] Error during profanity moderation:", error);
    return { status: "approved" };
  }
};

/**
 * Generate a Schrödi (AI mascot) moderator reply for incorrect comments
 */
export const generateModeratorReply = (
  correction: string,
): ModeratedComment => {
  return {
    id: `ai-mod-${Date.now()}`,
    postId: "", // Will be set when adding to comments
    text: correction,
    author: "Schrödi",
    timestamp: new Date(),
    moderation: {
      status: "approved", // AI replies are always approved
    },
  };
};

/**
 * Batch moderate multiple comments
 */
export const moderateComments = async (
  comments: { text: string; postContext: string }[],
  onProgress?: (index: number, total: number) => void,
): Promise<ModerationResult[]> => {
  const results: ModerationResult[] = [];

  for (let i = 0; i < comments.length; i++) {
    const result = await moderateComment(
      comments[i].text,
      comments[i].postContext,
    );
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
