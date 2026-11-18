/**
 * FieldInput — the app's one text field control. Placeholders and values that are already there
 * (a saved name, a locked answer) use the soft `fieldText` colour; while the field is focused and
 * being typed in, the value switches to the normal `text` colour so it reads as live input.
 * The fill, radius and padding come from the caller's `style`.
 */

import React, { useState } from "react";
import { TextInput, type TextInputProps } from "react-native";

import { useTheme } from "@/theme";

export function FieldInput({ style, onFocus, onBlur, editable, placeholderTextColor, ...rest }: TextInputProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const typing = focused && editable !== false;

  return (
    <TextInput
      editable={editable}
      placeholderTextColor={placeholderTextColor ?? theme.colors.fieldText}
      style={[style, typing && { color: theme.colors.text }]}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...rest}
    />
  );
}
