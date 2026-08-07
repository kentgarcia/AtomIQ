import { Icon } from "@/components/ui/icon";
import { MythTheme as THEME } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { type GameState, type ModeConfig } from "./modes";
import type { createStyles } from "./styles";

interface IntroScreenProps {
  selectedMode: ModeConfig;
  styles: ReturnType<typeof createStyles>;
  resetGame: () => void;
  setGameState: (state: GameState) => void;
}

export default function IntroScreen({
  selectedMode,
  styles,
  resetGame,
  setGameState,
}: IntroScreenProps) {

    // Mode-specific instructions
    const getModeInstruction = () => {
      switch (selectedMode.id) {
        case "quick":
          return "Take your time and learn at your own pace";
        case "challenge":
          return `You have ${selectedMode.timeLimit} seconds per statement!`;
        case "endless":
          return "You have 3 lives — how far can you go?";
        default:
          return "Swipe to judge each statement";
      }
    };
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LinearGradient
          colors={[selectedMode.colorSecondary, selectedMode.color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.fullScreen}
        >
          <SafeAreaView style={styles.fullScreen}>
            {/* Header */}
            <View style={styles.introHeader}>
              <TouchableOpacity onPress={resetGame} style={styles.introBackBtn}>
                <Icon name="ArrowLeft2" size={20} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.introModePillLight}>
                <Icon
                  name={selectedMode.icon as any}
                  size={14}
                  color="#FFF"
                  variant="Bold"
                />
                <Text style={styles.introModePillText}>
                  {selectedMode.title}
                </Text>
              </View>
              <View style={{ width: 44 }} />
            </View>

            <View style={styles.introContent}>
              {/* Single white card with all instructions */}
              <View style={styles.introWhiteCard}>
                <Text style={styles.introCardTitle}>How to Play</Text>

                {/* Swipe instructions */}
                <View style={styles.introSwipeRow}>
                  <View
                    style={[
                      styles.introSwipeItem,
                      { backgroundColor: THEME.error + "10" },
                    ]}
                  >
                    <Icon
                      name="ArrowLeft"
                      size={20}
                      color={THEME.error}
                      variant="Bold"
                    />
                    <Text
                      style={[styles.introSwipeLabel, { color: THEME.error }]}
                    >
                      MYTH
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.introSwipeItem,
                      { backgroundColor: THEME.success + "10" },
                    ]}
                  >
                    <Text
                      style={[styles.introSwipeLabel, { color: THEME.success }]}
                    >
                      TRUTH
                    </Text>
                    <Icon
                      name="ArrowRight"
                      size={20}
                      color={THEME.success}
                      variant="Bold"
                    />
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.introCardDivider} />

                {/* Mode info */}
                <View style={styles.introModeInfo}>
                  <Icon
                    name={
                      selectedMode.id === "endless"
                        ? "Heart"
                        : (selectedMode.icon as any)
                    }
                    size={18}
                    color={selectedMode.color}
                    variant="Bold"
                  />
                  <Text style={styles.introModeInfoText}>
                    {getModeInstruction()}
                  </Text>
                </View>

                {/* Stats row */}
                <View style={styles.introStatsRow}>
                  <View style={styles.introStatItem}>
                    <Icon name="Layer" size={16} color={THEME.textMuted} />
                    <Text style={styles.introStatText}>
                      {selectedMode.rounds === 999 ? "∞" : selectedMode.rounds}{" "}
                      rounds
                    </Text>
                  </View>
                  <View style={styles.introStatItem}>
                    <Icon
                      name="Flash"
                      size={16}
                      color={THEME.gold}
                      variant="Bold"
                    />
                    <Text style={styles.introStatText}>
                      {selectedMode.xpMultiplier}x XP
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Bottom Start Button */}
            <View style={styles.introBottom}>
              <TouchableOpacity
                onPress={() => setGameState("playing")}
                activeOpacity={0.9}
                style={styles.introStartBtnWhite}
              >
                <Text
                  style={[
                    styles.introStartTextColored,
                    { color: selectedMode.color },
                  ]}
                >
                  Start Game
                </Text>
                <Icon
                  name="ArrowRight2"
                  size={20}
                  color={selectedMode.color}
                  variant="Bold"
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </GestureHandlerRootView>
    );
}
