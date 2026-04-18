import * as IconsaxReactNative from "iconsax-react-native";
import React, { useMemo } from "react";

// Map custom names to actual icon names
const iconNameMap: Record<string, string> = {
  Atom: "CpuSetting",
  Message: "MessageText",
  Ranking: "Medal",
  Close: "CloseCircle",
  Quote: "MessageText1",
  Percentage: "PercentageSquare",
  Infinite: "Unlimited",
  Fire: "Flashy",
  Book: "Book1",
  Trophy: "MedalStar",
  Target: "Target",
  Info: "Information",
  TickSquare: "TickSquare",
  Sun: "Sun1",
  Sword: "Slash",
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  variant?: "Linear" | "Outline" | "TwoTone" | "Bulk" | "Broken" | "Bold";
  style?: any;
}

export function Icon({
  name,
  size = 24,
  color = "#000",
  variant = "Bold",
  style,
}: IconProps) {
  const IconComponent = useMemo(() => {
    // Check if we have a custom mapping for this icon name
    const actualIconName = iconNameMap[name] || name;

    // Get the icon component from the iconsax library
    const component = (IconsaxReactNative as any)[actualIconName];

    if (!component) {
      console.warn(
        `Icon "${name}" (mapped to "${actualIconName}") not found in iconsax-react-native`,
      );
    }

    return component;
  }, [name]);

  if (!IconComponent) {
    return null;
  }

  return (
    <IconComponent size={size} color={color} variant={variant} style={style} />
  );
}
