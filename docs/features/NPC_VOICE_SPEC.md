# NPC voice: how each character talks

**Status:** built for Hal and Ada (2026-11-22, pushed to the extreme the same day: five story threads each, small talk in the free chat, see below); the other five have their feed posts and get chats and blog pieces with their units.
**Applies to:** `chat_nodes`, `feed_templates`, `blog_posts` and `blog_comments`. **Not** lessons.

## The rule

- **Lessons share one tone.** Everything a teacher says inside a lesson (lecture bubbles, story cards, the lesson intro, meet, sign-off and tease lines in `npc_lines`) is written in the same plain, friendly voice, whoever the teacher is. Nothing in `npc_lines` uses an exclamation mark (`test:voice`).
- **Chat, feed and blog are in character.** The tone comes from the character's design: how they look says how they talk. Every character has **their own** feed templates, so a post sounds like the person who posts it; there are no templates shared by several posters any more.

## Hal and Ada are pushed to the extreme (2026-11-22)

A voice that only tints a plain sentence reads as one author with two hats. These two are written so that you could tell them apart from one bubble.

**Ada texts like a best friend.** Lowercase, a **`~`** now and then for an expression ("you'll see~", "i think~"), never a habit: at most one in a bubble, never in two bubbles in a row, roughly one bubble in six or seven, never on a reply label, a title or a subject line. Stretched words (heyyy, soooo), hehe, eep, ooh, wait wait wait, an interruption in brackets, a capital only for emphasis (HELLO, ALL). She names things: her flask is **Sparkle**, her beaker is **Gary**, her left bow is always crooked or green or in a flask. Her bubbles are short; she goes off on tangents (a snack appointment at 3, three small explosions) and comes back ("ok anyway"). Never baby talk, never an emoji; at most two "!" in a message (her `~` and "hehe" carry the rest).

**Hal is slow, formal and deadpan.** Whole sentences, capitals, no `~`, no "!". "Ah." "Hm." "Forgive me." He counts and corrects himself, reports exact small facts ("Eleven minutes. I counted."), and says very silly things in a flat voice ("I have been told so by several people and one pigeon."). He names his rocks (**Reginald**, **Doris**, a flat one called **Tuesday**, a big one called Gerald) and keeps three pebbles called Twelve, Thirteen and Fourteen. He is never in a hurry ("Slowly, then.") and ends things plainly.

They also notice each other: Hal warns the learner that Ada is "a great deal", Ada says Hal always calls her loud, and the learner can say so back in her first message. Running jokes (Tuesday, Sparkle, Gary) come back in later threads.

## Writing a conversation, not a template

A story thread must not feel like a topic poured into a form. The checks that can be automated are in `test:voice`; the rest is the writer's job.

1. **The learner's reply is their message.** A reply label is shown as the learner's own blue bubble, so write what a person would type ("wait, THAT small?", "ok but which pebble is which lol", "aw, that's sweet"), never a menu word like "Continue". The character's next bubble answers those very words.
2. **Each thread starts differently and takes its own shape.** Hal sits in an empty stadium with a marble; Ada is eating a banana, or has 100 gummy bears and a rule; one opens with an apology for typing slowly, one with a spilled flask. The test fails if two stories of a character have the same shape (same number of nodes, same kinds of replies in the same order). Some replies take a different road, some converge, some end the thread on a joke or a sticker.
3. **The science is carried by something the character does.** A marble, three pebbles, a bag of gummy bears, a banana; never a paragraph that explains and then asks "Got it?". The facts are still exactly the lessons' facts, and a wrong guess by the learner is answered kindly and specifically (Ada: "ooh so close~").
4. **Small talk is real.** The free chat has things to ask that are not about the course: what are you doing, what is in the satchel, what is in the flask. These are where the character lives, and none of them claims a science fact.
   **A free chat has its own shape per character, not one menu in two voices.** Ada checks in ("how are we doing today?") and answers the mood: a good day gets a quiz, a tired one something tiny or nothing, a stuck one the thing that is stuck, chaos gets chaos; small talk (Sparkle, Gary, Hal, the snack appointment) sits behind "just here to chat". Hal reads out a numbered list ("four things, and a fifth: nothing") and the learner answers with a number; "four" opens his rocks (Reginald, Doris, Tuesday, the satchel, what he is weighing) and "five" is sitting in silence for thirty-one seconds. A new character's free chat should find its own way in, not copy these. The "remind me" pages only restate what a lesson teaches. Both free chats end on the same shared `chat-<npc>-bye`, which the welcome-back story also uses, so leave that node alone.
5. **Short bubbles.** A blank line starts a new bubble that arrives after typing dots; write the way a person sends messages, not a paragraph cut in three.
6. **Callbacks.** A thread may remember another (Tuesday, Hal's warning about Ada, Gary the beaker).

## The cast

| Character | Design says | Tone | Habits | Never |
|---|---|---|---|---|
| **Hal** (Unit 1) | Oval face, a cloud of golden hair, pale lab coat, a satchel and a rock sample | Formal, slow, exact, deadpan (extreme, see above). | Whole sentences. "Ah." "Hm." "Take your time." "Slowly, then." Named rocks. A flat, silly aside. | `!`, `~`, hurry, slang, lower case. |
| **Ada** (Unit 2) | Feminine and cute: pink, pigtails with bows, round cheeks, sparkle eyes, a glowing flask | Bubbly, giggly, texts like a best friend (extreme, see above). | An occasional `~` for an expression, "hehe", "eep", "soooo", lower case. Sparkle the flask, Gary the beaker, the crooked bow. | Baby talk, emoji, more than two "!" |
| **Ray** | Deep skin, glasses, hoodie, a clipboard | Practical, blunt, brief. | Fragments and orders: "Noted." "Checked off." "Go do it." The blog's "Plain words:". | Fluff, exclamation marks, softening. |
| **Mina** | Warm, a clinician, a stethoscope | Reassuring and unhurried; calm about risk. | "That is okay." "At your own pace." "Take a breath." Speaks to how the learner feels. The blog's "Calm note:". | Pressure, alarm, exclamation marks. |
| **Kofi** | Energetic engineer, beard, a hard hat | Upbeat builder. | Build words: foundation, solid, brick by brick, engine, "Hard hat is on." "!" is fine. | Dithering, doom. |
| **Tess** | Quick, loves gadgets, a wrap, tiny round glasses | Fast and punchy. | "Ping." "Unlocked." "Quick one:" "Zoom!" Short bursts, a gadget metaphor. | Long sentences, solemnity. |
| **Sage** (they/them) | Thoughtful, the one who weighs both sides | Measured and fair. | "On one hand... on the other." Ends on a question. "Worth asking." | Exclamation marks, taking a side too fast. |

Shrodi (the guide) is his own plain, friendly voice and is not part of this table.

## What stays the same for every voice

- The **facts** are exactly the lesson's facts (rule R3 of the NPC spec): a voice changes how a thing is said, never what is claimed. A joke is never a fact.
- The limits of each kind hold: a post is at most 220 characters, at most two "!" and never "!!"; a chat message is at most six bubbles of 240 characters; a blog comment is at most 200 characters (`feed-rules.mjs`, `chat-rules.mjs`).
- Plain text, no emoji. A character's expression comes from words, a pose or one of the chat stickers and reactions.
- The same placeholders as always (`{lesson}`, `{unit}`, `{name}`, `{rival}`).

## Where the words live

| Surface | Source | What it holds |
|---|---|---|
| Feed, unit posts | `scripts/content-migration/feed-content.mjs`, `UNITS` | the lesson, checkpoint, tease, unit and test-out posts of a unit's teacher (and the neighbour's unit post) |
| Feed, shared posts | the same file, `VOICES` and `SHARED_SHAPES` | per character: a daily and a weekly chest, passing and being passed in the ranking, a first lesson, coming back after 3 and after 14 days, the daily quests done. The streak posts are the learner's own voice |
| Blog | the same file, `BLOGS` | the author's title, hook and paragraphs; each comment is by the commenter, in their voice |
| Chat | `scripts/content-migration/add-chat-nodes.mjs`, `HAL` and `ADA` | greeting, menu, free-chat answers and small talk, five story threads each (first message, a lesson-count story or two, a level or lesson story, the end of the unit, welcome back) |
| Lessons | `components/npc/npc-roster.ts` `NPC_LINES` and the `npc_lines` table | the plain shared tone |

When you add chat nodes there, put them at the END of the teacher's list: a node's `position` is its index, so inserting in the middle moves every story node after it. To put a chat change into the master without re-running everything, `node --no-warnings scripts/content-migration/add-chat-nodes.mjs --overwrite --npc npc-hal,npc-ada` rewrites only those two teachers' chat nodes from the file (it never deletes, so a node removed from the file must also be deleted with `content:edit`). Check first what it would change by running it on a copy of the master with `--db`; the master must match the file, or a Studio edit to a story would be reset. `node --no-warnings scripts/content-migration/apply-npc-voices.mjs` applies them to the master DB (backup first, a draft until published). It resets the seeded rows to the file, so an edit made in Content Studio to one of them is replaced.

## Adding a character's voice (a new unit)

1. Add their row to `VOICES` in `feed-content.mjs` (all eight moments), their unit's posts to `UNITS`, and a `TONE` line to `scripts/test-npc-voice.mjs`.
2. Write their chat in `add-chat-nodes.mjs` (a greeting, a menu, a next, a quiz, a remind and a sign-off, a unit-complete and a welcome-back story, and one story of their own that begins with something only they would say) and list it in `THREADS`.
3. Write the unit's blog pieces in their voice.
4. `npm run test:voice`, `npm run validate:content`.

`test:voice` checks that every character has a post for every shared moment, that no two posters share words, that the calm ones never shout and the lively ones do, that Ada keeps her giggle, that lessons stay plain, and that each unit's posts and blogs are spoken by the unit's teacher.

## Bios

A teacher's bio (on their profile and the meet-your-teacher card) is written as them, in the first person, in their own tone: Hal formal ("I am Hal..."), Ada lowercase with a single `~`, Ray blunt, Mina calm, Kofi and Tess upbeat, Sage measured. The calm characters use no "!". The words are in `components/npc/npc-roster.ts` and `set-npc-bios.mjs` writes them to the `npcs` rows; `test:voice` checks them.
