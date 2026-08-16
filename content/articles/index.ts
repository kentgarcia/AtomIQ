/**
 * Articles & Posts registry — DB-backed facade.
 *
 * The hardcoded TypeScript article and post objects were migrated into the
 * pre-populated SQLite database (`content.db`, bundled under
 * `assets/database/`). This module keeps the app's existing import surface
 * (`getArticleById`, `getPostById`, `getAllArticles`, `getAllPosts`, and the
 * filter/sort/search helpers) stable while delegating every lookup to the
 * on-device database via `services/content-db.ts`.
 *
 * NOTE: lookups are now asynchronous (SQLite reads on device are async), so
 * callers must `await` the results where they previously read plain objects.
 */

import { contentRepository } from "@/services/content-db";

import type { Article, ArticleCategory, Post } from "./types";

/** Fetch an article by its id, or `null`. */
export const getArticleById = (id: string): Promise<Article | null> =>
  contentRepository.getArticleById(id);

/** Fetch a post by its id, or `null`. */
export const getPostById = (id: string): Promise<Post | null> =>
  contentRepository.getPostById(id);

/** Every article, newest first. */
export const getAllArticles = (): Promise<Article[]> =>
  contentRepository.getAllArticles();

/** Every post, newest first. */
export const getAllPosts = (): Promise<Post[]> =>
  contentRepository.getAllPosts();

/** Articles flagged as featured. */
export const getFeaturedArticles = (): Promise<Article[]> =>
  contentRepository.getAllArticles().then((articles) =>
    articles.filter((article) => article.featured),
  );

/** Articles sharing a category (e.g. 'safety', 'history'). */
export const getArticlesByCategory = (category: ArticleCategory): Promise<Article[]> =>
  contentRepository.getAllArticles().then((articles) =>
    articles.filter((article) => article.category === category),
  );

/** Posts sharing a category (e.g. 'energy', 'technology'). */
export const getPostsByCategory = (category: ArticleCategory): Promise<Post[]> =>
  contentRepository.getAllPosts().then((posts) =>
    posts.filter((post) => post.category === category),
  );

/** Articles matching a difficulty level. */
export const getArticlesByDifficulty = (
  difficulty: "beginner" | "intermediate" | "advanced",
): Promise<Article[]> =>
  contentRepository.getAllArticles().then((articles) =>
    articles.filter((article) => article.difficulty === difficulty),
  );

/** The `limit` most recently published articles. */
export const getRecentArticles = async (limit: number = 5): Promise<Article[]> => {
  const articles = await contentRepository.getAllArticles();
  return articles.slice(0, limit);
};

/** The `limit` most recently published posts. */
export const getRecentPosts = async (limit: number = 5): Promise<Post[]> => {
  const posts = await contentRepository.getAllPosts();
  return posts.slice(0, limit);
};

/** Full-text-ish article search across title, excerpt, and tags. */
export const searchArticles = (query: string): Promise<Article[]> => {
  const lowerQuery = query.toLowerCase();
  return contentRepository.getAllArticles().then((articles) =>
    articles.filter(
      (article) =>
        article.title.toLowerCase().includes(lowerQuery) ||
        article.excerpt.toLowerCase().includes(lowerQuery) ||
        article.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
    ),
  );
};

/** Post search across title, content, and tags. */
export const searchPosts = (query: string): Promise<Post[]> => {
  const lowerQuery = query.toLowerCase();
  return contentRepository.getAllPosts().then((posts) =>
    posts.filter(
      (post) =>
        post.title.toLowerCase().includes(lowerQuery) ||
        post.content.toLowerCase().includes(lowerQuery) ||
        post.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
    ),
  );
};

export type { Article, ArticleCategory, ArticleType, Post } from "./types";
