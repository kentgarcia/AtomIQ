import { Fact } from '../types';

export const carbonEmissionsFact: Fact = {
  id: 'carbon-emissions',
  title: 'Nuclear Has Lowest Lifecycle Carbon Emissions',
  statement: 'Nuclear energy produces only 12g CO2/kWh across its entire lifecycle, making it one of the cleanest energy sources',
  explanation: `When considering the entire lifecycle of energy production (construction, operation, decommissioning), nuclear energy has one of the lowest carbon footprints:

**Lifecycle Emissions (g CO2/kWh):**
- Nuclear: 12g
- Wind: 11g
- Hydroelectric: 24g
- Solar PV: 48g
- Geothermal: 38g
- Natural Gas: 490g
- Coal: 820g

**Why Nuclear Is So Low:**
- Zero emissions during operation
- High energy density means less material needed
- Long plant lifetime (60-80 years)
- Small land footprint

**Climate Impact:**
- Nuclear has prevented ~60 gigatons of CO2 emissions
- Equivalent to 2 years of global emissions
- Saved millions of lives by replacing fossil fuels

**Comparison:**
- 1 nuclear plant replaces ~3 million tons CO2/year
- Equal to taking 600,000 cars off the road
- Or planting 50 million trees

**Future Potential:**
- Could provide 25% of clean energy by 2050
- Essential for meeting climate goals
- Works 24/7 unlike intermittent renewables`,
  
  category: 'environment',
  importance: 'critical',
  
  sources: [
    {
      title: 'IPCC Special Report on Climate Change',
      url: 'https://www.ipcc.ch/report/ar5/wg3/',
      author: 'IPCC',
      date: '2014',
      type: 'research'
    },
    {
      title: 'Lifecycle Emissions of Energy Technologies',
      url: 'https://www.nrel.gov/analysis/life-cycle-assessment.html',
      author: 'NREL',
      type: 'research'
    },
    {
      title: 'Nuclear Power and Climate Change',
      url: 'https://www.iaea.org/topics/climate-change',
      author: 'IAEA',
      type: 'official'
    }
  ],
  
  relatedMyths: ['nuclear-not-clean'],
  relatedLessons: ['nuclear-environmental-impact'],
  
  image: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b6?w=400',
  
  tags: ['emissions', 'climate', 'environment', 'clean-energy'],
  
  dateAdded: '2025-01-15',
  lastUpdated: '2025-01-15'
};

export default carbonEmissionsFact;

