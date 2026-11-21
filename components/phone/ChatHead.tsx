/**
 * Who is speaking in Chats: a teacher (their drawn head, `NpcHead`) or Shrodi, the mascot (the app icon, his face close up, in a
 * round picture). Shrodi is not in the cast of teachers, so a thread whose `npcId` is `shrodi` has no `Npc`; every
 * Chats screen asks `speakerFor` for the name and picture instead of reading the cast directly.
 */

import { memo } from "react";
import { Image } from "react-native";
import { NpcHead } from "@/components/feed/NpcHead";
import type { Npc } from "@/content/npcs";
import { CHAT_MASCOT_ID } from "@/services/chat-core";

export interface ChatSpeaker {
  id: string;
  name: string;
  /** A teacher's drawing; null for Shrodi. */
  npc: Npc | null;
  mascot: boolean;
}

/** The speaker behind a thread's `npcId`; `null` while the cast loads (an empty circle, no name). */
export function speakerFor(npcId: string | undefined, cast: ReadonlyMap<string, Npc>): ChatSpeaker | null {
  if (!npcId) return null;
  if (npcId === CHAT_MASCOT_ID) return { id: npcId, name: "Shrodi", npc: null, mascot: true };
  const npc = cast.get(npcId);
  return npc ? { id: npcId, name: npc.name, npc, mascot: false } : null;
}

// Shrodi's picture is the app icon (his face close up, `assets/images/mascot/icon-256.png`, a 256 px copy of icon.png) cropped to the circle.
const SHRODI_FACE = require("@/assets/images/mascot/icon-256.png");

/** A round head: the teacher's drawing, or Shrodi's own picture. Decorative: the name is real text beside it. */
export const ChatHead = memo(function ChatHead({ speaker, size }: { speaker: ChatSpeaker | null | undefined; size: number }) {
  if (speaker?.mascot) {
    return <Image source={SHRODI_FACE} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" accessible={false} importantForAccessibility="no-hide-descendants" />;
  }
  return <NpcHead npc={speaker?.npc} size={size} />;
});
