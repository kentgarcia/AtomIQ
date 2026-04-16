/**
 * Articles and Posts Registry
 * Central hub for all Learn & Explore content
 */

import { Article, Post } from "./types";

// Import Articles
import nuclearWasteManagement from "./energy/nuclear-waste-management";
import nuclearVsRenewables from "./environment/nuclear-vs-renewables";
import nuclearHistory from "./history/nuclear-history";
import radiationInDailyLife from "./safety/radiation-in-daily-life";
import howReactorsWork from "./technology/how-reactors-work";

// Import Posts (10 posts from feed.md)
import aiCancerTreatment from "./posts/ai-cancer-treatment";
import nuclearAgriculture from "./posts/banana-radiation";
import nuclearFission from "./posts/carbon-free";
import nuclearSafety from "./posts/nuclear-safety-stats";
import nuclearScience from "./posts/nuclear-science";
import nutecPlastics from "./posts/nutec-plastics";
import philippinesNuclear from "./posts/philippines-nuclear";
import radioisotopes from "./posts/radioisotopes-production";
import { scienceDaily2026Posts } from "./posts/sciencedaily-2026";

// Articles Registry
export const articles: Record<string, Article> = {
  "radiation-in-daily-life": radiationInDailyLife,
  "how-reactors-work": howReactorsWork,
  "nuclear-vs-renewables": nuclearVsRenewables,
  "nuclear-history": nuclearHistory,
  "nuclear-waste-management": nuclearWasteManagement,
};

// Posts Registry (10 posts from feed.md)
export const posts: Record<string, Post> = {
  "nuclear-agriculture": nuclearAgriculture,
  "nuclear-fission-science": nuclearFission,
  "philippines-nuclear": philippinesNuclear,
  "nuclear-science": nuclearScience,
  "nutec-plastics": nutecPlastics,
  "radioisotopes-production": radioisotopes,
  "nuclear-safety-stats": nuclearSafety,
  "ai-cancer-treatment": aiCancerTreatment,
  ...scienceDaily2026Posts,
};

// Helper Functions

export const getArticleById = (id: string): Article | undefined => {
  return articles[id];
};

export const getPostById = (id: string): Post | undefined => {
  return posts[id];
};

export const getAllArticles = (): Article[] => {
  return Object.values(articles);
};

export const getAllPosts = (): Post[] => {
  return Object.values(posts);
};

export const getFeaturedArticles = (): Article[] => {
  return Object.values(articles).filter((article) => article.featured);
};

export const getArticlesByCategory = (category: string): Article[] => {
  return Object.values(articles).filter(
    (article) => article.category === category,
  );
};

export const getPostsByCategory = (category: string): Post[] => {
  return Object.values(posts).filter((post) => post.category === category);
};

export const getArticlesByDifficulty = (
  difficulty: "beginner" | "intermediate" | "advanced",
): Article[] => {
  return Object.values(articles).filter(
    (article) => article.difficulty === difficulty,
  );
};

export const getRecentArticles = (limit: number = 5): Article[] => {
  return Object.values(articles)
    .sort(
      (a, b) =>
        new Date(b.publishedDate).getTime() -
        new Date(a.publishedDate).getTime(),
    )
    .slice(0, limit);
};

export const getRecentPosts = (limit: number = 5): Post[] => {
  return Object.values(posts)
    .sort(
      (a, b) =>
        new Date(b.publishedDate).getTime() -
        new Date(a.publishedDate).getTime(),
    )
    .slice(0, limit);
};

export const searchArticles = (query: string): Article[] => {
  const lowerQuery = query.toLowerCase();
  return Object.values(articles).filter(
    (article) =>
      article.title.toLowerCase().includes(lowerQuery) ||
      article.excerpt.toLowerCase().includes(lowerQuery) ||
      article.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
  );
};

export const searchPosts = (query: string): Post[] => {
  const lowerQuery = query.toLowerCase();
  return Object.values(posts).filter(
    (post) =>
      post.title.toLowerCase().includes(lowerQuery) ||
      post.content.toLowerCase().includes(lowerQuery) ||
      post.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
  );
};

// Export types
export type { Article, Post } from "./types";

