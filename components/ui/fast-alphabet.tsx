import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle, useDerivedValue, useSharedValue } from "react-native-reanimated";
import { fontFamilies } from "@/theme";

type FastAlphabetProps = {
  data: string[];
  availableSet?: Set<string>;
  onCharSelect?: (char: string) => void;
  onPreviewChange?: (char: string | null) => void;
};

function Cell({ letter, has }: { letter: string; has: boolean }) {
  return (
    <View style={[styles.cell, !has && styles.cellDim]} pointerEvents="none">
      <Text style={[styles.text, !has && styles.textDim]}>{letter}</Text>
    </View>
  );
}

function PreviewText({ activeCharSV }: { activeCharSV: any }) {
  const [letter, setLetter] = React.useState("");
  useAnimatedReaction(
    () => activeCharSV.value,
    (ch) => {
      runOnJS(setLetter)(ch ?? "");
    },
    []
  );
  return <Text style={styles.previewText}>{letter}</Text>;
}

export function FastAlphabet({ data, availableSet, onCharSelect, onPreviewChange }: FastAlphabetProps) {
  const heightSV = useSharedValue(1);
  const activeIdxSV = useSharedValue(-1);
  const activeCharSV = useSharedValue("");
  const previewOpacitySV = useSharedValue(0);

  const notifyChange = (idx: number) => {
    const ch = data[idx] ?? "";
    Haptics.selectionAsync();
    onCharSelect?.(ch);
    onPreviewChange?.(ch);
  };

  const notifyClear = () => {
    onPreviewChange?.(null);
  };

  const handleYWorklet = (y: number) => {
    "worklet";
    const h = heightSV.value;
    if (!h || data.length === 0) return;
    const yRel = Math.max(0, Math.min(h, y));
    const itemH = h / data.length;
    const idx = Math.max(0, Math.min(data.length - 1, Math.floor(yRel / itemH)));
    if (idx !== activeIdxSV.value) {
      activeIdxSV.value = idx;
      const ch = data[idx] ?? "";
      activeCharSV.value = ch;
      previewOpacitySV.value = 1;
      runOnJS(notifyChange)(idx);
    }
  };

  const pan = Gesture.Pan()
    .minDistance(2)
    .onBegin((e) => {
      "worklet";
      handleYWorklet(e.y);
    })
    .onChange((e) => {
      "worklet";
      handleYWorklet(e.y);
    })
    .onFinalize(() => {
      "worklet";
      activeIdxSV.value = -1;
      activeCharSV.value = "";
      previewOpacitySV.value = 0;
      runOnJS(notifyClear)();
    });

  // keep JS preview state in sync for auto-hide (also drives moving bubble via activeIdxSV)
  // tap should auto-hide after 500ms
  const scheduleTapHide = () => {
    setTimeout(() => {
      activeIdxSV.value = -1;
      activeCharSV.value = "";
      previewOpacitySV.value = 0;
      notifyClear();
    }, 500);
  };

  const tapWithHide = Gesture.Tap().onEnd((e) => {
    "worklet";
    handleYWorklet(e.y);
    runOnJS(scheduleTapHide)();
  });

  const finalGesture = Gesture.Race(tapWithHide, pan);

  const previewTopSV = useDerivedValue(() => {
    const idx = activeIdxSV.value;
    if (idx < 0 || heightSV.value <= 1) return -100;
    const itemH = heightSV.value / data.length;
    return (idx + 0.5) * itemH - 26;
  });

  const previewStyle = useAnimatedStyle(() => ({
    top: previewTopSV.value,
    opacity: previewOpacitySV.value,
    transform: [{ scale: previewOpacitySV.value === 0 ? 0.85 : 1 }],
  }));

  return (
    <GestureDetector gesture={finalGesture}>
      <View
        style={styles.container}
        onLayout={(e) => {
          heightSV.value = e.nativeEvent.layout.height;
        }}
      >
        {data.map((letter) => {
          const has = availableSet ? availableSet.has(letter) : true;
          return <Cell key={letter} letter={letter} has={has} />;
        })}
        <Animated.View style={[styles.preview, previewStyle]} pointerEvents="none">
          <PreviewText activeCharSV={activeCharSV} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: "#F5F5F4",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    alignItems: "center",
    width: 30,
  },
  preview: {
    position: "absolute",
    right: 34,
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#1C1917",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  previewText: { fontSize: 22, fontFamily: fontFamilies.heavy, color: "#FFFFFF", lineHeight: 22 },
  cell: {
    width: 24,
    height: 15.5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  cellDim: { opacity: 0.32 },
  text: { fontSize: 9.5, fontFamily: fontFamilies.heavy, color: "#57534E", textAlign: "center" },
  textDim: { color: "#A8A29E" },
});
