import { Myth } from '../types';

export const nuclearNotCleanMyth: Myth = {
  id: 'nuclear-not-clean',
  title: 'Nuclear Energy Is Not Clean',
  mythStatement: 'Nuclear power plants pollute the environment and are not a clean energy source',
  reality: 'Nuclear energy produces zero carbon emissions during operation and has one of the smallest environmental footprints',
  explanation: `Nuclear power is one of the cleanest energy sources available:

**Zero Emissions During Operation:**
- No CO2, methane, or other greenhouse gases
- No air pollutants like SO2 or NOx
- Only water vapor from cooling towers

**Minimal Land Use:**
- A nuclear plant on 1 square mile can power a city
- Solar needs 75x more land for same power
- Wind needs 360x more land

**Lifecycle Emissions:**
- 12g CO2/kWh (including construction)
- Comparable to wind (11g) and solar (48g)
- Far better than natural gas (490g) or coal (820g)

**Waste Management:**
- All waste is contained and monitored
- Doesn't pollute air, water, or soil
- Volume is tiny compared to other energy sources`,
  
  category: 'environment',
  difficulty: 'easy',
  popularity: 10,
  
  sources: [
    {
      title: 'Lifecycle Greenhouse Gas Emissions',
      url: 'https://www.ipcc.ch/report/ar5/wg3/',
      author: 'IPCC',
      type: 'research'
    },
    {
      title: 'Nuclear Energy and the Environment',
      url: 'https://www.iaea.org/topics/nuclear-power-and-the-environment',
      author: 'IAEA',
      type: 'official'
    },
    {
      title: 'Land Use of Energy Sources',
      url: 'https://www.nei.org/advantages/land-use',
      author: 'Nuclear Energy Institute',
      type: 'official'
    }
  ],
  
  relatedFacts: ['carbon-emissions', 'land-use-comparison'],
  relatedLessons: ['nuclear-environmental-impact'],
  
  image: 'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=400',
  
  tags: ['environment', 'clean-energy', 'emissions', 'climate']
};

export default nuclearNotCleanMyth;

