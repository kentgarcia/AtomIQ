import { Lesson } from '@/content/types';

export const nuclearFissionLesson: Lesson = {
  id: 'nuclear-fission',
  title: 'Nuclear Fission — Splitting the Atom',
  description: 'Learn how a heavy nucleus splits into smaller nuclei, releasing large amounts of energy. This lesson explains chain reactions, criticality, and how nuclear reactors safely harness fission.',
  unitId: 'nuclear-reactions',
  difficulty: 'intermediate',
  estimatedMinutes: 10,
  xpReward: 80,
  tags: ['fission', 'chain-reaction', 'reactors', 'uranium', 'energy', 'criticality'],
  prerequisites: ['meet-the-atom', 'nuclear-energy-explained'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Nuclear Fission — Splitting the Atom',
        mission: 'Agent, your mission is to explore the power inside heavy atomic nuclei. Learn how splitting a nucleus releases tremendous energy safely in nuclear reactors.',
        icon: 'Flash'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'Nuclear reactors explode like atomic bombs',
        reality: 'Reactors operate under controlled conditions. Chain reactions are carefully regulated, and safety systems prevent explosions like those of nuclear weapons',
        explanation: 'Nuclear reactors use controlled fission with moderators and control rods to maintain steady energy output. The fuel enrichment and reactor design make explosions physically impossible. Bombs require highly enriched uranium and completely different engineering.',
        image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'Nuclear Fission Explained',
        content: 'Nuclear fission is the splitting of a heavy nucleus (e.g., Uranium-235 or Plutonium-239) into smaller nuclei, releasing energy, free neutrons, and gamma radiation. The released neutrons can trigger further fission in nearby nuclei, creating a chain reaction.',
        keyPoints: [
          'Fission: Splitting heavy nucleus → smaller nuclei + energy + neutrons',
          'Chain reaction: Released neutrons trigger more fission events',
          'Controlled chain reaction: Steady energy output in reactors',
          'Uncontrolled chain reaction: Basis of atomic bombs',
          'Subcritical: Reaction dies out',
          'Critical: Reaction is steady (ideal for power generation)',
          'Supercritical: Reaction grows (unsafe, like in weapons)',
          'Moderators (water, graphite): Slow down neutrons',
          'Control rods: Absorb excess neutrons to regulate reaction',
          'Heat from fission → steam → turbines → electricity',
          'Analogy: Nucleus like a tightly wound spring releasing energy'
        ],
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Chain Reaction Simulator',
        description: 'You\'re controlling a nuclear reactor. The chain reaction is happening, and you need to keep it at a critical (steady) state.',
        task: 'What is the purpose of control rods in a reactor?',
        options: [
          { id: 'accelerate', label: 'Accelerate the reaction', icon: 'Flash' },
          { id: 'absorb', label: 'Absorb neutrons and regulate', icon: 'Setting2' },
          { id: 'split', label: 'Split nuclei', icon: 'Element3' },
          { id: 'release', label: 'Release gamma rays', icon: 'Danger' }
        ],
        correctAnswer: 'absorb',
        explanation: 'Control rods absorb neutrons and regulate the chain reaction! Made of materials like boron or cadmium, they can be inserted or withdrawn to control the reaction rate. Think of them as the "brakes" of a nuclear reactor - they keep the energy flow safe and steady.'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'Nuclear fission involves:',
        options: [
          'Splitting heavy nuclei',
          'Joining light nuclei',
          'Movement of electrons',
          'Proton decay'
        ],
        correctIndex: 0,
        explanation: 'Nuclear fission involves splitting heavy nuclei like Uranium-235 into smaller fragments, releasing tremendous energy. Each fission event releases about 200 MeV of energy - millions of times more than chemical reactions!',
        image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400'
      }
    },
    
    {
      id: 'assessment-2',
      type: 'assessment',
      data: {
        question: 'True or False: Reactors explode like atomic bombs.',
        options: ['True', 'False'],
        correctIndex: 1,
        explanation: 'False! Nuclear reactors cannot explode like atomic bombs. Reactor fuel is only 3-5% enriched uranium, while bombs need 90%+ enrichment. Reactors have multiple safety systems, moderators, and control rods that prevent supercritical conditions. The physics simply doesn\'t allow it.',
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400'
      }
    },
    
    {
      id: 'assessment-3',
      type: 'assessment',
      data: {
        question: 'Which element is most commonly used in fission reactors?',
        options: ['Plutonium-239', 'Uranium-235', 'Carbon-14', 'Hydrogen-2'],
        correctIndex: 1,
        explanation: 'Uranium-235 is the most commonly used fuel in nuclear reactors. It\'s the only naturally occurring fissile isotope, making up about 0.7% of natural uranium. Reactors enrich this to 3-5% for efficient energy production.',
        image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Fission Master!',
        message: 'You now understand how nuclear fission works and how it\'s safely controlled in reactors!',
        rewards: {
          xp: 80,
          stars: 3
        }
      }
    }
  ]
};

export default nuclearFissionLesson;
