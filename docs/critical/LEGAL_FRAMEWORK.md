# Legal framework: Privacy Policy and Terms of Service

Text: `content/legal/privacy.ts`, `content/legal/terms.ts`. Shared facts (version, date, contact address, governing law): `constants/legal.ts`. Screen: `components/settings/LegalDocument.tsx`. Guard: `npm run test:legal`.

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
| Beta Feedback is a Google Forms page | `constants/beta.ts` |
| Read Aloud uses the device speech engine | `services/media.ts` (`expo-speech`) |
| The feed, rivals and ranking are fictional and local | `docs/features/NPC_FEED_SPEC.md` |

If you change one of these, change the text, bump `LEGAL_VERSION`, and move `LEGAL_LAST_UPDATED`.

## Before release

1. Set `LEGAL_CONTACT_EMAIL` in `constants/legal.ts` to a monitored address. Play requires a contact, and until it is set the documents point to the Beta Feedback form and the store page.
2. Confirm who the controller is. The text names "the MythSmashers by the DOST-PNRI, developed by Kent Garcia" (the credit in Settings). If a legal entity should be named, edit Privacy §1 and Terms §1.
3. Confirm the governing law (`LEGAL_GOVERNING_LAW`, now the Philippines) and the age wording (18 is the age of majority in the Philippines).
4. Ask whether the app has to be registered or notified under the Data Privacy Act (it handles almost no personal data and keeps it on the device, but the DOST-PNRI's data protection officer should decide).
5. Host both documents at a public URL (Play requires a policy URL, not only an in-app screen) and link it in the Console. Keep the hosted text the same as the app's.
6. Decide the audience. If children under 13 are a target, complete Play's Families declarations; the text already avoids collecting personal information from them.
7. Replace the Google Forms feedback form's own privacy note with a line that matches Privacy §8 (what is asked, who sees it).
8. Check the Android backup setting. The policy says a device backup service "may" copy app data. If you disable backup in `app.json`, say so in Privacy §6.

## Play Data safety answers (matches the policy)

- Does the app collect or share user data? Collected on the device only; **not** collected by the developer, **not** shared.
- Data types: none collected by the developer. (The feedback form is run through Google Forms; declare it if Play asks about forms you link to.)
- Is data encrypted in transit? Not applicable, nothing is sent. Outside links use HTTPS.
- Can users request deletion? Yes: Settings > Delete Account (in the app), or uninstall.
- Families / children: designed not to collect personal information.
