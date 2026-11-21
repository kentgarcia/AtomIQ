/**
 * Small hand-made rows for each real adapter, using every construct it has. They are pinned as golden files in
 * golden/content-source/v1/<adapter>/ (test T2) and read back (T8). Changing an adapter's canonical form fails the
 * golden test loudly: that needs an adapter version bump and `content:migrate`, never a silent change.
 */
export const ADAPTER_SAMPLES = {
  chat: {
    chat_nodes: [
      { id: "chat-demo-greeting", npc_id: "npc-demo", kind: "greeting", pose: "greet", trigger: null, title: "Chat with Demo", position: 0, text: "Hello there.\n\nWhat would you like to talk about?", replies: [{ label: "the lesson", next: "chat-demo-lesson" }, { label: "something else", next: "chat-demo-bye" }, { label: "Open the atom", action: { screen: "entry", id: "atom" }, next: "chat-demo-bye" }, { label: "See my progress", action: { screen: "app" } }] },
      { id: "chat-demo-lesson", npc_id: "npc-demo", kind: "reply", pose: "explain", trigger: null, title: null, position: 1, text: "A lesson is a short story. (Not a long one.)", replies: [{ label: "love", type: "react", next: "chat-demo-bye" }, { label: "nerd", type: "emoji", next: "chat-demo-bye" }] },
      { id: "chat-demo-bye", npc_id: "npc-demo", kind: "sign_off", pose: "proud", trigger: null, title: null, position: 2, text: "Bye for now.", replies: [{ label: "love", type: "react" }, { label: "nerd", type: "emoji" }] },
      { id: "chat-demo-up-hello", npc_id: "npc-demo", kind: "unprompted", pose: "cheer", trigger: "lessons_completed:3", title: "hello again", position: 3, text: "Three lessons. Nice.", replies: [{ label: "thanks", next: "chat-demo-bye" }, { label: "nerd", type: "emoji", next: "chat-demo-bye" }] },
    ],
  },
  characters: {
    npcs: [{ id: "npc-demo", name: "Demo", title: "Demo teacher", field: "demos", bio: "I am Demo. I teach by example.\n\nAsk me anything.", spec: { skin: { base: "#FFD9C2" }, head: "tombstone", outfit: { kind: "apron" } }, position: 1 }],
    npc_lines: [
      { id: "line-demo-meet", npc_id: "npc-demo", kind: "meet", pose: "greet", lesson_id: null, journey_id: null, text: "Hi, I'm Demo." },
      { id: "line-demo-intro-half-life", npc_id: "npc-demo", kind: "lesson_intro", pose: "explain", lesson_id: "half-life", journey_id: null, text: "Today: how long things last." },
    ],
  },
  feed: {
    feed_templates: [
      { id: "ft-demo-lesson-1", npc_id: "npc-demo", poster_pool: [], kind: "celebrate", trigger: "lesson_complete", condition: { unitId: "radioactivity", lessonId: "half-life" }, text: "You finished “{lesson}”.\n\nWell done.", chip: "lesson", reactors: ["npc-ada", "npc-hal"], weight: 2 },
      { id: "ft-demo-plain", npc_id: "npc-demo", poster_pool: [], kind: "nudge", trigger: "comeback", condition: {}, text: "Come back soon.", chip: null, reactors: [], weight: 1 },
      { id: "ft-shared-streak", npc_id: null, poster_pool: ["learner"], kind: "milestone", trigger: "streak", condition: { days: 7 }, text: "Seven days in a row.", chip: null, reactors: [], weight: 1 },
    ],
  },
  blog: {
    blog_posts: [
      { id: "blog-demo", npc_id: "npc-demo", unit_id: "demo-unit", lesson_id: "half-life", position: 0, title: "A demo post", hook: "It shows every kind of block.", cover: "atom", read_min: 2, unlock: { trigger: "unit_complete", unitId: "demo-unit" }, reactors: ["npc-ada"], blocks: [{ t: "h", text: "A heading" }, { t: "p", text: "A paragraph.\n\nWith two parts." }, { t: "quote", text: "A quote." }, { t: "fact", text: "A fact." }, { t: "figure", ref: "atom", caption: "A picture." }, { t: "figure", ref: "orbit" }, { t: "list", items: ["one", "two: with a colon", "three"] }, { t: "next", label: "Try it", lessonId: "half-life" }, { t: "next", label: "Meet Ada", unitId: "radioactivity" }] },
      { id: "blog-demo-two", npc_id: "npc-demo", unit_id: "demo-unit", lesson_id: null, position: 1, title: "Second", hook: "Plain.", cover: "atom", read_min: 1, unlock: { trigger: "none" }, reactors: [], blocks: [{ t: "p", text: "Only this." }] },
    ],
    blog_comments: [
      { id: "bc-demo-ray", blog_id: "blog-demo", npc_id: "npc-ray", position: 0, text: "Plain words.", chip: { entryId: "atom" } },
      { id: "bc-demo-ada", blog_id: "blog-demo", npc_id: "npc-ada", position: 1, text: "ooh~", chip: null },
    ],
    blog_references: [{ blog_id: "blog-demo", reference_id: "ref-a" }, { blog_id: "blog-demo", reference_id: "ref-b" }],
  },
};
