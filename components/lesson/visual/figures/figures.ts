// @ts-nocheck -- ported unchanged from scripts/content-migration/curriculum/scenes.mjs (the authoring helpers). The
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

