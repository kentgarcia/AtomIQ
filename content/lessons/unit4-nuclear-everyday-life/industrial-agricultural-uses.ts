import { Lesson } from '@/content/types';

export const industrialAgriculturalUsesLesson: Lesson = {
  id: 'industrial-agricultural-uses',
  title: 'Industrial & Agricultural Uses of Nuclear Technology',
  description: 'This lesson covers non-medical applications such as food irradiation, tracer techniques, industrial radiography, smoke detectors, and crop mutation breeding. It emphasizes how nuclear science improves safety, productivity, and sustainability.',
  unitId: 'nuclear-everyday-life',
  difficulty: 'intermediate',
  estimatedMinutes: 12,
  xpReward: 90,
  tags: ['industry', 'agriculture', 'food-irradiation', 'radiography', 'crop-breeding', 'safety'],
  prerequisites: ['medical-applications'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Industrial & Agricultural Uses',
        mission: 'Agent, nuclear technology isn\'t just found in hospitals. It strengthens bridges, preserves food, improves crops, and keeps industries safe. Your mission: discover how these invisible tools support modern society.',
        icon: 'Global'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'Food irradiation makes food radioactive',
        reality: 'Food irradiation exposes food to controlled radiation to kill bacteria — it does NOT make the food radioactive',
        explanation: 'Food irradiation is like using light to disinfect water - the radiation passes through, kills bacteria, but doesn\'t make the food radioactive. It\'s been used safely for decades and is approved by WHO, FDA, and NASA. Astronauts eat irradiated food in space! The process extends shelf life and prevents foodborne illnesses without chemicals.',
        image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'Nuclear Technology in Action',
        content: 'Nuclear technology quietly supports modern life in countless ways - from ensuring food safety to inspecting aircraft parts, improving crop yields to detecting leaks in pipelines. These applications are safe, regulated, and essential to our daily lives.',
        keyPoints: [
          'Agricultural Applications:',
          '  • Food Irradiation: Kills bacteria, extends shelf life (WHO-approved)',
          '  • Does NOT make food radioactive',
          '  • Mutation Breeding: Creates beneficial crop mutations',
          '  • Higher yields, drought resistance, pest tolerance',
          '  • Sterile Insect Technique (SIT): Releases sterile males',
          '  • Reduces pest populations without pesticides',
          'Industrial Applications:',
          '  • Industrial Radiography: Inspects pipelines, aircraft, welds',
          '  • Uses gamma rays/X-rays for structural safety',
          '  • Tracer Techniques: Tracks leaks, water/oil flow',
          '  • Smoke Detectors: Use tiny Americium-241 (safe)',
          '  • Thickness Gauges: Quality control for paper, plastic, steel',
          'Safety in Industry:',
          '  • Strong shielding and remote handling',
          '  • Controlled environments',
          '  • IAEA international regulations',
          '  • Protects workers and consumers',
          'Key Point: Industrial radiation is designed for maximum safety'
        ],
        image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Industrial Applications Lab',
        description: 'You\'re an engineer inspecting critical infrastructure. You need to check for defects in a metal weld without damaging it.',
        task: 'What tool inspects welds and pipelines for safety defects?',
        options: [
          { id: 'pet', label: 'PET scan', icon: 'Health' },
          { id: 'radiography', label: 'Industrial radiography', icon: 'ShieldSearch' },
          { id: 'mri', label: 'MRI', icon: 'Scan' },
          { id: 'ultrasound', label: 'Ultrasound', icon: 'Sound' }
        ],
        correctAnswer: 'radiography',
        explanation: 'Industrial radiography! It uses gamma rays or X-rays to create images of the internal structure of welds, pipelines, and aircraft parts - like taking an X-ray of a building. This non-destructive testing reveals cracks, voids, and defects that could cause catastrophic failures. It\'s essential for ensuring the safety of bridges, planes, pipelines, and nuclear reactors themselves!'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'What does food irradiation do?',
        options: [
          'Makes food radioactive',
          'Kills bacteria and extends shelf life',
          'Adds chemicals to food',
          'Removes nutrients from food'
        ],
        correctIndex: 1,
        explanation: 'Food irradiation kills bacteria and extends shelf life! It eliminates pathogens like E. coli, Salmonella, and parasites without making food radioactive or adding chemicals. The process is so safe that it\'s used for astronaut food and is recommended for immunocompromised patients. It preserves nutrients better than many traditional preservation methods.',
        image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400'
      }
    },
    
    {
      id: 'assessment-2',
      type: 'assessment',
      data: {
        question: 'True or False: Smoke detectors contain safe, regulated radioactive sources.',
        options: ['True', 'False'],
        correctIndex: 0,
        explanation: 'True! Most smoke detectors contain a tiny amount of Americium-241 (about 0.3 micrograms) - so small it\'s completely safe for home use. The radiation ionizes air molecules, creating a small current. When smoke enters, it disrupts this current, triggering the alarm. This technology has saved countless lives and poses no health risk to users.',
        image: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Industry & Agriculture Expert!',
        message: 'You now understand how nuclear technology safely improves food safety, infrastructure, and crop production!',
        rewards: {
          xp: 90,
          stars: 3
        }
      }
    }
  ]
};

export default industrialAgriculturalUsesLesson;
