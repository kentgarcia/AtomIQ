import { Icon } from "@/components/ui/icon";
import { fontFamilies, MythTheme as THEME } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GAME_MODES, type ModeConfig } from "./modes";
import type { createStyles } from "./styles";

interface ModeSelectScreenProps {
  startMode: (mode: ModeConfig) => void;
  styles: ReturnType<typeof createStyles>;
  backgroundColor: string;
  textColor: string;
  cardColor: string;
}

export default function ModeSelectScreen({
  startMode,
  styles,
  backgroundColor,
  textColor,
  cardColor,
}: ModeSelectScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.fullScreen, { backgroundColor }]}>
          {/* Header */}
          <View
            style={[
              styles.modeHeader,
              { paddingTop: insets.top + 16, backgroundColor: cardColor },
            ]}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backButtonCircle, { backgroundColor }]}
            >
              <Icon name="ArrowLeft2" size={20} color={textColor} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.modeHeaderTitle, { color: textColor }]}>
                MythBuster
              </Text>
              <Text style={styles.modeHeaderSubtitle}>
                Choose your challenge
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            style={styles.modeScrollView}
            contentContainerStyle={styles.modeContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Mode Cards */}
            <View style={styles.modesGridNew}>
              {GAME_MODES.map((mode, index) => (
                <Pressable
                  key={mode.id}
                  onPress={() => startMode(mode)}
                  style={({ pressed }) => [
                    styles.modeCardNew,
                    pressed && styles.modeCardPressed,
                  ]}
                >
                  {/* 3D Card Bottom Layer (Shadow/Depth) */}
                  <View
                    style={[
                      styles.card3DBottom,
                      { backgroundColor: mode.color + "AA" },
                    ]}
                  />

                  {/* 3D Card Middle Layer */}
                  <View
                    style={[
                      styles.card3DMiddle,
                      { backgroundColor: mode.color },
                    ]}
                  />

                  {/* Card Background Gradient - Top Layer */}
                  <LinearGradient
                    colors={[mode.colorSecondary, mode.color]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.3, y: 1 }}
                    style={styles.modeCardGradientNew}
                  >
                    {/* Shine Effect */}
                    <View style={styles.cardShine} />

                    {/* Decorative Circles */}
                    <View style={[styles.cardCircle, styles.cardCircle1]} />
                    <View style={[styles.cardCircle, styles.cardCircle2]} />

                    {/* Icon Badge */}
                    <View style={styles.modeIconBadge}>
                      <View style={styles.modeIconInner}>
                        <Icon
                          name={mode.icon as any}
                          size={28}
                          color={mode.color}
                          variant="Bold"
                        />
                      </View>
                      {/* Icon Badge Shine */}
                      <View style={styles.iconBadgeShine} />
                    </View>

                    {/* Content */}
                    <View style={styles.modeCardContent}>
                      <Text style={styles.modeCardTitleNew}>{mode.title}</Text>
                      <Text style={styles.modeCardDescNew}>
                        {mode.description}
                      </Text>

                      {/* Tagline Banner */}
                      <View style={styles.taglineBanner}>
                        <Text style={styles.taglineText}>{mode.tagline}</Text>
                      </View>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.modeStatsRow}>
                      {/* Difficulty Stars */}
                      <View style={styles.difficultyStars}>
                        {[1, 2, 3].map((star) => (
                          <Icon
                            key={star}
                            name="Star1"
                            size={14}
                            color={
                              star <= mode.difficulty
                                ? "#FFD700"
                                : "rgba(255,255,255,0.3)"
                            }
                            variant="Bold"
                          />
                        ))}
                      </View>

                      {/* XP Multiplier */}
                      <View style={styles.xpBadge}>
                        <Icon
                          name="Flash"
                          size={12}
                          color="#FFD700"
                          variant="Bold"
                        />
                        <Text style={styles.xpBadgeText}>
                          {mode.xpMultiplier}x
                        </Text>
                      </View>

                      {/* Rounds */}
                      <View style={styles.roundsBadge}>
                        <Icon
                          name="Layer"
                          size={12}
                          color="rgba(255,255,255,0.9)"
                        />
                        <Text style={styles.roundsBadgeText}>
                          {mode.rounds === 999 ? "∞" : mode.rounds}
                        </Text>
                      </View>
                    </View>

                    {/* Play Arrow */}
                    <View style={styles.playArrowCircle}>
                      <Icon
                        name="Play"
                        size={20}
                        color={mode.color}
                        variant="Bold"
                      />
                    </View>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>

            {/* Info Card */}
            <View style={[styles.infoCard, { backgroundColor: cardColor }]}>
              <View style={styles.infoIconWrap}>
                <Icon name="InfoCircle" size={20} color={THEME.primary} />
              </View>
              <Text style={[styles.infoText, { color: textColor }]}>
                Swipe left for{" "}
                <Text style={{ color: THEME.error, fontWeight: "800", fontFamily: fontFamilies.heavy }}>
                  MYTH
                </Text>{" "}
                and right for{" "}
                <Text style={{ color: THEME.success, fontWeight: "800", fontFamily: fontFamilies.heavy }}>
                  TRUTH
                </Text>
                !
              </Text>
            </View>

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </GestureHandlerRootView>
    );
}
