/**
 * Responsive layout model — the single source of truth for window classes,
 * content frames, and safe bottom occlusion.
 *
 * Screens must branch on these classes and the content frame, never on device
 * model, brand, or a hardcoded list of phone names.
 */

import { useMemo } from "react";
import { useWindowDimensions, type ViewStyle } from "react-native";
import { useSafeAreaInsets, type EdgeInsets } from "react-native-safe-area-context";

export const layout = {
    /** Below this width the screen is "compact". */
    compactBelow: 360,
    /** At or above this width the screen is a "tablet". */
    tabletFrom: 600,
    /** At or below this height the screen is "short". */
    shortUpTo: 720,
    /** At or above this height the screen is "tall". */
    tallFrom: 840,
    /** Maximum readable content width on tablets. */
    readableMaxWidth: 720,
    /** Minimum width a grid item must keep before a column is added. */
    gridItemMinWidth: 160,
    /** Minimum Android touch target (dp). */
    minTouchTarget: 48,
    /** Horizontal gutter per width class. */
    gutter: {
        compact: 16,
        phone: 20,
        tablet: 24,
    },
    /** Gap used by responsive grids. */
    gridGap: 12,
    /** Floating tab bar metrics (content height excludes safe-area inset). */
    tabBar: {
        contentHeight: 79,
        gap: 16,
        horizontalMargin: 36,
        maxWidth: 520,
    },
} as const;

export type WidthClass = "compact" | "phone" | "tablet";
export type HeightClass = "short" | "standard" | "tall";

export const getWidthClass = (width: number): WidthClass => {
    if (width < layout.compactBelow) {
        return "compact";
    }
    if (width < layout.tabletFrom) {
        return "phone";
    }
    return "tablet";
};

export const getHeightClass = (height: number): HeightClass => {
    if (height <= layout.shortUpTo) {
        return "short";
    }
    if (height >= layout.tallFrom) {
        return "tall";
    }
    return "standard";
};

export const getHorizontalGutter = (width: number): number => {
    const widthClass = getWidthClass(width);
    return layout.gutter[widthClass];
};

export const getContentMaxWidth = (width: number): number =>
    width >= layout.tabletFrom ? layout.readableMaxWidth : width;

/** Usable content width after the gutters are applied. */
export const getContentWidth = (width: number): number => {
    const maxWidth = getContentMaxWidth(width);
    return Math.max(0, Math.min(width, maxWidth) - getHorizontalGutter(width) * 2);
};

/**
 * Column count for a grid, only adding a column while every item can keep the
 * minimum width. `maxColumns` lets a feature preserve an intentional layout
 * (for example the two-column Discovery gallery).
 */
export const getColumnCount = (
    contentWidth: number,
    options: { minItemWidth?: number; gap?: number; maxColumns?: number } = {},
): number => {
    const minItemWidth = options.minItemWidth ?? layout.gridItemMinWidth;
    const gap = options.gap ?? layout.gridGap;
    const maxColumns = options.maxColumns ?? Number.POSITIVE_INFINITY;

    if (contentWidth <= 0) {
        return 1;
    }

    const fit = Math.floor((contentWidth + gap) / (minItemWidth + gap));
    return Math.min(maxColumns, Math.max(1, fit));
};

export interface ResponsiveLayout {
    width: number;
    height: number;
    fontScale: number;
    widthClass: WidthClass;
    heightClass: HeightClass;
    isCompact: boolean;
    isPhone: boolean;
    isTablet: boolean;
    isShort: boolean;
    isTall: boolean;
    /** True when the OS font scale is enlarged (>= 1.3). */
    isLargeText: boolean;
    insets: EdgeInsets;
    /** Horizontal gutter for the current width class. */
    gutter: number;
    /** Maximum width the readable content frame may occupy. */
    contentMaxWidth: number;
    /** Usable width inside the gutters. */
    contentWidth: number;
    /** Height reserved by the floating tab bar, including the safe-area inset. */
    tabBarReservedHeight: number;
    /** Style for a centered, gutter-padded content frame. */
    contentFrameStyle: ViewStyle;
}

/**
 * Resolves the responsive contract for the current window. Memoised so style
 * objects stay referentially stable between renders.
 */
export function useResponsiveLayout(): ResponsiveLayout {
    const { width, height, fontScale } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    return useMemo(() => {
        const widthClass = getWidthClass(width);
        const heightClass = getHeightClass(height);
        const gutter = getHorizontalGutter(width);
        const contentMaxWidth = getContentMaxWidth(width);
        const contentWidth = getContentWidth(width);

        const contentFrameStyle: ViewStyle = {
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
            paddingHorizontal: gutter,
        };

        return {
            width,
            height,
            fontScale,
            widthClass,
            heightClass,
            isCompact: widthClass === "compact",
            isPhone: widthClass === "phone",
            isTablet: widthClass === "tablet",
            isShort: heightClass === "short",
            isTall: heightClass === "tall",
            isLargeText: fontScale >= 1.3,
            insets,
            gutter,
            contentMaxWidth,
            contentWidth,
            tabBarReservedHeight:
                layout.tabBar.contentHeight + layout.tabBar.gap + insets.bottom,
            contentFrameStyle,
        };
    }, [width, height, fontScale, insets]);
}
