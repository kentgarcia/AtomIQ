import { getItem, setItem, STORAGE_KEYS } from "@/services/storage";

/**
 * Which articles the learner has read, kept as a plain id list so the
 * Discovery Hub can show an "Already read" tab. Ids are the raw article/post
 * ids (no `article-` feed prefix). Local only; most recent read last.
 */

export const getReadArticleIds = async (): Promise<string[]> => {
  const stored = await getItem<unknown>(STORAGE_KEYS.READ_ARTICLES);
  return Array.isArray(stored)
    ? stored.filter((id): id is string => typeof id === "string")
    : [];
};

export const markArticleRead = async (id: string): Promise<void> => {
  if (!id) return;
  try {
    const ids = await getReadArticleIds();
    if (ids.includes(id)) return;
    await setItem(STORAGE_KEYS.READ_ARTICLES, [...ids, id]);
  } catch (error) {
    console.error("Error saving read article:", error);
  }
};
