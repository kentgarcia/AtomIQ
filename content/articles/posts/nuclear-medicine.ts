import { Post } from '../types';

const nuclearMedicine: Post = {
  id: 'nuclear-medicine',
  type: 'did-you-know',
  category: 'health',
  title: 'Did you know? Nuclear medicine saves millions',
  content: 'Over 40 million nuclear medicine procedures are performed globally each year. PET scans detect cancer early, radioactive iodine treats thyroid conditions, and targeted radiation therapy destroys tumors. Nuclear technology isn\'t just about power - it\'s saving lives every day.',
  author: {
    name: 'Medical Insider',
    avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg'
  },
  publishedDate: '2024-11-23',
  image: 'https://images.pexels.com/photos/356040/pexels-photo-356040.jpeg',
  tags: ['medicine', 'health', 'radiation', 'treatment'],
  source: 'World Health Organization',
  relatedContent: []
};

export default nuclearMedicine;


