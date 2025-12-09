# Articles & Posts System

## Overview
Dedicated content system for the Learn & Explore feed, providing educational articles and engaging posts about nuclear science, technology, and safety.

## Content Types

### 1. Articles
Long-form educational content with detailed information.

**Types:**
- `article`: General educational content
- `news`: Current events and updates
- `research`: Scientific studies and findings
- `opinion`: Expert perspectives
- `guide`: How-to and explanatory content

**Features:**
- Author information with avatar and title
- Read time estimation
- Difficulty levels (beginner, intermediate, advanced)
- Featured flag for highlighting
- Related myths and facts
- Source citations
- Full markdown content support

### 2. Posts
Short-form engaging content for quick consumption.

**Types:**
- `myth-debunk`: Quick myth debunking
- `fact-highlight`: Interesting facts
- `quick-tip`: Helpful tips and tricks
- `did-you-know`: Surprising information

**Features:**
- Author information
- Category tagging
- Source citations
- Related content links

## File Structure

```
content/articles/
├── types.ts                    # TypeScript interfaces
├── index.ts                    # Central registry and helper functions
├── README.md                   # This file
├── safety/                     # Safety-related articles
│   └── radiation-in-daily-life.ts
├── technology/                 # Technology articles
│   └── how-reactors-work.ts
├── environment/                # Environmental articles
│   └── nuclear-vs-renewables.ts
├── history/                    # Historical articles
├── health/                     # Health-related articles
└── posts/                      # Short-form posts
    ├── chernobyl-wildlife.ts
    ├── marie-curie-legacy.ts
    └── nuclear-medicine.ts
```

## Creating New Content

### New Article

```typescript
import { Article } from '../types';

const myArticle: Article = {
  id: 'unique-article-id',
  type: 'article',
  category: 'safety',
  title: 'Your Article Title',
  subtitle: 'Optional subtitle',
  excerpt: 'Brief summary for feed display',
  content: `
# Full Article Content

Write your full article here in markdown format.

## Sections
- Use markdown formatting
- Include headers, lists, etc.
  `,
  author: {
    name: 'Author Name',
    avatar: 'https://example.com/avatar.jpg',
    title: 'Author Title/Credentials'
  },
  publishedDate: '2024-11-23',
  readTime: 5,
  image: 'https://example.com/image.jpg',
  tags: ['tag1', 'tag2', 'tag3'],
  source: 'Source Name',
  sourceUrl: 'https://source.com',
  featured: true,
  difficulty: 'beginner'
};

export default myArticle;
```

### New Post

```typescript
import { Post } from '../types';

const myPost: Post = {
  id: 'unique-post-id',
  type: 'did-you-know',
  category: 'science',
  title: 'Your Post Title',
  content: 'Your post content. Keep it concise and engaging!',
  author: {
    name: 'Author Name',
    avatar: 'https://example.com/avatar.jpg'
  },
  publishedDate: '2024-11-23',
  image: 'https://example.com/image.jpg',
  tags: ['tag1', 'tag2'],
  source: 'Source Name',
  relatedContent: ['related-id-1', 'related-id-2']
};

export default myPost;
```

### Register Content

Add to `content/articles/index.ts`:

```typescript
// Import
import myArticle from './category/my-article';
import myPost from './posts/my-post';

// Register
export const articles: Record<string, Article> = {
  // ... existing articles
  'my-article': myArticle,
};

export const posts: Record<string, Post> = {
  // ... existing posts
  'my-post': myPost,
};
```

## Categories

- `safety`: Radiation safety, protocols, guidelines
- `history`: Historical events, people, discoveries
- `technology`: Reactors, equipment, innovations
- `environment`: Climate, ecology, sustainability
- `health`: Medical applications, health effects
- `energy`: Power generation, grid, economics
- `science`: Physics, chemistry, research
- `myths`: Myth debunking, misconceptions

## Helper Functions

### Get Content

```typescript
import { 
  getAllArticles, 
  getAllPosts,
  getArticleById,
  getFeaturedArticles 
} from '@/content/articles';

// Get all articles
const articles = getAllArticles();

// Get specific article
const article = getArticleById('radiation-in-daily-life');

// Get featured articles
const featured = getFeaturedArticles();
```

### Filter Content

```typescript
import { 
  getArticlesByCategory,
  getArticlesByDifficulty,
  searchArticles 
} from '@/content/articles';

// By category
const safetyArticles = getArticlesByCategory('safety');

// By difficulty
const beginnerArticles = getArticlesByDifficulty('beginner');

// Search
const results = searchArticles('radiation');
```

### Recent Content

```typescript
import { 
  getRecentArticles,
  getRecentPosts 
} from '@/content/articles';

// Get 5 most recent articles
const recent = getRecentArticles(5);

// Get 10 most recent posts
const recentPosts = getRecentPosts(10);
```

## Content Guidelines

### Articles

1. **Length**: 500-2000 words
2. **Structure**: Clear sections with headers
3. **Tone**: Educational but accessible
4. **Sources**: Always cite credible sources
5. **Accuracy**: Fact-check all claims
6. **Visuals**: Include relevant images
7. **Tags**: 3-5 relevant tags
8. **Difficulty**: Match content complexity

### Posts

1. **Length**: 50-200 words
2. **Hook**: Start with interesting fact
3. **Clarity**: One main point per post
4. **Engagement**: Use surprising information
5. **Sources**: Cite source if applicable
6. **Tags**: 2-4 relevant tags

## Best Practices

### Writing Style

- Use active voice
- Short paragraphs (2-3 sentences)
- Clear, simple language
- Avoid jargon (or explain it)
- Use examples and analogies
- Include statistics when relevant

### Content Quality

- Fact-check everything
- Use credible sources (IAEA, UNSCEAR, WHO, etc.)
- Update outdated information
- Link related content
- Include visual aids
- Proofread carefully

### SEO & Discovery

- Descriptive titles
- Relevant tags
- Clear excerpts
- Good images
- Proper categorization
- Related content links

## Integration

The Learn & Explore feed automatically:
- Combines articles, posts, myths, and facts
- Sorts by publish date (newest first)
- Filters by category and type
- Supports search
- Enables bookmarking
- Shows author information
- Displays read time

## Future Enhancements

- [ ] User comments
- [ ] Article ratings
- [ ] Share functionality
- [ ] Reading history
- [ ] Personalized recommendations
- [ ] Multi-language support
- [ ] Video content
- [ ] Interactive elements
- [ ] Quiz integration
- [ ] Achievement rewards

## Content Roadmap

### Planned Articles

**Safety:**
- Radiation protection principles
- Emergency preparedness
- Safety culture in nuclear industry

**Technology:**
- Small Modular Reactors (SMRs)
- Fusion energy progress
- Advanced reactor designs

**Environment:**
- Nuclear lifecycle emissions
- Waste management solutions
- Land use comparisons

**History:**
- Manhattan Project
- Atoms for Peace
- Three Mile Island lessons

**Health:**
- Radiation therapy advances
- Medical isotope production
- Health physics careers

### Planned Posts

- Daily radiation exposure facts
- Famous nuclear scientists
- Nuclear energy milestones
- Safety record statistics
- Innovation highlights

## Contributing

When adding new content:
1. Follow the templates above
2. Use proper TypeScript types
3. Add to appropriate category folder
4. Register in index.ts
5. Test in the app
6. Verify all links and sources
7. Proofread carefully

## Resources

### Credible Sources

- IAEA (International Atomic Energy Agency)
- UNSCEAR (UN Scientific Committee on Effects of Atomic Radiation)
- WHO (World Health Organization)
- World Nuclear Association
- Nuclear Energy Institute
- National laboratories (ANL, ORNL, etc.)
- Peer-reviewed journals

### Image Sources

- Pexels (free stock photos)
- Unsplash (free stock photos)
- NASA (public domain)
- Government agencies (often public domain)
- Creative Commons licensed images

Always verify image licensing before use.


