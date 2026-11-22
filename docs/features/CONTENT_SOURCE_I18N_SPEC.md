# Content source files, phase 6: translations

Status (2026-11-22): built. The model is the owner's (main spec section 11): **a translation is a file for one language that maps a record's text to its translation; the app asks for the learner's language and falls back to the base text.** This document fixes the details that section left open. Where it and the code differ later, the code and its tests (`test:i18n`) win and this text is fixed.

## 1. What is built

| Piece | Where |
|---|---|
| the rules (paths, what is words, placeholders, language chain, laying a translation over a row) | `content/i18n/i18n-core.ts` (framework-free, used by the app, the tooling and the tests) |
| the file form | adapter `i18n` (`scripts/lib/content-source/adapters/i18n.mjs`): `content/source/i18n/<locale>.atomiq` -> `content_translations` |
| validation | `scripts/lib/i18n-rules.mjs`, run by `validateDatabase`: `validate:content`, `content:sync` and the publish gate |
| runtime lookup | `contentRepository.getTranslationLocales()`, `getTranslations(locale, entity)`, `translate(entity, rows, idOf, locale)` in `services/content-db.ts` |
| tests | `npm run test:i18n`; the adapter also runs in `test:source-adapters` (goldens in `scripts/golden/content-source/adapters-v1/i18n/`) |

No language ships yet and the app has no language setting: with no file the table is empty, `translate` returns the rows it was given, and nothing in the app changes. A screen adopts translation by passing its hydrated rows through `translate` with the learner's locale, one query at a time.

## 2. The file

```
format 1
adapter i18n 1
locale: es

entry chat_nodes chat-hal-greeting
replies[0].label: hola
title: Charla
text:
    Buenos días.

    ¿Qué quieres aprender hoy?

entry lesson_cards half-life/c01
data.title: Vida media
```

This is the core format unchanged: a record `entry <entity> <entity id>` whose attributes are the translated fields. Main spec 11.1 sketched one flat `<entity>/<id>#<path>: text` line per text; the record form says the same with the same information and needs nothing new in the core (an id part may contain `/`, and a path is an ordinary attribute key). The adapter's field list is **open** (`open: true` on a custom field in the engine): any key of an entry is one translated field path.

- `locale` is a language code (`es`, `pt-BR`, `zh-Hant`), the file name is `<locale>.atomiq`, and the base language (`en`) never has a file.
- `<entity>` is the table name; `<entity id>` is its primary key, `lesson/card` for a card.
- A path is a column, then `.key` and `[index]` into a JSON column or a list: `title`, `options[1]`, `data.options[0].label`. Entries are written in path order, indexes as numbers, so a second write changes nothing.
- A missing entry or a missing path means "read the base text". Never write the base text again to say so.

## 3. What can be translated

A translation changes words and nothing else. What counts as words is declared in one place and read from there:

- a column an adapter marks `translatable: true` and that holds text (`title`, `text`, `bio`, `definition`...): the path is the column;
- a text-list column (`options` of a Myth Buster question, `quick_facts`, `steps`): `col[index]`;
- inside a JSON column marked translatable (`items.data`, `lesson_cards.data`, `chat_nodes.replies`, `blog_posts.blocks`): a non-empty string under a **word key** (`prompt`, `statement`, `explanation`, `label`, `note`, `title`, `body`, `hint`, `task`, `caption`, `altText`, `text`, `name`, `summary`, `description`, `question`, `blurb`, `fact`, `tag`, `reason`, `heading`; `WORD_KEYS` in `i18n-core.ts`), plus the `items` of a blog list block. Everything else is structure and is refused: ids, picture and icon names, types, answers, `next` targets, positions, and the `label` of a sticker or reaction reply (that label is the id of a picture).

Not translated yet, on purpose: texts that an answer points into by value (a `fill` item's bank and answer, the words of an `order` or `sort` item, a `match` item's pairs). Translating one side without the other would break the grading, so they need their own design (stable ids on those parts) when a language is written.

## 4. Rules (`i18n-rules.mjs`, all errors)

`i18n-locale` (a bad code, or the base language), `i18n-entity` (a table with no translatable text), `i18n-record` (no such record), `i18n-field` (a column that is not words), `i18n-path` (a path that does not exist in the base record, or is structure), `i18n-text` (empty or not text), `i18n-placeholders` (the translation must keep the base text's `{name}` values and `[[pic:id]]` pictures exactly, each as many times).

Because they run inside `validateDatabase`, a translation that fell behind its base (a card deleted, an option removed) fails the next `content:sync` or validation with the path named, instead of shipping. At runtime the opposite holds: `applyTranslation` ignores a path that no longer exists, so a stale entry shows the base text and never breaks a screen.

## 5. The runtime

`localeChain("pt-BR", available)` is `["pt-BR", "pt"]` (only languages that exist, the base language is never in it). `getTranslations` returns, per record, the entry of the first language in the chain that has one; entries of two languages are not mixed for one record. `applyTranslation(row, fields)` lays the paths over a hydrated row (JSON columns already parsed) and returns a copy; the base row is never changed.

## 6. Left for when the first language is written

- **List positions** (`replies[0]`, `options[1]`) move if the base reorders or inserts. If that hurts, the additive fix is stable ids on those children, added by one `content:migrate` run (main spec 11.3).
- **Staleness** (a hash of the base text next to an entry, to see that a base text changed after it was translated) is optional and additive; not built.
- **Per-language voice rules** (`test:voice` is English), length limits, and a translator's checklist belong with the first language.
- **The learner's language setting** and the interface strings that live in code (not in the database) are separate pieces of work; this phase is the content side only.
