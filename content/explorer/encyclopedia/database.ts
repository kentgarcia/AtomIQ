/**
 * Encyclopedia Database
 * Centralized database for nuclear science encyclopedia entries
 * Can be enhanced with external APIs (Wikipedia, IAEA, etc.)
 */

import { EncyclopediaEntry } from '../types';

/**
 * Base encyclopedia entries
 * These can be supplemented with API calls to Wikipedia, IAEA, or other sources
 */
export const encyclopediaDatabase: Record<string, EncyclopediaEntry> = {
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
  'uranium': {
    id: 'uranium',
    term: 'Uranium',
    definition: 'A heavy metallic element (atomic number 92) that is the primary fuel for nuclear reactors. Naturally occurring uranium contains mostly U-238 with small amounts of U-235.',
    category: 'science',
    relatedTerms: ['nuclear-fission', 'nuclear-reactor', 'enrichment'],
    quickFacts: [
      'Most abundant in Australia and Kazakhstan',
      'U-235 is fissile (can sustain chain reaction)',
      'U-238 is fertile (can be converted to plutonium)',
      'Naturally radioactive',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Uranium Resources',
        url: 'https://www.iaea.org/topics/nuclear-fuel-cycle',
      },
    ],
    difficulty: 'beginner',
  },
  'enrichment': {
    id: 'enrichment',
    term: 'Enrichment',
    definition: 'The process of increasing the percentage of U-235 in uranium. Reactor fuel typically contains 3-5% U-235, while weapons-grade uranium requires 90%+ enrichment.',
    category: 'technology',
    relatedTerms: ['uranium', 'nuclear-reactor', 'nuclear-weapons'],
    quickFacts: [
      'Reactor fuel: 3-5% U-235',
      'Weapons-grade: 90%+ U-235',
      'Centrifuges are commonly used',
      'Highly regulated internationally',
    ],
    debunkingSnippet: 'The low enrichment level in reactor fuel (3-5%) makes it physically impossible for nuclear power plants to explode like atomic bombs.',
    sources: [
      {
        organization: 'IAEA',
        title: 'Uranium Enrichment',
        url: 'https://www.iaea.org/topics/nuclear-fuel-cycle',
      },
    ],
    relatedMyths: ['nuclear-plants-explode'],
    difficulty: 'intermediate',
  },
  'radioactivity': {
    id: 'radioactivity',
    term: 'Radioactivity',
    definition: 'The spontaneous emission of radiation from unstable atomic nuclei. Elements with unstable nuclei are called radioactive isotopes or radioisotopes.',
    category: 'science',
    relatedTerms: ['radiation', 'decay', 'half-life'],
    quickFacts: [
      'Discovered by Marie Curie',
      'Natural process occurring in unstable atoms',
      'Measured in becquerels (Bq)',
      'All elements have radioactive isotopes',
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
  'half-life': {
    id: 'half-life',
    term: 'Half-Life',
    definition: 'The time required for half of the radioactive atoms in a sample to decay. Different isotopes have different half-lives, ranging from fractions of a second to billions of years.',
    category: 'science',
    relatedTerms: ['radioactivity', 'decay', 'isotope'],
    quickFacts: [
      'U-238 half-life: 4.5 billion years',
      'I-131 half-life: 8 days',
      'C-14 half-life: 5,730 years',
      'Used for dating archaeological finds',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Radioisotopes and Their Applications',
        url: 'https://www.iaea.org/topics/nuclear-science',
      },
    ],
    difficulty: 'intermediate',
  },
  'alpha-particle': {
    id: 'alpha-particle',
    term: 'Alpha Particle',
    definition: 'A type of ionizing radiation consisting of two protons and two neutrons (essentially a helium nucleus). Has low penetrating power but high ionizing ability.',
    category: 'science',
    relatedTerms: ['ionizing-radiation', 'beta-particle', 'gamma-ray'],
    quickFacts: [
      'Stopped by paper or skin',
      'Most dangerous if ingested',
      'Used in smoke detectors',
      'Discovered by Ernest Rutherford',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Types of Ionizing Radiation',
        url: 'https://www.iaea.org/topics/radiation-protection',
      },
    ],
    difficulty: 'beginner',
  },
  'beta-particle': {
    id: 'beta-particle',
    term: 'Beta Particle',
    definition: 'High-energy, high-speed electrons or positrons emitted during radioactive decay. Has moderate penetrating power compared to alpha particles.',
    category: 'science',
    relatedTerms: ['ionizing-radiation', 'alpha-particle', 'gamma-ray'],
    quickFacts: [
      'Can penetrate skin but stopped by thin metal',
      'Used in medical treatments',
      'Emitted during beta decay',
      'Less ionizing than alpha particles',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Types of Ionizing Radiation',
        url: 'https://www.iaea.org/topics/radiation-protection',
      },
    ],
    difficulty: 'beginner',
  },
  'gamma-ray': {
    id: 'gamma-ray',
    term: 'Gamma Ray',
    definition: 'High-energy electromagnetic radiation emitted during radioactive decay. Has very high penetrating power and requires thick shielding (lead or concrete) to stop.',
    category: 'science',
    relatedTerms: ['ionizing-radiation', 'alpha-particle', 'beta-particle'],
    quickFacts: [
      'Highest penetrating power',
      'No mass or charge',
      'Used in medical imaging',
      'Requires thick shielding',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Types of Ionizing Radiation',
        url: 'https://www.iaea.org/topics/radiation-protection',
      },
    ],
    difficulty: 'beginner',
  },
  'chain-reaction': {
    id: 'chain-reaction',
    term: 'Chain Reaction',
    definition: 'A self-sustaining nuclear reaction where neutrons released from one fission event trigger additional fission events. Can be controlled (reactors) or uncontrolled (bombs).',
    category: 'science',
    relatedTerms: ['nuclear-fission', 'nuclear-reactor', 'criticality'],
    quickFacts: [
      'Requires critical mass to sustain',
      'Controlled in nuclear reactors',
      'Neutrons trigger new fissions',
      'Can be stopped with control rods',
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
  'criticality': {
    id: 'criticality',
    term: 'Criticality',
    definition: 'The state of a nuclear reactor when the chain reaction is self-sustaining. Critical means the reaction rate is constant, subcritical means it decreases, and supercritical means it increases.',
    category: 'science',
    relatedTerms: ['chain-reaction', 'nuclear-reactor', 'control-rods'],
    quickFacts: [
      'Critical: steady state',
      'Subcritical: reaction dies out',
      'Supercritical: reaction increases',
      'Carefully controlled in reactors',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Nuclear Reactor Physics',
        url: 'https://www.iaea.org/topics/nuclear-power-reactors',
      },
    ],
    difficulty: 'intermediate',
  },
  'isotope': {
    id: 'isotope',
    term: 'Isotope',
    definition: 'Atoms of the same element with different numbers of neutrons. Some isotopes are stable, while others are radioactive (radioisotopes).',
    category: 'science',
    relatedTerms: ['radioactivity', 'half-life', 'uranium'],
    quickFacts: [
      'Same atomic number, different mass',
      'U-235 and U-238 are isotopes',
      'Used in medical treatments',
      'Some occur naturally, others are man-made',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Isotopes and Radioisotopes',
        url: 'https://www.iaea.org/topics/nuclear-science',
      },
    ],
    difficulty: 'beginner',
  },
  'decay': {
    id: 'decay',
    term: 'Radioactive Decay',
    definition: 'The spontaneous process by which unstable atomic nuclei lose energy by emitting radiation. The nucleus transforms into a different element or a different isotope.',
    category: 'science',
    relatedTerms: ['radioactivity', 'half-life', 'isotope'],
    quickFacts: [
      'Natural process',
      'Cannot be stopped or accelerated',
      'Follows exponential decay law',
      'Used in carbon dating',
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
  'reactor-core': {
    id: 'reactor-core',
    term: 'Reactor Core',
    definition: 'The central part of a nuclear reactor containing the fuel assemblies, control rods, and moderator. This is where the nuclear fission chain reaction occurs.',
    category: 'technology',
    relatedTerms: ['nuclear-reactor', 'control-rods', 'fuel-assembly'],
    quickFacts: [
      'Contains fuel rods',
      'Surrounded by coolant',
      'Heavily shielded',
      'Temperature carefully monitored',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Nuclear Reactor Technology',
        url: 'https://www.iaea.org/topics/nuclear-power-reactors',
      },
    ],
    difficulty: 'beginner',
  },
  'fuel-assembly': {
    id: 'fuel-assembly',
    term: 'Fuel Assembly',
    definition: 'A structured collection of fuel rods containing enriched uranium pellets. Multiple assemblies are arranged in the reactor core to sustain the chain reaction.',
    category: 'technology',
    relatedTerms: ['nuclear-reactor', 'reactor-core', 'uranium'],
    quickFacts: [
      'Contains hundreds of fuel rods',
      'Made of zirconium alloy',
      'Replaced every 18-24 months',
      'Carefully positioned in core',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Nuclear Fuel Cycle',
        url: 'https://www.iaea.org/topics/nuclear-fuel-cycle',
      },
    ],
    difficulty: 'intermediate',
  },
  'moderator': {
    id: 'moderator',
    term: 'Moderator',
    definition: 'A material (like water or graphite) used in nuclear reactors to slow down fast neutrons, making them more likely to cause fission. Essential for sustaining the chain reaction.',
    category: 'technology',
    relatedTerms: ['nuclear-reactor', 'chain-reaction', 'neutron'],
    quickFacts: [
      'Slows down neutrons',
      'Water is common moderator',
      'Graphite used in some reactors',
      'Increases fission probability',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Nuclear Reactor Physics',
        url: 'https://www.iaea.org/topics/nuclear-power-reactors',
      },
    ],
    difficulty: 'intermediate',
  },
  'coolant': {
    id: 'coolant',
    term: 'Coolant',
    definition: 'A fluid (water, liquid sodium, or gas) that circulates through the reactor core to remove heat generated by nuclear fission. Also transfers heat to produce steam for electricity generation.',
    category: 'technology',
    relatedTerms: ['nuclear-reactor', 'reactor-core', 'steam-generator'],
    quickFacts: [
      'Removes heat from core',
      'Prevents overheating',
      'Water is most common',
      'Transfers heat to turbines',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Nuclear Power Plant Systems',
        url: 'https://www.iaea.org/topics/nuclear-power-reactors',
      },
    ],
    difficulty: 'beginner',
  },
  'steam-generator': {
    id: 'steam-generator',
    term: 'Steam Generator',
    definition: 'A heat exchanger in a nuclear power plant that uses heat from the reactor coolant to produce steam. The steam drives turbines connected to electrical generators.',
    category: 'technology',
    relatedTerms: ['nuclear-reactor', 'coolant', 'turbine'],
    quickFacts: [
      'Transfers heat to water',
      'Produces high-pressure steam',
      'Drives electrical generators',
      'Separates radioactive coolant from steam',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Nuclear Power Plant Systems',
        url: 'https://www.iaea.org/topics/nuclear-power-reactors',
      },
    ],
    difficulty: 'intermediate',
  },
  'turbine': {
    id: 'turbine',
    term: 'Turbine',
    definition: 'A machine that converts the kinetic energy of steam into rotational mechanical energy. In nuclear plants, turbines are connected to generators that produce electricity.',
    category: 'technology',
    relatedTerms: ['steam-generator', 'nuclear-reactor', 'generator'],
    quickFacts: [
      'Driven by high-pressure steam',
      'Spins at high speeds',
      'Connected to generator',
      'Same technology as coal/gas plants',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Nuclear Power Generation',
        url: 'https://www.iaea.org/topics/nuclear-power-reactors',
      },
    ],
    difficulty: 'beginner',
  },
  'spent-fuel': {
    id: 'spent-fuel',
    term: 'Spent Nuclear Fuel',
    definition: 'Nuclear fuel that has been used in a reactor and can no longer efficiently sustain a chain reaction. Still highly radioactive and requires careful handling and storage.',
    category: 'technology',
    relatedTerms: ['fuel-assembly', 'nuclear-reactor', 'waste-management'],
    quickFacts: [
      'Removed after 3-5 years',
      'Still contains usable fuel',
      'Stored in pools or dry casks',
      'Can be reprocessed',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Nuclear Fuel Cycle',
        url: 'https://www.iaea.org/topics/nuclear-fuel-cycle',
      },
    ],
    difficulty: 'intermediate',
  },
  'waste-management': {
    id: 'waste-management',
    term: 'Nuclear Waste Management',
    definition: 'The handling, storage, and disposal of radioactive materials from nuclear facilities. Includes low-level, intermediate-level, and high-level waste with different handling requirements.',
    category: 'safety',
    relatedTerms: ['spent-fuel', 'radioactivity', 'half-life'],
    quickFacts: [
      'Categorized by radioactivity level',
      'High-level waste needs deep storage',
      'Low-level waste easier to handle',
      'Geological repositories planned',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Radioactive Waste Management',
        url: 'https://www.iaea.org/topics/radioactive-waste-management',
      },
    ],
    difficulty: 'intermediate',
  },
  'radiation-dose': {
    id: 'radiation-dose',
    term: 'Radiation Dose',
    definition: 'The amount of radiation energy absorbed by the body. Measured in sieverts (Sv) or millisieverts (mSv). Different types of radiation have different biological effects.',
    category: 'safety',
    relatedTerms: ['radiation', 'ionizing-radiation', 'background-radiation'],
    quickFacts: [
      'Measured in sieverts (Sv)',
      'Average annual dose: ~3 mSv',
      'Medical X-ray: ~0.1 mSv',
      'Regulated exposure limits exist',
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
  'radiation-protection': {
    id: 'radiation-protection',
    term: 'Radiation Protection',
    definition: 'Measures and practices designed to protect people and the environment from harmful effects of ionizing radiation. Based on principles of time, distance, and shielding.',
    category: 'safety',
    relatedTerms: ['radiation-dose', 'ionizing-radiation', 'shielding'],
    quickFacts: [
      'Time: minimize exposure duration',
      'Distance: stay far from source',
      'Shielding: use protective materials',
      'ALARA principle: as low as reasonably achievable',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Radiation Protection',
        url: 'https://www.iaea.org/topics/radiation-protection',
      },
    ],
    difficulty: 'beginner',
  },
  'shielding': {
    id: 'shielding',
    term: 'Radiation Shielding',
    definition: 'Materials used to block or reduce radiation exposure. Different materials are effective against different types of radiation (lead for gamma rays, water for neutrons).',
    category: 'safety',
    relatedTerms: ['radiation-protection', 'gamma-ray', 'containment-building'],
    quickFacts: [
      'Lead blocks gamma rays',
      'Water moderates neutrons',
      'Concrete provides general shielding',
      'Thickness depends on radiation type',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Radiation Protection',
        url: 'https://www.iaea.org/topics/radiation-protection',
      },
    ],
    difficulty: 'beginner',
  },
  'emergency-shutdown': {
    id: 'emergency-shutdown',
    term: 'Emergency Shutdown (SCRAM)',
    definition: 'The rapid insertion of all control rods into a reactor core to immediately stop the nuclear chain reaction. SCRAM stands for "Safety Control Rod Axe Man" from early reactor designs.',
    category: 'safety',
    relatedTerms: ['control-rods', 'nuclear-reactor', 'reactor-safety'],
    quickFacts: [
      'Stops chain reaction instantly',
      'Can be manual or automatic',
      'Multiple redundant systems',
      'Tested regularly',
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
  'reactor-safety': {
    id: 'reactor-safety',
    term: 'Reactor Safety Systems',
    definition: 'Multiple redundant systems designed to prevent and mitigate nuclear accidents. Includes control rods, emergency cooling, containment structures, and automatic shutdown systems.',
    category: 'safety',
    relatedTerms: ['defense-in-depth', 'containment-building', 'emergency-shutdown'],
    quickFacts: [
      'Multiple independent systems',
      'Defense-in-depth philosophy',
      'Regular safety inspections',
      'International safety standards',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Safety Standards for Nuclear Power Plants',
        url: 'https://www.iaea.org/topics/safety-standards',
      },
    ],
    difficulty: 'intermediate',
  },
  'nuclear-fusion': {
    id: 'nuclear-fusion',
    term: 'Nuclear Fusion',
    definition: 'The process of combining light atomic nuclei (like hydrogen) to form heavier nuclei, releasing enormous amounts of energy. Powers the sun and stars. Different from nuclear fission.',
    category: 'science',
    relatedTerms: ['nuclear-fission', 'energy', 'plasma'],
    quickFacts: [
      'Combines light nuclei',
      'Releases more energy than fission',
      'No long-lived radioactive waste',
      'Still experimental for power generation',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Nuclear Fusion',
        url: 'https://www.iaea.org/topics/nuclear-fusion',
      },
    ],
    difficulty: 'intermediate',
  },
  'plutonium': {
    id: 'plutonium',
    term: 'Plutonium',
    definition: 'A radioactive metallic element (atomic number 94) produced in nuclear reactors. Can be used as reactor fuel or in nuclear weapons. Pu-239 is the most common isotope.',
    category: 'science',
    relatedTerms: ['uranium', 'nuclear-fission', 'spent-fuel'],
    quickFacts: [
      'Produced in reactors',
      'Can be used as fuel',
      'Pu-239 is fissile',
      'Requires careful handling',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Nuclear Fuel Cycle',
        url: 'https://www.iaea.org/topics/nuclear-fuel-cycle',
      },
    ],
    difficulty: 'intermediate',
  },
  'nuclear-medicine': {
    id: 'nuclear-medicine',
    term: 'Nuclear Medicine',
    definition: 'Medical specialty using radioactive substances (radioisotopes) for diagnosis and treatment. Includes PET scans, cancer treatment, and thyroid therapy.',
    category: 'science',
    relatedTerms: ['radiation', 'isotope', 'medical-imaging'],
    quickFacts: [
      'Used for diagnosis and treatment',
      'PET scans use radioisotopes',
      'Cancer radiation therapy',
      'Saves millions of lives annually',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Nuclear Medicine',
        url: 'https://www.iaea.org/topics/nuclear-applications',
      },
    ],
    difficulty: 'beginner',
  },
  'medical-imaging': {
    id: 'medical-imaging',
    term: 'Medical Imaging',
    definition: 'The use of radiation (X-rays, gamma rays) to create images of the inside of the body for medical diagnosis. Includes X-rays, CT scans, PET scans, and nuclear medicine imaging.',
    category: 'science',
    relatedTerms: ['nuclear-medicine', 'radiation', 'x-ray'],
    quickFacts: [
      'X-rays for bones and teeth',
      'CT scans use X-rays',
      'PET scans use radioisotopes',
      'Benefits outweigh risks',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Medical Applications',
        url: 'https://www.iaea.org/topics/nuclear-applications',
      },
    ],
    difficulty: 'beginner',
  },
  'x-ray': {
    id: 'x-ray',
    term: 'X-Ray',
    definition: 'High-energy electromagnetic radiation used in medical imaging and security screening. Discovered by Wilhelm Röntgen in 1895. Can penetrate soft tissues but are absorbed by dense materials like bone.',
    category: 'science',
    relatedTerms: ['medical-imaging', 'ionizing-radiation', 'gamma-ray'],
    quickFacts: [
      'Discovered in 1895',
      'Used for medical diagnosis',
      'Low dose for imaging',
      'Widely used worldwide',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Medical Applications',
        url: 'https://www.iaea.org/topics/nuclear-applications',
      },
    ],
    difficulty: 'beginner',
  },
  'chernobyl': {
    id: 'chernobyl',
    term: 'Chernobyl Accident',
    definition: 'A catastrophic nuclear accident that occurred in 1986 at the Chernobyl Nuclear Power Plant in Ukraine. Resulted from design flaws and operator errors during a safety test.',
    category: 'history',
    relatedTerms: ['nuclear-reactor', 'reactor-safety', 'nuclear-accidents'],
    quickFacts: [
      'Occurred April 26, 1986',
      'Worst nuclear power plant accident',
      'Led to major safety improvements',
      'Exclusion zone still exists',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Chernobyl Accident',
        url: 'https://www.iaea.org/topics/chernobyl',
      },
    ],
    difficulty: 'intermediate',
  },
  'fukushima': {
    id: 'fukushima',
    term: 'Fukushima Daiichi Accident',
    definition: 'A nuclear accident in 2011 at the Fukushima Daiichi Nuclear Power Plant in Japan, caused by a massive earthquake and tsunami that disabled cooling systems.',
    category: 'history',
    relatedTerms: ['nuclear-reactor', 'reactor-safety', 'nuclear-accidents'],
    quickFacts: [
      'Occurred March 11, 2011',
      'Triggered by earthquake and tsunami',
      'Led to improved safety standards',
      'No radiation-related deaths',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Fukushima Daiichi Accident',
        url: 'https://www.iaea.org/topics/fukushima',
      },
    ],
    difficulty: 'intermediate',
  },
  'three-mile-island': {
    id: 'three-mile-island',
    term: 'Three Mile Island Accident',
    definition: 'A partial meltdown that occurred in 1979 at the Three Mile Island Nuclear Generating Station in Pennsylvania, USA. Led to major improvements in reactor safety and operator training.',
    category: 'history',
    relatedTerms: ['nuclear-reactor', 'reactor-safety', 'nuclear-accidents'],
    quickFacts: [
      'Occurred March 28, 1979',
      'Partial core meltdown',
      'No deaths or injuries',
      'Improved safety regulations',
    ],
    sources: [
      {
        organization: 'NEA',
        title: 'Nuclear Accidents',
        url: 'https://www.oecd-nea.org/jcms/pl_13561/nuclear-safety',
      },
    ],
    difficulty: 'intermediate',
  },
  'iaea': {
    id: 'iaea',
    term: 'IAEA (International Atomic Energy Agency)',
    definition: 'An international organization that promotes the peaceful use of nuclear energy and works to prevent its use for military purposes. Sets safety standards and provides technical assistance.',
    category: 'history',
    relatedTerms: ['nuclear-safety', 'nuclear-proliferation', 'safety-standards'],
    quickFacts: [
      'Founded in 1957',
      'Part of United Nations',
      'Promotes peaceful nuclear use',
      'Sets international safety standards',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'About IAEA',
        url: 'https://www.iaea.org/about',
      },
    ],
    difficulty: 'beginner',
  },
  'npt': {
    id: 'npt',
    term: 'Nuclear Non-Proliferation Treaty (NPT)',
    definition: 'An international treaty aimed at preventing the spread of nuclear weapons, promoting disarmament, and facilitating peaceful use of nuclear energy. Signed in 1968.',
    category: 'history',
    relatedTerms: ['iaea', 'nuclear-weapons', 'nuclear-proliferation'],
    quickFacts: [
      'Signed in 1968',
      '190+ countries are parties',
      'Prevents nuclear weapons spread',
      'Promotes peaceful nuclear use',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Nuclear Non-Proliferation',
        url: 'https://www.iaea.org/topics/non-proliferation',
      },
    ],
    difficulty: 'intermediate',
  },
  'nuclear-weapons': {
    id: 'nuclear-weapons',
    term: 'Nuclear Weapons',
    definition: 'Explosive devices that derive their destructive force from nuclear reactions (fission or fusion). Different from nuclear power plants which use controlled reactions for electricity generation.',
    category: 'history',
    relatedTerms: ['nuclear-fission', 'nuclear-fusion', 'npt'],
    quickFacts: [
      'Use uncontrolled chain reactions',
      'Require highly enriched uranium',
      'Different from power reactors',
      'Subject to international treaties',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Nuclear Non-Proliferation',
        url: 'https://www.iaea.org/topics/non-proliferation',
      },
    ],
    difficulty: 'intermediate',
  },
  'radon': {
    id: 'radon',
    term: 'Radon',
    definition: 'A naturally occurring radioactive gas (Rn-222) that forms from the decay of radium. Can accumulate in buildings and is the second leading cause of lung cancer after smoking.',
    category: 'science',
    relatedTerms: ['background-radiation', 'radioactivity', 'decay'],
    quickFacts: [
      'Colorless, odorless gas',
      'Seeps from ground',
      'Can accumulate indoors',
      'Ventilation reduces exposure',
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
  'cosmic-radiation': {
    id: 'cosmic-radiation',
    term: 'Cosmic Radiation',
    definition: 'High-energy particles from outer space that constantly bombard Earth. Contributes to natural background radiation. Higher at high altitudes and during air travel.',
    category: 'science',
    relatedTerms: ['background-radiation', 'radiation', 'ionizing-radiation'],
    quickFacts: [
      'Comes from space',
      'Higher at altitude',
      'Pilots receive more exposure',
      'Natural background source',
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
  'becquerel': {
    id: 'becquerel',
    term: 'Becquerel (Bq)',
    definition: 'The SI unit of radioactivity, equal to one decay per second. Named after Henri Becquerel who discovered radioactivity. Measures the activity of a radioactive source.',
    category: 'science',
    relatedTerms: ['radioactivity', 'radiation-dose', 'sievert'],
    quickFacts: [
      'Unit of radioactivity',
      '1 Bq = 1 decay per second',
      'Named after Henri Becquerel',
      'Different from dose units',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Radiation Units',
        url: 'https://www.iaea.org/topics/radiation-protection',
      },
    ],
    difficulty: 'beginner',
  },
  'sievert': {
    id: 'sievert',
    term: 'Sievert (Sv)',
    definition: 'The SI unit of radiation dose equivalent, measuring the biological effect of radiation exposure. Takes into account the type of radiation and sensitivity of tissues. Named after Rolf Sievert.',
    category: 'science',
    relatedTerms: ['radiation-dose', 'becquerel', 'radiation-protection'],
    quickFacts: [
      'Unit of radiation dose',
      'Measures biological effect',
      '1 Sv = 1000 mSv',
      'Named after Rolf Sievert',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Radiation Units',
        url: 'https://www.iaea.org/topics/radiation-protection',
      },
    ],
    difficulty: 'beginner',
  },
  'geiger-counter': {
    id: 'geiger-counter',
    term: 'Geiger Counter',
    definition: 'A device used to detect and measure ionizing radiation. Makes a clicking sound when radiation is detected. Commonly used for radiation monitoring and safety checks.',
    category: 'technology',
    relatedTerms: ['radiation', 'radiation-protection', 'radiation-detection'],
    quickFacts: [
      'Detects ionizing radiation',
      'Makes clicking sounds',
      'Portable and easy to use',
      'Used for safety monitoring',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Radiation Detection',
        url: 'https://www.iaea.org/topics/radiation-protection',
      },
    ],
    difficulty: 'beginner',
  },
  'nuclear-power': {
    id: 'nuclear-power',
    term: 'Nuclear Power',
    definition: 'Electricity generated from nuclear reactions in nuclear power plants. Provides about 10% of the world\'s electricity. Produces no carbon emissions during operation.',
    category: 'technology',
    relatedTerms: ['nuclear-reactor', 'nuclear-fission', 'electricity'],
    quickFacts: [
      '10% of world electricity',
      'Zero carbon emissions',
      'Reliable baseload power',
      'Used in 30+ countries',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Nuclear Power',
        url: 'https://www.iaea.org/topics/nuclear-power',
      },
    ],
    difficulty: 'beginner',
  },
  'carbon-free': {
    id: 'carbon-free',
    term: 'Carbon-Free Energy',
    definition: 'Energy sources that produce electricity without emitting carbon dioxide. Nuclear power is carbon-free during operation, making it important for climate change mitigation.',
    category: 'technology',
    relatedTerms: ['nuclear-power', 'climate-change', 'renewable-energy'],
    quickFacts: [
      'No CO2 emissions during operation',
      'Important for climate goals',
      'Reliable baseload power',
      'Works alongside renewables',
    ],
    sources: [
      {
        organization: 'IAEA',
        title: 'Nuclear Power and Climate Change',
        url: 'https://www.iaea.org/topics/nuclear-power',
      },
    ],
    difficulty: 'beginner',
  },
};

/**
 * API Integration Helper
 * Can be used to fetch additional data from external sources
 */
export interface EncyclopediaAPIConfig {
  wikipedia?: {
    enabled: boolean;
    endpoint?: string;
  };
  iaea?: {
    enabled: boolean;
    endpoint?: string;
  };
}

/**
 * Fetch entry from Wikipedia API (example)
 * This is a placeholder for future API integration
 */
export async function fetchFromWikipedia(term: string): Promise<Partial<EncyclopediaEntry> | null> {
  // Example: Wikipedia API endpoint
  // const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
  // Implementation would go here
  return null;
}

/**
 * Get entry with API enhancement
 * First checks local database, then optionally fetches from API
 */
export async function getEncyclopediaEntryWithAPI(
  id: string,
  useAPI: boolean = false
): Promise<EncyclopediaEntry | null> {
  const localEntry = encyclopediaDatabase[id];
  
  if (!localEntry) {
    return null;
  }
  
  // If API is enabled, try to enhance with external data
  if (useAPI) {
    const apiData = await fetchFromWikipedia(localEntry.term);
    if (apiData) {
      return {
        ...localEntry,
        ...apiData,
      };
    }
  }
  
  return localEntry;
}

/**
 * Search entries with API enhancement
 */
export async function searchEncyclopediaWithAPI(
  query: string,
  useAPI: boolean = false
): Promise<EncyclopediaEntry[]> {
  const lowerQuery = query.toLowerCase();
  const localResults = Object.values(encyclopediaDatabase).filter(entry =>
    entry.term.toLowerCase().includes(lowerQuery) ||
    entry.definition.toLowerCase().includes(lowerQuery) ||
    entry.category.toLowerCase().includes(lowerQuery) ||
    entry.quickFacts.some(fact => fact.toLowerCase().includes(lowerQuery))
  );
  
  // If API is enabled, could also search external sources
  // and merge results
  
  return localResults.sort((a, b) => a.term.localeCompare(b.term));
}

export default encyclopediaDatabase;

