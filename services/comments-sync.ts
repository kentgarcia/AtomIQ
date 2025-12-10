import { ModerationResult } from './comment-moderation';
import { isSupabaseConfigured, supabase } from './supabase';
import { Database } from './supabase.types';

export interface SupabaseComment {
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  text: string;
  moderation_status: 'approved' | 'hidden' | 'incorrect';
  moderation_reason: string | null;
  moderation_correction: string | null;
  is_ai_reply: boolean;
  created_at: string;
  updated_at: string;
}

// Type alias for Supabase comments table row
type CommentsRow = Database['public']['Tables']['comments']['Row'];

export interface LocalComment {
  id: string;
  postId: string;
  text: string;
  author: string;
  timestamp: Date;
  moderation?: ModerationResult;
  isAIReply?: boolean;
}

/**
 * Check if device is online (simplified check)
 */
export const isOnline = async (): Promise<boolean> => {
  // Simplified online check - assume online if Supabase is configured
  // A more robust solution would use @react-native-community/netinfo
  return isSupabaseConfigured();
};

/**
 * Fetch comments for a specific post
 */
export const fetchComments = async (postId: string): Promise<LocalComment[]> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, cannot fetch comments');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }

    // Convert Supabase format to local format
    return (data || []).map((row) => convertSupabaseToLocal(row as SupabaseComment));
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
};

/**
 * Post a new comment to Supabase
 */
export const postComment = async (
  postId: string,
  userId: string,
  username: string,
  avatarUrl: string | null,
  text: string,
  moderationResult: ModerationResult
): Promise<LocalComment | null> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, cannot post comment');
    return null;
  }

  const online = await isOnline();
  if (!online) {
    throw new Error('You must be online to post comments');
  }

  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        username: username,
        avatar_url: avatarUrl,
        text: text,
        moderation_status: moderationResult.status,
        moderation_reason: moderationResult.reason || null,
        moderation_correction: moderationResult.correction || null,
        is_ai_reply: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error posting comment:', error);
      throw error;
    }

    return convertSupabaseToLocal(data as SupabaseComment);
  } catch (error) {
    console.error('Error posting comment:', error);
    throw error;
  }
};

/**
 * Post an AI moderator reply
 */
export const postAIReply = async (
  postId: string,
  correction: string
): Promise<LocalComment | null> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, cannot post AI reply');
    return null;
  }

  const online = await isOnline();
  if (!online) {
    return null; // Silently fail for AI replies
  }

  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: 'schrodi-ai',
        username: 'Schrodi',
        avatar_url: null,
        text: correction,
        moderation_status: 'approved',
        moderation_reason: null,
        moderation_correction: null,
        is_ai_reply: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error posting AI reply:', error);
      return null;
    }

    return convertSupabaseToLocal(data as SupabaseComment);
  } catch (error) {
    console.error('Error posting AI reply:', error);
    return null;
  }
};

/**
 * Convert Supabase comment to local format
 */
function convertSupabaseToLocal(comment: SupabaseComment): LocalComment {
  return {
    id: comment.id,
    postId: comment.post_id,
    text: comment.text,
    author: comment.username,
    timestamp: new Date(comment.created_at),
    moderation: {
      status: comment.moderation_status,
      reason: comment.moderation_reason || undefined,
      correction: comment.moderation_correction || undefined,
    },
    isAIReply: comment.is_ai_reply,
  };
}

export default {
  fetchComments,
  postComment,
  postAIReply,
  isOnline,
};
