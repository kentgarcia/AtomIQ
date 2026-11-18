/**
 * Tab bar metrics — the single source of truth for where the docked tab bar
 * sits and how much space it occupies (docs/TAB_BAR_RESPONSIVE_POSITIONING_SPEC.md).
 *
 * Framework-free on purpose (no React / React Native imports) so
 * `scripts/test-tab-bar-metrics.mjs` and `scripts/check-tab-bar-clearance.mjs`
 * can load it with plain Node, like `services/media-core.ts`.
 *
 * The bar, `TabBarInsetProvider`, `useResponsiveLayout()` and the CI gate all
 * call `resolveTabBarMetrics()`. Nothing else may re-derive
 * `contentHeight + gap + inset`.
 */

/** Number of tabs the bar renders (keep in sync with `app/(tabs)/_layout.tsx`). */
export const TAB_BAR_TAB_COUNT = 6;

export const TAB_BAR_CONSTANTS = {
    /** Minimum Android touch target (dp) — every tab hit area must keep this width. */
    minTabWidth: 48,
    /** The tabs never spread past this width (tablets keep them centred in the full-width bar). */
    maxWidth: 600,
    /** Inner horizontal padding of the tabs row. */
    barPaddingHorizontal: 4,
    /** Top border of the bar (the bar is docked, so it has no other border). */
    barVerticalBorders: 2,
    /** Dense variant applies below this window width. */
    denseBelowWidth: 360,
    /** Dense variant applies at or below this window height. */
    denseUpToHeight: 640,
    /** `gap` is 0: the bar is docked to the bottom and its background runs under the system inset. */
    regular: { iconSize: 30, labelFontSize: 11, labelLineHeight: 14, labelGap: 2, verticalPadding: 8, gap: 0 },
    dense: { iconSize: 26, labelFontSize: 10, labelLineHeight: 13, labelGap: 2, verticalPadding: 6, gap: 0 },
} as const;

export type TabBarVariant = "regular" | "dense";

export interface TabBarMetricsInput {
    windowWidth: number;
    windowHeight: number;
    insets: { top?: number; bottom: number; left?: number; right?: number };
    tabCount?: number;
}

export interface TabBarMetrics {
    variant: TabBarVariant;
    /** Bar height including its top border, excluding the system inset (what `onLayout` reports minus `bottomOffset`). */
    contentHeight: number;
    /** Glyph size. */
    iconSize: number;
    /** Label text size and line height, and the space between icon and label. */
    labelFontSize: number;
    labelLineHeight: number;
    labelGap: number;
    verticalPadding: number;
    /** Space between the bar content and the system inset (0: the bar is docked). */
    gap: number;
    /** Height of the bar's background under the content (`insets.bottom + gap`). */
    bottomOffset: number;
    /** Distance from each window side to the tabs (the side system inset; 0 on most phones). */
    horizontalMargin: number;
    /** Width of the tabs row. */
    barWidth: number;
    /** Hit-area width per tab. */
    tabWidth: number;
    /** Space screens reserve for the bar (`contentHeight + bottomOffset`). */
    reservedHeight: number;
}

const safe = (value: number | undefined): number =>
    Number.isFinite(value) && (value as number) > 0 ? (value as number) : 0;

export function resolveTabBarMetrics(input: TabBarMetricsInput): TabBarMetrics {
    const c = TAB_BAR_CONSTANTS;
    const tabCount = input.tabCount ?? TAB_BAR_TAB_COUNT;
    const width = safe(input.windowWidth);
    const height = safe(input.windowHeight);
    const bottomInset = safe(input.insets.bottom);
    const leftInset = safe(input.insets.left);
    const rightInset = safe(input.insets.right);

    const variant: TabBarVariant =
        width < c.denseBelowWidth || height <= c.denseUpToHeight
            ? "dense"
            : "regular";
    const v = c[variant];

    // The bar spans the window; only a side system inset (cutout, side navigation bar) pads it.
    const horizontalMargin = Math.max(leftInset, rightInset);

    const barWidth = Math.min(width - 2 * horizontalMargin, c.maxWidth);
    const tabWidth = (barWidth - 2 * c.barPaddingHorizontal) / tabCount;

    const contentHeight =
        v.iconSize + v.labelGap + v.labelLineHeight + 2 * v.verticalPadding + c.barVerticalBorders;
    const bottomOffset = bottomInset + v.gap;

    return {
        variant,
        contentHeight,
        iconSize: v.iconSize,
        labelFontSize: v.labelFontSize,
        labelLineHeight: v.labelLineHeight,
        labelGap: v.labelGap,
        verticalPadding: v.verticalPadding,
        gap: v.gap,
        bottomOffset,
        horizontalMargin,
        barWidth,
        tabWidth,
        reservedHeight: contentHeight + bottomOffset,
    };
}
