import { Myth } from '../types';

export const radiationGlowsGreenMyth: Myth = {
  id: 'radiation-glows-green',
  title: 'Radiation Glows Green',
  mythStatement: 'Radioactive materials glow green in the dark',
  reality: 'Radiation is invisible - the green glow is a Hollywood invention',
  explanation: `This misconception comes entirely from movies and TV shows. Real radiation is completely invisible to the human eye.

**The Truth About Radiation:**
- **Invisible**: Alpha, beta, and gamma radiation cannot be seen
- **No Color**: Radiation has no inherent color
- **No Glow**: Radioactive materials don't naturally glow

**Where the Myth Comes From:**
1. **Radium Paint**: Early 1900s watch dials used radium mixed with phosphorescent paint (the paint glowed, not the radiation)
2. **Cherenkov Radiation**: In nuclear reactors, water glows BLUE (not green) when particles move faster than light in water
3. **Hollywood**: Movies use green for dramatic effect

**Real Detection:**
- Geiger counters detect radiation by sound/clicks
- Dosimeters measure accumulated exposure
- Special cameras can visualize radiation indirectly
- But humans cannot see it directly

**Fun Fact:**
The "green glow" trope became popular after radium watch dial painters in the 1920s (the "Radium Girls") suffered radiation poisoning. The paint glowed green, leading to the association.`,
  
  category: 'basics',
  difficulty: 'easy',
  popularity: 8,
  
  sources: [
    {
      title: 'Radiation Myths',
      url: 'https://www.iaea.org/topics/radiation-myths',
      author: 'IAEA',
      type: 'official'
    },
    {
      title: 'Cherenkov Radiation Explained',
      url: 'https://www.aps.org/publications/apsnews/201511/cherenkov.cfm',
      author: 'American Physical Society',
      type: 'educational'
    }
  ],
  
  relatedFacts: [],
  relatedLessons: ['background-radiation'],
  
  image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400',
  
  tags: ['radiation', 'misconceptions', 'basics', 'visual']
};

export default radiationGlowsGreenMyth;


