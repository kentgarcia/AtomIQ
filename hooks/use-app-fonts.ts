import { useFonts } from "expo-font";

import { fontFamily } from "@/theme/tokens";

/**
 * Loads the app typeface: one Intern variable font file (`wght` 100–900).
 * Every weight is reached through the `fontWeight` style prop — spread
 * `fontFaces.*` from `@/theme` rather than setting `fontFamily` on its own.
 */
export function useAppFonts() {
  const [fontsLoaded, error] = useFonts({
    [fontFamily]: require("../assets/fonts/Intern-Variable.ttf"),
  });

  if (error) {
    console.warn("Intern font not loaded:", error);
  }

  return fontsLoaded;
}
