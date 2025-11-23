import { Lesson } from '../types';

export const backgroundRadiationLesson: Lesson = {
  id: 'background-radiation',
  title: 'Natural vs. Artificial Radiation',
  description: 'Discover that most radiation exposure comes from natural sources, not human activities.',
  unitId: 'atomic-playground',
  difficulty: 'beginner',
  estimatedMinutes: 8,
  xpReward: 70,
  tags: ['basics', 'radiation', 'natural', 'background', 'exposure'],
  prerequisites: ['what-is-isotope'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Background Radiation',
        mission: 'Discover Natural Radiation!',
        icon: 'Sun'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'All radiation is man-made and dangerous',
        reality: '80% of radiation exposure comes from natural sources like the sun, rocks, and even bananas',
        explanation: 'We\'ve been exposed to natural radiation since life began on Earth. Cosmic rays from space, radon gas from rocks, potassium-40 in bananas - radiation is everywhere in nature! Human-made sources (medical X-rays, nuclear power) contribute only about 20% of our total exposure.',
        image: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'Sources of Natural Radiation',
        content: 'Background radiation is the constant low-level radiation we\'re exposed to every day from natural sources. It varies by location - living at high altitude or in areas with granite rocks increases your exposure.',
        keyPoints: [
          'Cosmic rays: From space, stronger at high altitudes',
          'Terrestrial: From rocks and soil (radon, uranium)',
          'Internal: Potassium-40 and Carbon-14 in our bodies',
          'Average: 3 mSv/year from natural sources',
          'Medical procedures: ~3 mSv/year average'
        ],
        image: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Radiation Source Detector',
        description: 'You\'re measuring radiation in different locations. Which gives you the HIGHEST natural dose?',
        task: 'Select the location with highest natural radiation exposure',
        options: [
          { id: 'beach', label: 'Beach (Sea Level)', icon: 'Sun' },
          { id: 'denver', label: 'Denver, Colorado', icon: 'Mountain' },
          { id: 'basement', label: 'Basement (Radon)', icon: 'Home' },
          { id: 'forest', label: 'Forest', icon: 'Tree' }
        ],
        correctAnswer: 'basement',
        explanation: 'Basements can have high radon concentrations! Radon is a radioactive gas from uranium decay in rocks. It\'s the second leading cause of lung cancer after smoking. Denver also has higher cosmic radiation due to altitude, but radon in poorly ventilated basements is typically higher.'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'According to UNSCEAR, what percentage of average human radiation exposure comes from natural sources?',
        options: ['20%', '50%', '80%', '100%'],
        correctIndex: 2,
        explanation: 'About 80% of our radiation exposure comes from natural sources (cosmic rays, radon, terrestrial radiation, and internal sources like potassium-40). The remaining 20% comes primarily from medical procedures like X-rays and CT scans.',
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Radiation Reality Check!',
        message: 'You now understand that radiation is a natural part of our environment!',
        rewards: {
          xp: 70,
          stars: 3
        }
      }
    }
  ]
};

export default backgroundRadiationLesson;

