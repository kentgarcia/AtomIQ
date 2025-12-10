import { Post } from '../types';

const nuclearSafety: Post = {
  id: 'nuclear-safety-stats',
  type: 'article',
  category: 'safety',
  title: 'What makes nuclear power an attractive source of electricity?',
  content: '1. nuclear power is among the safest sources of electricity.\n\nCoal, oil, and lignite, which are examples of fossil fuels, were found to have the most significant negative health effect causing close to 7 million premature deaths annually due to air pollution. Among the types of fuel which has a small health burden is natural gas and biomass. Even when all cancer-related deaths from nuclear accidents are considered, nuclear power is still by far the least dangerous energy source!',
  author: {
    name: 'Department of Energy',
    title: 'Philippines DOE',
    avatar: 'https://images.unsplash.com/photo-1473163928189-364b2c4e1135?w=400'
  },
  publishedDate: '2024-12-06',
  image: '@/assets/nuclear/feed-9.webp',
  tags: ['safety', 'statistics', 'health', 'energy-comparison'],
  source: 'Department of Energy Philippines',
  sourceUrl: 'https://legacy.doe.gov.ph/sites/default/files/pdf/announcements/09-Nuclear-Science-and-Energy.pdf',
  relatedContent: []
};

export default nuclearSafety;
