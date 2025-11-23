# Articles & Posts System for Learn & Explore

## Overview
Created a dedicated content management system for articles and posts specifically for the Learn & Explore (Community/Wiki) feed. This provides rich, educational content beyond myths and facts.

## What Was Created

### 1. Content Types System (`content/articles/types.ts`)

**Article Type:**
- Full-featured educational content
- Author information (name, avatar, title)
- Read time estimation
- Difficulty levels (beginner, intermediate, advanced)
- Featured flag
- Full markdown content support
- Related myths/facts linking
- Source citations

**Post Type:**
- Short-form engaging content
- Quick tips and facts
- Author information
- Category tagging
- Related content linking

### 2. Sample Content

#### Articles (3)
1. **"Radiation in Daily Life"** (Safety)
   - 5 min read
   - Beginner level
   - Covers natural background radiation
   - Banana Equivalent Dose explanation
   - Featured article

2. **"How Nuclear Reactors Work"** (Technology)
   - 8 min read
   - Intermediate level
   - Explains fission process
   - Reactor components
   - Safety systems
   - Featured article

3. **"Nuclear vs Renewables"** (Environment)
   - 7 min read
   - Intermediate level
   - Comparison analysis
   - Climate perspective
   - Grid integration
   - Featured article

#### Posts (3)
1. **"Chernobyl Wildlife"** (Did You Know)
   - Wildlife thriving in exclusion zone
   - Environmental recovery

2. **"Marie Curie's Notebooks"** (Quick Tip)
   - Still radioactive after 130 years
   - Historical perspective

3. **"Nuclear Medicine"** (Fact Highlight)
   - 40 million procedures annually
   - Life-saving applications

### 3. Content Registry (`content/articles/index.ts`)

**Helper Functions:**
- `getAllArticles()` - Get all articles
- `getAllPosts()` - Get all posts
- `getArticleById(id)` - Get specific article
- `getFeaturedArticles()` - Get featured content
- `getArticlesByCategory(category)` - Filter by category
- `getArticlesByDifficulty(level)` - Filter by difficulty
- `getRecentArticles(limit)` - Get newest articles
- `searchArticles(query)` - Search articles
- And more...

### 4. Feed Integration

Updated `app/(tabs)/wiki.tsx` to include:
- Articles and posts in the feed
- Author information display
- Read time indicators
- Enhanced type badges (4 types now)
- New filter options
- Proper sorting (newest first for dated content)

## Feed Item Types

The Learn & Explore feed now shows:

1. 🔵 **ARTICLE** - Long-form educational content
2. 🟣 **POST** - Short-form engaging content
3. 🔴 **MYTH** - Myth debunking
4. 🟢 **FACT** - Verified facts

## Features

### For Articles
- **Author Cards**: Shows author name, title, and avatar
- **Read Time**: Estimated reading time
- **Difficulty Badges**: Beginner, intermediate, advanced
- **Rich Content**: Full markdown support
- **Source Citations**: Credible source links
- **Related Content**: Links to myths/facts
- **Featured Flag**: Highlight important articles

### For Posts
- **Quick Consumption**: 50-200 words
- **Engaging Format**: Did you know, quick tips, etc.
- **Author Attribution**: Shows who posted
- **Category Tags**: Easy filtering
- **Related Links**: Connect to other content

### Feed Enhancements
- **6 Filter Options**: All, Articles, Posts, Myths, Facts, Bookmarked
- **Smart Sorting**: Newest articles/posts first, then randomized
- **Author Display**: Profile icon, name, and title
- **Read Time Indicator**: Clock icon with minutes
- **Enhanced Badges**: Color-coded by type
- **Bookmark Support**: Save any content type

## Content Categories

- **Safety**: Radiation safety, protocols, guidelines
- **History**: Historical events, people, discoveries
- **Technology**: Reactors, equipment, innovations
- **Environment**: Climate, ecology, sustainability
- **Health**: Medical applications, health effects
- **Energy**: Power generation, grid, economics
- **Science**: Physics, chemistry, research
- **Myths**: Myth debunking, misconceptions

## File Structure

```
content/articles/
├── types.ts                          # TypeScript interfaces
├── index.ts                          # Registry & helpers
├── README.md                         # Documentation
├── safety/
│   └── radiation-in-daily-life.ts
├── technology/
│   └── how-reactors-work.ts
├── environment/
│   └── nuclear-vs-renewables.ts
└── posts/
    ├── chernobyl-wildlife.ts
    ├── marie-curie-legacy.ts
    └── nuclear-medicine.ts
```

## Usage Examples

### Get All Articles
```typescript
import { getAllArticles } from '@/content/articles';

const articles = getAllArticles();
// Returns array of all articles
```

### Get Featured Content
```typescript
import { getFeaturedArticles } from '@/content/articles';

const featured = getFeaturedArticles();
// Returns only featured articles
```

### Filter by Category
```typescript
import { getArticlesByCategory } from '@/content/articles';

const safetyArticles = getArticlesByCategory('safety');
// Returns all safety-related articles
```

### Search
```typescript
import { searchArticles } from '@/content/articles';

const results = searchArticles('radiation');
// Returns articles matching query
```

## Creating New Content

### New Article Template
```typescript
import { Article } from '../types';

const myArticle: Article = {
  id: 'unique-id',
  type: 'article',
  category: 'safety',
  title: 'Article Title',
  excerpt: 'Brief summary',
  content: `Full markdown content`,
  author: {
    name: 'Author Name',
    avatar: 'url',
    title: 'Credentials'
  },
  publishedDate: '2024-11-23',
  readTime: 5,
  tags: ['tag1', 'tag2'],
  source: 'Source Name',
  featured: true,
  difficulty: 'beginner'
};
```

### Register in Index
```typescript
// In content/articles/index.ts
import myArticle from './category/my-article';

export const articles: Record<string, Article> = {
  'my-article': myArticle,
  // ... other articles
};
```

## Benefits

### For Users
1. **Richer Content**: Beyond just myths and facts
2. **Expert Authors**: Credible information sources
3. **Varied Formats**: Long and short content
4. **Easy Discovery**: Filter and search
5. **Bookmarking**: Save for later
6. **Read Time**: Know time commitment

### For Education
1. **Comprehensive**: Cover topics in depth
2. **Credible**: Source citations
3. **Accessible**: Difficulty levels
4. **Engaging**: Multiple formats
5. **Connected**: Link related content
6. **Current**: Dated content shows recency

### For App
1. **Scalable**: Easy to add content
2. **Organized**: Clear structure
3. **Typed**: TypeScript safety
4. **Searchable**: Full-text search
5. **Filterable**: Multiple dimensions
6. **Maintainable**: Clean architecture

## Integration with Existing Content

Articles and posts integrate seamlessly with:
- **Myths**: Can reference related myths
- **Facts**: Can link to related facts
- **Lessons**: Can expand on lesson topics
- **Quizzes**: Can provide background info

## Content Guidelines

### Articles
- **Length**: 500-2000 words
- **Structure**: Clear sections with headers
- **Tone**: Educational but accessible
- **Sources**: Always cite credible sources
- **Visuals**: Include relevant images

### Posts
- **Length**: 50-200 words
- **Hook**: Start with interesting fact
- **Clarity**: One main point
- **Engagement**: Use surprising info
- **Sources**: Cite when applicable

## Future Enhancements

### Planned Features
- [ ] Full article view screen
- [ ] User comments
- [ ] Article ratings
- [ ] Share functionality
- [ ] Reading history
- [ ] Personalized recommendations
- [ ] Multi-language support
- [ ] Video content
- [ ] Interactive elements

### Planned Content
- Small Modular Reactors (SMRs)
- Fusion energy progress
- Radiation protection principles
- Nuclear energy milestones
- Famous nuclear scientists
- Safety record statistics

## Files Created

1. `content/articles/types.ts` - Type definitions
2. `content/articles/index.ts` - Registry and helpers
3. `content/articles/README.md` - Documentation
4. `content/articles/safety/radiation-in-daily-life.ts` - Article
5. `content/articles/technology/how-reactors-work.ts` - Article
6. `content/articles/environment/nuclear-vs-renewables.ts` - Article
7. `content/articles/posts/chernobyl-wildlife.ts` - Post
8. `content/articles/posts/marie-curie-legacy.ts` - Post
9. `content/articles/posts/nuclear-medicine.ts` - Post

## Files Modified

1. `app/(tabs)/wiki.tsx`
   - Imported article/post functions
   - Updated feed generation
   - Added article/post rendering
   - Enhanced filter options
   - Added author display
   - Added read time indicator

## Testing Checklist

- [x] Articles display in feed
- [x] Posts display in feed
- [x] Author information shows
- [x] Read time displays
- [x] Type badges show correctly
- [x] Filters work (Articles, Posts)
- [x] Search finds articles/posts
- [x] Bookmarking works
- [x] Sorting is correct
- [x] All content types coexist

## Conclusion

The Learn & Explore feed now has a robust content system with:
- 3 high-quality educational articles
- 3 engaging short posts
- Full TypeScript typing
- Comprehensive helper functions
- Seamless feed integration
- Scalable architecture

Users can now scroll through a rich mix of articles, posts, myths, and facts - making learning engaging and varied! 📚✨

