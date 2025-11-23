/**
 * Typography Component - Easy-to-use text component with predefined styles
 * 
 * Usage:
 *   <Typography variant="h1">Heading</Typography>
 *   <Typography variant="body" color={theme.text}>Body text</Typography>
 */

import React from 'react';
import { Text, TextProps } from 'react-native';
import { TypographyStyles } from '@/constants/typography';

type TypographyVariant = keyof typeof TypographyStyles;

interface TypographyProps extends Omit<TextProps, 'style'> {
  variant?: TypographyVariant;
  color?: string;
  style?: TextProps['style'];
}

export function Typography({ 
  variant = 'body', 
  color, 
  style, 
  children,
  ...props 
}: TypographyProps) {
  const baseStyle = TypographyStyles[variant];
  
  return (
    <Text 
      style={[
        baseStyle,
        color ? { color } : undefined,
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
}

