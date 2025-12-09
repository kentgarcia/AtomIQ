import { Lesson } from '@/content/types';

export const nuclearFusionLesson: Lesson = {
  id: 'nuclear-fusion',
  title: 'Nuclear Fusion — Power of the Stars',
  description: 'Explore how lighter nuclei combine to form heavier ones, releasing enormous energy. Understand how fusion powers the sun, the challenges of achieving controlled fusion on Earth, and why fusion is different from fission.',
  unitId: 'nuclear-reactions',
  difficulty: 'intermediate',
  estimatedMinutes: 10,
  xpReward: 80,
  tags: ['fusion', 'stars', 'energy', 'deuterium', 'tritium', 'iter', 'tokamak'],
  prerequisites: ['nuclear-fission'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Nuclear Fusion — Power of the Stars',
        mission: 'Agent, the stars hold secrets to almost unlimited energy. Your mission: discover how fusing tiny nuclei releases massive energy and why scientists are racing to replicate it on Earth.',
        icon: 'Sun'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'Fusion is already a common energy source on Earth',
        reality: 'Controlled fusion is extremely difficult to maintain; current research reactors can create fusion reactions but not yet at a commercially viable scale',
        explanation: 'While fusion powers every star in the universe naturally, achieving controlled fusion on Earth requires temperatures of 100+ million degrees and precise containment. Projects like ITER are making progress, but commercial fusion power is still years away.',
        image: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'Nuclear Fusion Explained',
        content: 'Nuclear fusion is the joining of two light nuclei (e.g., hydrogen isotopes) to form a heavier nucleus, releasing enormous amounts of energy. This is the process that powers the sun and all stars naturally. Fusion produces more energy than fission and creates minimal radioactive waste.',
        keyPoints: [
          'Fusion: Joining light nuclei → heavier nucleus + massive energy',
          'Powers the sun and stars naturally',
          'Fission vs Fusion comparison:',
          '  Fission: Splits heavy nuclei → high energy → radioactive waste',
          '  Fusion: Joins light nuclei → extremely high energy → minimal waste',
          'Common fuels: Deuterium & Tritium (hydrogen isotopes)',
          'Challenges: Requires 100+ million degree temperatures',
          'Must overcome repulsion between positively charged nuclei',
          'Confinement methods: Magnetic (tokamak) or inertial (lasers)',
          'Major projects: ITER (France), NIF (USA)',
          'Future potential: Clean, almost unlimited energy',
          'Analogy: Like pushing two magnets together until they snap with huge energy'
        ],
        image: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Fusion vs Fission Lab',
        description: 'You\'re comparing nuclear reactions. Each has different characteristics and applications.',
        task: 'Compared to fission, fusion produces:',
        options: [
          { id: 'less', label: 'Less energy', icon: 'Minus' },
          { id: 'more', label: 'More energy', icon: 'Flash' },
          { id: 'same', label: 'Same energy', icon: 'Equal' },
          { id: 'none', label: 'No energy', icon: 'CloseCircle' }
        ],
        correctAnswer: 'more',
        explanation: 'Fusion produces MORE energy than fission! Gram for gram, fusion releases about 4 times more energy than fission. The sun produces energy equivalent to 90 billion megatons of TNT per second through fusion. Plus, fusion produces minimal radioactive waste and uses abundant fuel sources like seawater!'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'Nuclear fusion involves:',
        options: [
          'Splitting heavy nuclei',
          'Joining light nuclei',
          'Movement of electrons',
          'Proton decay'
        ],
        correctIndex: 1,
        explanation: 'Nuclear fusion involves joining light nuclei (like hydrogen isotopes deuterium and tritium) to form heavier nuclei, releasing enormous energy in the process. This is the same process that makes stars shine!',
        image: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400'
      }
    },
    
    {
      id: 'assessment-2',
      type: 'assessment',
      data: {
        question: 'True or False: Fusion reactors currently provide electricity to homes.',
        options: ['True', 'False'],
        correctIndex: 1,
        explanation: 'False! While experimental fusion reactors exist and have achieved fusion reactions, no fusion reactor currently generates commercial electricity. The challenge is maintaining the reaction long enough and efficiently enough to produce net energy. ITER aims to achieve this milestone in the coming decades.',
        image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400'
      }
    },
    
    {
      id: 'assessment-3',
      type: 'assessment',
      data: {
        question: 'Which element is commonly used in fusion experiments?',
        options: [
          'Uranium',
          'Hydrogen isotopes (Deuterium & Tritium)',
          'Carbon',
          'Plutonium'
        ],
        correctIndex: 1,
        explanation: 'Hydrogen isotopes - specifically Deuterium and Tritium (D-T fusion) - are commonly used in fusion experiments. Deuterium can be extracted from seawater, making it incredibly abundant. The D-T reaction is the easiest fusion reaction to achieve because it requires the "lowest" temperature (only 100 million degrees!).',
        image: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Fusion Expert!',
        message: 'You now understand the incredible power of fusion and why it\'s the energy source of the future!',
        rewards: {
          xp: 80,
          stars: 3
        }
      }
    }
  ]
};

export default nuclearFusionLesson;
