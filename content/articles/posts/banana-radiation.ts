import { Post } from '../types';

const bananaRadiation: Post = {
  id: 'banana-radiation',
  type: 'did-you-know',
  category: 'science',
  title: 'Did you know? Bananas are radioactive',
  content: 'Bananas contain potassium-40, a naturally radioactive isotope. Eating one banana exposes you to 0.0001 mSv of radiation - about the same as living near a nuclear plant for a year. You\'d need to eat 20,000 bananas at once to approach dangerous levels!',
  author: {
    name: 'Science Facts',
    avatar: 'https://images.pexels.com/photos/1181695/pexels-photo-1181695.jpeg'
  },
  publishedDate: '2024-11-24',
  image: 'https://images.pexels.com/photos/1300975/pexels-photo-1300975.jpeg',
  tags: ['radiation', 'food', 'science', 'fun-facts'],
  source: 'Health Physics Society',
  relatedContent: []
};

export default bananaRadiation;

