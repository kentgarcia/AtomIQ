import { Myth } from '../types';

export const allRadiationManmadeMyth: Myth = {
  id: 'all-radiation-manmade',
  title: 'All Radiation is Man-Made',
  mythStatement: 'All radiation is artificial and created by humans through nuclear technology',
  reality: '80% of radiation exposure comes from natural sources like the sun, rocks, and even food',
  explanation: `This is one of the most common misconceptions about radiation. The truth is that radiation has existed since the beginning of the universe, billions of years before humans appeared.

**Natural Sources (80% of exposure):**
- **Cosmic Radiation**: High-energy particles from space constantly bombard Earth
- **Terrestrial Radiation**: Uranium, thorium, and radon in rocks and soil
- **Internal Radiation**: Radioactive potassium-40 and carbon-14 in our bodies
- **Radon Gas**: The largest single source of natural radiation exposure

**Artificial Sources (20% of exposure):**
- Medical procedures (X-rays, CT scans): ~15%
- Nuclear power and testing: <1%
- Consumer products: <1%

**Fun Facts:**
- Bananas contain potassium-40 (radioactive)
- Brazil nuts are one of the most radioactive foods
- Granite countertops emit low-level radiation
- Flying increases cosmic ray exposure
- Living in Denver (high altitude) = 2x more cosmic radiation

According to UNSCEAR (United Nations Scientific Committee on the Effects of Atomic Radiation), the average person receives about 3 millisieverts (mSv) per year from natural sources and about 0.6 mSv from artificial sources.`,
  
  category: 'safety',
  difficulty: 'easy',
  popularity: 10,
  
  sources: [
    {
      title: 'Sources and Effects of Ionizing Radiation',
      url: 'https://www.unscear.org/unscear/en/publications.html',
      author: 'UNSCEAR',
      date: '2020',
      type: 'official'
    },
    {
      title: 'Radiation in Everyday Life',
      url: 'https://www.iaea.org/topics/radiation-in-everyday-life',
      author: 'IAEA',
      type: 'official'
    },
    {
      title: 'Background Radiation Fact Sheet',
      url: 'https://www.epa.gov/radiation/radiation-sources-and-doses',
      author: 'U.S. EPA',
      type: 'official'
    }
  ],
  
  relatedFacts: ['background-radiation-sources'],
  relatedLessons: ['background-radiation'],
  
  image: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400',
  
  tags: ['radiation', 'natural', 'background', 'safety', 'basics']
};

export default allRadiationManmadeMyth;

