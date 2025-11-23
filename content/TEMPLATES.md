# Content Templates

Use these templates to create new content quickly and consistently.

## 📖 Lesson Template

```typescript
import { Lesson } from '../types';

export const myLessonName: Lesson = {
  id: 'my-lesson-id',
  title: 'Lesson Title',
  description: 'Brief description of what students will learn',
  unitId: 'unit-id',
  difficulty: 'beginner', // 'beginner' | 'intermediate' | 'advanced'
  estimatedMinutes: 5,
  xpReward: 50,
  tags: ['tag1', 'tag2', 'tag3'],
  prerequisites: ['other-lesson-id'], // Optional
  
  steps: [
    // 1. Briefing
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Topic Name',
        mission: 'Mission Statement',
        icon: 'IconName' // From iconsax-react-native
      }
    },
    
    // 2. Myth Buster
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'The common misconception',
        reality: 'The actual truth',
        explanation: 'Detailed explanation of why the myth is wrong',
        image: 'https://example.com/image.jpg' // Optional
      }
    },
    
    // 3. Micro Learn
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'Concept Title',
        content: 'Main explanation of the concept',
        keyPoints: [
          'Key point 1',
          'Key point 2',
          'Key point 3'
        ],
        image: 'https://example.com/image.jpg' // Optional
      }
    },
    
    // 4. Lab/Simulation
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Lab Title',
        description: 'What the student needs to do',
        task: 'Specific task instruction',
        options: [
          { id: 'option1', label: 'Option 1', icon: 'IconName' },
          { id: 'option2', label: 'Option 2', icon: 'IconName' },
          { id: 'option3', label: 'Option 3', icon: 'IconName' }
        ],
        correctAnswer: 'option1',
        explanation: 'Why this is the correct answer'
      }
    },
    
    // 5. Assessment
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'The quiz question?',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: 2, // Zero-based index
        explanation: 'Explanation of the correct answer',
        image: 'https://example.com/image.jpg' // Optional
      }
    },
    
    // 6. Debrief
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Success Title',
        message: 'Congratulatory message',
        rewards: {
          xp: 50,
          stars: 3
        }
      }
    }
  ]
};

export default myLessonName;
```

## 📝 Quiz Template

```typescript
import { Quiz } from '../types';

export const myQuizName: Quiz = {
  id: 'my-quiz-id',
  title: 'Quiz Title',
  description: 'Brief description of what the quiz covers',
  category: 'safety', // 'safety' | 'waste' | 'environment' | 'energy' | 'history' | 'future'
  difficulty: 'easy', // 'easy' | 'medium' | 'hard'
  passingScore: 70, // Percentage
  xpReward: 30,
  timeLimit: 300, // Seconds (optional)
  tags: ['tag1', 'tag2', 'tag3'],
  
  questions: [
    // Multiple Choice Question
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'The question text?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 1, // Zero-based index
      explanation: 'Explanation of why this is correct',
      difficulty: 'easy',
      points: 10,
      image: 'https://example.com/image.jpg' // Optional
    },
    
    // True/False Question
    {
      id: 'q2',
      type: 'true_false',
      question: 'Statement to evaluate as true or false',
      options: ['True', 'False'],
      correctAnswer: 1, // 0 for True, 1 for False
      explanation: 'Explanation of the answer',
      difficulty: 'easy',
      points: 10
    },
    
    // Add more questions...
  ]
};

export default myQuizName;
```

## 🎭 Myth Template

```typescript
import { Myth } from '../types';

export const myMythName: Myth = {
  id: 'my-myth-id',
  title: 'Short Myth Title',
  mythStatement: 'The complete myth statement that people believe',
  reality: 'The actual truth in one sentence',
  explanation: `Detailed explanation of why this is a myth.

Use multiple paragraphs if needed.

Include specific data and examples:
- Point 1
- Point 2
- Point 3

Explain the science behind it.`,
  
  category: 'waste', // 'safety' | 'waste' | 'environment' | 'energy' | 'history' | 'future'
  difficulty: 'medium', // 'easy' | 'medium' | 'hard'
  popularity: 8, // 1-10, how common this myth is
  
  sources: [
    {
      title: 'Source Title',
      url: 'https://example.com/article',
      author: 'Author Name',
      date: '2024',
      type: 'research' // 'article' | 'research' | 'video' | 'book' | 'official'
    },
    {
      title: 'Another Source',
      url: 'https://example.com/page',
      author: 'Organization',
      type: 'official'
    }
  ],
  
  relatedFacts: ['fact-id-1', 'fact-id-2'], // Optional
  relatedLessons: ['lesson-id-1'], // Optional
  
  image: 'https://example.com/image.jpg', // Optional
  
  tags: ['tag1', 'tag2', 'tag3']
};

export default myMythName;
```

## 📊 Fact Template

```typescript
import { Fact } from '../types';

export const myFactName: Fact = {
  id: 'my-fact-id',
  title: 'Fact Title',
  statement: 'The fact in one clear sentence',
  explanation: `Detailed explanation of the fact.

Include context and background:
- Supporting point 1
- Supporting point 2
- Supporting point 3

**Why This Matters:**
Explain the significance.

**Comparison:**
Compare to other relevant data.`,
  
  category: 'environment', // 'safety' | 'waste' | 'environment' | 'energy' | 'history' | 'future'
  importance: 'high', // 'low' | 'medium' | 'high' | 'critical'
  
  sources: [
    {
      title: 'Source Title',
      url: 'https://example.com/article',
      author: 'Author Name',
      date: '2024',
      type: 'research' // 'article' | 'research' | 'video' | 'book' | 'official'
    },
    {
      title: 'Another Source',
      url: 'https://example.com/page',
      author: 'Organization',
      type: 'official'
    }
  ],
  
  relatedMyths: ['myth-id-1'], // Optional
  relatedLessons: ['lesson-id-1'], // Optional
  
  image: 'https://example.com/image.jpg', // Optional
  
  tags: ['tag1', 'tag2', 'tag3'],
  
  dateAdded: '2025-01-15',
  lastUpdated: '2025-01-15'
};

export default myFactName;
```

## 📋 Checklist for New Content

### Before Creating Content

- [ ] Research the topic thoroughly
- [ ] Gather credible sources
- [ ] Verify all facts and data
- [ ] Check for existing similar content
- [ ] Plan the content structure

### While Creating Content

- [ ] Follow the appropriate template
- [ ] Use clear, simple language
- [ ] Include all required fields
- [ ] Add relevant tags
- [ ] Link to related content
- [ ] Include images (if available)
- [ ] Cite all sources

### After Creating Content

- [ ] Register in index file
- [ ] Test in the app
- [ ] Check for typos/errors
- [ ] Verify all links work
- [ ] Ensure proper formatting
- [ ] Update metadata if needed

## 🎨 Content Writing Tips

### Lessons
- Start with a hook (myth buster)
- Keep explanations concise
- Use analogies and examples
- Make labs interactive and fun
- End with clear takeaways

### Quizzes
- Mix difficulty levels
- Avoid trick questions
- Provide helpful explanations
- Use real-world scenarios
- Keep questions focused

### Myths
- State the myth clearly
- Don't be condescending
- Use data and evidence
- Explain the science simply
- Acknowledge why people believe it

### Facts
- Lead with the key point
- Provide context
- Use comparisons
- Explain significance
- Keep it interesting

## 📚 Recommended Sources

### Official Organizations
- World Nuclear Association
- IAEA (International Atomic Energy Agency)
- U.S. Department of Energy
- Nuclear Energy Institute
- IPCC (Climate reports)

### Research Institutions
- MIT Nuclear Science
- Oak Ridge National Laboratory
- Argonne National Laboratory
- NREL (National Renewable Energy Lab)

### Quality Criteria
- Peer-reviewed research
- Government agencies
- International organizations
- Academic institutions
- Industry associations

---

**Remember:** Quality over quantity. One well-researched, accurate piece of content is better than multiple rushed ones.

