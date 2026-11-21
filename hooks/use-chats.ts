import { useCallback, useEffect, useRef, useState } from "react";

import type { StoryEntry, ThreadSummary } from "@/services/chat-core";
import { listStories, listThreads, subscribeChats } from "@/services/chats";
import { loadPhoneProgress, loadSeenApps, subscribePhone } from "@/services/phone";

/** The Chats list (the teachers who have a thread, latest message first); it follows new and read messages. */
export function useChatList(refreshKey?: unknown): { rows: ThreadSummary[]; loaded: boolean; refresh: () => void } {
  const [rows, setRows] = useState<ThreadSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setRows(await listThreads());
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);
  useEffect(() => subscribeChats(() => void load()), [load]);

  return { rows, loaded, refresh: useCallback(() => void load(), [load]) };
}

/**
 * Every story one teacher has, locked or not, for the Chats tab of their profile: it follows the threads (a story starts, ends or is
 * replayed) and the learner's progress (a lesson finishes, an app installs). `refreshKey` re-reads it, like the Chats list.
 */
export function useStories(npcId: string | undefined, refreshKey?: unknown): { stories: StoryEntry[]; loaded: boolean; refresh: () => void } {
  const [stories, setStories] = useState<StoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Only the read that started last may land, so an older one that finishes late cannot show stale progress
  const latest = useRef(0);

  const load = useCallback(async () => {
    if (!npcId) return;
    const mine = ++latest.current;
    const [progress, seen] = await Promise.all([loadPhoneProgress(), loadSeenApps()]);
    const list = await listStories(npcId, { progress, seen });
    if (mine !== latest.current) return;
    setStories(list);
    setLoaded(true);
  }, [npcId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);
  useEffect(() => {
    const stops = [subscribeChats(() => void load()), subscribePhone(() => void load())];
    return () => stops.forEach((stop) => stop());
  }, [load]);

  return { stories, loaded, refresh: useCallback(() => void load(), [load]) };
}
