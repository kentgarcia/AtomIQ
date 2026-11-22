/**
 * Blog adapter v1: `blog_posts`, `blog_comments` and `blog_references`, one file per post under blog/<unit-id>/.
 *
 *   unit: inside-the-atom
 *
 *   post blog-the-smallest-thing
 *   author: npc-hal
 *   lesson: atoms-are-everywhere
 *   title: The smallest thing you will ever meet
 *   hook: You have never seen one, yet you are made of them.
 *   cover: atom
 *   read: 2
 *   unlock: {"trigger":"unit_complete","unitId":"inside-the-atom"}     (no unlock when left out)
 *   reactors: npc-ada                                                  (one line each)
 *   references: ref-openstax-chem-ch2                                  (one line each, the sources it stands on)
 *
 *   h: How small is small?                  the blocks, in order:
 *   p:                                        h heading | p paragraph | quote | fact (a paragraph is a block, indented)
 *       Look at your hand. ...                figure: <picture id>, then an optional caption: line
 *   figure: atom                              list: the items, one per indented line
 *   caption: An atom: far too small to see.   next: <label> => lesson <id>  or  => unit <id>
 *
 *   comment bc-the-smallest-thing-ray
 *   author: npc-ray
 *   chip: {"entryId":"atom"}
 *
 *       Plain words: matter is ...             (the comment, the body)
 */
import { decodeValue, encodeValue } from "../core/values.mjs";
import { defineAdapter } from "./engine.mjs";

const TEXT_BLOCKS = { p: "prose", quote: "prose", fact: "prose", h: "text" };
const BLOCK_KEYS = ["p", "h", "quote", "fact", "figure", "caption", "list", "next"];
const entry = (key, value, lines = null) => ({ key, value, lines, line: null, comments: [] });

function encodeBlocks(blocks, row) {
  const out = [];
  for (const b of blocks) {
    const { t, ...rest } = b;
    const extra = (allowed) => Object.keys(rest).filter((k) => !allowed.includes(k));
    const bad = (m) => new Error(`${row.id}: ${m}`);
    if (t in TEXT_BLOCKS) {
      if (extra(["text"]).length) throw bad(`a ${t} block has "${extra(["text"])[0]}", which the blog format cannot write`);
      out.push(...encodeValue({ col: t, type: TEXT_BLOCKS[t] }, rest.text));
    } else if (t === "figure") {
      if (extra(["ref", "caption"]).length) throw bad(`a figure block has "${extra(["ref", "caption"])[0]}", which the blog format cannot write`);
      out.push(entry("figure", String(rest.ref)));
      if (rest.caption !== undefined) out.push(...encodeValue({ col: "caption", type: "text" }, rest.caption));
    } else if (t === "list") {
      if (extra(["items"]).length || !Array.isArray(rest.items) || rest.items.length === 0) throw bad("a list block needs items");
      for (const it of rest.items) if (typeof it !== "string" || it === "" || /\n|^\s|\s$/.test(it)) throw bad(`a list item must be one line of text: ${JSON.stringify(it)}`);
      out.push(entry("list", "", rest.items));
    } else if (t === "next") {
      const target = "lessonId" in rest ? ["lesson", rest.lessonId] : "unitId" in rest ? ["unit", rest.unitId] : null;
      if (!target || extra(["label", target[0] === "lesson" ? "lessonId" : "unitId"]).length || typeof rest.label !== "string" || / => |\n/.test(rest.label)) throw bad(`a next block needs a label and a lessonId or unitId: ${JSON.stringify(b)}`);
      out.push(entry("next", `${rest.label} => ${target[0]} ${target[1]}`));
    } else throw bad(`a block of type "${t}" is not part of the blog format`);
  }
  return out;
}

function decodeBlocks(entries) {
  const blocks = [];
  for (const e of entries) {
    const fail = (m) => Object.assign(new Error(m), { entry: e });
    if (e.key in TEXT_BLOCKS) blocks.push({ t: e.key, text: decodeValue({ col: e.key, type: TEXT_BLOCKS[e.key] }, [e]).value });
    else if (e.key === "figure") {
      if (e.lines) throw fail("a figure is one line: figure: <picture id>");
      blocks.push({ t: "figure", ref: e.value });
    } else if (e.key === "caption") {
      const last = blocks[blocks.length - 1];
      if (!last || last.t !== "figure" || "caption" in last) throw fail("a caption belongs right after its figure");
      last.caption = decodeValue({ col: "caption", type: "text" }, [e]).value;
    } else if (e.key === "list") {
      if (!e.lines) throw fail("a list is a block: one item per indented line");
      blocks.push({ t: "list", items: e.lines });
    } else if (e.key === "next") {
      const m = /^(.+) => (lesson|unit) (\S+)$/.exec(e.value);
      if (!m) throw fail('expected: next: <label> => lesson <id>  (or  => unit <id>)');
      blocks.push({ t: "next", label: m[1], [m[2] === "lesson" ? "lessonId" : "unitId"]: m[3] });
    }
  }
  return blocks;
}

const blocks = { col: "blocks", type: "custom", translatable: true, keys: BLOCK_KEYS, encode: encodeBlocks, decode: decodeBlocks };

export const blogAdapter = defineAdapter({
  name: "blog",
  version: 1,
  dir: "blog",
  owns: (rel) => rel.startsWith("blog/") && rel.endsWith(".atomiq"),
  scope: [{ col: "unit_id", key: "unit", type: "id" }],
  records: [
    {
      keyword: "post",
      table: "blog_posts",
      id: ["id"],
      scope: ["unit_id"],
      position: { col: "position", scope: ["unit_id"], base: 0 },
      links: [{ key: "references", table: "blog_references", fk: "blog_id", target: "reference_id" }],
      linksBefore: "blocks",
      fields: [
        { col: "npc_id", key: "author", type: "id" },
        { col: "lesson_id", key: "lesson", type: "id", nullable: true },
        { col: "title", type: "text", translatable: true },
        { col: "hook", type: "text", translatable: true },
        { col: "cover", type: "id" },
        { col: "read_min", key: "read", type: "int" },
        { col: "unlock", type: "json", default: { trigger: "none" }, omitDefault: true },
        { col: "reactors", type: "list" },
        blocks,
      ],
    },
    {
      keyword: "comment",
      table: "blog_comments",
      id: ["id"],
      parent: { keyword: "post", map: { blog_id: "id" } },
      position: { col: "position", scope: ["blog_id"], base: 0 },
      fields: [
        { col: "npc_id", key: "author", type: "id" },
        { col: "chip", type: "json", nullable: true },
        { col: "text", type: "prose", body: true, translatable: true },
      ],
    },
  ],
  layout(rowsByTable) {
    const posts = rowsByTable.blog_posts ?? [];
    const comments = rowsByTable.blog_comments ?? [];
    const units = [...new Set(posts.map((p) => p.unit_id))].sort();
    const files = [];
    for (const unit of units) {
      posts
        .filter((p) => p.unit_id === unit)
        .sort((a, b) => a.position - b.position)
        .forEach((post, i) => {
          files.push({
            path: `blog/${unit}/${String((i + 1) * 10).padStart(3, "0")}-${post.id}.atomiq`,
            scope: { unit_id: unit },
            items: [
              { keyword: "post", row: post },
              ...comments.filter((c) => c.blog_id === post.id).sort((a, b) => a.position - b.position).map((row) => ({ keyword: "comment", row })),
            ],
          });
        });
    }
    return files;
  },
});
