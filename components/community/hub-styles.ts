/**
 * Styles of the Discover screen and its pieces (HubBar, encyclopedia rows, empty state).
 * The card construction itself (face on a lip, yellow band) is in `BandCard.tsx`; what is here is
 * what goes on them. Theme-dependent, built once per theme by `createStyles`.
 */

import { createStyles, fontFaces, withAlpha } from "@/theme";
import { controls } from "@/theme/tokens";

export const makeHubStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1 },
    /* Pinned row above the list */
    bar: { paddingBottom: 10 },
    tabIntro: { marginTop: 14 },
    vaultLink: { alignSelf: "center", marginTop: 4 },

    /* Search: a card on a lip with a tinted icon circle, the input and a clear button */
    searchCard: { marginTop: 14 },
    searchFace: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: c.card },
    searchIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(c.primary, 0.12),
    },
    searchInput: { flex: 1, fontSize: 15, ...fontFaces.semibold, color: c.text, paddingVertical: 4 },
    searchClear: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSoft },

    /* List */
    galleryContent: { paddingHorizontal: 16, paddingTop: 8 },
    categoryPill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: withAlpha(c.primary, 0.12) },
    galleryCategory: { fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", ...fontFaces.heavy, color: c.primaryLight },

    /* Empty state: a banded card with a short body */
    emptyCard: { marginTop: 24 },
    emptyBody: { alignItems: "center", gap: 6, paddingVertical: 8 },
    emptyMascot: { width: 96, height: 96, opacity: 0.9 },
    emptyText: { fontSize: 17, textAlign: "center", ...fontFaces.heavy, color: c.text },
    emptySubtext: { fontSize: 13, lineHeight: 18, textAlign: "center", ...fontFaces.medium, color: c.textMuted },

    /* Encyclopedia rows */
    row: { marginBottom: 12 },
    rowFace: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
    rowMain: { flex: 1, gap: 4 },
    rowTerm: { fontSize: 17, ...fontFaces.heavy, color: c.text },
    rowDefinition: { fontSize: 13, lineHeight: 19, ...fontFaces.regular, color: c.textSecondary },
    arrow: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: c.primary },

    /* Periodic Table banner body */
    bannerBody: { flexDirection: "row", alignItems: "center", gap: 12 },
    bannerIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(c.info, 0.16) },
    bannerCopy: { flex: 1 },
    bannerText: { fontSize: 13, ...fontFaces.semibold, color: c.textMuted },
    bannerWrap: { marginBottom: 14 },
    lipOnly: { marginBottom: controls.lip },
  };
});
