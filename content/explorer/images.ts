/**
 * Image registry for encyclopedia entries.
 *
 * Entry data lives in the SQLite content database, but React Native needs
 * static `require()` calls at bundle time, so the asset map stays in TS.
 * Maps encyclopedia entry ids -> bundled webp assets (terms + people).
 */

// Terms images
const termsImages: Record<string, any> = {
  'absorbed-dose': require('../../assets/images/terms/Absorbed dose.webp'),
  'alpha-particle': require('../../assets/images/terms/alpha particle.webp'),
  'atom': require('../../assets/images/terms/atom.webp'),
  'atomic-number': require('../../assets/images/terms/atomic number.webp'),
  'background-radiation': require('../../assets/images/terms/background radiation.webp'),
  'becquerel': require('../../assets/images/terms/bq.webp'),
  'beta-particle': require('../../assets/images/terms/beta particle.webp'),
  'binding-energy': require('../../assets/images/terms/binding energy.webp'),
  'chain-reaction': require('../../assets/images/terms/chain reaction.webp'),
  'control-rod': require('../../assets/images/terms/control rod.webp'),
  'critical-mass': require('../../assets/images/terms/critical mass.webp'),
  'cyclotron': require('../../assets/images/terms/Cyclotron.webp'),
  'decay': require('../../assets/images/terms/Decay.webp'),
  'dose-rate': require('../../assets/images/terms/Dose Rate.webp'),
  'dosimeter': require('../../assets/images/terms/dosimeter.webp'),
  'electron': require('../../assets/images/terms/electron.webp'),
  'enrichment': require('../../assets/images/terms/Enrichment.webp'),
  'exposure': require('../../assets/images/terms/exposure.webp'),
  'fission': require('../../assets/images/terms/fission.webp'),
  'fuel-rod': require('../../assets/images/terms/fuel rods.webp'),
  'fusion': require('../../assets/images/terms/fusion.webp'),
  'gamma-ray': require('../../assets/images/terms/gamma rays.webp'),
  'geiger-counter': require('../../assets/images/terms/geiger counter.webp'),
  'gray': require('../../assets/images/terms/gray gy.webp'),
  'half-life': require('../../assets/images/terms/Half-Life.webp'),
  'heavy-water': require('../../assets/images/terms/heavy water.webp'),
  'hot-cell': require('../../assets/images/terms/hot cell.webp'),
  'ion-chamber': require('../../assets/images/terms/ion chamber.webp'),
  'ionizing-radiation': require('../../assets/images/terms/Ionizing Radiation.webp'),
  'isotope': require('../../assets/images/terms/isotope.webp'),
  'joule': require('../../assets/images/terms/joule.webp'),
  'meltdown': require('../../assets/images/terms/meltdown.webp'),
  'moderator': require('../../assets/images/terms/Moderator.webp'),
  'neutron': require('../../assets/images/terms/neutron.webp'),
  'nuclear-reactor': require('../../assets/images/terms/nuclear reactor.webp'),
  'nucleus': require('../../assets/images/terms/nucleaus.webp'),
  'photon': require('../../assets/images/terms/photon.webp'),
  'plutonium': require('../../assets/images/terms/plutonium 239.webp'),
  'proton': require('../../assets/images/terms/proton.webp'),
  'quark': require('../../assets/images/terms/quark.webp'),
  'radiation': require('../../assets/images/terms/radiation.webp'),
  'radionuclide': require('../../assets/images/terms/radionuclide.webp'),
  'reactor-core': require('../../assets/images/terms/Reactor Core.webp'),
  'roentgen': require('../../assets/images/terms/roentengen.webp'),
  'scintillation-detector': require('../../assets/images/terms/scintillation detector.webp'),
  'shielding': require('../../assets/images/terms/Shielding.webp'),
  'sievert': require('../../assets/images/terms/Sievert.webp'),
  'uranium-235': require('../../assets/images/terms/Uranium-235.webp'),
  'uranium-238': require('../../assets/images/terms/Uranium-238.webp'),
  'x-ray': require('../../assets/images/terms/X-ray.webp'),
};

// People images
const peopleImages: Record<string, any> = {
  'henri-becquerel': require('../../assets/images/people/becquerel, henri.webp'),
  'niels-bohr': require('../../assets/images/people/bohr, niels.webp'),
  'carl-david-anderson': require('../../assets/images/people/carl david anderson.webp'),
  'james-chadwick': require('../../assets/images/people/chadwick.webp'),
  'marie-curie': require('../../assets/images/people/curie, marie.webp'),
  'pierre-curie': require('../../assets/images/people/curie, pierre.webp'),
  'edward-teller': require('../../assets/images/people/Edward Teller.webp'),
  'ernest-lawrence': require('../../assets/images/people/ernest o lawrence.webp'),
  'ernest-rutherford': require('../../assets/images/people/ernest rutherford.webp'),
  'enrico-fermi': require('../../assets/images/people/fermi.webp'),
  'frederick-soddy': require('../../assets/images/people/Frederick_Soddy.webp'),
  'glenn-seaborg': require('../../assets/images/people/Glenn Seaborg.webp'),
  'leo-szilard': require('../../assets/images/people/leo szilard.webp'),
  'lise-meitner': require('../../assets/images/people/Lise_Meitner.webp'),
  'j-robert-oppenheimer': require('../../assets/images/people/Oppenheimer.webp'),
  'otto-hahn': require('../../assets/images/people/Otto_Hahn.webp'),
  'andrei-sakharov': require('../../assets/images/people/sakharov.webp'),
  'eugene-wigner': require('../../assets/images/people/wigner.webp'),
  'wilhelm-roentgen': require('../../assets/images/people/Wilhelm_Röntgen.webp'),
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
