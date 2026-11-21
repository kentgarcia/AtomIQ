# Content source files

Text that a person writes lives here as `.atomiq` files. `npm run content:sync` turns them into rows of the content database (`content/database/content.db`), which is what the app ships and reads. The files are the master; the database is built from them. Spec: `docs/features/CONTENT_SOURCE_SPEC.md`.

| Command | What it does |
|---|---|
| `npm run content:sync` | dry run: every insert, update, delete and move, and the validation result |
| `npm run content:sync -- --apply` | writes it (backup first, then the tests that read the touched tables) |
| `npm run check:source` | changes nothing; exit 1 if the files cannot be read or differ from the database |
| `npm run content:export -- <adapter> --force` | writes the files from the database (recovery, or taking a database change into the files) |
| `npm run content:format` | puts every file in canonical form (`--paths` renumbers the `NNN-` prefixes) |

Never edit a table that is listed here with `content:edit` or Studio: the sync would report drift. Delete a shipped id only with `--retire "<reason>"`.

## Chat (`chat/<npc-id>/NNN-<root-id>.atomiq`, one file per story, the free chat is `010-`)

```
node chat-ada-up-hello          a node and its id
kind: unprompted                greeting | reply | unprompted | sign_off
pose: cheer
trigger: lessons_completed:6    only on the node that opens a story
title: hi hi hi. it's ada       the thread's subject line (a story's first node)

    HELLO                       the words, indented 4 spaces: a blank line starts a new bubble

    (sorry. i've been waiting to say that forever)

reply: hi ada -> chat-ada-hello-q                       a text reply and the node it leads to
reply: open it -> chat-x => entry half-life             a reply that also opens a screen (=> screen [id])
link: See the lesson => next-lesson                     a reply that only opens a screen
react: love -> chat-y                                   a reaction (an id of chat-art)
sticker: nerd -> chat-z                                 a sticker (an id of chat-art)
```

A message offers 2 to 6 replies of one type; a reaction or sticker with no `->` ends the story. A node that no reply leads to is an error (the validators run before anything is written). A line that starts with `#` at the left edge is a comment and never reaches the database.
