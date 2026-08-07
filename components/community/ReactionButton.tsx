import { Icon } from "@/components/ui/icon";
import type { TabLight as LightTHEME } from "@/theme";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
} from "react-native-reanimated";

import { AnimatedPressable, REACTIONS } from "./types";
import type { ReactionType } from "./types";

// Reaction Button Component with animations
export const ReactionButton = ({
  itemId,
  currentReaction,
  onReaction,
  showPicker,
  onTogglePicker,
  theme,
  styles,
}: {
  itemId: string;
  currentReaction: ReactionType;
  onReaction: (itemId: string, reaction: ReactionType) => void;
  showPicker: boolean;
  onTogglePicker: (itemId: string) => void;
  theme: typeof LightTHEME;
  styles: any;
}) => {
  const reactionConfig = currentReaction
    ? REACTIONS.find((r) => r.type === currentReaction)
    : null;

  return (
    <View style={styles.reactionContainer}>
      {/* Reaction Picker Popup */}
      {showPicker && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[styles.picker, { backgroundColor: theme.card }]}
        >
          {REACTIONS.map((reaction, index) => (
            <AnimatedPressable
              key={reaction.type}
              entering={ZoomIn.delay(index * 50).springify()}
              onPress={() => onReaction(itemId, reaction.type)}
              style={styles.reactionOption}
            >
              <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
            </AnimatedPressable>
          ))}
        </Animated.View>
      )}

      {/* Main Button */}
      <TouchableOpacity
        style={styles.reactionButton}
        onPress={() => onReaction(itemId, "like")}
        onLongPress={() => onTogglePicker(itemId)}
        delayLongPress={300}
      >
        {reactionConfig ? (
          <>
            <Text style={styles.buttonEmoji}>{reactionConfig.emoji}</Text>
            <Text style={[styles.buttonText, { color: reactionConfig.color }]}>
              {reactionConfig.label}
            </Text>
          </>
        ) : (
          <>
            <Icon name="Like" size={20} color={theme.text} variant="Linear" />
            <Text style={[styles.buttonText, { color: theme.text }]}>Like</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};