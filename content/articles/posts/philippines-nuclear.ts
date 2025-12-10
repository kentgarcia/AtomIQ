import { Post } from '../types';

const philippinesNuclear: Post = {
  id: 'philippines-nuclear',
  type: 'news',
  category: 'science',
  title: 'We Juan-A Nuclear Philippines! DOST-PNRI to celebrate Atomic Energy Week 2025',
  content: 'The Gen-Atom craze continues this year as the country once again celebrates the Atomic Energy Week (AEW) from December 9 to 12, spearheaded by the Department of Science and Technology-Philippine Nuclear Research Institute (DOST-PNRI) in Commonwealth Avenue, Quezon City.\n\nWith the theme "I Juan-A Nuclear Philippines", this year\'s AEW reflects the extraordinary energy akin to atomic nuclei among generations of Filipinos, particularly the youth, as we talk more about the growing role of nuclear science and technology in national development.\n\nThis year\'s celebration is also as enthusiastic as they are inclusive, with a wide range of activities in store for every Juan and Juana wanting to learn more about the benefits of the Atom.',
  author: {
    name: 'PNRI',
    title: 'Philippine Nuclear Research Institute',
    avatar: '@/assets/nuclear/author/PNRI.webp'
  },
  publishedDate: '2024-12-09',
  image: '@/assets/nuclear/feed-5.webp',
  tags: ['philippines', 'education', 'youth', 'national-development'],
  source: 'PNRI',
  sourceUrl: 'https://www.pnri.dost.gov.ph/index.php',
  relatedContent: []
};

export default philippinesNuclear;
