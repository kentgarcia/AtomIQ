# Legal framework: Privacy Policy and Terms of Service

Text: `content/legal/privacy.ts`, `content/legal/terms.ts`. Shared facts (version, date, contact address, governing law): `constants/legal.ts`. Screen: `components/settings/LegalDocument.tsx`. Guard: `npm run test:legal`. Public web copy of the Privacy Policy: see "The public privacy page" below (a change here must be repeated there).

This is a drafting framework, not legal advice. Have a lawyer or the team's data protection officer read both documents before release.

## What the documents are based on

| Source | Where it shows up |
|---|---|
| **Data Privacy Act of 2012 (Republic Act No. 10173)** and its Implementing Rules: principles of transparency, legitimate purpose, proportionality; the data subject's rights (to be informed, to access, to object, to rectify, to erasure or blocking, to data portability, to damages, to complain to the National Privacy Commission) | Privacy §1, §5, §11, §12 |
| **National Privacy Commission** guidance (privacy.gov.ph): privacy notice content, breach notification | Privacy §11, §12 |
| **Google Play User Data policy and the Data safety form**: what is collected, why, whether it is shared, retention and deletion, a contact, and a public privacy-policy URL | Privacy §3 to §8, §15; see the Data safety answers below |
| **Apple App Store privacy details** (if an iOS build ships) | Same answers as Data safety |
| **COPPA (US) and Play's Families policy**, and the general rule of data minimisation for children | Privacy §4, §10 |
| **GDPR principles** (lawful basis, minimisation, storage limitation, user rights), as a common-sense checklist | Privacy §5, §6, §11 |
| Common terms-of-service structure for a free educational app: license, acceptable use, IP, disclaimers, limitation of liability, governing law, changes | Terms §1 to §22 |
| Educational-safety disclaimer pattern used by science and health education apps | Terms §6 |

## Facts the text states, and where they come from

The policy says only what the app does. `test:legal` checks the ones that can be checked.

| Claim | Source in the repo |
|---|---|
| Only the `INTERNET` permission | `app.json` `android.permissions` |
| No analytics, ads, crash reporting or notifications SDK | `package.json` dependencies |
| Data is in SQLite and AsyncStorage on the device; no server | `services/database.ts`, `services/storage.ts` |
| Delete Account wipes the user tables and clears AsyncStorage | `deleteAccountData`, `executeDeleteAccount` in `app/settings.tsx` |
| Display name defaults to "Scientist"; no email asked | `app/onboarding.tsx` |
| Outside links: IAEA, UNSCEAR, WNA, EPA, Britannica, Nobel Prize, OpenStax | `content.db` (`myths.sources`, `encyclopedia_entries.sources`, `content_references.url`) |
| Unsplash pictures in Myth Buster and explorer journeys | `myths.image`, `content/explorer/journeys/*` |
| Read Aloud uses the device speech engine | `services/media.ts` (`expo-speech`) |
| The feed, rivals and ranking are fictional and local | `docs/features/NPC_FEED_SPEC.md` |

If you change one of these, change the text, bump `LEGAL_VERSION`, and move `LEGAL_LAST_UPDATED`.

## Before release

1. `LEGAL_CONTACT_EMAIL` in `constants/legal.ts` is atomiq.officialph@gmail.com (set 2026-11-22; the in-app Beta Feedback form was removed). Make sure the inbox is monitored: Play requires a contact.
2. Confirm who the controller is. The text names "the MythSmashers by the DOST-PNRI, developed by Kent Garcia" (the credit in Settings). If a legal entity should be named, edit Privacy §1 and Terms §1.
3. Confirm the governing law (`LEGAL_GOVERNING_LAW`, now the Philippines) and the age wording (18 is the age of majority in the Philippines).
4. Ask whether the app has to be registered or notified under the Data Privacy Act (it handles almost no personal data and keeps it on the device, but the DOST-PNRI's data protection officer should decide).
5. The Privacy Policy is hosted at a public URL (done 2026-11-23: https://kentgarcia.github.io/atomiq-privacy-policy/, linked in Play Console > App content). Play requires a policy URL, not only an in-app screen. Keep the hosted text the same as the app's (next section). The Terms are not hosted; host them the same way if a store asks for a link.
6. Decide the audience. If children under 13 are a target, complete Play's Families declarations; the text already avoids collecting personal information from them.
8. Check the Android backup setting. The policy says a device backup service "may" copy app data. If you disable backup in `app.json`, say so in Privacy §6.

## The public privacy page (keep it the same as the app)

Play requires a public, login-free HTTPS web page, so the Privacy Policy is also published at **https://kentgarcia.github.io/atomiq-privacy-policy/** (GitHub Pages; repo `kentgarcia/atomiq-privacy-policy`, local copy `../atomiq-privacy-policy`, branch `main`, served from the root). The page is generated from this repo's `content/legal/privacy.ts` and `constants/legal.ts` (and `app.json` for the app name and package), never edited by hand.

**Rule: whenever the app's Privacy Policy changes, change the public page in the same piece of work.** That means any edit to `content/legal/privacy.ts`, to `LEGAL_VERSION`, `LEGAL_LAST_UPDATED` or `LEGAL_CONTACT_EMAIL` in `constants/legal.ts`, or to the Android package or app name. The same goes for anything that makes a statement in the policy untrue (a new SDK, permission, network call or stored data type): fix the text first, then republish. Steps:

1. Change the text and bump `LEGAL_VERSION` / move `LEGAL_LAST_UPDATED` here; `npm run test:legal` must pass.
2. In the page repo: `node scripts/build.mjs ../AtomIQ`, then `git add -A && git commit -m "privacy policy vX.Y" && git push`. Pages redeploys in about a minute.
3. Open the URL and confirm the new version number and date show. Update the Play Console Data safety form if the facts changed (section below).
4. Do this BEFORE the app update that carries the new text reaches the store, so the store page never states an older policy than the app.

An agent that edits the policy text and does not republish the page has not finished the task. The summary table at the top of the page (data collected, third parties, permissions, deletion) is written in `scripts/build.mjs` in the page repo; if one of those facts changes, edit it there too.

## Play Data safety answers (matches the policy)

- Does the app collect or share user data? Collected on the device only; **not** collected by the developer, **not** shared.
- Data types: none collected by the developer.
- Is data encrypted in transit? Not applicable, nothing is sent. Outside links use HTTPS.
- Can users request deletion? Yes: Settings > Delete Account (in the app), or uninstall.
- Families / children: designed not to collect personal information.
