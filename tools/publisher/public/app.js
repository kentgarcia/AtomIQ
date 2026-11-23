// Viewer: shows one asset pack and slide at a time, scaled to fit, and exports PNGs.
// Google Play Store packs export at exact required pixel dimensions (1x); Beta 1:1 slides export up to 4x.
// The PNG is drawn via SVG <foreignObject> (with fonts and images inlined as data URIs). No dependencies.

import { FB_PACKS } from "./fb-slides.js";
import { PLAY_PACKS } from "./play-slides.js";
import { SLIDES as BETA_SLIDES } from "./slides.js";
import { buildZip } from "./zip.js";

const PACKS = [
  ...PLAY_PACKS,
  ...FB_PACKS,
  {
    id: "beta",
    name: "Beta Carousel",
    spec: "1080 × 1080 px (4× hi-res) · 1:1 · 9 slides",
    filePrefix: "atomiq-beta",
    maxMB: null,
    exportScale: null,
    supersample: 1,
    slides: BETA_SLIDES.map((s) => ({ ...s, width: 1080, height: 1080 })),
  },
];

// High-res multiplier for non-exact decks (Beta 1:1 slides)
const EXPORT_SCALES = [4, 3, 2];
const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(location.search);
let packIndex = Math.max(0, PACKS.findIndex((p) => p.id === params.get("pack")));
let slideIndex = Math.max(
  0,
  Math.min(PACKS[packIndex].slides.length - 1, Number(params.get("slide") ?? 1) - 1 || 0),
);
let lastStatus = "";
let lastWarn = false;

const currentPack = () => PACKS[packIndex];
const currentSlide = () => currentPack().slides[slideIndex];

function renderMeta() {
  const pack = currentPack();
  const statusHtml = lastStatus
    ? `<span class="status ${lastWarn ? "warn" : ""}">${lastStatus}</span>`
    : "";
  $("meta").innerHTML = `<span class="badge">${pack.spec}</span>${statusHtml}`;
}

function show(pIdx, sIdx) {
  packIndex = pIdx;
  const pack = currentPack();
  slideIndex = Math.max(0, Math.min(pack.slides.length - 1, sIdx));
  lastStatus = "";
  lastWarn = false;

  history.replaceState(null, "", `?pack=${encodeURIComponent(pack.id)}&slide=${slideIndex + 1}`);
  const slide = currentSlide();
  $("slide").outerHTML = slide.html.replace('class="slide', 'id="slide" class="slide');

  $("packs").innerHTML = PACKS.map(
    (p, n) => `<button type="button" data-p="${n}" ${n === packIndex ? 'aria-current="true"' : ""}>${p.name}</button>`,
  ).join("");

  $("tabs").hidden = pack.slides.length < 2;
  $("tabs").innerHTML = pack.slides
    .map((s, n) => {
      const lbl = s.label ? `${n + 1} · ${s.label}` : `${n + 1}`;
      return `<button type="button" data-i="${n}" ${n === slideIndex ? 'aria-current="true"' : ""}>${lbl}</button>`;
    })
    .join("");

  $("download-svg").hidden = !slide.svgUrl;
  $("download-all").hidden = pack.slides.length < 2;
  renderMeta();
  fit();
}

function fit() {
  const stage = $("stage");
  const { width, height } = currentSlide();
  const k = Math.min((stage.clientWidth - 48) / width, (stage.clientHeight - 48) / height, 1);
  const scaler = $("scaler");
  scaler.style.width = `${width}px`;
  scaler.style.height = `${height}px`;
  scaler.style.transform = `translate(${(stage.clientWidth - width * k) / 2}px, ${(stage.clientHeight - height * k) / 2}px) scale(${k})`;
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

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
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
  const [baseCss, playCss, fbCss, font] = await Promise.all([
    fetch("slides.css", { cache: "no-store" }).then((r) => r.text()),
    fetch("play-slides.css", { cache: "no-store" }).then((r) => r.text()),
    fetch("fb-slides.css", { cache: "no-store" }).then((r) => r.text()),
    toDataUrl("/app-assets/fonts/Intern-Variable.ttf"),
  ]);
  const combined = `${baseCss}\n${playCss}\n${fbCss}`;
  return combined.replace(/url\("\/app-assets\/fonts\/Intern-Variable\.ttf"\)/g, `url("${font}")`);
}

/** Load an SVG string into an Image at native `rw x rh` raster resolution. */
async function loadSvgImage(svgText) {
  const svgUrl = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }));
  const img = new Image();
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("The browser could not draw the slide"));
      img.src = svgUrl;
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
  return img;
}

/** Draw slide `sIdx` of `pack` to a crisp high-res PNG blob within Play Store limits. */
async function renderPng(sIdx, pack = currentPack(), cache = null) {
  const slide = pack.slides[sIdx];
  const { width, height } = slide;

  const loadData = async (url) => {
    if (cache?.has(url)) return cache.get(url);
    const data = await toDataUrl(url);
    cache?.set(url, data);
    return data;
  };

  const host = document.createElement("div");
  host.innerHTML = slide.html;
  const root = host.firstElementChild;
  for (const img of root.querySelectorAll("img")) {
    const src = img.getAttribute("src");
    if (src && !src.startsWith("data:")) img.setAttribute("src", await loadData(src));
  }
  root.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  const html = new XMLSerializer().serializeToString(root);
  const safeCss = cache?.has("__css")
    ? cache.get("__css")
    : (await exportCss()).replace(/\]\]>/g, "]]]]><![CDATA[>");
  cache?.set("__css", safeCss);

  const maxBytes = pack.maxMB ? pack.maxMB * 1024 * 1024 : Infinity;
  const scales = pack.exportScale ? (pack.exportScale > 1 ? [pack.exportScale, 1.5, 1] : [pack.exportScale]) : EXPORT_SCALES;
  const ss = pack.supersample || 1;

  let result = null;
  for (const scale of scales) {
    const outW = Math.round(width * scale);
    const outH = Math.round(height * scale);
    const rasterW = Math.round(outW * ss);
    const rasterH = Math.round(outH * ss);
    // Setting explicit raster width/height on <svg> forces native crisp text & vector rasterization!
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${rasterW}" height="${rasterH}" viewBox="0 0 ${width} ${height}">` +
      `<foreignObject width="${width}" height="${height}"><style xmlns="http://www.w3.org/1999/xhtml"><![CDATA[${safeCss}]]></style>${html}</foreignObject></svg>`;

    const img = await loadSvgImage(svg);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, outW, outH);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) continue;
    result = { blob, width: outW, height: outH };
    if (blob.size <= maxBytes) break;
  }
  if (!result) throw new Error("Could not make the picture");
  return result;
}

const fileName = (sIdx, outW, outH, pack = currentPack()) => {
  const slide = pack.slides[sIdx];
  const dim = pack.exportScale ? `-${outW}x${outH}` : "";
  if (pack.slides.length === 1) return `${pack.filePrefix}${dim}.png`;
  const hasNum = /^\d{2}-/.test(slide.id);
  const stem = hasNum ? slide.id : `${String(sIdx + 1).padStart(2, "0")}-${slide.id}`;
  return `${pack.filePrefix}-${stem}${dim}.png`;
};

const zipFileName = (sIdx, outW, outH, pack) => {
  const slide = pack.slides[sIdx];
  if (pack.slides.length === 1) return `atomiq-${slide.id}-${outW}x${outH}.png`;
  const hasNum = /^\d{2}-/.test(slide.id);
  const stem = hasNum ? slide.id : `${String(sIdx + 1).padStart(2, "0")}-${slide.id}`;
  return `${stem}-${outW}x${outH}.png`;
};

async function run(button, work) {
  button.disabled = true;
  const label = button.textContent;
  button.textContent = "Rendering…";
  try {
    await work(button);
  } catch (err) {
    alert(err.message || "Export failed");
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}

$("download-svg").addEventListener("click", (e) =>
  run(e.currentTarget, async () => {
    const slide = currentSlide();
    if (!slide.svgUrl) return;
    const res = await fetch(slide.svgUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load ${slide.svgUrl}`);
    const blob = await res.blob();
    lastWarn = false;
    lastStatus = `Saved layered SVG (${formatSize(blob.size)}) ✓`;
    renderMeta();
    download(blob, `${currentPack().filePrefix}-${slide.id}.svg`);
  }),
);

$("download-play-zip").addEventListener("click", (e) =>
  run(e.currentTarget, async (button) => {
    const ordered = [...PLAY_PACKS].sort((a, b) => a.folder.localeCompare(b.folder));
    const total = ordered.reduce((n, p) => n + p.slides.length, 0);
    const cache = new Map();
    const entries = [];
    let done = 0;
    let overCount = 0;

    for (const pack of ordered) {
      for (let i = 0; i < pack.slides.length; i++) {
        button.textContent = `Rendering ${++done}/${total}…`;
        const { blob, width, height } = await renderPng(i, pack, cache);
        if (pack.maxMB && blob.size > pack.maxMB * 1024 * 1024) overCount++;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        entries.push({
          path: `atomiq-play-store-assets/${pack.folder}/${zipFileName(i, width, height, pack)}`,
          bytes,
        });
        const slide = pack.slides[i];
        if (slide.svgUrl) {
          const res = await fetch(slide.svgUrl, { cache: "no-store" });
          if (res.ok) {
            entries.push({
              path: `atomiq-play-store-assets/${pack.folder}/atomiq-${slide.id}-layered.svg`,
              bytes: new Uint8Array(await res.arrayBuffer()),
            });
          }
        }
      }
    }

    button.textContent = "Packing ZIP…";
    const zipBlob = buildZip(entries);
    lastWarn = overCount > 0;
    lastStatus = overCount
      ? `Saved ZIP (${entries.length} files, ${formatSize(zipBlob.size)} — ${overCount} over limit!)`
      : `Saved Play Store ZIP (${entries.length} files · ${formatSize(zipBlob.size)}) ✓`;
    renderMeta();
    download(zipBlob, "atomiq-play-store-assets.zip");
  }),
);

$("download").addEventListener("click", (e) =>
  run(e.currentTarget, async () => {
    const { blob, width, height } = await renderPng(slideIndex);
    const pack = currentPack();
    const over = pack.maxMB && blob.size > pack.maxMB * 1024 * 1024;
    lastWarn = Boolean(over);
    lastStatus = over
      ? `Saved ${width}×${height} · ${formatSize(blob.size)} (exceeds ${pack.maxMB} MB limit!)`
      : `Saved ${width}×${height} · ${formatSize(blob.size)} ✓`;
    renderMeta();
    download(blob, fileName(slideIndex, width, height));
  }),
);

$("download-all").addEventListener("click", (e) =>
  run(e.currentTarget, async () => {
    const pack = currentPack();
    const cache = new Map();
    let maxBytes = 0;
    let dims = "";
    for (let i = 0; i < pack.slides.length; i++) {
      const { blob, width, height } = await renderPng(i, pack, cache);
      maxBytes = Math.max(maxBytes, blob.size);
      dims = `${width}×${height}`;
      download(blob, fileName(i, width, height));
      await new Promise((r) => setTimeout(r, 300));
    }
    const over = pack.maxMB && maxBytes > pack.maxMB * 1024 * 1024;
    lastWarn = Boolean(over);
    lastStatus = `Exported ${pack.slides.length} files (${dims}, largest ${formatSize(maxBytes)}) ${over ? "!" : "✓"}`;
    renderMeta();
  }),
);

$("packs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-p]");
  if (b) show(Number(b.dataset.p), 0);
});

$("tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-i]");
  if (b) show(packIndex, Number(b.dataset.i));
});

window.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea")) return;
  if (e.key === "ArrowRight") show(packIndex, (slideIndex + 1) % currentPack().slides.length);
  if (e.key === "ArrowLeft") {
    const len = currentPack().slides.length;
    show(packIndex, (slideIndex - 1 + len) % len);
  }
});

new ResizeObserver(fit).observe($("stage"));
show(packIndex, slideIndex);
