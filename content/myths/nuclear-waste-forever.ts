import { Myth } from '../types';

export const nuclearWasteForeverMyth: Myth = {
  id: 'nuclear-waste-forever',
  title: 'Nuclear Waste Lasts Forever',
  mythStatement: 'Nuclear waste remains dangerous for millions of years and can never be safely disposed of',
  reality: 'Most nuclear waste becomes safe within 300-500 years, and modern technology can reduce this further',
  explanation: `While it's true that some isotopes in nuclear waste have very long half-lives, the vast majority of radioactivity comes from short-lived isotopes that decay within decades. After about 300-500 years, nuclear waste is less radioactive than natural uranium ore.

Additionally:
- 97% of "waste" can be recycled as fuel
- Advanced reactors can use current waste as fuel
- Deep geological storage provides safe isolation
- Volume is incredibly small compared to other energy waste`,
  
  category: 'waste',
  difficulty: 'medium',
  popularity: 9,
  
  sources: [
    {
      title: 'Nuclear Waste Management',
      url: 'https://world-nuclear.org/information-library/nuclear-fuel-cycle/nuclear-waste/radioactive-waste-management.aspx',
      author: 'World Nuclear Association',
      type: 'official'
    },
    {
      title: 'The Truth About Nuclear Waste',
      url: 'https://www.energy.gov/ne/articles/5-fast-facts-about-spent-nuclear-fuel',
      author: 'U.S. Department of Energy',
      type: 'official'
    }
  ],
  
  relatedFacts: ['nuclear-waste-volume', 'waste-recycling'],
  relatedLessons: ['nuclear-waste-management'],
  
  image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400',
  
  tags: ['waste', 'safety', 'environment', 'storage']
};

export default nuclearWasteForeverMyth;

