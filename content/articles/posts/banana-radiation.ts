import { Post } from '../types';

const nuclearAgriculture: Post = {
  id: 'nuclear-agriculture',
  type: 'article',
  category: 'technology',
  title: 'Benefits of nuclear science IN Food and agriculture',
  content: 'Nuclear techniques are used in farming and agricultural communities to combat disease and provide other benefits. The process of treating food with radiant energy isn\'t new; the sun\'s energy, for example, has been used for centuries to preserve meat, fruits, vegetables, and fish.\n\nANSTO researchers are investigating the impact of processes such as heating, mixing, and fermenting on the molecular structure of various foods. Another research project uses radiotracers to investigate a new class of micro- and nano-scale zinc fertilisers for broadacre crops, such as wheat.',
  author: {
    name: 'ANSTO',
    title: 'Australian Nuclear Science & Technology Organisation',
    avatar: '@/assets/nuclear/author/ANSTO.webp'
  },
  publishedDate: '2024-12-09',
  image: '@/assets/nuclear/feed-1.webp',
  tags: ['agriculture', 'food-safety', 'innovation', 'research'],
  source: 'ANSTO',
  sourceUrl: 'https://www.ansto.gov.au/education/nuclear-facts/benefits-of-nuclear-science',
  relatedContent: []
};

export default nuclearAgriculture;

