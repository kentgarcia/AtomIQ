import { Lesson } from '../types';

export const nuclearFissionLesson: Lesson = {
  id: 'nuclear-fission',
  title: 'Nuclear Fission Basics',
  description: 'Understand how nuclear fission works and powers nuclear reactors.',
  unitId: 'nuclear-basics',
  difficulty: 'beginner',
  estimatedMinutes: 7,
  xpReward: 60,
  tags: ['fission', 'energy', 'reactor', 'uranium'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Nuclear Fission',
        mission: 'Split the Atom!',
        icon: 'Flash'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'Nuclear fission is the same as nuclear fusion',
        reality: 'Fission splits atoms apart, while fusion combines them',
        explanation: 'Nuclear fission splits heavy atoms (like uranium) into lighter ones, releasing energy. Fusion combines light atoms (like hydrogen) into heavier ones. Both release energy, but through opposite processes.',
        image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'How Fission Works',
        content: 'When a neutron strikes a uranium-235 atom, it splits into two smaller atoms, releasing 2-3 more neutrons and a large amount of energy. These neutrons can then split more atoms, creating a chain reaction.',
        keyPoints: [
          'One neutron triggers the split',
          'Atom splits into two smaller atoms',
          '2-3 new neutrons are released',
          'Energy is released as heat',
          'Chain reaction can be controlled'
        ],
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Chain Reaction Control',
        description: 'Control the chain reaction by managing neutron flow.',
        task: 'What controls the rate of fission in a nuclear reactor?',
        options: [
          { id: 'water', label: 'Water', icon: 'Drop' },
          { id: 'control-rods', label: 'Control Rods', icon: 'Setting2' },
          { id: 'fuel', label: 'More Fuel', icon: 'Gas' },
          { id: 'temperature', label: 'Temperature', icon: 'Temperature' }
        ],
        correctAnswer: 'control-rods',
        explanation: 'Control rods made of materials like boron or cadmium absorb neutrons, slowing or stopping the chain reaction. Inserting them deeper slows the reaction, pulling them out speeds it up.'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'What happens when a uranium-235 atom undergoes fission?',
        options: [
          'It combines with another atom',
          'It splits into two smaller atoms and releases neutrons',
          'It becomes heavier',
          'It turns into lead'
        ],
        correctIndex: 1,
        explanation: 'During fission, a uranium-235 atom splits into two smaller atoms (fission products) and releases 2-3 neutrons plus a large amount of energy in the form of heat.',
        image: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Fission Master!',
        message: 'You now understand the basics of nuclear fission.',
        rewards: {
          xp: 60,
          stars: 3
        }
      }
    }
  ]
};

export default nuclearFissionLesson;

