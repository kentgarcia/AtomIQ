import { Post } from '../types';

const marieCurieLegacy: Post = {
  id: 'marie-curie-legacy',
  type: 'quick-tip',
  category: 'history',
  title: 'Marie Curie\'s Notebooks Are Still Radioactive',
  content: 'Marie Curie\'s research notebooks from the 1890s are still radioactive and will remain so for another 1,500 years! They\'re kept in lead-lined boxes and require protective gear to handle. Her groundbreaking work with radium and polonium came before radiation safety was understood. She died in 1934 from aplastic anemia, likely caused by radiation exposure.',
  author: {
    name: 'History Buff',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg'
  },
  publishedDate: '2024-11-21',
  image: 'https://images.pexels.com/photos/256514/pexels-photo-256514.jpeg',
  tags: ['history', 'marie-curie', 'radiation', 'science'],
  source: 'Bibliothèque nationale de France',
  relatedContent: []
};

export default marieCurieLegacy;

