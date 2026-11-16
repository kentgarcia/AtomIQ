/**
 * Authoring-time helpers for card figures: they return plain SceneShape arrays
 * (the app stores explicit shapes, never code). Scenes are 100 units wide.
 *
 * Tone convention across the curriculum:
 *   proton = danger (+), neutron = neutral (0), electron = info (-), attention = warning
 */

const round = (n) => Math.round(n * 100) / 100;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

export const circle = (x, y, r, tone, fill = "solid") => ({ t: "circle", x: round(x), y: round(y), r: round(r), tone, fill });
export const rect = (x, y, w, h, tone, fill = "solid", rx) => ({ t: "rect", x, y, w, h, tone, fill, ...(rx ? { rx } : {}) });
export const line = (x1, y1, x2, y2, tone, extra = {}) => ({ t: "line", x1: round(x1), y1: round(y1), x2: round(x2), y2: round(y2), tone, ...extra });
/** A picture from the lesson object art (components/lesson/visual/object-art.ts), centred on (x, y). */
export const art = (id, x, y, size) => ({ t: "art", id, x: round(x), y: round(y), size });
export const text = (x, y, s, size = 5, extra = {}) => ({ t: "text", x: round(x), y: round(y), text: s, size, ...extra });

/** Sunflower packing of `n` particles around (cx, cy); radius `c * sqrt(i)`. */
export function cluster(cx, cy, n, c = 3) {
  return Array.from({ length: n }, (_, i) => {
    const r = c * Math.sqrt(i + 0.5);
    const a = i * GOLDEN;
    return { x: round(cx + r * Math.cos(a)), y: round(cy + r * Math.sin(a)) };
  });
}

/** Point on a circle, angle in degrees (0 = right, 90 = down). */
export function onRing(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return { x: round(cx + r * Math.cos(a)), y: round(cy + r * Math.sin(a)) };
}

/** A nucleus: protons and neutrons interleaved so both show. */
export function nucleus(cx, cy, protons, neutrons, size = 2.6) {
  const total = protons + neutrons;
  const spots = cluster(cx, cy, total, size * 0.9);
  const shapes = [];
  let p = protons;
  let n = neutrons;
  spots.forEach((s, i) => {
    const takeProton = p > 0 && (n === 0 || i % 2 === 0 || p >= n * 2);
    if (takeProton) {
      shapes.push(circle(s.x, s.y, size, "danger"));
      p--;
    } else if (n > 0) {
      shapes.push(circle(s.x, s.y, size, "neutral"));
      n--;
    } else {
      shapes.push(circle(s.x, s.y, size, "danger"));
      p--;
    }
  });
  return shapes;
}

/** Radius a nucleus of `total` particles occupies. */
export const nucleusRadius = (total, size = 2.6) => size * 0.9 * Math.sqrt(total + 0.5) + size;

/**
 * Orbit period per shell (ms). Inner shells are quicker. All divide the 60 s figure loop
 * (SCENE_LOOP_MS), and the whole ring turns together, so electrons never bunch up.
 */
export const SHELL_PERIODS = [6000, 10000, 15000];

/** Electron rings (shell model, 2 then 8) with electrons placed on them. They orbit (idle motion). */
export function electronRings(cx, cy, electrons, base = 17, step = 11, size = 2) {
  const shapes = [];
  const caps = [2, 8, 8];
  let left = electrons;
  caps.forEach((cap, ring) => {
    if (left <= 0) return;
    const r = base + ring * step;
    shapes.push(circle(cx, cy, r, undefined, "none"));
    const count = Math.min(cap, left);
    for (let i = 0; i < count; i++) {
      const pt = onRing(cx, cy, r, -90 + (360 / count) * i + ring * 20);
      shapes.push({ ...circle(pt.x, pt.y, size, "info"), motion: { kind: "orbit", cx, cy, period: SHELL_PERIODS[ring] } });
    }
    left -= count;
  });
  return shapes;
}

/** A whole atom drawn around (cx, cy), with its nucleus size scaled to fit. */
export function atom(cx, cy, protons, neutrons, electrons, opts = {}) {
  const { base = 17, step = 11, particle = 2.4, electronSize = 2 } = opts;
  return [...electronRings(cx, cy, electrons, base, step, electronSize), ...nucleus(cx, cy, protons, neutrons, particle)];
}

export const arrow = (x1, y1, x2, y2, tone, width = 1) => line(x1, y1, x2, y2, tone, { arrow: true, width });

// ---------------------------------------------------------------------------
// Figures (each returns { scene, altText, caption? })
// ---------------------------------------------------------------------------

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

export function tableCell() {
  return {
    scene: {
      height: 62,
      shapes: [
        rect(8, 6, 38, 46, "accent", "soft", 2),
        text(14, 16, "6", 7, { anchor: "start" }),
        text(27, 36, "C", 16),
        text(27, 48, "Carbon", 5.2),
        arrow(54, 14, 20, 15, undefined, 0.7),
        text(72, 16, "atomic number", 5.2),
        arrow(54, 33, 36, 33, undefined, 0.7),
        text(72, 35, "symbol", 5.2),
        arrow(54, 48, 38, 48, undefined, 0.7),
        text(72, 50, "name", 5.2),
      ],
    },
    altText: "One box from the periodic table showing carbon: the atomic number 6 in the corner, the symbol C in the middle and the name Carbon underneath.",
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
        rect(30, 8, 40, 12, "warning", "soft", 2),
        text(50, 17, "uranium mineral", 5),
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

/** The first ten elements as a tappable grid for the hotspot card. */
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

export function firstTenGrid() {
  const shapes = [];
  const targets = [];
  FIRST_TEN.forEach(([z, sym, name], i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const x = 4 + col * 19;
    const y = 4 + row * 24;
    shapes.push(rect(x, y, 17, 21, "accent", "soft", 1.5));
    shapes.push(text(x + 2, y + 6, String(z), 5, { anchor: "start" }));
    shapes.push(text(x + 8.5, y + 15, sym, 9, { keep: true }));
    targets.push({ id: `el-${sym.toLowerCase()}`, label: name, x: x + 8.5, y: y + 10.5, r: 10 });
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
