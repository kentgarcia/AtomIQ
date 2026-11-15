import * as IconsaxReactNative from "iconsax-react-native";
import React, { useEffect, useMemo } from "react";
import { Text } from "react-native";

import { reportIconDiagnostic } from "./icon-diagnostics";
import {
  FALLBACK_ICON_NAME,
  resolveIconName,
  type IconVariant,
} from "./icon-registry";

export interface IconProps {
  /**
   * Iconsax export name or a reviewed alias from `icon-registry.ts`.
   *
   * Optional so callers can pass an optional content field directly. An empty
   * or missing name renders the visible fallback instead of a blank slot.
   */
  name?: string | null;
  size?: number;
  color?: string;
  variant?: IconVariant;
  style?: any;
  /**
   * Optional diagnostic context, e.g. `lesson:background-radiation step:lab
   * option:denver`. Included when the name is invalid so the source can be
   * fixed without reproducing the screen.
   */
  source?: string;
}

type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  variant?: IconVariant;
  style?: any;
}>;

const ICON_SURFACE = IconsaxReactNative as unknown as Record<
  string,
  IconComponent | undefined
>;

export function Icon({
  name,
  size = 24,
  color = "#000",
  variant = "Bold",
  style,
  source,
}: IconProps) {
  const resolution = useMemo(
    () => resolveIconName(name ?? "", ICON_SURFACE),
    [name],
  );

  useEffect(() => {
    if (!resolution.valid) {
      reportIconDiagnostic({ ...resolution, source });
    }
  }, [resolution, source]);

  const componentName = resolution.valid
    ? resolution.resolved
    : FALLBACK_ICON_NAME;
  const IconComponent = ICON_SURFACE[componentName];

  // The fallback is a known installed export, but a broken/mismatched
  // dependency must still not turn this into an invisible slot.
  if (!IconComponent) {
    return (
      <Text
        accessibilityLabel={resolution.valid ? "Icon unavailable" : "Missing icon"}
        style={[{ fontSize: size, color }, style]}
      >
        !
      </Text>
    );
  }

  return (
    <IconComponent size={size} color={color} variant={variant} style={style} />
  );
}
