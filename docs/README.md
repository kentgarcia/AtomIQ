# docs

Specs are grouped by how much they matter when you are about to ship or change something. When a spec is finished and still explains how something works, move it to `completed/` (use `git mv`, then update every `docs/...` reference to it).

| Folder | What lives here | Read it when |
| --- | --- | --- |
| `critical/` | Release, policy and process rules that must stay true, and the ones a gate enforces: versioning, Play release, legal, media policy, theme exceptions, content quality, the content database and Studio. | Before any build, publish or release, and before touching what they govern. |
| `features/` | Specs of the product's features and systems: Phone, Feed, NPC teachers, Tutorial, Onboarding, Atom Maze, SFX, the lessons, micro-interactions. | Before changing that feature. |
| `qa/` | Device checks, acceptance records, smoke matrices and feedback follow-ups. | When verifying on a device or planning a test pass. |
| `completed/` | Finished work that still explains how something works. | When you need the history of a decision. |

Delete a spec once it is finished and nothing cites it, or when it is reverted or replaced: git history keeps it, and a stale spec misleads the next agent that reads it. Before deleting, grep for `docs/...` references (code comments cite specs too).
