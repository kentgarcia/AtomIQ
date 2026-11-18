/**
 * Text — React Native's `Text` with the app's text stretch applied (theme/text-stretch.ts).
 * A drop-in replacement: `import { Text } from "@/components/ui/text"` instead of from "react-native".
 */

import { Text as RNText, type TextProps } from "react-native";

import { stretchStyle } from "@/theme/text-stretch";

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={[stretchStyle, style]} />;
}
