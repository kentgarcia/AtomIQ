import { Post } from '../types';

const nutecPlastics: Post = {
  id: 'nutec-plastics',
  type: 'news',
  category: 'environment',
  title: 'NUTEC Forum in Philippines Showcases Results',
  content: 'IAEA Director General Rafael Mariano Grossi was in Manila this week to open the International High Level Forum on NUTEC Plastics. During his trip, the Director General visited the PREx house, a prototype building made from recycled plastics strengthened through radiation. Mr Grossi also engaged with Philippine President Ferdinand Marcos Jr and Asian Development Bank President Masato Kanda, to advance regional access to nuclear science and technology.',
  author: {
    name: 'IAEA',
    title: 'International Atomic Energy Agency',
    avatar: '@/assets/nuclear/author/IAEA.webp'
  },
  publishedDate: '2024-12-07',
  image: '@/assets/nuclear/feed-10.webp',
  tags: ['environment', 'plastics', 'innovation', 'philippines'],
  source: 'IAEA',
  sourceUrl: 'https://www.iaea.org/newscenter/multimedia/videos/nutec-forum-in-philippines-showcases-results',
  videoUrl: 'https://youtu.be/-N60D0duytc',
  relatedContent: []
};

export default nutecPlastics;
