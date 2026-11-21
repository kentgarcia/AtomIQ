import crypto from "node:crypto";

/** Key order never matters in a scene, so equality and hashes are taken over the canonical (sorted) form. */
export const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
export const sameScene = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
export const sceneHash = (scene) => crypto.createHash("sha256").update(JSON.stringify(canon(scene))).digest("hex").slice(0, 16);
