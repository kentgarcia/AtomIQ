/**
 * Storage for the learner's feed (docs/NPC_FEED_SPEC.md §7.1), written against a small database
 * interface so `scripts/test-feed.mjs` can run the real SQL on an in-memory SQLite. The app binds it
 * to the user-state database in `services/feed-store.ts`.
 *
 * Tables: `feed_posts`, `reactions`, `blog_reads` (services/local-first/schema.ts). There is no
 * table, function or column for a learner comment anywhere: the learner's only input is one
 * reaction per target.
 */

import type { FeedChipKind, FeedKind, FeedTrigger, Reaction } from "../content/types.ts";
import type { PlannedPost } from "./feed-core.ts";
import type { PlannedReaction, ReactionTargetType } from "./social-core.ts";

/** The part of expo-sqlite's database this store uses. */
export interface FeedDb {
  runAsync(sql: string, params?: (string | number | null)[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: (string | number | null)[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

/** The newest posts kept by retention (blog cards are kept regardless). */
export const FEED_RETENTION = 200;

export interface StoredPost {
  id: string;
  dedupeKey: string;
  /** `null` for a blog card. */
  templateId: string | null;
  npcId: string;
  kind: FeedKind | "blog";
  trigger: FeedTrigger;
  /** Rendered once, when the post was created. */
  text: string;
  chipKind: FeedChipKind | null;
  chipTarget: string | null;
  /** Set for a blog card. */
  blogId: string | null;
  createdAt: number;
  /** When it scrolled into view; `null` while unseen. */
  seenAt: number | null;
}

export interface StoredReaction {
  id: string;
  targetType: ReactionTargetType;
  targetId: string;
  actorType: "npc" | "user";
  /** An NPC id, or `me` for the learner. */
  actorId: string;
  reaction: Reaction;
  createdAt: number;
}

export interface StoredFeedPost extends StoredPost {
  /** Reactions on the post, or on the blog piece for a blog card. */
  reactions: StoredReaction[];
}

/** What the pacing rules and the template picker need to know about stored posts. */
export interface PostMeta {
  id: string;
  npcId: string;
  createdAt: number;
  templateId: string | null;
  blogId: string | null;
  dedupeKey: string;
}

export const USER_ACTOR_ID = "me";

interface PostRow {
  id: string;
  dedupe_key: string;
  template_id: string | null;
  npc_id: string;
  kind: string;
  trigger: string;
  text: string;
  chip_kind: string | null;
  chip_target: string | null;
  blog_id: string | null;
  created_at: number;
  seen_at: number | null;
}

interface ReactionRow {
  id: string;
  target_type: string;
  target_id: string;
  actor_type: string;
  actor_id: string;
  reaction: string;
  created_at: number;
}

const POST_COLUMNS = 'id, dedupe_key, template_id, npc_id, kind, "trigger" AS "trigger", text, chip_kind, chip_target, blog_id, created_at, seen_at';

const toPost = (r: PostRow): StoredPost => ({
  id: r.id,
  dedupeKey: r.dedupe_key,
  templateId: r.template_id,
  npcId: r.npc_id,
  kind: r.kind as StoredPost["kind"],
  trigger: r.trigger as FeedTrigger,
  text: r.text,
  chipKind: r.chip_kind as FeedChipKind | null,
  chipTarget: r.chip_target,
  blogId: r.blog_id,
  createdAt: r.created_at,
  seenAt: r.seen_at,
});

const toReaction = (r: ReactionRow): StoredReaction => ({
  id: r.id,
  targetType: r.target_type as ReactionTargetType,
  targetId: r.target_id,
  actorType: r.actor_type as StoredReaction["actorType"],
  actorId: r.actor_id,
  reaction: r.reaction as Reaction,
  createdAt: r.created_at,
});

/** A reaction's id is its identity (target + actor), so storing it twice cannot duplicate it. */
const reactionId = (type: string, targetId: string, actorType: string, actorId: string): string => `${type}:${targetId}:${actorType}:${actorId}`;

export function createFeedStore(getDb: () => FeedDb | Promise<FeedDb>) {
  /** Store a post and its NPC reactions in one transaction. `false` when the dedupe key was already used (nothing is written). */
  async function insertPost(post: PlannedPost, reactions: readonly PlannedReaction[], target: { type: ReactionTargetType; id: string }): Promise<boolean> {
    const db = await getDb();
    let inserted = false;
    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO feed_posts
           (id, dedupe_key, template_id, npc_id, kind, "trigger", text, chip_kind, chip_target, blog_id, created_at, seen_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL,?)`,
        [post.id, post.dedupeKey, post.templateId, post.npcId, post.kind, post.trigger, post.text, post.chipKind, post.chipTarget, post.blogId, post.createdAt, post.createdAt],
      );
      if (result.changes === 0) return;
      inserted = true;
      for (const r of reactions) {
        await db.runAsync(
          `INSERT OR IGNORE INTO reactions (id, target_type, target_id, actor_type, actor_id, reaction, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?)`,
          [reactionId(target.type, target.id, "npc", r.actorId), target.type, target.id, "npc", r.actorId, r.reaction, post.createdAt, post.createdAt],
        );
      }
    });
    return inserted;
  }

  async function hasDedupeKey(key: string): Promise<boolean> {
    const db = await getDb();
    return (await db.getFirstAsync<{ n: number }>("SELECT 1 AS n FROM feed_posts WHERE dedupe_key = ? LIMIT 1", [key])) !== null;
  }

  /** Light rows of the newest posts (blog cards included), newest first. */
  async function listPostMeta(limit: number = FEED_RETENTION + 50): Promise<PostMeta[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ id: string; npc_id: string; created_at: number; template_id: string | null; blog_id: string | null; dedupe_key: string }>(
      "SELECT id, npc_id, created_at, template_id, blog_id, dedupe_key FROM feed_posts ORDER BY created_at DESC, id DESC LIMIT ?",
      [limit],
    );
    return rows.map((r) => ({ id: r.id, npcId: r.npc_id, createdAt: r.created_at, templateId: r.template_id, blogId: r.blog_id, dedupeKey: r.dedupe_key }));
  }

  /** Every dedupe key in use (posts are capped, so this stays small). */
  async function listDedupeKeys(): Promise<string[]> {
    const db = await getDb();
    return (await db.getAllAsync<{ dedupe_key: string }>("SELECT dedupe_key FROM feed_posts")).map((r) => r.dedupe_key);
  }

  /** Blog ids that already have a card in the feed. */
  async function listBlogCardIds(): Promise<string[]> {
    const db = await getDb();
    return (await db.getAllAsync<{ blog_id: string }>("SELECT blog_id FROM feed_posts WHERE blog_id IS NOT NULL")).map((r) => r.blog_id);
  }

  /** All stored posts, newest first, each with its reactions (a blog card carries its piece's reactions). */
  async function listPosts(): Promise<StoredFeedPost[]> {
    const db = await getDb();
    const posts = (await db.getAllAsync<PostRow>(`SELECT ${POST_COLUMNS} FROM feed_posts ORDER BY created_at DESC, id DESC`)).map(toPost);
    const reactionRows = await db.getAllAsync<ReactionRow>(
      `SELECT id, target_type, target_id, actor_type, actor_id, reaction, created_at FROM reactions
        WHERE (target_type = 'post' AND target_id IN (SELECT id FROM feed_posts))
           OR (target_type = 'blog' AND target_id IN (SELECT blog_id FROM feed_posts WHERE blog_id IS NOT NULL))
        ORDER BY created_at ASC, id ASC`,
    );
    const byTarget = new Map<string, StoredReaction[]>();
    for (const row of reactionRows) {
      const key = `${row.target_type}:${row.target_id}`;
      const list = byTarget.get(key) ?? [];
      list.push(toReaction(row));
      byTarget.set(key, list);
    }
    return posts.map((p) => ({ ...p, reactions: byTarget.get(p.blogId ? `blog:${p.blogId}` : `post:${p.id}`) ?? [] }));
  }

  /** Mark posts as seen (once; already-seen ones keep their time). Returns how many changed. */
  async function markSeen(ids: readonly string[], now: number): Promise<number> {
    if (ids.length === 0) return 0;
    const db = await getDb();
    let changed = 0;
    await db.withTransactionAsync(async () => {
      for (const id of ids) {
        const result = await db.runAsync("UPDATE feed_posts SET seen_at = ?, updated_at = ?, is_dirty = 1 WHERE id = ? AND seen_at IS NULL", [now, now, id]);
        changed += result.changes;
      }
    });
    return changed;
  }

  async function countUnseen(): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM feed_posts WHERE seen_at IS NULL");
    return row?.n ?? 0;
  }

  async function getReactions(targetType: ReactionTargetType, targetId: string): Promise<StoredReaction[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<ReactionRow>(
      "SELECT id, target_type, target_id, actor_type, actor_id, reaction, created_at FROM reactions WHERE target_type = ? AND target_id = ? ORDER BY created_at ASC, id ASC",
      [targetType, targetId],
    );
    return rows.map(toReaction);
  }

  async function getUserReaction(targetType: ReactionTargetType, targetId: string): Promise<Reaction | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ reaction: string }>(
      "SELECT reaction FROM reactions WHERE target_type = ? AND target_id = ? AND actor_type = 'user' AND actor_id = ?",
      [targetType, targetId, USER_ACTOR_ID],
    );
    return (row?.reaction as Reaction | undefined) ?? null;
  }

  /** Set (or with `null` clear) the learner's one reaction on a target. */
  async function setUserReaction(targetType: ReactionTargetType, targetId: string, reaction: Reaction | null, now: number): Promise<void> {
    const db = await getDb();
    if (reaction === null) {
      await db.runAsync("DELETE FROM reactions WHERE target_type = ? AND target_id = ? AND actor_type = 'user' AND actor_id = ?", [targetType, targetId, USER_ACTOR_ID]);
      return;
    }
    await db.runAsync(
      `INSERT INTO reactions (id, target_type, target_id, actor_type, actor_id, reaction, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(target_type, target_id, actor_type, actor_id)
       DO UPDATE SET reaction = excluded.reaction, updated_at = excluded.updated_at, is_dirty = 1`,
      [reactionId(targetType, targetId, "user", USER_ACTOR_ID), targetType, targetId, "user", USER_ACTOR_ID, reaction, now, now],
    );
  }

  /** Record that a piece was opened. `true` the first time, `false` when it was already recorded. */
  async function recordBlogRead(blogId: string, now: number): Promise<boolean> {
    const db = await getDb();
    const result = await db.runAsync("INSERT OR IGNORE INTO blog_reads (blog_id, read_at, updated_at) VALUES (?,?,?)", [blogId, now, now]);
    return result.changes > 0;
  }

  async function listBlogReads(): Promise<{ blogId: string; readAt: number }[]> {
    const db = await getDb();
    return (await db.getAllAsync<{ blog_id: string; read_at: number }>("SELECT blog_id, read_at FROM blog_reads")).map((r) => ({ blogId: r.blog_id, readAt: r.read_at }));
  }

  /**
   * Retention: keep the newest `keep` posts and delete older ones, except blog cards. Deletes the NPC
   * reactions of the posts that went. Blog cards and their reactions, `blog_reads` and the learner's
   * own reactions are never deleted.
   */
  async function cleanup(keep: number = FEED_RETENTION): Promise<{ posts: number; reactions: number }> {
    const db = await getDb();
    let posts = 0;
    let reactions = 0;
    await db.withTransactionAsync(async () => {
      posts = (
        await db.runAsync(
          "DELETE FROM feed_posts WHERE blog_id IS NULL AND id NOT IN (SELECT id FROM feed_posts ORDER BY created_at DESC, id DESC LIMIT ?)",
          [keep],
        )
      ).changes;
      reactions = (
        await db.runAsync("DELETE FROM reactions WHERE target_type = 'post' AND actor_type = 'npc' AND target_id NOT IN (SELECT id FROM feed_posts)")
      ).changes;
    });
    return { posts, reactions };
  }

  return {
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
  };
}

export type FeedStore = ReturnType<typeof createFeedStore>;
