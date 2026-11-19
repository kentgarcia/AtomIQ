/**
 * A poster's avatar as a button, like a social feed: a teacher's head opens their profile page
 * (`app/npc/[id].tsx`), the learner's own avatar opens the Profile tab. Without `npc` (the cast is
 * still loading) it is just the picture.
 */

import { useRouter } from "expo-router";
import { memo } from "react";
import { Pressable } from "react-native";

import { NpcHead } from "@/components/feed/NpcHead";
import { RankAvatar } from "@/components/feed/RankAvatar";
import { PROFILE_HREF, npcHref } from "@/components/feed/feed-ui-core";
import { openFeedTarget } from "@/components/feed/navigate";
import type { Npc } from "@/content/npcs";
import { impactLight } from "@/services/haptics";

export interface HeadLinkProps {
  npc: Npc | null | undefined;
  size?: number;
  /** The learner's own post: their avatar, opening the Profile tab. */
  mine?: boolean;
  /** Draw the head but do not link it (on that teacher's own page). */
  plain?: boolean;
}

export const HeadLink = memo(function HeadLink({ npc, size = 44, mine = false, plain = false }: HeadLinkProps) {
  const router = useRouter();
  const picture = mine ? <RankAvatar npc={null} isLearner size={size} /> : <NpcHead npc={npc} size={size} />;
  if (plain || (!mine && !npc)) return picture;
  return (
    <Pressable
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={mine ? "Your profile" : `${npc?.name ?? "Teacher"}'s profile`}
      onPress={() => {
        impactLight();
        openFeedTarget(router, mine || !npc ? { href: PROFILE_HREF, how: "tab" } : { href: npcHref(npc.id), how: "push" });
      }}
    >
      {picture}
    </Pressable>
  );
});
