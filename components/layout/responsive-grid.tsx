/**
 * ResponsiveGrid — switches column count only while every item can keep the
 * minimum readable width. Children are laid out in a wrapping row so the grid
 * never requires horizontal scrolling.
 */

import { Children, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { getColumnCount, layout, useResponsiveLayout } from "@/theme/layout";

export interface ResponsiveGridProps {
    children: ReactNode;
    /** Minimum width each item must keep before a column is added. */
    minItemWidth?: number;
    gap?: number;
    /** Preserve an intentional layout, e.g. the two-column Discovery gallery. */
    maxColumns?: number;
    style?: StyleProp<ViewStyle>;
    itemStyle?: StyleProp<ViewStyle>;
}

export function ResponsiveGrid({
    children,
    minItemWidth = layout.gridItemMinWidth,
    gap = layout.gridGap,
    maxColumns,
    style,
    itemStyle,
}: ResponsiveGridProps) {
    const { contentWidth } = useResponsiveLayout();
    const columns = getColumnCount(contentWidth, {
        minItemWidth,
        gap,
        maxColumns,
    });
    const itemWidth = Math.max(
        0,
        (contentWidth - gap * (columns - 1)) / columns,
    );

    return (
        <View
            style={[
                { flexDirection: "row", flexWrap: "wrap", gap },
                style,
            ]}
        >
            {Children.map(children, (child, index) => (
                <View key={index} style={[{ width: itemWidth }, itemStyle]}>
                    {child}
                </View>
            ))}
        </View>
    );
}

export default ResponsiveGrid;
