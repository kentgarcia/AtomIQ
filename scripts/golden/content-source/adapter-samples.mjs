/**
 * Small hand-made rows for each real adapter, using every construct it has. They are pinned as golden files in
 * golden/content-source/adapters-v1/<adapter>/ (test T2) and read back (T8). Changing an adapter's canonical form fails the
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
  references: {
    content_references: [
      { id: "ref-demo-iaea", kind: "official", publisher: "IAEA", title: "Radiation in everyday life", authors: "", year: "2020", url: "https://www.iaea.org/topics/radiation", accessed: "", verified: 1, note: "" },
      { id: "ref-demo-book", kind: "textbook", publisher: "OpenStax", title: "Chemistry 2e", authors: "Flowers, Theopold", year: "", url: "", accessed: "2026-01-12", verified: 0, note: "Chapter 2." },
      { id: "ref-demo-plain", kind: "official", publisher: "WHO", title: "Ionizing radiation", authors: "", year: "", url: "", accessed: "", verified: 0, note: "" },
    ],
  },
  encyclopedia: {
    encyclopedia_entries: [
      { id: "demo-curie", term: "Marie Curie", definition: "A physicist.\n\nShe found two elements.", category: "people", related_terms: ["radium", "polonium"], quick_facts: ["Two Nobel prizes", "Coined radioactivity"], sources: [{ organization: "Nobel Prize", title: "Biography", url: "https://example.org/a" }], image: "/assets/images/people/curie.webp", debunking_snippet: "She did not die at once.", related_myths: ["demo-myth"], difficulty: "intermediate" },
      { id: "demo-atom", term: "Atom", definition: "The smallest unit of an element.", category: "science", related_terms: [], quick_facts: [], sources: [], image: null, debunking_snippet: null, related_myths: [], difficulty: "beginner" },
    ],
  },
  myths: {
    myths: [
      { id: "demo-myth", title: "A demo myth", myth_statement: "Radiation is new.", reality: "It is as old as the universe.", explanation: "A long answer.\n\n- one\n- two", category: "safety", difficulty: "medium", sources: [{ title: "T", url: "https://example.org/b", author: "IAEA", type: "official" }], related_facts: ["fact-a"], related_lessons: ["half-life"], image: "https://example.org/i.jpg", tags: ["radiation", "natural"], popularity: 7 },
      { id: "demo-plain-myth", title: "Plain", myth_statement: "Short.", reality: "Shorter.", explanation: "", category: "safety", difficulty: "easy", sources: [], related_facts: [], related_lessons: [], image: null, tags: [], popularity: 0 },
      { id: "demo-other", title: "Other category", myth_statement: "A.", reality: "B.", explanation: "C.", category: "waste", difficulty: "easy", sources: [], related_facts: [], related_lessons: [], image: null, tags: [], popularity: 0 },
    ],
  },
  mythbuster: {
    mythbuster_questions: [
      { id: "mb-demo-easy-1", difficulty: "easy", type: "multiple_choice", question: "What is the smallest unit of matter?", options: ["Molecule", "Atom", "Cell", "Proton"], correct_answer: 1, explanation: "An atom is.", points: 5, position: 0 },
      { id: "mb-demo-easy-2", difficulty: "easy", type: "multiple_choice", question: "Which is longer?\n\nThink about it.", options: ["a", "b"], correct_answer: 0, explanation: "a is.", points: 10, position: 1 },
      { id: "mb-demo-hard-1", difficulty: "hard", type: "multiple_choice", question: "Hard one?", options: ["yes", "no", "maybe", "ask"], correct_answer: 3, explanation: "Ask.", points: 5, position: 0 },
    ],
  },
  statements: {
    unit_statements: [
      { id: "demo-unit-s01", unit_id: "demo-unit", position: 0, statement: "Everything is made of atoms.", verdict: "fact", explanation: "Even air is." },
      { id: "demo-unit-s02", unit_id: "demo-unit", position: 1, statement: "Atoms are mostly solid.", verdict: "myth", explanation: "They are mostly empty space.\n\nVery empty." },
    ],
  },
  scanner: {
    scan_targets: [
      { id: "scan-demo-water", name: "A glass of water", scene: "kitchen", object: "water", blurb: "Every drop is the same.", composition: [{ symbol: "H", note: "two atoms in each molecule" }, { symbol: "O" }], fun_fact: "Always two to one.", atomdex_entry_id: null, position: 0 },
      { id: "scan-demo-salt", name: "Salt", scene: "kitchen", object: "salt", blurb: "A shake of salt.", composition: [{ symbol: "Na" }, { symbol: "Cl" }], fun_fact: "Joined as ions.", atomdex_entry_id: "ion", position: 1 },
      { id: "scan-demo-gold", name: "Gold", scene: "treasure", object: "gold", blurb: "Shiny.", composition: [{ symbol: "Au" }], fun_fact: "Made in stars.", atomdex_entry_id: null, position: 0 },
    ],
    scan_target_references: [{ target_id: "scan-demo-water", reference_id: "ref-a" }, { target_id: "scan-demo-water", reference_id: "ref-b" }, { target_id: "scan-demo-salt", reference_id: "ref-a" }],
  },
  safety: {
    safety_cards: [
      { id: "safety-demo-tds", section: "basics", title: "Time, distance, shielding", summary: "Three ways to lower the dose.", steps: ["Time: less is better.", "Distance: farther is better."], icon: "Timer1", entry_id: "shielding", position: 0 },
      { id: "safety-demo-bg", section: "basics", title: "Background", summary: "It is everywhere.", steps: ["Radon is most of it."], icon: "Sun1", entry_id: null, position: 1 },
      { id: "safety-demo-myth", section: "myths", title: "A myth", summary: "Not true.", steps: ["Say so."], icon: "Danger", entry_id: null, position: 0 },
    ],
    safety_card_references: [{ card_id: "safety-demo-tds", reference_id: "ref-a" }, { card_id: "safety-demo-tds", reference_id: "ref-b" }, { card_id: "safety-demo-myth", reference_id: "ref-a" }],
  },
  map: {
    map_sites: [
      { id: "site-demo-paris", name: "Paris, the shed", place: "Paris, France", kind: "discovery", year: "1898", lat: 48.84, lon: 2.35, blurb: "Where radium was announced.", fact: "They worked in an old shed.", entry_id: "marie-curie", position: 0 },
      { id: "site-demo-nowhere", name: "Nowhere", place: "Somewhere", kind: "natural", year: "1.7 billion years ago", lat: -1.5, lon: 13, blurb: "A natural reactor.", fact: "It ran by itself.", entry_id: null, position: 1 },
    ],
    map_site_references: [{ site_id: "site-demo-paris", reference_id: "ref-a" }, { site_id: "site-demo-paris", reference_id: "ref-b" }],
  },
};
