/**
 * Terms of Service text. Describes the app as it is (features, labs, rewards, the fictional cast);
 * `npm run test:legal` guards the shape and keeps removed feature names out. Bump `LEGAL_VERSION` in
 * `constants/legal.ts` when it changes in a way that matters.
 */

import { LEGAL_GOVERNING_LAW, LEGAL_LAST_UPDATED, LEGAL_VERSION, contactLine } from "../../constants/legal";
import type { LegalSection } from "./privacy";

export const TERMS_TITLE = "Terms of Service";
export const TERMS_LEAD = "The rules for using AtomIQ. Short version: learn, enjoy it, and stay safe.";
export const TERMS_VERSION = LEGAL_VERSION;
export const TERMS_UPDATED = LEGAL_LAST_UPDATED;

export const TERMS_HIGHLIGHTS: readonly string[] = [
  "AtomIQ is free for personal learning, and teachers may use it in class.",
  "It is for education only. Never try real experiments with radioactive material or radiation sources.",
  "Your progress lives on your device, and you can delete it at any time.",
  "XP, diamonds, badges and avatar items are for fun and have no cash value.",
  "The characters, posts and rankings in the app are fictional.",
];

export const TERMS_SECTIONS: readonly LegalSection[] = [
  {
    title: "1. Agreement to These Terms",
    body:
      "These Terms of Service (“Terms”) are an agreement between you and the AtomIQ team named in the Privacy Policy (“we”, “us”). They cover the AtomIQ app and everything bundled in it: lessons, quizzes, games, labs, the AtomDex, the periodic table and other content (together, the “App”).\n" +
      "By tapping “I agree” when you set up the App, or by using it, you accept these Terms and the Privacy Policy. If you do not agree, do not use the App; uninstall it. If you accept for a school or another organization, you confirm you have the authority to do so.",
  },
  {
    title: "2. What AtomIQ Offers",
    body:
      "AtomIQ is an offline-first app for learning nuclear science. It includes:\n" +
      "• a guided path of units and lessons led by teacher characters, with practice, checkpoints and reviews;\n" +
      "• quests, XP, levels, streaks, diamonds, chests and achievements;\n" +
      "• the Myth Buster game, the Atom Maze and explorer journeys;\n" +
      "• the AtomDex (an encyclopedia), a periodic table, and daily facts;\n" +
      "• labs: Radiation Shield, Build an Atom and Radioactive Decay;\n" +
      "• a Discover feed of character posts and mini blog pieces, and a weekly ranking;\n" +
      "• a phone with Shrodi, a tap-to-navigate guide, your teachers and chats with them, a private notebook (Field Notes), an Atom Scanner that shows what everyday things are made of, a Camera for drawn photos of you and your guide, a Safety Guide of radiation facts for learning, a Nuclear Map of places in the history of nuclear science, a reference library of the sources the app cites, and apps that arrive as you learn; and a shop and avatar for personalizing your profile;\n" +
      "• Read Aloud, sound and haptics.\n" +
      "Features can change over time (Section 15).",
  },
  {
    title: "3. Beta Versions",
    body:
      "The App may be offered as a beta or test version. It can contain mistakes, features can change or be removed, and progress might be reset when a problem has to be fixed. Please do not depend on it for anything important. We welcome feedback through the contact details in Section 22.",
  },
  {
    title: "4. Who May Use AtomIQ",
    body:
      "AtomIQ is for general audiences, including students. If you are under 18 (the age of majority in the Philippines), or under the age of majority where you live, use the App with the knowledge of a parent, guardian or teacher, who agrees to these Terms for you. Adults are responsible for supervising a child's use of links to outside websites.\n" +
      "You confirm that you are allowed to download and use the App in your country.",
  },
  {
    title: "5. Your License to Use the App",
    body:
      "We give you a personal, non-exclusive, non-transferable, revocable license to install and use the App on devices you own or control, for your own non-commercial learning. Teachers may use it with students in class for teaching.\n" +
      "You may not, except where the law allows it regardless of this limit:\n" +
      "• copy, sell, rent, lend, sublicense or redistribute the App or its content;\n" +
      "• modify the App, make derivative works from it, or reverse engineer or extract its source code or content database;\n" +
      "• remove notices of ownership or credit;\n" +
      "• use the App or its content to train other software or to build a competing product.",
  },
  {
    title: "6. Educational Purpose and Safety",
    body:
      "AtomIQ is for general education and illustration. It is not professional, medical, legal, engineering, radiation-protection, emergency or regulatory advice.\n" +
      "• Never try to obtain, handle, build, test or experiment with radioactive materials, radiation sources, nuclear devices, or high-energy or electrical equipment because of anything in the App.\n" +
      "• The labs, games and visualizations are simplified models. Their numbers (such as half-lives, shielding effects and doses) are for learning only. Do not use them for real safety calculations, shielding design, dose limits, medical choices or emergency decisions.\n" +
      "• If you think you have been exposed to radiation or face a real emergency, contact your local emergency number, a health professional and your national nuclear regulator.\n" +
      "• For real decisions, rely on qualified professionals and official sources such as the IAEA, UNSCEAR and your national regulator.",
  },
  {
    title: "7. Content Accuracy and Sources",
    body:
      "We work to keep the content accurate and up to date. Nuclear science is complex and keeps developing, and we simplify it to teach it, so the content is provided “as is” without a guarantee that it is complete, current or correct. Always check important facts against primary sources.\n" +
      "Many entries cite outside sources, which we credit where shown. We do not control those sites or their content and are not responsible for them. If you find an error, please tell us through the contact details at the end of these Terms.",
  },
  {
    title: "8. Your Profile, Progress and Data",
    body:
      "The App needs no online account. Your profile, progress, rewards and settings are stored only on your device, as the Privacy Policy describes. There is no sync, so your progress does not move between devices. Deleting your data in Settings, clearing the App's storage or uninstalling erases it for good, and we cannot restore it.\n" +
      "You are responsible for your device and for what you type. Please choose a nickname rather than your real name, and do not use a name that is offensive, that impersonates someone, or that contains someone else's personal information.",
  },
  {
    title: "9. Points, Diamonds and Virtual Items",
    body:
      "XP, levels, stars, streaks, diamonds, chests, achievements, badges, titles and avatar items are virtual. They exist to motivate you and to personalize your profile. They have no cash value, cannot be redeemed for money or goods, and cannot be sold or transferred.\n" +
      "We may adjust, rebalance or reset them, for example to fix an error or after an update. The App currently has no purchases with real money. If that ever changes, separate terms and the app store's rules will apply and will be shown to you before any charge.",
  },
  {
    title: "10. Characters, Rankings and the Feed",
    body:
      "The teachers, rivals and posters in AtomIQ are fictional characters. What they post, say and react with, and the weekly ranking, are produced by the App from bundled content and from your own progress. They are not real people and do not speak for real people. Where the App describes real scientists or events, it summarizes them for education.\n" +
      "AtomIQ has no messaging, no public profiles and no content posted by users.",
  },
  {
    title: "11. Acceptable Use",
    body:
      "Use the App responsibly and lawfully. You agree not to:\n" +
      "• tamper with the App or its data to fake scores, ranks, streaks or achievements;\n" +
      "• attack, probe or interfere with the App, your device or any service it links to;\n" +
      "• use scripts, bots or other automated means to use the App or collect its content;\n" +
      "• use the App to harass or mislead anyone, or for any unlawful or harmful purpose;\n" +
      "• present the App's content as your own or as official advice.",
  },
  {
    title: "12. Intellectual Property",
    body:
      "The App, including its software, design, mascot, characters, artwork, lessons, questions, games and text, is owned by us or our licensors and protected by intellectual-property law. These Terms give you a license to use it, not ownership of it.\n" +
      "Third-party materials, such as pictures, fonts, icons, reference sources and open-source software (including Expo and React Native), remain the property of their owners and are used under their licenses, which apply to those parts. The names of organizations and publications we cite belong to them.",
  },
  {
    title: "13. Feedback You Send",
    body:
      "If you send feedback, ideas or error reports, you give us a non-exclusive, worldwide, royalty-free, perpetual license to use them to improve the App, without any obligation to you. Please do not include sensitive personal information. We handle what you send as the Privacy Policy describes.",
  },
  {
    title: "14. Third-Party Services and Links",
    body:
      "The App links to or relies on services we do not run, such as your device's speech engine and browser, the app store you downloaded it from, the websites behind source links. They have their own terms and privacy policies, and we are not responsible for them. The app store's own terms apply to your download of the App.",
  },
  {
    title: "15. Updates, Changes and Availability",
    body:
      "We may update, change, suspend or stop any part of the App, or the whole App, and may add or remove content. We will try to give notice of important changes. Some updates may be needed to keep the App working with your device. We do not promise that the App will always be available or free of errors.",
  },
  {
    title: "16. Disclaimer of Warranties",
    body:
      "To the maximum extent the law allows, the App is provided “as is” and “as available”, without warranties of any kind, express or implied. This includes any warranty of merchantability, fitness for a particular purpose, accuracy, reliability, availability, non-infringement, and that the App will be free of errors or will keep your progress.",
  },
  {
    title: "17. Limitation of Liability",
    body:
      "To the maximum extent the law allows, we, our developers, our partners and contributors are not liable for any indirect, incidental, special, consequential or punitive damages, or for loss of progress, data or use of your device, arising from your use of the App, your inability to use it, or your reliance on its educational content. This includes any harm from acting on the App's content in the real world despite the warnings in Section 6.\n" +
      "Our total liability for any claim about the App is limited to the amount you paid for it, which is zero while the App is free. Nothing in these Terms limits liability that the law does not allow to be limited, or any rights you have as a consumer that cannot be waived.",
  },
  {
    title: "18. Ending These Terms",
    body:
      "You can stop using the App at any time by uninstalling it or deleting your data in Settings. We may end your license if you break these Terms. When the license ends, stop using the App and remove it. Sections that by their nature should continue, such as ownership, disclaimers, limits of liability and governing law, continue after the end.",
  },
  {
    title: "19. Governing Law and Disputes",
    body:
      `These Terms are governed by the laws of ${LEGAL_GOVERNING_LAW}, without regard to its conflict-of-law rules. If you have a problem, please contact us first so we can try to settle it in good faith. If it cannot be settled, it will be brought to the proper courts of ${LEGAL_GOVERNING_LAW}. This does not take away rights that the law of the place where you live gives you and that cannot be waived.`,
  },
  {
    title: "20. General",
    body:
      "These Terms and the Privacy Policy are the whole agreement between you and us about the App. If any part is found unenforceable, the rest stays in effect. If we do not enforce a part, that is not a waiver of it. You may not transfer your rights under these Terms; we may transfer ours with the App. If these Terms are translated, the English version controls.",
  },
  {
    title: "21. Changes to These Terms",
    body:
      `This is version ${LEGAL_VERSION}, last updated ${LEGAL_LAST_UPDATED}. We may change these Terms when the App or the law changes. When the change is important we will say so in the App, and for a change that affects your rights we will ask you to accept it again. Using the App after a change is posted means you accept the updated Terms; if you do not accept them, stop using the App.`,
  },
  {
    title: "22. Contact",
    body: contactLine("terms"),
  },
];
