import { Lesson } from '@/content/types';

export const measuringRadiationLesson: Lesson = {
  id: 'measuring-radiation',
  title: 'Measuring Radiation & Safety Standards',
  description: 'Introduce radiation units (Becquerel, Gray, Sievert), detection tools (Geiger counter, dosimeters), and internationally recognized safety standards. Learners understand exposure limits, shielding, distance, and time principles.',
  unitId: 'radiation-effects',
  difficulty: 'intermediate',
  estimatedMinutes: 12,
  xpReward: 90,
  tags: ['radiation', 'measurement', 'safety', 'sievert', 'becquerel', 'gray', 'geiger-counter', 'dosimeter'],
  prerequisites: ['types-of-radiation', 'radiation-biological-effects'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Measuring Radiation & Safety Standards',
        mission: 'Agent, radiation can\'t be seen — but with the right tools, you can measure it. Your mission: learn how scientists detect radiation and how safety standards protect people every day.',
        icon: 'Setting2'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'There is no safe level of radiation',
        reality: 'We are exposed to natural radiation 24/7. International guidelines define safe limits, and most radiation levels in daily life fall far below harmful thresholds',
        explanation: 'Safe radiation levels absolutely exist! We\'ve been exposed to background radiation since life began on Earth. International agencies like IAEA and WHO have established evidence-based safety standards. People living at high altitudes or in areas with granite rocks experience higher natural radiation with no health effects.',
        image: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'Radiation Units & Measurement',
        content: 'Scientists use different units to measure different aspects of radiation. Becquerel measures radioactivity (how many atoms decay), Gray measures absorbed dose (energy deposited), and Sievert measures biological impact (actual effect on the body). Each tells us something different about radiation exposure.',
        keyPoints: [
          'Radiation Units:',
          '  • Becquerel (Bq): Measures radioactivity (rate of decay)',
          '  • Gray (Gy): Measures absorbed dose (energy per kg tissue)',
          '  • Sievert (Sv): Measures effective dose (biological impact)',
          '  • Analogy: Bq = bullets fired, Gy = bullets that hit, Sv = damage done',
          'Measuring Devices:',
          '  • Geiger counter: Detects ionizing radiation levels instantly',
          '  • Dosimeter: Worn to track accumulated exposure over time',
          '  • Scintillation detectors: High-sensitivity gamma detection',
          '  • Ionization chambers: Accurate lab/industry measurements',
          'Safety Principles (TDS):',
          '  • Time: Minimize duration of exposure',
          '  • Distance: Increase distance to reduce dose',
          '  • Shielding: Use proper materials',
          '    - Alpha → paper',
          '    - Beta → plastic or aluminum',
          '    - Gamma → lead or concrete',
          '    - Neutrons → water or hydrogen-rich materials',
          'Safety Standards Set By:',
          '  • IAEA (International Atomic Energy Agency)',
          '  • WHO (World Health Organization)',
          '  • UNSCEAR',
          '  • National nuclear regulatory agencies',
          'Protected Uses: Medical imaging, industry, research, nuclear plants'
        ],
        image: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Radiation Measurement Lab',
        description: 'You\'re selecting the right measurement tools and units for different scenarios.',
        task: 'Which unit measures the biological effect of radiation on the human body?',
        options: [
          { id: 'becquerel', label: 'Becquerel (Bq)', icon: 'Flash' },
          { id: 'gray', label: 'Gray (Gy)', icon: 'Category' },
          { id: 'sievert', label: 'Sievert (Sv)', icon: 'Health' },
          { id: 'milliampere', label: 'Milliampere (mA)', icon: 'Setting2' }
        ],
        correctAnswer: 'sievert',
        explanation: 'Sievert (Sv) measures the biological effect of radiation! It accounts for the type of radiation and the sensitivity of different tissues. For context: average annual background radiation is ~3 mSv, a chest X-ray is ~0.1 mSv, and acute radiation sickness starts around 1,000 mSv (1 Sv). Most exposures are in millisieverts (mSv) or microsieverts (μSv).'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'Which device is used to track personal radiation exposure over time?',
        options: [
          'Scintillator',
          'Dosimeter',
          'Geiger tube',
          'X-ray scanner'
        ],
        correctIndex: 1,
        explanation: 'A dosimeter is worn by workers in radiation environments to track accumulated exposure over time. It provides a cumulative record of exposure and alerts if safety limits are approached. Nuclear plant workers, radiologists, and radiation researchers wear dosimeters to ensure their exposure stays within safe limits.',
        image: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=400'
      }
    },
    
    {
      id: 'assessment-2',
      type: 'assessment',
      data: {
        question: 'True or False: Distance reduces radiation exposure.',
        options: ['True', 'False'],
        correctIndex: 0,
        explanation: 'True! Radiation intensity decreases with distance following the inverse square law - doubling the distance reduces exposure to one-quarter. This is one of the three key safety principles: Time, Distance, and Shielding (TDS). Simply stepping back from a radiation source significantly reduces your exposure.',
        image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Safety Expert!',
        message: 'You now understand how to measure radiation and the safety principles that protect us every day!',
        rewards: {
          xp: 90,
          stars: 3
        }
      }
    }
  ]
};

export default measuringRadiationLesson;
