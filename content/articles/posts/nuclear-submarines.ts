import { Post } from '../types';

const nuclearSubmarines: Post = {
  id: 'nuclear-submarines',
  type: 'did-you-know',
  category: 'technology',
  title: 'Did you know? Nuclear submarines can stay underwater for months',
  content: 'Nuclear-powered submarines can operate underwater for months without surfacing. They only need to resurface for food and supplies, not fuel. The USS Nautilus, launched in 1954, was the first nuclear-powered vessel and proved nuclear power could work in confined spaces.',
  author: {
    name: 'Naval History',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg'
  },
  publishedDate: '2024-11-27',
  image: 'https://images.pexels.com/photos/998641/pexels-photo-998641.jpeg',
  tags: ['submarines', 'navy', 'technology', 'history'],
  source: 'US Navy',
  relatedContent: []
};

export default nuclearSubmarines;

