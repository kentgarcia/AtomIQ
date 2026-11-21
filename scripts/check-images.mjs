/**
 * Fails when a picture the app requires is bigger than the picture budget (scripts/lib/image-budget.mjs, docs/features/RENDER_COST_SPEC.md A1).
 * Only pictures a `require()` names count: Metro does not bundle the rest. Run: npm run check:images. To fix: node scripts/shrink-images.mjs --apply.
 */
import { decodedMb, rel, sizeOf, usedImages } from "./lib/image-usage.mjs";
import { problemWith } from "./lib/image-budget.mjs";

const rows = usedImages().map((f) => ({ file: rel(f).split("\\").join("/"), size: sizeOf(f) }));
const bad = rows.flatMap((r) => {
  const p = problemWith(r.file, r.size);
  return p ? [`  ${r.file}: ${p}`] : [];
});
const total = rows.reduce((n, r) => n + decodedMb(r.size), 0);
if (bad.length) {
  console.error(`check:images FAILED: ${bad.length} picture(s) over budget (all ${rows.length} would decode to ${total.toFixed(0)} MB)\n${bad.join("\n")}\nFix: node scripts/shrink-images.mjs --apply`);
  process.exit(1);
}
console.log(`check:images ok: ${rows.length} pictures, ${total.toFixed(0)} MB if every one were decoded, none over budget`);
