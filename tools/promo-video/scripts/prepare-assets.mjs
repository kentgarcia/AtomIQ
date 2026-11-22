#!/usr/bin/env node
/**
 * Copies real AtomIQ fonts, icons, mascot sprites, platformer sprites, publisher vector art,
 * and SFX into tools/promo-video/public/ — and also exports the live eyewear-swap hero busts
 * straight from components/avatar/avatar-core.ts so Scene 6 swaps round -> star glasses using
 * authentic AtomIQ vector art.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, '..');
const REPO = path.resolve(PROJECT, '..', '..');
const PUB = path.join(PROJECT, 'public');

function copyFile(srcRel, dstRel) {
  const src = path.join(REPO, srcRel);
  const dst = path.join(PUB, dstRel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function copyDir(srcRel, dstRel) {
  const src = path.join(REPO, srcRel);
  const dst = path.join(PUB, dstRel);
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(path.join(srcRel, entry.name), path.join(dstRel, entry.name));
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// 1. Font
copyFile('assets/fonts/Intern-Variable.ttf', 'fonts/Intern-Variable.ttf');

// 2. Icons & Mascot
copyFile('assets/images/icon-layered.svg', 'images/icon-layered.svg');
copyFile('assets/images/icon.png', 'images/icon.png');
copyFile('assets/images/icons/diamond.png', 'images/diamond.png');
for (const m of ['happy_2.png', 'happy.png', 'radiation.png', 'experiment.png', 'explain.png']) {
  copyFile(`assets/images/mascot/${m}`, `images/mascot/${m}`);
}

// 3. Publisher vector art (teachers, objects, app icons, chest, eyewear tiles)
copyDir('tools/publisher/public/art', 'art');

// 4. Platformer assets needed for Scene 3 (Atom Maze)
const pfFiles = [
  'backgrounds/background_clouds.png',
  'backgrounds/background_color_hills.png',
  'tiles/terrain_grass_block_top.png',
  'tiles/terrain_grass_block_center.png',
  'enemies/slime_normal_walk_a.png',
  'enemies/slime_normal_walk_b.png',
  'hud/hud_heart.png',
  'hud/hud_coin.png',
  'hud/hud_character_multiply.png',
  'hud/hud_character_1.png',
  'hud/hud_character_2.png',
  'hud/hud_character_5.png',
  'props/flag_yellow_a.png',
];
for (const f of pfFiles) {
  copyFile(`assets/images/platformer/${f}`, `platformer/${f}`);
}

// 5. Real AtomIQ SFX
const sfxFiles = [
  'reward/pop.wav',
  'reward/sparkle.wav',
  'reward/chest-open.wav',
  'reward/coin-land.wav',
  'reward/finish-jingle.wav',
  'lesson/whoosh.wav',
  'lesson/node-zoom.wav',
  'lesson/pick.wav',
  'lesson/answer-correct.wav',
  'game/platformer-jump.wav',
  'game/platformer-battle.wav',
  'game/platformer-coin.wav',
  'ui/page-next.wav',
  'ui/select.wav',
  'ui/geiger.wav',
  'ui/shop-open.wav',
  'ui/try-on.wav',
  'ui/tick.wav',
  'phone/app-open.wav',
  'social/notification.wav',
];
for (const f of sfxFiles) {
  copyFile(`assets/sfx/${f}`, `sfx/${f}`);
}

// 6. Export authentic Avatar Shop hero busts (round yellow glasses & star yellow glasses)
const load = async (p) => import(pathToFileURL(path.join(REPO, p)).href);
const { NPC_VIEWBOX, buildNpc, partToSvg, treeParts } = await load('components/npc/npc-art.ts');
const { DEFAULT_AVATAR, avatarSpec } = await load('components/avatar/avatar-core.ts');

function exportBust(name, eyewear) {
  const vb = NPC_VIEWBOX.bust;
  const spec = avatarSpec({ ...DEFAULT_AVATAR, eyewear, eyewearColor: 'yellow' });
  const body = treeParts(buildNpc(spec, 'idle', 'bust')).map(partToSvg).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vb.w}" height="${vb.h}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">${body}</svg>`;
  fs.writeFileSync(path.join(PUB, 'art', name), svg);
}

exportBust('shop-hero-round.svg', 'round');
exportBust('shop-hero-star.svg', 'star');

console.log('prepare-assets ok: fonts, icons, mascot, art, platformer, sfx, and live shop busts ready in public/');
