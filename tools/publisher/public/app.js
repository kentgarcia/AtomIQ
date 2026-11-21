// Viewer: shows one slide at a time, scaled to fit, and saves it as a PNG.
// The PNG is made by drawing the slide's HTML inside an SVG <foreignObject> (font and
// pictures inlined as data URIs) onto a canvas. No dependencies.

import { SLIDES } from "./slides.js";

const SIZE = 1080;
// 4x the slide's 1080 px: 4320 x 4320, the sharpest the browser will draw (drops a step if it cannot)
const EXPORT_SCALES = [4, 3, 2];
const $ = (id) => document.getElementById(id);

let index = Math.max(0, Math.min(SLIDES.length - 1, Number(new URLSearchParams(location.search).get("slide") ?? 1) - 1 || 0));

function show(i) {
  index = i;
  history.replaceState(null, "", `?slide=${i + 1}`); // a reload (live reload included) stays on this slide
  $("slide").outerHTML = SLIDES[i].html.replace('class="slide', 'id="slide" class="slide');
  $("tabs").hidden = SLIDES.length < 2;
  $("tabs").innerHTML = SLIDES.map(
    (_, n) => `<button type="button" data-i="${n}" ${n === i ? 'aria-current="true"' : ""}>${n + 1}</button>`,
  ).join("");
  $("download-all").hidden = SLIDES.length < 2;
  fit();
}

function fit() {
  const stage = $("stage");
  const k = Math.min((stage.clientWidth - 48) / SIZE, (stage.clientHeight - 48) / SIZE, 1);
  $("scaler").style.transform = `translate(${(stage.clientWidth - SIZE * k) / 2}px, ${(stage.clientHeight - SIZE * k) / 2}px) scale(${k})`;
}

/* ---------- export ---------- */

function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

async function toDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url}`);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

async function exportCss() {
  const css = await (await fetch("slides.css", { cache: "no-store" })).text();
  const font = await toDataUrl("/app-assets/fonts/Intern-Variable.ttf");
  return css.replace(/url\("\/app-assets\/fonts\/Intern-Variable\.ttf"\)/, `url("${font}")`);
}

/** Draw slide `i` (its HTML, not the page) to a PNG blob. */
async function renderPng(i) {
  const host = document.createElement("div");
  host.innerHTML = SLIDES[i].html;
  const root = host.firstElementChild;
  for (const img of root.querySelectorAll("img")) {
    const src = img.getAttribute("src");
    if (src && !src.startsWith("data:")) img.setAttribute("src", await toDataUrl(src));
  }
  root.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  const html = new XMLSerializer().serializeToString(root);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">` +
    `<foreignObject width="100%" height="100%"><style xmlns="http://www.w3.org/1999/xhtml">${await exportCss()}</style>${html}</foreignObject></svg>`;

  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error("The browser could not draw the slide"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
  let blob = null;
  for (const scale of EXPORT_SCALES) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.imageSmoothingQuality = "high";
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob) break;
  }
  if (!blob) throw new Error("Could not make the picture");
  return blob;
}

const fileName = (i) => `atomiq-beta-${String(i + 1).padStart(2, "0")}-${SLIDES[i].id}.png`;

async function run(button, work) {
  button.disabled = true;
  const label = button.textContent;
  button.textContent = "Rendering…";
  try {
    await work();
  } catch (err) {
    alert(err.message || "Export failed");
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}

$("download").addEventListener("click", (e) => run(e.currentTarget, async () => download(await renderPng(index), fileName(index))));
$("download-all").addEventListener("click", (e) =>
  run(e.currentTarget, async () => {
    for (let i = 0; i < SLIDES.length; i++) {
      download(await renderPng(i), fileName(i));
      await new Promise((r) => setTimeout(r, 300));
    }
  }),
);
$("tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-i]");
  if (b) show(Number(b.dataset.i));
});
new ResizeObserver(fit).observe($("stage"));
show(index);
