// Facebook promotional landscape post for AtomIQ — flat Duolingo-style illustration with minimal overlays.
// Native 1376 x 768 (16:9) 1:1 illustration with 2x supersampled vector brand & standard Google Play badge.

const GOOGLE_PLAY_BADGE_SVG =
  `<svg class="fb-gp-badge" viewBox="0 0 135 40" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Coming soon on Google Play">` +
  `<defs>` +
  `<clipPath id="fbGpTri">` +
  `<path d="M10.2 9.4Q10.2 7.2 12.2 8.3L30.8 18.6Q32.8 20 30.8 21.4L12.2 31.7Q10.2 32.8 10.2 30.6Z"/>` +
  `</clipPath>` +
  `</defs>` +
  // Standard Google Play black pill with crisp hairline border (135 x 40 official ratio)
  `<rect width="135" height="40" rx="5" fill="#000000"/>` +
  `<rect x="0.4" y="0.4" width="134.2" height="39.2" rx="4.6" fill="none" stroke="#A6A6A6" stroke-width="0.8"/>` +
  // Official 4-color flat Google Play prism
  `<g clip-path="url(#fbGpTri)">` +
  `<path d="M9 6.5L22.6 20L9 33.5Z" fill="#4285F4"/>` +
  `<path d="M9 6.5L27.2 16.4L22.4 20.1Z" fill="#34A853"/>` +
  `<path d="M9 33.5L22.4 19.9L27.2 23.6Z" fill="#EA4335"/>` +
  `<path d="M22.4 20L27.2 16.4L34 20L27.2 23.6Z" fill="#FBBC04"/>` +
  `</g>` +
  // Standard white typography
  `<text x="41.5" y="13.4" fill="#FFFFFF" font-family="Intern, system-ui, sans-serif" font-size="6.3" font-weight="600" letter-spacing="0.45">COMING SOON ON</text>` +
  `<text x="40.8" y="30.2" fill="#FFFFFF" font-family="Intern, system-ui, sans-serif" font-size="14.2" font-weight="600" letter-spacing="-0.35">Google Play</text>` +
  `</svg>`;

const FB_CHARACTER_PREVIEW = {
  id: "character-preview",
  label: "Character Preview",
  width: 1376,
  height: 768,
  html:
    `<div class="slide fb-illus">` +
    `<img class="fb-artwork" src="art/fb-meet-characters-bg.jpg" alt="" />` +
    `<div class="fb-brand-lockup">` +
    `<img class="fb-app-icon" src="/app-assets/images/icon.png" alt="" />` +
    `<span class="fb-wordmark">AtomIQ</span>` +
    `</div>` +
    `<div class="fb-store-wrap">${GOOGLE_PLAY_BADGE_SVG}</div>` +
    `</div>`,
};

export const FB_PACKS = [
  {
    id: "fb-landscape",
    name: "Facebook Post",
    spec: "1376 × 768 px (16:9 native crisp · 2× vector) · PNG",
    filePrefix: "atomiq-fb-character-preview",
    maxMB: null,
    exportScale: 1,
    supersample: 2,
    slides: [FB_CHARACTER_PREVIEW],
  },
];
