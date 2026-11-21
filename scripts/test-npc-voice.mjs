// The characters' voices in chat, feed and blog (docs/features/NPC_VOICE_SPEC.md): every character has their own post for each
// shared moment, the calm ones never shout, the lively ones do, and lessons keep one plain tone for everybody.
import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const db = new DatabaseSync(path.join(REPO, "content/database/content.db"), { readOnly: true });
const all = (sql, ...a) => db.prepare(sql).all(...a);

/** What each character's tone allows, from their design (docs/features/NPC_VOICE_SPEC.md). `bang`: never | lively. */
const TONE = {
  "npc-hal": { bang: "never" },
  "npc-ada": { bang: "lively" },
  "npc-ray": { bang: "never" },
  "npc-mina": { bang: "never" },
  "npc-kofi": { bang: "lively" },
  "npc-tess": { bang: "lively" },
  "npc-sage": { bang: "never" },
};
const SHARED_PARTS = ["chest-daily", "chest-weekly", "rank-passed", "rank-passed-by", "first-lesson", "comeback-3", "comeback-14", "quests"];
const npcIds = all("SELECT id FROM npcs").map((r) => r.id);
const blocksText = (json) => JSON.parse(json).map((b) => b.text ?? (b.items ?? []).join(" ")).join(" ");

describe("character voices", () => {
  it("has a tone for every teacher in the cast", () => {
    assert.deepEqual([...npcIds].sort(), Object.keys(TONE).sort());
  });

  it("gives every character their own post for every shared moment, and no template is shared by several posters", () => {
    for (const row of all("SELECT id, poster_pool FROM feed_templates")) {
      const pool = JSON.parse(row.poster_pool).filter((x) => x !== "learner");
      assert.ok(pool.length === 0, `${row.id} is pooled across ${pool.join(", ")}: give each character their own`);
    }
    for (const npc of npcIds) {
      for (const part of SHARED_PARTS) {
        const row = all("SELECT npc_id FROM feed_templates WHERE id = ?", `ft-${npc.replace(/^npc-/, "")}-${part}`)[0];
        assert.ok(row, `${npc} has no ${part} post`);
        assert.equal(row.npc_id, npc);
      }
    }
  });

  it("no two characters post the same words", () => {
    const seen = new Map();
    for (const r of all("SELECT id, text FROM feed_templates")) {
      assert.ok(!seen.has(r.text), `${r.id} says the same as ${seen.get(r.text)}`);
      seen.set(r.text, r.id);
    }
  });

  it("the calm characters never use an exclamation mark, the lively ones show it (a ! or a ~)", () => {
    for (const [npc, { bang }] of Object.entries(TONE)) {
      const feed = all("SELECT id, text FROM feed_templates WHERE npc_id = ?", npc);
      const chat = all("SELECT id, text, title FROM chat_nodes WHERE npc_id = ?", npc);
      const blogs = all("SELECT id, title, hook, blocks FROM blog_posts WHERE npc_id = ?", npc);
      const spoken = [
        ...feed.map((r) => [r.id, r.text]),
        ...chat.flatMap((r) => [[r.id, r.text], [r.id, r.title ?? ""]]),
        ...blogs.flatMap((r) => [[r.id, r.title], [r.id, r.hook], [r.id, blocksText(r.blocks)]]),
      ];
      if (bang === "never") {
        for (const [id, text] of spoken) assert.ok(!text.includes("!"), `${npc} shouts in ${id}: ${text}`);
      } else {
        const shared = feed.filter((r) => SHARED_PARTS.some((p) => r.id.endsWith(`-${p}`)));
        const loud = shared.filter((r) => /[!~]/.test(r.text)).length;
        assert.ok(loud / shared.length >= 0.3, `${npc} is lively but only ${loud} of ${shared.length} shared posts show it`);
      }
    }
  });

  it("Ada texts like a best friend, with a ~ only now and then for an expression: at most one a bubble, never in two bubbles in a row", () => {
    const chat = all("SELECT id, text FROM chat_nodes WHERE npc_id = 'npc-ada'");
    let bubbles = 0;
    let tilde = 0;
    for (const r of chat) {
      let previous = false;
      for (const bubble of r.text.split(/\n\s*\n/)) {
        const n = (bubble.match(/~/g) ?? []).length;
        assert.ok(n <= 1, `${r.id}: more than one ~ in a bubble: ${bubble}`);
        assert.ok(!(n && previous), `${r.id}: two bubbles in a row with a ~: ${bubble}`);
        assert.ok(!/~\s*~/.test(bubble) && !/~\S/.test(bubble), `${r.id}: a ~ stuck to other characters: ${bubble}`);
        previous = n > 0;
        bubbles++;
        tilde += n;
      }
    }
    assert.ok(tilde / bubbles <= 0.25, `Ada puts a ~ in ${tilde} of ${bubbles} chat bubbles: that is too many`);
    assert.ok(tilde / bubbles >= 0.05, `Ada puts a ~ in only ${tilde} of ${bubbles} chat bubbles: it is her mark`);
    // Her feed posts and blog: at most one ~ a sentence-run, and never on a reply label (what the learner says) or a title
    for (const r of all("SELECT id, text FROM feed_templates WHERE npc_id = 'npc-ada'")) assert.ok((r.text.match(/~/g) ?? []).length <= 1, `${r.id} has more than one ~`);
    const feedTilde = all("SELECT text FROM feed_templates WHERE npc_id = 'npc-ada'").filter((r) => r.text.includes("~")).length;
    assert.ok(feedTilde >= 3, "Ada's feed posts show no ~ at all");
    for (const r of all("SELECT id, title, hook, blocks FROM blog_posts WHERE npc_id = 'npc-ada'")) {
      assert.ok(!r.title.includes("~") && !r.hook.includes("~"), `${r.id}: no ~ in a title or hook`);
      const paragraphs = JSON.parse(r.blocks).map((b) => (b.text ?? "").includes("~"));
      for (let i = 1; i < paragraphs.length; i++) assert.ok(!(paragraphs[i] && paragraphs[i - 1]), `${r.id}: a ~ in two blocks in a row`);
    }
    for (const r of all("SELECT id, replies FROM chat_nodes")) {
      for (const reply of JSON.parse(r.replies)) assert.ok(!String(reply.label).includes("~"), `${r.id}: a reply label has a ~: ${reply.label}`);
    }
    for (const r of all("SELECT id, title FROM chat_nodes WHERE npc_id = 'npc-ada' AND title IS NOT NULL")) assert.ok(!r.title.includes("~"), `${r.id}: no ~ in a subject line`);
    const words = chat.map((r) => r.text).join(" ").toLowerCase();
    for (const marker of ["hehe", "eep", "sparkle", "soooo", "heyyy"]) assert.ok(words.includes(marker), `Ada never says "${marker}"`);
  });

  it("every teacher's bio is in the first person, in their own tone", () => {
    for (const r of all("SELECT id, bio FROM npcs")) {
      assert.match(r.bio, /\b(I|i)(\x27m| am)\b/, `${r.id}'s bio does not speak as them: ${r.bio}`);
      assert.doesNotMatch(r.bio, /\b(he|she|they) (is|teaches|likes|loves)\b/i, `${r.id}'s bio talks about them instead of as them`);
      if (TONE[r.id].bang === "never") assert.ok(!r.bio.includes("!"), `${r.id} shouts in their bio`);
    }
    const bioOf = (id) => all("SELECT bio FROM npcs WHERE id = ?", id)[0].bio;
    assert.ok(!bioOf("npc-hal").includes("~") && /^[A-Z]/.test(bioOf("npc-hal")), "Hal's bio is formal");
    assert.ok(bioOf("npc-ada").includes("~") && /^[a-z]/.test(bioOf("npc-ada")), "Ada's bio is lower case with her ~");
    assert.ok((bioOf("npc-ada").match(/~/g) ?? []).length <= 1);
  });

  it("Hal is formal and deadpan: no ~, no emoticon-style stretching, whole sentences, and his rocks are named", () => {
    const spoken = [
      ...all("SELECT text FROM chat_nodes WHERE npc_id = 'npc-hal'").map((r) => r.text),
      ...all("SELECT text FROM feed_templates WHERE npc_id = 'npc-hal'").map((r) => r.text),
    ];
    for (const t of spoken) assert.ok(!t.includes("~"), `Hal wrote a ~: ${t}`);
    for (const t of all("SELECT text FROM chat_nodes WHERE npc_id = 'npc-hal'").map((r) => r.text)) {
      for (const bubble of t.split(/\n\s*\n/)) assert.match(bubble.trim(), /^[A-Z'\[]/, `Hal starts a bubble in lower case: ${bubble}`);
    }
    const words = spoken.join(" ");
    for (const rock of ["Reginald", "Doris", "Tuesday"]) assert.ok(words.includes(rock), `no ${rock}`);
  });

  it("no two story threads of a character have the same shape, and each has a first node of its own", () => {
    for (const npc of ["npc-hal", "npc-ada"]) {
      const nodes = new Map(all("SELECT id, kind, trigger, replies FROM chat_nodes WHERE npc_id = ?", npc).map((r) => [r.id, { ...r, replies: JSON.parse(r.replies) }]));
      const shapes = new Map();
      for (const entry of [...nodes.values()].filter((n) => n.kind === "unprompted")) {
        const seen = [];
        const queue = [entry.id];
        while (queue.length) {
          const id = queue.shift();
          if (seen.includes(id)) continue;
          seen.push(id);
          for (const r of nodes.get(id).replies) if (r.next && nodes.has(r.next)) queue.push(r.next);
        }
        const shape = seen.map((id) => nodes.get(id).replies.map((r) => (r.type ?? "t")[0] + (r.next ? "" : "x")).join("")).join("|");
        assert.ok(!shapes.has(shape), `${entry.id} has the same shape as ${shapes.get(shape)}`);
        shapes.set(shape, entry.id);
        assert.ok(seen.length >= 5, `${entry.id} is only ${seen.length} nodes long`);
      }
      assert.ok(shapes.size >= 5, `${npc} has ${shapes.size} stories`);
    }
  });

  it("lessons share one plain tone: no teacher's lesson line shouts", () => {
    for (const r of all("SELECT id, text FROM npc_lines")) assert.ok(!r.text.includes("!"), `${r.id}: ${r.text}`);
  });

  it("each blog piece and chat is spoken by the teacher who owns its unit", () => {
    for (const u of all("SELECT id, teacher_npc_id FROM units")) {
      for (const p of all("SELECT id, npc_id FROM blog_posts WHERE unit_id = ?", u.id)) assert.equal(p.npc_id, u.teacher_npc_id, p.id);
      for (const t of all("SELECT id, npc_id FROM feed_templates WHERE json_extract(condition, '$.unitId') = ? AND trigger IN ('lesson_complete', 'checkpoint_pass', 'testout_pass')", u.id)) {
        assert.equal(t.npc_id, u.teacher_npc_id, t.id);
      }
    }
  });
});
