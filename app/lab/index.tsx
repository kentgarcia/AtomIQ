/**
 * Lab router. The three experiments are chosen from the Games tab (`/lab?exp=...`); a bare `/lab`
 * goes back to the game picker. Each lab is its own screen in `components/lab/`.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { View } from "react-native";

import { BuildAnAtomLab } from "@/components/lab/BuildAnAtomLab";
import { DecayLab } from "@/components/lab/DecayLab";
import { RadiationShieldLab } from "@/components/lab/RadiationShieldLab";
import { Text } from "@/components/ui/text";
import { impactLight } from "@/services/haptics";
import { PERIODIC_TABLE_HREF } from "@/services/periodic-table";
import { fontFaces, useTheme } from "@/theme";

const LABS = ["radiation-shield", "dose-visualizer", "build-atom", "decay-lab", "energy-showdown"];

export default function LabScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { exp } = useLocalSearchParams<{ exp?: string }>();

  const handleGameBack = useCallback(() => {
    impactLight();
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/awards");
  }, [router]);

  useEffect(() => {
    if (exp && LABS.includes(exp)) return;
    const t = setTimeout(() => router.replace("/(tabs)/awards"), 0);
    return () => clearTimeout(t);
  }, [exp, router]);

  if (exp === "radiation-shield" || exp === "dose-visualizer") return <RadiationShieldLab onBack={handleGameBack} />;
  if (exp === "build-atom") return <BuildAnAtomLab onBack={handleGameBack} onPeriodicTable={() => router.push(PERIODIC_TABLE_HREF)} />;
  if (exp === "decay-lab" || exp === "energy-showdown") return <DecayLab onBack={handleGameBack} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.mapBackground, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ ...fontFaces.heavy, color: theme.colors.text }}>Redirecting to Games…</Text>
    </View>
  );
}
