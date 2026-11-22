# Reference verification spec fact-check

Checked: 2026-11-22  
Scope: factual and implementation-status claims in
`REFERENCE_VERIFICATION_SPEC.md`.

## Result

The repository inventory in section 1 matches the current content database.
The safety guidance cited by the spec also matches current CDC guidance. The
spec remains a proposal: the future review scripts, dossiers, ledger, claims
extractor, and review gate do not exist yet.

## Repository claims checked

| Spec claim | Result |
| --- | --- |
| 58 `content_references` rows | Confirmed. |
| 43 official, 11 textbook, 4 research | Confirmed. |
| 8 rows without a URL | Confirmed. Seven are candidate-style rows; `ref-becquerel-1896` is the research record without a URL. |
| 13 rows without `accessed` | Confirmed. |
| 10 lessons, 122 items, 115 AtomDex entries, 37 myths, 14 safety cards, 18 map sites, 12 scan targets, 4 blog pieces, 131 chat nodes, 92 feed templates | Confirmed against the SQLite content database. |
| 27 lesson links, 6 unit links, 9 blog links | Confirmed. |
| 9 of 122 items have no `reference_ids` | Confirmed using `json_array_length(reference_ids) = 0`. |
| 115 AtomDex and 37 myth rows carry inline sources | Confirmed. |
| `strictReview` turns unverified linked references into publish errors | Confirmed in the current curriculum, feed, safety, map, and scan validators. |
| `check:review`, `verify-references.mjs`, claim extraction, and dossier tooling exist | Not yet implemented; consistent with the document’s “proposed, nothing built yet” status. |

## External claims checked

- CDC currently states that the best protection in a radiation emergency is to
  “get inside, stay inside, and stay tuned,” matching section 7.3.
- CDC states that KI protects only the thyroid and only against radioactive
  iodine, and should be taken only when instructed by officials or a healthcare
  provider. This supports the spec’s KI caveats.
- CDC distinguishes radiation exposure from contamination: exposure does not
  necessarily mean radioactive material is on or inside the person. This
  supports the spec’s contamination-vs-exposure lint rule.
- EPA confirms the time, distance, and shielding principles and the basic
  alpha/beta/gamma descriptions used by the safety examples. It also confirms
  that ionizing-radiation health effects depend on dose and exposure pathway.

## Additional implementation findings

1. The normal daily fact is sourced from the 37 myth rows through
   `getAllMyths()`, so it is covered by the inline-source review gap. However,
   the hardcoded `FALLBACK_FACT` in `services/missions.ts` has no source or
   reference id. Its claim about fusion powering the Sun is scientifically
   correct and is supported by NASA, but the app currently has no attached
   citation for the fallback path.
2. `services/guide/topics.ts` contains seven topic definitions, but five of
   their listed `unitIds` do not currently exist in the `units` table:
   `energy-from-the-nucleus`, `radiation-meets-matter`,
   `radiation-and-the-body`, `nuclear-technology-at-work`, and
   `safety-waste-society`. Keyword matching can still produce content, but the
   comment claiming the registry is seeded from curriculum units is not fully
   true for the current database.
3. The spec’s future review commands and scripts are not present yet:
   `verify:references`, `review:references`, `claims:extract`, `check:claims`,
   `check:review`, `check:references-live`, `test:review`, and their listed
   `.mjs` files are all missing. This agrees with the proposed status.
4. `content/releases.json` is a configured path in `scripts/lib/content-paths.mjs`
   and is used by the release code, but the file is not present in the current
   worktree. The spec’s comparison to the release ledger is therefore an
   architectural analogy, not evidence that a release ledger currently exists.

## Corrections / wording notes

1. Section 4.2 calls all eight no-URL rows “Candidate” rows. The data has seven
   candidate-style rows plus `ref-becquerel-1896`, which is a research record
   with no URL and no `Candidate` note. The implementation report records this
   distinction.
2. “Every one of the 58 sources is `verified = 0`” is true for the current
   database snapshot, but is a time-sensitive measurement and should remain
   dated as it is now.
3. “Valid” should not mean merely reachable. The spec correctly requires
   identity, completeness, claim support, source tier, and human sign-off; the
   URL pass only establishes reachability.

## Sources

- [CDC: Preparing for a Radiation Emergency](https://www.cdc.gov/radiation-emergencies/safety/index.html)
- [CDC: Potassium Iodide (KI)](https://www.cdc.gov/radiation-emergencies/treatment/potassium-iodide.html)
- [CDC: Radiation Contamination Versus Exposure](https://www.cdc.gov/radiation-emergencies/infographic/contamination-versus-exposure.html)
- [EPA: Protecting Yourself from Radiation](https://www.epa.gov/radiation/protecting-yourself-radiation)
- [EPA: Radiation Basics](https://www.epa.gov/radiation/radiation-basics)
- [EPA: Radiation Health Effects](https://www.epa.gov/radiation/radiation-health-effects)
- [NASA: Sun Facts](https://science.nasa.gov/sun/facts/)

