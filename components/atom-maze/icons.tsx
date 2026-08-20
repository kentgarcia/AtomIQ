import { Image as ExpoImage } from "expo-image";
import { useEffect } from "react";
import Animated, {
    Easing,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

const IDLE_BOB_AMPLITUDE = 6;
const IDLE_BOB_DURATION_MS = 2400;

// Gentle "alive" float. Pure worklet loop — no re-renders; skips entirely
// under reduced motion (ambient motion is what reduced users opt out of).
// `startAtTop` opens the loop at the peak of the cycle so the two fighters
// float in counterphase instead of in lockstep.
const useIdleBob = (startAtTop = false) => {
    const reducedMotion = useReducedMotion();
    const bob = useSharedValue(startAtTop ? -IDLE_BOB_AMPLITUDE : 0);

    useEffect(() => {
        if (reducedMotion) {
            bob.set(0);
            return;
        }

        bob.set(
            withRepeat(
                withTiming(startAtTop ? 0 : -IDLE_BOB_AMPLITUDE, {
                    duration: IDLE_BOB_DURATION_MS,
                    easing: Easing.inOut(Easing.quad),
                }),
                -1,
                true,
            ),
        );

        return () => bob.set(0);
    }, [reducedMotion, bob, startAtTop]);

    return useAnimatedStyle(() => ({
        transform: [{ translateY: bob.get() }],
    }));
};

const MAZE_BATTLE_ART = {
  backdrop: require("@/assets/images/maze/backdrop.png"),
  battler: require("@/assets/images/maze/battler.png"),
  battlerAttack: require("@/assets/images/maze/battler_attack.png"),
  battlerHurt: require("@/assets/images/maze/battler_hurt.png"),
  battlerFaint: require("@/assets/images/maze/battler_faint.png"),
  battlerWin: require("@/assets/images/maze/battler_win.png"),
  enemy: require("@/assets/images/maze/enemy.png"),
  enemyAttack: require("@/assets/images/maze/enemy_attack.png"),
  enemyHurt: require("@/assets/images/maze/enemy_hurt.png"),
  enemyFaint: require("@/assets/images/maze/enemy_faint.png"),
  enemyWin: require("@/assets/images/maze/enemy_win.png"),
  boss: require("@/assets/images/maze/boss.png"),
  bossLow: require("@/assets/images/maze/boss_low.png"),
};

type FighterPose = {
  isAttacking?: boolean;
  isHurt?: boolean;
  isFaint?: boolean;
  isWin?: boolean;
};

const PlayerIcon = ({ isAttacking, isHurt, isFaint, isWin }: FighterPose) => {
  const idleBob = useIdleBob();
  const source = isFaint
    ? MAZE_BATTLE_ART.battlerFaint
    : isHurt
      ? MAZE_BATTLE_ART.battlerHurt
      : isAttacking
        ? MAZE_BATTLE_ART.battlerAttack
        : isWin
          ? MAZE_BATTLE_ART.battlerWin
          : MAZE_BATTLE_ART.battler;

  return (
    <Animated.View
      style={[
        {
          width: 136,
          height: 136,
          alignItems: "center",
          justifyContent: "center",
        },
        idleBob,
      ]}
    >
      <ExpoImage
        source={source}
        contentFit="contain"
        transition={120}
        style={{ width: "100%", height: "100%" }}
      />
    </Animated.View>
  );
};

const MonsterIcon = ({
  isBoss,
  isHurt,
  isAttacking,
  isFaint,
  isLowBoss,
}: FighterPose & {
  isBoss?: boolean;
  isLowBoss?: boolean;
}) => {
  const idleBob = useIdleBob(true);
  const source = isFaint
    ? MAZE_BATTLE_ART.enemyFaint
    : isHurt
      ? isBoss
        ? MAZE_BATTLE_ART.bossLow
        : MAZE_BATTLE_ART.enemyHurt
      : isAttacking && !isBoss
        ? MAZE_BATTLE_ART.enemyAttack
        : isBoss
          ? isLowBoss
            ? MAZE_BATTLE_ART.bossLow
            : MAZE_BATTLE_ART.boss
          : MAZE_BATTLE_ART.enemy;

  return (
    <Animated.View
      style={[
        {
          width: isBoss ? 148 : 136,
          height: isBoss ? 148 : 136,
          alignItems: "center",
          justifyContent: "center",
        },
        idleBob,
      ]}
    >
      <ExpoImage
        source={source}
        contentFit="contain"
        transition={120}
        style={{ width: "100%", height: "100%" }}
      />
    </Animated.View>
  );
};

export { MAZE_BATTLE_ART, MonsterIcon, PlayerIcon };