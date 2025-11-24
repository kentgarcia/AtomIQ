import { Post } from '../types';

const spaceNuclear: Post = {
  id: 'space-nuclear',
  type: 'did-you-know',
  category: 'technology',
  title: 'Did you know? Nuclear power enables space exploration',
  content: 'NASA\'s Voyager probes, launched in 1977, are still transmitting data from interstellar space thanks to nuclear batteries (RTGs). The Perseverance rover on Mars also uses nuclear power. Without nuclear technology, deep space missions wouldn\'t be possible!',
  author: {
    name: 'Space Explorer',
    avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg'
  },
  publishedDate: '2024-11-25',
  image: 'https://images.pexels.com/photos/998641/pexels-photo-998641.jpeg',
  tags: ['space', 'nasa', 'technology', 'exploration'],
  source: 'NASA',
  relatedContent: []
};

export default spaceNuclear;

