import { Post } from '../types';

const aiCancerTreatment: Post = {
  id: 'ai-cancer-treatment',
  type: 'article',
  category: 'health',
  title: 'IAEA Research on AI-Assisted Contouring Suggests Benefits for Cancer Patients',
  content: 'Research involving 23 countries has highlighted the safety and benefit of using artificial intelligence for a key and often time-consuming step of the cancer treatment process: contouring organs at risk. By adding unique data from low- and middle-income countries to a growing body of scientific evidence, an IAEA coordinated research project (the ELAISA Study) shows how this technology can enhance radiotherapy access around the world.\n\nThis contouring of tumours and nearby healthy tissues (organs-at-risk) is essential for the safe, effective and optimal use of radiotherapy to treat cancer. However, variations in how different observers may contour (inter-observer variability) can impact both the accuracy and consistency of radiotherapy planning. Previous studies have demonstrated that instructor-led guidance workshops can reduce this inter-observer variation.',
  author: {
    name: 'IAEA',
    title: 'International Atomic Energy Agency',
    avatar: '@/assets/nuclear/author/IAEA.webp'
  },
  publishedDate: '2024-12-05',
  image: '@/assets/nuclear/feed-10.webp',
  tags: ['medical', 'AI', 'cancer-treatment', 'radiotherapy', 'innovation'],
  source: 'IAEA',
  sourceUrl: 'https://www.iaea.org/newscenter/news/iaea-research-on-ai-assisted-contouring-suggests-benefits-for-cancer-patients',
  relatedContent: []
};

export default aiCancerTreatment;
