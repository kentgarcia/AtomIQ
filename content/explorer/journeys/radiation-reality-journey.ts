import { Journey } from '../types';

export const radiationRealityJourney: Journey = {
  id: 'radiation-reality',
  title: 'Radiation Reality: Separating Fact from Fiction',
  subtitle: 'A guided exploration through common radiation misconceptions',
  description: 'Journey through the world of radiation, debunking myths and uncovering the science behind one of nature\'s most misunderstood phenomena.',
  coverImage: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
  estimatedMinutes: 15,
  difficulty: 'beginner',
  category: 'radiation',
  xpReward: 150,
  tags: ['radiation', 'myths', 'safety', 'science'],
  nodes: [
    {
      id: 'intro',
      type: 'interactive',
      title: 'Welcome to Radiation Reality',
      contentId: 'intro',
      position: 0,
      description: 'Introduction to the journey',
    },
    {
      id: 'myth-1',
      type: 'myth',
      title: 'All Radiation is Man-Made',
      contentId: 'all-radiation-manmade',
      position: 1,
      description: 'Explore the myth that all radiation is artificial',
    },
    {
      id: 'myth-2',
      type: 'myth',
      title: 'Radiation Glows Green',
      contentId: 'radiation-glows-green',
      position: 2,
      description: 'Debunk the Hollywood myth of glowing radiation',
    },
    {
      id: 'fact-1',
      type: 'fact',
      title: 'Natural Background Radiation',
      contentId: 'background-radiation-fact',
      position: 3,
      description: 'Learn about natural sources of radiation',
    },
    {
      id: 'quiz-1',
      type: 'quiz',
      title: 'Test Your Knowledge',
      contentId: 'radiation-reality-quiz',
      position: 4,
      description: 'Challenge yourself with what you\'ve learned',
    },
  ],
  sources: [
    {
      title: 'UNSCEAR 2008 Report',
      url: 'https://www.unscear.org/unscear/en/publications/2008.html',
      organization: 'UNSCEAR',
    },
    {
      title: 'IAEA Radiation Protection',
      url: 'https://www.iaea.org/topics/radiation-protection',
      organization: 'IAEA',
    },
  ],
};

export default radiationRealityJourney;

