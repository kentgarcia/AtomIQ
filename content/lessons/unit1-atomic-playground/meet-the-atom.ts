import { Lesson } from '@/content/types';

export const meetTheAtomLesson: Lesson = {
  id: 'meet-the-atom',
  title: 'Meet the Atom',
  description: 'Discover the building blocks of matter: protons, neutrons, and electrons.',
  unitId: 'atomic-playground',
  difficulty: 'beginner',
  estimatedMinutes: 6,
  xpReward: 50,
  tags: ['basics', 'atom', 'protons', 'neutrons', 'electrons'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Meet the Atom',
        mission: 'Discover the Building Blocks of Matter!',
        icon: 'Atom'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'Atoms are the smallest things that exist',
        reality: 'Atoms are made of even smaller particles: protons, neutrons, and electrons',
        explanation: 'While atoms were once thought to be indivisible (the word "atom" means "uncuttable" in Greek), we now know they contain three main subatomic particles, each with unique properties.',
        image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'The Three Musketeers of the Atom',
        content: 'Every atom consists of three types of particles. The nucleus (center) contains protons (positive charge) and neutrons (no charge). Electrons (negative charge) orbit around the nucleus in shells.',
        keyPoints: [
          'Protons: Positive charge (+1), define the element',
          'Neutrons: No charge (0), add mass and stability',
          'Electrons: Negative charge (-1), orbit the nucleus',
          'Nucleus: Dense center with protons + neutrons',
          'Atomic number = number of protons'
        ],
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Build an Atom',
        description: 'Let\'s build a carbon atom! Carbon has 6 protons, 6 neutrons, and 6 electrons.',
        task: 'Which particle determines what element an atom is?',
        options: [
          { id: 'protons', label: 'Protons', icon: 'Add' },
          { id: 'neutrons', label: 'Neutrons', icon: 'Minus' },
          { id: 'electrons', label: 'Electrons', icon: 'Flash' },
          { id: 'all', label: 'All of them', icon: 'Category' }
        ],
        correctAnswer: 'protons',
        explanation: 'The number of protons (atomic number) determines the element. Carbon always has 6 protons. Change that number, and you have a different element! Neutrons can vary (isotopes), and electrons can be gained or lost (ions).'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'If an atom has 8 protons, 8 neutrons, and 8 electrons, what element is it?',
        options: ['Carbon (6)', 'Nitrogen (7)', 'Oxygen (8)', 'Fluorine (9)'],
        correctIndex: 2,
        explanation: 'It\'s Oxygen! The atomic number (number of protons) is 8, which defines oxygen. The numbers in parentheses are the atomic numbers of each element.',
        image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Atomic Master!',
        message: 'You now understand the fundamental structure of atoms!',
        rewards: {
          xp: 50,
          stars: 3
        }
      }
    }
  ]
};

export default meetTheAtomLesson;

