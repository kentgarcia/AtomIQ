/**
 * Article and Post Types for Learn & Explore Feed
 */

export type ArticleCategory = 
  | 'safety'
  | 'history'
  | 'technology'
  | 'environment'
  | 'health'
  | 'energy'
  | 'science'
  | 'myths';

export type ArticleType = 'article' | 'news' | 'research' | 'opinion' | 'guide';

export interface Article {
  id: string;
  type: ArticleType;
  category: ArticleCategory;
  title: string;
  subtitle?: string;
  content: string;
  excerpt: string;
  author: {
    name: string;
    avatar: string;
    title: string;
  };
  publishedDate: string;
  readTime: number; // in minutes
  image?: string;
  tags: string[];
  source?: string;
  sourceUrl?: string;
  relatedMyths?: string[]; // IDs of related myths
  featured?: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface Post {
  id: string;
  type: ArticleType | 'myth-debunk' | 'fact-highlight' | 'quick-tip' | 'did-you-know' | 'news';
  category: ArticleCategory;
  title: string;
  content: string;
  author: {
    name: string;
    avatar: string | any;
    title?: string;
  };
  publishedDate: string;
  image?: string | any;
  tags: string[];
  source?: string;
  sourceUrl?: string;
  videoUrl?: string;
  relatedContent?: string[]; // IDs of related articles/myths/facts
}


