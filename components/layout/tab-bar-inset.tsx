/**
 * Measured floating tab-bar inset.
 *
 * The tab bar reports its rendered height so screens can reserve exactly the
 * space it occupies instead of guessing with magic padding values. The
 * provider wraps the tab navigator; every tab screen can then call
 * `useTabBarInset()`.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { layout } from "@/theme/layout";

export interface TabBarInsetValue {
    /** Measured bar content height (excludes the safe-area inset and gap). */
    height: number;
    /** Total vertical space to reserve at the bottom of scrollable content. */
    total: number;
    reportHeight: (height: number) => void;
}

const TabBarInsetContext = createContext<TabBarInsetValue | null>(null);

export function TabBarInsetProvider({ children }: { children: React.ReactNode }) {
    const insets = useSafeAreaInsets();
    const [measuredHeight, setMeasuredHeight] = useState(0);

    const reportHeight = useCallback((height: number) => {
        if (!Number.isFinite(height) || height <= 0) {
            return;
        }
        setMeasuredHeight((current) =>
            Math.abs(current - height) < 0.5 ? current : height,
        );
    }, []);

    const value = useMemo<TabBarInsetValue>(() => {
        const height =
            measuredHeight > 0 ? measuredHeight : layout.tabBar.contentHeight;
        return {
            height,
            total: height + layout.tabBar.gap + insets.bottom,
            reportHeight,
        };
    }, [measuredHeight, insets.bottom, reportHeight]);

    return (
        <TabBarInsetContext.Provider value={value}>
            {children}
        </TabBarInsetContext.Provider>
    );
}

/** Total bottom space occupied by the floating tab bar. */
export function useTabBarInset(): number {
    const context = useContext(TabBarInsetContext);
    const insets = useSafeAreaInsets();

    if (context) {
        return context.total;
    }

    return layout.tabBar.contentHeight + layout.tabBar.gap + insets.bottom;
}

/** Used by the tab bar itself to publish its measured height. */
export function useTabBarHeightReporter(): ((height: number) => void) | undefined {
    return useContext(TabBarInsetContext)?.reportHeight;
}

/**
 * Bottom padding for a screen. `tabBar` reserves the floating bar; otherwise
 * only the system safe-area inset is reserved. `extra` adds a control that sits
 * above the bar (composer, CTA, answer row).
 */
export function useBottomInset(
    options: { tabBar?: boolean; extra?: number } = {},
): number {
    const insets = useSafeAreaInsets();
    const tabBarInset = useTabBarInset();
    const base = options.tabBar ? tabBarInset : insets.bottom;
    return base + (options.extra ?? 0);
}
