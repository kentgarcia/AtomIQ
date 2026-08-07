import { Pressable } from "react-native";
import Animated from "react-native-reanimated";

import type { ModerationResult } from "@/services/comment-moderation";

export type ReactionType =
  | "like"
  | "love"
  | "haha"
  | "wow"
  | "sad"
  | "angry"
  | null;

export interface Comment {
  id: string;
  postId: string;
  text: string;
  author: string;
  timestamp: Date;
  moderation?: ModerationResult;
  isAIReply?: boolean;
}

export const REACTIONS = [
  { type: "like" as const, emoji: "👍", label: "Like", color: "#2078F4" },
  { type: "love" as const, emoji: "❤️", label: "Love", color: "#F33E58" },
  { type: "haha" as const, emoji: "😂", label: "Haha", color: "#F7B125" },
  { type: "wow" as const, emoji: "😮", label: "Wow", color: "#F7B125" },
  { type: "sad" as const, emoji: "😢", label: "Sad", color: "#F7B125" },
  { type: "angry" as const, emoji: "😠", label: "Angry", color: "#E9710F" },
];

// Animated Pressable for reactions
export const AnimatedPressable =
  Animated.createAnimatedComponent(Pressable);