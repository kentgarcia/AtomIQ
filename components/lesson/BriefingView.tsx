import { useEffect, useMemo } from "react";
import { Image, Text, useWindowDimensions, View } from "react-native";
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

import { type Palette } from "@/theme";

import { createStyles } from "./styles";

export const BriefingView = ({
  data,
  onComplete,
  theme,
}: {
  data: any;
  onComplete: () => void;
  theme: Palette;
}) => {
  const scale = useSharedValue(1);
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, width), [theme, width]);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.1, { duration: 1000 }), -1, true);
    const timer = setTimeout(onComplete, 3000); // Auto advance after 3s
    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.fullScreenCenter}>
      <Animated.View
        entering={FadeInDown.springify()}
        style={[styles.mascotLarge, animatedStyle]}
      >
        <Image
          source={require("@/assets/images/mascot/explain.png")}
          style={styles.mascotImage}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={styles.briefingTitle}>Topic: {data.topic}</Text>
      <Text style={styles.briefingSubtitle}>{data.mission}</Text>
      <View style={styles.loadingBar}>
        <Animated.View
          style={[
            styles.loadingFill,
            { width: withTiming("100%", { duration: 3000 }) },
          ]}
        />
      </View>
    </View>
  );
};
