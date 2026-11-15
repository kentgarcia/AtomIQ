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

/** What kind of organization published the source material. */
export type SourceType =
  | 'government-agency'
  | 'international-organization'
  | 'research-institution'
  | 'university'
  | 'industry-association'
  | 'standards-body'
  | 'news-media'
  | 'encyclopedia'
  | 'textbook'
  | 'other';

/** Editorial review state of an article/post (see docs/ARTICLE_PIPELINE.md). */
export type ReviewStatus = 'draft' | 'needs-review' | 'in-review' | 'reviewed' | 'outdated';

/** How the on-screen summary relates to the source material. */
export type SummaryOrigin = 'original' | 'adapted' | 'excerpt' | 'unknown';

/**
 * Research-pipeline metadata shared by articles and feed posts.
 * The article body is AtomIQ's educational summary; everything here
 * describes the separate source material and its review state.
 */
export interface ArticleSourceMeta {
  /** Kind of source (government agency, news media, ...). Absent for unmigrated rows. */
  sourceType?: SourceType;
  /** What the source is and what the summary draws from it. */
  sourceNote?: string;
  /** ISO date the source itself was published, when known. */
  sourcePublishedDate?: string;
  reviewStatus?: ReviewStatus;
  /** ISO date of the last editorial check of this entry's metadata/sources. */
  lastReviewed?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  summaryOrigin?: SummaryOrigin;
  /** Lesson ids this item supports. */
  relatedLessons?: string[];
  /** Encyclopedia entry ids (concepts, people, terms). */
  relatedConcepts?: string[];
  /** Periodic-table element symbols, e.g. ["U", "Pu"]. */
  relatedElements?: string[];
}

export interface Article extends ArticleSourceMeta {
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

export interface Post extends ArticleSourceMeta {
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
  relatedMyths?: string[]; // IDs of related myths
  readTime?: number; // in minutes
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}


