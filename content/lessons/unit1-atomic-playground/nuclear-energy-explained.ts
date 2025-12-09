import { Lesson } from '@/content/types';

export const nuclearEnergyExplainedLesson: Lesson = {
  id: 'nuclear-energy-explained',
  title: 'Nuclear Energy Explained',
  description: 'Explore how energy is stored in the nucleus of an atom and how it can be released through nuclear reactions.',
  unitId: 'atomic-playground',
  difficulty: 'beginner',
  estimatedMinutes: 8,
  xpReward: 60,
  tags: ['basics', 'nuclear-energy', 'fission', 'fusion', 'energy', 'power-generation'],
  prerequisites: ['meet-the-atom'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Nuclear Energy Explained',
        mission: 'Agent, energy is hidden inside every atom. Your mission: discover how the tiny nucleus stores immense power and how scientists can safely harness it for electricity.',
        icon: 'Flash'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'Nuclear energy works like a giant bomb and is always unsafe',
        reality: 'Nuclear energy can be controlled and used safely in reactors to generate electricity',
        explanation: 'Nuclear bombs use extremely different reactions under uncontrolled conditions. Power plants rely on careful regulation and shielding. The processes are fundamentally different - reactors use controlled fission to produce steady heat for electricity.',
        image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'What is Nuclear Energy?',
        content: 'Nuclear energy is energy stored in the nucleus of an atom due to the strong force binding protons and neutrons together. This energy can be released in nuclear reactions through fission (splitting) or fusion (joining). When released in a controlled way, this energy can generate electricity to power homes and cities.',
        keyPoints: [
          'Nuclear energy: Energy stored in the atomic nucleus',
          'Strong force: Binds protons and neutrons together',
          'Nuclear fission: Heavy nucleus splits → releases large energy',
          'Nuclear fusion: Light nuclei combine → releases enormous energy',
          'Controlled fission = nuclear power plants',
          'Example: Uranium-235 in a reactor → energy for electricity',
          'Applications: Electricity generation, medical uses, research',
          'Analogy: Nucleus = compressed spring releasing energy'
        ],
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Energy Sources Lab',
        description: 'Nuclear fission splits heavy atoms like Uranium-235 to release energy. This controlled process heats water to create steam, which spins turbines to generate electricity.',
        task: 'What part of the atom contains the energy used in nuclear reactions?',
        options: [
          { id: 'electron', label: 'Electron', icon: 'Flash' },
          { id: 'proton', label: 'Proton', icon: 'Add' },
          { id: 'neutron', label: 'Neutron', icon: 'Minus' },
          { id: 'nucleus', label: 'Nucleus', icon: 'Discover' }
        ],
        correctAnswer: 'nucleus',
        explanation: 'The nucleus! Nuclear energy comes from the strong force holding protons and neutrons together in the nucleus. When the nucleus splits (fission) or combines (fusion), this energy is released. It\'s incredibly dense - a single uranium pellet the size of your fingertip contains as much energy as a ton of coal!'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'What is nuclear fission?',
        options: [
          'Joining of light nuclei',
          'Splitting of heavy nuclei',
          'Movement of electrons',
          'Decay of neutrons'
        ],
        correctIndex: 1,
        explanation: 'Nuclear fission is the splitting of heavy nuclei (like Uranium-235) into smaller nuclei, releasing large amounts of energy. This is the process used in nuclear power plants to generate electricity. The energy released heats water to create steam, which drives turbines.',
        image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400'
      }
    },
    
    {
      id: 'assessment-2',
      type: 'assessment',
      data: {
        question: 'True or False: Nuclear energy in power plants is the same as in bombs.',
        options: ['True', 'False'],
        correctIndex: 1,
        explanation: 'False! Reactors use carefully controlled fission reactions with safety systems and regulations. Bombs use uncontrolled chain reactions with highly enriched materials. Power plants produce steady, controlled energy - they are designed to be inherently safe and cannot explode like bombs.',
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Energy Expert!',
        message: 'You now understand how nuclear energy works and its applications in modern society!',
        rewards: {
          xp: 60,
          stars: 3
        }
      }
    }
  ]
};

export default nuclearEnergyExplainedLesson;
