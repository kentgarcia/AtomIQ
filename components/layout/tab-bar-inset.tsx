/**
 * Measured floating tab-bar inset + visibility.
 *
 * The tab bar reports its rendered height so screens reserve exactly the
 * space it occupies instead of guessing with magic padding values. The
 * provider wraps the tab navigator; every tab screen calls
 * `useTabBarInset()` for the bottom space to reserve.
 *
 * Visibility is owned here too (never via navigation params, which apply a
 * frame late and left the bar floating over immersive screens):
 *   - a screen calls `useHideTabBar(true)` while it is immersive;
 *   - the bar hides while the soft keyboard is open;
 *   - when hidden, `useTabBarInset()` shrinks to the system inset only, so
 *     no phantom gap is reserved.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
} from "react";
import { Keyboard, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { layout } from "@/theme/layout";

export interface TabBarInsetValue {
    /** Measured bar content height (excludes the safe-area inset and gap). */
    height: number;
    /** Total vertical space the bar occupies from the screen bottom (0 safe-area excluded when hidden). */
    total: number;
    /** True while the bar is rendered (not hidden by a screen or the keyboard). */
    visible: boolean;
    reportHeight: (height: number) => void;
    /** Register/unregister an immersive screen that wants the bar hidden. */
    setHiddenBy: (owner: string, hidden: boolean) => void;
}

const TabBarInsetContext = createContext<TabBarInsetValue | null>(null);

export function TabBarInsetProvider({ children }: { children: React.ReactNode }) {
    const insets = useSafeAreaInsets();
    const [measuredHeight, setMeasuredHeight] = useState(0);
    const [hiders, setHiders] = useState<readonly string[]>([]);
    const [keyboardOpen, setKeyboardOpen] = useState(false);

    useEffect(() => {
        const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
        const show = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
        const hide = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    const reportHeight = useCallback((height: number) => {
        if (!Number.isFinite(height) || height <= 0) {
            return;
        }
        setMeasuredHeight((current) =>
            Math.abs(current - height) < 0.5 ? current : height,
        );
    }, []);

    const setHiddenBy = useCallback((owner: string, hidden: boolean) => {
        setHiders((current) => {
            const has = current.includes(owner);
            if (hidden === has) return current;
            return hidden ? [...current, owner] : current.filter((o) => o !== owner);
        });
    }, []);

    const visible = hiders.length === 0 && !keyboardOpen;

    const value = useMemo<TabBarInsetValue>(() => {
        const height =
            measuredHeight > 0 ? measuredHeight : layout.tabBar.contentHeight;
        return {
            height,
            visible,
            total: visible
                ? height + layout.tabBar.gap + insets.bottom
                : insets.bottom,
            reportHeight,
            setHiddenBy,
        };
    }, [measuredHeight, insets.bottom, reportHeight, setHiddenBy, visible]);

    return (
        <TabBarInsetContext.Provider value={value}>
            {children}
        </TabBarInsetContext.Provider>
    );
}

/** Total bottom space occupied by the floating tab bar (or just the system inset when hidden). */
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

/** Used by the tab bar to know whether it should render. */
export function useTabBarVisible(): boolean {
    return useContext(TabBarInsetContext)?.visible ?? true;
}

/**
 * Hide the tab bar while `hidden` is true (immersive flows where the bar
 * would compete with a primary action). Applied in a layout effect so the
 * bar never paints over the screen for a frame, and always released on
 * unmount so it cannot stay hidden after the screen is gone.
 */
export function useHideTabBar(hidden: boolean, owner = "screen"): void {
    const setHiddenBy = useContext(TabBarInsetContext)?.setHiddenBy;

    useLayoutEffect(() => {
        if (!setHiddenBy) return;
        setHiddenBy(owner, hidden);
        return () => setHiddenBy(owner, false);
    }, [hidden, owner, setHiddenBy]);
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
