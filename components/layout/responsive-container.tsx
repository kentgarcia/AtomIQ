/**
 * ResponsiveContainer — centers the readable content frame and applies the
 * width-class gutter. Use it for page headers, lists, and non-scrolling
 * sections so tablet layouts never stretch edge-to-edge.
 */

import { View, type ViewProps } from "react-native";

import { useResponsiveLayout } from "@/theme/layout";

export interface ResponsiveContainerProps extends ViewProps {
    /** Override the width-class gutter. */
    gutter?: number;
    /** Override the readable max width. */
    maxWidth?: number;
    /** Set false to keep the container left-aligned. */
    centered?: boolean;
}

export function ResponsiveContainer({
    children,
    style,
    gutter,
    maxWidth,
    centered = true,
    ...rest
}: ResponsiveContainerProps) {
    const frame = useResponsiveLayout();
    const resolvedGutter = gutter ?? frame.gutter;
    const resolvedMaxWidth = maxWidth ?? frame.contentMaxWidth;

    return (
        <View
            {...rest}
            style={[
                {
                    width: "100%",
                    maxWidth: resolvedMaxWidth,
                    paddingHorizontal: resolvedGutter,
                },
                centered && { alignSelf: "center" },
                style,
            ]}
        >
            {children}
        </View>
    );
}

export default ResponsiveContainer;
