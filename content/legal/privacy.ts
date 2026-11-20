/**
 * Privacy Policy text. Every statement here describes what the app actually does (checked against
 * `app.json`, `services/database.ts` and the bundled content); `npm run test:legal` guards the shape.
 * Change a fact in the app, change it here, and bump `LEGAL_VERSION` in `constants/legal.ts`.
 */

import { LEGAL_LAST_UPDATED, LEGAL_VERSION, contactLine } from "../../constants/legal";

export interface LegalSection {
  title: string;
  /** Paragraphs split by a newline; a paragraph that starts with "• " is a bullet. */
  body: string;
}

export const PRIVACY_TITLE = "Privacy Policy";
export const PRIVACY_LEAD = "How AtomIQ handles your information. Short version: it stays on your device.";
export const PRIVACY_VERSION = LEGAL_VERSION;
export const PRIVACY_UPDATED = LEGAL_LAST_UPDATED;

export const PRIVACY_HIGHLIGHTS: readonly string[] = [
  "No account, email or phone number. You only pick a display name.",
  "Your progress stays on your device. We run no server that receives it.",
  "No ads, no analytics, no tracking, and we never sell information.",
  "The internet is used only when you open a source link, a picture loads, or you send feedback.",
  "Settings > Delete Account erases everything the app stores about you.",
];

export const PRIVACY_SECTIONS: readonly LegalSection[] = [
  {
    title: "1. About This Policy",
    body:
      "This Privacy Policy explains how AtomIQ (“AtomIQ”, “we”, “us”) handles information when you use the AtomIQ app. AtomIQ is made for the MythSmashers by the DOST-PNRI and developed by Kent Garcia.\n" +
      "We built AtomIQ around three principles: be open about what happens to your information (transparency), use it only for a clear and legitimate purpose, and handle no more of it than the app needs (proportionality). These are the principles of the Data Privacy Act of 2012 of the Philippines (Republic Act No. 10173), and we also follow the user-data rules of the app stores that distribute AtomIQ.\n" +
      "Please read this policy together with the Terms of Service. If you do not agree with it, please do not use the app.",
  },
  {
    title: "2. Who Controls Your Information",
    body:
      "AtomIQ keeps your information on your own device, and we operate no server that receives it. In practice that means you stay in control of it: we cannot see, copy, recover or change it.\n" +
      "For the few things that can leave your device (Section 8), the person responsible is the team named in Section 1. Contact details are in Section 15.",
  },
  {
    title: "3. Information the App Stores on Your Device",
    body:
      "Everything below is created by you, by using the app, and is kept only on your device:\n" +
      "• Profile: your display name (“Scientist” if you leave it blank), a random ID the app generates for the profile, and your avatar design and background.\n" +
      "• Learning progress: the lessons, checkpoints, quizzes and reviews you have done, your answers to practice questions, how well you know each topic, and a half-finished lesson so you can continue it.\n" +
      "• Rewards: XP, level, stars, streak, diamonds, quests and chests you have claimed, and achievements.\n" +
      "• Game and lab results: Myth Buster and Atom Maze scores and settings, and the labs you have completed.\n" +
      "• Activity history: counts per calendar day of what you did (shown in your streak graph), the daily facts and blog pieces you have read, and the periodic-table elements you have explored.\n" +
      "• Feed activity: the reactions you give to posts and blog pieces, and your place in the weekly ranking.\n" +
      "• Field Notes: the notes you write in the notebook on your phone (titles, text, and the lines you clip from the AtomDex, a daily fact or the Atom Scanner). Notes are private: they are never shown to anyone, never posted, and never leave your device.\n" +
      "• Phone: which of the phone's apps have arrived and been opened, and your chats with your teachers (what they said and the replies you tapped). Chats are prepared in advance; you never type to a teacher, and nothing you do in a chat is sent to anyone.\n" +
      "• Atom Scanner: which things you have scanned and how many times. The scanner is a drawn simulation: it does not use your camera, microphone or location, and nothing you scan is sent to anyone.\n" +
      "• Camera photos: the photos you take in the phone's Camera app. The Camera is a drawn simulation too: it does not use your device camera, microphone, photo library or location. A photo is saved on your device only as a small description of the picture (the scene, your avatar and its pose), up to 100 of them, and is never sent to anyone. The Safety Guide and the Nuclear Map are read-only and collect nothing.\n" +
      "• Preferences: theme, sound effects, haptics, Read Aloud, the Feed posts switch, the phone's wallpaper, and that you accepted the Terms and this policy.\n" +
      "None of this needs your real name, your email address or any identity document.",
  },
  {
    title: "4. Information We Do Not Collect",
    body:
      "AtomIQ does not ask for or collect:\n" +
      "• your email address, phone number, home address, date of birth or any government ID;\n" +
      "• your location, precise or approximate;\n" +
      "• your contacts, photos, files, camera or microphone;\n" +
      "• advertising identifiers, or anything used to track you across apps and websites;\n" +
      "• payment details, because the app has no purchases.\n" +
      "The app contains no advertising, no analytics and no crash-reporting service. The only permission it requests is internet access (Section 8).",
  },
  {
    title: "5. How and Why the App Uses Information",
    body:
      "The app uses the information in Section 3 only to work as a learning app on your device:\n" +
      "• to save your progress and let you continue where you stopped;\n" +
      "• to unlock the next lessons and to work out what to review;\n" +
      "• to show your streak, rewards, achievements, activity graph and ranking;\n" +
      "• to remember your name, avatar and preferences.\n" +
      "We do not use it for advertising, profiling, selling, or decisions about you. This processing happens on your device. By choosing a name and accepting the Terms and this policy when you set up the app, you agree to it, and you can withdraw that agreement at any time by deleting your data (Section 6).",
  },
  {
    title: "6. Storage, Retention and Deletion",
    body:
      "Your information is kept in the app's private storage on your device (a local database and the app's settings storage), protected by the operating system's app sandbox. It is kept until you remove it:\n" +
      "• Settings > Delete Account erases your profile, progress, rewards, history, notes, chats, scans, photos and preferences, and returns the app to its first-run setup. It cannot be undone.\n" +
      "• Uninstalling the app, or clearing its storage in your device settings, removes it as well.\n" +
      "The lessons and other learning content are part of the app and stay until you uninstall it.\n" +
      "Because we hold no copy, we cannot restore data that was deleted or lost. Your phone's own backup service (for example the backup built into Android) may copy app data depending on your device settings; that is managed by your device maker or operating-system provider under their policies.",
  },
  {
    title: "7. Sharing and Disclosure",
    body:
      "We do not sell, rent, trade or share your information, and we have none to hand over: it never reaches us. The only ways information can leave your device are the ones you start yourself, described in Section 8.",
  },
  {
    title: "8. Internet Use and Third Parties",
    body:
      "Lessons, games, labs, the AtomDex, the periodic table and your progress all work offline. The app asks for internet access only for these things, and other sites and services follow their own privacy policies:\n" +
      "• Source links: when you open a reference (for example IAEA, UNSCEAR, World Nuclear Association, EPA, Britannica, the Nobel Prize or OpenStax) it opens in your browser. That website can see your IP address and device details, as with any website. We add nothing from your profile.\n" +
      "• Pictures: a few pictures in Myth Buster and the explorer journeys are loaded from the Unsplash image service when shown. Unsplash receives your IP address and basic device details to deliver them.\n" +
      "• Beta Feedback: the form in Settings opens a Google Forms page. What you type is sent to us and processed by Google under Google's privacy policy. Please do not put sensitive personal information in it. We use responses only to fix and improve the app.\n" +
      "• Developer credit: the link in the App Version dialog opens a LinkedIn page in your browser.\n" +
      "• Read Aloud: it uses the speech engine installed on your device. Depending on your device settings, some engines (for example Google text-to-speech) may process text online. We do not control that and AtomIQ does not send the text anywhere.\n" +
      "• App store: Google Play or the Apple App Store may give us totals such as installs and crashes. These are anonymous and come under their policies; we receive no personal information from them.\n" +
      "Learning content arrives inside the app and through app updates from the store; the app does not download lessons on its own.",
  },
  {
    title: "9. Characters, Rankings and the Feed",
    body:
      "The teachers, rivals and posters you meet in AtomIQ (the Discover feed, comments on blog pieces and the weekly ranking) are fictional characters. The app generates what they say from bundled content and from your own progress.\n" +
      "They are not real people. No one else sees your name, your progress, your reactions or your rank, and nothing you do there is sent to anyone. AtomIQ has no chat, no friend list, no public profile and no way to post your own content.",
  },
  {
    title: "10. Children's Privacy",
    body:
      "AtomIQ is meant for learners, including children, and is designed to work without personal information: no account, no contact details, no ads, no tracking and no outside service collecting data. The only thing it asks for is a display name, and we encourage children to use a nickname instead of their real name.\n" +
      "We do not knowingly collect personal information from children. Since your progress never reaches us, there is nothing for us to collect or share.\n" +
      "Parents, guardians and teachers can see everything the app stores in Profile and Settings, and can erase it with Settings > Delete Account. The only places where a child could share more are links to outside websites and the feedback form, so we ask adults to supervise those. If you believe a child sent personal information through the feedback form, contact us and we will delete it.",
  },
  {
    title: "11. Your Rights and Choices",
    body:
      "Under the Data Privacy Act of 2012 and similar laws you have the right to:\n" +
      "• be informed about how your information is handled (this policy);\n" +
      "• access it, and correct it if it is wrong;\n" +
      "• object to its processing, or withdraw your agreement;\n" +
      "• have it erased or blocked;\n" +
      "• receive a copy of it in a usable form, where it applies;\n" +
      "• claim damages for a violation of your rights;\n" +
      "• complain to the National Privacy Commission of the Philippines (privacy.gov.ph).\n" +
      "Because your information lives only on your device, most of these you can do yourself: see and change your name, avatar, notes and preferences in Profile, Field Notes and Settings, and erase everything with Settings > Delete Account. We have no copy to send you, and the app does not currently export your data to a file. For anything we do hold, such as a feedback-form response, contact us (Section 15) and we will help.",
  },
  {
    title: "12. Security",
    body:
      "Keeping your information on your device, and not collecting it, is our main protection: there is no server to breach. The operating system keeps each app's storage separate from other apps.\n" +
      "No method is perfectly secure. Please use a screen lock, be careful on shared devices and with device backups, and keep your operating system and the app up to date. If we ever hold personal information and it is exposed, we will tell the people affected and, where the law requires, the National Privacy Commission.",
  },
  {
    title: "13. If Cloud Features Are Ever Added",
    body:
      "Parts of the app are built so that a later version could offer optional backup or sync between devices. Nothing like that exists today. If we ever add a feature that sends personal information off your device, we will update this policy before it is released, tell you in the app what would be sent and why, and ask for your agreement first. It would be optional, and the offline app would keep working without it.",
  },
  {
    title: "14. Changes to This Policy",
    body:
      `This is version ${LEGAL_VERSION}, last updated ${LEGAL_LAST_UPDATED}. We may update the policy when the app or the law changes. When the change is important we will say so in the app, and for a change that affects how your information is handled we will ask you to accept it again. Using the app after a change is posted means you accept the updated policy. Earlier versions are available on request.`,
  },
  {
    title: "15. Contact",
    body: contactLine("privacy"),
  },
];
