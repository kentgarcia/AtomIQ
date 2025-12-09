import { Lesson } from '@/content/types';

export const nuclearSafetySystemsLesson: Lesson = {
  id: 'nuclear-safety-systems',
  title: 'Nuclear Safety Systems & Radiation Protection',
  description: 'This lesson introduces the fundamental principles of nuclear safety, including defense-in-depth, radiation protection standards, safety culture, and emergency preparedness. Students learn how modern nuclear systems are designed to prevent accidents and minimize exposure.',
  unitId: 'nuclear-safety-security',
  difficulty: 'advanced',
  estimatedMinutes: 15,
  xpReward: 100,
  tags: ['safety', 'defense-in-depth', 'radiation-protection', 'alara', 'emergency', 'containment'],
  prerequisites: ['nuclear-fission', 'measuring-radiation'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Nuclear Safety Systems & Radiation Protection',
        mission: 'Agent, you\'re entering one of the most secure technologies on Earth. Your mission: uncover how nuclear facilities stay safe, prevent accidents, and protect people from unnecessary radiation exposure.',
        icon: 'ShieldTick'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'Nuclear power plants can explode like atomic bombs',
        reality: 'Civilian reactors cannot explode like bombs. Their fuel is not enriched enough, and reactors are engineered with multiple safety barriers called defense-in-depth',
        explanation: 'Reactor fuel is only 3-5% enriched uranium, while bombs need 90%+ enrichment. Reactors have 5+ layers of safety: fuel design, cladding, coolant systems, containment buildings, and automatic shutdown. Even if several layers fail, others protect against catastrophic failure. The physics simply doesn\'t allow a nuclear explosion.',
        image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'Nuclear Safety: Multiple Layers of Protection',
        content: 'Nuclear safety is the system of technologies, rules, barriers, and behaviors designed to prevent accidents and protect people and the environment. Modern nuclear plants use defense-in-depth - multiple independent layers of protection so that even if one fails, others remain effective.',
        keyPoints: [
          'Nuclear Safety: Prevents accidents, contains radiation, protects workers',
          'Defense-in-Depth: Multiple safety layers',
          '  Layer 1 - Fuel Design: Ceramic pellets stay stable under heat',
          '  Layer 2 - Fuel Cladding: Metal tubes seal radioactive material',
          '  Layer 3 - Reactor Coolant: Circulates water, prevents overheating',
          '  Layer 4 - Containment Building: Thick concrete-steel dome',
          '  Layer 5 - Emergency Shutdown (SCRAM): Control rods drop instantly',
          'Radiation Protection Principles (TDS):',
          '  • Time: Minimize exposure duration',
          '  • Distance: Increase space from source (inverse square law)',
          '  • Shielding: Alpha→paper, Beta→aluminum, Gamma→lead/concrete',
          'ALARA Principle: "As Low As Reasonably Achievable"',
          '  • Keep doses far below limits, even when safe',
          '  • Used in hospitals, plants, labs, industry',
          'Safety Culture:',
          '  • Safety before productivity',
          '  • Immediate incident reporting',
          '  • Strict procedure following',
          '  • Continuous training',
          '  • Workers can stop unsafe operations',
          'Emergency Preparedness: Drills, evacuation plans, backup power',
          'Result: Nuclear reactors = aviation-level safety'
        ],
        image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Defense-in-Depth Simulator',
        description: 'You\'re analyzing a reactor\'s safety systems. Understanding the multiple layers is crucial for nuclear safety.',
        task: 'Which layer is the final barrier preventing radioactive release to the environment?',
        options: [
          { id: 'fuel', label: 'Fuel pellet design', icon: 'Element3' },
          { id: 'cladding', label: 'Fuel cladding', icon: 'Box' },
          { id: 'coolant', label: 'Coolant system', icon: 'Drop' },
          { id: 'containment', label: 'Containment building', icon: 'ShieldTick' }
        ],
        correctAnswer: 'containment',
        explanation: 'The containment building! This massive concrete-and-steel structure (often 3+ feet thick) is designed to withstand earthquakes, hurricanes, plane crashes, and internal accidents. It\'s the final physical barrier between the reactor and the environment. Even in the worst-case scenario like Fukushima, containment prevented the massive release that could have occurred without it.'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'What does ALARA stand for in radiation protection?',
        options: [
          'Always Limit All Radiation Activities',
          'As Low As Reasonably Achievable',
          'Automatic Level Adjustment for Radiation Analysis',
          'Advanced Laboratory And Research Association'
        ],
        correctIndex: 1,
        explanation: 'ALARA means "As Low As Reasonably Achievable." This principle ensures radiation doses stay far below safety limits through careful planning, design, and procedures. It\'s not about zero radiation (which is impossible due to background radiation), but about minimizing exposure while still performing necessary work.',
        image: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=400'
      }
    },
    
    {
      id: 'assessment-2',
      type: 'assessment',
      data: {
        question: 'True or False: Modern nuclear reactors have passive safety features that work without electricity or human intervention.',
        options: ['True', 'False'],
        correctIndex: 0,
        explanation: 'True! Modern reactors (Generation III+) have passive safety features that rely on natural forces like gravity, convection, and pressure differentials. For example, passive cooling systems use natural circulation to remove heat even if all power is lost. These features made designs like the AP1000 and EPR significantly safer than older reactors.',
        image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Safety Systems Expert!',
        message: 'You now understand the multiple layers of safety that make nuclear technology one of the safest energy sources!',
        rewards: {
          xp: 100,
          stars: 3
        }
      }
    }
  ]
};

export default nuclearSafetySystemsLesson;
