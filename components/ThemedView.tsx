import { View, type ViewProps } from "react-native";
import { useTheme } from "./ThemeContext";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  variant?: "background" | "surface" | "card" | "header";
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  variant = "background",
  ...otherProps
}: ThemedViewProps) {
  const { theme, isDark } = useTheme();

  const backgroundColor =
    lightColor && darkColor
      ? isDark
        ? darkColor
        : lightColor
      : variant === "surface"
      ? theme.surface
      : variant === "card"
      ? theme.card
      : variant === "header"
      ? theme.header
      : theme.background;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
