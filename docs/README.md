# docs

Specs are grouped by how much they matter when you are about to ship or change something. When a spec is finished, reverted or replaced, move it to `completed/` (use `git mv`, then update every `docs/...` reference to it).

| Folder | What lives here | Read it when |
| --- | --- | --- |
| `critical/` | Release, policy and process rules that must stay true, and the ones a gate enforces: versioning, Play release, legal, media policy, theme exceptions, content quality, the content database and Studio. | Before any build, publish or release, and before touching what they govern. |
| `features/` | Specs of the product's features and systems: Phone, Feed, NPC teachers, Tutorial, Onboarding, Atom Maze, SFX, the lessons, micro-interactions. | Before changing that feature. |
| `qa/` | Device checks, acceptance records, smoke matrices and feedback follow-ups. | When verifying on a device or planning a test pass. |
| `completed/` | Finished, reverted or superseded work, kept for the record. | When you need the history of a decision. |

`ICON_INTEGRITY_SPEC.md` is still at the top level: its status says "draft", but `check:icons` and `test:icons` exist, so it may be done. Decide, then file it under `completed/` or `critical/`.
