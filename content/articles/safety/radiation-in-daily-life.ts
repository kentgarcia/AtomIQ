import { Article } from '../types';

const radiationInDailyLife: Article = {
  id: 'radiation-in-daily-life',
  type: 'article',
  category: 'safety',
  title: 'Radiation in Daily Life: What You Need to Know',
  subtitle: 'Understanding natural background radiation and its impact on health',
  excerpt: 'We are constantly exposed to natural radiation from cosmic rays, soil, and even our own bodies. Learn how this compares to medical and industrial sources.',
  content: `
# Radiation in Daily Life

Every day, we are exposed to radiation from natural sources. This is called background radiation, and it's been part of Earth's environment since the planet formed.

## Natural Sources

**Cosmic Radiation**: High-energy particles from space constantly bombard Earth. At sea level, you receive about 0.3 mSv per year. Flying increases this exposure - a round-trip flight from New York to Los Angeles adds about 0.04 mSv.

**Terrestrial Radiation**: Radioactive elements in soil and rocks, like uranium and thorium, emit radiation. The amount varies by location - granite-rich areas have higher levels.

**Internal Radiation**: Our bodies contain radioactive isotopes like Potassium-40 and Carbon-14. These contribute about 0.4 mSv annually.

## Comparison with Other Sources

- **Chest X-Ray**: 0.1 mSv
- **Dental X-Ray**: 0.005 mSv
- **CT Scan**: 7-10 mSv
- **Annual Background**: 2-3 mSv (varies by location)

## The Banana Equivalent Dose

A fun way to understand radiation is the "Banana Equivalent Dose" (BED). Bananas contain Potassium-40, making them slightly radioactive. One banana = 0.0001 mSv. You'd need to eat 20,000 bananas at once to approach a dangerous dose!

## Safety Perspective

The key to radiation safety is understanding dose and duration. Natural background radiation is unavoidable and harmless at normal levels. Medical procedures are carefully controlled to minimize exposure while maximizing diagnostic benefit.

## Key Takeaways

1. Background radiation is natural and unavoidable
2. Location affects exposure levels
3. Medical radiation is carefully controlled
4. The dose makes the poison - small amounts are safe
5. Understanding helps reduce unnecessary fear
  `,
  author: {
    name: 'Dr. Sarah Chen',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
    title: 'Radiation Safety Specialist'
  },
  publishedDate: '2024-11-15',
  readTime: 5,
  image: 'https://images.pexels.com/photos/2280547/pexels-photo-2280547.jpeg',
  tags: ['radiation', 'safety', 'health', 'background-radiation'],
  source: 'UNSCEAR Report 2020',
  sourceUrl: 'https://www.unscear.org',
  relatedMyths: ['all-radiation-manmade'],
  featured: true,
  difficulty: 'beginner'
};

export default radiationInDailyLife;


