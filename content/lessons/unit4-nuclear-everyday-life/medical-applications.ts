import { Lesson } from '@/content/types';

export const medicalApplicationsLesson: Lesson = {
  id: 'medical-applications',
  title: 'Medical Applications of Nuclear Science',
  description: 'Learners explore how radiation is used safely in diagnostics (like PET/CT scans) and in cancer treatment through radiotherapy. This lesson highlights how nuclear tech saves lives and clears up misconceptions about "radioactive medicine."',
  unitId: 'nuclear-everyday-life',
  difficulty: 'intermediate',
  estimatedMinutes: 12,
  xpReward: 90,
  tags: ['medicine', 'healthcare', 'pet-scan', 'radiotherapy', 'cancer', 'diagnostics', 'nuclear-medicine'],
  prerequisites: ['types-of-radiation', 'measuring-radiation'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Medical Applications of Nuclear Science',
        mission: 'Agent, hospitals use radiation every day — not to harm, but to heal. Your mission: uncover how nuclear medicine looks inside the human body and how radiotherapy targets cancer with precision.',
        icon: 'Health'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'All radiation in hospitals is dangerous',
        reality: 'Medical radiation is highly controlled, targeted, and delivered in safe amounts. Diagnostic scans use low doses, and radiotherapy focuses radiation only where it\'s needed',
        explanation: 'Medical radiation saves millions of lives every year! Diagnostic scans use carefully calculated low doses - a PET scan is about 7 mSv, similar to 2-3 years of background radiation. Radiotherapy precisely targets cancer cells while protecting healthy tissue. The benefits far outweigh the minimal risks.',
        image: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'Nuclear Medicine & Radiotherapy',
        content: 'Nuclear medicine uses small amounts of radioactive materials (radiopharmaceuticals) to diagnose disease, monitor organ function, and detect abnormalities early. These materials leave the body quickly and do NOT make patients radioactive long-term. Radiotherapy uses high-energy radiation to destroy cancer cells while protecting healthy tissue.',
        keyPoints: [
          'Nuclear Medicine: Uses radiopharmaceuticals for diagnosis',
          'Diagnostic Tools:',
          '  • PET Scan: Shows metabolic activity (cancer, brain, heart)',
          '  • SPECT Scan: Shows blood flow and organ function',
          '  • CT with Radiotracers: Combines X-ray with tracers',
          '  • Analogy: Like GPS tracker showing exactly where problems are',
          'Key Point: Materials leave body quickly, no long-term radioactivity',
          'Radiotherapy: Destroys cancer cells with targeted radiation',
          'Types of Radiotherapy:',
          '  • External Beam (EBRT): Targeted beams from outside',
          '  • Brachytherapy: Radioactive sources inside/near tumor',
          '  • Gamma Knife/CyberKnife: Ultra-precise for brain tumors',
          'Focused on tumors, protects healthy tissue',
          'Safety in Medicine:',
          '  • Highly trained professionals',
          '  • Strict dose limits and monitoring',
          '  • Advanced shielding and computerized planning',
          '  • Benefits far outweigh risks'
        ],
        image: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Medical Imaging Lab',
        description: 'You\'re a radiologist selecting the right diagnostic tool for different medical conditions.',
        task: 'Which scan detects metabolic activity inside the body, useful for detecting cancer?',
        options: [
          { id: 'pet', label: 'PET Scan', icon: 'Discover' },
          { id: 'ct', label: 'CT Scan', icon: 'Scan' },
          { id: 'ultrasound', label: 'Ultrasound', icon: 'Sound' },
          { id: 'xray', label: 'X-ray', icon: 'Document' }
        ],
        correctAnswer: 'pet',
        explanation: 'PET (Positron Emission Tomography) Scan! It uses a radioactive tracer (usually glucose-based) that cancer cells absorb more than healthy cells because they metabolize faster. The scan shows this metabolic activity, revealing tumors that might not be visible on other scans. It\'s revolutionary for early cancer detection, staging, and monitoring treatment effectiveness.'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'What is radiotherapy primarily used for?',
        options: [
          'Diagnosing bone fractures',
          'Treating cancer using high-energy radiation',
          'Making food safer',
          'Measuring radioactivity'
        ],
        correctIndex: 1,
        explanation: 'Radiotherapy is primarily used for treating cancer! It uses high-energy radiation (like X-rays or gamma rays) to damage cancer cell DNA, preventing them from growing and dividing. Modern radiotherapy is incredibly precise - techniques like IMRT (Intensity Modulated Radiation Therapy) can target tumors while sparing surrounding healthy tissue.',
        image: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=400'
      }
    },
    
    {
      id: 'assessment-2',
      type: 'assessment',
      data: {
        question: 'True or False: Medical radiation is unsafe for patients at all levels.',
        options: ['True', 'False'],
        correctIndex: 1,
        explanation: 'False! Medical radiation is carefully controlled and safe when used appropriately. Doctors follow the ALARA principle (As Low As Reasonably Achievable) - using the minimum dose necessary for diagnosis or treatment. The benefits of detecting and treating diseases far outweigh the minimal risks. Millions of lives are saved annually through nuclear medicine.',
        image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Medical Nuclear Expert!',
        message: 'You now understand how nuclear science saves lives through advanced diagnostics and cancer treatment!',
        rewards: {
          xp: 90,
          stars: 3
        }
      }
    }
  ]
};

export default medicalApplicationsLesson;
