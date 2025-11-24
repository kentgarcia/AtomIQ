import { Post } from '../types';

const franceNuclear: Post = {
  id: 'france-nuclear',
  type: 'did-you-know',
  category: 'energy',
  title: 'Did you know? France gets 70% of electricity from nuclear',
  content: 'France generates 70% of its electricity from nuclear power - the highest percentage in the world. This has given France the lowest CO2 emissions per capita in Europe and some of the cheapest, most reliable electricity. The country has been a nuclear leader since the 1970s!',
  author: {
    name: 'Energy Analyst',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg'
  },
  publishedDate: '2024-11-26',
  image: 'https://images.pexels.com/photos/414837/pexels-photo-414837.jpeg',
  tags: ['france', 'energy', 'climate', 'electricity'],
  source: 'IEA',
  relatedContent: []
};

export default franceNuclear;

