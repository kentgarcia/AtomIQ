import { Easing } from "react-native-reanimated";
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
export const EASE_DRAWER = Easing.bezier(0.32, 0.72, 0, 1);
export const PRESS_EASING = Easing.bezier(0.4, 0, 0.2, 1);
export const DURATION = {
  press: 150,
  small: 180,
  medium: 260,
  modal: 250,
  flip: 400,
} as const;
export const SPRING = { damping: 18, stiffness: 220 } as const;
