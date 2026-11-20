import { useCallback, useEffect, useState } from "react";

import type { ThreadSummary } from "@/services/chat-core";
import { listThreads, subscribeChats } from "@/services/chats";

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
