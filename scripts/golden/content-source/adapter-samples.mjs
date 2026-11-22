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
  curriculum: {
    units: [
      { id: "demo-unit", position: 2, title: "A demo unit", subtitle: "Shows everything", description: "A longer description.\n\nTwo paragraphs.", goal: "Know the demo.", guidebook: { summary: "A summary of the unit.", termIds: ["atom", "matter"], note: { extra: 1 } }, icon: "Atom", tone: "accent", teacher_npc_id: "npc-demo" },
      { id: "plain-unit", position: 1, title: "Plain", subtitle: "", description: "", goal: "", guidebook: {}, icon: "", tone: "primary", teacher_npc_id: null },
    ],
    unit_references: [{ unit_id: "demo-unit", reference_id: "ref-a", position: 0 }, { unit_id: "demo-unit", reference_id: "ref-b", position: 1 }],
    path_nodes: [
      { id: "d-n1", unit_id: "demo-unit", position: 0, kind: "lesson", lesson_id: "demo-lesson", config: {} },
      { id: "d-n2", unit_id: "demo-unit", position: 1, kind: "practice", lesson_id: null, config: { questionCount: 8, earlierShare: 0 } },
    ],
    objectives: [
      { id: "d-obj-1", unit_id: "demo-unit", position: 0, statement: "Know the first thing.", misconception: "The first thing is false." },
      { id: "d-obj-2", unit_id: "demo-unit", position: 1, statement: "Know the second thing.", misconception: null },
    ],
    items: [
      { id: "d-l1-choice", objective_id: "d-obj-1", type: "choice", data: { prompt: "Which is made of atoms?", options: [{ id: "a", label: "Air", art: "air" }, { id: "b", label: "Light", note: "Energy, not matter." }], answer: "a", explanation: "Air is matter." }, difficulty: 2, surfaces: ["lesson", "practice"], reference_ids: ["ref-a"] },
      { id: "d-l1-figure", objective_id: "d-obj-1", type: "choice", data: { prompt: "Read the picture.", figure: { ref: "half-life-bars", caption: "Bars." }, options: [{ id: "a", label: "Half" }, { id: "b", label: "All" }], answer: "a", explanation: "Half." }, difficulty: 1, surfaces: ["lesson", "practice", "checkpoint"], reference_ids: [] },
      { id: "d-l1-tom", objective_id: "d-obj-1", type: "true_or_myth", data: { statement: "Atoms are small.", answer: "true", explanation: "True." }, difficulty: 1, surfaces: ["lesson"], reference_ids: ["ref-a", "ref-b"] },
      { id: "d-l1-hotspot", objective_id: "d-obj-2", type: "hotspot", data: { prompt: "Tap it.", scene: { height: 40, shapes: [{ t: "circle", x: 50, y: 20, r: 5, tone: "danger", fill: "solid" }] }, targets: [{ id: "n", label: "The nucleus", x: 50, y: 20, r: 6 }], answer: "n", explanation: "That one.", animateOnCorrect: true }, difficulty: 1, surfaces: ["lesson"], reference_ids: [] },
      { id: "d-l1-sort", objective_id: "d-obj-2", type: "sort", data: { prompt: "Sort.", buckets: [{ id: "x", label: "X", icon: "AqAtom" }], items: [{ id: "i", label: "I", bucket: "x" }], explanation: "Sorted." }, difficulty: 1, surfaces: ["practice"], reference_ids: [] },
    ],
    lessons: [
      { id: "demo-lesson", unit_id: "demo-unit", title: "A demo lesson", description: "What it covers.", estimated_minutes: 4, xp_reward: 40, teaches: ["d-obj-1", "d-obj-2"], relies_on: [] },
      { id: "other-lesson", unit_id: "demo-unit", title: "Another", description: "", estimated_minutes: 3, xp_reward: 0, teaches: [], relies_on: ["d-obj-1"] },
    ],
    lesson_references: [{ lesson_id: "demo-lesson", reference_id: "ref-a", supports: "Matter has mass.", position: 0 }, { lesson_id: "demo-lesson", reference_id: "ref-b", supports: "", position: 1 }],
    lesson_cards: [
      { lesson_id: "demo-lesson", id: "c01", position: 0, kind: "teach", type: "explain", tier: "core", item_id: null, scored: 0, data: { title: "A title", body: "First bubble.\n\nSecond bubble.", figure: { ref: "atom-model", args: [2, 2, 2], caption: "An atom." }, figureAt: 1 } },
      { lesson_id: "demo-lesson", id: "c02", position: 1, kind: "item", type: "item", tier: "core", item_id: "d-l1-choice", scored: 1, data: {} },
      { lesson_id: "demo-lesson", id: "c03", position: 2, kind: "item", type: "item", tier: "deeper", item_id: "d-l1-tom", scored: 0, data: { connected: true } },
      { lesson_id: "demo-lesson", id: "c04", position: 3, kind: "teach", type: "story", tier: "deeper", item_id: null, scored: 0, data: { speaker: "npc-demo", tag: "1911", title: "A story", body: "Long ago.", figure: { scene: { height: 30, shapes: [] }, altText: "An empty picture used as a test." }, figureAt: 0 } },
      { lesson_id: "demo-lesson", id: "c05", position: 4, kind: "teach", type: "reveal", tier: "core", item_id: null, scored: 0, data: { predictCardId: "c01", title: "Answer", body: "Here it is.", figure: { ref: "half-life-bars", altText: "My own alt text for the bars." } } },
      { lesson_id: "demo-lesson", id: "c06", position: 5, kind: "sim", type: "atom-builder", tier: "core", item_id: null, scored: 0, data: { task: "Build helium.", hint: "Add particles.", mode: "build", goal: { protons: 2, neutrons: 2, electrons: 2 }, objectives: ["d-obj-1"] } },
      { lesson_id: "other-lesson", id: "c01", position: 0, kind: "teach", type: "explain", tier: "core", item_id: null, scored: 0, data: { body: "Same card id, another lesson.", figure: { ref: "zoom-chain" } } },
    ],
  },
  i18n: {
    content_translations: [
      { locale: "es", entity: "chat_nodes", entity_id: "chat-demo-greeting", fields: { title: "Charla con Demo", text: "Hola.\n\n¿De qué quieres hablar?", "replies[0].label": "la lección", "replies[2].label": "Abre el átomo", "replies[10].label": "diez" } },
      { locale: "es", entity: "lesson_cards", entity_id: "demo-lesson/c01", fields: { "data.title": "Vida media" } },
      { locale: "es", entity: "mythbuster_questions", entity_id: "mb-easy-q1", fields: { "options[1]": "Protón" } },
      { locale: "pt-BR", entity: "myths", entity_id: "myth-demo", fields: { title: "Mito" } },
    ],
  },
};
