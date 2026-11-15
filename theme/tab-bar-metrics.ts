/**
 * Tab bar metrics — the single source of truth for where the floating tab bar
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
export const TAB_BAR_TAB_COUNT = 5;

export const TAB_BAR_CONSTANTS = {
    /** Minimum Android touch target (dp) — every tab hit area must keep this width. */
    minTabWidth: 48,
    /** Bar never grows past this width (tablets stay a floating, centred control). */
    maxWidth: 520,
    /** Horizontal distance from the window side to the bar (phones, 360 dp and up). */
    maxMargin: 36,
    /** Smallest horizontal margin, so the bar never touches the window side. */
    minMargin: 12,
    /** Extra room kept between the bar and a side system inset / cutout. */
    sideInsetGap: 8,
    /** Inner horizontal padding of the bar. */
    barPaddingHorizontal: 8,
    /** Left/right border width of the bar. */
    barBorderWidth: 2,
    /** Top border (2) + bottom lip (5) of the bar. */
    barVerticalBorders: 7,
    /** Dense variant applies below this window width. */
    denseBelowWidth: 360,
    /** Dense variant applies at or below this window height. */
    denseUpToHeight: 640,
    regular: { iconSlot: 52, iconSize: 32, verticalPadding: 8, gap: 16 },
    dense: { iconSlot: 48, iconSize: 28, verticalPadding: 6, gap: 12 },
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
    /** Bar height including borders (what `onLayout` reports). */
    contentHeight: number;
    /** Width of the icon slot; never wider than its tab. */
    iconSlot: number;
    /** Height of the icon slot (variant value; keeps the bar height stable). */
    iconSlotHeight: number;
    /** Glyph size. */
    iconSize: number;
    verticalPadding: number;
    /** Space between the bar bottom and the system inset. */
    gap: number;
    /** Distance from the window bottom to the bar bottom (`insets.bottom + gap`). */
    bottomOffset: number;
    /** Distance from each window side to the bar. */
    horizontalMargin: number;
    barWidth: number;
    /** Hit-area width per tab. */
    tabWidth: number;
    /** Space screens reserve for the bar (`contentHeight + bottomOffset`). */
    reservedHeight: number;
}

const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

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

    // Widest margin that still leaves every tab at least minTabWidth wide.
    const fitMargin =
        (width -
            tabCount * c.minTabWidth -
            2 * c.barPaddingHorizontal -
            2 * c.barBorderWidth) /
        2;
    const horizontalMargin = Math.max(
        clamp(fitMargin, c.minMargin, c.maxMargin),
        leftInset + c.sideInsetGap,
        rightInset + c.sideInsetGap,
    );

    const barWidth = Math.min(width - 2 * horizontalMargin, c.maxWidth);
    const tabWidth =
        (barWidth - 2 * c.barPaddingHorizontal - 2 * c.barBorderWidth) / tabCount;
    const iconSlot = Math.min(v.iconSlot, Math.floor(tabWidth));

    const contentHeight = v.iconSlot + 2 * v.verticalPadding + c.barVerticalBorders;
    const bottomOffset = bottomInset + v.gap;

    return {
        variant,
        contentHeight,
        iconSlot,
        iconSlotHeight: v.iconSlot,
        iconSize: v.iconSize,
        verticalPadding: v.verticalPadding,
        gap: v.gap,
        bottomOffset,
        horizontalMargin,
        barWidth,
        tabWidth,
        reservedHeight: contentHeight + bottomOffset,
    };
}
