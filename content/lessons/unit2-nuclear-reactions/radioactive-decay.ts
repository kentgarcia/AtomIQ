import { Lesson } from '@/content/types';

export const radioactiveDecayLesson: Lesson = {
  id: 'radioactive-decay',
  title: 'Radioactive Decay and Half-Life',
  description: 'Learn how unstable nuclei transform into more stable forms through alpha, beta, and gamma decay. Understand half-life, decay chains, and how these predictable processes are used in medicine, dating, and industry.',
  unitId: 'nuclear-reactions',
  difficulty: 'intermediate',
  estimatedMinutes: 10,
  xpReward: 80,
  tags: ['decay', 'half-life', 'alpha', 'beta', 'gamma', 'radiometric-dating', 'medicine'],
  prerequisites: ['nuclear-fission'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Radioactive Decay and Half-Life',
        mission: 'Agent, some atoms are naturally unstable. Your mission: uncover how these nuclei decay over time and how scientists use this process safely in medicine, industry, and research.',
        icon: 'Clock'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'All radioactive materials are extremely dangerous and always harmful',
        reality: 'While high doses of radiation are harmful, controlled use of radioactive isotopes is safe and essential in medicine (imaging, therapy), industry, and scientific research',
        explanation: 'Radioactive materials are used safely every day in hospitals for cancer treatment and medical imaging. The key is controlled doses and proper handling. Carbon-14 in your body is radioactive, and you\'re perfectly fine! Dose and exposure time matter.',
        image: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'Types of Radioactive Decay',
        content: 'Radioactive decay is the process by which unstable atomic nuclei lose energy by emitting radiation. There are three main types of decay, each with different properties and penetrating power. Half-life is the predictable time required for half of the nuclei in a sample to decay.',
        keyPoints: [
          'Alpha decay (α): Releases 2 protons + 2 neutrons → reduces atomic # by 2',
          'Alpha particles: Stopped by paper, dangerous if ingested',
          'Beta decay (β): Neutron → proton + electron → changes atomic # by ±1',
          'Beta particles: Stopped by aluminum, moderate penetration',
          'Gamma decay (γ): High-energy photons → no change in atomic # or mass',
          'Gamma rays: Very penetrating, requires lead or concrete',
          'Half-life: Time for half the sample to decay (predictable)',
          'Decay chains: Isotopes decay into other radioactive isotopes',
          'Example: Uranium-238 → Thorium-234 → ... → Lead-206 (stable)',
          'Applications: Cancer radiotherapy, PET scans, carbon dating',
          'Industry: Thickness measurement, sterilization',
          'Analogy: Like sand trickling through hourglass - steady and measurable'
        ],
        image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Decay Type Identifier',
        description: 'You\'ve detected radiation from an unknown source. The particle has 2 protons and 2 neutrons and is stopped by a sheet of paper.',
        task: 'Which type of decay emits a particle with 2 protons and 2 neutrons?',
        options: [
          { id: 'alpha', label: 'Alpha decay', icon: 'ShieldSecurity' },
          { id: 'beta', label: 'Beta decay', icon: 'Flash' },
          { id: 'gamma', label: 'Gamma decay', icon: 'Sun' },
          { id: 'neutron', label: 'Neutron decay', icon: 'Element3' }
        ],
        correctAnswer: 'alpha',
        explanation: 'Alpha decay! Alpha particles consist of 2 protons and 2 neutrons (essentially a helium nucleus). They\'re the least penetrating form of radiation - stopped by paper or skin - but the most ionizing. They\'re dangerous only if alpha-emitting materials are ingested or inhaled.'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'True or False: Gamma decay changes the atomic number of an element.',
        options: ['True', 'False'],
        correctIndex: 1,
        explanation: 'False! Gamma decay only releases energy in the form of high-energy photons (electromagnetic radiation). It doesn\'t change the number of protons (atomic number) or neutrons (mass number). The nucleus just transitions to a lower energy state, like an electron dropping to a lower orbital.',
        image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400'
      }
    },
    
    {
      id: 'assessment-2',
      type: 'assessment',
      data: {
        question: 'What does "half-life" measure?',
        options: [
          'Time for all radioactive material to decay',
          'Time for half of a radioactive sample to decay',
          'Time for radiation to become dangerous',
          'Time for a reactor to produce half its energy'
        ],
        correctIndex: 1,
        explanation: 'Half-life is the time required for half of the radioactive nuclei in a sample to decay. This value is constant and unique for each isotope. For example, Carbon-14 has a half-life of 5,730 years, which is why it\'s useful for dating ancient artifacts. After one half-life, 50% remains; after two half-lives, 25% remains, and so on.',
        image: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=400'
      }
    },
    
    {
      id: 'assessment-3',
      type: 'assessment',
      data: {
        question: 'Name one application of radioactive decay in medicine.',
        options: [
          'PET scans for imaging',
          'Powering pacemakers',
          'Sterilizing surgical instruments',
          'All of the above'
        ],
        correctIndex: 3,
        explanation: 'All of the above! Radioactive decay has many medical applications: PET (Positron Emission Tomography) scans use positron-emitting isotopes for detailed imaging; some pacemakers are powered by plutonium-238 decay; and radiation is used to sterilize surgical instruments and medical supplies by killing bacteria and viruses.',
        image: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Decay Expert!',
        message: 'You now understand radioactive decay, half-life, and the beneficial applications of radioactivity!',
        rewards: {
          xp: 80,
          stars: 3
        }
      }
    }
  ]
};

export default radioactiveDecayLesson;
