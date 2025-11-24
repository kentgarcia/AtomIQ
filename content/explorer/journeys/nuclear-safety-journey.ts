import { Journey } from '../types';

export const nuclearSafetyJourney: Journey = {
  id: 'nuclear-safety',
  title: 'Nuclear Safety: Understanding Reactor Design',
  subtitle: 'Explore how nuclear reactors are designed for safety',
  description: 'Dive deep into reactor safety systems, emergency protocols, and the engineering behind nuclear power plant safety.',
  coverImage: 'https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800&q=80',
  estimatedMinutes: 20,
  difficulty: 'intermediate',
  category: 'safety',
  xpReward: 200,
  tags: ['safety', 'reactors', 'engineering', 'design'],
  nodes: [
    {
      id: 'intro',
      type: 'interactive',
      title: 'Introduction to Nuclear Safety',
      contentId: 'safety-intro',
      position: 0,
      description: 'Overview of nuclear safety principles',
    },
    {
      id: 'myth-1',
      type: 'myth',
      title: 'Nuclear Plants Can Explode',
      contentId: 'nuclear-plants-explode',
      position: 1,
      description: 'Debunk the myth of nuclear plant explosions',
    },
    {
      id: 'article-1',
      type: 'article',
      title: 'How Reactors Work',
      contentId: 'how-reactors-work',
      position: 2,
      description: 'Learn about reactor design and operation',
    },
    {
      id: 'myth-2',
      type: 'myth',
      title: 'Living Near Plants is Dangerous',
      contentId: 'living-near-plant-dangerous',
      position: 3,
      description: 'Examine the evidence about living near nuclear facilities',
    },
    {
      id: 'quiz-1',
      type: 'quiz',
      title: 'Safety Knowledge Challenge',
      contentId: 'radiation-safety-quiz',
      position: 4,
      description: 'Test your understanding of nuclear safety',
    },
  ],
  sources: [
    {
      title: 'IAEA Safety Standards',
      url: 'https://www.iaea.org/topics/safety-standards',
      organization: 'IAEA',
    },
    {
      title: 'NEA Nuclear Safety',
      url: 'https://www.oecd-nea.org/jcms/pl_13561/nuclear-safety',
      organization: 'NEA',
    },
  ],
};

export default nuclearSafetyJourney;

