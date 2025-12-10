import { Post } from '../types';

const nuclearScience: Post = {
  id: 'nuclear-science',
  type: 'article',
  category: 'science',
  title: 'Nuclear science',
  content: 'Nuclear science is the study of the atomic nuclei and their application, including in nuclear power plants, atomic theory and radiation.\n\nIn nuclear science, identification, collation, development and dissemination of basic scientific and technical knowledge is required to ensure safe, reliable and economic operation of current nuclear systems and to develop next-generation technologies.',
  author: {
    name: 'NEA',
    title: 'Nuclear Energy Agency',
    avatar: '@/assets/nuclear/author/NEA.webp'
  },
  publishedDate: '2024-12-06',
  image: '@/assets/nuclear/feed-6.webp',
  tags: ['nuclear-science', 'research', 'technology', 'education'],
  source: 'OECD-NEA',
  sourceUrl: 'https://www.oecd-nea.org/jcms/c_12767/nuclear-science',
  relatedContent: []
};

export default nuclearScience;
