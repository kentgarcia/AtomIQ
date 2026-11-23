// @ts-nocheck -- ported unchanged from the retired scripts/content-migration/legacy/curriculum/scenes.mjs (the authoring helpers). The
// output of every function is pinned against the shapes that shipped by `npm run test:figures`, which is the check that
// matters for pure drawing data; typing 70 drawings would add noise, not safety. shapes.ts is fully typed.
/**
 * The lesson figures: one exported function per picture, each returning `{ scene, altText }` (a hotspot figure also
 * returns its `targets`). A card refers to one by id (`figure: half-life-bars`, see FIGURES in index.ts). Pure data
 * functions: no React, so the app, `node --test` and the content tooling import this one file.
 *
 * An id never changes what it says (docs/features/CONTENT_SOURCE_PHASE5_SPEC.md 2.2): fix a drawing in place, add a
 * new function for a new meaning.
 */
import { arrow, art, atom, circle, cluster, crowd, line, nucleus, onRing, rect, shuffled, text, tremble, wave } from "./shapes.ts";

export function zoomChain() {
  return {
    scene: {
      height: 44,
      shapes: [
        art("hand", 17, 17, 26),
        text(17, 35, "Hand", 5.4),
        arrow(33, 17, 42, 17, undefined, 1),
        art("cell", 53, 17, 22),
        text(53, 35, "Cell", 5.4),
        arrow(65, 17, 74, 17, undefined, 1),
        art("atom", 86, 17, 16),
        text(86, 35, "Atom", 5.4),
        text(53, 41.5, "each step down is far smaller than it looks", 4.6),
      ],
    },
    altText: "A hand, then a cell inside it, then a single tiny atom, joined by arrows that point from big to small.",
  };
}

export function matterExamples() {
  return {
    scene: {
      height: 44,
      shapes: [
        art("air", 14, 15, 18),
        text(14, 31, "Air", 5),
        art("water", 38, 15, 18),
        text(38, 31, "Water", 5),
        art("phone", 62, 15, 18),
        text(62, 31, "Phone", 5),
        art("apple", 86, 15, 18),
        text(86, 31, "Apple", 5),
        text(50, 40.5, "all matter: they have mass and take up space", 4.6),
      ],
    },
    altText: "Pictures of air, water, a phone and an apple in a row, labelled as matter because they all have mass and take up space.",
  };
}

export function hairVsAtom() {
  return {
    scene: {
      height: 44,
      shapes: [
        art("hair", 18, 17, 26),
        text(18, 35, "One hair", 5.2),
        arrow(33, 17, 64, 17, undefined, 1),
        art("atom", 82, 17, 16),
        text(82, 35, "Atoms", 5.2),
        text(50, 41.5, "hundreds of thousands fit across a hair", 4.6),
      ],
    },
    altText: "A strand of hair on the left and an arrow pointing to a single atom on the right, showing that hundreds of thousands of atoms fit across the width of one hair.",
  };
}

export function matterVsEnergy() {
  return {
    scene: {
      height: 44,
      shapes: [
        text(25, 7, "Made of atoms", 5.4),
        art("air", 10, 21, 15),
        art("water", 25, 21, 15),
        art("hand", 40, 21, 15),
        text(25, 38, "air, water, you", 5),
        line(50, 4, 50, 40, undefined, { dash: true }),
        text(75, 7, "Not matter", 5.4),
        art("sun", 65, 21, 17),
        art("flame", 86, 21, 17),
        text(75, 38, "light and heat", 5),
      ],
    },
    altText: "Two panels. On the left, pictures of air, water and a hand, labelled air, water and you, which are made of atoms. On the right, the sun and a flame, labelled light and heat, which are energy and not made of atoms.",
  };
}

export function halving() {
  const widths = [80, 40, 20, 10, 5];
  const shapes = [];
  let y = 6;
  widths.forEach((w, i) => {
    shapes.push(rect(10, y, w, 8, i === widths.length - 1 ? "danger" : "accent", "soft", 1));
    y += 11;
  });
  shapes.push(text(66, 62, "cut it again... and again...", 5));
  shapes.push(text(66, 70, "where does it stop?", 5));
  return {
    scene: { height: 76, shapes },
    altText: "A bar cut in half again and again, getting smaller each time, ending in a tiny red piece: the idea of an atom as the piece you cannot cut.",
  };
}

/** The standard atom picture with labels. `label` adds nucleus/electron callouts. */
export function atomModel(protons, neutrons, electrons, { label = true } = {}) {
  const cx = 50;
  const cy = 38;
  const shapes = atom(cx, cy, protons, neutrons, electrons, { base: 19, step: 12 });
  if (label) {
    shapes.push(text(14, 8, "electrons", 5.2));
    shapes.push(arrow(22, 11, 33, 24, "info", 0.8));
    shapes.push(text(86, 8, "nucleus", 5.2));
    shapes.push(arrow(80, 11, 55, 34, "danger", 0.8));
  }
  return {
    scene: { height: 76, shapes },
    altText: `An atom with a tiny nucleus of ${protons} protons and ${neutrons} neutrons in the centre and ${electrons} electrons on rings around it.`,
  };
}

export function particleCards() {
  const col = (x, tone, sign, name, where) => [
    circle(x, 20, 10, tone, "soft"),
    text(x, 24, sign, 11, { keep: true }),
    text(x, 40, name, 5.4),
    text(x, 47, where, 4.8),
  ];
  return {
    scene: {
      height: 54,
      shapes: [
        ...col(18, "danger", "+", "Proton", "in the nucleus"),
        ...col(50, "neutral", "0", "Neutron", "in the nucleus"),
        ...col(82, "info", "-", "Electron", "outside it"),
      ],
    },
    altText: "Three particles. A proton with a plus sign and a neutron with a zero, both in the nucleus, and an electron with a minus sign outside the nucleus.",
  };
}

export function goldFoil() {
  const shapes = [
    rect(6, 28, 12, 14, "accent", "soft", 1),
    text(12, 52, "source", 4.8),
    rect(52, 8, 5, 54, "warning", "soft", 0.5),
    text(54, 70, "gold foil", 4.8),
  ];
  [20, 28, 36, 44, 52].forEach((y) => shapes.push(arrow(19, 35, 88, y - 3 + 5, "info", 0.6)));
  shapes.push(arrow(19, 35, 51, 36, "danger", 1.1));
  shapes.push(arrow(51, 36, 36, 16, "danger", 1.1));
  shapes.push(text(36, 12, "a few bounce back", 4.8));
  shapes.push(text(80, 64, "most go straight through", 4.8, { anchor: "middle" }));
  return {
    scene: { height: 76, shapes },
    altText: "Particles fired at a thin sheet of gold foil. Most pass straight through, but a few bounce back, showing there is something tiny and dense inside each atom.",
    caption: "Simplified and not to scale.",
  };
}

export function electronCloud() {
  const cx = 50;
  const cy = 36;
  const shapes = [circle(cx, cy, 30, "info", "soft"), circle(cx, cy, 20, "info", "soft"), circle(cx, cy, 1.6, "danger")];
  [30, 80, 140, 200, 250, 310].forEach((deg, i) => {
    const pt = onRing(cx, cy, 8 + ((i * 7) % 20), deg);
    shapes.push(circle(pt.x, pt.y, 1.2, "info"));
  });
  shapes.push(text(cx, 74, "a cloud where electrons are likely to be found", 4.8));
  return {
    scene: { height: 80, shapes },
    altText: "A soft cloud shaded darker toward the centre with a tiny nucleus in the middle, showing where electrons are likely to be found.",
  };
}

export function atomsByProtons() {
  const mini = (cx, p, n, e, label) => [
    ...atom(cx, 26, p, n, e, { base: 12, step: 9, particle: 2.2, electronSize: 1.6 }),
    text(cx, 50, `${p} proton${p > 1 ? "s" : ""}`, 4.8),
    text(cx, 57, label, 5.4),
  ];
  return {
    scene: {
      height: 62,
      shapes: [...mini(18, 1, 0, 1, "hydrogen"), ...mini(50, 2, 2, 2, "helium"), ...mini(82, 3, 4, 3, "lithium")],
    },
    altText: "Three atoms in a row: one proton makes hydrogen, two protons make helium, three protons make lithium.",
  };
}

/** One proton count, three everyday things: a balloon (helium), a diamond (carbon) and a gold bar. */
export function elementPictures() {
  const one = (x, id, protons, name, size) => [art(id, x, 20, size), text(x, 42, `${protons} protons`, 4.8), text(x, 49, name, 5.6)];
  return {
    scene: {
      height: 54,
      shapes: [...one(18, "balloon", 2, "helium", 24), ...one(50, "diamond", 6, "carbon", 24), ...one(82, "gold", 79, "gold", 24)],
    },
    altText: "Three things and their proton counts: a balloon filled with helium has 2 protons per atom, a diamond is carbon with 6, and a gold bar has 79.",
  };
}

/** The stadium picture: an atom as big as a stadium has a nucleus the size of a marble at its centre. */
export function stadiumMarble() {
  return {
    scene: {
      height: 62,
      shapes: [
        art("stadium", 25, 24, 40),
        art("marble", 25, 24, 7),
        text(25, 50, "atom: a stadium", 4.8),
        arrow(46, 24, 56, 24, undefined, 1),
        art("marble", 78, 24, 24),
        text(78, 50, "nucleus: a marble", 4.8),
        text(50, 58, "a marble that holds nearly all the mass", 4.6),
      ],
    },
    altText: "A football stadium with a small marble at its centre, then an arrow to a marble: if an atom were a stadium, its nucleus would be a marble, which holds nearly all the mass.",
  };
}

/** One box of the table: the atomic number is the key, the symbol is only a short name. */
export function tableCell() {
  return {
    scene: {
      height: 62,
      shapes: [
        rect(6, 5, 40, 50, "accent", "soft", 2),
        text(26, 22, "6", 15, { keep: true }),
        text(26, 39, "C", 8),
        text(26, 50, "Carbon", 5),
        arrow(54, 17, 38, 17, "danger", 0.8),
        text(56, 16, "atomic number", 5.4, { anchor: "start" }),
        text(56, 23, "= number of protons", 4.4, { anchor: "start" }),
        arrow(54, 36, 34, 39, undefined, 0.6),
        text(56, 36, "symbol", 5.2, { anchor: "start" }),
        text(56, 42, "a short name", 4.4, { anchor: "start" }),
        arrow(54, 51, 38, 50, undefined, 0.6),
        text(56, 53, "name", 5.2, { anchor: "start" }),
      ],
    },
    altText: "One box from the periodic table showing carbon. The big number 6 is the atomic number, which is the number of protons. The letter C is a short name for carbon, and the name Carbon is underneath.",
  };
}

/** A reminder strip: the rule for telling elements and isotopes apart. */
export function isotopeRuleBanner() {
  return {
    scene: {
      height: 30,
      shapes: [
        rect(4, 2, 92, 12, "danger", "soft", 3),
        text(50, 10.4, "Same protons: same element", 5.2),
        rect(4, 16, 92, 12, "neutral", "soft", 3),
        text(50, 24.4, "Different neutrons: different isotope", 4.8),
      ],
    },
    altText: "The rule for this lesson. Same number of protons means the same element. Different numbers of neutrons mean different isotopes of that element.",
  };
}

export function ionPair() {
  return {
    scene: {
      height: 70,
      shapes: [
        ...atom(25, 28, 3, 4, 3, { base: 11, step: 8, particle: 2, electronSize: 1.6 }),
        text(25, 56, "atom: 3 protons, 3 electrons", 4.8),
        text(25, 63, "no net charge", 4.8),
        ...atom(75, 28, 3, 4, 2, { base: 11, step: 8, particle: 2, electronSize: 1.6 }),
        text(75, 56, "ion: 3 protons, 2 electrons", 4.8),
        text(75, 63, "net charge +1", 4.8),
      ],
    },
    altText: "Two lithium particles side by side. A neutral atom with three protons and three electrons, and an ion that has lost one electron and so carries a positive charge.",
  };
}

export function isotopePair({ same = false } = {}) {
  const shapes = [
    ...atom(25, 30, 6, 6, 6, { base: 13, step: 9, particle: 2, electronSize: 1.6 }),
    text(25, 58, "carbon-12", 5.4),
    text(25, 65, "6 protons, 6 neutrons", 4.8),
    ...atom(75, 30, 6, 8, 6, { base: 13, step: 9, particle: 2, electronSize: 1.6 }),
    text(75, 58, "carbon-14", 5.4),
    text(75, 65, "6 protons, 8 neutrons", 4.8),
  ];
  if (same) shapes.push(text(50, 74, "same 6 electrons, same chemistry", 5));
  return {
    scene: { height: same ? 80 : 72, shapes },
    altText: "Two carbon atoms. Carbon-12 has six protons and six neutrons; carbon-14 has six protons and eight neutrons. Both have six electrons.",
  };
}

export function massNumber() {
  return {
    scene: {
      height: 56,
      shapes: [
        circle(16, 18, 7, "danger"),
        text(16, 20, "6", 7, { keep: true }),
        text(16, 34, "protons", 5),
        text(31, 20, "+", 9),
        circle(46, 18, 7, "neutral", "soft"),
        text(46, 20, "8", 7, { keep: true }),
        text(46, 34, "neutrons", 5),
        text(61, 20, "=", 9),
        rect(68, 8, 26, 20, "accent", "soft", 2),
        text(81, 22, "14", 10, { keep: true }),
        text(81, 34, "mass number", 5),
        text(50, 50, "so this atom is carbon-14", 5.4),
      ],
    },
    altText: "An equation: 6 protons plus 8 neutrons equals a mass number of 14, so the atom is called carbon-14.",
  };
}

export function nuclearForces() {
  const cx = 50;
  const cy = 36;
  const shapes = [...nucleus(cx, cy, 6, 6, 2.6)];
  [0, 90, 180, 270].forEach((deg) => {
    const a = onRing(cx, cy, 12, deg);
    const b = onRing(cx, cy, 22, deg);
    shapes.push(arrow(a.x, a.y, b.x, b.y, "danger", 1));
  });
  [45, 135, 225, 315].forEach((deg) => {
    const a = onRing(cx, cy, 24, deg);
    const b = onRing(cx, cy, 14, deg);
    shapes.push(arrow(a.x, a.y, b.x, b.y, "info", 1));
  });
  shapes.push(art("bolt", 10, 9, 13));
  shapes.push(text(18, 10, "electric push", 5, { anchor: "start" }));
  shapes.push(arrow(32, 13, 41, 22, "danger", 0.7));
  shapes.push(art("magnet", 90, 68, 13));
  shapes.push(text(82, 70, "strong pull", 5, { anchor: "end" }));
  shapes.push(arrow(72, 64, 64, 56, "info", 0.7));
  return {
    scene: { height: 76, shapes },
    altText: "A nucleus with red arrows pointing outward, the electric push between protons, and blue arrows pointing inward, the strong force pulling the particles together.",
  };
}

export function neutronGlue() {
  return {
    scene: {
      height: 62,
      shapes: [
        ...nucleus(25, 28, 6, 6, 2.4),
        text(25, 52, "carbon-12: balanced", 5),
        text(25, 59, "stable", 5.4),
        ...nucleus(75, 28, 6, 8, 2.4),
        text(75, 52, "carbon-14: too many", 5),
        text(75, 59, "neutrons, unstable", 5.4),
      ],
    },
    altText: "Two carbon nuclei. Carbon-12 has six protons and six neutrons and is a balanced, stable nucleus. Carbon-14 has two extra neutrons and is out of balance, so it is unstable.",
  };
}

export function decayFigure() {
  return {
    scene: {
      height: 60,
      shapes: [
        circle(20, 28, 11, "warning", "none"),
        ...nucleus(20, 28, 4, 6, 2.2),
        text(20, 52, "unstable nucleus", 5),
        arrow(33, 28, 60, 28, "warning", 1.2),
        art("radiation", 47, 15, 15),
        text(47, 35, "radiation", 5),
        ...nucleus(78, 28, 5, 5, 2.2),
        text(78, 52, "more stable nucleus", 5),
      ],
    },
    altText: "An unstable nucleus on the left gives off radiation, shown by an arrow, and becomes a more stable nucleus on the right.",
  };
}

export function becquerelPlate() {
  return {
    scene: {
      height: 62,
      shapes: [
        rect(24, 8, 52, 12, "warning", "soft", 2),
        text(50, 16.6, "uranium mineral", 4.6),
        line(40, 21, 36, 38, "warning", { dash: true }),
        line(50, 21, 50, 38, "warning", { dash: true }),
        line(60, 21, 64, 38, "warning", { dash: true }),
        rect(24, 39, 52, 8, "neutral", "soft", 1),
        text(50, 55, "photographic plate: dark marks appear", 4.8),
      ],
    },
    altText: "A uranium mineral sitting above a photographic plate with dashed lines running down to it, showing invisible rays that left dark marks on the plate.",
  };
}

// ---------------------------------------------------------------------------
// Figures added in the concept pass (docs: misconceptions, abstract ideas drawn)
// ---------------------------------------------------------------------------

/** Air is not nothing: a flat ball and a pumped one, with the air drawn as moving specks. */
export function airBalloons() {
  const cx = 74;
  const cy = 27;
  const specks = cluster(cx, cy, 9, 3.6).map((pt, i) => ({
    ...circle(pt.x, pt.y, 1.3, "info"),
    motion: { kind: "float", period: [3000, 4000, 5000][i % 3], dy: 1.4, phase: (i % 5) / 5 },
  }));
  return {
    scene: {
      height: 64,
      shapes: [
        rect(11, 34, 28, 9, "neutral", "soft", 4.5),
        text(25, 52, "flat ball", 5),
        text(25, 58, "very little air", 4.4),
        arrow(42, 30, 58, 30, undefined, 1),
        text(50, 25, "pump", 4.6),
        circle(cx, cy, 15, "info", "soft"),
        ...specks,
        text(74, 52, "pumped ball", 5),
        text(74, 58, "more air, more weight", 4.4),
      ],
    },
    altText: "A flat ball with very little air in it, an arrow labelled pump, and a round ball full of air drawn as small moving specks. The pumped ball weighs more, because air is matter.",
  };
}

/** A seesaw with a push on one side and a hold on the other: balanced (stable) and tipped (unstable). */
export function forceBalance() {
  const panel = (cx, tilt, title) => {
    const left = { x: cx - 16, y: 40 + tilt };
    const right = { x: cx + 16, y: 40 - tilt };
    return [
      text(cx, 8, title, 5),
      art("bolt", left.x, left.y - 11, 12),
      art("magnet", right.x, right.y - 11, 12),
      line(left.x, left.y, right.x, right.y, "neutral", { width: 1.8 }),
      circle(cx, 44, 3, "neutral"),
      rect(cx - 8, 47, 16, 4, "neutral", "solid", 1.5),
      text(left.x, 58, "push", 4.6),
      text(right.x, 58, "hold", 4.6),
    ];
  };
  return {
    scene: { height: 68, shapes: [...panel(25, 0, "balanced"), line(50, 14, 50, 60, undefined, { dash: true }), ...panel(75, 6, "out of balance"), text(25, 65, "stable", 5.2), text(75, 65, "unstable", 5.2)] },
    altText: "Two seesaws. On the left the push between protons and the hold in the nucleus are level, so the nucleus is balanced and stable. On the right the seesaw tips toward the push, so the nucleus is out of balance and unstable.",
  };
}

/** The idea of lesson 3: the number of protons tells you the element. */
export function elementsByProtons() {
  const one = (x, protons, name) => [
    ...nucleus(x, 24, protons, protons, 2.1),
    text(x, 44, `${protons} protons`, 5),
    text(x, 51, name, 6),
  ];
  return {
    scene: { height: 58, shapes: [...one(17, 6, "carbon"), ...one(50, 7, "nitrogen"), ...one(83, 8, "oxygen")] },
    altText: "Three atom centres side by side. An atom with 6 protons is carbon, an atom with 7 protons is nitrogen, and an atom with 8 protons is oxygen. The number of protons tells you the element.",
  };
}

/** Stable and unstable nuclei: one stays the same, one can change (it trembles). */
export function stableVsUnstable() {
  const shake = (shapes) => shapes.map((c, i) => ({ ...c, motion: { kind: "pulse", period: 2000 + (i % 3) * 1000, amount: 0.1, phase: (i % 4) / 4 } }));
  return {
    scene: {
      height: 62,
      shapes: [
        ...nucleus(25, 24, 6, 6, 2.4),
        text(25, 46, "carbon-12", 5.2),
        text(25, 53, "stable", 5.4),
        text(25, 59, "stays the same", 4.4),
        ...shake(nucleus(75, 24, 6, 8, 2.4)),
        text(75, 46, "carbon-14", 5.2),
        text(75, 53, "unstable", 5.4),
        text(75, 59, "can change", 4.4),
      ],
    },
    altText: "Two carbon nuclei. Carbon-12 is stable and stays the same. Carbon-14 is unstable and trembles, which shows that it can change.",
  };
}

/** Natural radioactivity: rocks, bananas and your own body all give off a little. */
export function naturalSources() {
  const one = (x, id, label, size) => [art(id, x, 21, size), art("radiation", x + 11, 9, 8), text(x, 39, label, 5)];
  return {
    scene: {
      height: 54,
      shapes: [...one(17, "rock", "rocks", 22), ...one(50, "banana", "bananas", 22), ...one(83, "hand", "your body", 20), text(50, 49, "all give off a little natural radiation", 4.8)],
    },
    altText: "A rock, a banana and a hand, each with a small radiation sign beside it. Rocks, bananas and your own body all give off a little natural radiation, and none of it was made by people.",
  };
}

/** Isotopes of carbon: two are stable, one is unstable. Being an isotope does not mean being radioactive. */
export function isotopeStability() {
  const badge = (cx, tone, label) => [rect(cx - 14, 47, 28, 8, tone, "soft", 3), text(cx, 52.6, label, 4.2)];
  const shake = (shapes) => shapes.map((c, i) => ({ ...c, motion: { kind: "pulse", period: 2000 + (i % 3) * 1000, amount: 0.1, phase: (i % 4) / 4 } }));
  return {
    scene: {
      height: 64,
      shapes: [
        text(50, 6, "three isotopes of carbon", 5.2),
        ...nucleus(17, 26, 6, 6, 2.1),
        text(17, 43, "carbon-12", 4.8),
        ...badge(17, "success", "stable"),
        ...nucleus(50, 26, 6, 7, 2.1),
        text(50, 43, "carbon-13", 4.8),
        ...badge(50, "success", "stable"),
        ...shake(nucleus(83, 26, 6, 8, 2.1)),
        text(83, 43, "carbon-14", 4.8),
        ...badge(83, "warning", "unstable"),
        text(50, 62, "most atoms around you are stable", 4.8),
      ],
    },
    altText: "Three carbon nuclei labelled carbon-12, carbon-13 and carbon-14. Carbon-12 and carbon-13 are marked stable and carbon-14 is marked unstable. They are all isotopes, but only one of them is radioactive.",
  };
}

/** Change the protons, change the element: carbon plus one proton is nitrogen. */
export function changeProtons() {
  return {
    scene: {
      height: 64,
      shapes: [
        ...nucleus(20, 26, 6, 6, 2.3),
        text(20, 46, "carbon", 5.6),
        text(20, 53, "6 protons", 4.6),
        arrow(36, 26, 62, 26, "warning", 1.2),
        text(49, 20, "add 1 proton", 4.8),
        ...nucleus(80, 26, 7, 6, 2.3),
        text(80, 46, "nitrogen", 5.6),
        text(80, 53, "7 protons", 4.6),
        text(50, 61, "a different element", 5),
      ],
    },
    altText: "A carbon nucleus with six protons, an arrow labelled add one proton, and a nitrogen nucleus with seven protons. Changing the number of protons gives a different element.",
  };
}

/** The first ten elements, for the figure and the hotspot card. */
export const FIRST_TEN = [
  [1, "H", "Hydrogen"],
  [2, "He", "Helium"],
  [3, "Li", "Lithium"],
  [4, "Be", "Beryllium"],
  [5, "B", "Boron"],
  [6, "C", "Carbon"],
  [7, "N", "Nitrogen"],
  [8, "O", "Oxygen"],
  [9, "F", "Fluorine"],
  [10, "Ne", "Neon"],
];

/** The first ten elements as a grid: number first, then symbol, then name. Used as a figure and as the tappable scene. */
export function firstTenGrid() {
  const shapes = [];
  const targets = [];
  FIRST_TEN.forEach(([z, sym, name], i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const x = 2.5 + col * 19;
    const y = 3 + row * 25;
    shapes.push(rect(x, y, 18, 23, "accent", "soft", 1.5));
    shapes.push(text(x + 1.8, y + 6, String(z), 5.2, { anchor: "start" }));
    shapes.push(text(x + 9, y + 14.5, sym, 8.5, { keep: true }));
    shapes.push(text(x + 9, y + 20, name, 3.3, { keep: true }));
    targets.push({ id: `el-${sym.toLowerCase()}`, label: `Element ${z}: ${name}`, x: x + 9, y: y + 11.5, r: 10 });
  });
  return { scene: { height: 54, shapes }, targets };
}

/** Atom model with tappable parts for the hotspot card. */
export function atomHotspot() {
  const cx = 50;
  const cy = 38;
  const shapes = atom(cx, cy, 2, 2, 2, { base: 19, step: 12 });
  const e1 = onRing(cx, cy, 19, -90);
  const e2 = onRing(cx, cy, 19, 90);
  return {
    scene: { height: 76, shapes },
    targets: [
      { id: "nucleus", label: "The centre of the atom", x: cx, y: cy, r: 9 },
      { id: "electron-a", label: "An electron on the ring", x: e1.x, y: e1.y, r: 7 },
      { id: "electron-b", label: "An electron on the ring", x: e2.x, y: e2.y, r: 7 },
    ],
  };
}

// ---------------------------------------------------------------------------
// Unit 2: Radioactivity (docs/features/UNIT_2_RADIOACTIVITY_SPEC.md)
// ---------------------------------------------------------------------------

/** L1: stable and unstable in the simplest words. */
export function simpleStableUnstable() {
  return {
    scene: {
      height: 60,
      shapes: [
        ...nucleus(25, 24, 6, 6, 2.4),
        text(25, 46, "stable", 5.4),
        text(25, 53, "can stay as it is", 4.4),
        ...tremble(nucleus(75, 24, 6, 8, 2.4)),
        text(75, 46, "unstable", 5.4),
        text(75, 53, "can change", 4.4),
      ],
    },
    altText: "Two nuclei. The stable one on the left can stay as it is. The unstable one on the right trembles, which shows it can change.",
  };
}

/** L1: an unstable parent nucleus changes by itself into a daughter nucleus and radiation. */
export function parentDaughter() {
  return {
    scene: {
      height: 62,
      shapes: [
        circle(20, 28, 11, "warning", "none"),
        ...tremble(nucleus(20, 28, 4, 6, 2.2)),
        text(20, 50, "parent", 5.4),
        text(20, 57, "unstable", 4.4),
        text(47, 17, "changes by itself", 4.4),
        arrow(33, 26, 61, 26, "warning", 1.2),
        art("radiation", 47, 36, 11),
        text(47, 48, "+ radiation", 4.4),
        ...nucleus(80, 28, 5, 5, 2.2),
        text(80, 50, "daughter", 5.4),
        text(80, 57, "new nucleus", 4.4),
      ],
    },
    altText: "An unstable parent nucleus on the left, an arrow labelled changes by itself, and on the right a new nucleus called the daughter. A radiation sign sits under the arrow.",
  };
}

/** L1: three nuclei to tap. The learner uses what Unit 1 taught to pick the unstable one. */
export function changeHotspot() {
  return {
    scene: {
      height: 54,
      shapes: [
        ...nucleus(20, 24, 6, 6, 2.3),
        text(20, 46, "carbon-12", 4.8),
        ...nucleus(50, 24, 6, 8, 2.3),
        text(50, 46, "carbon-14", 4.8),
        ...nucleus(80, 24, 8, 8, 2.3),
        text(80, 46, "oxygen-16", 4.8),
      ],
    },
    targets: [
      { id: "c12", label: "Carbon-12 nucleus", x: 20, y: 24, r: 13 },
      { id: "c14", label: "Carbon-14 nucleus", x: 50, y: 24, r: 13 },
      { id: "o16", label: "Oxygen-16 nucleus", x: 80, y: 24, r: 13 },
    ],
  };
}

/** L1: 100 unstable nuclei with one circled: you cannot say which changes next. */
export function randomOne() {
  const ring = { x: 50 + 0.5 * 5.4, y: 6 + 4 * 5.4 };
  return {
    scene: {
      height: 76,
      shapes: [
        ...crowd(50, 6, 10, 10, 5.4, 1.9, () => ({ tone: "warning", fill: "solid" })),
        circle(ring.x, ring.y, 4.6, "danger", "none"),
        text(50, 67, "Circled: will it change next?", 4.8),
        text(50, 73, "No one can tell.", 4.8),
      ],
    },
    altText: "A grid of one hundred unstable nuclei with one of them circled. The caption asks whether the circled one will change next, and says that no one can tell.",
  };
}

/** L1 (deeper): the same nucleus in a hot flame and in ice is still unstable. */
export function flameAndIce() {
  return {
    scene: {
      height: 64,
      shapes: [
        art("flame", 25, 13, 16),
        ...tremble(nucleus(25, 36, 4, 6, 2.2)),
        text(25, 51, "in a flame", 5),
        text(25, 58, "still unstable", 4.4),
        rect(58, 4, 34, 18, "info", "soft", 3),
        text(75, 16, "ice", 6),
        ...tremble(nucleus(75, 36, 4, 6, 2.2)),
        text(75, 51, "in ice", 5),
        text(75, 58, "still unstable", 4.4),
      ],
    },
    altText: "The same unstable nucleus twice: once beside a flame and once in a block of ice. Both are still unstable, because heating and cooling hardly change radioactive decay.",
  };
}

/** L2: one nucleus, three different things that can leave it. */
export function threeKinds() {
  return {
    scene: {
      height: 60,
      shapes: [
        ...tremble(nucleus(20, 30, 8, 10, 2)),
        arrow(33, 25, 56, 12, "danger", 1),
        ...nucleus(65, 12, 2, 2, 2.4),
        text(86, 14, "alpha", 5.6),
        arrow(34, 30, 56, 30, "info", 1),
        circle(63, 30, 2.4, "info"),
        text(86, 32, "beta", 5.6),
        arrow(33, 35, 52, 48, "warning", 1),
        ...wave(55, 74, 48, "warning", { amp: 2.4, steps: 8 }),
        text(88, 50, "gamma", 5.6),
      ],
    },
    altText: "One nucleus in the middle left with three arrows leaving it. The top arrow carries a chunky particle labelled alpha, the middle arrow a small fast particle labelled beta, and the bottom arrow a wavy line labelled gamma.",
  };
}

/** L2: alpha, a chunk of two protons and two neutrons, leaves and a daughter is left. */
export function alphaFigure() {
  return {
    scene: {
      height: 64,
      shapes: [
        ...nucleus(20, 38, 8, 10, 2),
        text(20, 58, "parent", 5),
        arrow(33, 33, 68, 17, "danger", 1.1),
        ...nucleus(80, 14, 2, 2, 2.8),
        text(80, 26, "alpha particle", 4.6),
        text(80, 32, "2 protons", 4.4),
        text(80, 37, "2 neutrons", 4.4),
        arrow(34, 42, 56, 47, "warning", 1),
        ...nucleus(68, 50, 6, 8, 2),
        text(68, 61, "daughter", 5),
      ],
    },
    altText: "A large parent nucleus gives off an alpha particle, a chunky cluster of two protons and two neutrons, and leaves a smaller daughter nucleus behind.",
  };
}

/** L2: beta, a fast electron, leaves. */
export function betaFigure() {
  return {
    scene: {
      height: 62,
      shapes: [
        ...tremble(nucleus(20, 34, 6, 8, 2.2)),
        text(20, 54, "parent", 5),
        arrow(33, 29, 62, 18, "info", 1.1),
        circle(80, 10, 2.6, "info"),
        text(80, 21, "beta particle", 4.4),
        text(80, 27, "a fast electron", 4.2),
        arrow(34, 38, 56, 42, "warning", 1),
        ...nucleus(68, 44, 7, 7, 2.2),
        text(68, 57, "daughter", 5),
      ],
    },
    altText: "A parent nucleus gives off a beta particle, a small fast electron, and a daughter nucleus is left behind.",
  };
}

/** L2: gamma, a wave of electromagnetic radiation, not a particle. */
export function gammaFigure() {
  return {
    scene: {
      height: 56,
      shapes: [
        ...tremble(nucleus(16, 28, 6, 8, 2.2)),
        text(16, 48, "nucleus", 5),
        ...wave(32, 88, 24, "warning", { amp: 3.2, steps: 18, width: 1.1 }),
        arrow(86, 24, 92, 24, "warning", 1.1),
        text(60, 12, "gamma ray", 5.6),
        text(60, 42, "like light, far more energetic", 4.4),
        text(60, 49, "not a particle", 4.6),
      ],
    },
    altText: "A nucleus with a wavy line leaving it, labelled gamma ray. The captions say it is like light but far more energetic, and that it is not a particle.",
  };
}

/** L2 (deeper): alpha and beta change the nucleus, gamma only releases energy. */
export function whatChanges() {
  return {
    scene: {
      height: 78,
      shapes: [
        text(25, 6, "alpha or beta", 5),
        ...nucleus(25, 22, 6, 8, 2.2),
        arrow(25, 33, 25, 43, "warning", 1),
        ...nucleus(25, 54, 7, 7, 2.2),
        text(25, 71, "a different nucleus", 4.4),
        line(50, 4, 50, 74, undefined, { dash: true }),
        text(75, 6, "gamma", 5),
        ...tremble(nucleus(75, 22, 6, 8, 2.2)),
        ...wave(65, 85, 38, "warning", { amp: 2, steps: 8 }),
        ...nucleus(75, 54, 6, 8, 2.2),
        text(75, 71, "the same nucleus", 4.4),
      ],
    },
    altText: "Two panels. On the left, alpha or beta decay changes a nucleus into a different nucleus with a different make-up. On the right, gamma radiation leaves and the nucleus keeps the same protons and neutrons.",
  };
}

/** L3: 100 unstable nuclei, then about half of them. */
export function halfLifeGrid() {
  const order = shuffled(100, 7);
  const alive = new Set(order.slice(0, 50));
  return {
    scene: {
      height: 62,
      shapes: [
        text(22, 6, "start", 5),
        ...crowd(22, 11, 10, 10, 3.6, 1.35, () => ({ tone: "warning", fill: "solid" })),
        text(22, 52, "100 unstable", 4.6),
        arrow(42, 28, 58, 28, undefined, 1),
        text(50, 22, "wait one", 4.2),
        text(50, 40, "half-life", 4.2),
        text(78, 6, "after", 5),
        ...crowd(78, 11, 10, 10, 3.6, 1.35, (i) => (alive.has(i) ? { tone: "warning", fill: "solid" } : { tone: "neutral", fill: "none" })),
        text(78, 52, "about 50 left", 4.6),
        text(50, 59, "the rest have changed (the empty rings)", 4.4),
      ],
    },
    altText: "Two grids of small circles. The left grid has one hundred unstable nuclei. After one half-life, the right grid shows about fifty still unstable and about fifty drawn as empty rings, because they have changed.",
  };
}

/** L3: 100, 50, 25, 12, 6 as shrinking bars, always with "about". */
export function halfLifeBars() {
  const rows = [
    ["start", 100, "100"],
    ["1 half-life", 50, "about 50"],
    ["2 half-lives", 25, "about 25"],
    ["3 half-lives", 12, "about 12"],
    ["4 half-lives", 6, "about 6"],
  ];
  const shapes = [];
  rows.forEach(([label, n, shown], i) => {
    const y = 4 + i * 11;
    shapes.push(text(26, y + 5.6, label, 4.2, { anchor: "end" }));
    shapes.push(rect(28, y, n * 0.6, 7, i === 0 ? "warning" : "accent", "soft", 1));
    shapes.push(text(28 + n * 0.6 + 2, y + 5.6, shown, 4.4, { anchor: "start" }));
  });
  shapes.push(text(50, 64, "always \"about\": it is a pattern", 4.6));
  return {
    scene: { height: 70, shapes },
    altText: "Five bars that shrink by half each time: 100 at the start, then about 50, about 25, about 12 and about 6 after one, two, three and four half-lives. The word about is used each time because it is a pattern, not an exact count.",
  };
}

/** L3: one nucleus is unpredictable, a big group follows a pattern. */
export function groupNotTimer() {
  return {
    scene: {
      height: 58,
      shapes: [
        ...tremble(nucleus(24, 22, 4, 6, 2.2)),
        text(24, 42, "one nucleus", 5),
        text(24, 49, "when? no one knows", 4.2),
        line(48, 6, 48, 52, undefined, { dash: true }),
        rect(58, 12, 7, 28, "accent", "soft", 1),
        rect(68, 26, 7, 14, "accent", "soft", 1),
        rect(78, 33, 7, 7, "accent", "soft", 1),
        rect(88, 37, 7, 3, "accent", "soft", 1),
        text(76, 49, "a big group: a pattern", 4.2),
      ],
    },
    altText: "On the left, one nucleus with a caption saying nobody knows when it will change. On the right, a big group shown as bars that halve each time, a clear pattern.",
  };
}

/** L3: half-lives run from a fraction of a second to billions of years. */
export function halfLifeLadder() {
  const rows = [
    ["a fraction of a second", 8],
    ["iodine-131: about 8 days", 30],
    ["carbon-14: about 5,730 years", 58],
    ["potassium-40: about 1.25 billion years", 92],
  ];
  const shapes = [];
  rows.forEach(([label, w], i) => {
    const y = 4 + i * 15;
    shapes.push(text(3, y + 5, label, 4.4, { anchor: "start" }));
    shapes.push(rect(3, y + 7, w, 4, i === 3 ? "danger" : "accent", "soft", 1));
  });
  shapes.push(text(50, 66, "each rung is far longer than the last", 4.4));
  return {
    scene: { height: 72, shapes },
    altText: "A ladder of four bars that grow longer. The shortest is a fraction of a second. Then iodine-131 at about 8 days, carbon-14 at about 5,730 years, and potassium-40 at about 1.25 billion years.",
    caption: "The bars are not to scale: each step is far bigger than it looks.",
  };
}

/** L3 (deeper): the decay curve, halving every half-life. */
export function decayCurve() {
  const x0 = 14;
  const top = 8;
  const base = 50;
  const per = 18;
  const pt = (t) => ({ x: x0 + t * per, y: base - (base - top) * 0.5 ** t });
  const shapes = [line(x0, top - 2, x0, base, "neutral", { width: 0.8 }), line(x0, base, 94, base, "neutral", { width: 0.8 })];
  for (let i = 0; i < 16; i++) {
    const a = pt(i / 4);
    const b = pt((i + 1) / 4);
    shapes.push(line(a.x, a.y, b.x, b.y, "warning", { width: 1.2 }));
  }
  [1, 2, 3].forEach((t) => {
    const p = pt(t);
    shapes.push(line(p.x, p.y, p.x, base, "neutral", { dash: true, width: 0.6 }));
    shapes.push(circle(p.x, p.y, 1.4, "danger"));
    shapes.push(text(p.x, base + 6, String(t), 4.4));
  });
  shapes.push(text(x0 + 2, 6, "nuclei left", 4.2, { anchor: "start" }));
  shapes.push(text(56, 63, "time, in half-lives", 4.4));
  return {
    scene: { height: 68, shapes },
    altText: "A curve that falls steeply and then flattens out. It halves each time one half-life has passed, at marks 1, 2 and 3 on the time axis, and gets closer to zero without a sharp end.",
  };
}

/** L4: the daughter can be unstable too. */
export function daughterUnstable() {
  return {
    scene: {
      height: 62,
      shapes: [
        ...tremble(nucleus(18, 26, 8, 10, 2)),
        text(18, 47, "parent", 5),
        arrow(31, 26, 44, 26, "warning", 1),
        circle(60, 26, 11, "warning", "none"),
        ...tremble(nucleus(60, 26, 6, 8, 2)),
        text(60, 47, "daughter", 5),
        text(60, 54, "unstable too", 4.4),
        arrow(73, 26, 82, 26, "warning", 1),
        text(90, 30, "?", 11, { keep: true }),
      ],
    },
    altText: "A parent nucleus changes into a daughter nucleus. The daughter is ringed and trembling, which shows it is unstable too, and an arrow leads on to a question mark.",
  };
}

/** L4: a finished chain, ending in a stable nucleus. */
export function chainFigure() {
  const label = (x, a, b) => [text(x, 46, a, 4.4), ...(b ? [text(x, 52, b, 4.4)] : [])];
  return {
    scene: {
      height: 64,
      shapes: [
        ...tremble(nucleus(12, 26, 8, 10, 1.9)),
        ...label(12, "parent"),
        arrow(22, 26, 28, 26, "warning", 0.9),
        ...tremble(nucleus(37, 26, 7, 9, 1.9)),
        ...label(37, "daughter"),
        arrow(47, 26, 53, 26, "warning", 0.9),
        ...tremble(nucleus(62, 26, 6, 8, 1.9)),
        ...label(62, "next", "generation"),
        arrow(72, 26, 78, 26, "warning", 0.9),
        ...nucleus(87, 26, 6, 6, 2),
        ...label(87, "stable"),
        rect(76, 55, 22, 7, "success", "soft", 2.5),
        text(87, 60.4, "the end", 4),
      ],
    },
    altText: "A chain of four nuclei joined by arrows: parent, daughter, next generation, and a stable nucleus at the end. The first three tremble because they are unstable. The last one is still, and marks the end of the chain.",
  };
}

/** L4: the zoom-out, one unstable nucleus starts a whole chain. */
export function chainZoomOut() {
  const shapes = [];
  [0, 1, 2, 3, 4].forEach((i) => {
    const x = 10 + i * 18;
    const y = 10 + i * 12;
    const n = nucleus(x, y, 8 - i, 10 - i, 1.7);
    shapes.push(...(i < 4 ? tremble(n) : n));
    if (i < 4) shapes.push(arrow(x + 7, y + 3, x + 12, y + 9, "warning", 0.9));
  });
  shapes.push(text(66, 12, "one unstable nucleus", 4.6));
  shapes.push(text(66, 19, "can start a whole chain", 4.6));
  return {
    scene: { height: 68, shapes },
    altText: "Five nuclei stepping down a staircase, each joined to the next by an arrow. The first four tremble because they are unstable. The caption says one unstable nucleus can start a whole chain.",
  };
}

/** L4 (deeper): two real chains and where they end. */
export function realChains() {
  const row = (y, from, to) => [
    text(17, y + 1, from, 4.8),
    arrow(35, y - 2, 65, y - 2, "warning", 1),
    text(50, y - 7, "many decays", 4.2),
    text(84, y + 1, to, 4.8),
    text(84, y + 7, "stable", 4.4),
  ];
  return {
    scene: { height: 60, shapes: [...row(14, "uranium-238", "lead-206"), ...row(38, "thorium-232", "lead-208"), text(50, 56, "nothing to memorise", 4.4)] },
    altText: "Two long chains. Uranium-238 goes through many decays and ends at stable lead-206. Thorium-232 goes through many decays and ends at stable lead-208.",
  };
}

/** L5: rocks and soil. */
export function rocksSoil() {
  return {
    scene: {
      height: 70,
      shapes: [
        text(50, 8, "rocks and soil", 5.6),
        rect(4, 26, 92, 32, "neutral", "soft", 2),
        art("rock", 20, 40, 15),
        art("rock", 50, 44, 17),
        art("rock", 80, 39, 13),
        art("radiation", 20, 18, 8),
        art("radiation", 80, 18, 8),
        text(50, 66, "natural uranium and thorium", 4.6),
      ],
    },
    altText: "A cross-section of the ground, with three rocks in the soil and a small radiation sign above two of them. The caption says some rocks and soil contain natural uranium and thorium.",
  };
}

/** L5: radon rises from the ground and can get into buildings. */
export function radonHouse() {
  const puff = (x, y) => circle(x, y, 1.6, "info", "soft");
  return {
    scene: {
      height: 72,
      shapes: [
        text(50, 6, "radon gas rises from the ground", 4.6),
        line(32, 28, 50, 15, "neutral", { width: 1.6 }),
        line(50, 15, 68, 28, "neutral", { width: 1.6 }),
        rect(34, 28, 32, 20, "accent", "soft", 1.5),
        rect(10, 48, 80, 14, "neutral", "soft", 1.5),
        arrow(20, 47, 20, 34, "info", 0.9),
        arrow(80, 47, 80, 34, "info", 0.9),
        arrow(50, 47, 50, 37, "warning", 1.1),
        puff(18, 40),
        puff(23, 36),
        puff(78, 38),
        puff(83, 42),
        puff(48, 42),
        puff(53, 40),
        text(50, 69, "it can get into buildings", 4.8),
      ],
    },
    altText: "A house on the ground with a layer of soil below it. Small puffs of gas and arrows rise from the soil, and one arrow points up into the house. The caption says radon gas can get into buildings.",
  };
}

/** L5: food and the body hold a little natural potassium-40. */
export function foodBody() {
  return {
    scene: {
      height: 62,
      shapes: [
        art("banana", 16, 24, 20),
        text(16, 40, "food", 5),
        text(40, 15, "potassium-40", 4.2),
        arrow(28, 24, 52, 24, "warning", 1),
        art("hand", 64, 24, 18),
        text(64, 40, "your body", 5),
        art("radiation", 88, 22, 12),
        text(88, 36, "a little", 4.4),
        text(50, 51, "Your body contains a little", 4.8),
        text(50, 58, "natural potassium-40", 4.8),
      ],
    },
    altText: "A banana, an arrow labelled potassium-40, and a hand, with a small radiation sign beside it. Food and your own body contain a little natural potassium-40.",
  };
}

/** L5: cosmic radiation arrives from space all the time. */
export function cosmicRays() {
  const shapes = [art("sun", 12, 12, 14), circle(50, 62, 30, "info", "soft"), circle(50, 62, 36, "info", "none")];
  [26, 36, 46, 56, 66].forEach((x, i) => shapes.push(arrow(x - 6 + i * 1.5, 4, x, 24 + (i === 2 ? 0 : 2), "warning", 0.9)));
  shapes.push(text(86, 9, "cosmic", 4.4));
  shapes.push(text(86, 15, "radiation", 4.4));
  shapes.push(text(86, 21, "from space", 4.4));
  return {
    scene: { height: 62, shapes },
    altText: "The top of the Earth with a ring for the atmosphere. Several arrows from space arrive at it from above, labelled cosmic radiation from space. The sun is drawn in the top left corner.",
  };
}

/** L5: a question for later (the teaser). */
export function exposedLater() {
  return {
    scene: {
      height: 56,
      shapes: [
        art("radiation", 20, 20, 16),
        arrow(31, 20, 49, 20, "warning", 1),
        art("hand", 62, 20, 18),
        text(86, 24, "?", 12, { keep: true }),
        text(50, 44, "a question for later", 5.2),
        text(50, 51, "in Unit 3", 4.4),
      ],
    },
    altText: "A radiation sign with an arrow pointing at a hand, and a question mark. The caption says this is a question for later, in Unit 3.",
  };
}

/** L5: radioactive does not automatically mean dangerous. Three things decide. */
export function notAlwaysDangerous() {
  const card = (x, a, b) => [rect(x, 6, 31, 26, "accent", "soft", 2), text(x + 15.5, 17, a, 3.7), text(x + 15.5, 24, b, 3.7)];
  return {
    scene: {
      height: 52,
      shapes: [...card(1.5, "The type", "of radiation"), ...card(34.5, "The amount", "and exposure"), ...card(67.5, "How it reaches", "the body"), text(50, 44, "all three matter", 5)],
    },
    altText: "Three cards side by side: the type of radiation, the amount and exposure, and how it reaches the body. The caption says all three matter, so radioactive does not automatically mean dangerous.",
  };
}

/** L5 (deeper): radon is one link in a natural decay chain. */
export function radonChain() {
  const box = (x, a, b) => [rect(x, 8, 21, 17, "accent", "soft", 2), text(x + 10.5, 17, a, 4.2), ...(b ? [text(x + 10.5, 22, b, 3.8)] : [])];
  return {
    scene: {
      height: 46,
      shapes: [
        ...box(1, "uranium", "in rock"),
        arrow(23, 16, 26, 16, "warning", 0.8),
        ...box(27, "radium"),
        arrow(49, 16, 52, 16, "warning", 0.8),
        ...box(53, "radon", "a gas"),
        arrow(75, 16, 78, 16, "warning", 0.8),
        ...box(79, "lead", "stable"),
        text(50, 36, "radon is one link in a decay chain", 4.6),
      ],
    },
    altText: "Four boxes joined by arrows: uranium in rock, radium, radon which is a gas, and stable lead. The caption says radon is one link in a decay chain.",
  };
}


// ---------------------------------------------------------------------------
// Unit 3, Radiation Meets Matter (docs/features/FOUR_UNIT_RELEASE_SPEC.md). Every figure here is original drawing data.
// ---------------------------------------------------------------------------

/** U3 L1: radiation is energy, given off by many things. */
export function radiationIsEnergy() {
  const item = (x, id, label, size = 4.8) => [art(id, x, 14, 15), text(x, 28, label, size)];
  return {
    scene: {
      height: 52,
      shapes: [
        ...item(14, "sun", "Sun"),
        ...item(38, "lamp", "Lamp"),
        ...item(62, "phone", "Phone"),
        ...item(86, "radiation", "Unstable atoms", 3.8),
        text(50, 41, "all give off radiation:", 4.6),
        text(50, 47.5, "energy as waves or particles", 4.6),
      ],
    },
    altText: "A sun, a lamp, a phone and the radiation sign for unstable atoms in a row. The caption says all of them give off radiation, which is energy as waves or particles.",
  };
}

/** U3 L1: ionization, an electron knocked out of an atom. */
export function electronKnockedOut() {
  return {
    scene: {
      height: 58,
      shapes: [
        ...atom(18, 24, 2, 2, 2, { base: 12, particle: 2, electronSize: 1.8 }),
        text(18, 44, "an atom", 4.6),
        ...wave(33, 50, 24, "warning", { amp: 2.4, steps: 8, width: 1 }),
        arrow(50, 24, 56, 24, "warning", 1),
        text(43, 13, "ionizing", 4.4),
        text(43, 18, "radiation", 4.4),
        ...atom(72, 26, 2, 2, 1, { base: 12, particle: 2, electronSize: 1.8 }),
        circle(93, 9, 2, "info"),
        arrow(82, 17, 90, 11, "info", 0.9),
        text(76, 44, "electron knocked out", 4.2),
        text(50, 54, "this is called ionization", 5),
      ],
    },
    altText: "An atom with two electrons on the left, an arrow of ionizing radiation pointing at it, and the atom on the right with only one electron left while the other flies away. The caption calls this ionization.",
  };
}

/** U3 L1: the line between radiation that cannot and radiation that can knock electrons out of atoms. */
export function energyLine() {
  const box = (x, a, b, tone) => [rect(x, 17, 17, 15, tone, "soft", 2), text(x + 8.5, b ? 23.5 : 25, a, 3.6), ...(b ? [text(x + 8.5, 28.8, b, 3.6)] : [])];
  return {
    scene: {
      height: 56,
      shapes: [
        text(50, 6, "energy rises", 4.4),
        arrow(6, 11, 94, 11, "warning", 0.8),
        ...box(2, "Radio", "waves", "neutral"),
        ...box(21, "Micro-", "waves", "neutral"),
        ...box(40, "Visible", "light", "neutral"),
        line(60, 15, 60, 35, undefined, { dash: true, width: 0.8 }),
        ...box(64, "X-rays", null, "warning"),
        ...box(83, "Gamma", "rays", "warning"),
        text(30, 41, "non-ionizing", 5),
        text(30, 47, "cannot remove electrons", 3.4),
        text(80, 41, "ionizing", 5),
        text(80, 47, "can remove electrons", 3.4),
      ],
    },
    altText: "Five boxes in a row with an arrow above showing that energy rises from left to right: radio waves, microwaves and visible light on the left are non-ionizing and cannot remove electrons from atoms. A dashed line separates them from X-rays and gamma rays on the right, which are ionizing.",
  };
}

/** U3 L1: radiation comes from unstable atoms and from machines. */
export function atomsAndMachines() {
  return {
    scene: {
      height: 62,
      shapes: [
        text(25, 7, "From atoms", 5.2),
        ...tremble(nucleus(25, 26, 5, 5, 2.2)),
        arrow(37, 26, 46, 26, "warning", 0.9),
        text(25, 47, "an unstable atom gives off", 3.8),
        text(25, 53, "alpha, beta and gamma", 3.8),
        line(50, 4, 50, 58, undefined, { dash: true, width: 0.7 }),
        text(75, 7, "From machines", 5.2),
        rect(58, 18, 18, 16, "neutral", "soft", 2),
        text(67, 27, "X-ray", 3.8),
        ...wave(78, 96, 26, "warning", { amp: 2.2, steps: 7, width: 1 }),
        text(75, 47, "an X-ray machine makes", 3.8),
        text(75, 53, "X-rays with electricity", 3.8),
      ],
    },
    altText: "Two panels. On the left, an unstable atom gives off alpha, beta and gamma radiation. On the right, an X-ray machine makes X-rays using electricity. Radiation does not only come from the nucleus.",
  };
}

/** U3 L1 (deeper): ultraviolet sits at the line. */
export function ultravioletBorder() {
  return {
    scene: {
      height: 50,
      shapes: [
        rect(2, 10, 28, 16, "neutral", "soft", 2),
        text(16, 19.5, "Visible light", 4),
        rect(34, 10, 32, 16, "accent", "soft", 2),
        text(50, 19.5, "Ultraviolet", 4.4),
        rect(70, 10, 28, 16, "warning", "soft", 2),
        text(84, 19.5, "X-rays", 4.4),
        line(63, 7, 63, 29, undefined, { dash: true, width: 0.8 }),
        text(50, 38, "high-energy ultraviolet is ionizing", 4.2),
        text(50, 45, "visible light is not", 4.2),
      ],
    },
    altText: "Three boxes in a row: visible light, ultraviolet and X-rays, with a dashed line inside the ultraviolet box. The captions say high-energy ultraviolet is ionizing and visible light is not.",
  };
}

/** U3 L2: a sheet of paper stops an alpha particle. */
export function alphaPaper() {
  return {
    scene: {
      height: 52,
      shapes: [
        ...nucleus(14, 22, 2, 2, 2.4),
        text(14, 38, "alpha", 5),
        arrow(25, 22, 45, 22, "danger", 1.1),
        rect(47, 8, 3, 28, "neutral", "solid", 1),
        text(48.5, 44, "paper or skin", 4.4),
        text(78, 20, "stopped", 5.4),
        text(78, 27, "in a very short distance", 3.6),
      ],
    },
    altText: "An alpha particle, a chunk of two protons and two neutrons, travels toward a sheet of paper and is stopped by it. The label says paper or the outer layer of skin stops it.",
  };
}

/** U3 L2: beta passes paper and is stopped by a thin layer of metal. */
export function betaMetal() {
  return {
    scene: {
      height: 56,
      shapes: [
        circle(10, 18, 2.4, "info"),
        text(10, 30, "beta", 5),
        arrow(15, 18, 35, 18, "info", 1.1),
        rect(37, 6, 2.5, 26, "neutral", "solid", 1),
        text(38, 39, "paper", 4.4),
        arrow(42, 18, 61, 18, "info", 1.1),
        rect(63, 6, 4, 26, "neutral", "solid", 1),
        text(65, 39, "thin metal", 4.4),
        text(88, 16, "stopped", 5.2),
        text(50, 50, "goes through paper, stopped by thin metal", 4.4),
      ],
    },
    altText: "A beta particle travels through a sheet of paper and is then stopped by a thin sheet of metal. The caption says it goes through paper and is stopped by thin metal.",
  };
}

/** U3 L2: gamma passes thin barriers and is cut down by thick, dense material. */
export function gammaThick() {
  return {
    scene: {
      height: 66,
      shapes: [
        ...wave(2, 30, 18, "warning", { amp: 3, steps: 10, width: 1.1 }),
        text(16, 30, "gamma", 5),
        rect(33, 6, 2.5, 26, "neutral", "solid", 1),
        text(32, 39, "paper", 3.8),
        ...wave(36, 46, 18, "warning", { amp: 3, steps: 4, width: 1.1 }),
        rect(48, 6, 3, 26, "neutral", "solid", 1),
        text(51, 39, "metal", 3.8),
        ...wave(52, 64, 18, "warning", { amp: 3, steps: 5, width: 1.1 }),
        rect(66, 4, 12, 30, "neutral", "solid", 1.5),
        text(72, 39, "thick lead", 3.8),
        ...wave(80, 98, 18, "warning", { amp: 0.9, steps: 8, width: 0.7 }),
        text(89, 28, "far less", 3.8),
        text(50, 53, "passes thin barriers", 4.6),
        text(50, 60, "thick, dense material is needed", 4.6),
      ],
    },
    altText: "A gamma ray, drawn as a wavy line, passes through a sheet of paper and a thin sheet of metal, then meets a thick block of lead after which only a much smaller wave comes out. The caption says it passes thin barriers and thick, dense material is needed.",
  };
}

/** U3 L2 (deeper): where shields are used. */
export function shieldsInUse() {
  const box = (x, a, b) => [rect(x, 6, 30, 22, "accent", "soft", 2), text(x + 15, 15, a, 4.4), text(x + 15, 22, b, 3.4)];
  return {
    scene: {
      height: 52,
      shapes: [
        ...box(1.5, "Lead apron", "at the dentist"),
        ...box(35, "Concrete", "lead-lined rooms"),
        ...box(68.5, "Water", "storage pools"),
        text(50, 39, "barriers of lead, concrete or water", 4.4),
        text(50, 46, "protect against gamma rays and X-rays", 4.4),
      ],
    },
    altText: "Three boxes: a lead apron at the dentist, concrete or lead-lined rooms, and water storage pools. The captions say barriers of lead, concrete or water protect against gamma rays and X-rays.",
  };
}

/** U3 L3: exposure, radiation from a source reaches a person. */
export function exposureFigure() {
  return {
    scene: {
      height: 62,
      shapes: [
        rect(4, 14, 24, 22, "warning", "soft", 2),
        art("radiation", 16, 25, 12),
        text(16, 43, "sealed source", 4.2),
        line(30, 20, 66, 18, "warning", { dash: true, width: 0.9 }),
        line(30, 25, 66, 25, "warning", { dash: true, width: 0.9 }),
        line(30, 30, 66, 32, "warning", { dash: true, width: 0.9 }),
        circle(80, 18, 5.5, "neutral", "soft"),
        rect(71, 25, 18, 18, "neutral", "soft", 4),
        text(80, 50, "a person", 4.2),
        text(50, 57, "exposed: the radiation reaches you", 4.6),
      ],
    },
    altText: "A radioactive source sealed in a box on the left, with dashed lines running to a person on the right. The caption says exposed means the radiation reaches you.",
  };
}

/** U3 L3: contamination, radioactive material on or in something. */
export function contaminationFigure() {
  const dots = (cx, cy) => [
    circle(cx - 11, cy - 6, 1.5, "warning"),
    circle(cx + 11, cy - 3, 1.5, "warning"),
    circle(cx - 8, cy + 9, 1.5, "warning"),
    circle(cx + 9, cy + 10, 1.5, "warning"),
    circle(cx + 1, cy - 12, 1.5, "warning"),
  ];
  return {
    scene: {
      height: 60,
      shapes: [
        art("hand", 26, 22, 24),
        ...dots(26, 22),
        text(26, 42, "on skin or clothes", 4.2),
        line(50, 6, 50, 46, undefined, { dash: true, width: 0.7 }),
        art("air", 74, 22, 22),
        ...dots(74, 22),
        text(74, 42, "breathed in", 4.2),
        text(50, 54, "contamination: the radioactive material itself", 4.4),
      ],
    },
    altText: "A hand with small specks of radioactive material on it, and a puff of air with specks in it. The captions say the material can be on skin or clothes, or breathed in, and that contamination means the radioactive material itself.",
  };
}

/** U3 L3: when does exposure end? */
export function exposureEnds() {
  const row = (y, a, b) => [text(21, y, a, 4.6), arrow(41, y - 1.5, 53, y - 1.5, "warning", 0.9), text(76, y, b, 4.2)];
  return {
    scene: {
      height: 62,
      shapes: [
        text(21, 7, "Situation", 4.4),
        text(76, 7, "It ends when", 4.4),
        line(4, 11, 96, 11, undefined, { width: 0.5 }),
        ...row(21, "Near a source", "move away or shield"),
        ...row(35, "Dust on skin", "the dust is removed"),
        ...row(49, "Inside the body", "it leaves the body"),
      ],
    },
    altText: "A three-row table. Near a source: exposure ends when you move away or shield it. Dust on skin: it ends when the dust is removed. Inside the body: it ends when the material leaves the body.",
  };
}

/** U3 L3 (deeper): a sealed source stays put, material that is not sealed might spread. */
export function sealedSource() {
  return {
    scene: {
      height: 52,
      shapes: [
        rect(10, 10, 28, 20, "neutral", "soft", 2),
        circle(24, 20, 2, "warning"),
        text(24, 38, "sealed", 5),
        text(24, 45, "stays in its container", 3.6),
        line(50, 5, 50, 48, undefined, { dash: true, width: 0.7 }),
        circle(64, 18, 1.6, "warning"),
        circle(72, 24, 1.6, "warning"),
        circle(80, 16, 1.6, "warning"),
        circle(86, 27, 1.6, "warning"),
        circle(70, 31, 1.6, "warning"),
        circle(90, 19, 1.6, "warning"),
        text(76, 38, "not sealed", 5),
        text(76, 45, "might be spread about", 3.6),
      ],
    },
    altText: "Two panels. On the left, radioactive material sealed in a container stays in it. On the right, material that is not sealed is scattered about as specks, because it might be spread.",
  };
}

/** U3 L4: three instruments. */
export function instrumentsRow() {
  const card = (x, a, b, sub) => [rect(x, 6, 30, 34, "accent", "soft", 2), text(x + 15, b ? 16 : 19, a, 4.4), ...(b ? [text(x + 15, 22, b, 4.4)] : []), text(x + 15, 33, sub, 3.4)];
  return {
    scene: {
      height: 56,
      shapes: [
        ...card(1.5, "Geiger", "counter", "ionized gas"),
        ...card(35, "Scintillation", "counter", "flashes of light"),
        ...card(68.5, "Dosimeter", "", "worn by a person"),
        text(50, 50, "three ways to detect or measure radiation", 4.2),
      ],
    },
    altText: "Three cards: a Geiger counter that uses ionized gas, a scintillation counter that uses flashes of light, and a dosimeter that is worn by a person. The caption says they are three ways to detect or measure radiation.",
  };
}

/** U3 L4: radiation ionizes the gas in a Geiger tube. */
export function geigerTube() {
  return {
    scene: {
      height: 58,
      shapes: [
        ...wave(3, 22, 20, "warning", { amp: 2.6, steps: 8, width: 1 }),
        text(13, 31, "radiation", 4.2),
        arrow(24, 20, 34, 20, "warning", 1),
        rect(36, 12, 34, 16, "neutral", "soft", 8),
        circle(46, 20, 1.6, "info"),
        circle(53, 17, 1.6, "info"),
        circle(58, 23, 1.6, "info"),
        circle(64, 19, 1.6, "info"),
        text(53, 36, "gas in the tube is ionized", 3.8),
        arrow(72, 20, 79, 20, "info", 1),
        rect(81, 11, 16, 18, "accent", "soft", 2),
        text(89, 21, "count", 4.2),
        text(50, 50, "more radiation, more ionization", 4.8),
      ],
    },
    altText: "Radiation, drawn as a wave, enters a tube of gas where it ionizes the gas, shown as specks. A signal goes on to a counter box. The caption says more radiation means more ionization.",
  };
}

/** U3 L4: a detector always finds a little background. */
export function alwaysSomething() {
  return {
    scene: {
      height: 64,
      shapes: [
        art("sun", 16, 12, 12),
        text(16, 24, "cosmic rays", 3.8),
        arrow(24, 16, 40, 25, "warning", 0.9),
        rect(40, 22, 22, 16, "neutral", "soft", 2),
        text(51, 31.5, "detector", 4.2),
        arrow(51, 49, 51, 40, "warning", 0.9),
        rect(8, 50, 84, 6, "neutral", "soft", 1),
        text(51, 62, "minerals in the ground", 3.8),
        text(82, 25, "a small", 4.2),
        text(82, 31, "reading", 4.2),
      ],
    },
    altText: "A detector in the middle with an arrow coming in from cosmic rays above and another arrow coming up from minerals in the ground. A caption on the right says it shows a small reading, because background radiation is always present.",
  };
}

/** U3 L4 (deeper): more radiation, more ionization, more counts. */
export function moreRadiationMoreCounts() {
  const ticks = (x, n) => Array.from({ length: n }, (_, i) => line(x + i * 3.2, 20, x + i * 3.2, 30, "info", { width: 1 }));
  return {
    scene: {
      height: 50,
      shapes: [
        text(24, 8, "a little radiation", 4.4),
        ...ticks(14, 4),
        text(24, 38, "a few counts", 4.4),
        line(50, 5, 50, 44, undefined, { dash: true, width: 0.7 }),
        text(76, 8, "more radiation", 4.4),
        ...ticks(54, 13),
        text(76, 38, "many counts", 4.4),
      ],
    },
    altText: "Two panels of tick marks. A little radiation gives a few tick marks, which are counts. More radiation gives many more tick marks.",
  };
}

/** U3 L5: three units, three questions. */
export function threeQuestions() {
  const card = (x, name, sym, q1, q2) => [rect(x, 6, 31, 38, "accent", "soft", 2), text(x + 15.5, 14, name, 4.8), text(x + 15.5, 24, sym, 7), text(x + 15.5, 33, q1, 3.4), text(x + 15.5, 38, q2, 3.4)];
  return {
    scene: {
      height: 58,
      shapes: [
        ...card(1, "Becquerel", "Bq", "How active", "is the source?"),
        ...card(34.5, "Gray", "Gy", "How much energy", "was absorbed?"),
        ...card(68, "Sievert", "Sv", "How much harm", "could it do?"),
        text(50, 52, "three units, three questions", 5),
      ],
    },
    altText: "Three cards. The becquerel asks how active the source is, the gray asks how much energy was absorbed, and the sievert asks how much harm it could do. The caption says three units, three questions.",
  };
}

/** U3 L5: one becquerel is one decay per second. */
export function becquerelFigure() {
  return {
    scene: {
      height: 50,
      shapes: [
        ...crowd(26, 8, 5, 3, 7, 2.2, (i) => (i === 7 ? { tone: "warning", fill: "none" } : { tone: "neutral" })),
        text(26, 31, "a source", 4.4),
        arrow(46, 16, 62, 16, "warning", 1),
        text(80, 14, "1 decay", 5),
        text(80, 21, "in 1 second", 4.4),
        text(50, 43, "1 becquerel = 1 decay per second", 5),
      ],
    },
    altText: "A grid of nuclei labelled a source, with one of them shown as decayed, and an arrow to the words 1 decay in 1 second. The caption says one becquerel is one decay per second.",
  };
}

/** U3 L5: one gray is one joule absorbed per kilogram. */
export function grayFigure() {
  return {
    scene: {
      height: 50,
      shapes: [
        line(6, 12, 46, 12, "warning", { dash: true, width: 0.9, arrow: true }),
        line(6, 20, 46, 20, "warning", { dash: true, width: 0.9, arrow: true }),
        line(6, 28, 46, 28, "warning", { dash: true, width: 0.9, arrow: true }),
        rect(50, 6, 28, 28, "neutral", "soft", 3),
        text(64, 18, "1", 7),
        text(64, 28, "kilogram", 4),
        text(90, 18, "energy", 4.2),
        text(90, 24, "absorbed", 4.2),
        text(50, 43, "1 gray = 1 joule of energy per kilogram", 4.6),
      ],
    },
    altText: "Rays arrive at a block labelled one kilogram, with the words energy absorbed beside it. The caption says one gray is one joule of energy absorbed per kilogram.",
  };
}

/** U3 L5: the sievert counts the kind of radiation and the kind of tissue. */
export function sievertFigure() {
  return {
    scene: {
      height: 58,
      shapes: [
        rect(2, 6, 38, 14, "accent", "soft", 2),
        text(21, 14.5, "type of radiation", 4.2),
        rect(2, 26, 38, 14, "accent", "soft", 2),
        text(21, 34.5, "tissue sensitivity", 4.2),
        arrow(42, 13, 58, 22, "warning", 0.9),
        arrow(42, 33, 58, 25, "warning", 0.9),
        rect(60, 12, 38, 20, "warning", "soft", 2),
        text(79, 21, "Sievert", 5.4),
        text(79, 27.5, "potential for harm", 3.4),
        text(50, 52, "it counts both, not only the energy", 4.4),
      ],
    },
    altText: "Two boxes, type of radiation and tissue sensitivity, with arrows pointing to a box labelled sievert, potential for harm. The caption says it counts both, not only the energy.",
  };
}

/** U3 L5 (deeper): the older names for the same three quantities. */
export function olderUnits() {
  const row = (y, a, b) => [text(24, y, a, 4.6), arrow(44, y - 1.5, 54, y - 1.5, undefined, 0.8), text(76, y, b, 4.6)];
  return {
    scene: {
      height: 56,
      shapes: [
        text(24, 7, "Now", 4.4),
        text(76, 7, "Older unit", 4.4),
        line(4, 11, 96, 11, undefined, { width: 0.5 }),
        ...row(21, "becquerel (Bq)", "curie (Ci)"),
        ...row(32, "gray (Gy)", "rad"),
        ...row(43, "sievert (Sv)", "rem"),
        text(50, 52, "100 rem = 1 sievert, 100 rad = 1 gray", 3.8),
      ],
    },
    altText: "A table with the becquerel matched to the older curie, the gray to the older rad, and the sievert to the older rem. A caption says 100 rem is one sievert and 100 rad is one gray.",
  };
}

// ---------------------------------------------------------------------------
// Unit 4, Radiation and the Body (docs/features/UNIT_4_RADIATION_AND_THE_BODY_SPEC.md). Every number drawn here is in that
// spec's table of facts. Original drawing data.
// ---------------------------------------------------------------------------

/** U4 L1: the unit a dose is counted in. */
export function millisievertFigure() {
  return {
    scene: {
      height: 44,
      shapes: [
        rect(3, 6, 38, 20, "accent", "soft", 2),
        text(22, 14, "1 sievert", 5),
        text(22, 21, "(Sv)", 4),
        text(50, 19, "=", 8),
        rect(59, 6, 38, 20, "info", "soft", 2),
        text(78, 13, "1000", 5.2),
        text(78, 19, "millisieverts", 3.6),
        text(78, 23.5, "(mSv)", 3.2),
        text(50, 38, "everyday doses: millisieverts", 4.4),
      ],
    },
    altText: "A box saying 1 sievert equals a box saying 1000 millisieverts. The caption says everyday doses are counted in millisieverts.",
  };
}

/** U4 L1: where a year's dose comes from, bars to scale. */
export function aYearOfDose() {
  const row = (y, label, mSv, tone) => [text(50, y, label, 4), rect(10, y + 3, Math.max(mSv * 30, 3), 6, tone, "soft", 2)];
  return {
    scene: {
      height: 60,
      shapes: [
        ...row(8, "Radon in an average US home: about 2.3", 2.28, "warning"),
        ...row(24, "Cosmic rays at sea level: about 0.3", 0.3, "info"),
        ...row(40, "Rocks and soil: about 0.21", 0.21, "accent"),
        text(50, 56, "millisieverts in a year (bars to scale)", 3.8),
      ],
    },
    altText: "Three bars for the dose in one year, drawn to scale: radon in an average US home about 2.3 millisieverts, cosmic rays at sea level about 0.3, and rocks and soil about 0.21.",
  };
}

/** U4 L1: doses from tiny to the level where illness starts. */
export function doseLadder() {
  const row = (y, value, label, tone) => [rect(2, y, 24, 8.5, tone, "soft", 2), text(14, y + 6, value, 4.8), text(63, y + 6, label, 3.6)];
  return {
    scene: {
      height: 86,
      shapes: [
        text(50, 6, "millisieverts (mSv)", 4),
        ...row(11, "1000", "illness starts, in a short time", "danger"),
        ...row(22, "10", "one whole-body CT scan", "warning"),
        ...row(33, "6.2", "an average year in the US", "accent"),
        ...row(44, "2.3", "a year of radon, average US home", "info"),
        ...row(55, "0.3", "a year of cosmic rays, sea level", "info"),
        ...row(66, "<0.01", "a year near a nuclear power station", "neutral"),
        text(50, 82, "the steps are not to scale", 3.6),
      ],
    },
    altText: "A ladder of doses in millisieverts, from the biggest at the top: 1000, where illness starts in a short time; 10, one whole-body CT scan; 6.2, an average year in the US; 2.3, a year of radon in an average US home; 0.3, a year of cosmic rays at sea level; and under 0.01, a year near a nuclear power station. The steps are not to scale.",
  };
}

/** U4 L2: ionizing radiation reaching the DNA in a cell. */
export function radiationHitsCell() {
  return {
    scene: {
      height: 56,
      shapes: [
        circle(52, 28, 20, "info", "soft"),
        circle(52, 28, 8, "accent", "soft"),
        ...wave(44, 60, 28, "accent", { amp: 1.8, steps: 8, width: 0.8 }),
        ...wave(2, 22, 28, "warning", { amp: 2.4, steps: 8, width: 1 }),
        arrow(22, 28, 34, 28, "warning", 1),
        text(14, 18, "ionizing", 3.8),
        text(14, 22.5, "radiation", 3.8),
        circle(52, 28, 2, "danger"),
        text(52, 52, "a cell", 4.2),
        text(86, 24, "can damage", 4.2),
        text(86, 30, "its DNA", 4.2),
      ],
    },
    altText: "Ionizing radiation, drawn as a zigzag with an arrow, travels into a cell and hits the DNA strand inside its nucleus. The caption says it can damage its DNA.",
  };
}

/** U4 L2: the cell repairs damage; damage not repaired correctly can go wrong. */
export function cellRepair() {
  return {
    scene: {
      height: 62,
      shapes: [
        circle(14, 18, 9, "info", "soft"),
        circle(14, 18, 2, "danger"),
        arrow(26, 18, 62, 18, "info", 1),
        text(44, 12, "extremely efficient repair", 3.8),
        circle(78, 18, 9, "info", "soft"),
        text(78, 34, "repaired", 4),
        text(14, 34, "damaged", 4),
        line(4, 40, 96, 40, undefined, { dash: true, width: 0.6 }),
        circle(14, 51, 6, "info", "soft"),
        circle(14, 51, 1.6, "danger"),
        arrow(23, 51, 36, 51, "warning", 1),
        rect(38, 43, 60, 16, "warning", "soft", 2),
        text(68, 49, "not repaired correctly:", 3.6),
        text(68, 55, "may die or become cancerous", 3.6),
      ],
    },
    altText: "Top row: a damaged cell, an arrow labelled extremely efficient repair, and a repaired cell. Bottom row, below a dashed line: a damaged cell, an arrow, and a box saying that if the damage is not repaired correctly the cell may die or eventually become cancerous.",
  };
}

/** U4 L2: radiation passes through a person and does not stay. */
export function passesThrough() {
  return {
    scene: {
      height: 50,
      shapes: [
        circle(50, 12, 5.5, "neutral", "soft"),
        rect(41, 19, 18, 22, "neutral", "soft", 3),
        ...wave(2, 26, 28, "warning", { amp: 2.2, steps: 8, width: 1 }),
        arrow(26, 28, 38, 28, "warning", 1),
        ...wave(62, 80, 28, "warning", { amp: 2.2, steps: 6, width: 1 }),
        arrow(80, 28, 96, 28, "warning", 1),
        text(50, 47, "exposed, but not radioactive", 4.2),
      ],
    },
    altText: "A person in the middle. Radiation arrives from the left, passes through, and leaves on the right. The caption says exposed, but not radioactive.",
  };
}

/** U4 L3: one total dose, delivered at two different speeds. */
export function fastOrSlow() {
  const bars = [];
  for (let i = 0; i < 8; i++) bars.push(rect(54 + i * 5, 34, 3, 12, "info", "soft", 1));
  return {
    scene: {
      height: 64,
      shapes: [
        text(22, 8, "a few minutes", 4.4),
        rect(14, 14, 16, 32, "danger", "soft", 2),
        line(50, 6, 50, 52, undefined, { dash: true, width: 0.6 }),
        text(76, 8, "over years", 4.4),
        ...bars,
        text(50, 59, "same total dose, different dose rate", 4.2),
      ],
    },
    altText: "Two ways to receive the same total dose. On the left, one tall bar for a few minutes. On the right, many small bars spread over years. The caption says same total dose, different dose rate.",
  };
}

/** U4 L3: a very large dose, fast. */
export function bigFastDose() {
  return {
    scene: {
      height: 62,
      shapes: [
        rect(8, 8, 18, 46, "danger", "soft", 2),
        text(17, 4.5, "1000", 4),
        text(66, 14, "about 1000 mSv, fast:", 4.6),
        text(66, 21, "the threshold for", 3.8),
        text(66, 26, "acute radiation syndrome", 3.8),
        text(66, 37, "nausea and vomiting", 4),
        text(66, 42, "can begin within hours", 4),
        text(66, 52, "skin redness, hair loss, burns", 3.6),
      ],
    },
    altText: "A tall bar labelled 1000 and, beside it, the words about 1000 millisieverts, fast: the threshold for acute radiation syndrome. Nausea and vomiting can begin within hours, and skin redness, hair loss and burns can follow high doses.",
  };
}

/** U4 L3: a low dose spread over time leaves time to repair. */
export function smallSpreadDose() {
  const shapes = [text(50, 8, "a low dose, or one spread over time", 4.4)];
  for (let i = 0; i < 8; i++) {
    shapes.push(rect(11 + i * 11, 20, 5, 10, "info", "soft", 1));
    shapes.push(circle(13.5 + i * 11, 41, 2.2, "accent"));
  }
  shapes.push(text(50, 55, "time to repair in between", 4.2));
  return {
    scene: { height: 62, shapes },
    altText: "A row of small dose bars spread out in time, with a small repair dot under each. The caption says a low dose, or one spread over time, leaves time to repair in between.",
  };
}

/** U4 L4: the three ways to lower a dose. */
export function threeWays() {
  const box = (x, tone, title, sub) => [rect(x, 8, 28, 28, tone, "soft", 2), text(x + 14, 20, title, 4.8), text(x + 14, 28, sub, 3.4)];
  return {
    scene: {
      height: 50,
      shapes: [
        ...box(3, "info", "Time", "less time near it"),
        ...box(36, "accent", "Distance", "farther from it"),
        ...box(69, "warning", "Shielding", "something between"),
        text(50, 46, "three ways to lower a dose", 4.4),
      ],
    },
    altText: "Three boxes in a row: time, less time near the source; distance, farther from the source; shielding, something between you and the source. The caption says these are three ways to lower a dose.",
  };
}

/** U4 L4: less time, less dose. */
export function lessTime() {
  return {
    scene: {
      height: 48,
      shapes: [
        text(14, 13, "long visit", 4),
        rect(30, 8, 62, 8, "danger", "soft", 2),
        text(14, 29, "short visit", 4),
        rect(30, 24, 24, 8, "info", "soft", 2),
        text(50, 44, "same source: less time, less dose", 4.2),
      ],
    },
    altText: "Two bars for time spent near the same source: a long bar for a long visit and a short bar for a short visit. The caption says less time means less dose.",
  };
}

/** U4 L4: farther away, less dose. */
export function moreDistance() {
  return {
    scene: {
      height: 52,
      shapes: [
        circle(8, 28, 5, "warning"),
        text(8, 40, "source", 3.4),
        circle(36, 28, 5, "neutral", "soft"),
        arrow(14, 28, 30, 28, "danger", 1.4),
        text(36, 12, "close:", 4),
        text(36, 17, "more dose", 4),
        circle(86, 28, 5, "neutral", "soft"),
        arrow(14, 34, 80, 34, "warning", 0.5),
        text(86, 12, "far:", 4),
        text(86, 17, "less dose", 4),
        text(50, 48, "the dose drops as distance grows", 4),
      ],
    },
    altText: "A radiation source on the left. A person standing close to it receives a lot, shown by a thick arrow. A person standing far away receives much less, shown by a thin arrow. The caption says the dose drops as distance grows.",
  };
}

/** U4 L4: a barrier between you and a source. */
export function somethingBetween() {
  return {
    scene: {
      height: 52,
      shapes: [
        circle(8, 28, 5, "warning"),
        arrow(14, 28, 42, 28, "danger", 1.2),
        rect(46, 10, 6, 34, "neutral", "solid", 1),
        text(49, 6, "lead, concrete or water", 3.6),
        circle(86, 28, 5, "neutral", "soft"),
        text(86, 40, "much less", 3.6),
        text(50, 49, "a shield between you and the source", 4),
      ],
    },
    altText: "A radiation source on the left sends an arrow toward a person on the right, but a wall of lead, concrete or water stands in between, so the person receives much less. The caption says a shield between you and the source.",
  };
}

/** U4 L4: the three ways in real life. */
export function realUses() {
  const row = (y, tone, label) => [rect(4, y, 10, 10, tone, "soft", 2), text(58, y + 7, label, 3.6)];
  return {
    scene: {
      height: 52,
      shapes: [
        ...row(4, "warning", "a lead apron at a dental X-ray"),
        ...row(20, "accent", "sources stored under water or in concrete"),
        ...row(36, "info", "a shelter: more walls, more protection"),
      ],
    },
    altText: "Three real uses of shielding. A lead apron on a patient at a dental X-ray, radioactive sources stored under water or in concrete, and a shelter where more walls give more protection.",
  };
}

/** U4 L5: three questions to ask about a dose. */
export function headlineQuestions() {
  const row = (y, title, sub) => [rect(3, y, 94, 15, "accent", "soft", 2), text(50, y + 7, title, 4.8), text(50, y + 12.2, sub, 3.4)];
  return {
    scene: {
      height: 60,
      shapes: [
        ...row(3, "1. How big?", "the amount, in millisieverts"),
        ...row(22, "2. How fast?", "all at once, or over time"),
        ...row(41, "3. Compared with what?", "an average year, a CT scan, 1000"),
      ],
    },
    altText: "Three questions to ask about any dose in a headline: how big, the amount in millisieverts; how fast, all at once or over time; and compared with what, an average year, a CT scan or 1000.",
  };
}

/** U4 L5: two sayings that are both wrong. */
export function twoMyths() {
  return {
    scene: {
      height: 56,
      shapes: [
        rect(3, 6, 45, 22, "danger", "soft", 2),
        text(25.5, 15, "Any dose", 4.4),
        text(25.5, 21.5, "is deadly", 4.4),
        text(25.5, 34, "wrong: we all get", 3.2),
        text(25.5, 38.5, "small doses daily", 3.2),
        rect(52, 6, 45, 22, "warning", "soft", 2),
        text(74.5, 15, "Radiation is", 4.4),
        text(74.5, 21.5, "harmless", 4.4),
        text(74.5, 34, "wrong: a very large", 3.2),
        text(74.5, 38.5, "fast dose makes people ill", 3.2),
        text(50, 51, "the size and speed of the dose decide", 4),
      ],
    },
    altText: "Two boxes. Any dose is deadly: wrong, we all get small doses daily. Radiation is harmless: wrong, a very large fast dose makes people ill. The caption says the size and speed of the dose decide.",
  };
}
