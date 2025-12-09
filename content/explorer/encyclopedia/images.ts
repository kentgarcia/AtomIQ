/**
 * Image mappings for encyclopedia entries
 * Maps image paths to actual require() statements for React Native
 */

// Terms images
const termsImages: Record<string, any> = {
  'absorbed-dose': require('../../../assets/images/terms/Absorbed dose.webp'),
  'atom': require('../../../assets/images/terms/Atom.webp'),
  'atomic-number': require('../../../assets/images/terms/Atomic number.webp'),
  'atomic-mass': require('../../../assets/images/terms/Atomic mass.webp'),
  'background-radiation': require('../../../assets/images/terms/Background radiation.webp'),
  'becquerel': require('../../../assets/images/terms/Becquerel.webp'),
  'beta-decay': require('../../../assets/images/terms/Beta decay.webp'),
  'chain-reaction': require('../../../assets/images/terms/Chain reaction.webp'),
  'containment': require('../../../assets/images/terms/Containment.webp'),
  'control-rod': require('../../../assets/images/terms/Control rod.webp'),
  'coolant': require('../../../assets/images/terms/Coolant.webp'),
  'critical-mass': require('../../../assets/images/terms/Critical mass.webp'),
  'decay-chain': require('../../../assets/images/terms/Decay chain.webp'),
  'dose': require('../../../assets/images/terms/Dose.webp'),
  'electron': require('../../../assets/images/terms/Electron.webp'),
  'enrichment': require('../../../assets/images/terms/Enrichment.webp'),
  'fallout': require('../../../assets/images/terms/Fallout.webp'),
  'fission': require('../../../assets/images/terms/Fission.webp'),
  'fuel-assembly': require('../../../assets/images/terms/Fuel assembly.webp'),
  'fusion': require('../../../assets/images/terms/Fusion.webp'),
  'gamma-ray': require('../../../assets/images/terms/Gamma ray.webp'),
  'geiger-counter': require('../../../assets/images/terms/Geiger counter.webp'),
  'half-life': require('../../../assets/images/terms/Half life.webp'),
  'ionization': require('../../../assets/images/terms/Ionization.webp'),
  'ionizing-radiation': require('../../../assets/images/terms/Ionizing radiation.webp'),
  'isotope': require('../../../assets/images/terms/Isotope.webp'),
  'lnt-model': require('../../../assets/images/terms/LNT model.webp'),
  'meltdown': require('../../../assets/images/terms/Meltdown.webp'),
  'moderator': require('../../../assets/images/terms/Moderator.webp'),
  'neutron': require('../../../assets/images/terms/Neutron.webp'),
  'non-ionizing-radiation': require('../../../assets/images/terms/Non ionizing radiation.webp'),
  'nuclear-reactor': require('../../../assets/images/terms/Nuclear reactor.webp'),
  'nuclear-waste': require('../../../assets/images/terms/Nuclear waste.webp'),
  'nucleus': require('../../../assets/images/terms/Nucleus.webp'),
  'plutonium': require('../../../assets/images/terms/Plutonium.webp'),
  'power-plant': require('../../../assets/images/terms/Power plant.webp'),
  'proton': require('../../../assets/images/terms/Proton.webp'),
  'rad': require('../../../assets/images/terms/Rad.webp'),
  'radiation': require('../../../assets/images/terms/Radiation.webp'),
  'radiation-sickness': require('../../../assets/images/terms/Radiation sickness.webp'),
  'radioactive': require('../../../assets/images/terms/Radioactive.webp'),
  'radioactivity': require('../../../assets/images/terms/Radioactivity.webp'),
  'radioisotope': require('../../../assets/images/terms/Radioisotope.webp'),
  'radionuclide': require('../../../assets/images/terms/Radionuclide.webp'),
  'radon': require('../../../assets/images/terms/Radon.webp'),
  'reactor-core': require('../../../assets/images/terms/Reactor core.webp'),
  'rem': require('../../../assets/images/terms/Rem.webp'),
  'shielding': require('../../../assets/images/terms/Shielding.webp'),
  'sievert': require('../../../assets/images/terms/Sievert.webp'),
  'spent-fuel': require('../../../assets/images/terms/Spent fuel.webp'),
  'uranium': require('../../../assets/images/terms/Uranium.webp'),
};

// People images
const peopleImages: Record<string, any> = {
  'henri-becquerel': require('../../../assets/images/people/becquerel.webp'),
  'niels-bohr': require('../../../assets/images/people/bohr.webp'),
  'james-chadwick': require('../../../assets/images/people/chadwick.webp'),
  'marie-curie': require('../../../assets/images/people/curies.webp'),
  'pierre-curie': require('../../../assets/images/people/curies.webp'),
  'enrico-fermi': require('../../../assets/images/people/fermi.webp'),
  'otto-hahn': require('../../../assets/images/people/hahn.webp'),
  'ernest-lawrence': require('../../../assets/images/people/lawrence.webp'),
  'lise-meitner': require('../../../assets/images/people/meitner.webp'),
  'j-robert-oppenheimer': require('../../../assets/images/people/oppenheimer.webp'),
  'ernest-rutherford': require('../../../assets/images/people/rutherford.webp'),
  'andrei-sakharov': require('../../../assets/images/people/sakharov.webp'),
  'glenn-seaborg': require('../../../assets/images/people/seaborg.webp'),
  'leo-szilard': require('../../../assets/images/people/szilard.webp'),
  'edward-teller': require('../../../assets/images/people/teller.webp'),
  'eugene-wigner': require('../../../assets/images/people/wigner.webp'),
};

// Combined mapping
export const encyclopediaImages: Record<string, any> = {
  ...termsImages,
  ...peopleImages,
};

/**
 * Get the image asset for an encyclopedia entry ID
 * @param id - The encyclopedia entry ID
 * @returns The image require() result or undefined if not found
 */
export function getEncyclopediaImage(id: string): any | undefined {
  return encyclopediaImages[id];
}
