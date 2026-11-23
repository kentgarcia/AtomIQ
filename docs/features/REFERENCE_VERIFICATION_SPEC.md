# Reference verification and misinformation checker

Status: **proposed, nothing built yet** (written 2026-11-22). Split into work packages (section 9) so each can go to a separate agent. Read sections 1 to 3 first whichever package you take.

Why now: the first public release is blocked by the publish gate because every one of the 58 sources is `verified = 0`, and the app teaches radiation safety to learners. Nobody has yet checked that the sources say what the content says. This spec covers (A) checking the sources and (B) checking the claims the app makes against them.

## 1. Where things stand (measured 2026-11-22)

| Fact | Value |
| --- | --- |
| `content_references` rows | 58 (43 official, 11 textbook, 4 research), all `verified = 0` |
| Rows with no URL | 8 (7 official, 1 research). Seven have a `note` starting "Candidate": a name from a search summary, never opened (one, IAEA-TECDOC-1363, is flagged as unconfirmed). The eighth, `ref-becquerel-1896`, is a research paper with no URL and no "Candidate" note: it needs a DOI or a human lookup |
| Rows with no `accessed` date | 13 |
| Where references are linked | 27 lesson links (`lesson_references.supports` is a free-text label), 6 unit, 9 blog, plus scan target, safety card and map site links |
| Items with no `reference_ids` | 9 of 122 |
| **Inline sources outside the gate** | 115 `encyclopedia_entries.sources` and 37 `myths.sources` carry their own JSON `{title, url, ...}`. They are not `content_references`, have no `verified` flag, and the publish gate never looks at them |
| Learner-facing claim text | 10 lessons, 124 lesson cards, 122 items, 150 Myth Buster questions, 37 myths, 20 unit statements, 115 AtomDex entries, 14 safety cards, 18 map sites, 12 scan targets, 4 blog pieces, 131 chat nodes, 92 feed templates; hardcoded: `services/guide/topics.ts`, the daily fact (`getDailyFact()` in `services/missions.ts`: normally one of the 37 myths, so covered by the inline-source gap, but the hardcoded `FALLBACK_FACT` has no source at all) |
| Existing gate | `strictReview` in `scripts/lib/curriculum-rules.mjs`, `feed-rules.mjs`, `safety-rules.mjs`, `map-rules.mjs`, `scan-rules.mjs` makes an unverified linked source an error at publish. `reference-incomplete` needs a URL (or authors and year) and an `accessed` date once verified |
| Who maintains `verified` | `CONTENT_SOURCE_SPEC.md` decision 5: the owner does not maintain the flag by hand; it is an ordinary field of `content/source/reference/sources/<kind>.atomiq`. This spec gives it a process so it can be trusted without the owner doing the legwork |

## 2. Non-negotiables

1. **`verified: 1` means someone read the page and checked each claim against it.** Original rule: only a person sets it, through the ledger in section 5.5 (a flag flipped in a file without a ledger entry is an error in `check:review`, once that exists).

   **Owner decision, 2026-11-23: the owner delegated the checking and the sign-off to the agent** ("you do that"; the owner does not verify, check or sign by hand). So until the ledger tooling exists, an agent may set `verified: 1` and `accessed:` on a source in `content/source/reference/sources/` only after it has (a) fetched the page and read its text in full, (b) matched the title and publisher to the row, and (c) checked every "supports" statement against quotes from that page, rewording the statement to what the page really says. The row's `note` records this ("Checked by the agent on the owner's instruction", the date, and where the page is narrower than the lesson wording). Limits that stay: a page a script cannot read (`blocked`) is not verified by an agent; a claim of tier A (section 3: safety cards, dose and protective-action statements) needs a T1 source that states it in a quote, and anything weaker is reported in the hand-off rather than waved through; an agent never claims in a note that the owner signed something the owner did not. Later tooling (the ledger, `check:review`) takes the agent's name as the reviewer.
2. **Evidence is quoted and machine-checked.** Every "this source supports that claim" comes with a verbatim quote (25 words or fewer) from the fetched page text. A script re-checks that the quote is in the page. A quote that is not there makes the whole finding invalid. This is the guard against an agent inventing support.
3. **Never invent a URL, title or quote.** A candidate source is only proposed after it was fetched and its title and publisher matched the row. A name from memory or a search summary is a lead, not a source.
4. **Checkers do not edit content.** Findings are written to `content/review/` as proposals. Fixing text goes through the normal paths (`content/source/**.atomiq` plus `npm run content:sync` for owned tables, `npm run content:edit` for the rest). Fixes are a separate change from the report that found them.
5. **Do not bypass blocks.** A page that answers 403 to a script, a login wall or a paywall is `blocked`, handed to a human to open. Reachability from a script is not stable: the first URL pass (`content/review/reference-url-check-2026-11-22.md`) and a spot check from another machine disagreed on the same pages (see section 4.2 step 2), so `blocked` must never be read as `dead` and `reachable` never as `verified`. No headless-browser tricks to get round it, no cached copies from third-party scrapers.
6. **Privacy and politeness.** Requests carry a generic User-Agent (`AtomIQ-reference-check`), no project or user details, at most 1 request per host per 2 seconds, `robots.txt` respected. Only public text of claims is ever searched for. The app itself stays offline: nothing here ships in the bundle.
7. **No content schema change.** Evidence lives beside the content (`content/review/`), not in new columns, so `CONTENT_SCHEMA_VERSION` does not move.
8. **Safety content is judged by the strictest rule.** When in doubt about a claim that tells a learner what to do around radiation, the verdict is `needs-human`, never `supported`.

## 3. Risk tiers and source policy

Every claim gets a tier from where it appears and what it says (`claim-tier` in section 7).

| Tier | What | Needs |
| --- | --- | --- |
| **A** | Protective actions, dose and exposure statements, health effects, "safe", "harmless", "dangerous" words, KI, shielding, contamination, emergency steps: all safety cards, and any lesson, item, myth, chat or AtomDex text that says them | At least one **T1** source that states it, quoted, and a human sign-off on the claim |
| **B** | Quantitative science: half-lives, energies, masses, charges, decay modes, counts, dates of measurements, named definitions | One T1 or T2 source, quoted; numbers must match exactly (units and rounding stated) |
| **C** | History, biography, places, organisations, who discovered what and when | One T1, T2 or T3 source, quoted |
| **D** | Voice, jokes, game text, social posts, UI, reactions, anything with no checkable statement | Lint only (section 7.3), no source needed |

Source tiers: **T1** primary or intergovernmental or regulator (IAEA, UNSCEAR, WHO, ICRP, CDC, EPA, US NRC, DOE and national labs, NIST, CERN, Nobel Prize, national health agencies, peer-reviewed papers). **T2** textbooks and university or OpenStax material. **T3** reputable secondary (encyclopedias, museum and history-of-physics sites, industry bodies such as the World Nuclear Association, labelled as industry in the dossier). **T4** everything else: never counts as support for tier A or B, flagged on tier C. The list of domains per tier is data in `scripts/lib/source-policy.mjs`, reviewed by the owner.

## 4. Part A: reference verification

### 4.1 What "verified" must mean after this work

A reference is verified when all five hold, each with evidence in its dossier:

1. **Reachable.** The URL answered 200 (after at most 3 redirects, final URL recorded) and the page text was read, or it is a book or paper with a stable identifier (ISBN, DOI) that a human looked up.
2. **Is what the row says.** The page's title and publisher match the row's `title` and `publisher` (fuzzy match, a human settles ties). A row whose page says something else is `mismatch`.
3. **Complete.** `url` (or authors plus year for a book), `year` where one exists, and `accessed` set to the check date.
4. **Supports what it is linked for.** For every place the reference is linked (`lesson_references.supports`, unit, blog, scan, safety, map, item `reference_ids`, and the claims the checker in Part B attributes to it) there is a quote from the page, or a stated reason it only backs the topic.
5. **Right tier for its job.** A T4 source linked from tier A content fails.

### 4.2 Pipeline (per reference)

1. **Inventory** every reference and every place it is cited, including the inline JSON sources of AtomDex entries and myths (section 4.4).
2. **Fetch** (rate limited, cached 7 days; record the User-Agent and the machine, since sites such as cdc.gov, nrc.gov and ready.gov answer 200 or 403 depending on the client, and `robots.txt` can forbid a page, as it did for `hpmmuseum.jp`): status, redirect chain, content type, final URL, page title, text. PDFs through `pdftotext`. Store only a hash of the text, the quote, the retrieved date and the final URL; do not commit full page text (copyright, size).
3. **Match** title and publisher; flag redirects to a home page, soft 404s ("page not found" text with a 200), moved content, and pages whose text no longer contains the linked topic.
4. **Check support** for each citation (the claim text comes from the cited content: card text, item explanation, the `supports` label). Produce a verdict and a quote.
5. **Discover** a source for each of the 7 "Candidate" rows (and for `ref-becquerel-1896`, a stable identifier such as a DOI or a human lookup): search for the named document on the named publisher's own site, fetch the result, apply steps 3 and 4. If nothing matches, status `not-found` and the row is proposed for removal or replacement, never kept with an invented URL.
6. **Write the dossier** `content/review/evidence/<reference-id>.json` (section 4.3).
7. **Digest for the owner** (section 8): one generated page per run, safest-first.

### 4.3 Dossier format

```json
{
  "v": 1,
  "referenceId": "ref-cdc-potassium-iodide",
  "checkedAt": "2026-11-23",
  "checkedBy": "agent:<name or run id>",
  "fetch": { "url": "...", "finalUrl": "...", "status": 200, "redirects": 1, "contentType": "text/html", "textHash": "sha256:...", "title": "...", "archiveUrl": null },
  "identity": { "titleMatch": "exact|close|different", "publisherMatch": "yes|no", "sourceTier": "T1", "problems": [] },
  "completeness": { "missing": ["accessed"] },
  "citations": [
    { "where": "lesson_references:radioactivity-safety/ref-cdc-potassium-iodide", "claim": "KI protects only the thyroid", "verdict": "supports", "quote": "KI ... protects the thyroid gland only", "quoteVerified": true }
  ],
  "status": "ready-for-review",
  "notes": ""
}
```

`status` is one of `ready-for-review` (all five conditions met), `needs-fix` (the row or its links must change; the dossier lists what), `blocked` (a human must open it), `not-found`, `mismatch`, `dead` (unreachable after 3 tries over 2 days). Citation `verdict`: `supports`, `partial` (backs part of it), `topic-only`, `not-found`, `contradicts`.

### 4.4 Inline sources (the gap)

AtomDex entries and myths carry sources as JSON in their own row, outside the gate. Two options, decided in section 10 (default: **a**):

- **a. Check them, do not migrate them.** The same fetch, identity and support steps run on those URLs, and a new rule `inline-source-unchecked` (warning in draft, error under `strictReview`) requires every URL there to appear in the dossier set with `ready-for-review` or a ledger sign-off keyed by URL.
- **b. Convert them to `content_references` links.** Cleaner, but it changes owned source files for 152 rows (115 AtomDex entries and 37 myths) and the encyclopedia and myth adapters.

### 4.5 Sign-off, ledger and the gate

- `content/review/ledger.json`: append-only, like `content/releases.json`. Entry: `{ "referenceId", "action": "verified" | "revoked", "reviewer", "reviewedAt", "evidenceHash" }` where `evidenceHash` is the hash of the dossier reviewed. `content/review/reviewers.json` lists the humans allowed to sign.
- `npm run review:references -- sign <id...> --reviewer "<name>"` (interactive terminal only, asks to confirm) appends the entry and sets `verified: 1` and `accessed:` in the source file, then runs `content:sync`. **Agents must not run `sign`.** `-- revoke <id> --reason "..."` does the reverse.
- New check `check:review` (also run by `validate:content --strict-review` and the publish gate): every reference with `verified: 1` must have a latest `verified` ledger entry by a listed reviewer whose `evidenceHash` equals the current dossier's. Editing a dossier after sign-off makes it stale and the gate fails until re-signed. A reference whose dossier says `needs-fix`, `mismatch`, `dead` or `not-found` cannot be signed.
- **Staleness.** `check:references-live` (not a publish gate, run monthly by hand or CI) re-fetches verified sources and reports link rot, redirects to a different page, and changed text hashes. A verified source older than 12 months by `accessed` is a warning.

### 4.6 Human checks already made

The owner personally opened the nine links the first URL pass could not reach (`ref-hiroshima-museum`, `ref-nagasaki-museum`, `ref-nrc-doses-daily-lives`, `ref-nrc-radiation-faq`, `ref-nrc-tmi`, `ref-osti-cp1`, `ref-ready-nuclear-explosion`, `ref-ready-radiation`, `ref-rutherford-1911`) and confirmed each works and says what is claimed (recorded in `content/review/reference-url-check-2026-11-22.md`). That is real evidence but it is not in the ledger. When `review:references` exists (WP 5), WP 3 imports it: those nine get dossier status `blocked`, and the owner's confirmation becomes their ledger entry once quotes are captured. Until then they are not `verified`.

## 5. Part B: misinformation checker

Goal: find statements in the app that are false, unsupported, out of date, internally inconsistent or dangerously phrased, before a learner sees them. It is a triage tool that makes the owner's review small and aimed, not an authority.

### 5.1 Claims

Run `claims:extract` to turn learner-facing text into atomic claims (one checkable statement each). A claim record:

```json
{
  "id": "claim:lesson_cards/radioactivity-half-life/c04#a1b2c3",
  "entity": "lesson_cards", "entityId": "radioactivity-half-life/c04", "field": "text",
  "textHash": "sha256:...", "text": "After one half-life, half of the atoms have decayed.",
  "tier": "B", "kind": "definition|number|date|causal|safety-advice|comparison|history",
  "numbers": [{ "value": 0.5, "unit": "", "raw": "half" }],
  "sourceIds": ["ref-openstax-chem-ch21"]
}
```

- The id ends with a hash of the claim text, so a changed sentence is a new claim and a stale verdict never attaches to new words.
- Extraction is rule based for structure (which fields of which tables carry text, including item `data`, card `data`, chat `text` and `replies`, blog `blocks`) and agent based for splitting into atomic statements; the split is recorded, so reruns are stable.
- Items yield two things: the claim made by the **explanation** and the **answer key** (section 5.3).
- Claim records are generated into `content/review/claims.json` (committed, sorted, diff-friendly). Translations inherit the verdict of their base text and are not checked separately.

### 5.2 Checks, cheapest first

| # | Check | Method | Output |
| --- | --- | --- | --- |
| 1 | **Source-grounded** | For each claim with `sourceIds` (or an inline source), find the supporting passage in the fetched text and quote it | `supported` with quote, `unsupported`, `contradicted` with the contradicting quote |
| 2 | **Independent corroboration** (tier A, and any claim with no source) | Search for a second T1 or T2 source that states it; fetch, quote | a proposed source, or `unsupported` |
| 3 | **Numbers** | Deterministic: every number, unit and date is extracted and compared with the figure in the linked source, and with the same fact elsewhere in the app (section 5.4) | `number-mismatch` with both values |
| 4 | **Answer key** | A checker that **does not see** `correct_answer` solves each item and Myth Buster question from the text and sources, then compares. Disagreement is a finding either way (wrong key, or a question with two defensible answers, or a distractor that is true) | `key-disagrees` |
| 5 | **Internal consistency** | Group claims about the same fact (half-life of an isotope, what alpha particles are, dose units) across lessons, items, myths, AtomDex, chat, feed and blog; flag any pair that cannot both be true | `inconsistent` with both ids |
| 6 | **Risk-phrase lint** | Deterministic rules on tier A text (section 7.3) | `lint:<rule>` |
| 7 | **Currency** | Claims with a date, a "current", "latest", "now", a count of plants or incidents, or a regulatory limit: flag when the source is older than the statement's own time claim or older than 5 years | `maybe-outdated` |
| 8 | **Figure data** | Lesson figures and sims (`components/lesson/visual/figures/`, decay chain and sim data) with numeric parameters: compare plotted constants with the cited values | `figure-mismatch` |

Verdicts: `supported`, `unsupported`, `contradicted`, `inconsistent`, `number-mismatch`, `key-disagrees`, `maybe-outdated`, `lint`, `needs-human`, `not-a-claim`. Every verdict except `not-a-claim` carries evidence (quote plus URL plus date, or the two conflicting ids); a verdict with no evidence is invalid.

### 5.3 Independence rules for agent checkers

- The checker that judges a claim is not the agent that wrote or last edited it, and gets the claim text and sources only, not the author's reasoning or the expected verdict (answer key included, check 4).
- High-risk verdicts get a second opinion from a separate run: every tier A claim, and every `contradicted` or `key-disagrees`. Disagreement between the two runs is `needs-human`.
- Prompts say the source may be wrong, the claim may be right, and "I could not find support" is a different verdict from "this is false".

### 5.4 Cross-content facts

A small curated file `content/review/facts.json` lists canonical values the app repeats (half-lives used, particle charges and masses, unit definitions, famous dates). The consistency check compares prose against it, and each fact there needs a T1 or T2 source and a ledger sign-off like a reference. It starts small, grown from what check 5 finds.

### 5.5 Findings, review and the gate

- Output: `content/review/findings.json` (committed) and a generated digest (section 8). Each finding: claim id, verdict, evidence, proposed fix text if there is an obvious one (clearly marked a proposal), severity.
- Severity: tier A `unsupported`, `contradicted`, `key-disagrees` or `lint` = error; tier B `contradicted` or `number-mismatch` = error; every other verdict = warning; tier C and D = warning at most.
- A human answers each finding with one of: `fixed` (content changed; the claim's new hash is rechecked), `accepted` (claim stays, reason written), `source-added`, `wontfix-opinion`. Recorded in `content/review/decisions.json` with reviewer, date and the claim's text hash, so a later edit of that sentence reopens it.
- Gate (`check:review`, part of `release:content --publish`): no open error findings; every tier A claim is `supported` and signed, or carries a decision `accepted` with a reason. A waiver for anything else needs the same record. `--allow-unreviewed` remains the owner's explicit override and is logged in the release notes.

## 6. Files and commands

```
content/review/
  evidence/<reference-id>.json     dossiers (4.3)
  claims.json                      extracted claims (5.1), generated
  findings.json                    checker output (5.5), generated
  decisions.json                   human answers to findings, append-only
  ledger.json                      reference sign-offs, append-only
  facts.json                       canonical repeated facts (5.4)
  reviewers.json                   humans allowed to sign
scripts/lib/source-policy.mjs      domain tiers, tier assignment (3)
scripts/lib/review-rules.mjs       lint and consistency rules, pure and tested
scripts/verify-references.mjs      fetch, match, dossier (Part A)
scripts/review-references.mjs      sign, revoke, status (4.5)
scripts/extract-claims.mjs         claims.json (5.1)
scripts/check-claims.mjs           run checks 1 to 8, write findings
scripts/check-review.mjs           the gate
scripts/test-review-*.mjs          one test file per lib
```

`package.json`: `verify:references`, `review:references`, `claims:extract`, `check:claims`, `check:review`, `check:references-live`, `test:review`. `check:review` joins the publish gate and `eas-build-post-install` is unchanged (it already requires a published version).

Agents work on a copy for anything that writes: run `npm run content:edit` dry runs and `content:sync` dry runs, never `--apply` for a content fix without the owner's say-so.

## 7. Details for the rule-based parts

### 7.1 Tier assignment (`claim-tier`)

Tier A if the entity is `safety_cards`, or the text matches the safety vocabulary (`shield`, `dose`, `sievert`, `Sv`, `rem`, `contamina`, `evacuat`, `shelter`, `iodide`, `KI`, `cancer`, `sick`, `safe`, `harmless`, `dangerous`, `lethal`, `exposure limit`, `protect`), or its entity is linked from a safety card. Tier B if it has a number with a unit, a half-life, a particle or element property. Tier C if it names a person, year, place or organisation. Otherwise D. The vocabulary is a data list the owner can extend; a claim takes the highest tier that matches.

### 7.2 Consistency keys

Claims are grouped by normalised subject: element or isotope symbols (`U-238`), particle names, unit names, named events and people. Numeric comparison respects units and stated rounding ("about 4.5 billion years" and "4.468 x 10^9 years" agree).

### 7.3 Risk-phrase lint on tier A text

Errors: absolute safety words without a condition ("always safe", "completely harmless", "no risk", "never dangerous"); advice with no source and no "not an emergency service" context; a dose number with no unit or no time basis; "radiation" used as if it meant contamination (the app teaches the difference, see `ref-cdc-contamination-vs-exposure`); a protective step that conflicts with the CDC "get inside, stay inside, stay tuned" guidance without saying why; medical advice to take KI without the thyroid-only and official-instruction caveats. Warnings: fear-amplifying wording, "scientists say" with no named source, rounding that changes a conclusion. These rules are pure functions in `review-rules.mjs` with a table-driven test of good and bad phrasings for each.

## 8. Owner review (kept short)

The owner should not read dossiers. Each run generates `content/review/DIGEST.md`:

1. **Needs your decision** (tier A first): per item, the claim, the source quote, the verdict, one line of why, and the command to sign or answer it.
2. **Ready to sign in bulk**: references with `ready-for-review`, all citations `supports`, tier B or C only, listed with title, publisher, URL and the agent's one-line confirmation. One command signs the list: `review:references -- sign --digest <file> --reviewer "<name>"`.
3. **Needs a fix first**: references and claims the agents could not clear, grouped by who can fix them (replace a source, edit a card).
4. **Counts and trend**: references verified, claims by verdict, findings open, compared with the last run.

Target: after the agents finish the first pass, the owner's own time is the tier A list plus the one bulk sign.

## 9. Work packages

Each is independent unless a dependency is listed. Give each agent the package text plus sections 2 and 3.

| WP | Title | Depends on | Deliverable | Done when |
| --- | --- | --- | --- | --- |
| **1** | **Source policy and tiers** | none | `source-policy.mjs` (domains per tier, `tierOf(url, publisher)`), `claim-tier` vocabulary and `tierOfClaim()`, tests | the 58 references and every inline source of the 152 AtomDex and myth rows get a tier; unit tests cover each tier and an unknown domain (T4) |
| **2** | **Reference fetcher and dossiers (Part A tooling)** | 1 | `verify-references.mjs`: fetch, redirect and soft 404 detection, PDF text, identity match, quote verification (`quoteVerified`), rate limit, cache, dossier writer; `test:review` cases on a local HTTP server fixture (no real network in tests) | a run on the 50 rows with a URL writes valid dossiers; a seeded fixture with a 404, a soft 404, a redirect to a home page, a wrong title and a fabricated quote is classified correctly every time |
| **3** | **Evidence pass: the 58 references** | 2 | dossiers for all 58 rows, the 7 "Candidate" rows and `ref-becquerel-1896` resolved (found and fetched, or `not-found` with a replacement proposal), `accessed` and missing fields proposed as a patch to the source files | every row has a dossier with a status; no URL in any dossier that was not fetched; digest generated |
| **4** | **Inline source pass** | 2 | dossiers (keyed by URL) for the inline sources of the 152 AtomDex and myth rows, plus the `inline-source-unchecked` rule and the decision from section 10 | every inline URL checked; rule has tests; counts of dead or mismatched sources reported |
| **5** | **Ledger, sign-off and gate** | none | `review-references.mjs` (`sign`, `revoke`, `status`), `ledger.json`, `reviewers.json`, `check-review.mjs`, wiring into `validate:content --strict-review` and `release:content`, tests for: flag without ledger fails, stale evidence hash fails, non-reviewer fails, `needs-fix` cannot be signed | gate demonstrably blocks each bad case in tests, and passes on a fully signed fixture |
| **6** | **Claim extraction and inventory** | 1 | `extract-claims.mjs`, `claims.json` for every surface in section 1 (including `services/guide/topics.ts` and the daily fact source), stable ids with text hash, tier and kind | rerun with no content change produces a byte-identical file; every learner-facing text field in the inventory table is covered or listed as excluded with a reason |
| **7** | **Deterministic checks** | 1, 6 | `review-rules.mjs` for checks 3, 5, 6, 7 and `facts.json` seed, with table-driven tests | each lint rule has at least 5 good and 5 bad phrasings; the consistency check finds a seeded half-life disagreement; no new false errors on current content (list the warnings it does raise) |
| **8** | **Grounded and blind checks (agent checks)** | 2, 6 | `check-claims.mjs` checks 1, 2, 4, 8, the independence rules of 5.3, evidence validation (quote must verify, else the verdict is discarded), cache and per-run budget | on the quality benchmark below it meets its targets; every emitted quote verifies |
| **9** | **Findings, decisions and digest** | 5, 7, 8 | `findings.json`, `decisions.json` handling (reopen on text change), `DIGEST.md` generator, severity mapping, gate rules from 5.5 | digest renders from a fixture; changing a decided sentence reopens its finding; gate fails on an open tier A finding |
| **10** | **Benchmark and first full run** | 7, 8, 9 | the benchmark (below) and the first complete run over the real content with its digest | targets met; digest handed to the owner |

Order: 1, then 2 and 5 and 6 in parallel, then 3, 4, 7, 8 in parallel, then 9, then 10. WP 3 is the one on the release's critical path: the owner can start signing references as soon as WP 3 and WP 5 exist, while Part B is still being built.

### Benchmark (WP 10, and the regression test for WP 8)

- **Mutation set**: copy the content DB, inject at least 40 known-false edits across tiers (changed numbers and units, swapped isotopes, reversed protective advice, added absolutes, a wrong date, a wrong answer key, a sentence that contradicts another lesson). Targets: at least 90% of tier A and B mutations flagged with the right verdict class; at least 70% of tier C.
- **Gold set**: 40 claims the owner or a human reviewer already confirmed true. At most 10% may be flagged `contradicted` or `key-disagrees`, and none may be flagged tier A `contradicted` without evidence.
- **Evidence integrity**: 100% of emitted quotes verify against the fetched text; 0 fabricated URLs.
- The benchmark runs offline from recorded fetches (fixtures), so it is repeatable and costs nothing after the first recording.

## 10. Decisions for the owner

| # | Question | Default if not answered |
| --- | --- | --- |
| 1 | Is an agent's quoted evidence plus a one-time human bulk sign enough for `verified`, or do you want to open every source yourself? | **Answered 2026-11-23: the agent checks and signs everything, the owner signs nothing by hand** (see non-negotiable 1 for the limits) |
| 2 | Inline sources: check in place (a) or migrate to `content_references` (b)? | (a) |
| 3 | Who are the reviewers allowed to sign (`reviewers.json`)? | the agent, on the owner's standing instruction (2026-11-23) |
| 4 | Is the World Nuclear Association (industry body) acceptable as T3 for history and plant facts, never for safety? | yes, as T3 |
| 5 | Should a source that cannot be fetched by a script (blocked) be accepted on your manual check alone? | yes, `blocked` plus your sign-off |
| 6 | Keep checking monthly after launch (`check:references-live`), or only before each content release? | before each content release |

## 11. Out of scope

Legal review of the Privacy Policy and Terms (see `docs/critical/LEGAL_FRAMEWORK.md`), translation quality, image and sound rights (`docs/critical/MEDIA_POLICY.md`), and any change to what the app teaches beyond fixing a finding the owner approved. Fact-checking user-written Field Notes is not possible and not attempted.

## 12. Notes for agents

- Read `CLAUDE.md` sections "Content source files", "Curriculum" and the Phone's Safety Guide first, then `docs/critical/CONTENT_QUESTION_QUALITY.md` and `docs/critical/CONTENT_AND_USER_DATA_RULES.md` (ids are permanent: a fix changes text, never an id).
- New rules join the existing engine the way `safety-rules.mjs` does (pure function, `severity`, `strictReview`); a new test script gets a `package.json` entry and a line in the `CLAUDE.md` command list.
- Before handing off: `typecheck`, `lint`, `test:review`, `test:content`, `test:source-adapters`, `validate:content`, and `sync-content` only if you changed content (run it, then check only `CONTENT_DB_VERSION` moved).
- Report in the same words the spec uses (verdict names, statuses) so the digest can be generated from reports without translation.
