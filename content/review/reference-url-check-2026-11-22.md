# Reference URL reachability check

Checked: 2026-11-22  
Scope: the 50 `content_references` rows that already contain a URL  
User-Agent requested by the spec: `AtomIQ-reference-check`

This is only the first verification pass. A reachable URL is **not** a verified
reference: title/publisher identity, claim support, quote capture, source tier,
and human sign-off still need to be completed. No `verified` or `accessed` field
was changed.

## Summary

| Result | Count |
| --- | ---: |
| Reachable in the web checker | 41 |
| Human-confirmed follow-ups | 9 |
| No-URL rows (not checked here) | 8 |

The owner personally checked all nine follow-up links and confirmed that each
link works and that the linked information is correct. This clears the
reachability follow-up, but it does not by itself set `verified`: the formal
dossier quotes, evidence hash, and ledger sign-off are still required.

## Follow-up required

These URLs were not classified as reachable by the automated checker. They were
subsequently checked personally by the owner, who confirmed that each link
works and that the information is correct. Per the spec, they must still not be
treated as `verified` until the formal evidence and ledger workflow is used.

| Reference | Checker result | Next action |
| --- | --- | --- |
| [`ref-hiroshima-museum`](https://hpmmuseum.jp/?lang=eng) | Fetch denied by `robots.txt`; owner confirmed manually | Create the formal dossier and capture support quotes. |
| [`ref-nagasaki-museum`](https://nagasakipeace.jp/en/visit/abm) | Fetch timed out; owner confirmed manually | Create the formal dossier and capture support quotes. |
| [`ref-nrc-doses-daily-lives`](https://www.nrc.gov/about-nrc/radiation/around-us/doses-daily-lives.html) | 403 Forbidden to checker; owner confirmed manually | Create the formal dossier and capture support quotes. |
| [`ref-nrc-radiation-faq`](https://www.nrc.gov/about-nrc/radiation/related-info/faq) | 403 Forbidden to checker; owner confirmed manually | Create the formal dossier and capture support quotes. |
| [`ref-nrc-tmi`](https://www.nrc.gov/reading-rm/doc-collections/fact-sheets/3mile-isle.html) | 403 Forbidden to checker; owner confirmed manually | Create the formal dossier and capture support quotes. |
| [`ref-osti-cp1`](https://www.osti.gov/opennet/manhattan-project-history/Events/1942-1944_pu/cp-1_critical.htm) | 502 Bad Gateway to checker; owner confirmed manually | Create the formal dossier and capture support quotes. |
| [`ref-ready-nuclear-explosion`](https://www.ready.gov/nuclear-explosion) | 403 Forbidden to checker; owner confirmed manually | Create the formal dossier and capture support quotes. |
| [`ref-ready-radiation`](https://www.ready.gov/radiation) | 403 Forbidden to checker; owner confirmed manually | Create the formal dossier and capture support quotes. |
| [`ref-rutherford-1911`](https://doi.org/10.1080/14786440508637080) | DOI inaccessible to checker; owner confirmed manually | Create the formal dossier and capture support quotes. |

## Reachable URLs

The following 41 rows returned page content from the checker and are ready for
the next identity/support pass:

`ref-aip-curie-separations`, `ref-aip-rutherford-alpha`,
`ref-cdc-contamination-vs-exposure`, `ref-cdc-nuclear-blast-faq`,
`ref-cdc-potassium-iodide`, `ref-cdc-radiation-emergencies-safety`,
`ref-cern-about`, `ref-epa-protecting-yourself`, `ref-epa-radiation-basics`,
`ref-epa-radiation-health-effects`, `ref-epa-radiation-sources`,
`ref-gov-uk-calder-hall`, `ref-grs-oklo`, `ref-hiroshima-pref-bombing`,
`ref-hps-radioactive-contamination`, `ref-iter-home`, `ref-iupac-table`,
`ref-medlineplus-potassium`, `ref-mpic-fission`, `ref-nasa-sun-facts`,
`ref-noaa-atmosphere`, `ref-nps-mapr-hanford`, `ref-nps-mapr-losalamos`,
`ref-nps-mapr-oakridge`, `ref-nps-mapr-trinity`, `ref-openstax-ap-elements`,
`ref-openstax-ap-erythrocytes`, `ref-openstax-ap-hair`,
`ref-openstax-ap-organic`, `ref-openstax-bio-carbs`,
`ref-openstax-bio-photosynthesis`, `ref-openstax-chem-10-5`,
`ref-openstax-chem-2-4`, `ref-openstax-chem-ch1`, `ref-openstax-chem-ch2`,
`ref-openstax-up3-ch10`, `ref-who-ionizing-radiation`, `ref-wna-chernobyl`,
`ref-wna-fukushima`, `ref-wna-radwaste`, `ref-wna-russia`.

## Not covered by this pass

Eight rows have no URL in the source data. The seven candidate rows need the
spec's publisher-site discovery step before they can be checked:

`ref-background-radiation`, `ref-iaea-decay`, `ref-iaea-glossary`,
`ref-iaea-isotopes`, `ref-iaea-radiation-types`, `ref-nrc-decay-series`,
`ref-potassium-40`. `ref-becquerel-1896` is the eighth no-URL row and needs a
stable paper identifier or human lookup before it can be checked.

