import { Lesson } from '@/content/types';

export const radiationBiologicalEffectsLesson: Lesson = {
  id: 'radiation-biological-effects',
  title: 'Radiation Interaction & Biological Effects',
  description: 'Explain how radiation interacts with the human body, the difference between acute and chronic exposure, deterministic vs stochastic effects, and how cells repair radiation damage.',
  unitId: 'radiation-effects',
  difficulty: 'intermediate',
  estimatedMinutes: 12,
  xpReward: 90,
  tags: ['radiation', 'biology', 'health', 'acute', 'chronic', 'deterministic', 'stochastic', 'dna-repair'],
  prerequisites: ['types-of-radiation'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Radiation Interaction & Biological Effects',
        mission: 'Agent, radiation doesn\'t just hit the body — it interacts with cells in specific ways. Your mission: learn what radiation actually does inside the body and how our cells can repair most of the damage.',
        icon: 'Health'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'Nuclear radiation instantly causes mutations',
        reality: 'Most radiation exposure causes no immediate effects. Cells have repair mechanisms, and mutations only occur at high doses or prolonged exposure',
        explanation: 'Your cells are incredibly resilient! They have sophisticated DNA repair mechanisms that fix most radiation damage. Everyday radiation levels do not cause instant or extreme effects. Even at Hiroshima, many survivors lived normal lifespans. The body is constantly repairing minor DNA damage from all sources.',
        image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'How Radiation Affects the Body',
        content: 'When ionizing radiation enters the body, it can remove electrons (ionization), break molecular bonds, or create free radicals. However, our cells have remarkable repair systems, and most low-dose damage is fixed naturally. The biological effect depends on dose, duration, and the body\'s ability to repair.',
        keyPoints: [
          'Radiation Interaction:',
          '  • Removes electrons → ionization',
          '  • Breaks molecular bonds',
          '  • Creates free radicals',
          '  • Analogy: Bumping dominoes - possible to knock one, not the whole line',
          'Types of Exposure:',
          '  • Acute: High dose in short time (rare, e.g., accidents)',
          '  • Chronic: Low dose over long periods (normal, background radiation)',
          '  • Most real-life exposure is chronic and low-dose (safe)',
          'Deterministic Effects (Have Threshold):',
          '  • Only happen if dose is high enough',
          '  • Examples: Skin burns, ARS, organ damage',
          '  • Below threshold → NO effects occur',
          'Stochastic Effects (No Threshold):',
          '  • Probability increases with dose, severity doesn\'t',
          '  • Example: Cancer risk (very small at low doses)',
          '  • Analogy: Raffle tickets - more tickets = higher chance, not bigger prize',
          'Cell Repair Mechanisms:',
          '  • Repair DNA damage',
          '  • Replace damaged cells',
          '  • Remove affected tissues',
          '  • Most low-dose damage repaired naturally',
          'Natural Sources: Food, cosmic rays, soil, radon, medical imaging'
        ],
        image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Biological Effects Analyzer',
        description: 'You\'re studying different types of radiation effects. Some have thresholds, others are probabilistic.',
        task: 'What type of biological effect only occurs after reaching a certain dose threshold?',
        options: [
          { id: 'stochastic', label: 'Stochastic', icon: 'Chart' },
          { id: 'deterministic', label: 'Deterministic', icon: 'ShieldTick' },
          { id: 'chronic', label: 'Chronic', icon: 'Clock' },
          { id: 'acute', label: 'Acute', icon: 'Flash' }
        ],
        correctAnswer: 'deterministic',
        explanation: 'Deterministic effects! These only occur when you reach a specific dose threshold. Below that threshold, the effect simply doesn\'t happen. Examples include skin burns and acute radiation syndrome (ARS). It\'s like needing a minimum temperature to boil water - below 100°C (at sea level), water won\'t boil no matter how long you wait.'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'Which exposure is long-term, low-dose?',
        options: [
          'Acute',
          'Chronic',
          'Deterministic',
          'Nuclear accident'
        ],
        correctIndex: 1,
        explanation: 'Chronic exposure is long-term, low-dose radiation exposure. This is what we experience daily from background radiation - cosmic rays, radon in soil, radioactive elements in food (like bananas!), and medical imaging. Our bodies have evolved to handle this chronic, low-level exposure effectively.',
        image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400'
      }
    },
    
    {
      id: 'assessment-2',
      type: 'assessment',
      data: {
        question: 'True or False: The body can repair most low-level radiation damage.',
        options: ['True', 'False'],
        correctIndex: 0,
        explanation: 'True! Our cells have sophisticated DNA repair mechanisms that fix most radiation damage from low-level exposure. Your body repairs thousands of DNA breaks every day from various sources - not just radiation, but also normal metabolism and oxidative stress. This is why chronic, low-dose radiation (like background radiation) is generally safe.',
        image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Biology Expert!',
        message: 'You now understand how radiation interacts with the body and the remarkable repair mechanisms that protect us!',
        rewards: {
          xp: 90,
          stars: 3
        }
      }
    }
  ]
};

export default radiationBiologicalEffectsLesson;
