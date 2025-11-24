/**
 * Legacy file - Use database.ts instead
 * This file is kept for backward compatibility
 */

import { encyclopediaDatabase } from './database';

export const encyclopediaEntries: Record<string, typeof encyclopediaDatabase[string]> = encyclopediaDatabase;

export default encyclopediaEntries;
  'radiation': {
    id: 'radiation',
    term: 'Radiation',
    definition: 'Energy emitted as particles or electromagnetic waves. Can be ionizing (high energy, can damage cells) or non-ionizing (lower energy).',
    category: 'science',
    relatedTerms: ['ionizing-radiation', 'background-radiation', 'radioactivity'],
    quickFacts: [
      'Radiation is naturally present everywhere',
      'Bananas contain radioactive potassium-40',
      'Medical X-rays use controlled radiation',
      'The sun emits radiation constantly',
    ],
    sources: [
      {
        organization: 'UNSCEAR',
        title: 'Sources and Effects of Ionizing Radiation',
        url: 'https://www.unscear.org/unscear/en/publications.html',
      },
    ],
    difficulty: 'beginner',
  },
  'ionizing-radiation': {
    id: 'ionizing-radiation',
    term: 'Ionizing Radiation',
    definition: 'High-energy radiation that can remove electrons from atoms, creating ions. Includes alpha particles, beta particles, gamma rays, and X-rays.',
    category: 'science',
    relatedTerms: ['radiation', 'alpha-particle', 'beta-particle', 'gamma-ray'],
    quickFacts: [
      'Can damage DNA if exposure is high',
      'Used in medical imaging and treatment',
      'Naturally occurring in the environment',
      'Controlled exposure is generally safe',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Radiation Protection',
        url: 'https://www.iaea.org/topics/radiation-protection',
      },
    ],
    difficulty: 'intermediate',
  },
  'nuclear-reactor': {
    id: 'nuclear-reactor',
    term: 'Nuclear Reactor',
    definition: 'A device that initiates and controls a sustained nuclear chain reaction. Used primarily for generating electricity or for research.',
    category: 'technology',
    relatedTerms: ['nuclear-fission', 'control-rods', 'containment-building'],
    quickFacts: [
      'Cannot explode like a nuclear bomb',
      'Uses controlled fission reactions',
      'Multiple safety systems prevent accidents',
      'Produces zero carbon emissions during operation',
    ],
    debunkingSnippet: 'Contrary to popular belief, nuclear reactors cannot explode like atomic bombs due to different fuel enrichment levels and design principles.',
    sources: [
      {
        organization: 'IAEA',
        title: 'Nuclear Reactor Technology',
        url: 'https://www.iaea.org/topics/nuclear-power-reactors',
      },
    ],
    relatedMyths: ['nuclear-plants-explode'],
    difficulty: 'intermediate',
  },
  'control-rods': {
    id: 'control-rods',
    term: 'Control Rods',
    definition: 'Rods made of neutron-absorbing materials (like boron or cadmium) inserted into a reactor core to control the rate of nuclear fission.',
    category: 'technology',
    relatedTerms: ['nuclear-reactor', 'nuclear-fission', 'reactor-safety'],
    quickFacts: [
      'Absorb neutrons to slow down reactions',
      'Can be inserted or withdrawn to control power',
      'Critical safety component',
      'Made of materials like boron or cadmium',
    ],
    sources: [
      {
        organization: 'NEA',
        title: 'Nuclear Reactor Safety',
        url: 'https://www.oecd-nea.org/jcms/pl_13561/nuclear-safety',
      },
    ],
    difficulty: 'beginner',
  },
  'containment-building': {
    id: 'containment-building',
    term: 'Containment Building',
    definition: 'A massive reinforced concrete structure surrounding a nuclear reactor, designed to prevent the release of radioactive materials even during severe accidents.',
    category: 'safety',
    relatedTerms: ['nuclear-reactor', 'reactor-safety', 'defense-in-depth'],
    quickFacts: [
      'Designed to withstand extreme events',
      'Multiple layers of protection',
      'Prevents radioactive release',
      'Part of defense-in-depth strategy',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Safety Standards for Nuclear Power Plants',
        url: 'https://www.iaea.org/topics/safety-standards',
      },
    ],
    difficulty: 'beginner',
  },
  'background-radiation': {
    id: 'background-radiation',
    term: 'Background Radiation',
    definition: 'Ionizing radiation present in the environment from natural sources, including cosmic radiation, radon gas, and radioactive materials in the Earth\'s crust.',
    category: 'science',
    relatedTerms: ['radiation', 'ionizing-radiation', 'natural-radiation'],
    quickFacts: [
      'Everyone is exposed to background radiation',
      'Average annual dose: ~3 mSv worldwide',
      'Comes from natural sources',
      'Varies by location',
    ],
    debunkingSnippet: 'All radiation is not man-made. Natural background radiation is present everywhere and accounts for most human exposure.',
    sources: [
      {
        organization: 'UNSCEAR',
        title: 'Sources and Effects of Ionizing Radiation',
        url: 'https://www.unscear.org/unscear/en/publications.html',
      },
    ],
    relatedMyths: ['all-radiation-manmade'],
    difficulty: 'beginner',
  },
  'nuclear-fission': {
    id: 'nuclear-fission',
    term: 'Nuclear Fission',
    definition: 'The process of splitting a heavy atomic nucleus (like uranium-235) into two lighter nuclei, releasing energy and neutrons in the process.',
    category: 'science',
    relatedTerms: ['nuclear-reactor', 'uranium', 'chain-reaction'],
    quickFacts: [
      'Releases large amounts of energy',
      'Used in nuclear power plants',
      'Can be controlled in reactors',
      'Different from nuclear fusion',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Nuclear Physics',
        url: 'https://www.iaea.org/topics/nuclear-science',
      },
    ],
    difficulty: 'intermediate',
  },
  'defense-in-depth': {
    id: 'defense-in-depth',
    term: 'Defense-in-Depth',
    definition: 'A nuclear safety philosophy using multiple independent layers of protection, so that if one system fails, others can still prevent accidents.',
    category: 'safety',
    relatedTerms: ['reactor-safety', 'containment-building', 'safety-systems'],
    quickFacts: [
      'Multiple independent safety systems',
      'Redundancy prevents single points of failure',
      'Industry standard approach',
      'Applies to design, operation, and emergency response',
    ],
    sources: [
      {
        organization: 'NEA',
        title: 'Defense in Depth in Nuclear Safety',
        url: 'https://www.oecd-nea.org/jcms/pl_13561/nuclear-safety',
      },
    ],
    difficulty: 'intermediate',
  },
};

export default encyclopediaEntries;

