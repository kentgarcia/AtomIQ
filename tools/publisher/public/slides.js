// The slides, hardcoded. Each one is 1080 x 1080 and is plain HTML (inline SVG for the flat art).
// Add a slide by adding an entry to SLIDES; the viewer and the PNG export pick it up.

/* ---------- flat shapes (drawn around 0,0, about 160 units across) ---------- */

const WHITE = "#fff";
const SOFT = "#ffe6a6"; // the pale yellow cut-outs on the white shapes

const SHAPES = {
  page: () =>
    `<rect x="-60" y="-80" width="120" height="160" rx="18" fill="${WHITE}"/>` +
    `<rect x="-38" y="-48" width="76" height="14" rx="7" fill="${SOFT}"/>` +
    `<rect x="-38" y="-16" width="76" height="14" rx="7" fill="${SOFT}"/>` +
    `<rect x="-38" y="16" width="46" height="14" rx="7" fill="${SOFT}"/>`,
  atom: () =>
    [0, 60, 120]
      .map((r) => `<ellipse rx="82" ry="30" transform="rotate(${r})" fill="none" stroke="${WHITE}" stroke-width="14"/>`)
      .join("") + `<circle r="19" fill="${WHITE}"/>`,
  flask: () =>
    `<path d="M-20 -72H20V-24L58 44Q70 70 44 70H-44Q-70 70 -58 44L-20 -24Z" fill="${WHITE}"/>` +
    `<path d="M-41 18H41L58 44Q70 70 44 70H-44Q-70 70 -58 44Z" fill="${SOFT}"/>` +
    `<rect x="-30" y="-86" width="60" height="16" rx="8" fill="${WHITE}"/>`,
  sparkle: () => `<path d="M0-52Q6-6 52 0Q6 6 0 52Q-6 6-52 0Q-6-6 0-52Z" fill="${WHITE}"/>`,
  gem: () =>
    `<path d="M-52-14L-26-52H26L52-14L0 58Z" fill="${WHITE}" stroke="${WHITE}" stroke-width="8" stroke-linejoin="round"/>` +
    `<path d="M-52-14H52M-26-52L-12-14L0 58M26-52L12-14L0 58" fill="none" stroke="${SOFT}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
  pill: () => `<rect x="-38" y="-15" width="76" height="30" rx="15" fill="#f59300"/>`,
};

/** Place a shape: [kind, x, y, rotation, scale, opacity]. */
function art(items) {
  const body = items
    .map(
      ([kind, x, y, rot = 0, k = 1, op = 1]) =>
        `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${k})" opacity="${op}">${SHAPES[kind]()}</g>`,
    )
    .join("");
  return `<svg class="art" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

const COVER_ART = art([
  ["page", 92, 150, -16, 0.85, 1],
  ["sparkle", 972, 128, 0, 1.0, 1],
  ["atom", 1000, 470, 20, 1.0, 0.5],
  ["flask", 100, 520, 14, 1.0, 0.5],
  ["gem", 126, 724, -12, 1.1, 1],
  ["page", 970, 680, 18, 1.1, 0.5],
  ["atom", 168, 960, -10, 1.0, 1],
  ["flask", 940, 856, -12, 0.8, 1],
  ["sparkle", 170, 360, 0, 0.55, 0.9],
  ["sparkle", 860, 470, 0, 0.7, 0.9],
  ["sparkle", 760, 150, 0, 0.45, 0.7],
  ["pill", 262, 888, -32],
  ["pill", 836, 980, 56],
  ["pill", 226, 596, 22, 0.9],
  ["pill", 858, 620, -42, 0.9],
]);


/* ---------- icons for the list slides: white glyphs on a coloured tile (24 grid) ---------- */

const CUT = "fill:var(--c)"; // a cut-out shows the tile's colour
const GLYPHS = {
  sparkle: `<path d="M12 1.5Q13.4 10.6 22.5 12Q13.4 13.4 12 22.5Q10.6 13.4 1.5 12Q10.6 10.6 12 1.5Z"/>`,
  book: `<path d="M2.5 5.5C6 4.4 9.2 4.8 12 6.8c2.8-2 6-2.4 9.5-1.3v13.8c-3.5-1.1-6.7-.7-9.5 1.3-2.8-2-6-2.4-9.5-1.3z"/><rect x="11.2" y="7" width="1.6" height="12.4" style="${CUT}"/>`,
  bubble: `<path d="M5 3.5h14a2.5 2.5 0 0 1 2.5 2.5v8.5a2.5 2.5 0 0 1-2.5 2.5h-6.2L8 21v-4H5a2.5 2.5 0 0 1-2.5-2.5V6A2.5 2.5 0 0 1 5 3.5z"/><circle cx="8" cy="10.2" r="1.3" style="${CUT}"/><circle cx="12" cy="10.2" r="1.3" style="${CUT}"/><circle cx="16" cy="10.2" r="1.3" style="${CUT}"/>`,
  phone: `<rect x="6.5" y="1.5" width="11" height="21" rx="3.2"/><rect x="8.5" y="4.5" width="7" height="12" rx="1.2" style="${CUT}"/><circle cx="12" cy="19.2" r="1.2" style="${CUT}"/>`,
  star: `<path d="M12 2l3 6.3 6.9.9-5 4.8 1.2 6.9L12 17.7 5.9 20.9 7.1 14 2.1 9.2 9 8.3z" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>`,
  gem: `<path d="M2.5 9L6 3.5h12L21.5 9 12 21z"/><path d="M2.5 9h19M6 3.5L8.5 9 12 21M18 3.5L15.5 9 12 21" fill="none" stroke="var(--c)" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>`,
  play: `<circle cx="12" cy="12" r="10"/><path d="M9.6 7.4L17 12l-7.4 4.6z" style="${CUT}"/>`,
  face: `<circle cx="12" cy="12" r="10"/><circle cx="8.6" cy="10" r="1.5" style="${CUT}"/><circle cx="15.4" cy="10" r="1.5" style="${CUT}"/><path d="M7.8 14.2Q12 18.6 16.2 14.2" fill="none" stroke="var(--c)" stroke-width="1.8" stroke-linecap="round"/>`,
  flag: `<path d="M4.5 2.5h2v19h-2z"/><path d="M7 3.5h12.5l-3 4.6 3 4.6H7z"/>`,
  podium: `<rect x="8.5" y="3" width="7" height="18" rx="1.6"/><rect x="1.5" y="9.5" width="6" height="11.5" rx="1.6"/><rect x="16.5" y="13" width="6" height="8" rx="1.6"/>`,
  grid: `<rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2.2"/><rect x="13" y="2.5" width="8.5" height="8.5" rx="2.2"/><rect x="2.5" y="13" width="8.5" height="8.5" rx="2.2"/><rect x="13" y="13" width="8.5" height="8.5" rx="2.2"/>`,
  flask: `<path d="M9 2.5h6v1.8h-1V9l6 10.2a2.2 2.2 0 0 1-1.9 3.3H5.9A2.2 2.2 0 0 1 4 19.2L10 9V4.3H9z"/><path d="M7.4 15.5h9.2" fill="none" stroke="var(--c)" stroke-width="1.8" stroke-linecap="round"/>`,
  route: `<circle cx="6" cy="18" r="3.2"/><circle cx="18" cy="6" r="3.2"/><path d="M6 14.8V12a4 4 0 0 1 4-4h4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
  bulb: `<path d="M12 2.2a6.8 6.8 0 0 1 3.6 12.6V17h-7.2v-2.2A6.8 6.8 0 0 1 12 2.2z"/><rect x="8.8" y="18.4" width="6.4" height="2.2" rx="1.1"/><rect x="10" y="21" width="4" height="1.4" rx=".7"/>`,
  heat: `<rect x="2.5" y="2.5" width="5.2" height="5.2" rx="1.4" opacity=".45"/><rect x="9.4" y="2.5" width="5.2" height="5.2" rx="1.4"/><rect x="16.3" y="2.5" width="5.2" height="5.2" rx="1.4" opacity=".7"/><rect x="2.5" y="9.4" width="5.2" height="5.2" rx="1.4"/><rect x="9.4" y="9.4" width="5.2" height="5.2" rx="1.4" opacity=".45"/><rect x="16.3" y="9.4" width="5.2" height="5.2" rx="1.4"/><rect x="2.5" y="16.3" width="5.2" height="5.2" rx="1.4" opacity=".7"/><rect x="9.4" y="16.3" width="5.2" height="5.2" rx="1.4"/><rect x="16.3" y="16.3" width="5.2" height="5.2" rx="1.4" opacity=".45"/>`,
  moon: `<path d="M20.5 14.6A9 9 0 0 1 9.4 3.5a9 9 0 1 0 11.1 11.1z"/>`,
  tabbar: `<rect x="2" y="5" width="20" height="14" rx="3.2" opacity=".5"/><rect x="2" y="14.5" width="20" height="6" rx="2.6"/><circle cx="7" cy="17.5" r="1.1" style="${CUT}"/><circle cx="12" cy="17.5" r="1.1" style="${CUT}"/><circle cx="17" cy="17.5" r="1.1" style="${CUT}"/>`,
  check: `<circle cx="12" cy="12" r="10"/><path d="M7.4 12.4l3.2 3.2 6-7" fill="none" stroke="var(--c)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  contrast: `<circle cx="12" cy="12" r="9.2" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M12 2.8a9.2 9.2 0 0 1 0 18.4z"/>`,
  speaker: `<path d="M3 9h4l5.5-4.5v15L7 15H3z"/><path d="M15.5 8.5a4.6 4.6 0 0 1 0 7M18.2 5.8a8.4 8.4 0 0 1 0 12.4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
};

// Tile colours: face and the darker lip under it.
const TONES = {
  orange: ["#f59300", "#c97800"],
  blue: ["#1cb0f6", "#1899d6"],
  purple: ["#8b6bd6", "#6a49b3"],
  green: ["#58cc02", "#46a302"],
  pink: ["#ff6fa3", "#d9507f"],
  yellow: ["#fabf24", "#d9981a"],
  teal: ["#1fc7b6", "#16a597"],
};

const icon = (glyph, tone) =>
  `<span class="ic" style="--c:${TONES[tone][0]};--l:${TONES[tone][1]}"><svg viewBox="0 0 24 24">${GLYPHS[glyph]}</svg></span>`;
const item = (glyph, tone, title, text) =>
  `<div class="item">${icon(glyph, tone)}<div><b>${title}</b><small>${text}</small></div></div>`;

/** A teaser slide's title: a coloured icon tile, then the words with the highlighted part in the same colour. */
const titled = (glyph, tone, html) =>
  `<h2 style="--t:${TONES[tone][0]}">${icon(glyph, tone)}<span>${html}</span></h2>`;

const CHANGES = {
  id: "changes",
  html:
    `<div class="slide page">` +
    `<img class="peek" src="/app-assets/images/mascot/idea.png" alt="" />` +
    `<h2>What’s <em>new</em></h2>` +
    `<div class="group">Major redesign</div>` +
    `<div class="card">` +
    item("sparkle", "orange", "A fresh new look", "Redesigned Home with a lively, unit-coloured lesson map") +
    item("book", "blue", "Lessons, rebuilt", "Short lectures from your teachers, graded as you tap") +
    item("bubble", "purple", "Discover is now a feed", "Teachers react to your progress, plus mini blog reads") +
    `</div>` +
    `<div class="group">New features</div>` +
    `<div class="card grid">` +
    item("phone", "teal", "Your phone", "Chat, scan, snap photos, explore a map") +
    item("star", "yellow", "Quests", "Daily and weekly goals, chests to open") +
    item("gem", "pink", "Shop", "Dress up your avatar with diamonds") +
    item("play", "green", "Atom Maze", "Run, jump and battle with questions") +
    item("face", "orange", "Teachers", "Meet teachers with their own profiles") +
    item("flag", "blue", "Shrodi’s tour", "Shrodi guides you step by step") +
    item("podium", "purple", "Weekly ranks", "Beat the cast on the weekly ranking") +
    item("speaker", "pink", "New sounds", "Fresh sound effects everywhere") +
    `</div>` +
    `</div>`,
};

/* ---------- slide 3: the redesign teaser (drawn UI, real characters) ---------- */

/** A lesson-map puck: round face on its lip, swirl lines, a white picture. */
function puck({ face, lip, glyph = "atom", ring = 0, locked = false }) {
  const f = locked ? "#d9d9d9" : face;
  const l = locked ? "#b5b5b5" : lip;
  const pics = {
    atom: `<g transform="translate(40 31) scale(0.2 0.17)">${SHAPES.atom()}</g>`,
    check: `<path d="M26 32l9 9 19-20" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -2)"/>`,
    lock: `<g transform="translate(40 32)"><rect x="-11" y="-3" width="22" height="17" rx="4" fill="#fff"/><path d="M-6 -3v-5a6 6 0 0 1 12 0v5" fill="none" stroke="#fff" stroke-width="4"/></g>`,
  };
  const ringSvg = ring
    ? `<circle cx="40" cy="36" r="47" fill="none" stroke="#f0e2b8" stroke-width="7"/><circle cx="40" cy="36" r="47" fill="none" stroke="#fabf24" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(295 * ring).toFixed(0)} 295" transform="rotate(-90 40 36)"/>`
    : "";
  return (
    `<svg viewBox="0 0 80 80">${ringSvg}<ellipse cx="40" cy="41" rx="36" ry="31" fill="${l}"/><ellipse cx="40" cy="31" rx="36" ry="31" fill="${f}"/>` +
    `<path d="M14 36A27 24 0 0 1 24 14" fill="none" stroke="#fff" stroke-opacity="0.28" stroke-width="3.4" stroke-linecap="round"/>` +
    pics[locked ? "lock" : glyph] +
    `</svg>`
  );
}
const node = (x, y, opts) => `<div class="node" style="left:${x}px;top:${y}px">${puck(opts)}</div>`;

const PILL_ICONS = {
  flame: `<svg viewBox="0 0 24 24" fill="#f59300"><path d="M12 2c.8 4.2 5.5 6 5.5 11.2a5.5 5.5 0 0 1-11 0c0-2.2 1-3.6 2.3-4.6.1 2 .9 3.1 2 3.4C10.3 8.4 10.6 5 12 2z"/></svg>`,
  check: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#58cc02"/><path d="M7 12.5l3.3 3.3L17 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="#fabf24"><path d="M13.5 2L4.5 14h6L9 22l10.5-13h-6.5z"/></svg>`,
  gem: `<svg viewBox="0 0 24 24" fill="#1cb0f6"><path d="M2.5 9L6 3.5h12L21.5 9 12 21z"/></svg>`,
};
const pill = (k, n) => `<div class="pill">${PILL_ICONS[k]}${n}</div>`;

// Home: the unit card reads "UNIT 1: TITLE" small, then the unit's subtitle as its headline, with the round info button.
const HOME_SCREEN =
  `<div class="ui home">` +
  `<div class="pills">${pill("flame", "12")}${pill("check", "34")}${pill("bolt", "850")}${pill("gem", "120")}</div>` +
  `<div class="unitcard"><div class="txt"><small>Unit 1: Inside the Atom</small><b>What everything is made of</b></div>` +
  `<span class="info"><svg viewBox="0 0 24 24"><path d="M3 5.5C6 4.5 9 4.8 12 6.8c3-2 6-2.3 9-1.3v13c-3-1-6-.7-9 1.3-3-2-6-2.3-9-1.3z"/><rect x="11.2" y="7.5" width="1.6" height="11.5" fill="#fff"/></svg></span></div>` +
  node(150, 244, { face: "#fabf24", lip: "#d9981a", glyph: "check" }) +
  node(214, 322, { face: "#fabf24", lip: "#d9981a", glyph: "atom", ring: 0.4 }) +
  `<div class="bubble" style="top:416px"><b>Meet the atom</b><span>START</span></div>` +
  node(150, 540, { face: "#fabf24", lip: "#d9981a", locked: true }) +
  node(214, 622, { face: "#fabf24", lip: "#d9981a", locked: true }) +
  `</div>`;

const QUIT_X = `<svg class="x" viewBox="0 0 24 24"><path d="M5.5 5.5l13 13M18.5 5.5l-13 13" stroke="#777" stroke-width="2.6" stroke-linecap="round"/></svg>`;
const BACK = `<span class="back"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="#777" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

// A real card of Unit 1, lesson 1 ("Atoms are everywhere"): its title, its first two bubbles and its figure.
const LESSON_SCREEN =
  `<div class="ui lesson">` +
  `<div class="top">${QUIT_X}<div class="track"><i></i></div></div>` +
  `<h3 class="ttl">What is everything made of?</h3>` +
  `<div class="row" style="top:162px"><img class="bust" src="art/npc-hal-bust.svg" alt="" /><div class="bub">Your hand, your phone and an apple are all <u>matter</u>.</div></div>` +
  `<div class="row later" style="top:282px"><div class="bub">All matter is made of <u>atoms</u>.</div></div>` +
  `<div class="fig" style="top:386px">` +
  `<div class="col"><h4>Made of atoms</h4><div class="objs"><img src="art/obj-air.svg" alt=""/><img src="art/obj-water.svg" alt=""/><img src="art/obj-hand.svg" alt=""/></div><small>air, water, you</small></div>` +
  `<div class="col"><h4>Not matter</h4><div class="objs"><img src="art/obj-sun.svg" alt=""/><img src="art/obj-flame.svg" alt=""/></div><small>light, heat</small></div>` +
  `</div>` +
  `<div class="foot">${BACK}<div class="go">Continue</div></div>` +
  `</div>`;

const HEART = `<svg class="heart" viewBox="0 0 24 24"><path d="M12 21s-8.5-5.2-8.5-11.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8.5 2.8C20.5 15.8 12 21 12 21z"/></svg>`;

const TEASER = {
  id: "redesign",
  html:
    `<div class="slide teaser">` +
    titled("sparkle", "orange", "Meet the <em>new look</em>") +
    `<p class="desc">Lessons felt like walls of text. Now every lesson is short, visual and told by a teacher, and Home shows exactly where you are.</p>` +
    `<div class="phone" style="left:40px;top:340px;transform:rotate(-4deg) scale(0.94)"><div class="screen"><div class="island"></div>${HOME_SCREEN}</div></div>` +
    `<div class="phone" style="left:600px;top:352px;transform:rotate(4deg) scale(0.94)"><div class="screen"><div class="island"></div>${LESSON_SCREEN}</div></div>` +
    `<div class="post"><div class="who"><img src="art/npc-hal-head.svg" alt="" /></div><div class="body"><b>Hal<small>just now</small></b><p>Lesson 1 done. Great work!</p></div>${HEART}</div>` +
    `</div>`,
};

/* ---------- slide 4: the phone ---------- */

const PHONE_ICON = (id) => `<img class="appic" src="art/app-${id}.svg" alt="" />`;
const PHONE_ROWS = [
  ["chats", "Chats", "Story chats from your teachers and Shrodi"],
  ["scanner", "Atom Scanner", "Scan everyday things, see what is inside"],
  ["camera", "Camera", "Snap photos with Shrodi and your teachers"],
  ["field-notes", "Field Notes", "A private notebook for the facts you love"],
  ["library", "Reference Library", "Every source behind your lessons"],
  ["map", "Nuclear Map", "Explore nuclear sites around the world"],
  ["safety", "Safety Guide", "Calm, sourced cards on radiation safety"],
];
const PHONE_GRID = [
  ["chats", "Chats"], ["contacts", "Contacts"], ["atomdex", "AtomDex"], ["daily-fact", "Daily Fact"],
  ["settings", "Settings"], ["shop", "Shop"], ["field-notes", "Field Notes"], ["scanner", "Scanner"],
  ["library", "Library"], ["camera", "Camera"], ["safety", "Safety", true], ["map", "Map", true],
];
const LOCK_TILE =
  `<svg viewBox="0 0 100 105"><rect y="5" width="100" height="100" rx="27" fill="#b5b5b5"/><rect width="100" height="100" rx="27" fill="#d9d9d9"/>` +
  `<g transform="translate(50 52)"><rect x="-17" y="-5" width="34" height="26" rx="6" fill="#fff"/><path d="M-10 -5v-8a10 10 0 0 1 20 0v8" fill="none" stroke="#fff" stroke-width="6"/></g></svg>`;

const PHONE_SCREEN =
  `<div class="ui homescreen">` +
  `<div class="wall"><i style="left:-40px;top:300px;width:200px;height:200px"></i><i style="right:-50px;top:90px;width:150px;height:150px"></i><i style="left:130px;top:560px;width:240px;height:240px"></i></div>` +
  `<div class="grid4">` +
  PHONE_GRID.map(([id, name, locked]) => `<div class="app">${locked ? LOCK_TILE : PHONE_ICON(id)}<span>${name}</span></div>`).join("") +
  `</div></div>`;

const PHONE_SLIDE = {
  id: "phone",
  html:
    `<div class="slide teaser page">` +
    titled("phone", "teal", "A phone <em>of your own</em>") +
    `<p class="desc">A phone lives inside AtomIQ. Chat with your teachers, scan everyday things and explore the world of nuclear science. New apps arrive as you learn.</p>` +
    `<div class="card applist">` +
    PHONE_ROWS.map(([id, t, d]) => `<div class="item">${PHONE_ICON(id)}<div><b>${t}</b><small>${d}</small></div></div>`).join("") +
    `</div>` +
    `<div class="phone" style="left:604px;top:344px;transform:scale(0.94)"><div class="screen"><div class="island"></div>${PHONE_SCREEN}</div></div>` +
    `</div>`,
};

/* ---------- slide 5: rewards and style (quests, chests, badges, the Shop) ---------- */

const DIAMOND_IMG = `<img class="dia" src="/app-assets/images/icons/diamond.png" alt="" />`;

const questRow = (title, done, button) =>
  `<div class="quest"><div class="qmain"><b>${title}</b><div class="qbar"><i style="width:${done ? 100 : 0}%"></i><span class="${done ? "full" : ""}">${done ? "1/1" : "0/1"}</span></div></div>${button}</div>`;
const CLAIM = `<span class="qbtn claim">Claim</span>`;
const GO = `<span class="qbtn go">Read</span>`;

const BADGES = [
  ["streak", 5],
  ["xp", 5],
  ["level-reached", 5],
  ["quests-claimed", 3],
];

const tile = (id, state, extra = "") => {
  const foot = {
    equipped: `<span class="tfoot ok">Equipped</span>`,
    owned: `<span class="tfoot">Owned</span>`,
    price: `<span class="tfoot">${DIAMOND_IMG}40</span>`,
    lock: `<span class="tfoot lock"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2.5" fill="#9a9a9a"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#9a9a9a" stroke-width="2.6"/></svg>Level 3</span>`,
  }[state];
  const badge = state === "equipped" ? `<span class="tick"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>` : "";
  return `<div class="tile ${state === "equipped" ? "on" : ""} ${extra}"><img src="art/hair-${id}.svg" alt="" />${badge}${foot}</div>`;
};

const SHOP_PARTS =
  `<div class="shop shopcol">` +
  `<div class="card shopcard"><div class="shead"><b>Shop</b><span class="bal">${DIAMOND_IMG}120</span></div>` +
  `<div class="sprev"><img src="art/shop-preview.svg" alt="" /><span class="buy">Buy ${DIAMOND_IMG}40</span></div></div>` +
  `<div class="card shopcard"><div class="stabs"><span class="on">Hair</span><span>Face</span><span>Accessories</span><span>Skin</span></div>` +
  `<div class="stiles">` +
  tile("crop", "equipped") + tile("spiky", "owned") + tile("bigbun", "price", "try") +
  tile("longwavy", "price") + tile("twintails", "lock") + tile("highpony", "price") +
  `</div></div></div>`;

const REWARDS_SLIDE = {
  id: "rewards",
  html:
    `<div class="slide teaser page">` +
    titled("gem", "pink", "Earn it. <em>Wear it.</em>") +
    `<p class="desc">Finish quests, open chests and collect badges. Then spend your diamonds in the Shop on hair, outfits and more for your avatar.</p>` +
    `<div class="card questcard">` +
    `<div class="chestrow"><img class="chest" src="art/chest-open.png" alt="" /><div><b>Daily chest</b><small>Claim all daily quests to open</small></div><span class="reward">+5${DIAMOND_IMG}</span></div>` +
    questRow("Log in today", true, CLAIM) +
    questRow("Complete a lesson", true, CLAIM) +
    questRow("Read the daily fact", false, GO) +
    `</div>` +
    `<div class="card badgecard"><div class="badges">${BADGES.map(([k, n]) => `<img src="/app-assets/images/badge/${k}/${n}.png" alt="" />`).join("")}</div><div class="btxt"><b>Badges</b><small>Rank them up as you play</small></div></div>` +
    SHOP_PARTS +
    `</div>`,
};

/* ---------- slide 6: the feed, the ranking and blog pieces ---------- */

const circleHead = (file, size, ring) =>
  `<span class="ch" style="width:${size}px;height:${size}px${ring ? `;box-shadow:0 0 0 3px ${ring}` : ""}"><img src="art/${file}" alt="" /></span>`;
const HEART_OUT = `<svg viewBox="0 0 24 24"><path d="M12 20.5s-8-4.9-8-10.7A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8 3.2c0 5.8-8 10.7-8 10.7z" fill="none" stroke="#e0457b" stroke-width="2.4" stroke-linejoin="round"/></svg>`;

const post = ({ head, who, action, meta, text, fig, count, likedBy }) =>
  `<div class="fpost">` +
  `<div class="fhead">${circleHead(head, 44)}<div><div class="l1"><b>${who}</b> ${action}</div><div class="l2">${meta}</div></div></div>` +
  `<div class="ftalk"><div class="fbub"><p>${text}</p><i class="ftail"></i></div><img class="ffig" src="art/${fig}" alt="" /></div>` +
  `<div class="freact"><span class="fpill">${HEART_OUT}${count}</span><span class="fliked">${circleHead("npc-ada-head.svg", 24)}${circleHead("npc-mina-head.svg", 24)}<small>Liked by <b>${likedBy}</b></small></span></div>` +
  `</div>`;

const FEED_SCREEN =
  `<div class="ui feed">` +
  `<h3 class="ftitle">Feed</h3>` +
  post({ head: "npc-hal-head.svg", who: "Hal", action: "shared a milestone", meta: "2m · Atom teacher", text: "The Inside the Atom checkpoint is passed. Take a moment. You earned it.", fig: "npc-hal-hero-proud.svg", count: 6, likedBy: "Ada and 5 others" }) +
  post({ head: "npc-tess-head.svg", who: "Tess", action: "cheered you on", meta: "1h · Nuclear technology teacher", text: "A daily chest, opened. Small reward, steady habit.", fig: "npc-tess-hero-cheer.svg", count: 4, likedBy: "Mina and 3 others" }) +
  `</div>`;

const podium = (rank, file, name, xp, you) =>
  `<div class="pod p${rank}"><div class="pw">${circleHead(file, rank === 1 ? 70 : 58, you ? "#fabf24" : "")}${you ? `<span class="up">▲ 1</span>` : ""}</div><b>${name}</b><small>${xp} XP</small><div class="blk"><span>${rank}</span></div></div>`;
const rankRow = (n, file, name, xp) => `<div class="rrow"><span class="rn">${n}</span>${circleHead(file, 42)}<b>${name}</b><small>${xp} XP</small></div>`;

const FEED_SLIDE = {
  id: "feed",
  html:
    `<div class="slide teaser page">` +
    titled("podium", "purple", "Join the <em>cast</em>") +
    `<p class="desc">Teachers post about your progress and you cheer back with reactions. Every week you race the cast in the ranking, and blog pieces give you more to read.</p>` +
    `<div class="phone" style="left:36px;top:344px;transform:rotate(-4deg) scale(0.94)"><div class="screen"><div class="island"></div>${FEED_SCREEN}</div></div>` +
    `<div class="card rankcard"><div class="rhead"><b>Weekly ranking</b><span class="rchip">You moved up!</span></div>` +
    `<div class="podium">${podium(2, "avatar-default.svg", "You", 560, true)}${podium(1, "npc-mina-head.svg", "Mina", 640)}${podium(3, "npc-kofi-head.svg", "Kofi", 510)}</div>` +
    `${rankRow(4, "npc-tess-head.svg", "Tess", 420)}${rankRow(5, "npc-hal-head.svg", "Hal", 380)}</div>` +
    `<div class="card blogcard"><div class="bpic"><img src="art/obj-banana.svg" alt="" /></div><div class="btext"><span class="bmeta">${circleHead("npc-ada-head.svg", 26)}Ada wrote a blog piece · 1 min</span><b>The banana on your counter</b><small>A banana is a little bit radioactive.</small></div></div>` +
    `</div>`,
};

/* ---------- slide 7: play (Atom Maze and Myth Buster) ---------- */

const PF = "/app-assets/images/platformer";
const px = (src, cls, style) => `<img class="${cls}" style="${style}" src="${PF}/${src}.png" alt="" />`;
const STAR_BURST = (() => {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8, r = i % 2 ? 26 : 52;
    pts.push(`${(60 + r * Math.cos(a)).toFixed(1)},${(60 + r * Math.sin(a)).toFixed(1)}`);
  }
  return `<svg class="burst" viewBox="0 0 120 120"><polygon points="${pts.join(" ")}" fill="#fff3a0" stroke="#fff" stroke-width="5" stroke-linejoin="round"/></svg>`;
})();

const groundRow = (src, y) => [0, 1, 2, 3, 4].map((i) => px(src, "tl", `left:${-20 + i * 80}px;top:${y}px`)).join("");

const MAZE_SCREEN =
  `<div class="ui maze">` +
  `<div class="sky"></div>` +
  px("backgrounds/background_clouds", "bgl", "left:-20px;top:-30px;width:400px;height:400px") +
  px("backgrounds/background_color_hills", "bgl", "left:-20px;top:-110px;width:400px;height:400px") +
  groundRow("tiles/terrain_grass_block_top", 290) + groundRow("tiles/terrain_grass_block_center", 370) + groundRow("tiles/terrain_grass_block_center", 450) +
  `<div class="mhud"><div class="mbar"><i style="width:46%"></i><img src="${PF}/props/flag_yellow_a.png" alt="" /></div><span class="pause"><b></b><b></b></span></div>` +
  `<div class="mhearts">${[0, 1, 2].map(() => `<img src="${PF}/hud/hud_heart.png" alt="" />`).join("")}</div>` +
  `<div class="mcoins"><img src="${PF}/hud/hud_coin.png" alt="" /><img class="x" src="${PF}/hud/hud_character_multiply.png" alt="" /><img src="${PF}/hud/hud_character_1.png" alt="" /><img src="${PF}/hud/hud_character_2.png" alt="" /></div>` +
  `<img class="hero" src="art/shrodi-cheer.png" alt="" />` +
  STAR_BURST +
  px("enemies/slime_normal_walk_b", "foe", "") +
  `<div class="bpanel">` +
  `<div class="bhead"><span>Slime</span><span class="pips"><i></i><i></i><i class="off"></i></span></div>` +
  `<div class="bq">What happens to an atom when it loses an electron?</div>` +
  `<div class="bopt">Becomes neutral</div><div class="bopt good">Becomes positively charged<svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9" fill="none" stroke="#58a700" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>` +
  `<div class="bverdict"><b>Direct hit!</b><small>Losing an electron leaves more protons than electrons.</small></div>` +
  `</div></div>`;

const MODE_GLYPH = {
  quick: `<svg viewBox="0 0 24 24"><path d="M13.5 2L5 13.5h6L10 22l9-12h-6z" fill="#fff" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  challenge: `<svg viewBox="0 0 24 24"><path d="M12 20.5s-8-4.9-8-10.7A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8 3.2c0 5.8-8 10.7-8 10.7z" fill="#fff"/></svg>`,
  endless: `<svg viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="7.5" fill="none" stroke="#fff" stroke-width="2.8"/><path d="M12 9.5v4.5l3 1.8M9.5 3h5" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};
const mode = (id, color, lip, title, text) =>
  `<div class="mode"><span class="mic" style="background:${color};box-shadow:0 4px 0 ${lip}">${MODE_GLYPH[id]}</span><div><b>${title}</b><small>${text}</small></div></div>`;

const PLAY_SLIDE = {
  id: "play",
  html:
    `<div class="slide teaser page">` +
    titled("play", "green", "Learn by <em>playing</em>") +
    `<p class="desc">Run, jump and battle through Atom Maze, answering real questions to win each fight. Then bust myths in three Myth Buster modes.</p>` +
    `<div class="card mythcard"><div class="mtop"><div class="mtrack"><i style="width:40%"></i></div><span class="lives">${[0, 1, 2].map(() => `<img src="${PF}/hud/hud_heart.png" alt="" />`).join("")}</span></div>` +
    `<div class="mstate">Myth or fact?</div><div class="mstmt">You become radioactive after an X-ray.</div>` +
    `<div class="mbtns"><span>Myth</span><span>Fact</span></div></div>` +
    `<div class="card modecard">` +
    mode("quick", "#ff9500", "#cc7800", "Quick Play", "Pick a unit and play its 10 statements") +
    mode("challenge", "#ff3b5c", "#cc2f4a", "Challenge", "Every statement, 3 lives, no timer") +
    mode("endless", "#8b5cf6", "#6f4ac4", "Endless", "Beat the clock: right adds time") +
    `</div>` +
    `<div class="phone" style="left:604px;top:344px;transform:rotate(4deg) scale(0.94)"><div class="screen"><div class="island"></div>${MAZE_SCREEN}</div></div>` +
    `</div>`,
};

/* ---------- slide 8: more to explore, and fixes ---------- */

const MORE_SLIDE = {
  id: "more",
  html:
    `<div class="slide page">` +
    `<img class="peek" src="/app-assets/images/mascot/fix.png" alt="" />` +
    `<h2>And <em>more</em></h2>` +
    `<div class="group">More to explore</div>` +
    `<div class="card grid">` +
    item("grid", "orange", "Periodic table", "All 118 elements") +
    item("flask", "blue", "Lab", "Try hands-on experiments") +
    item("route", "green", "Journeys", "Follow a topic step by step") +
    item("bulb", "yellow", "Daily facts", "A new fact every day") +
    item("heat", "teal", "Activity map", "See every day you learned") +
    item("moon", "purple", "Dark mode", "Easy on the eyes at night") +
    `</div>` +
    `<div class="group">Fixes</div>` +
    `<div class="card">` +
    item("tabbar", "pink", "Tab bar", "No longer covers content at the bottom") +
    item("check", "green", "Clearer questions", "Every answer now explains why") +
    item("speaker", "blue", "Sound and Read Aloud", "One consistent setting everywhere") +
    item("contrast", "orange", "Easier to read", "Higher-contrast answer buttons") +
    `</div>` +
    `</div>`,
};

/* ---------- slide 9: closing ---------- */

const CLOSING_SLIDE = {
  id: "closing",
  html:
    `<div class="slide cover closing">` +
    COVER_ART +
    `<div class="halo"></div>` +
    `<div class="label">Thank you</div>` +
    `<h2>You made<br/>AtomIQ better</h2>` +
    `<p class="ask">Every idea, bug report and kind word<br/>shaped this update. We’re so grateful<br/>you’re learning with us.</p>` +
    `<img class="mascot" src="/app-assets/images/mascot/happy.png" alt="" />` +
    `</div>`,
};

export const SLIDES = [
  {
    id: "cover",
    html:
      `<div class="slide cover">` +
      COVER_ART +
      `<div class="halo"></div>` +
      `<div class="label">Next beta</div>` +
      `<h2>Big update<br/>is coming!</h2>` +
      `<img class="mascot" src="/app-assets/images/mascot/happy_2.png" alt="" />` +
      `<div class="next"><svg viewBox="0 0 24 24"><path fill="#f59300" d="M4 9.5h9V5.2c0-.8.9-1.2 1.5-.7l6.6 6.8c.4.4.4 1 0 1.4l-6.6 6.8c-.6.5-1.5.1-1.5-.7V14.5H4a1.5 1.5 0 0 1-1.5-1.5v-2A1.5 1.5 0 0 1 4 9.5Z"/></svg></div>` +
      `</div>`,
  },
  CHANGES,
  TEASER,
  PHONE_SLIDE,
  REWARDS_SLIDE,
  FEED_SLIDE,
  PLAY_SLIDE,
  MORE_SLIDE,
  CLOSING_SLIDE,
];
