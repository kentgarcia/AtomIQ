/**
 * ReadAloudButton — the one Read Aloud control, used on every surface
 * (lessons, random quizzes, Schrodi/Guide, MythBuster, Atom Maze, Lab,
 * encyclopedia). It shares a single speech channel and a single visible
 * state model (idle / starting / speaking / failed) — see
 * docs/MEDIA_POLICY.md.
 *
 * Active and failed states are never colour-only: the icon changes
 * (speaker → stop → warning), the busy state shows a spinner, and the pill
 * variant swaps its caption. Text/icon colour on the active fill is derived
 * from contrast, never hard-coded white.
 */

import { useMemo } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { Icon } from "@/components/ui/icon";
import { useReadAloud } from "@/hooks/use-read-aloud";
import { getReadAloudButtonModel } from "@/services/media-core";
import { fontFaces, pickReadableText, useTheme, withAlpha } from "@/theme";

export interface ReadAloudButtonProps {
    /** Stable id of this control, e.g. `quiz:${quizId}:${questionIndex}`. */
    ownerId: string;
    /** What gets read. Evaluated on press so it is always current. */
    text: string | (() => string);
    /** Lowercase noun for labels: "question", "explanation", "message". */
    subject?: string;
    variant?: "icon" | "pill";
    /** Visual diameter/height of the icon variant (hit target stays >= 48). */
    size?: number;
    /** Feature colour for the active fill and idle icon. Defaults to theme.primary. */
    accent?: string;
    /** Called when the learner starts playback (analytics hook / dismiss UI). */
    onStart?: () => void;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

export function ReadAloudButton({
    ownerId,
    text,
    subject = "text",
    variant = "icon",
    size = 40,
    accent,
    onStart,
    style,
    testID,
}: ReadAloudButtonProps) {
    const { theme } = useTheme();
    const colors = theme.colors;
    const { status, isActive, enabled, toggle } = useReadAloud(ownerId);

    const model = useMemo(
        () => getReadAloudButtonModel(status, subject),
        [status, subject],
    );

    if (!enabled) {
        return null;
    }

    const tint = accent ?? colors.primary;
    const readableOnTint = pickReadableText(tint, [colors.onPrimary, colors.text]);

    const backgroundColor = model.failed
        ? colors.errorSurface
        : isActive
          ? tint
          : colors.surfaceSoft;
    const borderColor = model.failed
        ? colors.error
        : isActive
          ? tint
          : colors.border;
    const foreground = model.failed
        ? colors.error
        : isActive
          ? readableOnTint
          : tint === colors.primary
            ? colors.text
            : tint;

    const handlePress = () => {
        const value = typeof text === "function" ? text() : text;
        if (!isActive) {
            onStart?.();
        }
        toggle(value);
    };

    const glyph = model.busy ? (
        <ActivityIndicator size="small" color={foreground} />
    ) : (
        <Icon name={model.icon} size={variant === "pill" ? 20 : 20} color={foreground} variant="Bold" />
    );

    return (
        <Pressable
            testID={testID}
            onPress={handlePress}
            hitSlop={Math.max(0, (48 - size) / 2)}
            accessibilityRole="button"
            accessibilityLabel={model.label}
            accessibilityState={{ busy: model.busy, selected: isActive }}
            android_ripple={{ color: withAlpha(foreground, 0.15), borderless: false }}
            style={({ pressed }) => [
                variant === "pill" ? styles.pill : styles.icon,
                variant === "icon" && { width: size, height: size, borderRadius: size / 2 },
                { backgroundColor, borderColor },
                style,
                pressed && styles.pressed,
            ]}
        >
            {glyph}
            {variant === "pill" ? (
                <Text style={[styles.caption, { color: foreground }]} numberOfLines={1}>
                    {model.caption}
                </Text>
            ) : null}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    icon: {
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
    },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        gap: 8,
        minHeight: 48,
        paddingHorizontal: 18,
        borderRadius: 24,
        borderWidth: 2,
    },
    caption: {
        fontSize: 14,
        ...fontFaces.bold,
    },
    pressed: {
        opacity: 0.8,
    },
});

export default ReadAloudButton;
