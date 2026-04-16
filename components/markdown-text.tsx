import { openExternalUrl } from "@/services/open-url";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface MarkdownTextProps {
  text: string;
  style?: any;
  textColor?: string;
}

/**
 * Simple markdown renderer for React Native
 * Supports: bold, italic, code, links, lists, headers, line breaks
 */
export function MarkdownText({
  text,
  style,
  textColor = "#2D3436",
}: MarkdownTextProps) {
  if (!text) return null;

  // Process text line by line to handle lists and headers better
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  const processedLines = new Set<number>();

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    if (processedLines.has(lineIndex)) continue;

    const line = lines[lineIndex];
    const processedLine = line.trim();

    // Skip empty lines (but preserve spacing)
    if (!processedLine) {
      if (lineIndex < lines.length - 1) {
        elements.push(<Text key={`br-${lineIndex}`}>{"\n"}</Text>);
      }
      continue;
    }

    // Code blocks
    if (processedLine.startsWith("```")) {
      // Find closing ```
      let codeContent = "";
      let codeEnd = lineIndex;
      for (let i = lineIndex + 1; i < lines.length; i++) {
        if (lines[i].trim().startsWith("```")) {
          codeEnd = i;
          break;
        }
        codeContent += (codeContent ? "\n" : "") + lines[i];
      }

      if (codeContent) {
        elements.push(
          <View
            key={`codeblock-${lineIndex}`}
            style={styles.codeBlockContainer}
          >
            <Text style={[styles.codeBlock, { color: textColor }]}>
              {codeContent}
            </Text>
          </View>,
        );
        // Mark all lines in code block as processed
        for (let i = lineIndex; i <= codeEnd; i++) {
          processedLines.add(i);
        }
        continue;
      }
    }

    // Headers
    if (processedLine.startsWith("### ")) {
      elements.push(
        <Text key={`h3-${lineIndex}`} style={[styles.h3, { color: textColor }]}>
          {processInlineMarkdown(processedLine.substring(4), textColor)}
          {"\n"}
        </Text>,
      );
      continue;
    }
    if (processedLine.startsWith("## ")) {
      elements.push(
        <Text key={`h2-${lineIndex}`} style={[styles.h2, { color: textColor }]}>
          {processInlineMarkdown(processedLine.substring(3), textColor)}
          {"\n"}
        </Text>,
      );
      continue;
    }
    if (processedLine.startsWith("# ")) {
      elements.push(
        <Text key={`h1-${lineIndex}`} style={[styles.h1, { color: textColor }]}>
          {processInlineMarkdown(processedLine.substring(2), textColor)}
          {"\n"}
        </Text>,
      );
      continue;
    }

    // Bullet lists
    if (processedLine.startsWith("- ") || processedLine.startsWith("* ")) {
      elements.push(
        <Text
          key={`bullet-${lineIndex}`}
          style={[styles.text, { color: textColor }]}
        >
          {"\n• "}
          {processInlineMarkdown(processedLine.substring(2), textColor)}
        </Text>,
      );
      continue;
    }

    // Numbered lists
    const numberedMatch = processedLine.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      elements.push(
        <Text
          key={`numbered-${lineIndex}`}
          style={[styles.text, { color: textColor }]}
        >
          {"\n"}
          {numberedMatch[1]}.{" "}
          {processInlineMarkdown(numberedMatch[2], textColor)}
        </Text>,
      );
      continue;
    }

    // Regular text with inline markdown
    if (processedLine) {
      elements.push(
        <Text
          key={`text-${lineIndex}`}
          style={[styles.text, { color: textColor }]}
        >
          {processInlineMarkdown(processedLine, textColor)}
          {lineIndex < lines.length - 1 ? "\n" : ""}
        </Text>,
      );
    }
  }

  return <Text style={style}>{elements}</Text>;
}

/**
 * Process inline markdown (bold, italic, code, links)
 */
function processInlineMarkdown(
  text: string,
  textColor: string,
): React.ReactNode[] {
  if (!text) return [];

  const elements: React.ReactNode[] = [];
  let keyCounter = 0;
  let currentIndex = 0;

  // Find all markdown patterns
  const patterns: Array<{
    start: number;
    end: number;
    type: string;
    content: string;
    url?: string;
  }> = [];

  // Code blocks (backticks)
  const codeRegex = /`([^`]+)`/g;
  let match;
  while ((match = codeRegex.exec(text)) !== null) {
    patterns.push({
      start: match.index,
      end: match.index + match[0].length,
      type: "code",
      content: match[1],
    });
  }

  // Links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  while ((match = linkRegex.exec(text)) !== null) {
    patterns.push({
      start: match.index,
      end: match.index + match[0].length,
      type: "link",
      content: match[1],
      url: match[2],
    });
  }

  // Bold (**text**)
  const boldRegex = /\*\*([^*]+)\*\*/g;
  while ((match = boldRegex.exec(text)) !== null) {
    patterns.push({
      start: match.index,
      end: match.index + match[0].length,
      type: "bold",
      content: match[1],
    });
  }

  // Italic (*text*)
  const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)/g;
  while ((match = italicRegex.exec(text)) !== null) {
    patterns.push({
      start: match.index,
      end: match.index + match[0].length,
      type: "italic",
      content: match[1],
    });
  }

  // Sort by position
  patterns.sort((a, b) => a.start - b.start);

  // Build elements array
  patterns.forEach((pattern) => {
    // Add text before pattern
    if (pattern.start > currentIndex) {
      const beforeText = text.substring(currentIndex, pattern.start);
      if (beforeText) {
        elements.push(
          <Text key={`text-${keyCounter++}`} style={{ color: textColor }}>
            {beforeText}
          </Text>,
        );
      }
    }

    // Add pattern element
    switch (pattern.type) {
      case "code":
        elements.push(
          <Text key={`code-${keyCounter++}`} style={styles.code}>
            {pattern.content}
          </Text>,
        );
        break;
      case "link":
        elements.push(
          <Text
            key={`link-${keyCounter++}`}
            style={[styles.link, { color: "#EA580C" }]}
            onPress={() => {
              if (pattern.url) {
                void openExternalUrl(pattern.url);
              }
            }}
          >
            {pattern.content}
          </Text>,
        );
        break;
      case "bold":
        elements.push(
          <Text
            key={`bold-${keyCounter++}`}
            style={[styles.bold, { color: textColor }]}
          >
            {pattern.content}
          </Text>,
        );
        break;
      case "italic":
        elements.push(
          <Text
            key={`italic-${keyCounter++}`}
            style={[styles.italic, { color: textColor }]}
          >
            {pattern.content}
          </Text>,
        );
        break;
    }

    currentIndex = pattern.end;
  });

  // Add remaining text
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex);
    if (remainingText) {
      elements.push(
        <Text key={`text-${keyCounter++}`} style={{ color: textColor }}>
          {remainingText}
        </Text>,
      );
    }
  }

  return elements.length > 0
    ? elements
    : [
        <Text key="default" style={{ color: textColor }}>
          {text}
        </Text>,
      ];
}

const styles = StyleSheet.create({
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  bold: {
    fontWeight: "800",
  },
  italic: {
    fontStyle: "italic",
  },
  code: {
    fontFamily: "monospace",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
  },
  codeBlockContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#EA580C",
  },
  codeBlock: {
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    color: "#EA580C",
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  h1: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 32,
  },
  h2: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 6,
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 4,
    lineHeight: 24,
  },
});
