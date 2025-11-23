import { Fact } from '../types';

export const nuclearWasteVolumeFact: Fact = {
  id: 'nuclear-waste-volume',
  title: 'Nuclear Waste Volume is Incredibly Small',
  statement: 'All the nuclear waste ever produced in the U.S. could fit on a single football field stacked less than 10 yards high',
  explanation: `Nuclear energy produces an incredibly small amount of waste compared to other energy sources:

**Volume Comparison:**
- 60+ years of U.S. nuclear power = ~90,000 tons of waste
- Fits on a football field, stacked 10 yards high
- Coal produces this much waste every 3 hours

**Per Person:**
- Lifetime electricity use from nuclear = golf ball of waste
- Lifetime electricity use from coal = 68 tons of waste
- Plus 77 tons of CO2 from coal

**Why So Little:**
- Nuclear fuel is incredibly energy-dense
- 1 uranium pellet = 1 ton of coal = 17,000 cubic feet of natural gas
- 97% of "waste" can be recycled

**Storage:**
- All waste is contained and monitored
- Currently stored safely on-site
- Deep geological repositories provide permanent solution`,
  
  category: 'waste',
  importance: 'high',
  
  sources: [
    {
      title: 'Nuclear Waste Facts',
      url: 'https://www.energy.gov/ne/articles/5-fast-facts-about-spent-nuclear-fuel',
      author: 'U.S. Department of Energy',
      type: 'official'
    },
    {
      title: 'Radioactive Waste Management',
      url: 'https://world-nuclear.org/information-library/nuclear-fuel-cycle/nuclear-waste/radioactive-waste-management.aspx',
      author: 'World Nuclear Association',
      type: 'official'
    }
  ],
  
  relatedMyths: ['nuclear-waste-forever'],
  relatedLessons: ['nuclear-waste-management'],
  
  image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400',
  
  tags: ['waste', 'volume', 'comparison', 'environment'],
  
  dateAdded: '2025-01-15',
  lastUpdated: '2025-01-15'
};

export default nuclearWasteVolumeFact;

