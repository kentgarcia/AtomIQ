import { Post } from '../types';

const radioisotopes: Post = {
  id: 'radioisotopes-production',
  type: 'article',
  category: 'science',
  title: 'How do radioisotopes occur?',
  content: 'The unstable nucleus of a radioisotope can occur naturally, or as a result of artificially altering the atom. In some cases a nuclear reactor is used to produce radioisotopes, in others, a cyclotron. Nuclear reactors are best-suited to producing neutron-rich radioisotopes, such as molybdenum-99, while cyclotrons are best-suited to producing proton-rich radioisotopes, such as fluorine-18.',
  author: {
    name: 'ANSTO',
    title: 'Australian Nuclear Science & Technology Organisation',
    avatar: '@/assets/nuclear/author/ANSTO.webp'
  },
  publishedDate: '2024-12-04',
  image: '@/assets/nuclear/feed-3.webp',
  tags: ['medical', 'radioisotopes', 'production', 'technology'],
  source: 'ANSTO',
  sourceUrl: 'https://www.ansto.gov.au/education/nuclear-facts/what-are-radioisotopes',
  relatedContent: []
};

export default radioisotopes;
