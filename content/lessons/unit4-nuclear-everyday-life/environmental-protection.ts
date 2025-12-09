import { Lesson } from '@/content/types';

export const environmentalProtectionLesson: Lesson = {
  id: 'environmental-protection',
  title: 'Nuclear Technology in Environmental Protection & Research',
  description: 'Learners discover how nuclear technology helps monitor pollution, track climate change, preserve water quality, and support ecological research. This lesson corrects the myth that nuclear science only harms the environment — in many ways, it protects it.',
  unitId: 'nuclear-everyday-life',
  difficulty: 'intermediate',
  estimatedMinutes: 12,
  xpReward: 90,
  tags: ['environment', 'climate', 'conservation', 'ecology', 'pollution', 'research', 'sustainability'],
  prerequisites: ['industrial-agricultural-uses'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Environmental Protection & Research',
        mission: 'Agent, nuclear science doesn\'t just help people — it helps the planet. Your mission: explore how radiation tools track pollution, study oceans, and protect ecosystems worldwide.',
        icon: 'Global'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'Nuclear technology only harms the environment',
        reality: 'Nuclear science is a powerful environmental tool — used to track climate change, clean water sources, study soil health, and protect ecosystems',
        explanation: 'Nuclear technology is actually an environmental hero! Isotopic techniques track pollution sources, monitor groundwater, and reveal climate history through ice cores. Nuclear power produces zero air pollution and has the lowest carbon footprint of major energy sources. Scientists use radioactive tracers to protect endangered species and study ocean health.',
        image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'Nuclear Technology for the Planet',
        content: 'Nuclear science provides unique tools for environmental protection and research. From tracking pollution sources to studying ancient climate patterns, from monitoring ocean health to protecting endangered species - nuclear technology helps scientists understand and protect our planet.',
        keyPoints: [
          'Environmental Monitoring:',
          '  • Air Pollution Tracing: Identify sources via isotopic signatures',
          '  • Track heavy metals and particulates',
          '  • Water Quality: Detect contaminants, monitor groundwater',
          '  • Study ocean acidification',
          '  • Soil & Land: Measure erosion, improve fertility',
          '  • Assess contamination patterns',
          'Climate & Ecosystem Research:',
          '  • Isotopic Climate Records: Ice cores reveal historical patterns',
          '  • Predict future climate shifts',
          '  • Marine Studies: Track fish migration, coral bleaching',
          '  • Monitor ocean currents and temperature',
          '  • Wildlife Protection: Radio-tracking for conservation',
          '  • Determine animal diet and migration patterns',
          'Clean Energy Benefits:',
          '  • Nuclear power: Zero air pollution',
          '  • Lowest carbon emissions among major energy sources',
          '  • Helps combat climate change',
          '  • Land-efficient energy production',
          'Key Point: Nuclear tech both studies AND protects the environment'
        ],
        image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Environmental Research Lab',
        description: 'You\'re an environmental scientist investigating pollution in a river. You need to identify where the contamination is coming from.',
        task: 'Which tool helps identify pollution sources by analyzing unique isotopic signatures?',
        options: [
          { id: 'chamber', label: 'Ionization chamber', icon: 'Box' },
          { id: 'tracing', label: 'Isotopic tracing', icon: 'Discover' },
          { id: 'pet', label: 'PET scanner', icon: 'Health' },
          { id: 'dosimeter', label: 'Dosimeter', icon: 'ShieldTick' }
        ],
        correctAnswer: 'tracing',
        explanation: 'Isotopic tracing! Different pollution sources have unique isotopic "fingerprints" - like a chemical signature. Scientists can analyze isotope ratios to identify whether pollution comes from industrial runoff, agricultural fertilizers, or natural sources. This technique is also used to track water movement, study nutrient cycles, and monitor ecosystem health. It\'s detective work at the molecular level!'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'What do ice cores help scientists study using isotopic analysis?',
        options: [
          'Food safety',
          'Climate history',
          'Industrial welds',
          'Medical imaging'
        ],
        correctIndex: 1,
        explanation: 'Climate history! Ice cores contain trapped air bubbles and isotopes that reveal atmospheric conditions from hundreds of thousands of years ago. By analyzing oxygen and hydrogen isotopes, scientists can determine ancient temperatures, atmospheric CO₂ levels, and precipitation patterns. This data is crucial for understanding current climate change and predicting future trends.',
        image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400'
      }
    },
    
    {
      id: 'assessment-2',
      type: 'assessment',
      data: {
        question: 'True or False: Nuclear technology helps protect marine and land ecosystems.',
        options: ['True', 'False'],
        correctIndex: 0,
        explanation: 'True! Nuclear technology is essential for conservation: radio-tracking helps protect endangered species by monitoring migration and behavior; isotopic analysis reveals food webs and ecosystem health; radioactive tracers track nutrient flows in oceans and forests; and nuclear-derived techniques help combat illegal fishing and poaching. Plus, nuclear energy\'s low carbon footprint helps fight climate change - the biggest threat to ecosystems.',
        image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Environmental Guardian!',
        message: 'You now understand how nuclear technology protects our planet and helps scientists study and preserve ecosystems!',
        rewards: {
          xp: 90,
          stars: 3
        }
      }
    }
  ]
};

export default environmentalProtectionLesson;
