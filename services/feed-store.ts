/**
 * The learner's feed in the user-state database: posts, reactions and blog reads (typed CRUD).
 * The SQL lives in `services/feed-store-core.ts` (tested on an in-memory SQLite); this file binds it
 * to the app's database. Screens use `services/feed.ts`, not this file.
 */

import { getDatabase } from "@/services/database";
import { createFeedStore, type FeedDb } from "@/services/feed-store-core";

export {
  FEED_RETENTION,
  USER_ACTOR_ID,
  type FeedStore,
  type PostMeta,
  type StoredFeedPost,
  type StoredPost,
  type StoredReaction,
} from "@/services/feed-store-core";

export const feedStore = createFeedStore(() => getDatabase() as unknown as FeedDb);

export const {
  insertPost,
  hasDedupeKey,
  listPostMeta,
  listDedupeKeys,
  listBlogCardIds,
  listPosts,
  markSeen,
  countUnseen,
  getReactions,
  getUserReaction,
  setUserReaction,
  recordBlogRead,
  listBlogReads,
  cleanup,
} = feedStore;
