import { select } from "@/services/haptics";
import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle, useDerivedValue, useSharedValue } from "react-native-reanimated";
import { createStyles, fontFaces, useTheme } from "@/theme";

function useAlphabetStyles() {
  const { theme } = useTheme();
  return React.useMemo(() => makeStyles(theme), [theme]);
}

type FastAlphabetProps = {
  data: string[];
  availableSet?: Set<string>;
  onCharSelect?: (char: string) => void;
  onPreviewChange?: (char: string | null) => void;
};

function Cell({ letter, has }: { letter: string; has: boolean }) {
  const styles = useAlphabetStyles();
  return (
    <View style={[styles.cell, !has && styles.cellDim]} pointerEvents="none">
      <Text style={[styles.text, !has && styles.textDim]}>{letter}</Text>
    </View>
  );
}

function PreviewText({ activeCharSV }: { activeCharSV: any }) {
  const styles = useAlphabetStyles();
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
  const styles = useAlphabetStyles();
  const heightSV = useSharedValue(1);
  const activeIdxSV = useSharedValue(-1);
  const activeCharSV = useSharedValue("");
  const previewOpacitySV = useSharedValue(0);

  const notifyChange = (idx: number) => {
    const ch = data[idx] ?? "";
    select();
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

const makeStyles = createStyles((theme) => ({
  // A bare strip of letters: no card, border or shadow
  container: {
    alignItems: "center",
    width: 24,
  },
  preview: {
    position: "absolute",
    right: 30,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  previewText: { fontSize: 24, ...fontFaces.heavy, color: theme.colors.onPrimary, lineHeight: 28 },
  cell: {
    width: 24,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cellDim: { opacity: 0.4 },
  text: { fontSize: 10, ...fontFaces.heavy, color: theme.colors.primary, textAlign: "center" },
  textDim: { color: theme.colors.textFaint },
}));
