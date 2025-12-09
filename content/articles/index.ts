/**
 * Articles and Posts Registry
 * Central hub for all Learn & Explore content
 */

import { Article, Post } from './types';

// Import Articles
import radiationInDailyLife from './safety/radiation-in-daily-life';
import howReactorsWork from './technology/how-reactors-work';
import nuclearVsRenewables from './environment/nuclear-vs-renewables';
import nuclearHistory from './history/nuclear-history';
import nuclearWasteManagement from './energy/nuclear-waste-management';

// Import Posts
import chernobylWildlife from './posts/chernobyl-wildlife';
import marieCurieLegacy from './posts/marie-curie-legacy';
import nuclearMedicine from './posts/nuclear-medicine';
import bananaRadiation from './posts/banana-radiation';
import spaceNuclear from './posts/space-nuclear';
import franceNuclear from './posts/france-nuclear';
import nuclearSubmarines from './posts/nuclear-submarines';
import carbonFree from './posts/carbon-free';

// Articles Registry
export const articles: Record<string, Article> = {
  'radiation-in-daily-life': radiationInDailyLife,
  'how-reactors-work': howReactorsWork,
  'nuclear-vs-renewables': nuclearVsRenewables,
  'nuclear-history': nuclearHistory,
  'nuclear-waste-management': nuclearWasteManagement,
};

// Posts Registry
export const posts: Record<string, Post> = {
  'chernobyl-wildlife': chernobylWildlife,
  'marie-curie-legacy': marieCurieLegacy,
  'nuclear-medicine': nuclearMedicine,
  'banana-radiation': bananaRadiation,
  'space-nuclear': spaceNuclear,
  'france-nuclear': franceNuclear,
  'nuclear-submarines': nuclearSubmarines,
  'carbon-free': carbonFree,
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
  return Object.values(articles).filter(article => article.featured);
};

export const getArticlesByCategory = (category: string): Article[] => {
  return Object.values(articles).filter(article => article.category === category);
};

export const getPostsByCategory = (category: string): Post[] => {
  return Object.values(posts).filter(post => post.category === category);
};

export const getArticlesByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced'): Article[] => {
  return Object.values(articles).filter(article => article.difficulty === difficulty);
};

export const getRecentArticles = (limit: number = 5): Article[] => {
  return Object.values(articles)
    .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
    .slice(0, limit);
};

export const getRecentPosts = (limit: number = 5): Post[] => {
  return Object.values(posts)
    .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
    .slice(0, limit);
};

export const searchArticles = (query: string): Article[] => {
  const lowerQuery = query.toLowerCase();
  return Object.values(articles).filter(article =>
    article.title.toLowerCase().includes(lowerQuery) ||
    article.excerpt.toLowerCase().includes(lowerQuery) ||
    article.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

export const searchPosts = (query: string): Post[] => {
  const lowerQuery = query.toLowerCase();
  return Object.values(posts).filter(post =>
    post.title.toLowerCase().includes(lowerQuery) ||
    post.content.toLowerCase().includes(lowerQuery) ||
    post.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

// Export types
export type { Article, Post } from './types';


