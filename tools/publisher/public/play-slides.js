// Google Play Store visual assets in a bold, joyful Duolingo-inspired style for AtomIQ.
// Dimensions match Google Play Console requirements exactly (exported at 1x exact pixels):
//   - Feature graphic:   1024 x 500  (PNG, <= 15 MB)
//   - Phone screenshots: 1080 x 1920 (9:16, >= 4 slides >= 1080px/side for promotion, PNG <= 8 MB)
//   - App icon:          512  x 512  (PNG, <= 1 MB, full-bleed square)
//   - 7-inch tablet:     1080 x 1920 (9:16, 320-3840px, PNG <= 8 MB)
//   - 10-inch tablet:    1440 x 2560 (9:16, 1080-7680px, PNG <= 8 MB)

/* ---------- shared vector motifs & icons ---------- */

const MOTIFS = {
  atom: () =>
    [0, 60, 120]
      .map((r) => `<ellipse rx="82" ry="30" transform="rotate(${r})" fill="none" stroke="currentColor" stroke-width="14"/>`)
      .join("") + `<circle r="19" fill="currentColor"/>`,
  flask: () =>
    `<path d="M-20 -72H20V-24L58 44Q70 70 44 70H-44Q-70 70 -58 44L-20 -24Z" fill="currentColor"/>` +
    `<rect x="-30" y="-86" width="60" height="16" rx="8" fill="currentColor"/>`,
  sparkle: () => `<path d="M0-54Q7-7 54 0Q7 7 0 54Q-7 7-54 0Q-7-7 0-54Z" fill="currentColor"/>`,
  bolt: () => `<path d="M12 -74L-46 8H-4L-18 74L48 -14H4Z" fill="currentColor" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/>`,
  gem: () => `<path d="M-54-14L-28-54H28L54-14L0 60Z" fill="currentColor"/>`,
  shield: () => `<path d="M0-72L58-48V6C58 46 28 66 0 78C-28 66 -58 46 -58 6V-48Z" fill="currentColor"/>`,
  star: () => `<path d="M0-62L18-20L64-15L29 15L39 60L0 36L-39 60L-29 15L-64-15L-18-20Z" fill="currentColor" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/>`,
  phone: () => `<rect x="-38" y="-66" width="76" height="132" rx="18" fill="none" stroke="currentColor" stroke-width="14"/><circle cx="0" cy="44" r="7" fill="currentColor"/>`,
};

function bgArt(w, h, items) {
  const body = items
    .map(
      ([kind, x, y, rot = 0, scale = 1, op = 0.14]) =>
        `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})" opacity="${op}">${MOTIFS[kind]()}</g>`,
    )
    .join("");
  return `<svg class="gp-bg-art" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

const DIAMOND = `<img class="gp-dia" src="/app-assets/images/icons/diamond.png" alt="" />`;
const PF = "/app-assets/images/platformer";
const px = (src, cls, style = "") => `<img class="${cls}" style="${style}" src="${PF}/${src}.png" alt="" />`;

const PILL_ICONS = {
  flame: `<svg viewBox="0 0 24 24" fill="#f59300"><path d="M12 2c.8 4.2 5.5 6 5.5 11.2a5.5 5.5 0 0 1-11 0c0-2.2 1-3.6 2.3-4.6.1 2 .9 3.1 2 3.4C10.3 8.4 10.6 5 12 2z"/></svg>`,
  check: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#58cc02"/><path d="M7 12.5l3.3 3.3L17 9" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="#fabf24"><path d="M13.5 2L4.5 14h6L9 22l10.5-13h-6.5z"/></svg>`,
  gem: `<svg viewBox="0 0 24 24" fill="#1cb0f6"><path d="M2.5 9L6 3.5h12L21.5 9 12 21z"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="#ff4b4b"><path d="M12 21s-8.5-5.2-8.5-11.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8.5 2.8C20.5 15.8 12 21 12 21z"/></svg>`,
  close: `<svg viewBox="0 0 24 24"><path d="M5.5 5.5l13 13M18.5 5.5l-13 13" stroke="#afafaf" stroke-width="3" stroke-linecap="round"/></svg>`,
};

function puck({ face, lip, glyph = "atom", ring = 0, locked = false }) {
  const f = locked ? "#e2e2e2" : face;
  const l = locked ? "#c0c0c0" : lip;
  const pics = {
    atom: `<g transform="translate(40 31) scale(0.2 0.17)" color="#fff">${MOTIFS.atom()}</g>`,
    check: `<path d="M25 32l10 10 20-21" fill="none" stroke="#fff" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -2)"/>`,
    star: `<path d="M40 16l6 12 13 2-9.5 9 2.2 13L40 46l-11.7 6 2.2-13L21 30l13-2z" fill="#fff"/>`,
    lock: `<g transform="translate(40 32)"><rect x="-11" y="-3" width="22" height="17" rx="4" fill="#fff"/><path d="M-6 -3v-5a6 6 0 0 1 12 0v5" fill="none" stroke="#fff" stroke-width="4"/></g>`,
  };
  const ringSvg = ring
    ? `<circle cx="40" cy="36" r="47" fill="none" stroke="#f0e2b8" stroke-width="7.5"/><circle cx="40" cy="36" r="47" fill="none" stroke="#fabf24" stroke-width="7.5" stroke-linecap="round" stroke-dasharray="${(295 * ring).toFixed(0)} 295" transform="rotate(-90 40 36)"/>`
    : "";
  return (
    `<svg viewBox="0 0 80 80">${ringSvg}<ellipse cx="40" cy="42" rx="36" ry="31" fill="${l}"/><ellipse cx="40" cy="31" rx="36" ry="31" fill="${f}"/>` +
    `<path d="M14 36A27 24 0 0 1 24 14" fill="none" stroke="#fff" stroke-opacity="0.32" stroke-width="3.6" stroke-linecap="round"/>` +
    pics[locked ? "lock" : glyph] +
    `</svg>`
  );
}

const STAR_BURST = (() => {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    const r = i % 2 ? 26 : 54;
    pts.push(`${(60 + r * Math.cos(a)).toFixed(1)},${(60 + r * Math.sin(a)).toFixed(1)}`);
  }
  return `<svg class="gp-burst" viewBox="0 0 120 120"><polygon points="${pts.join(" ")}" fill="#fff3a0" stroke="#fff" stroke-width="5" stroke-linejoin="round"/></svg>`;
})();

/* ========================================================================== */
/* 1. FEATURE GRAPHIC (1024 x 500 px, PNG <= 15 MB)                           */
/* ========================================================================== */

const FEATURE_BG_GOLD = bgArt(1024, 500, [
  ["atom", 96, 86, -18, 0.85, 0.14],
  ["sparkle", 470, 74, 0, 0.55, 0.2],
  ["flask", 936, 90, 16, 0.72, 0.14],
  ["bolt", 548, 412, -16, 0.65, 0.12],
  ["atom", 928, 434, 24, 0.9, 0.14],
  ["sparkle", 612, 118, 0, 0.42, 0.22],
  ["gem", 82, 430, -14, 0.62, 0.14],
]);

const FEATURE_HERO_GOLD = {
  id: "feature-gold",
  label: "Gold Hero",
  width: 1024,
  height: 500,
  html:
    `<div class="slide gp-feature gp-f-gold">` +
    FEATURE_BG_GOLD +
    `<div class="gp-f-halo"></div>` +
    `<div class="gp-f-left">` +
    `<div class="gp-f-brand">` +
    `<img class="gp-f-icon" src="/app-assets/images/icon.png" alt="" />` +
    `<span>AtomIQ</span>` +
    `</div>` +
    `<h2>Make the atom<br/>make sense.</h2>` +
    `<p class="gp-f-sub">5-minute lessons, games &amp; lab — 100% offline</p>` +
    `</div>` +
    `<div class="gp-f-right">` +
    `<div class="gp-f-float gp-f-xp">` +
    `<span class="gp-f-check">${PILL_ICONS.check}</span>` +
    `<div><b>Lesson complete!</b><small>Inside the Atom · +25 XP</small></div>` +
    `</div>` +
    `<img class="gp-f-mascot" src="/app-assets/images/mascot/happy_2.png" alt="" />` +
    `</div>` +
    `</div>`,
};

const FEATURE_DUO_SPLIT = {
  id: "feature-showcase",
  label: "App Showcase",
  width: 1024,
  height: 500,
  html:
    `<div class="slide gp-feature gp-f-split">` +
    bgArt(1024, 500, [
      ["atom", 84, 420, -14, 0.95, 0.15],
      ["sparkle", 448, 86, 0, 0.58, 0.22],
      ["flask", 960, 74, 18, 0.72, 0.14],
      ["sparkle", 520, 420, 0, 0.45, 0.18],
    ]) +
    `<div class="gp-f-left gp-f-left-narrow">` +
    `<div class="gp-f-brand">` +
    `<img class="gp-f-icon" src="/app-assets/images/icon.png" alt="" />` +
    `<span>AtomIQ</span>` +
    `</div>` +
    `<h2>Nuclear science,<br/>made playful.</h2>` +
    `<p class="gp-f-sub">Lessons, quizzes &amp; Atom Maze — offline</p>` +
    `</div>` +
    `<div class="gp-f-cardwrap">` +
    `<div class="gp-f-miniui">` +
    `<div class="gp-f-miniunit"><small>UNIT 1 · INSIDE THE ATOM</small><b>Meet the atom</b></div>` +
    `<div class="gp-f-minipath">` +
    `<div class="gp-f-puck">${puck({ face: "#58cc02", lip: "#46a302", glyph: "check" })}</div>` +
    `<div class="gp-f-puck gp-f-puck-main">${puck({ face: "#fabf24", lip: "#d9981a", glyph: "atom", ring: 0.62 })}</div>` +
    `<div class="gp-f-puck">${puck({ face: "#1cb0f6", lip: "#1899d6", glyph: "star" })}</div>` +
    `</div>` +
    `<div class="gp-f-minibtn">START LESSON</div>` +
    `</div>` +
    `<img class="gp-f-peek" src="/app-assets/images/mascot/happy.png" alt="" />` +
    `</div>` +
    `</div>`,
};

/* ========================================================================== */
/* 2. PHONE SCREENSHOT INNER APP SCREENS (Duolingo-style huge frameless card) */
/* ========================================================================== */

const SCREEN_LESSON_MAP =
  `<div class="gp-ui gp-ui-map">` +
  `<div class="gp-unit-banner">` +
  `<div class="gp-unit-txt"><small>UNIT 1 · INSIDE THE ATOM</small><b>What everything is made of</b></div>` +
  `<span class="gp-unit-info"><svg viewBox="0 0 24 24"><path d="M3 5.5C6 4.5 9 4.8 12 6.8c3-2 6-2.3 9-1.3v13c-3-1-6-.7-9 1.3-3-2-6-2.3-9-1.3z"/><rect x="11.2" y="7.5" width="1.6" height="11.5" fill="#fff"/></svg></span>` +
  `</div>` +
  `<div class="gp-path-stage">` +
  `<div class="gp-pnode" style="left:38%;top:22px">${puck({ face: "#fabf24", lip: "#d9981a", glyph: "check" })}</div>` +
  `<div class="gp-pnode gp-pnode-active" style="left:58%;top:186px">${puck({ face: "#fabf24", lip: "#d9981a", glyph: "atom", ring: 0.48 })}</div>` +
  `<div class="gp-start-bub">` +
  `<b>Meet the atom</b>` +
  `<small>Lesson 2 of 5 · 3 min</small>` +
  `<span class="gp-start-cta">START</span>` +
  `</div>` +
  `<div class="gp-pnode" style="left:36%;top:640px">${puck({ face: "#fabf24", lip: "#d9981a", glyph: "star" })}</div>` +
  `<div class="gp-pnode" style="left:56%;top:804px">${puck({ face: "#fabf24", lip: "#d9981a", locked: true })}</div>` +
  `<div class="gp-unit-div"><span>UNIT 2 · RADIOACTIVITY</span></div>` +
  `<div class="gp-pnode" style="left:44%;top:1022px">${puck({ face: "#9069cd", lip: "#6f4ea1", locked: true })}</div>` +
  `</div>` +
  `</div>`;

const SCREEN_SHORT_LESSON =
  `<div class="gp-ui gp-ui-lesson">` +
  `<div class="gp-les-top">` +
  `<span class="gp-les-x">${PILL_ICONS.close}</span>` +
  `<div class="gp-les-barwrap">` +
  `<span class="gp-les-streak">5 IN A ROW</span>` +
  `<div class="gp-les-track"><i></i></div>` +
  `</div>` +
  `<div class="gp-les-hearts">${PILL_ICONS.heart}<span>5</span></div>` +
  `</div>` +
  `<h3 class="gp-les-ttl">What is everything made of?</h3>` +
  `<div class="gp-les-row">` +
  `<img class="gp-les-bust" src="art/npc-hal-bust.svg" alt="" />` +
  `<div class="gp-les-bub">Your hand, your phone, and an apple are all <u>matter</u> — made of <u>atoms</u>!</div>` +
  `</div>` +
  `<div class="gp-les-fig">` +
  `<div class="gp-les-col">` +
  `<h4>MADE OF ATOMS</h4>` +
  `<div class="gp-les-objs"><img src="art/obj-air.svg" alt="" /><img src="art/obj-water.svg" alt="" /><img src="art/obj-hand.svg" alt="" /></div>` +
  `<small>air, water, you</small>` +
  `</div>` +
  `<div class="gp-les-col">` +
  `<h4>NOT MATTER</h4>` +
  `<div class="gp-les-objs"><img src="art/obj-sun.svg" alt="" /><img src="art/obj-flame.svg" alt="" /></div>` +
  `<small>light, heat</small>` +
  `</div>` +
  `</div>` +
  `<div class="gp-les-q">Which of these is made of atoms?</div>` +
  `<div class="gp-les-opts">` +
  `<div class="gp-les-opt gp-opt-good"><span>A glass of water</span><b>✓</b></div>` +
  `<div class="gp-les-opt"><span>A beam of sunlight</span></div>` +
  `<div class="gp-les-opt"><span>The warmth of a fire</span></div>` +
  `</div>` +
  `<div class="gp-good-foot">` +
  `<div class="gp-good-head"><b>Excellent!</b><small>Water is matter, so it is built from atoms.</small></div>` +
  `<div class="gp-good-btn">CONTINUE</div>` +
  `</div>` +
  `</div>`;

const groundRow = (src, y) =>
  [0, 1, 2, 3, 4, 5, 6].map((i) => px(src, "gp-mz-tl", `left:${-16 + i * 136}px;top:${y}px`)).join("");

const SCREEN_ATOM_MAZE =
  `<div class="gp-ui gp-ui-maze">` +
  `<div class="gp-mz-world">` +
  `<div class="gp-mz-sky"></div>` +
  px("backgrounds/background_clouds", "gp-mz-bg", "left:0;top:-30px;width:480px;height:480px") +
  px("backgrounds/background_clouds", "gp-mz-bg", "left:440px;top:-30px;width:480px;height:480px") +
  px("backgrounds/background_color_hills", "gp-mz-bg", "left:0;top:40px;width:480px;height:480px") +
  px("backgrounds/background_color_hills", "gp-mz-bg", "left:440px;top:40px;width:480px;height:480px") +
  groundRow("tiles/terrain_grass_block_top", 470) +
  groundRow("tiles/terrain_grass_block_center", 600) +
  `<div class="gp-mz-hud">` +
  `<div class="gp-mz-bar"><i style="width:52%"></i><img src="${PF}/props/flag_yellow_a.png" alt="" /></div>` +
  `<span class="gp-mz-pause"><b></b><b></b></span>` +
  `</div>` +
  `<div class="gp-mz-hearts">${[0, 1, 2].map(() => `<img src="${PF}/hud/hud_heart.png" alt="" />`).join("")}</div>` +
  `<div class="gp-mz-coins"><img src="${PF}/hud/hud_coin.png" alt="" /><img class="x" src="${PF}/hud/hud_character_multiply.png" alt="" /><img src="${PF}/hud/hud_character_1.png" alt="" /><img src="${PF}/hud/hud_character_2.png" alt="" /></div>` +
  `<img class="gp-mz-hero" src="art/shrodi-cheer.png" alt="" />` +
  STAR_BURST +
  px("enemies/slime_normal_walk_b", "gp-mz-foe", "") +
  `</div>` +
  `<div class="gp-mz-panel">` +
  `<div class="gp-mz-phead"><span>SLIME BATTLE</span><span class="gp-mz-pips"><i></i><i></i><i class="off"></i></span></div>` +
  `<div class="gp-mz-q">What happens when an atom loses an electron?</div>` +
  `<div class="gp-mz-opt">It becomes neutral</div>` +
  `<div class="gp-mz-opt gp-opt-good"><span>It becomes positively charged</span><b>✓</b></div>` +
  `<div class="gp-mz-opt">It turns into light</div>` +
  `<div class="gp-good-foot gp-good-foot-tight">` +
  `<div class="gp-good-head"><b>Direct hit!</b><small>Fewer electrons leaves more positive protons.</small></div>` +
  `<div class="gp-good-btn">CONTINUE</div>` +
  `</div>` +
  `</div>` +
  `</div>`;

const PHONE_APPS_GRID = [
  ["chats", "Chats"],
  ["atomdex", "AtomDex"],
  ["scanner", "Scanner"],
  ["field-notes", "Field Notes"],
  ["library", "Library"],
  ["camera", "Camera"],
  ["safety", "Safety"],
  ["map", "Map"],
  ["shop", "Shop"],
  ["daily-fact", "Daily Fact"],
  ["contacts", "Contacts"],
  ["settings", "Settings"],
];

const SCREEN_SCIENCE_PHONE =
  `<div class="gp-ui gp-ui-phone">` +
  `<div class="gp-ph-wall">` +
  `<i style="left:-90px;top:160px;width:360px;height:360px"></i>` +
  `<i style="right:-100px;top:40px;width:280px;height:280px"></i>` +
  `<i style="left:210px;top:760px;width:440px;height:440px"></i>` +
  `</div>` +
  `<div class="gp-ph-notif">` +
  `<span class="gp-ph-av"><img src="art/npc-ada-head.svg" alt="" /></span>` +
  `<div class="gp-ph-ntxt">` +
  `<div class="gp-ph-nhead"><b>Ada · Atom Scanner</b><small>just now</small></div>` +
  `<p>Scan a banana — it has a tiny trace of Potassium-40!</p>` +
  `</div>` +
  `<img class="gp-ph-nobj" src="art/obj-banana.svg" alt="" />` +
  `</div>` +
  `<div class="gp-ph-grid">` +
  PHONE_APPS_GRID.map(
    ([id, name]) =>
      `<div class="gp-ph-app"><img src="art/app-${id}.svg" alt="" /><span>${name}</span></div>`,
  ).join("") +
  `</div>` +
  `<div class="gp-ph-dock">` +
  `<span><img src="art/app-chats.svg" alt="" /></span>` +
  `<span><img src="art/app-scanner.svg" alt="" /></span>` +
  `<span><img src="art/app-map.svg" alt="" /></span>` +
  `<span><img src="art/app-safety.svg" alt="" /></span>` +
  `</div>` +
  `</div>`;

const MB_MODE_ICONS = {
  quick: `<svg viewBox="0 0 24 24"><path d="M13.5 2L5 13.5h6L10 22l9-12h-6z" fill="#fff" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  challenge: `<svg viewBox="0 0 24 24"><path d="M12 20.5s-8-4.9-8-10.7A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8 3.2c0 5.8-8 10.7-8 10.7z" fill="#fff"/></svg>`,
  endless: `<svg viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="7.5" fill="none" stroke="#fff" stroke-width="2.8"/><path d="M12 9.5v4.5l3 1.8M9.5 3h5" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

const mbMode = (id, color, lip, title, desc) =>
  `<div class="gp-mb-mrow"><span class="gp-mb-mic" style="background:${color};box-shadow:0 6px 0 ${lip}">${MB_MODE_ICONS[id]}</span><div><b>${title}</b><small>${desc}</small></div></div>`;

const SCREEN_MYTH_BUSTER =
  `<div class="gp-ui gp-ui-myth">` +
  `<div class="gp-les-top">` +
  `<span class="gp-les-x">${PILL_ICONS.close}</span>` +
  `<div class="gp-les-barwrap">` +
  `<span class="gp-les-streak gp-streak-coral">MYTH BUSTER</span>` +
  `<div class="gp-les-track"><i style="width:65%;background:#ff7a2f"></i></div>` +
  `</div>` +
  `<div class="gp-les-hearts">${PILL_ICONS.heart}<span>3</span></div>` +
  `</div>` +
  `<div class="gp-mb-main">` +
  `<div class="gp-mb-headrow"><span class="gp-mb-badge">MYTH OR FACT?</span><span class="gp-mb-step">4 of 10</span></div>` +
  `<div class="gp-mb-card">` +
  `<img class="gp-mb-who" src="art/npc-ada-bust.svg" alt="" />` +
  `<h3>“You become radioactive after getting an X-ray.”</h3>` +
  `</div>` +
  `<div class="gp-mb-btns">` +
  `<div class="gp-mb-btn gp-mb-picked"><span>MYTH</span><b>✓</b></div>` +
  `<div class="gp-mb-btn"><span>FACT</span></div>` +
  `</div>` +
  `<div class="gp-mb-modes">` +
  mbMode("quick", "#ff9500", "#cc7800", "Quick Play", "Pick a unit and play 10 statements") +
  mbMode("challenge", "#ff3b5c", "#cc2f4a", "Challenge", "Every statement, 3 lives, no timer") +
  mbMode("endless", "#8b5cf6", "#6f4ac4", "Endless", "Beat the clock: right adds time") +
  `</div>` +
  `</div>` +
  `<div class="gp-good-foot">` +
  `<div class="gp-good-head"><b>Myth busted!</b><small>X-rays pass through without leaving radioactivity behind.</small></div>` +
  `<div class="gp-good-btn">NEXT STATEMENT</div>` +
  `</div>` +
  `</div>`;

const SHOP_ICONS = {
  back: `<svg viewBox="0 0 24 24"><path d="M15 6l-7 6 7 6z" fill="#3c3c3c"/></svg>`,
  check: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="none" stroke="#3c3c3c" stroke-width="2"/><path d="M8.5 12.2l2.4 2.4 4.8-5" fill="none" stroke="#3c3c3c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  hair: `<svg viewBox="0 0 24 24"><path d="M6 19v-7a6 6 0 0 1 12 0v7h-3v-6a3 3 0 0 0-6 0v6z" fill="currentColor"/></svg>`,
  face: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="currentColor"/><path d="M8.8 13.8q3.2 2.8 6.4 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`,
  crown: `<svg viewBox="0 0 24 24"><path d="M3.5 17.5L5 8l4.5 3.5L12 6.5l2.5 5L19 8l1.5 9.5z" fill="currentColor"/><rect x="4.5" y="18.8" width="15" height="2.4" rx="1.2" fill="currentColor"/></svg>`,
  skin: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8.2" r="4" fill="currentColor"/><circle cx="8.5" cy="14.5" r="4" fill="currentColor"/><circle cx="15.5" cy="14.5" r="4" fill="currentColor"/></svg>`,
  paint: `<svg viewBox="0 0 24 24"><path d="M18.5 3.5l2 2-9.5 9.5-2.5.5.5-2.5z" fill="currentColor"/><path d="M8.5 15.5c-2.5.5-3.5 2.4-3.5 4.5 2.5 0 4.5-1 5-3.5z" fill="currentColor"/></svg>`,
  pattern: `<svg viewBox="0 0 24 24"><path d="M10.5 5.5L16.5 16H4.5z" fill="currentColor"/><circle cx="16.5" cy="15" r="4" fill="currentColor" opacity="0.72"/></svg>`,
  hat: `<svg viewBox="0 0 24 24"><path d="M6 15a6 6 0 0 1 12 0z" fill="currentColor"/><rect x="3.5" y="15.5" width="17" height="2.8" rx="1.4" fill="currentColor"/></svg>`,
  glasses: `<svg viewBox="0 0 24 24"><circle cx="7.5" cy="12.5" r="3.6" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="16.5" cy="12.5" r="3.6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M11.1 12.5h1.8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  ear: `<svg viewBox="0 0 24 24"><circle cx="12" cy="14.5" r="4.2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 6.5v3.8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  shirt: `<svg viewBox="0 0 24 24"><path d="M8 5l-4 3 2 3.5 2-1V19h8v-8.5l2 1L20 8l-4-3-2 2h-4z" fill="currentColor"/></svg>`,
};

const SWATCH_COLORS = [
  { c: "#FF5252" },
  { c: "#FF9600" },
  { c: "#FFD000", on: true },
  { c: "#89E219" },
  { c: "#58CC02" },
  { c: "#1CB0F6", down: true },
];

const shopSwatch = ({ c, on, down }) =>
  `<div class="gp-sw ${on ? "on" : ""}">` +
  `<svg viewBox="0 0 44 38"><path d="M9 17c-2-8 3-14 13-14s15 6 13 14c4 4 4 12-1 16-4 3-20 3-24 0-5-4-5-12-1-16z" fill="${c}"/></svg>` +
  (on ? `<span class="gp-sw-ok">✓</span>` : "") +
  (down ? `<span class="gp-sw-dn">▾</span>` : "") +
  `</div>`;

const eyeTile = (id, state) => {
  const foot =
    state === "equipped"
      ? `<span class="gp-tfoot ok">Equipped</span>`
      : `<span class="gp-tfoot">${DIAMOND}40</span>`;
  const tick = state === "equipped" ? `<span class="gp-tick">✓</span>` : "";
  const cls = state === "equipped" ? "on" : state === "try" ? "try" : "";
  return (
    `<div class="gp-stile ${cls}">` +
    `<div class="gp-stile-pic"><img src="art/eye-${id}.svg" alt="" /></div>` +
    `${tick}${foot}` +
    `</div>`
  );
};

const AWNING = [0, 1, 2, 3, 4, 5, 6]
  .map((i) => `<i class="${i % 2 === 0 ? "r" : "w"}"></i>`)
  .join("");

const SCREEN_QUESTS_SHOP =
  `<div class="gp-ui gp-ui-rewards">` +
  `<div class="gp-rw-quests">` +
  `<div class="gp-rw-chest">` +
  `<img class="gp-rw-cimg" src="art/chest-open.png" alt="" />` +
  `<div class="gp-rw-ctxt"><b>Daily Chest</b><small>Complete quests to unlock diamonds</small></div>` +
  `<span class="gp-rw-pill">+5${DIAMOND}</span>` +
  `</div>` +
  `<div class="gp-rw-qrow">` +
  `<div class="gp-rw-qinfo"><b>Finish 1 lesson</b><div class="gp-rw-bar"><i style="width:100%"></i><span>1 / 1</span></div></div>` +
  `<span class="gp-rw-claim">CLAIM</span>` +
  `</div>` +
  `</div>` +
  `<div class="gp-shop-frame">` +
  `<div class="gp-shop-stage">` +
  `<div class="gp-awning">${AWNING}</div>` +
  `<div class="gp-shop-top">` +
  `<span class="gp-shop-btn">${SHOP_ICONS.back}</span>` +
  `<span class="gp-shop-bal">${DIAMOND}120</span>` +
  `</div>` +
  `<span class="gp-shop-owned">${SHOP_ICONS.check}</span>` +
  `<div class="gp-swatches">${SWATCH_COLORS.map(shopSwatch).join("")}</div>` +
  `<img class="gp-shop-hero" src="art/shop-hero.svg" alt="" />` +
  `<div class="gp-shop-buy"><span>${DIAMOND}Buy 40</span></div>` +
  `</div>` +
  `<div class="gp-shop-panel">` +
  `<div class="gp-cat-bar">` +
  `<span>${SHOP_ICONS.hair}</span>` +
  `<span>${SHOP_ICONS.face}</span>` +
  `<span class="on">${SHOP_ICONS.crown}</span>` +
  `<span>${SHOP_ICONS.skin}</span>` +
  `<span>${SHOP_ICONS.paint}</span>` +
  `<span>${SHOP_ICONS.pattern}</span>` +
  `</div>` +
  `<div class="gp-shelf">` +
  `<div class="gp-sub-rail">` +
  `<span>${SHOP_ICONS.hat}</span>` +
  `<span class="on">${SHOP_ICONS.glasses}</span>` +
  `<span>${SHOP_ICONS.ear}</span>` +
  `<span>${SHOP_ICONS.shirt}</span>` +
  `</div>` +
  `<div class="gp-rw-tiles">` +
  eyeTile("none", "equipped") +
  eyeTile("round", "try") +
  eyeTile("square", "price") +
  eyeTile("sunglasses", "price") +
  eyeTile("heart", "price") +
  eyeTile("star", "price") +
  `</div>` +
  `</div>` +
  `</div>` +
  `</div>` +
  `</div>`;

/* ---------- helper to compose a Duolingo-style Play Store screenshot ---------- */

function makeStoreSlide({
  id,
  label,
  theme,
  arch = false,
  headline,
  sub = "",
  motifs,
  screen,
  peek = null,
  variant = "phone", // "phone" | "tablet7" | "tablet10"
}) {
  const isT10 = variant === "tablet10";
  const isTablet = variant === "tablet7" || isT10;
  const width = isT10 ? 1440 : 1080;
  const height = isT10 ? 2560 : 1920;

  const inner =
    `<div class="gp-shot gp-t-${theme} ${arch ? "gp-has-arch" : ""} ${isTablet ? "gp-is-tablet" : ""}">` +
    (arch ? `<div class="gp-arch"></div>` : "") +
    bgArt(1080, 1920, motifs) +
    `<div class="gp-head">` +
    `<h2>${headline}</h2>` +
    (sub ? `<div class="gp-sub">${sub}</div>` : "") +
    `</div>` +
    `<div class="gp-device-wrap">` +
    `<div class="gp-device-card">${screen}</div>` +
    `</div>` +
    (peek ? `<img class="gp-peek ${peek.cls || ""}" src="${peek.src}" alt="" />` : "") +
    `</div>`;

  // 10-inch tablet renders at crisp 1440x2560 (exact 9:16 = 1.333333x of 1080x1920)
  const html = isT10
    ? `<div class="slide gp-root gp-root-t10"><div class="gp-scale-t10">${inner}</div></div>`
    : `<div class="slide gp-root gp-root-1080">${inner}</div>`;

  return { id, label, width, height, html };
}

const PHONE_SPECS = [
  {
    id: "01-lesson-map",
    label: "Lesson Map",
    theme: "gold",
    headline: "Learn nuclear<br/>science fast",
    sub: "5-minute lessons · 100% offline",
    motifs: [
      ["atom", 110, 140, -18, 0.9, 0.16],
      ["sparkle", 954, 150, 0, 0.72, 0.22],
      ["flask", 968, 420, 16, 0.72, 0.14],
      ["bolt", 86, 440, -14, 0.65, 0.14],
    ],
    screen: SCREEN_LESSON_MAP,
    peek: { src: "/app-assets/images/mascot/happy_2.png", cls: "gp-peek-br" },
  },
  {
    id: "02-short-lessons",
    label: "Visual Lessons",
    theme: "blue",
    headline: "Bite-sized<br/>visual lessons",
    sub: "guided by your teachers",
    motifs: [
      ["flask", 112, 154, -14, 0.85, 0.15],
      ["atom", 958, 174, 20, 0.92, 0.15],
      ["sparkle", 148, 420, 0, 0.52, 0.2],
      ["star", 930, 420, 12, 0.58, 0.14],
    ],
    screen: SCREEN_SHORT_LESSON,
  },
  {
    id: "03-atom-maze",
    label: "Atom Maze",
    theme: "green",
    headline: "Play &amp; battle<br/>in Atom Maze",
    sub: "answer questions to win",
    motifs: [
      ["bolt", 104, 148, -16, 0.84, 0.16],
      ["star", 956, 154, 18, 0.82, 0.16],
      ["sparkle", 144, 412, 0, 0.55, 0.22],
      ["atom", 960, 430, -14, 0.78, 0.14],
    ],
    screen: SCREEN_ATOM_MAZE,
  },
  {
    id: "04-science-phone",
    label: "Science Phone",
    theme: "purple",
    arch: true,
    headline: "Your own<br/>science phone",
    sub: "chat, scan &amp; explore",
    motifs: [
      ["phone", 106, 164, -14, 0.85, 0.15],
      ["sparkle", 944, 144, 0, 0.68, 0.22],
      ["atom", 960, 460, 18, 0.82, 0.14],
      ["gem", 92, 470, -16, 0.62, 0.14],
    ],
    screen: SCREEN_SCIENCE_PHONE,
    peek: { src: "/app-assets/images/mascot/radiation.png", cls: "gp-peek-geiger" },
  },
  {
    id: "05-myth-buster",
    label: "MythBuster",
    theme: "coral",
    headline: "Bust common<br/>nuclear myths",
    sub: "calm, sourced facts",
    motifs: [
      ["shield", 106, 152, -14, 0.82, 0.15],
      ["sparkle", 948, 150, 0, 0.68, 0.22],
      ["bolt", 962, 420, 16, 0.68, 0.14],
      ["atom", 92, 434, 14, 0.76, 0.14],
    ],
    screen: SCREEN_MYTH_BUSTER,
  },
  {
    id: "06-quests-shop",
    label: "Quests & Shop",
    theme: "teal",
    arch: true,
    headline: "Earn rewards,<br/>style your look",
    sub: "quests, chests &amp; avatar shop",
    motifs: [
      ["gem", 106, 152, -16, 0.85, 0.16],
      ["star", 950, 152, 16, 0.78, 0.16],
      ["sparkle", 140, 444, 0, 0.55, 0.22],
      ["flask", 956, 440, -14, 0.72, 0.14],
    ],
    screen: SCREEN_QUESTS_SHOP,
  },
];

const PHONE_SLIDES = PHONE_SPECS.map((s) => makeStoreSlide({ ...s, variant: "phone" }));

/* ========================================================================== */
/* 3. APP ICON (512 x 512 px, PNG <= 1 MB, full-bleed square)                 */
/* ========================================================================== */

const ICON_SLIDES = [
  {
    id: "app-icon",
    label: "App Icon",
    width: 512,
    height: 512,
    svgUrl: "/app-assets/images/icon-layered.svg",
    html:
      `<div class="slide gp-icon-slide">` +
      `<img src="/app-assets/images/icon-layered.svg" alt="AtomIQ Editable Layered Vector App Icon" />` +
      `</div>`,
  },
];

/* ========================================================================== */
/* 4. 7-INCH & 10-INCH TABLET SCREENSHOTS (9:16, 4 flagship slides each)      */
/* ========================================================================== */

const TABLET_BASE = PHONE_SPECS.slice(0, 4);

const TABLET_7_SLIDES = TABLET_BASE.map((s) => makeStoreSlide({ ...s, variant: "tablet7" }));
const TABLET_10_SLIDES = TABLET_BASE.map((s) => makeStoreSlide({ ...s, variant: "tablet10" }));

export const PLAY_PACKS = [
  {
    id: "play-feature",
    name: "Feature Graphic",
    folder: "02-feature-graphic",
    spec: "1024 × 500 px (2× supersampled) · PNG ≤ 15 MB",
    filePrefix: "atomiq-play-feature",
    maxMB: 15,
    exportScale: 1,
    supersample: 2,
    slides: [FEATURE_HERO_GOLD, FEATURE_DUO_SPLIT],
  },
  {
    id: "play-phone",
    name: "Phone Screenshots",
    folder: "03-phone-screenshots",
    spec: "2160 × 3840 px · 9:16 · 6 slides · ≤ 8 MB",
    filePrefix: "atomiq-play-phone",
    maxMB: 8,
    exportScale: 2,
    supersample: 1,
    slides: PHONE_SLIDES,
  },
  {
    id: "play-icon",
    name: "App Icon",
    folder: "01-app-icon",
    spec: "512 × 512 px (2× supersampled) · PNG ≤ 1 MB",
    filePrefix: "atomiq-play-icon",
    maxMB: 1,
    exportScale: 1,
    supersample: 2,
    slides: ICON_SLIDES,
  },
  {
    id: "play-tablet-7",
    name: '7" Tablet',
    folder: "04-tablet-7-inch",
    spec: "2160 × 3840 px · 9:16 · 4 slides · ≤ 8 MB",
    filePrefix: "atomiq-play-tablet7",
    maxMB: 8,
    exportScale: 2,
    supersample: 1,
    slides: TABLET_7_SLIDES,
  },
  {
    id: "play-tablet-10",
    name: '10" Tablet',
    folder: "05-tablet-10-inch",
    spec: "2880 × 5120 px · 9:16 · 4 slides · ≤ 8 MB",
    filePrefix: "atomiq-play-tablet10",
    maxMB: 8,
    exportScale: 2,
    supersample: 1,
    slides: TABLET_10_SLIDES,
  },
];
