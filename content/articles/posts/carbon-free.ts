import { Post } from '../types';

const nuclearFission: Post = {
  id: 'nuclear-fission-science',
  type: 'article',
  category: 'science',
  title: 'The Science of Nuclear Power',
  content: 'Nuclear energy is a form of energy released from the nucleus, the core of atoms, made up of protons and neutrons. This source of energy can be produced in two ways: fission – when nuclei of atoms split into several parts – or fusion – when nuclei fuse together.\n\nThe nuclear energy harnessed around the world today to produce electricity is through nuclear fission, while technology to generate electricity from fusion is at the R&D phase.\n\nNuclear fission is a reaction where the nucleus of an atom splits into two or more smaller nuclei, while releasing energy.\n\nFor instance, when hit by a neutron, the nucleus of an atom of uranium-235 splits into two smaller nuclei, for example a barium nucleus and a krypton nucleus and two or three neutrons. These extra neutrons will hit other surrounding uranium-235 atoms, which will also split and generate additional neutrons in a multiplying effect, thus generating a chain reaction in a fraction of a second.\n\nInside nuclear power plants, nuclear reactors and their equipment contain and control the chain reactions, most commonly fuelled by uranium-235, to produce heat through fission. The heat warms the reactor\'s cooling agent, typically water, to produce steam. The steam is then channelled to spin turbines, activating an electric generator to create low-carbon electricity.',
  author: {
    name: 'IAEA',
    title: 'International Atomic Energy Agency',
    avatar: '@/assets/nuclear/author/IAEA.webp'
  },
  publishedDate: '2024-12-08',
  image: '@/assets/nuclear/feed-3.webp',
  tags: ['nuclear-energy', 'fission', 'science', 'education'],
  source: 'IAEA',
  sourceUrl: 'https://www.iaea.org/newscenter/news/what-is-nuclear-energy-the-science-of-nuclear-power',
  relatedContent: []
};

export default nuclearFission;

