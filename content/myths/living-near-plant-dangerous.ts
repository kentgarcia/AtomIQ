import { Myth } from '../types';

export const livingNearPlantDangerousMyth: Myth = {
  id: 'living-near-plant-dangerous',
  title: 'Living Near Nuclear Plants Causes Cancer',
  mythStatement: 'Living near a nuclear power plant significantly increases your cancer risk',
  reality: 'The radiation dose from living near a nuclear plant is less than eating a banana',
  explanation: `Multiple large-scale studies have found no increased cancer risk for people living near nuclear power plants.

**The Numbers:**
- **Annual dose from plant**: <0.01 mSv (millisieverts)
- **Eating one banana**: 0.0001 mSv
- **Chest X-ray**: 0.1 mSv
- **Natural background**: 2-3 mSv per year
- **Flying NYC to LA**: 0.04 mSv

**Scientific Studies:**
- **15-year study** by the National Cancer Institute: No increased cancer risk
- **UK study** (1963-2006): No evidence of elevated childhood leukemia
- **French study**: Cancer rates near plants were LOWER than national average

**Why So Safe?**
1. **Containment**: Multiple barriers prevent release
2. **Monitoring**: Continuous radiation monitoring
3. **Regulations**: Strict limits (100x lower than natural background)
4. **Distance**: Radiation decreases rapidly with distance

**Comparison:**
Living near a coal plant exposes you to MORE radiation (from fly ash) than living near a nuclear plant!

According to UNSCEAR, the dose to the public from nuclear power operations is negligible compared to natural background radiation.`,
  
  category: 'safety',
  difficulty: 'medium',
  popularity: 10,
  
  sources: [
    {
      title: 'Cancer Risk Near Nuclear Plants',
      url: 'https://www.cancer.gov/about-cancer/causes-prevention/risk/radiation/nuclear-facilities-fact-sheet',
      author: 'National Cancer Institute',
      type: 'official'
    },
    {
      title: 'Radiation Doses',
      url: 'https://www.unscear.org/unscear/en/publications.html',
      author: 'UNSCEAR',
      date: '2020',
      type: 'official'
    }
  ],
  
  relatedFacts: [],
  relatedLessons: ['background-radiation'],
  
  image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400',
  
  tags: ['safety', 'health', 'cancer', 'misconceptions', 'public']
};

export default livingNearPlantDangerousMyth;


