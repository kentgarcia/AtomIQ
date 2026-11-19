/**
 * Facts the Privacy Policy and Terms of Service share. Change them here, not in the text.
 * Framework-free so `npm run test:legal` can load it.
 */

/** Bump when either document changes in a way that matters, and move the date with it. */
export const LEGAL_VERSION = "2.0";
export const LEGAL_LAST_UPDATED = "November 19, 2026";

/**
 * Where people can reach the team about privacy and the terms. Set this to a monitored address
 * BEFORE release (the app stores also require one). While it is null the documents point to the
 * Beta Feedback form and the app store page instead of showing a blank.
 */
export const LEGAL_CONTACT_EMAIL: string | null = null;

/** The law the Terms are read under. Confirm with your adviser before release. */
export const LEGAL_GOVERNING_LAW = "the Republic of the Philippines";

/** The one sentence both documents end with. */
export const contactLine = (subject: "privacy" | "terms"): string => {
  const what = subject === "privacy" ? "this Privacy Policy or your information" : "these Terms";
  return LEGAL_CONTACT_EMAIL
    ? `For questions or requests about ${what}, write to ${LEGAL_CONTACT_EMAIL}. We aim to answer within 30 days.`
    : `For questions or requests about ${what}, use Beta Feedback in Settings > About or the contact details on AtomIQ's page in the app store. We aim to answer within 30 days.`;
};
