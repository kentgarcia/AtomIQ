# Article and research pipeline

Spec reference: `ATOMIQ_FEEDBACK_SUMMARY_SPEC.md` section 5.4.

Articles and feed posts are short **educational summaries** written by AtomIQ. The material they are based on is the **source**, shown separately in the app as a "Summary" section and a "Source" section. Content works offline because it is bundled in `content.db`. Only the "Open the source" link and remote images need a connection, and both fail gracefully.

## Where it lives

- Tables `articles` (long form) and `posts` (short feed items) in `content/database/content.db`.
- Facade `content/articles` (types in `content/articles/types.ts`), mapping in `services/content-db.ts`.
- Reader screen `app/article-detail.tsx`; Discovery feed `app/(tabs)/community.tsx`.
- Edit with the Content Studio (`npm run content-studio`), then run `npm run validate:content` and `node scripts/sync-content.js`.

The bundle is copied over the on-device database whenever its content hash changes (`CONTENT_DB_VERSION` is derived by `sync-content.js`; never edit it by hand). User data (profile, progress, bookmarks, activity) lives in separate local stores and is not touched by a content update. Schema changes are therefore additive migrations applied to the master database: `scripts/content-migration/add-article-pipeline.mjs` (idempotent) and mirrored in `scripts/content-migration/schema.sql`.

## Fields

Required unless noted. `validate:content` fails when a required field is missing or malformed.

| Field | Meaning |
| --- | --- |
| `title`, `excerpt` | Title and one- or two-sentence summary (at least 40 characters) for lists. |
| `category`, `difficulty`, `read_time` | Topic, `beginner`/`intermediate`/`advanced`, whole minutes. |
| `content` | Markdown body: the AtomIQ educational summary. No pasted source text, no source URL, no copyright boilerplate. |
| `author` | JSON `{ name, avatar, title }`. Use the real organization, or "AtomIQ Editorial Team" for our own writing. Do not invent people or credentials. |
| `published_date` | ISO `YYYY-MM-DD` date AtomIQ published the item. |
| `source` | Name of the source publisher. |
| `source_url` | `https://` link to the specific page the summary draws on (not a site homepage). |
| `source_type` | `government-agency`, `international-organization`, `research-institution`, `university`, `industry-association`, `standards-body`, `news-media`, `encyclopedia`, `textbook`, `other`. |
| `source_note` | What the source is and how the summary uses it. Shown to learners. |
| `source_published_date` | Optional. ISO date of the source itself, only when known. |
| `summary_origin` | `original` (our wording), `adapted` (close paraphrase), `excerpt` (copied or nearly copied: needs rewriting before release), `unknown`. |
| `review_status` | See review states below. |
| `last_reviewed` | ISO date of the last editorial check of this entry's metadata and sources. |
| `reviewed_by` | Required when status is `reviewed`. |
| `review_notes` | Editor-facing to-do list and caveats. Never shown to learners. |
| `related_lessons`, `related_concepts`, `related_myths`, `related_elements` | JSON arrays of lesson ids, encyclopedia entry ids, myth ids, and element symbols (`["U", "Pu"]`). Ids and symbols are validated. |

Posts carry the same metadata plus `read_time`, `difficulty` and `related_myths`.

## Review states

- `draft`: being written; not for release.
- `needs-review`: written or imported, not yet checked line by line against the source.
- `in-review`: a reviewer is checking it.
- `reviewed`: summary checked against the source by the named reviewer on `last_reviewed`.
- `outdated`: the source or facts changed; update or retire.

Release gate: `node --no-warnings scripts/validate-content.mjs --strict-review` fails while anything is not `reviewed`. The beta may ship with `needs-review` items only if the release notes say so.

## Publishing process

1. Pick a topic from the priority list: authoritative, beginner-friendly explainers before volume (radiation basics, half-life, reactor safety, medical isotopes, food irradiation, waste).
2. Choose a primary or authoritative source (regulator, IAEA, WHO, EPA, DOE, national lab, peer-reviewed review). Prefer these over aggregators and industry advocacy; if you cite an industry body, cross-check with a regulator.
3. Open the source and confirm the exact page URL works. Record the check date. If a site blocks automated checks, open it by hand.
4. Write the summary in your own words: 250-450 words, plain language, one idea per heading, short key takeaways. Do not copy sentences. Do not put the URL in the body.
5. Fill every metadata field above. Link lessons, concepts, myths and elements that genuinely help the learner.
6. Add or edit the row in the Content Studio (or a migration script like `add-beginner-articles.mjs`), starting at `needs-review`.
7. A second person compares summary and source, fixes errors, then sets `reviewed`, `reviewed_by`, `last_reviewed`.
8. Run `npm run validate:content`, `npx tsc --noEmit`, then `node scripts/sync-content.js`.
9. Check the reader offline: summary and related links render; the source link shows a clear message when it cannot open; images show a placeholder.

## Cadence suggestion

- Weekly: add 1-2 reviewed summaries; skim the feed for stale items.
- Monthly: re-check source links and set `outdated` where facts changed; review anything `needs-review` older than 30 days.
- Quarterly: audit the library for gaps (lesson coverage, difficulty mix) and retire time-limited posts such as event announcements.
- Before each release: run the strict review gate and list deferred items in the release notes.

## Release checklist

- [ ] `validate:content` passes (and `--strict-review` for a full release).
- [ ] No `summary_origin = excerpt` items are marked `reviewed`.
- [ ] Every source URL opens (manual check where the site blocks scripts).
- [ ] No invented authors or credentials.
- [ ] Offline pass: Discovery feed and article detail open; images and links degrade without crashing.
- [ ] Theme check, icon check and typecheck pass.

## State of the backfill (2026-11-14)

- All 5 legacy articles and 20 feed posts have source type, review state and dates, but none is `reviewed`.
- The 5 legacy article bylines were unverified personas; they were replaced by "AtomIQ Editorial Team". Their source links are site homepages and need specific pages.
- 8 feed posts (IAEA, ANSTO, DOE Philippines, NEA, PNRI) read as copied source text (`summary_origin = excerpt`) and need rewriting. One source link (`nuclear-safety-stats`) did not respond.
- 12 ScienceDaily posts are short paraphrases of university press releases; ScienceDaily is an aggregator, so link the original release.
- Six new original summaries were added (radiation basics, half-life, reactor safety, medical isotopes, food irradiation, used nuclear fuel). All are `needs-review`: their links were reachability-checked (FDA blocks scripts) but the text has not been verified line by line.
