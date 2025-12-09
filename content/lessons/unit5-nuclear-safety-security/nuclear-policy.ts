import { Lesson } from '@/content/types';

export const nuclearPolicyLesson: Lesson = {
  id: 'nuclear-policy',
  title: 'Nuclear Policy, Regulation & International Cooperation',
  description: 'This lesson explains how nuclear activities are governed at national and international levels. It introduces regulatory bodies (IAEA, PNRI, NRC), licensing systems, safety audits, inspections, and the global networks ensuring the peaceful use of nuclear science.',
  unitId: 'nuclear-safety-security',
  difficulty: 'advanced',
  estimatedMinutes: 15,
  xpReward: 100,
  tags: ['policy', 'regulation', 'iaea', 'nrc', 'licensing', 'cooperation', 'standards', 'treaties'],
  prerequisites: ['nuclear-security'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Nuclear Policy, Regulation & International Cooperation',
        mission: 'Agent, nuclear science is a global effort. Your mission: understand the policies, regulators, and agreements that keep nuclear technology peaceful worldwide.',
        icon: 'Global'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'Nuclear technology is impossible to control',
        reality: 'Nuclear activities are highly regulated by national authorities and international organizations. Every reactor, facility, shipment, and medical source is overseen through strict licensing, inspections, and laws',
        explanation: 'Nuclear technology is actually one of the MOST controlled technologies on Earth. Every facility requires years of licensing, regular inspections, safety reviews, and operational approvals. National regulators (like the NRC in the US) work with the IAEA to ensure global standards. No facility operates without permission and oversight.',
        image: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'Global Nuclear Governance',
        content: 'Nuclear activities are governed through a comprehensive system of national regulators, international standards, licensing processes, inspections, and treaties. This multi-layered governance ensures nuclear technology remains safe, secure, and beneficial.',
        keyPoints: [
          'Why Regulation Matters:',
          '  • Ensures safe design and operation',
          '  • Controls activities through licensing',
          '  • Requires transparent reporting',
          '  • Protects environment',
          '  • Ensures peaceful use',
          'National Regulatory Bodies:',
          '  • Philippines: PNRI (Philippine Nuclear Research Institute)',
          '  • United States: NRC (Nuclear Regulatory Commission)',
          '  • Japan: NRA, France: ASN',
          'Regulator Responsibilities:',
          '  • License facilities and operators',
          '  • Review safety reports',
          '  • Conduct inspections',
          '  • Enforce laws',
          '  • Investigate irregularities',
          'Licensing Process (takes years):',
          '  • Environmental Impact Assessment',
          '  • Safety Analysis Report',
          '  • Design review',
          '  • Public consultation',
          '  • Construction permit',
          '  • Operational license',
          '  • Periodic renewals',
          '  • Decommissioning plans',
          'IAEA Safety Standards:',
          '  • Global guidelines for reactor safety',
          '  • Radiation protection protocols',
          '  • Transport rules, waste management',
          '  • Emergency response procedures',
          'Peer Reviews & Audits:',
          '  • OSART: Operational Safety Review Teams',
          '  • IRRS: Regulatory Review',
          '  • EPREV: Emergency Preparedness',
          '  • Countries invite international experts',
          'Nuclear Agreements:',
          '  • Joint Convention on Nuclear Safety',
          '  • Convention on Early Notification',
          '  • Emergency Assistance Convention',
          'Three Pillars = Peaceful Global Use:',
          '  Safety + Security + Policy = Controlled & Beneficial'
        ],
        image: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Regulatory Compliance System',
        description: 'You\'re reviewing the approval process for a new nuclear facility. Understanding regulation is key to public trust.',
        task: 'Before a nuclear reactor can operate, what must it obtain from the national regulator?',
        options: [
          { id: 'patent', label: 'Technology patent', icon: 'Document' },
          { id: 'license', label: 'Operational license', icon: 'ShieldTick' },
          { id: 'insurance', label: 'Private insurance only', icon: 'Security' },
          { id: 'certification', label: 'ISO certification', icon: 'TickCircle' }
        ],
        correctAnswer: 'license',
        explanation: 'An operational license from the national nuclear regulator! This comes only after years of review: environmental assessments, safety analysis, design reviews, construction permits, and public consultation. The license includes strict conditions, regular inspections, and can be suspended if safety issues arise. No reactor operates without this approval.'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'What does OSART stand for in IAEA peer reviews?',
        options: [
          'Operational Safety Review Team',
          'Ongoing Security Assessment and Response Team',
          'Organizational Structure And Regulatory Training',
          'Optimized Safety and Radiation Technology'
        ],
        correctIndex: 0,
        explanation: 'OSART stands for Operational Safety Review Team. These are international expert teams invited by countries to review nuclear facility operations. The multi-week reviews examine operations, maintenance, training, safety culture, and emergency preparedness. OSART missions improve global nuclear safety by sharing best practices and identifying areas for improvement.',
        image: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=400'
      }
    },
    
    {
      id: 'assessment-2',
      type: 'assessment',
      data: {
        question: 'True or False: Nuclear regulation relies on laws, inspections, treaties, and international cooperation.',
        options: ['True', 'False'],
        correctIndex: 0,
        explanation: 'True! Nuclear regulation is a comprehensive global system combining national laws (enforced by regulators like NRC, PNRI), international standards (IAEA guidelines), bilateral and multilateral treaties (NPT, safety conventions), and regular inspections and peer reviews. This multi-layered approach makes nuclear technology one of the most tightly controlled technologies in human history.',
        image: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Policy & Regulation Expert!',
        message: 'You now understand how global cooperation and strict regulation make nuclear technology controllable and beneficial!',
        rewards: {
          xp: 100,
          stars: 3
        }
      }
    }
  ]
};

export default nuclearPolicyLesson;
