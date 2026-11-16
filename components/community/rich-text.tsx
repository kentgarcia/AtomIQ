import type { ReactNode } from "react";
import { Text } from "react-native";

import { fontFaces } from "@/theme";

/**
 * Myth/fact content ships with **bold** markers and "- " list lines. Nested
 * <Text> inherits the parent size/color/line-height, so bold spans only
 * override the family — base styling stays intact.
 */
export const renderRichText = (text: string): ReactNode[] => {
  const normalized = text
    .split("\n")
    .map((line) => line.replace(/^\s*-\s+/, "• "))
    .join("\n");
  return normalized.split("**").map((part, i) =>
    i % 2 === 1 ? (
      <Text key={i} style={{ ...fontFaces.bold }}>
        {part}
      </Text>
    ) : (
      <Text key={i}>{part}</Text>
    ),
  );
};
