import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import type { TabLight as LightTHEME } from "@/theme";

export const ExpandableText = ({
  text,
  maxLength = 150,
  style,
  theme,
  styles,
}: {
  text: string;
  maxLength?: number;
  style?: any;
  theme: typeof LightTHEME;
  styles: any;
}) => {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > maxLength;
  const displayText =
    needsTruncation && !expanded
      ? text.substring(0, maxLength).trim() + "..."
      : text;

  return (
    <View>
      <Text style={[style, { color: theme.text }]}>{displayText}</Text>
      {needsTruncation && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <Text style={styles.seeMore}>
            {expanded ? "See less" : "See more"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};