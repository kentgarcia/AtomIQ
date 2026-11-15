import {createStyles, fontFaces, useTheme} from "@/theme";
import React, { useMemo } from 'react';
import { Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const makeStyles = createStyles((theme) => ({
  default: {
    fontSize: 16,
    ...fontFaces.regular,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    ...fontFaces.semibold,
  },
  title: {
    fontSize: 32,
    ...fontFaces.bold,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    ...fontFaces.bold,
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    ...fontFaces.regular,
    color: theme.colors.link,
  },
}));
