import { Post } from '../types';

const chernobylWildlife: Post = {
  id: 'chernobyl-wildlife',
  type: 'did-you-know',
  category: 'environment',
  title: 'Wildlife Thrives in Chernobyl Exclusion Zone',
  content: 'Despite the 1986 disaster, the Chernobyl Exclusion Zone has become an unexpected wildlife haven. With humans gone, populations of wolves, bears, lynx, and rare birds have flourished. Studies show animal populations are now higher than before the accident - proving that human activity can be more harmful to wildlife than radiation.',
  author: {
    name: 'Nature Observer',
    avatar: 'https://images.pexels.com/photos/1181695/pexels-photo-1181695.jpeg'
  },
  publishedDate: '2024-11-22',
  image: 'https://images.pexels.com/photos/247502/pexels-photo-247502.jpeg',
  tags: ['chernobyl', 'wildlife', 'environment', 'nature'],
  source: 'Journal of Environmental Radioactivity',
  relatedContent: []
};

export default chernobylWildlife;

