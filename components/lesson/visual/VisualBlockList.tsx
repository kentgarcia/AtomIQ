import { View } from "react-native";

import { VisualBlockView } from "./VisualBlockView";

/** Renders a step's `visuals` array (unknown shape tolerated). Renders nothing when empty. */
export function VisualBlockList({ visuals }: { visuals: unknown[] }) {
  if (!Array.isArray(visuals) || visuals.length === 0) return null;
  return (
    <View style={{ width: "100%", gap: 16 }}>
      {visuals.map((block, i) => {
        const id =
          typeof block === "object" && block !== null && "id" in block
            ? String((block as { id: unknown }).id)
            : `visual-${i}`;
        return <VisualBlockView key={`${id}-${i}`} block={block} />;
      })}
    </View>
  );
}
