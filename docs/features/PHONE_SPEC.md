# AtomIQ: Phone Specification

**Status:** Phases 0 to 4 built (2026-11-20; phase 4 is the Camera, the Safety Guide and the Nuclear Map, see the last section). Phases 0, 1, 2 and 3 built (revision 5). Phase 0: the Phone tab replaces Guide, the home screen, `phone-core` (catalog, unlocks, badges, `phone_seen`), the install moment and first-open hand-over, the tab dot, Chats (Shrodi only), Contacts, the launchers and the AtomDex rename. Phase 1: Field Notes (list, search, editor with autosave, clippings from AtomDex entries and daily facts), the Reference Library, the privacy and terms text (`LEGAL_VERSION` 2.1) and the notebook wiped by Delete Account; `test:field-notes`, `test:library`. Typecheck, lint and the gates pass and Metro bundles; nothing has been seen on a screen or a device. Phase 2: NPC chats (Ada and Hal), `chat_nodes` and `chat_messages`, unprompted messages with the one-a-day cap, `test:chats`. Phase 3: the Atom Scanner (twelve targets in four scenes, each with a source, scan history, AtomDex link, "Add to Field Notes", Ada's message, `LEGAL_VERSION` 2.3), `test:scanner`; its sources are not yet checked by a person, so the publish gate will stop until they are. Phase 4 is not started (the Safety Guide and Camera rows are `status: "planned"` and never shown). Where the build differs from the draft, §15 says how. Decisions taken on the learner's behalf are in §14.
**Owner:** AtomIQ product, design and engineering
**Applies to:** `app/(tabs)/chat.tsx` (retired, replaced by `app/(tabs)/phone.tsx`), new `app/phone-apps/` (the phone's own apps), `components/phone/`, `services/phone-core.ts` + `chat-core.ts` + `scanner-core.ts` + `field-notes-core.ts` + `phone-fx-core.ts` and their runtime glue, new content tables (`scan_targets`, `safety_cards`, `chat_nodes`) in `scripts/content-migration/schema.sql`, new user-state tables (`field_notes`, `phone_seen`, `scans`, `chat_messages`, `photos`) in `services/local-first/schema.ts`, `theme/tab-bar-metrics.ts` and `app/(tabs)/_layout.tsx` (tab label and icon), `services/media-core.ts`, `hooks/use-android-back.ts`, `scripts/check-tab-bar-clearance.mjs`, `scripts/test-media-policy.mjs`, Content Studio
**Builds on:** `docs/features/NPC_TEACHERS_SPEC.md` (the cast), `docs/features/NPC_FEED_SPEC.md` (Feed stays its own tab), `services/guide/*` (the rule-based assistant, kept as Shrodi's chat engine), the Encyclopedia (`app/encyclopedia.tsx`, `app/explorer/encyclopedia*.tsx`), Daily facts (`app/daily-facts.tsx`, `services/daily-facts*.ts`), the Shop (`app/shop.tsx`), Settings (`app/settings.tsx`), `content_references` and its link tables, `components/ui/custom-icons.ts`, `components/motion/` and `docs/features/MICRO_INTERACTION_SPEC.md`

## 1. Goal

The Guide tab is one screen that answers questions in a chat. It is the only place that talks to the learner as a "helper", and everything else in the app is reached from somewhere else (the Profile header for Shop and Settings, Discover's circles for the Encyclopedia and Daily facts, the unit card for references). The learner has no single place that says "here is everything I can do besides the lessons".

The Guide tab becomes **Phone**: the learner's own fictional smartphone, in the manner of the NookPhone in Animal Crossing: New Horizons. Instead of disconnected menus, the app's side systems are **apps on a home screen**. The phone is not static: it starts with a few apps and the app **installs new ones as the learner progresses**, each arriving with a small moment, usually introduced by the teacher whose lesson earned it.

| Part | What it is |
|---|---|
| **Home screen** | A grid of app icons with badges, on the learner's own paint and pattern. The phone's whole UI. |
| **Apps** | Twelve at full growth (§5): Contacts, Chats, Shop, Camera, Safety Guide, Nuclear Map, AtomDex, Atom Scanner, Daily Fact, Field Notes, Reference Library, Settings. All twelve are built and fill exactly one page of the grid (`APPS_PER_PAGE` is 12). |
| **Evolution** | Apps unlock from progress the app already tracks (§6). The learner is told by an install moment and a dot on the tab. |

Principles:

1. **A door, never a gate.** Unlocking an app adds a way in. It never removes or hides a feature that exists elsewhere today (Shop stays on Profile, Settings stays on Profile, the Encyclopedia stays on Discover). Only the *new* features (Scanner, Field Notes, Camera, Safety Guide, Reference Library, NPC chats) live only here.
2. **Offline, simulated and honest.** No network, no device camera, no location, no microphone. The scanner and camera are drawn simulations over authored content (§8, §9). Nothing claims a real person wrote or did anything.
3. **Reuse before building.** Six of the twelve apps are launchers into screens that already exist. The work is the home screen, the unlock rules, and four genuinely new apps.
4. **In the cast's voice.** Contacts and Chats are NPCs from the existing cast plus Shrodi. Nobody else exists on the phone.
5. **The learner reads and taps.** Chats are pill-driven, like the Guide is today: no free-text box, so nothing to moderate. The one exception is **Field Notes**, which is private, local, never shown to anyone and never posted (§10).
6. **Calm.** A dot and a badge, no popups, no sounds on a schedule. A new app arrives once.
7. **Optional.** Nothing needed to learn lives only on the phone. Badges can be switched off.

### Non-goals

- Real messaging, friends, calls, or any network feature.
- Using the device camera, photo library, contacts, location or notifications. App permissions stay `INTERNET` only (checked by `test:legal`).
- Generated text (no LLM). Fixed, reviewed content only.
- Online or tiled maps for the Nuclear Map (§5.8): it draws one bundled, flat world and no location.
- Changing the Feed. Discover stays the Feed tab with its four circles (Encyclopedia, Periodic table, Daily facts, Lab), apart from renaming the Encyclopedia to AtomDex in the learner-facing text (§5.6).
- Any change to XP rules beyond the small hooks listed in §11.

## 2. Current baseline

- The tab bar has six tabs (`TAB_BAR_TAB_COUNT`): Home, Quests, Feed, **Guide** (`name: "chat"`, icon `ai.png`), Games, Profile. Tab icons are PNGs in `assets/images/icons/`.
- `app/(tabs)/chat.tsx` (523 lines) is the Guide: a landing (`components/guide/GuideLandingCards.tsx`: info card, focus areas for weak topics, quick starts per intent, the cast) and a pill-driven conversation (`GuideBubble`, `Pill`, `ContentCard`) over the rule engine in `services/guide/` (`engine.ts`, `topics.ts`, `navigate.ts`, `context.ts`). It hides the tab bar while in a conversation. The cast is shown through `GuideTeachers` (a Meet sheet).
- `chat` is named in four more places that must move with it: `hooks/use-android-back.ts` (`TAB_ROOTS`), `services/media-core.ts` (surface `guide`), `scripts/check-tab-bar-clearance.mjs`, `scripts/test-media-policy.mjs`. No code pushes to `/chat`; `services/guide/navigate.ts` only goes to other routes, so no redirect is needed.
- The cast is seven NPCs (Hal, Ada, Ray, Mina, Kofi, Tess, Sage, `components/npc/npc-roster.ts`), each owning a unit (`units.teacher_npc_id`). **Only two units exist** (Inside the Atom with Hal, Radioactivity with Ada). Every NPC has a profile screen (`app/npc/[id].tsx`).
- Screens that already exist and can be launched: Shop (`app/shop.tsx`), Settings (`app/settings.tsx`), Encyclopedia (`app/encyclopedia.tsx`, 115 entries, of which 4 are in the `safety` category), Daily facts (`app/daily-facts.tsx`, `daily_facts_read`), Periodic table, Lab.
- References: `content_references` (13 rows) with `unit_references`, `lesson_references` and `blog_references`, verified or not; today they open from a "References & resources" button on the Home unit card.
- The user-state DB has an unused local-first `bookmarks` table (types `post`, `article`, `lesson`, `myth`) and a `notifications` table that nothing reads. Neither fits Field Notes or the phone's badges; this spec does not use them.
- Routes outside `(tabs)` (Shop, Settings, Encyclopedia...) already show no tab bar. The phone's apps follow that: they are root-stack routes, and "back" is the home button.
- `docs/features/NPC_FEED_SPEC.md` says "There is no phone, home screen or app grid" and lists "any phone or app metaphor" as a non-goal. Both lines meant the Feed; they are reworded in the same commit as this spec to point here.

## 3. The Phone tab

- The tab's route is `app/(tabs)/phone.tsx`, its label **Phone**, its `name` `phone`. `TAB_BAR_TAB_COUNT` stays 6.
- It needs a new tab icon (a flat phone in the style of the other five PNGs); `ai.png` is also used by onboarding's `HowStep`, which keeps it until that step is reworded (§13).
- The home screen shows the tab bar like every other tab page. Apps are pushed routes above the tabs, so the bar is hidden inside them. The Guide's special "hide the bar in conversation" rule goes away with it; `check-tab-bar-clearance` is updated to require the standard bottom clearance on `phone.tsx` instead of `useHideTabBar`.
- Android back: inside an app it pops to the phone; the phone is a tab root (`TAB_ROOTS` gets `/phone`, loses `/chat`).
- Media policy: route `/phone` is surface `phone` (UI clicks on, game SFX off, music off), the same as `guide` was. App routes under `/phone/` use the same surface; `/lab` and the platformer keep their own.

## 4. The home screen

A full-width page, not a device drawn on the page: the phone is the tab. Top to bottom:

1. **Title row** (inside the standard safe-area frame): the plain title "Phone" at the left, the learner's avatar at the right. No clock, battery or signal; they would be decoration that looks broken (the clock was dropped after phase 1).
2. **Wallpaper**: the learner's equipped avatar **paint** and **pattern** (`AvatarConfig.background` and `pattern`, drawn with the existing `PatternLayer`, at the same soft strength). It is a free, automatic payoff for buying paints and patterns; nothing new is sold. The default avatars already have a paint, so there is always a wallpaper.
3. **Icon grid**: four columns (three below `denseBelowWidth`), the apps in catalog order. Each icon is a rounded-square tile in the app's colour with the 3D face-and-lip look of the lesson map's nodes, a white glyph, and the name beneath in one line (two at large text). Twelve icons a page; more than that adds a second page with dots under the grid (the catalog has room for 11 + 1 reserved, so one page ships).
4. **Badges**: a small red count (or a dot for "New") on the icon's corner, out of layout so nothing moves.

Icon states: unlocked, **new** (just installed and not yet opened: a "New" dot), and **locked**. Every live app is on the grid from the start (revision 7): a locked one is a grey tile with a lock and no badge, and pressing it opens a dialog with its unlock condition and, where it counts, how far the learner is (`unlockRequirement` in `phone-core.ts`). An app that is unlocked but waiting for the next visit to install shows the lock too, and its dialog says it arrives next time.

Pressing an icon sinks it to 92% and swaps its face to the lip colour (the node bubble's press), release pops it back (120 ms, ease-out) as the route pushes with the app's fade. Reduced motion keeps only the colour change.

Empty and failure states: if the unlock query fails, the phone shows the starter apps only. A failed badge query shows no badges. Nothing throws on the phone's home.

### First open: "Your phone"

The first time the tab opens the five starter icons arrive one by one (the install pop, §7) over the wallpaper. There is no line from Shrodi any more: the tour (`docs/features/TUTORIAL_SPEC.md`) introduces the phone. `STORAGE_KEYS.PHONE_INTRO_SEEN` is kept as a key but no longer read or written. Skipped with reduced motion (icons just there). Onboarding's welcome step does not change.

## 5. The apps

Catalog order is the grid order. `Source` says whether the screen exists today.

| # | App | Colour | What it does | Source | Installs |
|---|---|---|---|---|---|
| 1 | **Chats** | blue | Conversations with Shrodi and the NPCs (§5.2) | Guide engine, new thread UI | start |
| 2 | **Contacts** | green | The cast: who you have met (§5.1) | new list over `app/npc/[id].tsx` | start |
| 3 | **AtomDex** | purple | The Encyclopedia, renamed (§5.6) | `app/encyclopedia.tsx` | start |
| 4 | **Daily Fact** | yellow | Today's fact and the ones read (§5.7) | `app/daily-facts.tsx` | start |
| 5 | **Settings** | grey | Settings (§5.3) | `app/settings.tsx` | start |
| 6 | **Shop** | orange | Opens the Shop | `app/shop.tsx` | first lesson completed |
| 7 | **Field Notes** | teal | A private notebook (§10) | new | 2 lessons completed |
| 8 | **Atom Scanner** | cyan | Scan everyday things to see what they are made of (§8) | new | unit *Inside the Atom* completed |
| 9 | **Reference Library** | indigo | Every source the app cites, in one list (§5.10) | new over `content_references` | level 3 |
| 10 | **Camera** | pink | Photo mode with your avatar and the cast (§9) | new | first shop item owned |
| 11 | **Safety Guide** | red | Radiation and nuclear safety, plain and sourced (§5.9) | new | unit *Radioactivity* completed |
| 12 | **Nuclear Map** | blue | A flat world map with pins for places that matter in nuclear science (§5.8) | new | level 5 |

Colours come from the theme's roles (the lesson map's unit colours are the reference); no hardcoded neutrals. Glyphs use `Icon`; where the library has nothing that says it, a new `Aq...` icon is drawn in `custom-icons.ts` (needed: a scanner, a camera, a notebook, a shield with a cross for safety, a stack of books, an atom-in-a-bubble for AtomDex; `test:custom-icons` and `render-custom-icons.mjs` apply).

### 5.1 Contacts

A list of NPCs the learner has **met**, each a row (drawn head in a circle, name, title, the field in grey) under a large "Contacts" title; the row opens the NPC's existing profile (`app/npc/[id].tsx`), which gets two actions at the top: **Message** (opens that NPC's chat thread) and, as today, the cover and bio.

- **Met** is derived, never stored: an NPC is met when the learner has started any lesson in the NPC's unit, or the NPC has posted or reacted in the Feed, or the NPC appears in the learner's Ranks. Shrodi is a contact from the start but is not an NPC and shows as "Shrodi · Your guide" at the top.
- Unmet NPCs are not listed. With only two units shipped, two teachers plus Shrodi is a short list; that is correct and it grows with the curriculum.
- Contacts never shows more than the cast. There are no user-created contacts.

### 5.2 Chats

A list of threads (Shrodi, then NPCs by latest message), each with the last line, a time and an unread count; a thread opens a conversation in the Guide's existing bubble-and-pill form. **No text input.**

- **Shrodi's chat (revision 7) is the same chat flow as the teachers'.** His nodes are `chat_nodes` rows with `npc_id` `shrodi` (`CHAT_MASCOT_ID` in `chat-vocab.mjs` and `chat-core.ts`); `shrodi` is not a row of `npcs`, so he is not in the Feed or on the Ranks podium (`chat_nodes.npc_id` lost its foreign key; `add-chat-nodes.mjs` rebuilds the table), and the validator accepts the id. He is always in Contacts and New chat and can send stories like a teacher (`lessons_completed:1` "Your first lesson!"). His menu replaces the Guide's intents: what to do next (a link to the next lesson), explain something (the atom, isotopes, decay, half-life, each a link to its AtomDex entry), a quick Myth Buster round, a tour of the phone (links to AtomDex and Field Notes), and a sign-off. Shrodi has a thread in Chats from the first time the list is read (`ensureMascotChat`: a free chat with his greeting, unread, once, not again if it was archived), and his picture is the app icon (`assets/images/icon.png`, his face close up) cropped to the circle, shown by `components/phone/ChatHead.tsx` (`speakerFor` gives a name and either a teacher's drawing or this picture). A flat Duolingo-style redraw was tried and dropped. **Shrodi has a profile like a teacher's** (`/npc/shrodi`, the same screen as `app/npc/[id].tsx`): an orange cover of his glasses, an atom, a spark, a question mark, a bolt and an orbit (`NPC_COVER_GLYPHS.shrodi`), his round picture over its edge, "Your guide", a short bio, a Message button that is always there, a "Guides you through every unit" pill and a Stories list (the story threads he has sent; no posts, numbers or tabs, since he is not in the Feed). Contacts' card opens that profile and its round Message button opens his chat; no Chats screen goes to `app/phone-apps/shrodi.tsx` any more. **The old Guide screen (`app/phone-apps/shrodi.tsx`, `services/guide/*`, `components/guide/*`) is still in the repo, unlinked, and is to be removed in a clean-up.**
- **NPC threads** are short, authored and one field each. An NPC talks only about their unit and only in pre-written nodes (§7.3): a greeting, "What's next?" (points at the next lesson on the map), "Quiz me" (opens a practice or Myth Buster round for their unit), "Remind me what X is" (opens an AtomDex entry from their unit), and a sign-off. Replies are pills; the NPC answers with the next node. A thread can end; it can always be started again.
- **Story threads and free chats (revision 6).** A teacher can have many threads. An unprompted node with a `title` and a `trigger` (`app_installed:<app>`, `unit_complete:<unit>`, `lessons_completed:<n>`, `level_reached:<n>`, `welcome_back`) is a *story thread*: it unlocks once when earned (key on `chat_threads.event`), with no daily cap, shows in Chats with its title as a subject line, and can be replayed (messages cleared, play count up, key kept). A *free chat* is a new thread at the teacher's greeting menu, started with the pen button in Chats (`new-chat.tsx`; Shrodi opens his Guide thread). Replies are taps: a text chip, a sticker (`type: emoji`) or a reaction (`type: react`, shown on the teacher's last letter); a sticker or reaction with no `next` ends the story. The one-a-day cap below is superseded.
- **How a thread plays (revision 6).** A node's text is split at blank lines into bubbles (at most 6 of 240 characters), each its own message; they arrive one at a time after typing dots, like a real chat, and a story's first bubbles play when the learner opens it. The replies sit under the last message, centered; tapping one puts them away and sends it with a small motion (a chip flies in as a blue letter, a sticker pops, a reaction lands on the teacher's last bubble). Reactions (like, love, haha, wow, think, clap) and stickers (mind-blown, party, atom, banana, radiation, sleepy, nerd, star) are AtomIQ's own flat pictures (`components/phone/chat-art.ts`), not system emoji. A message always offers a choice: **two to six replies, all of one type** (chips, or reactions, or stickers; never a mix), enforced by the validator. When a thread ends (a sign-off, or a sticker or reaction with nowhere to go) a divider, "No more replies." and a Replay button close it.
- **Unprompted messages.** An NPC may open a thread with one message when something earns it: introducing a newly installed app (§6), welcoming the learner back after a long absence, or a note on finishing their unit. At most **one unprompted message per NPC per event, and at most one per day across all NPCs**. Feed posts remain the public, ambient layer; chats are the private, one-to-one layer. A chat message never duplicates a Feed post's wording.
- Unread counts clear when the thread opens. A thread's history is kept (§7.2) so it reads like a conversation, capped at the last 200 messages per thread.

### 5.3 Shop and Settings

Launchers: the icon pushes `/shop` or `/settings`. Both stay on the Profile header. Settings gains a **Phone** section with one switch, "App badges" (default on), that hides every count and dot on the phone and the tab's dot. The Shop's icon carries no badge.

### 5.6 AtomDex

The Encyclopedia is renamed **AtomDex** everywhere the learner reads it: the app icon label, `ScreenHeader` titles in `app/encyclopedia.tsx`, `app/explorer/encyclopedia*.tsx` and the entry screen, Discover's circle and `EntryCards`, the periodic-table banner text, Guide topics and content-card labels, Settings and the Terms/Privacy text if they name it, and `docs/`. **Nothing structural changes**: route files, `encyclopedia_entries`, ids, `content-db.ts` function names, and `STORAGE_KEYS` keep their names, so no shipped id moves. Where a sentence needs a noun, "AtomDex entry" replaces "encyclopedia entry". A grep for `Encyclopedia` in learner-visible strings must come back empty at the end of phase 0 (code identifiers excluded; `check:icons` and `test:legal` still pass).

A "Dex" suggests collecting. That is a later phase (§12): entries gain a **seen** mark, and scanning, a lesson card or a daily fact can discover an entry. Phase 0 is the rename only.

### 5.7 Daily Fact

A launcher to `/daily-facts`. **Home screen badge:** while today's fact has not been read (today's fact id is not in `daily_facts_read`), the icon wears a "New" dot and its label reads "Daily Fact" with a one-line subtitle in the badge's accessibility text, "New AtomFact available". The dot clears when the fact is read (the existing quest claim). The Phone tab also shows its dot (§6).

### 5.8 Nuclear Map

Built (phase 4). A flat world map in the app's own look: rounded land in the lesson object style (the far side one step darker, no outlines) on an ocean, drawn from Natural Earth data (public domain) in a Robinson projection. `scripts/build-world-map.mjs` turns the source into `components/map/world-art.ts` (pure data, `WORLD_MAP`, `project`, `unproject`; `test:world-map`; `node scripts/render-world-map.mjs <dir>` makes a picture to look at). There are no tiles, no network and no location.

- **Pins:** one per `map_sites` row (§7.1), a coloured disc on a lip, its colour by kind (discovery, research, power, accident, history, natural: `MAP_KIND_COLORS` in `components/map/map-core.ts`); none is green, since the land is, so Natural is charcoal). The header sits on the ocean colour (transparent, fixed dark ink). Kind chips along the top switch each kind on or off.
- **Moving:** drag to pan, pinch or double-tap to zoom (1 to 10 times), and plus and minus buttons for anyone who cannot pinch. While a finger is down the layer moves by a transform; when it lifts, the vector map redraws sharp at the new zoom (`WorldLayer.tsx`). The view maths (`clampView`, `pannedView`, `zoomedView`, `focusOnSite`) are framework-free worklets in `map-core.ts` (`test:map`).
- **A site card** (tap a pin; the map centres on it): kind, year, name, place, the fact, "See in AtomDex" when the site has an entry, and the sources it stands on.
- **Content:** 18 sites seeded by `scripts/content-migration/add-safety-and-map.mjs` from `data/map-sites-data.mjs`: where each fact was read is in the source rows, every source `verified = 0`. Sober wording for accidents and the 1945 bombings, no graphic detail. Coordinates are to about 0.01 degrees and some years are loose: check them when verifying the sources.
- **Unlock:** level 5 (a late reward; the row is one number in the catalog).

### 5.9 Safety Guide

Plain, calm, sourced reference cards on radiation and nuclear safety, opened as a list of cards under a large "Safety Guide" title, each a one-screen read. It is an **educational reference, not an emergency service**: the first card, and a line at the foot of every card, says so and tells the learner to follow local authorities and call their local emergency number in a real emergency. The app never calls, locates, or notifies.

- Cards live in the content DB (`safety_cards`, §7.1), grouped into three sections:
  1. **Radiation basics**: time, distance and shielding; background radiation and where it comes from; what a dose is.
  2. **If something happens**: the public guidance in plain steps ("get inside, stay inside, stay tuned"; what shelter means; why not to go out to look), worded from the cited official guidance, never improvised.
  3. **Myths that cost people**: short debunks, linked to the Myth Buster myths they match.
- Each card has a `steps` list of at most 5 short lines, an optional AtomDex link, and **at least one verified reference** (the publish gate already makes unverified references an error). Cards are authored in Studio and covered by the curriculum rules so a card with no source fails validation.
- Because this is safety advice, **every card is reviewed before it ships** and the wording follows the cited source; the review is a checklist item in §13, not a code feature.
- The four existing `safety` AtomDex entries are linked from the cards; they are not duplicated.

**As built (phase 4):** 14 cards seeded from `data/safety-cards-data.mjs` (basics 4, if something happens 5, myths 5), each with 2 to 5 lines and 1 to 3 sources, every source `verified = 0` until a person checks it in Studio (the publish gate then stops on any that are not). The list (`app/phone-apps/safety.tsx`) opens with the "not an emergency service" notice and shows the three sections as filled rows; a card (`safety-card.tsx`) is one screen: icon, title, line, its lines (a myth card's lines carry "Myth" and "What is true" tags), See in AtomDex, the sources, and the foot line. The words and rules are in `components/safety/safety-core.ts` (`test:safety`).

### 5.10 Reference Library

Every source the app cites in one place: a large "Reference Library" title, a segmented switch (**By unit**, **All**) and a list of references (title, publisher, a small verified or "unchecked" mark, and which lessons or units cite it). A row opens the source in the in-app browser (`expo-web-browser`; `INTERNET` is already declared). It reads `content_references` joined to `unit_references`, `lesson_references` and `blog_references`, plus the `sources` on AtomDex entries (de-duplicated by URL). Unverified references are shown as such, never hidden. No search in phase 1 (13 rows); a title search appears when the list passes about 40.

### 5.11 Atom Scanner, Camera and Field Notes

See §8, §9 and §10.

## 6. Evolution: how apps arrive

**Unlocks are derived from progress the app already stores. Nothing about *being unlocked* is stored.** Only whether the learner has *seen* an app arrive is stored (`phone_seen`, §7.2), exactly like `path-core` derives lock state and only `levels` is saved.

`services/phone-core.ts` (framework-free, `test:phone`) holds:

- `PHONE_APPS`: the catalog (id, name, colour role, icon, route, `status`, `unlock`).
- `unlock` is a discriminated union: `{ kind: "start" }`, `{ kind: "lessons", count: N }`, `{ kind: "unit", unitId }`, `{ kind: "level", level }` (a level is 100 XP), `{ kind: "owns-shop-item" }`.
- `unlockedApps(progress)`, `newApps(unlocked, seen)`, `badgeFor(appId, signals)`, `tabDot(signals)`: pure functions of a plain `PhoneProgress` object (lessons completed, units completed, level, shop items owned, unread chats, daily fact unread). The runtime (`services/phone.ts`) builds that object from existing hooks and stores; `hooks/use-phone.ts` follows it.

The starting unlocks in §5 are a first draft to tune in playtest; they are numbers in one table. The rules for choosing them: the phone should add roughly one app per hour of learning at the start, Scanner should arrive once the learner knows what an atom is (that is its subject), and Safety Guide once they know what radiation is. **A new unit's own apps are added by adding catalog rows**; no engine change.

### The install moment

When the phone opens and `newApps` is not empty (or the tab regains focus with one waiting), for each new app in turn (0.5 s apart, at most three per visit, the rest on the next visit): a plain icon-shaped outline appears in its grid slot, a ring fills round it in 600 ms (the "installing" beat), the icon pops in with a burst and a "New" dot, and the label types in. `phone_seen` is written as each pop lands. Reduced motion: the icon is simply there with the dot. A quiet SFX cue plays per install.

New apps are not announced in chat (the `app_installed` stories were removed in revision 6); the trigger kind still exists for future stories.

### The tab dot

The Phone tab icon shows a dot while there is anything to look at: a new app waiting, an unread chat, or an unread daily fact. It is the Feed tab's dot (`useFeedUnseenCount` pattern, the same colour, ring and pop), with its own accessibility label ("Phone, something new"). The dot clears per cause as each is opened; the phone does not have a notification centre.

## 7. Data

### 7.1 Content DB (values only; the apps are code)

All new tables go between `-- BEGIN phone` / `-- END phone` markers in `schema.sql`, are editable in Content Studio, are checked by `validate:content` and the Studio-save rules, and use shipped ids that only grow (they are covered by `shipped-ids.json` like every other content table). Adding them is a schema change: the publish bump is **minor** (rows added) at least, and `CONTENT_SCHEMA_VERSION` is bumped if the bundled-DB swap requires it.

| Table | Columns (all with `created_at`, `updated_at`) | Notes |
|---|---|---|
| `scan_targets` | `id`, `name`, `scene`, `object` (art ids), `blurb`, `composition` (JSON `[{symbol, note?}]`, most to least by mass), `fun_fact`, `atomdex_entry_id?`, `position` | `symbol` must exist in the periodic-table data; a target must have at least one reference (join table `scan_target_references`, the same shape as `lesson_references`). |
| `safety_cards` | `id`, `section`, `title`, `summary`, `steps` (JSON, ≤ 5), `atomdex_entry_id?`, `myth_id?`, `position` | At least one reference through `safety_card_references`. |
| `chat_nodes` | `id`, `npc_id`, `kind` (`greeting` / `reply` / `unprompted` / `sign_off`), `trigger?` (for unprompted: `app_installed:<appId>`, `unit_complete:<unitId>`, `welcome_back`), `text`, `pose`, `replies` (JSON `[{label, next?, action?}]`), `position` | An `action` is a `GuideDestination` (reusing `navigate.ts`), so a reply can open a lesson, practice, AtomDex entry or game. Every `next` must resolve and every node must be reachable from the thread's greeting (checked). |

The scanner's **art** (the room scenes and where each object sits in them) is code, not data: `components/scanner/scan-scenes.ts`, pure data in the same spirit as `blog-art.ts` (backdrop plus objects from the lesson object art, hit rectangles). A test requires every `scan_targets` row to have a placement and every placement a row.

Phase 4 adds `safety_cards`, `safety_card_references`, `map_sites` and `map_site_references` (the `phone` block of `schema.sql`). Both card tables are shipped-id tables with `ENTITY_LINKS` to their references. Vocabularies and limits are `scripts/lib/safety-vocab.mjs` and `map-vocab.mjs`; rules are `safety-rules.mjs` and `map-rules.mjs` (a card or site needs a source; at the publish gate every source must be verified). Studio has both under the Phone group. Seed: `node --no-warnings scripts/content-migration/add-safety-and-map.mjs`.

### 7.2 User-state DB (`services/local-first/schema.ts`)

Each table carries the local-first sync columns like its neighbours (`updated_at`, `synced_at`, `is_dirty`, `deleted_at`, `version`) so a future sync needs no migration, and is created in code (no migration files).

| Table | Columns | Purpose |
|---|---|---|
| `phone_seen` | `app_id` PK, `seen_at` | The apps whose install moment has played. |
| `chat_messages` | `id` PK, `thread_id`, `node_id?`, `from` (`npc:<id>` / `shrodi` / `me`), `text`, `at`, `read` | Thread history (the learner's side is the label of the pill they tapped). Unprompted messages are inserted when their trigger fires. |
| `scans` | `target_id` PK, `first_at`, `count` | Which things have been scanned. |
| `field_notes` | see §10 | The notebook. |
| `photos` | `id` PK, `config` (JSON, §9), `taken_at` | Saved photo compositions. Data, not pixels. |

The framework-free SQL for each lives in its own `*-core.ts` over an `execute`/`query` interface (the `daily-facts-core` pattern), runs on in-memory SQLite in its test, and is bound in a small `services/*.ts`. **Delete account wipes all five tables** (it already wipes the user-state DB; `test:legal` also checks that the Privacy Policy lists what is stored, so §13 requires it to name notes, photos and scans and `LEGAL_VERSION` to be bumped).

`STORAGE_KEYS.PHONE_BADGES` (the Settings switch) is an AsyncStorage flag (`PHONE_INTRO_SEEN` is retired).

### 7.3 Chat engine

`services/chat-core.ts` (`test:chats`): given a thread, its current node and a tapped reply, returns the next node and any action; `deliverUnprompted(trigger, history, now)` applies the one-per-NPC-per-event and one-per-day rules. Shrodi's thread does not use `chat_nodes`; it is the Guide engine, adapted behind the same `Thread` interface the screen uses.

## 8. Atom Scanner

The learner points a fictional scanner at everyday things and sees what they are made of. It is a **simulation** (no camera, no permission): the "world" is a drawn scene and the scanner is a viewfinder over it.

**Flow**
1. Opening shows a **scene picker** in the app's top bar (Kitchen, Garden, Bathroom, Lab, Sky; four to six scenes at launch, each a flat scene in the object-art style with 3 to 4 scannable things, 12 to 16 targets in all).
2. The scene sits under a fixed **reticle** at the screen centre. The learner drags the scene to move it under the reticle (one-finger pan, clamped to the scene; no pinch, to keep it forgiving). When a target is under the reticle its outline lights up and the reticle snaps to it ("lock-on").
3. Holding the **Scan** button over a locked target runs a scan: a line sweeps the object, element chips fly out of it one by one as the progress ring fills (1.2 s; released early it cancels with no penalty).
4. The **result card** rises over the bottom: the name, one line, the composition as element chips (symbol on its element colour; a chip opens `/periodic-table/<symbol>`), the fun fact (a short "Fun fact" row, for example the banana's potassium and the trace of radioactive K-40), a "See in AtomDex" button when the target has an entry, and an "Add to Field Notes" button (§10). First scans mark `scans` and read "New scan"; repeats just show the card.
5. A small counter ("5 of 14 scanned") sits under the scene picker. It is a collection, not a score; there is no timer and nothing fails.

**Accuracy rules.** Composition lists name **which elements are present, ordered by mass in the typical case, with no invented percentages**. A chip's `note` can say "in caffeine" or "as water". Every claim is sourced through the target's references; a target with an uncertain claim does not ship. Never show a scan result for something dangerous presented as a recipe (no explosives, no toxins, no weapons); the launch set is food, water, air, sunlight, a banana, salt, a granite counter, a smoke detector, a lantern mantle, a wristwatch dial from a museum, the human body, soil and similar everyday and teaching things. The set is authored in Studio.

**Code.** `scanner-core.ts` (`test:scanner`): scene clamping and pan, the lock-on rule (the hit rectangle containing the reticle point, nearest wins, with a small margin), the scan timeline (sweep, chips, ring) as pure functions of one clock, and the result assembly (`composition` joined with periodic-table colours). UI in `components/scanner/` (`ScannerScene`, `Reticle`, `ScanResultCard`, `ElementChip`). Reduced motion: lock-on is a colour change, the scan is a 300 ms fill, chips are simply present. No looping clock per object (the platformer's smoothness rules apply to the pan).

## 9. Camera

The device camera is **not used**. Camera is a **photo mode for the learner's own character**: a viewfinder framing the learner's avatar, optionally with Shrodi or a contact beside them, in front of a flat scene, with a shutter.

- **Compose:** pick a scene (the scanner's rooms and the blog-art backdrops; later, the platformer's biomes), pick who stands with you (nobody, Shrodi, or any contact), pick a pose from the poses the figures already have (`NpcSpec` poses; the avatar uses its default), and a frame. The viewfinder previews live.
- **Shutter:** a flash, a click cue, and a thumbnail slides to the corner. The photo is **saved as its composition** (`photos.config`: scene, companion, poses, frame, and the avatar's `serializeAvatar` string at the time), not as pixels. That keeps it offline, permission-free, tiny, and re-rendered crisply at any size. The cost is that a photo cannot be exported as an image in v1 (§14, question 3).
- **Gallery:** the camera's second view, a grid of photos newest first; a photo opens large with a delete button. Capped at 100; at the cap the oldest is not removed silently, the shutter says "Your gallery is full" and links to the gallery.
- **Hooks:** a photo of an item the learner just bought is the natural use; the purchase moment is not changed, but the Shop's "Owned" state and the Camera's unlock both read `shop_owned`.
- **Code:** `components/camera/` (`PhotoView` draws a composition; `photo-scenes.ts` has the scenes and frames; `photo-core.ts` holds the config shape, the store SQL and the cap; `test:photo`), `app/phone-apps/camera.tsx`, `services/photos.ts`, `hooks/use-photos.ts`. Reuses `Avatar` and `Npc` as they are.

**As built (phase 4):** four scenes (meadow, night, lab, stage), a companion (nobody, Shrodi or a contact), poses and frames, and a gallery as the second view, capped at 100. Photos live in the `photos` table of the user-state DB and are wiped by Delete Account; the privacy text and the terms say so (`LEGAL_VERSION` 2.4). Each scene has a foreground drawn over the figures (a hedge, a stone wall, a lab bench, the stage front: `front` in `photo-scenes.ts`), so the waist-up figures stand behind it and never look cropped at the bottom. The shutter reuses the UI select and cancel cues: the `camera.shutter` cue is still to be recorded.

## 10. Field Notes

A private notebook. The learner writes, the app never reads it, and no part of it appears anywhere else. It is the only place on the phone with a text box, and it is kept out of everything social.

- **List:** notes newest first (title, the first line, a date, a small mark for the source of a clipping), a search over titles and text, and a **+** button. A note has a title (optional), a body, and optionally a **clipping**: a source (`lesson:<id>`, `atomdex:<id>`, `scan:<id>`, `fact:<id>`) with a one-line quoted snippet in a tinted block above the body that links back to the source.
- **Making one:** the **+** button, or **Add to Field Notes** on a scan result, an AtomDex entry, a daily fact and a lesson's finished screen (one button in each; nothing in a lesson run is interrupted). Clipping creates the note with the snippet filled in and opens it for editing.
- **Editing:** autosave on every pause of 800 ms and on leaving; no Save button. Deleting asks once in a `ModalDialog` ("Delete this note?"). Limits: **2,000 characters** a body, **120** a title, **200 notes**; at the limit the counter turns the warning colour and the field stops accepting, with a message, never silently truncating.
- **Storage:** `field_notes` (`id`, `title`, `body`, `source_type?`, `source_id?`, `snippet?`, `created_at`, `updated_at`, plus the sync columns). `field-notes-core.ts` (`test:field-notes`) holds the SQL, the limits and the search. The notebook is on the device only, is wiped by Delete account, and is never put in a log, a crash report or an analytics event.
- **Scope guard:** `check:feed` forbids a `TextInput` under `app/blog`, `components/feed`, `community.tsx` and `services/feed*.ts`; a new `check:phone` enforces that the only `TextInput` under `app/phone` and `components/phone*` is in Field Notes, that nothing under `services/` for the phone calls `fetch`, and that nothing imports `expo-camera`, `expo-image-picker`, `expo-media-library`, `expo-location` or `expo-notifications`.
- **Keyboard:** the editor handles the keyboard (the screen avoids it, the toolbar stays above it, Android back closes the keyboard first), checked on a release-like build (CLAUDE.md "Other notes").

## 11. Motion, sound, haptics, XP

Follows `components/motion/MOTION.md` and the `duolingo-motion-style` skill: each moment is a pure timeline in `phone-fx-core.ts` (`test:phone-fx`) with one linear clock; interface moves stay under 300 ms, ease-out; every one has a reduced-motion form. The phone's new moments:

| Moment | Beats |
|---|---|
| App press | sink to 92%, face to lip colour; release pop 120 ms |
| Install | outline, ring fill 600 ms, pop with burst, label types in, dot pops |
| First open | five installs staggered 0.5 s, one line from Shrodi |
| Scan | lock-on snap 150 ms, sweep, chips fly 80 ms apart, ring, card rises |
| Shutter | flash 90 ms, thumbnail slides to corner 240 ms |

New SFX cues (each a 16-bit mono 44.1 kHz WAV in `assets/sfx/phone/`, an `SFX_FILES` entry, a cue row, a `require` in `sfx.ts`; `check:sfx`): `phone.install`, `phone.message`, `scanner.lock`, `scanner.scan`, `scanner.result`, `camera.shutter`. Haptics: a light impact on lock-on and on the shutter, through `services/haptics`.

**XP hooks (small, optional, switchable in `xp-core.ts`; none is needed for the phone to ship):** a first scan of a target pays `SCAN_FIRST_XP` (proposed 2) and repeats pay nothing; Field Notes and the camera pay nothing. Quests may gain "scan 3 things" later through `missions-core`; not in this spec. Diamonds are not given by the phone.

## 12. Phasing

| Phase | Ships | Done when |
|---|---|---|
| **0 Foundation** | Tab swap (Guide to Phone), `phone-core` + catalog + unlocks + `phone_seen`, home screen with icons and badges and the first-open moment, install moment, launcher apps (Shop, Settings, AtomDex, Daily Fact) with the AtomDex rename, **Chats with Shrodi only** (the Guide engine behind the thread UI), Contacts, tab dot, Settings "App badges", retire `chat.tsx` and the Guide landing, update the five places that name `chat` | `test:phone`, `typecheck`, `lint`, `check:tab-bar`, `test:media`, `check:icons` pass; the rename grep is empty; the Guide's answers still work from Shrodi's thread |
| **1 Notes and library** | Field Notes (with clippings from AtomDex and daily facts), Reference Library, privacy text and `LEGAL_VERSION` | `test:field-notes`, `test:legal` pass; delete account wipes the notebook |
| **2 NPC chats** | `chat_nodes`, NPC threads, unprompted messages tied to installs, `test:chats` | each NPC has a greeting and four reachable nodes; the one-per-day cap holds |
| **3 Scanner** | `scan_targets`, scenes, scanner UI, scan history, AtomDex link, "Add to Field Notes" from a result | 12+ sourced targets; `test:scanner`; element chips open the periodic table |
| **4 Safety, Camera and Map** (built) | `safety_cards`, Safety Guide; Camera photo mode and gallery; `map_sites` and the Nuclear Map | `test:safety`, `test:photo`, `test:map`, `test:world-map`; **sources still to be verified by a person before publishing** |
| **Later** | AtomDex **seen** marks and discoveries from scans and lessons, phone wallpaper and case items in the Shop, photo export | each its own spec |

Phases 1 to 4 are independent after phase 0 and can run in any order; the order above is by dependency of ideas (the Scanner wants Field Notes for its "Add" button, and the unprompted chat messages want phase 2 to talk about the Scanner).

## 13. Files, checks and risks

**Retired or moved:** `app/(tabs)/chat.tsx` (to `phone.tsx`), `components/guide/GuideLandingCards.tsx`, `GuideTeachers.tsx` and `ProfileProgressCard.tsx` (after confirming nothing else uses them; `GuideBubble`, `Pill` and `ContentCard` move into the chat thread), `docs/completed/CHAT_UI_GUIDE.md` (marked superseded). **Kept:** `services/guide/*` as Shrodi's engine, unrenamed to keep the churn small.

**Updated in the same commit as phase 0:** `theme/tab-bar-metrics.ts` and `_layout.tsx` (label, icon), `hooks/use-android-back.ts`, `services/media-core.ts` and `scripts/test-media-policy.mjs` (`/chat` to `/phone`), `scripts/check-tab-bar-clearance.mjs`, `components/onboarding/HowStep.tsx` (it names the Guide; reword to the phone), `docs/features/NPC_FEED_SPEC.md` (the two lines in §1), `CLAUDE.md` (the Guide section becomes Phone), the unit-card strings that mention "Guide".

**New scripts:** `test:phone`, `test:chats`, `test:scanner`, `test:field-notes`, `test:photo`, `test:phone-fx`, `check:phone`; add each to `package.json`. Before handing off a phase: `sync-content` (when content changed), `typecheck`, `lint`, and the checks that phase touched.

**Risks and who owns them**

| Risk | Handling |
|---|---|
| Safety advice that is wrong or reads as medical advice | Wording follows the cited official source, "not an emergency service" on every card, a human review before publish, nothing in the app triggers or implies a call or a rescue |
| Scanner facts that are wrong | Sourced composition only, no percentages, validated symbols, authored and reviewed in Studio, publish gate on unverified references |
| Notes are personal data | On-device only, wiped on account deletion, named in the Privacy Policy, never logged |
| The phone feels like a to-do list | Uninstalled apps are never shown; only what the learner has is on screen |
| Content volume (14 scan targets, 12 or more safety cards, NPC trees) is the real cost | Phases are independent and each ships with what it has; a phone with six apps is a complete phone |
| Two ways in to the same screen (Profile and Phone) | Intended (§1, principle 1); both push the same route, so there is one screen to maintain |
| Tab icon and 6 new SFX files and ~6 new glyphs need art | Listed so they are scheduled; placeholders may use the unused `kent-sfx` library and existing icons until the art lands, but not in a release |

**Verification not yet possible:** nothing here has been seen on a screen or a device. Phase 0 must be run on a release-like Android build for safe areas, back handling, the dot's ring on the tab icon, large text and TalkBack order on the grid, tablets (grid columns), and dark mode (wallpaper contrast under the labels, `check:theme-colors`; the avatar paint and pattern are invariant colours and need a registered exception in `docs/critical/THEME_EXCEPTION_REGISTER.md`).

## 14. Decisions taken and open questions

Decisions I took so the spec could be concrete; each is easy to reverse.

1. **Uninstalled apps are hidden**, not shown locked. Reason: a locked grid is a checklist.
2. **Existing entry points stay.** Shop, Settings, AtomDex and Daily facts stay where they are; the phone adds doors.
3. **Camera and Scanner are simulations**, with no device camera. Reason: it keeps the app offline, permission-free (so `test:legal` stays true) and in the data-not-pixels style. Camera photos are compositions, not images.
4. **Chats have no text box**; Field Notes is the one place the learner types, and it is private.
5. **The starting five** are Chats, Contacts, AtomDex, Daily Fact and Settings, and the unlock table in §5 is a draft.
6. **The Encyclopedia is renamed in text only** (no route, table or id changes).
7. **Nuclear Map is built as a flat, offline world map** (phase 4), unlocked at level 5.

Questions for you:

- **Should Shop be a phone app at all, given Profile already opens it?** I kept both. The alternative is to remove the Profile button and make the phone the only door, which is more Animal-Crossing but is a navigation change outside this spec.
- **Is "Camera" what I described (a photo mode)?** In Animal Crossing the camera photographs the world. If you meant the scanner's real-camera version, that is a different feature (permissions, privacy text, on-device recognition) and I would want to spec it separately.
- **Should a photo be exportable as an image?** It needs one dependency (a view-capture library) and a share action; it is the one thing that would make Camera feel like a real camera. I left it out of v1.
- **Do the Feed's four circles stay?** With a phone they duplicate Encyclopedia, Daily facts and Lab. I kept them so the Feed does not change here.
- **Should the first scan pay XP** (`SCAN_FIRST_XP`)? I proposed 2 and made it optional.
- **Who are the chat partners beyond the two units that exist?** Phase 2 only has Hal and Ada to write for; the other five NPCs appear as their units ship.

## 15. Phase 0 as built: where it differs from the draft

- **Route folder is `app/phone-apps/`, not `app/phone/`.** The tab is `(tabs)/phone.tsx` (url `/phone`); a root folder named `phone` would be a second route with the same url. Routes are `/phone-apps/chats`, `/phone-apps/shrodi`, `/phone-apps/contacts` (the same prefix for the later apps).
- **Contacts "met" is `getMetTeachers`**, the existing list of teachers the learner was introduced to (the first lesson of their unit), not the broader rule in §5.1 (posted in the Feed, appears in Ranks). Shrodi is always listed. Widen it when NPC chats exist.
- **Shrodi's thread has no landing page.** The Guide's "Focus areas" list and "Quick starts" are gone with the landing; the conversation opens on the intent pills, and "Review" covers the weak topics. The "Teachers" section is replaced by Contacts. `GuideLandingCards.tsx` and `GuideTeachers.tsx` are deleted.
- **"App badges" is one row in Settings > Preferences**, not a separate Phone section.
- **The first-open hand-over brings in five apps; a later visit brings in at most three.** The starting apps arrive already opened (no "New" dot on five icons); apps installed later wear the dot until opened. `phone_seen` therefore has an `opened_at` column.
- **New icon art:** `assets/images/icons/phone.png` (64 px, drawn for this spec) is the tab icon. Onboarding's "how it works" row now shows it, under "A phone of your own".
- **Install sound:** the install plays the existing `reward.pop` cue until `phone.install` is made (§11).
- **The tab dot reads progress with `usePhone(state.index)`:** it re-reads when the learner changes tab, which is when progress made elsewhere shows up.
- **Colour roles** in the catalog are `blue`, `green`, `purple`, `yellow`, `orange`, `grey`, `cyan`, `red` and `coral`, resolved from existing theme colours in `components/phone/phone-palette.ts`; the spec's `teal`, `indigo` and `pink` are not theme colours.
- **Not done in phase 0:** the unprompted chat messages, `chat_messages` and `chat_nodes`, the other six apps, and the privacy-text update (nothing new is stored yet except `phone_seen`). The legal text only had "encyclopedia" changed to "AtomDex", and `LEGAL_VERSION` was not bumped for a rename.

### Phase 1 as built

- **Files:** `services/field-notes-core.ts` (limits, SQL, helpers), `services/field-notes.ts` (runtime, `clipToNotes`), `hooks/use-field-notes.ts`, `app/phone-apps/field-notes.tsx` (list) and `field-note.tsx` (editor; the file name starts `field-note` because `check:phone` allows a text input only under that name), `components/phone/AddToNotesButton.tsx`, `services/library-core.ts`, `app/phone-apps/library.tsx`, `contentRepository.getReferenceLibraryData()`.
- **Clippings:** the button is on AtomDex entries (under the definition) and on the daily fact card, and shows once Field Notes is installed. A source is clipped once; the button then reads "In Field Notes" and opens that note. A scan result and a lesson's finish screen get the button when they exist (phases 3 and later); the lesson finish screen is not in phase 1.
- **A note is deleted as a tombstone** (`deleted_at`), like every local-first table, and Delete Account clears the whole table.
- **Reference Library:** the list merges `content_references` (with the places that cite them) and the sources written on AtomDex entries, de-duplicated by URL. "By unit" lists a unit's sources whether the unit, one of its lessons or one of its blog pieces cites them, then "More sources". **No search yet** (`filterRefs` and `SEARCH_AFTER` are ready): a text box is only allowed in Field Notes, so the search needs `check:phone` and its spec line widened when the list passes about forty sources.
- **Legal:** the privacy policy names Field Notes and the phone's seen-apps and says notes are private and deleted with the account; the terms list the phone, notebook and library. `LEGAL_VERSION` is 2.1, dated November 20, 2026.
- **Not in phase 1:** the lesson finish screen's clip button; reordering, tags or export of notes (not planned).

### Phase 2 as built

- **Content:** `chat_nodes` (the `phone` block of `schema.sql`; vocabulary in `scripts/lib/chat-vocab.mjs`, rules in `scripts/lib/chat-rules.mjs`, run by `validate:content`, Studio saves and the publish gate; a Studio editor under "Phone"). Seeded by `scripts/content-migration/add-chat-nodes.mjs`: **Ada 12 nodes, Hal 10**. Each has a greeting, a menu, "What's next?", "Quiz me", "Remind me of something" (two AtomDex entries each), a sign-off and unprompted messages. `chat_nodes` ids are shipped ids (`SHIPPED_ID_TABLES`).
- **Rules the validator enforces:** one greeting per teacher and at least four reply or sign-off nodes; every `next` resolves to a node of the same teacher and never to an unprompted one; every reply goes somewhere (a `next` or an action); every node is reachable from the greeting or is an unprompted message; a trigger is `app_installed:<live or planned app>`, `unit_complete:<unit>` or `welcome_back`, once per teacher; an action points at something that exists and, for an app, is built.
- **Engine:** `services/chat-core.ts` (graph steps, summaries, `candidatesFrom`, `deliverUnprompted`, the SQL), `services/chats.ts` (runtime, `routeForAction`), `hooks/use-chats.ts`. Screens: `app/phone-apps/chats.tsx` (list: teachers met who have a thread, latest first, last line, time, unread count), `chat.tsx` (thread: bubbles, a typing beat of 450 ms, reply pills, "Start again" after a sign-off), and a **Message** button on a met teacher's profile (`app/npc/[id].tsx`).
- **Unprompted messages are worked out from the learner's state, not from a moment that passes** (like unlocks): a finished unit, an app whose install moment has played, or a return after 3 or more days. So a message the daily cap held back is delivered the next day; only `welcome_back:<day>` belongs to its day. One per teacher per event (the `event` column of `chat_messages`), one per local day across all teachers, only from a teacher the learner has **met** (the one met last first). Delivery runs inside `usePhone`'s read, queued so two screens cannot both send; `recordChatAppOpen()` (called with the Feed's app-open check) records a return.
- **Deviations from §7.1 to §7.3:** `chat_messages` has `sender` (not `from`, a reserved word) and an `event` column, and its history keeps the last 200 ordinary messages per thread but never drops one that carries an event. A reply's action is its own small vocabulary (`next-lesson`, `lesson`, `practice`, `entry`, `mythbuster`, `app`) rather than a `GuideDestination`, because "next lesson of my unit" and "open an app" are decided when the learner taps; a reply can be both a `next` and an action. Shrodi's thread is still the Guide engine and does not appear in `chat_messages`.
- **Written, and what is not:** Hal introduces Field Notes and the Reference Library and notes the end of his unit; Ada notes the end of hers; both welcome the learner back. The Scanner message arrived with phase 3; **no Safety Guide message exists yet**, written with the app (phase 4). The seeded text is first-draft copy and has not been read aloud or playtested.
- **Legal:** the privacy text lists chats (what a teacher said and the replies tapped, on the device, nothing sent) and Delete Account wipes `chat_messages`; `LEGAL_VERSION` is 2.2.
- **Not seen on a device:** the typing beat, scrolling to the newest line with the keyboard-less layout, and how four pills wrap on a narrow phone.

### Phase 3 as built

- **Content:** `scan_targets` and `scan_target_references` (the `phone` block of `schema.sql`; `scan_targets` is a shipped-id table and links like `blog_references`; vocabulary in `scripts/lib/scan-vocab.mjs`, rules in `scan-rules.mjs`, run by `validate:content`, Studio saves and the publish gate; a Studio editor "Scan targets" under "Phone"). Seeded by `scripts/content-migration/add-scan-targets.mjs`: twelve targets, each with at least one source. The rules: every symbol is a real element and listed once, no percentages or amounts anywhere a learner reads (`hasAmount`), the AtomDex entry exists when named, the picture is a lesson object, and every source exists; at the publish gate every source must have been checked by a person.
- **Sources are NOT yet verified.** The twelve claims were written from pages read on 2026-11-20 (OpenStax Chemistry 2e and Biology 2e, Anatomy and Physiology 2e, NASA, NOAA, EPA, MedlinePlus, IUPAC), and twelve new `content_references` rows were added with `verified = 0`. A person has to open each one in Studio and confirm it supports the target before `release:content --publish` will pass. Until then `validate:content` shows 20 or so `scan-reference-unverified` warnings.
- **Deviation from §8:** four scenes with twelve targets at launch (Kitchen 4, Outside 3, Body 3, Treasure 2), not four to six scenes of 3 to 4. A target was added only where its claim could be sourced; the spec's Bathroom, Lab and Sky wait for sourced targets. The scenes are flat backdrops in the object-art style with the lesson object pictures standing on them (`components/scanner/scan-scenes.ts`, no framework imports; `node scripts/render-scan-scenes.mjs <dir>` makes a contact sheet with each hit box outlined).
- **Deviation from §8 step 3:** Scan is a tap, not a hold. Holding is hard for a screen reader and for a small hand; dragging off the thing mid scan cancels it, with nothing kept. A row "In this scene" lists the things by name and moves the reticle onto one, so the scanner can be used without dragging.
- **Rules:** `components/scanner/scanner-core.ts` (`test:scanner`): the reticle point is clamped to the scene (reaching `EDGE` from its sides, with the backdrop drawn `BLEED` past it so the edge never shows), `panAfterDrag`, `lockOn` (boxes with a 6 unit margin, nearest centre wins, worklet), the scan clock (`scanFrame`: ring and a sweep that passes twice; 1.2 s, 300 ms with reduced motion), `chipFrame` (chips leave one after another), `assembleResult` (composition joined with the periodic table; an unknown symbol is dropped, never shown wrong), `collectionText`, and the `scans` SQL (`createScanStore`: first scan is "New scan", repeats count). Tests also check every target row has a place in its scene with its picture and every place a row, so a target added in Studio without a place fails `test:scanner`.
- **UI (revision 7, a camera-app look):** `app/phone-apps/scanner.tsx` is full screen and dark in both themes (the object art's Eel and snow): the scene fills the screen as the viewfinder, dragged under the fixed reticle (`RETICLE` 170); over it a dark fade with the usual header row (`BandRow`: back, "Atom Scanner", "N of M scanned" as its subtitle) and a status pill ("Drag to find something", "Locked on: X", "Scanning…"); a dark panel with rounded top corners holds the things in the scene as round pictures with a name under them (a ring when locked on, a tick when scanned; tap one to move the reticle onto it), the scene strip like a camera's modes (uppercase names, the chosen one white with a dot) and a round **shutter** (`Shutter.tsx`: a white ring round a white disc; the disc turns green when a thing is locked on, dimmed when not, the ring fills green during the 1.2 s scan; the reticle keeps its brackets and sweep) between two counters ("here" and "all"). The result is a **sheet** that rises over a dim scrim (a grip and a close button, the result card scrolling inside; tapping the scrim closes it). The interaction is unchanged (drag to aim, lock-on, tap to scan). **Each thing is a little scene of its own, not a picture on a round plate** (`components/scanner/scan-vignettes.ts`, keyed by the target's `object`, drawn in the object art's 100-unit frame and placed in the thing's 72 to 84 unit box, which is still its hit box): a glass of water on the counter with a drop beside it, a salt shaker with a small heap, a banana on a plate, a bowl of rice with chopsticks, a tuft of grass in soil with a daisy, the sun with a cloud, wind carrying a balloon, a hand under a tap with soap bubbles, a hair caught in a comb, a blood vessel with red cells, a stack of gold bars and a diamond on a cushion, both sparkling. The kitchen's counter is the table they stand on (a pale floor pill under each, never an oval). The thumbnails in the bottom panel draw the same vignette (`VignetteArt`) on a rounded square. `test:scanner` requires every place to have a vignette. A new target needs one added there. The viewfinder is cut to `maxViewHeight` and the backdrop bleed is 160 units so a tall phone never looks past it. Older layout, now replaced: scene tabs, a counter line, a boxed viewport, a Scan button, the card under it and an "In this scene" grid. Details of the old layout: (scene tabs, "N of M scanned · K of J here", viewport with the drag, Scan button, result card, the "In this scene" row; `?target=<id>` opens that thing's scene with the reticle on it and its result when it was scanned before), `components/scanner/ScannerScene.tsx` (one Svg moved by a transform from shared values, no render per frame), `Reticle.tsx`, `ScanResultCard.tsx` (name, one line, "Made of" chips that open `/periodic-table/<symbol>`, fun fact, "See in AtomDex" when the entry exists, "Add to Field Notes", the sources' names). Runtime: `services/scanner.ts` (targets cached, `recordScan`, `subscribeScans`), `hooks/use-scanner.ts`, `contentRepository.getScanTargets()`.
- **State:** `scans` (`target_id` primary key, `first_at`, `count`, sync columns) in the user-state DB, wiped by Delete Account. Field Notes gained a `"scan"` source (label "From the Atom Scanner", opens `/phone-apps/scanner?target=<id>`).
- **Hal:** no chat announces the Scanner (or any other new app): the new-app story threads were removed, so an app's install moment is the only announcement.
- **Catalog:** `scanner` is `status: "live"`, unlocked by finishing *Inside the Atom*.
- **Legal:** the privacy text lists scans (which things and how many times, on the device, no camera, microphone or location) and Delete Account wipes `scans`; the terms list the scanner. `LEGAL_VERSION` is 2.3.
- **Not in phase 3:** the sound cues (`scanner.lock`, `scanner.scan`, `scanner.result`) and the lock-on haptic: only `ui.select` plays when a scan finishes. The scene art has been looked at on a contact sheet only; nothing has been seen on a device.

### Field Notes as a legal pad (restyle after phase 3)

- **Inspiration:** the shop's look comes from a real shop (a roof, a window); Field Notes takes its header from a real notepad: a darker yellow binding strip across the top with a perforated tear edge (holes in the page's colour), the round back button, the title and a pill (note count, or delete in the editor) on it, in dark grey ink. Colours are the object art's families mixed in code (`components/phone/notepad-palette.ts`, EX-13), the same in light and dark mode; anything on the strip uses the fixed ink, and the screen sets a dark status bar.
- **Body:** the app's own page colour (white in light mode) with the theme's text and no ruled lines.
- **List** (`field-notes.tsx`): the app's own search field (as in the AtomDex) and tab switch (as in the Reference Library: All notes, Written by me, Clipped), then one flat card per note with the title, a short preview and the date (a clipping also says where it is from). A round pen button with a lip at the bottom right starts a new note.
- **Editor** (`field-note.tsx`): the same strip; the clipped line is a yellow sticky note opening where it was cut from; the title and text sit on the plain page, which grows with the text. Autosave, leaving and deleting are unchanged.
- No data, storage or privacy change. Not seen on a device.

### Reference Library as a library (restyle after phase 3)

- A dark wood header (`components/phone/LibraryFrame.tsx`, colours in `library-palette.ts`, EX-13: object-art families, same in light and dark) with the round back button, the title and a source-count pill, and under them a row of books of different heights and colours standing on a shelf plank.
- Each unit is a shelf: its title, then its sources as books (a coloured cloth spine with two lighter bands, then a filled cover with the title, publisher line, cited-by line and the Verified or Unchecked mark), standing on a plank. The By unit / All switch is unchanged. Data, the source line, the verified mark and opening in the browser are unchanged.

### Who is in Contacts and Chats (change after phase 3)

A teacher is added when the learner **finishes a lesson of their unit** (Hal after Unit 1's first lesson, Ada after Unit 2's): `getContactTeacherIds()` in `services/chats.ts` reads the teacher of every unit with a completed lesson from the path, so nothing is stored. It replaces the old "met on the lesson intro page" rule for Contacts, Chats, unprompted messages and the profile's Message button; the intro page still shows once per teacher.

### Contacts laid out like contacts

The page is built like the profiles elsewhere in the app, not like a stock contact list: a short list of compact filled cards (`c.field`, no border or lip, as in Field Notes; 72 dp, 84 for the learner's). The cover is whole at the card's right edge and fades into the card's fill towards the left (a `LinearGradient` from the fill colour to clear; the first third is plain card), so the head, the name and the title sit on the plain card in the theme's text colours. The learner's own card has their paint and pattern (as on the Phone's wallpaper) with their avatar; every other card has the cover of that teacher's profile (`NpcCover`: their outfit colour with a wallpaper of what they teach). A round, icon-only button on the cover at the right opens their latest free chat or starts one (Shrodi: a blue cover, his picture, the button opens his chat). A card opens a teacher's profile (Shrodi's opens his chat). Everyone is sorted by name, which is what lights the phonebook header's thumb index. With no teacher yet, a dashed row says one joins after the first lesson. No search (text inputs stay in Field Notes). Data and who is listed are unchanged.

### Chats drawn like a messenger

- **List** (`chats.tsx`), under the red Chats header (white title and back icon): one filled card per thread, like the cards on Contacts: the sender's round picture (Shrodi's too), the name, a story's subject line, the last line and the day, and a blue dot with the line in bold while it is unread. A round pen button at the bottom right opens the new-chat picker. **Swipe a thread to the left to archive it** (it only shows a blue Archive action with an icon, one card open at a time; the learner taps the action, nothing is archived by the swipe itself): it leaves the list and its unread messages stop counting in the subtitle, the Phone tab dot and the badges, but its messages are kept (`chat_threads.archived`, added to existing devices by `ensureTableColumns`). An **archive button in the header's right slot** switches the list to the archived threads (title "Archived", subtitle the count; the button becomes a messages icon to go back), where the same swipe says Unarchive. **Replying in an archived thread, or replaying it, brings it back to the list.** Shrodi's card does not swipe. The old postage-stamp and envelope look went with the postbox.
- **Thread** (`chat.tsx`, `components/phone/ChatBubble.tsx`), drawn like a messenger: the teacher's name over the first bubble of a run and their round picture beside the last, filled bubbles on the left (the last of a run squarer on the speaker's side), the learner's replies as blue bubbles on the right, a story's subject line across the top, and the subtitle in the header counts the letters the teacher has written. The reply buttons are chunky like the app's other buttons (a face on a thicker bottom edge that it sinks onto when pressed): text chips with a blue edge and blue label, reactions on round buttons and stickers on rounded squares with a neutral edge. A reaction the learner sent sits on the right edge of the teacher's bubble, at its bottom corner. **A link is not a reply:** a reply that only opens a page (an `action` and no `next`: open X in AtomDex, the next lesson, a Myth Buster round, an app) is drawn above the replies as its own wide blue button with the icon of where it goes, the label, a small line saying what it opens (`linkInfo` in `chat-core.ts`: "Opens AtomDex"...) and an arrow; tapping it only navigates, sends nothing and leaves the replies where they were (`isLinkReply`). A link counts toward the two to six, takes no type, must be a text label (`chat-link-type`) and needs a real reply beside it (`chat-replies-links-only`). An action reply that also has a `next` is still a normal reply that sends and navigates. Typing and the end of a thread are as described above.

### A teacher's profile: Posts and Chats

The profile (`app/npc/[id].tsx`) has a tab switch under the bio, Posts and Chats. Chats lists every story that teacher has (never a free chat, which stays private), in the order they were written, whether the learner has unlocked it or not (`storyList` in `chat-core.ts`, read by `useStories`). A locked story shows a lock, its subject and what unlocks it in the words a locked app uses ("Finish 3 lessons.", "Reach level 4.", "Finish the unit …", "Get the … app on your phone.", "Come back after 3 days or more away."), with how far the learner is ("2 of 3 lessons finished"); a teacher who is not in Contacts yet asks for a lesson of their unit first. Tapping a locked story only plays the invalid cue. An unlocked story shows its status (New, In progress, Finished with the play count) and the date: a story with no thread yet starts (`startStory`, the same thread the unlocking would make), a New or In progress one opens in the phone's Chats, and a Finished one is replayed from its first message (`restartThread`) and opened. With none, it says the teacher has no stories yet.

### New chat: choosing a contact

`new-chat.tsx` is laid out like picking a contact on a phone, under the red Chats header (title "New chat", subtitle "Choose a contact"): a short **Recent** section (the up to three teachers written to last), then everyone in **A to Z sections** with sticky letter headings, a round picture, the name, what they do and, if there are chats already, "2 chats"; a hairline starts at the name; a letter rail down the right edge jumps between sections once there are five or more letters. Tapping a contact starts a fresh free chat at once (a teacher greets with their menu, so there is nothing to type); Shrodi opens his own chat. No search box (text inputs stay in Field Notes).

### Headers: the app's usual row, with each app's own art and colour

Field Notes (the yellow legal pad), the Reference Library (wood and books) and Chats (now the app's plain header, no colour band) keep their colours (and the pad's and the wood's art), but their controls row is the app's usual header (`components/phone/band-header.tsx`): 24 dp side padding, 48 dp slots with a 24 dp icon, a centred 22 dp title with a 13 dp subtitle that holds the count ("5 notes", "12 sources", "2 unread", "4 letters"), instead of a pill; the colour of icon and text is the header's own (cream on wood and red, ink on the pad). Contacts has no themed art and uses `ScreenHeader` itself.

### Header for Chats (plain, themed); Contacts uses the usual header

Same family as the Field Notes pad and the Library's wood (a coloured band, bare cream icons, a centred title, a count as its subtitle, on a lip), the Chats frame in `components/phone/ChatFrame.tsx` (EX-13 fixed colour, same in light and dark):

- **Contacts:** no themed art: the app's usual `ScreenHeader` (back, centred title "Contacts", the count as its subtitle), so it follows light and dark mode like every other page. Chats keeps its red band.
- **Chats:** the red band was removed: the header is the page colour with theme text and icons (`ChatFrame.tsx`, light and dark mode), no lip. The subtitle counts unread messages.

The thread screen (`chat.tsx`) keeps the messenger header.

### App icons in the style of iOS icons (change after phase 3)

Each app icon is drawn after iOS's set (revision 8): a squircle (corner radius 27% of its size, `borderCurve: continuous` where the platform has it) with a big, several-colour picture in the lesson object style (flat colour, no outlines or gradients, light from the upper left, the far side one step darker), glass shown as a see-through layer over another, and tiles that are not all the same: most take the catalog's colour, but **Contacts, Field Notes and the Reference Library have a white tile with a colourful picture ** (`APP_ICON_TILE`, `ICON_TILES`; the `dark` tile is unused for now), and some pictures run to the tile's edge and are cut to its corners (the notepad's yellow top, Contacts' coloured index tabs, the map). Chats are one big speech bubble with no shadow, Contacts a bald, faceless person (no hair, eyes or ears) with the index tabs, AtomDex a book that is the tile itself (the tile's colour is the cover, a darker spine runs down the left) with a big coloured atom on it, Daily Fact a big glowing glass bulb with a ribbed base and no rays, Settings a gear with three spokes, Shop at full size: a red and white striped roof with round scallops across the top, a window and a half door (cut by the tile's bottom edge) below, Field Notes a page with a yellow top and a pencil, Atom Scanner a radar of see-through rings with a sweep inside a viewfinder, Reference Library four books of four colours side by side, no shelf, full size and running off the bottom edge, and for the planned apps a camera with a lens of rings, a shield with a tick (its far half darker) and a map with a river, roads and a red pin. The tile keeps the face-and-lip look and the theme's colour per role; on a coloured tile the picture is mostly white and cut-outs (the bubble's dots, the gear's hub, the shop door) show the tile's own colour. Pictures are pure data in `components/phone/app-icon-art.ts` (fixed hues from the object art's families, EX-13; `$face` and `$lip` are the tile's colours), drawn by `AppGlyph.tsx`; `node scripts/render-app-icons.mjs <dir>` makes a contact sheet. An app with no picture falls back to its icon glyph.

### Camera, Safety Guide and Nuclear Map (phase 4 as built)

All three are `status: "live"` in the catalog (Camera: first shop item owned; Safety Guide: unit *Radioactivity* completed; Nuclear Map: level 5). Typecheck, lint, `check:icons`, `check:theme-colors`, `check:phone`, `test:photo`, `test:world-map`, `test:safety`, `test:map`, `test:phone`, `test:legal` and the content and Studio suites pass. **Nothing has been seen on a screen or a device.** The seeded content is an unpublished draft and every one of its sources is unverified; the Safety Guide in particular needs a human review against the cited pages before it ships. The old Guide code (`app/phone-apps/shrodi.tsx`, `services/guide/`) is still unlinked in the repository.

### Wallpapers (change after phase 4)

The Phone tab's header has a button (a gallery icon, on the right) that opens `app/phone-apps/wallpapers.tsx`. It lists seven choices as little phones with a ghost grid of app icons on each: **My avatar** (the learner's own paint and pattern: **the default**, what a new phone wears and what it wore before wallpapers), **Plain** (the app's page colour with the theme's text), and five calm illustrated wallpapers: **Orbit** (three crossing orbits round a nucleus on bright blue), **Sunny waves** (warm ribbons rolling under a golden sky), **Green hills** (a pale sky, a small sun and three soft hills), **Moonlight** (a pale moon over two dark hills in a deep blue sky) and **Bubbles** (big soft circles of purple and pink). A tap puts one on the phone at once. The choice is a preference (`STORAGE_KEYS.PHONE_WALLPAPER`, `getPhoneWallpaper`/`setPhoneWallpaper`/`subscribePhoneWallpaper` in `services/storage.ts`, `usePhoneWallpaper`), cleared with everything else by Delete Account, and named in the privacy text (`LEGAL_VERSION` 2.5).

The wallpapers are pure data in `components/phone/wallpaper-art.ts` (one 100 x 200 frame each, lesson object style: flat colour, no outlines or gradients, fixed hues, theme exception EX-13; `base` is the colour behind the picture and `ink` the colour of the header's title and button on it), drawn by `WallpaperLayer.tsx` with `slice` so any screen shape is covered. **They must stay calm:** a few big flat shapes, nothing in the middle where the icons sit (the sun and the moon are below the grid, above the hills), no small pictures repeated across the page. A first set of five included a lab-doodles pattern, an aurora and dusk towers; they were busy and clashed with the icons, so they were replaced (`test:wallpaper` now fails a wallpaper with little pictures or over 40 shapes). The ids, names and "an unknown or missing saved value is the learner's own" rule are in the framework-free `wallpaper-core.ts` (`test:wallpaper`); `node scripts/render-wallpapers.mjs <dir>` makes a contact sheet to look at. App labels sit on their own pill, so they read on every wallpaper. Not done: wallpapers sold in the Shop, or the learner's photos as a wallpaper.
