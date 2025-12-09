import { Lesson } from '@/content/types';

export const meetTheAtomLesson: Lesson = {
  id: 'meet-the-atom',
  title: 'The Atom: Building Blocks of Matter',
  description: 'Introduce what atoms are, their internal structure, and explain why atoms are considered the fundamental units of all matter.',
  unitId: 'atomic-playground',
  difficulty: 'beginner',
  estimatedMinutes: 8,
  xpReward: 50,
  tags: ['basics', 'atom', 'protons', 'neutrons', 'electrons', 'nucleus', 'atomic-structure'],
  prerequisites: [],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'The Atom: Building Blocks of Matter',
        mission: 'Agent, welcome to the tiniest world in the universe. Everything you see, touch, or feel is made of invisible building blocks called atoms. Your mission: explore the parts of an atom and understand why they are the foundation of all matter.',
        icon: 'Atom'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'Atoms are solid, indivisible spheres',
        reality: 'Atoms are made up of a nucleus (containing protons and neutrons) and electrons that orbit the nucleus',
        explanation: 'Atoms are mostly empty space, and their structure allows for chemical reactions, electricity, and nuclear energy. The word "atom" comes from Greek "atomos" meaning "uncuttable," but we now know atoms contain even smaller particles.',
        image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'What is an Atom?',
        content: 'The smallest unit of matter that retains the properties of an element. All matter, from air to water to metals, is made of atoms. An atom consists of a dense central nucleus containing protons (positively charged) and neutrons (neutral), surrounded by electrons (negatively charged) orbiting in shells or energy levels.',
        keyPoints: [
          'Nucleus: Dense central core with protons and neutrons',
          'Protons: Positively charged particles in the nucleus',
          'Neutrons: Neutral particles with similar mass to protons',
          'Electrons: Negatively charged particles orbiting the nucleus',
          'Atomic number: Number of protons (defines the element)',
          'Mass number: Total protons + neutrons',
          'Isotopes: Same element, different number of neutrons',
          'Analogy: Nucleus = Sun, electrons = orbiting planets',
          'Most of an atom is empty space'
        ],
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Atomic History Timeline',
        description: 'The understanding of atoms evolved over thousands of years. Match the scientist to their discovery!',
        task: 'Who discovered the nucleus of the atom?',
        options: [
          { id: 'democritus', label: 'Democritus (400 BCE)', icon: 'People' },
          { id: 'dalton', label: 'Dalton (1803)', icon: 'Category' },
          { id: 'thomson', label: 'Thomson (1897)', icon: 'Flash' },
          { id: 'rutherford', label: 'Rutherford (1911)', icon: 'Discover' }
        ],
        correctAnswer: 'rutherford',
        explanation: 'Rutherford discovered the nucleus in 1911 through his famous gold foil experiment! He found that atoms have a dense, positive center (nucleus) with electrons orbiting around it. Democritus coined "atomos," Dalton proposed the solid sphere model, and Thomson discovered electrons with his "plum pudding" model.'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'Which particle in an atom has a positive charge?',
        options: ['Electron', 'Proton', 'Neutron', 'Nucleus'],
        correctIndex: 1,
        explanation: 'Protons have a positive charge (+1). Electrons have a negative charge (-1), and neutrons have no charge (neutral). The nucleus contains protons and neutrons, so it has an overall positive charge.',
        image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400'
      }
    },
    
    {
      id: 'assessment-2',
      type: 'assessment',
      data: {
        question: 'What defines an element?',
        options: ['Number of neutrons', 'Number of electrons', 'Number of protons', 'Atomic mass'],
        correctIndex: 2,
        explanation: 'The number of protons (atomic number) defines an element. All carbon atoms have 6 protons, all oxygen atoms have 8 protons, and so on. Neutrons can vary (creating isotopes), and electrons can be gained or lost (creating ions).',
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Mission Complete!',
        message: 'You now understand the fundamental structure of atoms and their historical discovery!',
        rewards: {
          xp: 50,
          stars: 3
        }
      }
    }
  ]
};

export default meetTheAtomLesson;

