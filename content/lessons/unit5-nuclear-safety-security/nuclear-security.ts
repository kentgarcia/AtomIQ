import { Lesson } from '@/content/types';

export const nuclearSecurityLesson: Lesson = {
  id: 'nuclear-security',
  title: 'Nuclear Security & Non-Proliferation',
  description: 'Students explore how countries prevent the theft, misuse, or illegal transport of nuclear materials. The lesson explains the Non-Proliferation Treaty (NPT), IAEA safeguards, nuclear material tracking, and global security frameworks.',
  unitId: 'nuclear-safety-security',
  difficulty: 'advanced',
  estimatedMinutes: 15,
  xpReward: 100,
  tags: ['security', 'non-proliferation', 'iaea', 'npt', 'safeguards', 'tracking', 'cybersecurity'],
  prerequisites: ['nuclear-safety-systems'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Nuclear Security & Non-Proliferation',
        mission: 'Agent, sensitive materials are on the move. Your new mission: learn how global systems stop nuclear materials from falling into the wrong hands.',
        icon: 'ShieldSearch'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'Nuclear materials can easily be stolen or smuggled',
        reality: 'Nuclear materials are tracked, sealed, monitored, and inspected under strict international rules. The IAEA uses surveillance, sensors, audits, and real-time monitoring to prevent unauthorized use',
        explanation: 'Every gram of nuclear material worldwide is accounted for through the IAEA safeguards system. Materials move with armed escorts, GPS tracking, tamper-resistant containers, and radiation detectors at borders. The tracking system is so precise that if even a small amount goes missing, alarms trigger immediately. Smuggling nuclear material is extremely difficult.',
        image: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'Global Nuclear Security Systems',
        content: 'Nuclear security protects nuclear materials, technology, and facilities from theft, sabotage, illegal trafficking, and misuse for weapons. Multiple international systems work together to ensure nuclear materials stay in peaceful, beneficial uses.',
        keyPoints: [
          'Nuclear Security: Protects materials from theft, sabotage, misuse',
          'Security vs Safety:',
          '  • Safety: Protects people FROM nuclear facilities',
          '  • Security: Protects nuclear facilities FROM people',
          'IAEA Safeguards System:',
          '  • 24/7 surveillance cameras',
          '  • Remote monitoring sensors',
          '  • Nuclear material seals',
          '  • Surprise inspections',
          '  • Global activity databases',
          '  • Spent fuel and uranium audits',
          '  • Confirms no weapons use',
          'Non-Proliferation Treaty (NPT):',
          '  • World\'s strongest anti-nuclear weapon agreement',
          '  • Countries agree: NO weapons development',
          '  • ONLY peaceful nuclear uses',
          '  • Allow IAEA inspections',
          '  • Promote safety and cooperation',
          'Material Accountancy: Every gram tracked',
          '  • Recorded, monitored, measured, reported, verified',
          'Transport Security:',
          '  • Armed escorts, GPS tracking',
          '  • Tamper-resistant containers',
          '  • Radiation detectors at borders/ports',
          'Cybersecurity:',
          '  • Isolated control networks',
          '  • Strong encryption, firewalls',
          '  • Intrusion monitoring',
          '  • Regular cyber drills',
          'Result: Nuclear material misuse is extremely rare'
        ],
        image: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Material Tracking System',
        description: 'You\'re monitoring the global nuclear material inventory. Understanding how tracking prevents misuse is essential.',
        task: 'What international organization monitors nuclear materials worldwide to prevent weapons proliferation?',
        options: [
          { id: 'who', label: 'WHO', icon: 'Health' },
          { id: 'iaea', label: 'IAEA', icon: 'ShieldTick' },
          { id: 'un', label: 'UN General Assembly', icon: 'Global' },
          { id: 'nato', label: 'NATO', icon: 'ShieldSecurity' }
        ],
        correctAnswer: 'iaea',
        explanation: 'The IAEA (International Atomic Energy Agency)! Often called the "nuclear watchdog," the IAEA verifies that countries use nuclear materials only for peaceful purposes. With over 2,000 inspections annually and continuous monitoring of facilities worldwide, the IAEA ensures compliance with the Non-Proliferation Treaty. They\'ve been instrumental in preventing nuclear weapons spread since 1957.'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'What is the main purpose of the Non-Proliferation Treaty (NPT)?',
        options: [
          'To ban all nuclear technology',
          'To prevent the spread of nuclear weapons',
          'To promote nuclear power plants',
          'To regulate medical radiation'
        ],
        correctIndex: 1,
        explanation: 'The NPT aims to prevent the spread of nuclear weapons while promoting peaceful uses of nuclear technology. Signed by 191 countries, it\'s one of the most successful arms control treaties. Countries with nuclear weapons agree not to help others acquire them, while non-weapon states commit to peaceful use only and accept IAEA inspections.',
        image: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=400'
      }
    },
    
    {
      id: 'assessment-2',
      type: 'assessment',
      data: {
        question: 'True or False: Every gram of nuclear material worldwide is recorded and tracked.',
        options: ['True', 'False'],
        correctIndex: 0,
        explanation: 'True! Nuclear material accountancy is incredibly precise. Every facility maintains detailed records of all nuclear materials - when they arrive, how they\'re used, what waste is produced, and where they\'re stored. The IAEA verifies these records through inspections, seals, and monitoring. This system makes "missing" nuclear material essentially impossible without immediate detection.',
        image: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Security Expert!',
        message: 'You now understand the global systems that prevent nuclear material theft and weapons proliferation!',
        rewards: {
          xp: 100,
          stars: 3
        }
      }
    }
  ]
};

export default nuclearSecurityLesson;
