import { Lesson } from '@/content/types';

export const historyOfNuclearScienceLesson: Lesson = {
  id: 'history-of-nuclear-science',
  title: 'History of Nuclear Science',
  description: 'Explore the historical development of nuclear science, from early atomic theories to modern nuclear technology.',
  unitId: 'atomic-playground',
  difficulty: 'beginner',
  estimatedMinutes: 9,
  xpReward: 70,
  tags: ['basics', 'history', 'scientists', 'discoveries', 'atomic-theory', 'radioactivity'],
  prerequisites: ['meet-the-atom', 'nuclear-energy-explained'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'History of Nuclear Science',
        mission: 'Agent, travel back in time to uncover how humans discovered the secrets of the atom. Your mission: learn the key milestones that shaped nuclear science and its applications in energy, medicine, and technology.',
        icon: 'Clock'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'Nuclear science started with bombs in the 20th century',
        reality: 'Atomic theory and nuclear research began centuries ago, long before weapons existed',
        explanation: 'Early scientists laid the groundwork for nuclear energy, medicine, and research. Democritus proposed the concept of atoms in 400 BCE! The scientific journey from ancient philosophy to modern nuclear technology spans over 2,400 years.',
        image: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'Timeline of Nuclear Science',
        content: 'The discovery of nuclear science evolved through key milestones over millennia. From ancient Greek philosophy to modern reactors, each discovery built upon the last to create the nuclear technology we have today.',
        keyPoints: [
          '400 BCE - Democritus: First idea of "atomos" (indivisible particles)',
          '1803 - Dalton: Solid sphere model; each element has unique atoms',
          '1897 - Thomson: Plum pudding model with electrons',
          '1898 - Becquerel & Curie: Discovery of radioactivity',
          '1911 - Rutherford: Gold foil experiment → discovered nucleus',
          '1913 - Bohr: Quantized electron shells model',
          '1938 - Hahn & Meitner: Discovery of nuclear fission',
          '1940s-1950s: Early nuclear reactors and research',
          'Modern: Power generation, medical imaging, industrial uses'
        ],
        image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Scientific Discovery Match',
        description: 'Many brilliant scientists contributed to our understanding of nuclear science. Each discovery was crucial!',
        task: 'Who discovered the nucleus of the atom?',
        options: [
          { id: 'dalton', label: 'Dalton', icon: 'Category' },
          { id: 'thomson', label: 'Thomson', icon: 'Flash' },
          { id: 'rutherford', label: 'Rutherford', icon: 'Discover' },
          { id: 'bohr', label: 'Bohr', icon: 'Setting2' }
        ],
        correctAnswer: 'rutherford',
        explanation: 'Ernest Rutherford discovered the nucleus in 1911! His famous gold foil experiment showed that atoms have a dense, positive center with electrons orbiting around it. This revolutionized atomic theory and paved the way for nuclear physics.'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'Which scientist proposed the "atomos" concept?',
        options: ['Democritus', 'Curie', 'Fermi', 'Einstein'],
        correctIndex: 0,
        explanation: 'Democritus, an ancient Greek philosopher in 400 BCE, first proposed the concept of "atomos" - indivisible particles that make up all matter. While his ideas were philosophical rather than scientific, he was remarkably ahead of his time!',
        image: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=400'
      }
    },
    
    {
      id: 'assessment-2',
      type: 'assessment',
      data: {
        question: 'True or False: Nuclear science only began in the 20th century.',
        options: ['True', 'False'],
        correctIndex: 1,
        explanation: 'False! While nuclear fission was discovered in 1938, atomic theory began thousands of years ago with Democritus. Scientists like Dalton (1803), Thomson (1897), and Rutherford (1911) made crucial discoveries about atomic structure long before nuclear weapons or power plants existed.',
        image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'History Master!',
        message: 'You now understand the fascinating historical journey of nuclear science from ancient philosophy to modern technology!',
        rewards: {
          xp: 70,
          stars: 3
        }
      }
    }
  ]
};

export default historyOfNuclearScienceLesson;
