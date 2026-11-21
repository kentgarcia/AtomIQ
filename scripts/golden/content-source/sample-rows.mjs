/** The rows behind golden/content-source/v1/sample-*.atomiq. Changing this file or the canonical form fails test T2 loudly. */
export const SAMPLE_ROWS = {
  sample_items: [
    {
      id: "item-one", owner: "ada", position: 0, kind: "story", count: 3, ratio: 0.5, meta: { a: 1, b: [1, 2] }, tags: ["x", "y z"],
      choices: [{ label: "hi there", next: "item-two" }, { label: "bye" }],
      text: "First bubble\n\nSecond bubble, with a colon: and a - dash\n\n[[pic:tour-home]]\n\n# not a comment\nnode item-two\nreply: not a reply",
    },
    { id: "item-two", owner: "ada", position: 1, kind: "reply", count: 0, ratio: null, meta: null, tags: [], choices: [], text: "  indented start and curly quotes: “hello” ‘x’" },
    { id: "item-three", owner: "bo", position: 0, kind: "story", count: -2, ratio: 1e21, meta: [], tags: [], choices: [], text: "x" },
  ],
  sample_refs: [
    { item_id: "item-one", ref_id: "ref-a" },
    { item_id: "item-one", ref_id: "ref-b" },
  ],
  sample_cards: [
    {
      lesson: "half-life", id: "c01", title: "Why?", level: 1,
      summary: "A short summary.\n\nWith a second paragraph.",
      data: { type: "choice", options: ["alpha", "beta", "gamma"], answer: 1, scene: { height: 40, shapes: [{ t: "circle", x: 10, y: 20, r: 4 }, { t: "text", x: 5, y: 5, text: "hi" }] } },
      log: [{ a: 1 }, { b: "two" }],
    },
    { lesson: "half-life", id: "c02", title: null, level: 2, summary: "", data: {}, log: null },
  ],
};
