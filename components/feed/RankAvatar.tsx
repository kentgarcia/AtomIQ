/**
 * The picture for a ranking row: a rival's drawn head, or the learner's own avatar.
 */

import { memo } from "react";

import { Avatar } from "@/components/avatar/Avatar";
import { NpcHead } from "@/components/feed/NpcHead";
import type { Npc } from "@/content/npcs";
import { useStorage } from "@/services/StorageContext";

export const RankAvatar = memo(function RankAvatar({ npc, isLearner, size }: { npc: Npc | null; isLearner: boolean; size: number }) {
  const { userProfile } = useStorage();
  if (!isLearner) return <NpcHead npc={npc} size={size} />;
  return <Avatar value={userProfile?.avatar_url} size={size} />;
});
