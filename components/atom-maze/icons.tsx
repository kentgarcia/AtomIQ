import { Image as ExpoImage } from "expo-image";
import { View } from "react-native";

const MAZE_BATTLE_ART = {
  backdrop: require("@/assets/images/maze/backdrop.png"),
  battler: require("@/assets/images/maze/battler.png"),
  battlerHurt: require("@/assets/images/maze/battler_hurt.png"),
  enemy: require("@/assets/images/maze/enemy.png"),
  enemyHurt: require("@/assets/images/maze/enemy_hurt.png"),
  boss: require("@/assets/images/maze/boss.png"),
  bossLow: require("@/assets/images/maze/boss_low.png"),
};

const PlayerIcon = ({ isHurt }: { isHurt?: boolean }) => (
  <View
    style={{
      width: 112,
      height: 112,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <ExpoImage
      source={isHurt ? MAZE_BATTLE_ART.battlerHurt : MAZE_BATTLE_ART.battler}
      contentFit="contain"
      transition={120}
      style={{ width: "100%", height: "100%" }}
    />
  </View>
);

const MonsterIcon = ({
  isBoss,
  isHurt,
  isLowBoss,
}: {
  isBoss?: boolean;
  isHurt?: boolean;
  isLowBoss?: boolean;
}) => {
  const source = isBoss
    ? isLowBoss
      ? MAZE_BATTLE_ART.bossLow
      : MAZE_BATTLE_ART.boss
    : isHurt
      ? MAZE_BATTLE_ART.enemyHurt
      : MAZE_BATTLE_ART.enemy;

  return (
    <View
      style={{
        width: isBoss ? 148 : 112,
        height: isBoss ? 148 : 112,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ExpoImage
        source={source}
        contentFit="contain"
        transition={120}
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
};

export { MAZE_BATTLE_ART, MonsterIcon, PlayerIcon };