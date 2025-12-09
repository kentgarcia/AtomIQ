import { Lesson } from '@/content/types';

export const typesOfRadiationLesson: Lesson = {
  id: 'types-of-radiation',
  title: 'Types of Radiation — Ionizing vs Non-Ionizing',
  description: 'Introduce learners to the electromagnetic spectrum and nuclear radiation types (alpha, beta, gamma, neutron). Explain the difference between ionizing and non-ionizing radiation and why not all radiation is harmful.',
  unitId: 'radiation-effects',
  difficulty: 'beginner',
  estimatedMinutes: 10,
  xpReward: 80,
  tags: ['radiation', 'ionizing', 'non-ionizing', 'alpha', 'beta', 'gamma', 'electromagnetic-spectrum'],
  prerequisites: ['meet-the-atom', 'nuclear-energy-explained'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Types of Radiation — Ionizing vs Non-Ionizing',
        mission: 'Agent, radiation is all around you, from sunlight to medical X-rays. Your mission: identify the different types of radiation and understand which are safe and which can be harmful.',
        icon: 'Flash'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'All radiation is deadly',
        reality: 'Radiation comes in many forms. Non-ionizing radiation (e.g., radio waves, microwaves, visible light) is generally safe, while ionizing radiation has enough energy to affect atoms',
        explanation: 'Not all radiation is harmful! Non-ionizing radiation includes everyday things like sunlight, radio waves, and microwaves. Ionizing radiation (alpha, beta, gamma) has higher energy and requires safety measures, but safety depends on exposure type and dose. You\'re surrounded by safe radiation right now!',
        image: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'Understanding Radiation Types',
        content: 'Radiation is energy traveling through space as waves (electromagnetic) or particles (nuclear). Not all radiation is harmful - it depends on the type and energy level. The electromagnetic spectrum ranges from low-energy radio waves to high-energy gamma rays.',
        keyPoints: [
          'Radiation: Energy traveling as waves or particles',
          'Non-Ionizing Radiation (Low Energy):',
          '  • Radio waves, microwaves, infrared, visible light',
          '  • Cannot ionize atoms → mostly harmless',
          '  • Used in everyday devices safely',
          '  • Analogy: Gentle push, not enough to knock anything over',
          'Ionizing Radiation (High Energy):',
          '  • Alpha particles: Heavy, low penetration (stopped by paper)',
          '  • Beta particles: Light, moderate penetration (stopped by aluminum)',
          '  • Gamma rays: Highly penetrating waves (need lead/concrete)',
          '  • Neutrons: Deeply penetrating particles',
          '  • Has enough energy to remove electrons',
          '  • Found in medical imaging, cosmic rays, natural sources',
          '  • Analogy: Strong punch - powerful but controllable with protection'
        ],
        image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Radiation Classification Lab',
        description: 'You\'re identifying different types of radiation. Some are safe, others need protection.',
        task: 'Which of the following is non-ionizing radiation?',
        options: [
          { id: 'gamma', label: 'Gamma rays', icon: 'Danger' },
          { id: 'alpha', label: 'Alpha particles', icon: 'ShieldSecurity' },
          { id: 'microwaves', label: 'Microwaves', icon: 'Sun' },
          { id: 'neutrons', label: 'Neutrons', icon: 'Element3' }
        ],
        correctAnswer: 'microwaves',
        explanation: 'Microwaves are non-ionizing radiation! They don\'t have enough energy to remove electrons from atoms. That\'s why your microwave oven is safe to use - it uses non-ionizing electromagnetic waves to heat food. Gamma rays, alpha particles, and neutrons are all ionizing radiation that requires proper safety measures.'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'Which type of radiation has enough energy to remove electrons from atoms?',
        options: [
          'Non-ionizing',
          'Ionizing',
          'Visible light',
          'Radio waves'
        ],
        correctIndex: 1,
        explanation: 'Ionizing radiation has enough energy to remove electrons from atoms, creating ions. This includes alpha particles, beta particles, gamma rays, X-rays, and neutrons. Non-ionizing radiation (like radio waves, microwaves, visible light) doesn\'t have enough energy to ionize atoms.',
        image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'
      }
    },
    
    {
      id: 'assessment-2',
      type: 'assessment',
      data: {
        question: 'True or False: All radiation is harmful.',
        options: ['True', 'False'],
        correctIndex: 1,
        explanation: 'False! Most radiation we encounter daily is non-ionizing and harmless - sunlight, radio waves, microwaves, WiFi signals. Even ionizing radiation is only harmful at high doses. The key factors are type, dose, and duration of exposure. We\'ve evolved with natural background radiation for millions of years.',
        image: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Radiation Expert!',
        message: 'You now understand the different types of radiation and can distinguish between safe and potentially harmful forms!',
        rewards: {
          xp: 80,
          stars: 3
        }
      }
    }
  ]
};

export default typesOfRadiationLesson;
