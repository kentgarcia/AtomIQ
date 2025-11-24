import { Post } from '../types';

const carbonFree: Post = {
  id: 'carbon-free',
  type: 'did-you-know',
  category: 'environment',
  title: 'Did you know? Nuclear is carbon-free',
  content: 'Nuclear power plants produce zero CO2 emissions during operation. Over their entire lifecycle (construction, operation, decommissioning), nuclear has similar carbon emissions to wind and solar - about 12g CO2 per kWh. It\'s one of the cleanest energy sources available!',
  author: {
    name: 'Climate Scientist',
    avatar: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg'
  },
  publishedDate: '2024-11-28',
  image: 'https://images.pexels.com/photos/414837/pexels-photo-414837.jpeg',
  tags: ['climate', 'carbon', 'emissions', 'clean-energy'],
  source: 'IPCC',
  relatedContent: []
};

export default carbonFree;

